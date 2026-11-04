from __future__ import annotations

import http.client
import io
import json
import os
import threading
import unittest
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

os.environ["START_ENGINE"] = "0"
os.environ["TTS_SECRET"] = "test-secret"

import server


_wav_buffer = io.BytesIO()
with wave.open(_wav_buffer, "wb") as _wav:
    _wav.setnchannels(1)
    _wav.setsampwidth(2)
    _wav.setframerate(44100)
    _wav.writeframes(b"\x00\x00" * 4410)
WAV_BYTES = _wav_buffer.getvalue()


class FakeEngineHandler(BaseHTTPRequestHandler):
    calls: list[str] = []

    def do_GET(self) -> None:
        self.calls.append(self.path)
        if self.path == "/speakers":
            self.send_json([{"name": "ずんだもん", "styles": [{"name": "ノーマル", "id": 3}]}])
            return
        if self.path == "/version":
            self.send_json({"version": "test"})
            return
        self.send_error(404)

    def do_POST(self) -> None:
        self.calls.append(self.path)
        if self.path.startswith("/audio_query?"):
            self.send_json({"outputSamplingRate": 24000, "outputStereo": True})
            return
        if self.path == "/synthesis?speaker=3":
            length = int(self.headers.get("Content-Length", "0"))
            query = json.loads(self.rfile.read(length))
            if query["outputSamplingRate"] != 44100 or query["outputStereo"] is not False:
                self.send_error(400)
                return
            self.send_response(200)
            self.send_header("Content-Length", str(len(WAV_BYTES)))
            self.send_header("Content-Type", "audio/wav")
            self.end_headers()
            self.wfile.write(WAV_BYTES)
            return
        self.send_error(404)

    def send_json(self, payload: object) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, _format: str, *_args: object) -> None:
        pass


class ProxyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = ThreadingHTTPServer(("127.0.0.1", 0), FakeEngineHandler)
        engine_port = cls.engine.server_address[1]
        server.VOICEVOX_URL = f"http://127.0.0.1:{engine_port}"
        server._speaker_id = None
        cls.engine_thread = threading.Thread(target=cls.engine.serve_forever, daemon=True)
        cls.engine_thread.start()
        cls.proxy = ThreadingHTTPServer(("127.0.0.1", 0), server.ProxyHandler)
        cls.proxy_thread = threading.Thread(target=cls.proxy.serve_forever, daemon=True)
        cls.proxy_thread.start()
        cls.proxy_port = cls.proxy.server_address[1]

    @classmethod
    def tearDownClass(cls) -> None:
        cls.proxy.shutdown()
        cls.engine.shutdown()
        cls.proxy.server_close()
        cls.engine.server_close()

    def request(self, path: str, payload: object, secret: str = "test-secret") -> tuple[int, dict[str, str], bytes]:
        connection = http.client.HTTPConnection("127.0.0.1", self.proxy_port, timeout=5)
        body = json.dumps(payload, ensure_ascii=False).encode()
        connection.request("POST", path, body, {"Content-Type": "application/json", "X-TTS-Secret": secret})
        response = connection.getresponse()
        data = response.read()
        headers = {key.lower(): value for key, value in response.getheaders()}
        connection.close()
        return response.status, headers, data

    def test_synthesizes_zundamon_wav(self) -> None:
        status, headers, body = self.request("/tts", {"text": "ゲームスタートなのだ"})
        self.assertEqual(status, 200)
        self.assertEqual(headers["content-type"], "audio/wav")
        self.assertEqual(headers["cache-control"], "no-store")
        self.assertEqual(body, WAV_BYTES)
        self.assertIn("/synthesis?speaker=3", FakeEngineHandler.calls)

    def test_rejects_wrong_secret(self) -> None:
        status, _, _ = self.request("/tts", {"text": "テスト"}, "wrong")
        self.assertEqual(status, 401)

    def test_rejects_long_text(self) -> None:
        status, _, body = self.request("/tts", {"text": "あ" * 81})
        self.assertEqual(status, 400)
        self.assertIn("80", body.decode())


if __name__ == "__main__":
    unittest.main()
