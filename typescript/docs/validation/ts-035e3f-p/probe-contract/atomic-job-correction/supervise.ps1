param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$statusPath = Join-Path $config.root 'supervisor-status.json'
$result = $null
try {
    # Evidence-only supervisor; never run during design validation. Add-Type is
    # an in-process C# compilation dependency of future supervision, not scriptc.
    Add-Type -Path (Join-Path $config.root 'supervisor.cs')
    $environmentPairs = @($config.childEnvironment.PSObject.Properties | ForEach-Object { $_.Name + '=' + [string]$_.Value })
    $result = [ProbeSupervisor]::Run(
        (Join-Path $config.root 'node_modules\scriptc\bin\scriptc.exe'),
        [string[]]$config.argv, [string[]]$environmentPairs, [string]$config.root,
        [int]$config.timeoutMs, [int]$config.streamCapBytes, [int]$config.cleanupMs)
} catch {
    $result = @{ outcome='supervisor-fault'; error=$_.ToString(); cleanupConfirmed=$false; compilerOutcome='unknown'; effects='unobserved outside recorded inventories' }
}
try {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($result | ConvertTo-Json -Depth 20) + "`n")
    $file = [IO.File]::Open($statusPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $file.Write($bytes, 0, $bytes.Length); $file.Flush($true) } finally { $file.Dispose() }
} catch {
    [Console]::Error.WriteLine($_.ToString())
    exit 74
}
if ($result.Outcome -eq 'completed-observation' -and $result.CleanupConfirmed) { exit 0 }
exit 70
