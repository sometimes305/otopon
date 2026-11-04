# ずんだもん読み上げの公開

## 構成

- GitHub Pages: 入力画面とWAV再生。生成音声を保存しない
- Cloudflare Worker: GRAVITYユーザー確認、4秒間隔・1時間30回・全体1日200回の制限
- Cloud Run: 小さなPythonプロキシと、公式VOICEVOX Engineのサイドカー。文章を含むエンジンアクセスログは出力しない
- D1: 回数制限の時刻と件数だけを保存。文章と音声は保存しない

VOICEVOX本体はDocker Hubの公式イメージをCloud Runが直接取り込みます。Artifact Registryへ保存するのは小さなPythonプロキシだけなので、0.5GBの無料保存枠へ収まりやすい構成です。

## 初回公開

Google Cloudは無料枠でも請求先アカウントの登録が必要です。Cloud SDKへログインして、請求先を有効にしたプロジェクトIDを確認します。

```powershell
gcloud auth login
gcloud projects list
```

リポジトリのルートで次を実行します。

```powershell
.\scripts\deploy-zundamon.ps1 -ProjectId "プロジェクトID"
```

スクリプトはAPI有効化、プロキシのビルド、Secret Manager、Cloud Run、D1マイグレーション、Workerの秘密値と再公開まで行います。秘密値は毎回ランダム生成し、ソースや生成音声には保存しません。

## 無料枠について

最小インスタンス0、最大インスタンス1、同時実行1に固定しています。小規模利用ならCloud Run・Cloud Build・Secret Manager・Artifact Registryの無料枠内に収まりやすい設定ですが、Google Cloudは完全な支出上限を提供しないため、無料を保証するものではありません。Google Cloud側でも予算アラートを設定してください。

初回またはしばらく未使用の後は、VOICEVOX Engineの起動に30〜90秒ほどかかる場合があります。

## 表示と規約

画面には `VOICEVOX:ずんだもん` と表示します。公開・運用時は[VOICEVOXソフトウェア利用規約](https://voicevox.hiroshiba.jp/term/)と[ずんだもん音源利用規約](https://zunko.jp/con_ongen_kiyaku.html)を確認してください。キャラクター画像は使用していません。
