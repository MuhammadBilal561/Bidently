$Root = "D:\New folder\Bidently-main\Bidently-main"
Set-Location $Root
foreach ($f in @("validate.log","validate.err")) { if (Test-Path $f) { Remove-Item $f -Force } }
$cmdLine = '/c "' + (Join-Path $Root "validate.cmd") + '"'
$p = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdLine `
  -WorkingDirectory $Root `
  -RedirectStandardOutput (Join-Path $Root "validate.log") `
  -RedirectStandardError  (Join-Path $Root "validate.err") `
  -WindowStyle Hidden -PassThru
$p.Id | Set-Content (Join-Path $Root "validate.pid")
Write-Output ("PID=" + $p.Id)