from __future__ import annotations

import hmac
import http.client
import json
import os
import signal
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlencode, urlparse


MAX_TEXT_LENGTH = int(os.environ.get("MAX_TEXT_LENGTH", "80"))
MAX_AUDIO_BYTES = int(os.environ.get("MAX_AUDIO_BYTES", str(10 * 1024 * 1024)))
PORT = int(os.environ.get("PORT", "8080"))
TTS_SECRET = os.environ.get("TTS_SECRET", "")
VOICEVOX_URL = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021").rstrip("/")
START_ENGINE = os.environ.get("START_ENGINE", "1") == "1"
ENGINE_PATH = os.environ.get("VOICEVOX_ENGINE_PATH", "/opt/voicevox_engine/run")

_speaker_id: int | None = None
_speaker_lock = threading.Lock()
_engine_process: subprocess.Popen[bytes] | None = None


class UpstreamError(RuntimeError):
    pass


def request_engine(method: str, path: str, body: bytes | None = None, timeout: float = 90) -> tuple[int, dict[str, str], bytes]:
    parsed = urlparse(VOICEVOX_URL)
    connection_class = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
    connection = connection_class(parsed.hostname, parsed.port, timeout=timeout)
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    prefix = parsed.path.rstrip("/")
    try:
        connection.request(method, f"{prefix}{path}", body=body, headers=headers)
        response = connection.getresponse()
        data = response.read(MAX_AUDIO_BYTES + 1)
        response_headers = {key.lower(): value for key, value in response.getheaders()}
        return response.status, response_headers, data
    except (OSError, TimeoutError, http.client.HTTPException) as error:
        raise UpstreamError("VOICEVOX Engineへ接続できません") from error
    finally:
        connection.close()


def find_zundamon_speaker() -> int:
    global _speaker_id
    if _speaker_id is not None:
        return _speaker_id
    with _speaker_lock:
        if _speaker_id is not None:
            return _speaker_id
        status, _, data = request_engine("GET", "/speakers", timeout=15)
        if status != 200:
            raise UpstreamError("ずんだもんの話者情報を取得できません")
        try:
            speakers = json.loads(data)
            zundamon = next(speaker for speaker in speakers if speaker.get("name") == "ずんだもん")
            styles = zundamon.get("styles") or []
            normal = next((style for style in styles if style.get("name") == "ノーマル"), styles[0])
            _speaker_id = int(normal["id"])
        except (StopIteration, IndexError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise UpstreamError("ずんだもんのノーマル音声が見つかりません") from error
        return _speaker_id


def synthesize(text: str) -> bytes:
    speaker_id = find_zundamon_speaker()
    query_string = urlencode({"text": text, "speaker": speaker_id})
    status, _, query_data = request_engine("POST", f"/audio_query?{query_string}")
    if status != 200:
        raise UpstreamError("読み上げ用データを作成できません")
    try:
        audio_query: dict[str, Any] = json.loads(query_data)
    except json.JSONDecodeError as error:
        raise UpstreamError("読み上げ用データが不正です") from error
    audio_query["outputSamplingRate"] = 44100
    audio_query["outputStereo"] = False
    body = json.dumps(audio_query, ensure_ascii=False).encode("utf-8")
    status, headers, audio = request_engine("POST", f"/synthesis?speaker={speaker_id}", body)
    if status != 200:
        raise UpstreamError("音声を生成できません")
    if len(audio) > MAX_AUDIO_BYTES:
        raise UpstreamError("生成された音声が大きすぎます")
    if "audio/wav" not in headers.get("content-type", ""):
        raise UpstreamError("VOICEVOX Engineから音声が返りませんでした")
    return audio


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "ZundamonProxy/1.0"

    def do_GET(self) -> None:
        if self.path != "/healthz":
            self.send_json(404, {"error": "Not found"})
            return
        try:
            speaker_id = find_zundamon_speaker()
            self.send_json(200, {"ok": True, "speaker": "ずんだもん", "styleId": speaker_id})
        except UpstreamError as error:
            self.send_json(503, {"ok": False, "error": str(error)})

    def do_POST(self) -> None:
        if self.path != "/tts":
            self.send_json(404, {"error": "Not found"})
            return
        supplied_secret = self.headers.get("X-TTS-Secret", "")
        if not TTS_SECRET or not hmac.compare_digest(supplied_secret, TTS_SECRET):
            self.send_json(401, {"error": "Unauthorized"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 2 or length > 4096:
            self.send_json(400, {"error": "文章が不正です"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
            text = payload.get("text", "").strip() if isinstance(payload, dict) else ""
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"error": "JSONが不正です"})
            return
        if not text:
            self.send_json(400, {"error": "文章を入力してください"})
            return
        if len(text) > MAX_TEXT_LENGTH:
            self.send_json(400, {"error": f"文章は{MAX_TEXT_LENGTH}文字以内にしてください"})
            return
        try:
            audio = synthesize(text)
        except UpstreamError as error:
            self.send_json(503, {"error": str(error)})
            return
        self.send_response(200)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Content-Type", "audio/wav")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(audio)

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format % args}", flush=True)


def start_engine() -> subprocess.Popen[bytes] | None:
    if not START_ENGINE:
        return None
    return subprocess.Popen([
        ENGINE_PATH,
        "--host", "127.0.0.1",
        "--port", "50021",
        "--disable_mutable_api",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_for_engine(timeout_seconds: int = 90) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            status, _, _ = request_engine("GET", "/version", timeout=2)
            if status == 200:
                return
        except UpstreamError:
            pass
        time.sleep(1)
    raise RuntimeError("VOICEVOX Engineの起動がタイムアウトしました")


def shutdown(_signum: int, _frame: Any) -> None:
    if _engine_process and _engine_process.poll() is None:
        _engine_process.terminate()


def main() -> None:
    global _engine_process
    if not TTS_SECRET:
        raise RuntimeError("TTS_SECRET is required")
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    _engine_process = start_engine()
    wait_for_engine()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ProxyHandler)
    try:
        print(f"Zundamon proxy listening on {PORT}", flush=True)
        server.serve_forever()
    finally:
        server.server_close()
        shutdown(0, None)


if __name__ == "__main__":
    main()
