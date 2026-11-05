$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$workspace = (Resolve-Path '.').Path
$evidence = Join-Path $workspace 'docs/validation/ts-035c'
$archivePath = Join-Path $evidence 'transport-artifacts.zip'
if (Test-Path -LiteralPath $archivePath) { throw 'Archive already exists; preserve it before another capture' }
$roots = @('script-observations-final','script-observations-lifecycle','script-observations-preflight','script-observations-pinned')
$index = [System.Collections.Generic.List[object]]::new()
$zipStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::CreateNew)
$zip = [System.IO.Compression.ZipArchive]::new($zipStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
try {
  foreach ($name in $roots) {
    $source = (Resolve-Path -LiteralPath (Join-Path $workspace "build/$name")).Path
    if (-not $source.StartsWith($workspace + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Outside workspace' }
    foreach ($file in (Get-ChildItem -LiteralPath $source -File -Recurse | Sort-Object FullName)) {
      $relative = 'build/' + $name + '/' + $file.FullName.Substring($source.Length + 1).Replace('\','/')
      $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
      $inputStream = [System.IO.File]::OpenRead($file.FullName)
      $outputStream = $entry.Open()
      try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose(); $inputStream.Dispose() }
      $index.Add([pscustomobject]@{path=$relative; bytes=$file.Length; sha256=$hash})
    }
  }
} finally { $zip.Dispose(); $zipStream.Dispose() }
$verifyStream = [System.IO.File]::OpenRead($archivePath)
$verify = [System.IO.Compression.ZipArchive]::new($verifyStream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
try {
  if ($verify.Entries.Count -ne $index.Count) { throw 'Count mismatch' }
  foreach ($row in $index) {
    $entry = $verify.GetEntry($row.path)
    $stream = $entry.Open()
    $digest = [System.Security.Cryptography.SHA256]::Create()
    try { $actual = [System.BitConverter]::ToString($digest.ComputeHash($stream)).Replace('-','').ToLowerInvariant() } finally { $digest.Dispose(); $stream.Dispose() }
    if ($actual -ne $row.sha256 -or $entry.Length -ne $row.bytes) { throw "Archive mismatch: $($row.path)" }
  }
} finally { $verify.Dispose(); $verifyStream.Dispose() }
@{archive='transport-artifacts.zip'; files=$index.Count; sha256=(Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant(); entries=$index} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidence 'transport-artifacts-index.json') -Encoding utf8
Write-Output "Verified $($index.Count) archived files"
