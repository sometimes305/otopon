# 効果音BOX

GRAVITYの音声ルーム内で使う、iPhone向け効果音ボックスです。GitHub Pagesへ置いたURLをGRAVITY内のローダーで開く想定です。

## 初版でできること

- 24種類のOtoLogic効果音（CC BY 4.0）をワンタップ再生
- Web Audio非対応のWebViewではHTML Audioへ自動切替
- 同時再生と「全停止」、端末内の音量調整
- 「すべて」「初期音源」「投稿音源」「いいね」の4タブ
- 初期音源と投稿音源のいいねをGRAVITYユーザー単位で保存
- 画面高が短いGRAVITY内WebViewにも収まる3列UI
- Cloudflare共有API接続時は、投稿音源の取得・投稿・いいねを利用可能
- ずんだもん（ノーマル）による最大80文字の読み上げ

## GRAVITYで音が届く仕組み

このアプリは、ボタンを押したiPhoneで効果音を再生するだけです。GRAVITYでマイクが上がっていると、端末内で再生した音が音声ルームへ載るという実機挙動を利用します。

- マイクON: 効果音がルームへ流れる
- マイクOFF: 押した本人の端末だけで鳴る
- 視聴者端末で同期再生はしない（二重再生を防ぐため）

そのため、効果音の再生にはWebRTCやGRAVITYルームメッセージを使いません。初期・投稿音源は従来どおりiPhone内で再生し、ずんだもんの生成時だけCloudflare WorkerとCloud Runへ接続します。

## 開発

```bash
npm install
npm run dev
npm run check
```

共有APIも動かす場合は `.env.example` を `.env.local` としてコピーし、別ターミナルで次を実行します。

```bash
npm run worker:migrate:local
npm run worker:dev
```

`npm run build` の出力は `dist/` です。Viteの `base` は相対パスなので、GitHub Pagesのプロジェクト配下でも動作します。

## 公開

1. このフォルダをGitHubリポジトリへpushします。
2. GitHub ActionsまたはPages設定から `dist/` を公開します。
3. 公開URLをGRAVITYのUGCローダーへ設定します。
4. iPhoneでマイクON/OFFの両方を実機確認します。

### みんなの音源

ユーザー投稿音源は全利用者へ公開する前提です。端末内だけに保存する機能は設けません。共有基盤は次の構成です。

- Cloudflare Worker: API、形式・容量検査、レート制限
- Workers KV: MP3・M4A・WAVファイル（無料枠1GB）
- D1: 投稿者、公開状態、いいね、通報
- 投稿直後に全利用者へ公開し、通報対象は運営が非公開・削除可能
- 同一ファイルのハッシュ重複検査、1ユーザー1時間3件まで

デプロイ手順と運営APIは [`worker/README.md`](worker/README.md) を参照してください。

GRAVITY SDKから取得したユーザーIDは表示といいねの紐付けに使います。ただし、現在確認できているSDKにはサーバー検証用の署名情報がないため、強い本人認証としては扱いません。

### ずんだもん

VOICEVOX EngineをCloud Runで動かし、ずんだもん（ノーマル）の音声だけを生成します。文章と生成WAVは保存せず、その場でiPhoneへ返して再生します。Worker側で4秒間隔・1時間30回・サービス全体1日200回に制限しています。

アプリ内には `VOICEVOX:ずんだもん` のクレジットを表示しています。キャラクター画像は音声と別ライセンスのため使用していません。構成と公開手順は [`docs/ZUNDAMON_DEPLOY.md`](docs/ZUNDAMON_DEPLOY.md) を参照してください。

## 音源ライセンス

収録ファイルの出典は [`docs/SOUND_LICENSES.md`](docs/SOUND_LICENSES.md) を参照してください。
