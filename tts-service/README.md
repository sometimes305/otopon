# ずんだもん読み上げサービス

VOICEVOX EngineをCloud Runで動かし、ずんだもん（ノーマル）だけを生成する小さなプロキシです。

- `POST /tts` body: `{ "text": "ゲームスタートなのだ" }`
- `X-TTS-Secret` が必須
- 最大80文字
- WAV（44.1kHz・モノラル）を返す
- 文章と生成音声は保存しない
- VOICEVOX Engineの設定・辞書変更APIは無効

## ローカルテスト

```bash
python -m unittest discover tts-service
```

## Cloud Run

Cloud Runでは小さなPythonプロキシを入口にし、公式の `voicevox/voicevox_engine:cpu-ubuntu22.04-0.26.1` をサイドカーとして直接使います。約2GBあるVOICEVOX本体を自前のArtifact Registryへ保存しないため、保存対象は小さなプロキシイメージだけです。

運用設定はリクエスト課金、最小インスタンス0、最大インスタンス1、同時実行数1です。`TTS_SECRET` はSecret Managerへ置き、Cloudflare Workerにも同じ値を設定します。詳しいコマンドはルートの `docs/ZUNDAMON_DEPLOY.md` を参照してください。

Cloud Run URLをWorkerの `TTS_URL`、同じランダム値をWorkerの `TTS_SECRET` に設定します。
