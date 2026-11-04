# 音ポン共有API

Cloudflare Workers + D1 + Workers KVで、投稿音源・いいね・通報・審査状態を管理します。

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
npx wrangler deploy --config worker/wrangler.jsonc
```

GitHubリポジトリ変数 `VITE_API_BASE` に発行されたWorker URLを設定すると、GitHub Pages版が共有APIへ接続します。

## 審査API

- `GET /api/admin/sounds?status=pending`
- `GET /api/admin/sounds/:id/audio`
- `PUT /api/admin/sounds/:id` body: `{ "status": "approved" }`

どちらも `Authorization: Bearer <ADMIN_TOKEN>` が必要です。投稿は必ず `pending` になり、管理者が承認するまで一般一覧や音声URLから取得できません。
