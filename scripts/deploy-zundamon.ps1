param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [string]$Region = "asia-northeast1"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Repository = "otopon"
$Service = "zundamon-tts"
$SecretName = "zundamon-tts-secret"
$ProxyImage = "$Region-docker.pkg.dev/$ProjectId/$Repository/zundamon-proxy:0.1.0"
$LocalGcloudBin = Join-Path $env:LOCALAPPDATA "GoogleCloudCLI\google-cloud-sdk\bin"
$SecretValueFile = $null
$WorkerSecretsFile = $null
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $LocalGcloudBin "gcloud.cmd"))) {
  $env:Path = "$LocalGcloudBin;$env:Path"
}
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "Google Cloud SDKが見つかりません"
}

Push-Location $RepoRoot
try {
  $SecretValueFile = [IO.Path]::GetTempFileName()
  $WorkerSecretsFile = [IO.Path]::GetTempFileName()
  gcloud config set project $ProjectId
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

  $PSNativeCommandUseErrorActionPreference = $false
  gcloud artifacts repositories describe $Repository --location=$Region 2>$null
  $RepositoryExists = $LASTEXITCODE -eq 0
  $PSNativeCommandUseErrorActionPreference = $true
  if (-not $RepositoryExists) {
    gcloud artifacts repositories create $Repository --repository-format=docker --location=$Region --description="Effect BOX runtime images"
  }

  gcloud builds submit .\tts-service --tag=$ProxyImage

  $SecretBytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($SecretBytes)
  $TtsSecret = [Convert]::ToHexString($SecretBytes).ToLowerInvariant()
  [IO.File]::WriteAllText($SecretValueFile, $TtsSecret, [Text.UTF8Encoding]::new($false))

  $PSNativeCommandUseErrorActionPreference = $false
  gcloud secrets describe $SecretName 2>$null
  $SecretExists = $LASTEXITCODE -eq 0
  $PSNativeCommandUseErrorActionPreference = $true
  if ($SecretExists) {
    gcloud secrets versions add $SecretName --data-file=$SecretValueFile
  } else {
    gcloud secrets create $SecretName --replication-policy=automatic --data-file=$SecretValueFile
  }

  $ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
  $RuntimeAccount = "$ProjectNumber-compute@developer.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding $SecretName --member="serviceAccount:$RuntimeAccount" --role="roles/secretmanager.secretAccessor"

  gcloud run deploy $Service `
    --region=$Region `
    --allow-unauthenticated `
    --execution-environment=gen2 `
    --concurrency=1 `
    --min=0 `
    --max=1 `
    --timeout=120 `
    --cpu-boost `
    --container=proxy `
    --image=$ProxyImage `
    --port=8080 `
    --cpu=1 `
    --memory=512Mi `
    --set-env-vars="START_ENGINE=0,VOICEVOX_URL=http://127.0.0.1:50021" `
    --set-secrets="TTS_SECRET=$SecretName`:latest" `
    --container=engine `
    --image="docker.io/voicevox/voicevox_engine:cpu-ubuntu22.04-0.26.1" `
    --cpu=2 `
    --memory=2Gi `
    --command=/bin/sh `
    --args='-c,exec /opt/voicevox_engine/run --host 127.0.0.1 --port 50021 --disable_mutable_api >/dev/null 2>&1'

  $ServiceUrl = gcloud run services describe $Service --region=$Region --format="value(status.url)"
  if (-not $ServiceUrl) { throw "Cloud Run URLを取得できませんでした" }

  npm run worker:migrate:remote
  $WorkerSecrets = @{ TTS_URL = $ServiceUrl; TTS_SECRET = $TtsSecret } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText($WorkerSecretsFile, $WorkerSecrets, [Text.UTF8Encoding]::new($false))
  npx wrangler secret bulk $WorkerSecretsFile --config worker/wrangler.jsonc
  npx wrangler deploy --config worker/wrangler.jsonc

  Write-Host "ずんだもん読み上げを公開しました: $ServiceUrl"
} finally {
  if ($SecretValueFile) { Remove-Item -LiteralPath $SecretValueFile -Force -ErrorAction SilentlyContinue }
  if ($WorkerSecretsFile) { Remove-Item -LiteralPath $WorkerSecretsFile -Force -ErrorAction SilentlyContinue }
  Pop-Location
}
