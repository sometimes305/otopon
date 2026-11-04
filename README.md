# 音ポン

GRAVITYの音声ルーム内で使う、iPhone向け効果音ボックスです。GitHub Pagesへ置いたURLをGRAVITY内のローダーで開く想定です。

## 初版でできること

- 12種類のCC0効果音をワンタップ再生
- Web Audio非対応のWebViewではHTML Audioへ自動切替
- 同時再生と「全停止」、端末内の音量調整
- 「すべて」「初期音源」「投稿音源」「いいね」の4タブ
- 画面高が短いGRAVITY内WebViewにも収まる3列UI
- Cloudflare共有API接続時は、投稿音源の取得・投稿・いいねを利用可能
- 「ずんだもん」機能の導線（生成処理は未接続）

## GRAVITYで音が届く仕組み

このアプリは、ボタンを押したiPhoneで効果音を再生するだけです。GRAVITYでマイクが上がっていると、端末内で再生した音が音声ルームへ載るという実機挙動を利用します。

- マイクON: 効果音がルームへ流れる
- マイクOFF: 押した本人の端末だけで鳴る
- 視聴者端末で同期再生はしない（二重再生を防ぐため）

そのため、初版はサーバー・WebRTC・GRAVITYルームメッセージを使いません。GitHub Pagesだけで無料運用できます。

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

VOICEVOX Engineをサーバー側で動かして音声を生成し、生成結果をボタンへ追加する構成を想定しています。公開時はアプリ内の分かる場所へ `VOICEVOX:ずんだもん` のクレジットを表示し、VOICEVOXとずんだもん音源の両規約、禁止用途を確認します。キャラクター画像は音声と別ライセンスのため、初版UIでは使用していません。

## 音源ライセンス

収録ファイルの出典は [`docs/SOUND_LICENSES.md`](docs/SOUND_LICENSES.md) を参照してください。
