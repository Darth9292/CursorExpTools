# Run in Windows PowerShell: cd E:\CursorExperimentalTools; .\scripts\push-to-github.ps1
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$env:GIT_PAGER = ""
$env:GCM_INTERACTIVE = "always"

Write-Host "Repo: $root"
Write-Host ""

& git -c core.pager=cat fetch origin 2>&1 | Out-Host

Write-Host "Commits to push:"
& git -c core.pager=cat log --oneline origin/main..main 2>&1 | Out-Host
Write-Host ""

$aheadRaw = & git -c core.pager=cat rev-list --count origin/main..main 2>&1
$aheadLine = ($aheadRaw | Select-Object -Last 1) -as [string]
$ahead = 0
if ($aheadLine -match '^\d+$') {
  $ahead = [int]$aheadLine
}

if ($ahead -eq 0) {
  Write-Host "Nothing to push (already up to date with origin/main)."
  exit 0
}

Write-Host "Pushing $ahead commit(s) to origin/main ..."
& git -c core.pager=cat push -u origin main 2>&1 | Out-Host
if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done. Open https://github.com/Darth9292/CursorExpTools"
  exit 0
}

Write-Host ""
Write-Host "HTTPS push failed. Use a Personal Access Token (classic, scope: repo)."
Write-Host "Create: https://github.com/settings/tokens/new?scopes=repo&description=CursorExpTools-push"
Write-Host ""
$pat = Read-Host "Paste PAT (input hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pat)
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "Empty token. Exiting."
  exit 1
}

$safeRemote = "https://github.com/Darth9292/CursorExpTools.git"
$pushUrl = "https://x-access-token:${token}@github.com/Darth9292/CursorExpTools.git"
& git -c core.pager=cat push $pushUrl main:main 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host "Push failed. Check token has 'repo' scope and you own Darth9292/CursorExpTools."
  exit 1
}

& git remote set-url origin $safeRemote 2>&1 | Out-Null
& git branch --set-upstream-to=origin/main main 2>&1 | Out-Null
Write-Host ""
Write-Host "Done. Open https://github.com/Darth9292/CursorExpTools"
