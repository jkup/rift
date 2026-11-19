$ErrorActionPreference = 'Stop'
# Read retained C archive only. Write two exact producer bundles in this directory.
$evidenceRoot = $PSScriptRoot
$archivePath = Join-Path $evidenceRoot '../ts-035c/transport-artifacts.zip'
$archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $archivePath))
$selected = @{}
try {
  foreach ($entry in $archive.Entries) {
    if (-not $entry.FullName.EndsWith('/plan.json')) { continue }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { $plan = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    $lane = $plan.context.identity.lane
    if ($lane -notin @('node', 'native') -or $selected.ContainsKey($lane)) { continue }
    $prefix = $entry.FullName.Substring(0, $entry.FullName.Length - 'plan.json'.Length)
    $names = @('plan.json', 'child.json', 'record.json', 'completion.json', 'LICENSE')
    if (@($names | Where-Object { $null -eq $archive.GetEntry($prefix + $_) }).Count -ne 0) { continue }
    $output = Join-Path $evidenceRoot ('producer-' + $lane)
    [IO.Directory]::CreateDirectory($output) | Out-Null
    foreach ($name in $names) {
      $source = $archive.GetEntry($prefix + $name).Open()
      $target = [IO.File]::Open((Join-Path $output $name), [IO.FileMode]::Create)
      try { $source.CopyTo($target) } finally { $source.Dispose(); $target.Dispose() }
    }
    [IO.File]::WriteAllText((Join-Path $output 'archive-path.txt'), $prefix + "`n")
    $selected[$lane] = $prefix
  }
} finally { $archive.Dispose() }
if ($selected.Count -ne 2) { throw 'Missing retained producer lane' }
$selected | ConvertTo-Json
