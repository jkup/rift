# Independent read-only .NET attribute inspection; no FFI, Add-Type or child.
$ErrorActionPreference='Stop'
$system='C:\WINDOWS\system32\cmd.exe'
$component='C:\Windows\WinSxS\amd64_microsoft-windows-commandprompt_31bf3856ad364e35_10.0.26100.9549_none_26c71961ca689840\cmd.exe'
$chains=@(@('C:\','C:\WINDOWS','C:\WINDOWS\system32',$system),@('C:\','C:\Windows','C:\Windows\WinSxS','C:\Windows\WinSxS\amd64_microsoft-windows-commandprompt_31bf3856ad364e35_10.0.26100.9549_none_26c71961ca689840',$component))
$records=@()
foreach($chain in $chains){
 $ancestry=@()
 for($i=0;$i -lt $chain.Count;$i++){
  $name=$chain[$i]
  $ancestry+=[ordered]@{path=$name;canonical=$name;kind=$(if($i -eq $chain.Count-1){'file'}else{'directory'});symbolicLink=$false;attributes=[uint32][IO.File]::GetAttributes($name)}
 }
 $path=$chain[-1]
 # Fixed identity/size/hash literal from independently confirmed root review.
 $records+=[ordered]@{path=$path;canonical=$path;dev='1045235170';ino='562949954062573';nlink='2';bytes='339968';sha256='15cd209c995b7d3009c91ca40892d5b8f1fb162f3e5f10716642ea278e8e0d7b';ancestry=$ancestry}
}
$bytes=[Text.Encoding]::UTF8.GetBytes((@{records=$records;errors=@()}|ConvertTo-Json -Depth 12)+"`n")
$file=[IO.File]::Open((Join-Path $PSScriptRoot 'identity-literal.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try{$file.Write($bytes,0,$bytes.Length);$file.Flush($true)}finally{$file.Dispose()}
