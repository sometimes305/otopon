# 効果音BOX共有API

Cloudflare Workers + D1 + Workers KVで、投稿音源・いいね・通報・公開状態を管理します。投稿音源は保存後すぐ公開されます。

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

## 運営API

- `GET /api/admin/sounds?status=approved`
- `GET /api/admin/sounds/:id/audio`
- `PUT /api/admin/sounds/:id` body: `{ "status": "hidden" }` または `{ "status": "rejected" }`

どちらも `Authorization: Bearer <ADMIN_TOKEN>` が必要です。`hidden` は公開停止、`rejected` は公開停止に加えてKV上の音声ファイルも削除します。
