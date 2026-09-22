#!/usr/bin/env python3
"""
BarCodeID Studio - Local & Network Live Development Server
Menjalankan server HTTP lokal untuk akses di laptop dan device lain (HP / Tablet)
melalui jaringan Wi-Fi / LAN yang sama.
"""

import http.server
import socketserver
import os
import sys
import json
import subprocess
import webbrowser

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    """Mendeteksi IP lokal mesin di jaringan Wi-Fi / LAN."""
    # 1. Coba interface macOS umum (en0, en1, en2)
    for iface in ['en0', 'en1', 'en2', 'wlan0', 'eth0']:
        try:
            out = subprocess.check_output(['ipconfig', 'getifaddr', iface], stderr=subprocess.DEVNULL).decode().strip()
            if out:
                return out
        except Exception:
            pass

    # 2. Coba hostname -I untuk Linux
    try:
        out = subprocess.check_output(['hostname', '-I'], stderr=subprocess.DEVNULL).decode().split()[0]
        if out:
            return out
    except Exception:
        pass

    # 3. Parse ifconfig fallback
    try:
        out = subprocess.check_output(['ifconfig'], stderr=subprocess.DEVNULL).decode()
        for line in out.splitlines():
            line = line.strip()
            if line.startswith('inet ') and not line.startswith('inet 127.'):
                parts = line.split()
                if len(parts) >= 2:
                    return parts[1]
    except Exception:
        pass

    return '127.0.0.1'

LOCAL_IP = get_local_ip()
CURRENT_PORT = PORT

DATA_DIR = os.path.join(DIRECTORY, 'data')
DATA_FILE = os.path.join(DATA_DIR, 'barcodes.json')

def get_barcodes_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"Error reading {DATA_FILE}: {e}")
    return {"items": [], "folders": ["Default"], "updatedAt": None}

def save_barcodes_db(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    import datetime
    data["updatedAt"] = datetime.datetime.now().isoformat()
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Disable cache selama development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-Requested-With, X-Auth')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/barcodes':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                req_data = json.loads(body.decode('utf-8')) if body else {}
                
                db = get_barcodes_db()
                existing_items = {it.get("id"): it for it in db.get("items", []) if it.get("id")}
                existing_folders = list(db.get("folders", ["Default"]))
                
                new_items = req_data.get("items", [])
                new_folders = req_data.get("folders", [])
                mode = req_data.get("mode", "sync")  # "sync" or "replace"
                
                if mode == "replace":
                    db["items"] = new_items
                    db["folders"] = new_folders if new_folders else ["Default"]
                else:
                    for item in new_items:
                        item_id = item.get("id")
                        if not item_id:
                            continue
                        if item_id in existing_items:
                            old = existing_items[item_id]
                            # Preserve printed status if either is printed
                            if old.get("status") == "printed" or item.get("status") == "printed":
                                item["status"] = "printed"
                                item["printedAt"] = old.get("printedAt") or item.get("printedAt")
                            old.update(item)
                        else:
                            existing_items[item_id] = item
                    
                    db["items"] = list(existing_items.values())
                    for f in new_folders:
                        if f and f not in existing_folders:
                            existing_folders.append(f)
                    db["folders"] = existing_folders

                save_barcodes_db(db)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "count": len(db["items"]),
                    "items": db["items"],
                    "folders": db["folders"]
                }).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode('utf-8'))
                return

        if self.path == '/api/barcodes/status':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                req_data = json.loads(body.decode('utf-8')) if body else {}
                
                ids = req_data.get("ids", [])
                new_status = req_data.get("status", "printed")
                import datetime
                now_str = datetime.datetime.now().isoformat()
                
                db = get_barcodes_db()
                id_set = set(ids)
                updated_count = 0
                for item in db.get("items", []):
                    if item.get("id") in id_set:
                        item["status"] = new_status
                        item["printedAt"] = now_str if new_status == "printed" else None
                        updated_count += 1
                
                save_barcodes_db(db)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "updated": updated_count,
                    "status": new_status
                }).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode('utf-8'))
                return

        if self.path == '/api/barcodes/delete':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                req_data = json.loads(body.decode('utf-8')) if body else {}
                
                db = get_barcodes_db()
                if req_data.get("all"):
                    db["items"] = []
                    db["folders"] = ["Default"]
                elif req_data.get("ids"):
                    del_set = set(req_data["ids"])
                    db["items"] = [it for it in db.get("items", []) if it.get("id") not in del_set]
                elif req_data.get("folder"):
                    folder_name = req_data["folder"]
                    db["items"] = [it for it in db.get("items", []) if it.get("batch") != folder_name and it.get("batchName") != folder_name and it.get("batchId") != folder_name]
                    if folder_name in db.get("folders", []):
                        db["folders"].remove(folder_name)
                    if not db["folders"]:
                        db["folders"] = ["Default"]
                
                save_barcodes_db(db)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(db["items"])}).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode('utf-8'))
                return
        if self.path == '/api/parse-excel':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                raw_fn = self.headers.get('X-Filename', '')
                import urllib.parse
                filename = urllib.parse.unquote(raw_fn).lower() if raw_fn else 'data.xlsx'
                
                rows = []
                sheet_name = 'Sheet1'
                
                if filename.endswith('.csv') or filename.endswith('.txt'):
                    import csv
                    text = None
                    for enc in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
                        try:
                            text = body.decode(enc)
                            break
                        except Exception:
                            continue
                    if text:
                        first_line = text.splitlines()[0] if text.splitlines() else ''
                        delim = '\t' if '\t' in first_line else (';' if ';' in first_line else ',')
                        reader = csv.reader(text.splitlines(), delimiter=delim)
                        rows = [row for row in reader if any(cell.strip() for cell in row)]
                        sheet_name = 'CSV'
                else:
                    import io, zipfile, xml.etree.ElementTree as ET
                    with zipfile.ZipFile(io.BytesIO(body), 'r') as z:
                        namelist = z.namelist()
                        sst = []
                        if 'xl/sharedStrings.xml' in namelist:
                            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                            for si in tree.findall('.//ns:si', ns):
                                text_parts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                                sst.append(''.join(text_parts))
                        
                        sheet_path = 'xl/worksheets/sheet1.xml'
                        if sheet_path not in namelist:
                            sheets = [n for n in namelist if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
                            if sheets:
                                sheet_path = sorted(sheets)[0]
                        
                        if sheet_path in namelist:
                            tree = ET.fromstring(z.read(sheet_path))
                            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                            for r in tree.findall('.//ns:row', ns):
                                row_data = []
                                for c in r.findall('.//ns:c', ns):
                                    t_attr = c.attrib.get('t')
                                    val = ''
                                    if t_attr == 's':
                                        v = c.find('ns:v', ns)
                                        if v is not None and v.text and v.text.isdigit():
                                            idx = int(v.text)
                                            val = sst[idx] if idx < len(sst) else ''
                                    elif t_attr == 'inlineStr':
                                        is_tag = c.find('ns:is', ns)
                                        if is_tag is not None:
                                            text_parts = [t.text for t in is_tag.findall('.//ns:t', ns) if t.text]
                                            val = ''.join(text_parts)
                                    else:
                                        v = c.find('ns:v', ns)
                                        if v is not None and v.text:
                                            val = v.text
                                    row_data.append(val)
                                if any(cell.strip() for cell in row_data):
                                    rows.append(row_data)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                resp = {
                    "success": True,
                    "filename": filename,
                    "sheetName": sheet_name,
                    "data": rows
                }
                self.wfile.write(json.dumps(resp).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/barcodes' or self.path.startswith('/api/barcodes?'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            db = get_barcodes_db()
            resp = {
                "success": True,
                "items": db.get("items", []),
                "folders": db.get("folders", ["Default"]),
                "updatedAt": db.get("updatedAt")
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        if self.path == '/api/barcodes/stats':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            db = get_barcodes_db()
            items = db.get("items", [])
            printed = sum(1 for it in items if it.get("status") == "printed")
            resp = {
                "success": True,
                "total": len(items),
                "printed": printed,
                "pending": len(items) - printed
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        if self.path == '/api/network-info':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            current_ip = get_local_ip()
            info = {
                "localIp": current_ip,
                "port": CURRENT_PORT,
                "localUrl": f"http://localhost:{CURRENT_PORT}",
                "networkUrl": f"http://{current_ip}:{CURRENT_PORT}"
            }
            self.wfile.write(json.dumps(info).encode('utf-8'))
            return

        super().do_GET()

def run_server(port=PORT):
    global CURRENT_PORT
    socketserver.TCPServer.allow_reuse_address = True

    for p in range(port, port + 20):
        try:
            # Bind ke "" agar dapat diakses dari device lain di jaringan yang sama
            with socketserver.TCPServer(("", p), CustomHandler) as httpd:
                CURRENT_PORT = p
                local_url = f"http://localhost:{p}"
                network_url = f"http://{LOCAL_IP}:{p}"

                print("\n" + "=" * 65)
                print("🚀  BarCodeID Studio - Live Server Lokal Aktif!")
                print("=" * 65)
                print(f"💻  Akses dari Komputer Ini (Local):")
                print(f"    👉  {local_url}")
                print()
                print(f"📱  Akses dari HP / Tablet / Device Lain (Wi-Fi Sama):")
                print(f"    👉  {network_url}")
                print()
                print("💡  Petunjuk untuk HP / Device Lain:")
                print(f"    1. Pastikan HP terhubung ke Wi-Fi yang sama.")
                print(f"    2. Buka browser HP (Chrome/Safari) dan ketik:")
                print(f"       {network_url}")
                print(f"📁  Direktori: {DIRECTORY}")
                print("=" * 65 + "\n")

                if "--open" in sys.argv:
                    webbrowser.open(local_url)

                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\n🛑 Server dihentikan.")
