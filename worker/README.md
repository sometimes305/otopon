# 効果音BOX共有API

Cloudflare Workers + D1 + Workers KVで、投稿音源・いいね・通報・公開状態を管理します。投稿音源は保存後すぐ公開されます。ずんだもん読み上げでは、Cloud Runへの中継と回数制限だけを行い、文章や生成音声は保存しません。

## ローカル起動

```bash
npm run worker:migrate:local
npm run worker:dev
```

別ターミナルで `npm run dev` を起動し、`.env.local` に `VITE_API_BASE=http://127.0.0.1:8787` を設定します。

## 本番作成

Cloudflareへログイン後にD1とKV Namespaceを作ります。作成時に表示されるIDを `wrangler.jsonc` へ入れてください。

```bash
npx wrangler login
npx wrangler d1 create otopon-db
npx wrangler kv namespace create otopon-audio
npm run worker:migrate:remote
npx wrangler secret put ADMIN_TOKEN --config worker/wrangler.jsonc
npx wrangler secret put TTS_URL --config worker/wrangler.jsonc
npx wrangler secret put TTS_SECRET --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

GitHubリポジトリ変数 `VITE_API_BASE` に発行されたWorker URLを設定すると、GitHub Pages版が共有APIへ接続します。

`TTS_URL` にはCloud RunサービスURL、`TTS_SECRET` にはCloud RunのSecret Managerと同じランダム値を設定します。まとめて公開する場合は [`../docs/ZUNDAMON_DEPLOY.md`](../docs/ZUNDAMON_DEPLOY.md) のスクリプトを使用します。

## 読み上げAPI

- `POST /api/tts` body: `{ "text": "ゲームスタートなのだ" }`
- GRAVITYユーザーヘッダー必須
- 最大80文字、4秒に1回、1ユーザー1時間30回、サービス全体1日200回
- 応答は保存しない `audio/wav`

## 運営API

- `GET /api/admin/sounds?status=approved`
- `GET /api/admin/sounds/:id/audio`
- `PUT /api/admin/sounds/:id` body: `{ "status": "hidden" }` または `{ "status": "rejected" }`

どちらも `Authorization: Bearer <ADMIN_TOKEN>` が必要です。`hidden` は公開停止、`rejected` は公開停止に加えてKV上の音声ファイルも削除します。
