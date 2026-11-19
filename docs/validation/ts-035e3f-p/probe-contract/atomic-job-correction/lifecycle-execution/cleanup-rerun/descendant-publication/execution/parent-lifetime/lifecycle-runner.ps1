param([switch]$ReviewedLifecycle)
$ErrorActionPreference='Stop'
if(-not $ReviewedLifecycle){throw 'Root actual/second review required. This design harness must not run yet.'}
$here=$PSScriptRoot
$contract=Get-Content -LiteralPath (Join-Path $here 'contract.json') -Raw | ConvertFrom-Json
$cases=Get-Content -LiteralPath (Join-Path $here 'lifecycle-cases.json') -Raw | ConvertFrom-Json
$pumpExpected=Get-Content -LiteralPath (Join-Path $here 'pump-literals.json') -Raw | ConvertFrom-Json
$streamExpected=Get-Content -LiteralPath (Join-Path $here 'stream-literals.json') -Raw | ConvertFrom-Json
& $contract.node (Join-Path $here 'verify.mjs') --check-original-build --preflight
if($LASTEXITCODE -ne 0){throw 'Frozen correction verification failed; no C# compilation'}
$root='C:\Users\jonku\code\rift\typescript\build\ts035e3fp-atomic-job-lifecycle-parent-live'
if(Test-Path -LiteralPath $root){throw 'Existing lifecycle output: stop, never reuse or delete'}
[IO.Directory]::CreateDirectory($root)|Out-Null
# A racing second harness cannot acquire this exclusive reservation. It is never
# removed, reused or interpreted as restart authority.
$reservation=[IO.File]::Open((Join-Path $root 'owner.lock'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
$reservation.Dispose()
function Save-Exclusive($path,$data){$b=[Text.Encoding]::UTF8.GetBytes(($data|ConvertTo-Json -Depth 30)+"`n");$f=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$f.Write($b,0,$b.Length);$f.Flush($true)}finally{$f.Dispose()}}
function Need($condition,$why){if(-not $condition){throw $why}}
function Wait-File($path,$milliseconds){$clock=[Diagnostics.Stopwatch]::StartNew();while(-not(Test-Path -LiteralPath $path)){if($clock.ElapsedMilliseconds -ge $milliseconds){throw "checkpoint missing: $path"};Start-Sleep -Milliseconds 10}}
Save-Exclusive (Join-Path $root 'plan.json') $cases
[IO.File]::Copy((Join-Path $here 'observer.cs'),(Join-Path $root 'observer.cs'),$false)
# No source compiler is used. Add-Type compiles only the reviewed observer helper.
# Its own failure is setup-error and stops before any supervisor/child is launched.
try {Add-Type -Path (Join-Path $root 'observer.cs')}
catch {Save-Exclusive (Join-Path $root 'observer-setup-failure.json') @{error=$_.ToString();caseInvocations=0};throw}
$results=@()
foreach($case in $cases){
 $caseRoot=Join-Path $root $case.id
 [IO.Directory]::CreateDirectory($caseRoot)|Out-Null
 $observer=$null
 $row=[ordered]@{id=$case.id;kind='unmeasured-until-run';status='setup-error';errors=@();membersBeforeKill=$null;membersBeforeSafety=$null;emptyBeforeSafety=$null;safetyCleanup=$false;statusData=$null;expectation=$case;supervisorPid=$null;childMarker=$null}
 try {
  $environment=[ordered]@{}
  foreach($property in $contract.childEnvironment.PSObject.Properties){$environment[$property.Name]=([string]$property.Value).Replace([string]$contract.root,$caseRoot)}
  foreach($key in @('APPDATA','LOCALAPPDATA','PROGRAMDATA','TEMP','USERPROFILE','SCRIPTC_CACHE_DIR','ZIG_GLOBAL_CACHE_DIR','ZIG_LOCAL_CACHE_DIR')){[IO.Directory]::CreateDirectory($environment[$key])|Out-Null}
  $token='canary-'+[Guid]::NewGuid().ToString()
  $configuration=@{node=$contract.node;environment=$environment;mode=$case.mode;pauseAt=$case.pauseAt;fault=$case.fault;token=$token}
  Save-Exclusive (Join-Path $caseRoot 'case.json') $configuration
  [IO.File]::Copy((Join-Path $here 'benign-child.mjs'),(Join-Path $caseRoot 'benign-child.mjs'),$false)
  $sourceName=if($case.source -eq 'legacy'){'supervisor.legacy-control.cs'}else{'supervisor.lifecycle.cs'}
  [IO.File]::Copy((Join-Path $here $sourceName),(Join-Path $caseRoot 'supervisor-under-test.cs'),$false)
  [IO.File]::Copy((Join-Path $here 'lifecycle-supervise.ps1'),(Join-Path $caseRoot 'lifecycle-supervise.ps1'),$false)
  Save-Exclusive (Join-Path $caseRoot 'copied-source-identities.json') @(@('benign-child.mjs','supervisor-under-test.cs','lifecycle-supervise.ps1') | ForEach-Object { $path=Join-Path $caseRoot $_; @{path=$_;bytes=(Get-Item -LiteralPath $path).Length;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()} })
  if($case.fault -eq 'existing-output'){[IO.File]::WriteAllText((Join-Path $caseRoot 'compiler.stdout.bin'),'original-output')}
  $pairs=[string[]]@($environment.GetEnumerator()|ForEach-Object {$_.Key+'='+$_.Value})
  $argsForSupervisor=[string[]]@('-NoLogo','-NoProfile','-NonInteractive','-File',(Join-Path $caseRoot 'lifecycle-supervise.ps1'),'-CaseRoot',$caseRoot)
  Save-Exclusive (Join-Path $caseRoot 'invocation.json') @{exe=$contract.supervisor;argv=$argsForSupervisor;cwd=$caseRoot;environment=$environment}
  $observer=[LifecycleObserver]::new()
  $observer.Start([string]$contract.supervisor,$argsForSupervisor,$pairs,$caseRoot)
  $row.supervisorPid=$observer.Pid
  if($case.action -in @('kill','release','kill-descendant','race-kill','observe-parent-exit')){
   Wait-File (Join-Path $caseRoot ('point-'+$case.pauseAt+'.txt')) 20000
   $row.childMarker=[IO.File]::ReadAllText((Join-Path $caseRoot ('point-'+$case.pauseAt+'.txt')))
   $row.membersBeforeKill=@($observer.Members())
   if($case.pauseAt -ne 'before-create') {Need ($row.membersBeforeKill.Count -ge 2) 'child not independently present before boundary action'}
   if($case.pauseAt -ne 'before-create' -and $case.mode -ne 'descendant'){Need ($row.membersBeforeKill -contains [ulong]$row.childMarker.Trim()) 'marked child absent from independent outer-job members'}
   if($case.action -in @('kill-descendant','observe-parent-exit')){
    Wait-File (Join-Path $caseRoot 'descendant-pid.txt') 10000
    $descendantId=[ulong]([IO.File]::ReadAllText((Join-Path $caseRoot 'descendant-pid.txt')).Trim())
    $row.membersBeforeKill=@($observer.Members());Need ($row.membersBeforeKill -contains $descendantId) 'descendant not independently present'
    $parentId=[uint]$row.childMarker.Trim()
    Need ($row.membersBeforeKill -contains [ulong]$parentId) 'parent not independently present'
    $ready=Get-Content -LiteralPath (Join-Path $caseRoot 'parent-ready.json') -Raw | ConvertFrom-Json
    $leaf=Get-Content -LiteralPath (Join-Path $caseRoot 'leaf-ready.json') -Raw | ConvertFrom-Json
    Need ($ready.parent.pid -eq $parentId -and $ready.parent.token -ceq $token -and $ready.parent.mode -ceq $case.mode) 'parent-ready identity mismatch'
    Need ($leaf.pid -eq $descendantId -and $leaf.ppid -eq $parentId -and $leaf.token -ceq $token -and $leaf.mode -ceq 'leaf-ready') 'leaf-ready identity mismatch'
    Need (($ready.leaf|ConvertTo-Json -Compress) -ceq ($leaf|ConvertTo-Json -Compress)) 'closed leaf-ready records differ'
    $row.processIdentities=@()
    $row.processIdentities+= $observer.CaptureMember($parentId)
    $row.processIdentities+= $observer.CaptureMember([uint]$descendantId)
    foreach($identity in $row.processIdentities){Need ([string]::Equals([string]$identity.Image,[string]$contract.node,[StringComparison]::OrdinalIgnoreCase)) 'observed process image differs from pinned Node path'}
    Need (-not $observer.WaitMember($parentId,0) -and -not $observer.WaitMember([uint]$descendantId,0)) 'ready process exited before boundary action'
    if($case.action -eq 'observe-parent-exit'){
     Save-Exclusive (Join-Path $caseRoot 'parent-exit-request.json.pending') @{action='exit-parent';token=$token}
     [IO.File]::Move((Join-Path $caseRoot 'parent-exit-request.json.pending'),(Join-Path $caseRoot 'parent-exit-request.json'))
     Need ($observer.WaitMember($parentId,10000)) 'diagnostic parent-exit deadline'
     $row.parentNativeExit=$observer.MemberExit($parentId)
     Need ($row.parentNativeExit -eq 0) 'diagnostic parent did not exit zero'
     $intent=Get-Content -LiteralPath (Join-Path $caseRoot 'parent-exit-intent.json') -Raw | ConvertFrom-Json
     Need ($intent.pid -eq $parentId -and $intent.leafPid -eq $descendantId -and $intent.token -ceq $token -and $intent.code -eq 0) 'diagnostic parent-exit intent mismatch'
     $leafExited=$observer.WaitMember([uint]$descendantId,10000)
     $row.diagnosticOutcome=if($leafExited){'leaf-exited-after-parent-exit'}else{'leaf-running-at-deadline-after-parent-exit'}
     $row.leafNativeExit=if($leafExited){$observer.MemberExit([uint]$descendantId)}else{$null}
     $row.membersAfterParentExit=@($observer.Members())
     # Record observation before any supervisor or outer-job termination.
     Save-Exclusive (Join-Path $caseRoot 'parent-exit-observation.json') @{kind='parent-exit-observation-before-supervisor-kill';processIdentities=$row.processIdentities;membersBeforeKill=$row.membersBeforeKill;parentNativeExit=$row.parentNativeExit;diagnosticOutcome=$row.diagnosticOutcome;leafNativeExit=$row.leafNativeExit;membersAfterParentExit=$row.membersAfterParentExit}
    }
   }
   if($case.action -eq 'race-kill'){
    [IO.File]::WriteAllText((Join-Path $caseRoot ('release-'+$case.pauseAt+'.txt')),'release')
    if($case.delayMs -gt 0){Start-Sleep -Milliseconds $case.delayMs}
    $row.membersBeforeKill=@($observer.Members())
   }
   if($case.action -in @('kill','kill-descendant','race-kill','observe-parent-exit')){$observer.KillRoot()}
   else{[IO.File]::WriteAllText((Join-Path $caseRoot ('release-'+$case.pauseAt+'.txt')),'release')}
  }
  Need ($observer.WaitRoot(90000)) 'supervisor deadline: setup/cleanup failure, not expected rejection'
  $row.emptyBeforeSafety=$observer.WaitEmpty(10000)
  $row.membersBeforeSafety=@($observer.Members())
  if($case.expect -eq 'survivor-detected-before-safety-cleanup'){
   Need (-not $row.emptyBeforeSafety -and $row.membersBeforeSafety.Count -ge 1) 'legacy control did not expose survivor'
  }else{Need $row.emptyBeforeSafety 'survivor detected before fallback: failed lifecycle'}
  if($case.action -notin @('kill','kill-descendant','race-kill','observe-parent-exit')){
   $status=Get-Content -LiteralPath (Join-Path $caseRoot 'status.json') -Raw | ConvertFrom-Json
   $row.statusData=$status
   Need ($status.Outcome -ne 'harness-setup-error') 'C# compilation/harness setup failed; not rejection'
   Need ($status.CleanupConfirmed -eq $true) 'inner cleanup unconfirmed'
   Need ($status.Resumed -eq $case.resumed) 'resume mismatch'
   Need ($status.StopReason -eq $case.stop) 'wrong failure stage'
   if($case.expect -eq 'completed'){Need ($status.Outcome -eq 'completed-observation' -and $status.NativeExitCode -eq 0) 'positive mismatch';Need ([IO.File]::ReadAllText((Join-Path $caseRoot 'compiler.stdout.bin')) -eq "ok`n") 'positive stdout mismatch'}
   else{Need ($status.Outcome -eq 'failed-observation-stop-review') 'failure outcome mismatch'}
   if($case.expect -eq 'failed-before-create'){Need (-not $status.CreatedSuspended) 'unexpected child creation'}
   if($case.fault -eq 'unsupported'){Need (($status.Errors -join "`n").Contains('creation-time-job-list requires')) 'wrong unsupported failure'}
   if($case.fault -eq 'job-list-setup'){Need (($status.Errors -join "`n").Contains('injected-job-list-setup')) 'wrong setup failure'}
   if($case.fault -eq 'invalid-job'){Need (($status.Errors -join "`n") -match 'creation-time-job-list|create-suspended') 'wrong invalid-job failure'}
   if($case.mode -eq 'missing-executable'){Need (($status.Errors -join "`n").Contains('create-suspended')) 'wrong spawn failure'}
   if($case.fault -eq 'membership-false'){Need (($status.Errors -join "`n").Contains('creation-time-job-membership-missing')) 'wrong membership failure'}
   if($case.fault -in @('first-pump-start','second-pump-start')){
    Need (($status.Errors -join "`n").Contains(('injected-'+$case.fault+'-after-thread-allocation'))) 'wrong pump-start failure'
    $expectedPump=$pumpExpected.($case.fault)
    foreach($stream in @('Stdout','Stderr')){
     Need (@($status.$stream.PSObject.Properties).Count -eq 7) 'pump field count'
     foreach($key in @('ObservedBytes','RetainedBytes','ObservedSha256','Error','Eof','Complete','Overflow')){Need ($status.$stream.$key -ceq $expectedPump.$stream.$key) ('pump literal mismatch '+$stream+'.'+$key)}
    }
   }
   if($case.fault -eq 'stdout-read'){Need ($status.Stdout.Error.Contains('read-pipe')) 'wrong pipe fault'}
   if($case.id -eq 'nonzero'){Need ($status.NativeExitCode -eq 7) 'original exit7 lost'}
   if($case.id -eq 'stdout-cap'){Need ($status.Stdout.Overflow -and $status.Stdout.RetainedBytes -eq 8388608) 'stdout cap missing'}
   if($case.id -eq 'stderr-cap'){Need ($status.Stderr.Overflow -and $status.Stderr.RetainedBytes -eq 8388608) 'stderr cap missing'}
   if($case.id -in @('stdout-cap','stderr-cap')){
    $isOut=$case.id -eq 'stdout-cap';$pipe=if($isOut){$status.Stdout}else{$status.Stderr};$literal=if($isOut){$streamExpected.stdoutCap}else{$streamExpected.stderrCap};$name=if($isOut){'compiler.stdout.bin'}else{'compiler.stderr.bin'}
    Need ($pipe.ObservedBytes -eq $literal.observedBytes -and $pipe.ObservedSha256 -ceq $literal.observedSha256) 'cap observed-byte literal'
    Need ((Get-FileHash -LiteralPath (Join-Path $caseRoot $name) -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $literal.retainedSha256) 'cap retained-byte literal'
   }
   if($case.fault -eq 'existing-output'){Need ([IO.File]::ReadAllText((Join-Path $caseRoot 'compiler.stdout.bin')) -eq 'original-output') 'preexisting bytes changed'}
  }
  $row.status=if($case.action -eq 'observe-parent-exit'){'diagnostic-observation-complete'}else{'matched-future-literal'}
 }catch{$row.errors+= $_.ToString();$row.status='failed-stop-review'}
 finally{
  if($null -ne $observer){try{if($observer.Members().Length -ne 0){$row.safetyCleanup=$true;$observer.SafetyCleanup()}}catch{$row.errors+=$_.ToString();$row.status='cleanup-unconfirmed-stop-review'}finally{$observer.Dispose()}}
  Save-Exclusive (Join-Path $caseRoot 'result.json') $row
  $results+=$row
 }
 if($row.status -notin @('matched-future-literal','diagnostic-observation-complete')){Save-Exclusive (Join-Path $root 'failed-results.json') $results;throw 'Lifecycle failed. No retry or compiler invocation.'}
}
Save-Exclusive (Join-Path $root 'results.json') $results
# Passing host lifecycle tests would still require review before a scriptc probe.
