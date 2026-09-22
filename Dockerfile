FROM python:3.11-slim

WORKDIR /app

# Expose data directory as volume for persistent storage across container restarts
VOLUME ["/app/data"]

# Copy application files
COPY . /app/

# Port for local web server and API
EXPOSE 3000

ENV PYTHONUNBUFFERED=1

CMD ["python3", "server.py"]
