param([Parameter(Mandatory=$true)][string]$CaseRoot)
$ErrorActionPreference='Stop'
$config=Get-Content -LiteralPath (Join-Path $CaseRoot 'case.json') -Raw | ConvertFrom-Json
$result=$null
try {
    Add-Type -Path (Join-Path $CaseRoot 'supervisor-under-test.cs')
    [TestHooks]::Root=$CaseRoot
    [TestHooks]::PauseAt=$config.pauseAt
    [TestHooks]::Fault=$config.fault
    $pairs=@($config.environment.PSObject.Properties | ForEach-Object {$_.Name+'='+[string]$_.Value})
    $exe=[string]$config.node
    if($config.mode -eq 'missing-executable') {$exe=Join-Path $CaseRoot 'does-not-exist.exe'}
    $argsForChild=[string[]]@((Join-Path $CaseRoot 'benign-child.mjs'),[string]$config.mode,$CaseRoot,[string]$config.token)
    $result=[ProbeSupervisor]::Run($exe,$argsForChild,[string[]]$pairs,$CaseRoot,60000,8388608,10000)
} catch {$result=@{Outcome='harness-setup-error';Error=$_.ToString();CleanupConfirmed=$false}}
$b=[Text.Encoding]::UTF8.GetBytes(($result|ConvertTo-Json -Depth 20)+"`n")
$f=[IO.File]::Open((Join-Path $CaseRoot 'status.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try {$f.Write($b,0,$b.Length);$f.Flush($true)} finally {$f.Dispose()}
