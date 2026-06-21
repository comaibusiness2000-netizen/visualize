param(
  [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"
$Git = "C:\Program Files\Git\cmd\git.exe"

function Stop-WithMessage($Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Write-Host ""
  Read-Host "Premi Invio per chiudere"
  exit 1
}

if (!(Test-Path $Git)) {
  Stop-WithMessage "Git non trovato in C:\Program Files\Git. Installa Git for Windows e riprova."
}

if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
  Write-Host ""
  Write-Host "Prima crea un repository GitHub chiamato visualize-app:" -ForegroundColor Yellow
  Write-Host "https://github.com/new"
  Write-Host ""
  Write-Host "Poi copia l'URL HTTPS del repository, tipo:"
  Write-Host "https://github.com/TUO-UTENTE/visualize-app.git"
  Write-Host ""
  $RepoUrl = Read-Host "Incolla qui l'URL del repository GitHub"
}

if ($RepoUrl -notmatch "^https://github\.com/.+/.+\.git$") {
  Stop-WithMessage "URL non valido. Deve somigliare a https://github.com/TUO-UTENTE/visualize-app.git"
}

Write-Host ""
Write-Host "Preparo il repository locale..." -ForegroundColor Cyan
& $Git config --global --add safe.directory (Get-Location).Path
& $Git init
& $Git branch -M main

$UserName = & $Git config user.name
if ([string]::IsNullOrWhiteSpace($UserName)) {
  $UserName = Read-Host "Nome Git da usare nei commit"
  & $Git config user.name $UserName
}

$UserEmail = & $Git config user.email
if ([string]::IsNullOrWhiteSpace($UserEmail)) {
  $UserEmail = Read-Host "Email Git da usare nei commit"
  & $Git config user.email $UserEmail
}

& $Git add .
$Status = & $Git status --porcelain
if (![string]::IsNullOrWhiteSpace($Status)) {
  & $Git commit -m "Publish Visualize prototype"
} else {
  Write-Host "Nessuna modifica nuova da committare."
}

& $Git remote remove origin 2>$null
& $Git remote add origin $RepoUrl

Write-Host ""
Write-Host "Invio su GitHub. Se GitHub chiede login, completa la finestra di autenticazione." -ForegroundColor Cyan
& $Git push -u origin main

$RepoWebUrl = $RepoUrl -replace "\.git$", ""
$RepoWebUrl = $RepoWebUrl -replace "^https://github\.com/", "https://github.com/"
$PagesUrl = "$RepoWebUrl/settings/pages"
$ActionsUrl = "$RepoWebUrl/actions"

Write-Host ""
Write-Host "Ora completa GitHub Pages:" -ForegroundColor Green
Write-Host "1. Settings -> Pages"
Write-Host "2. Build and deployment -> GitHub Actions"
Write-Host "3. Actions -> Deploy Visualize Preview"
Write-Host ""
Write-Host "Apro le pagine nel browser..."
Start-Process $PagesUrl
Start-Process $ActionsUrl

Write-Host ""
Write-Host "Quando il deploy finisce, GitHub mostra il link stabile." -ForegroundColor Green
Write-Host "Sara simile a: https://TUO-UTENTE.github.io/visualize-app/"
Write-Host ""
Read-Host "Premi Invio per chiudere"
