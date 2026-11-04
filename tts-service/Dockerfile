FROM python:3.13-slim

WORKDIR /app
COPY server.py /app/server.py

ENV MAX_TEXT_LENGTH=80 \
    PORT=8080 \
    START_ENGINE=0 \
    VOICEVOX_URL=http://127.0.0.1:50021

EXPOSE 8080

ENTRYPOINT ["python", "/app/server.py"]
