# E3h build-P: exact helper-build proposal, execution blocked

Base `ea29be8e68e4079e83da96b516fce395f340d43e`. The proposed route is the existing64-bit .NET Framework C# compiler, in place, with one explicit private copy of the measured `mscorlib.dll` reference and the exact accepted recorder source. No compiler, Add-Type, helper, benign lifecycle, scriptc or linker invocation occurred. No installation or source workaround occurred.

This proposal is **not execution-ready**. The narrow system-hardlink policy, separate supervisor compilation budget and complete staging/preflight integration require review. No controller gate is removed, binary hash invented or lifecycle approval implied.

## Bounded discovery and route comparison

Discovery read exactly10 listed candidate files, with32MiB per-file caps and64KiB text-copy caps. `version-metadata.json` records file-version resources, not executed version commands. `installed-identities.json` records hashes, sizes, canonical paths, device/inode/link counts and ancestor metadata with pre/post stat equality. Config/response-file texts are retained separately. No executable was loaded to obtain these observations; no SDK/registry/library tree scan occurred.

| Route | Evidence | Decision |
| --- | --- | --- |
| Framework64 `csc.exe` | Existing compiler2,569,832 bytes, version resource4.8.9221.0; adjacent config requests CLR v4.0.30319; measured mscorlib/CLR and OS startup shim | Select as proposed simplest direct compiler route. Source/API/option compatibility remains untested until separately approved compilation. |
| Installed `dotnet.exe` | Host file metadata6.0.11 | A host alone does not identify an SDK/compiler/reference pack. No SDK discovery or inferred `csc.dll` path. Defer. |
| PowerShell7.6.5 / Roslyn | Measured pwsh, runtimeconfig and Microsoft.CodeAnalysis.CSharp.dll; retained reviewed supervisor uses Add-Type | Retain for existing supervision only, not helper executable emission. Official documentation says ConsoleApplication/WindowsApplication output types are unsupported from PowerShell7.1 onward. [Add-Type documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/add-type?view=powershell-7.6). |

Chosen compiler: `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`, SHA-256 `46809206887326d2d24db1eff1f3064de972c3451abe766b49111450a5e08e00`. Explicit reference: adjacent `mscorlib.dll`,5,445,432 bytes, SHA-256 `11ac114c43ecf6996bef58ba3c99fba3693a4560a84eeadde54d193060dc626c`. The compiler's config and runtime are inputs to the proposed cooperative installed-tool route, not a discovered complete dependency closure.

The compiler has observed nlink2; its config, response file and mscorlib have nlink3. These are measured system-file identities, not permission to treat arbitrary aliases as ordinary inputs. Hardlink aliases were not enumerated. The old `exact()` single-link guard is not changed. A separate narrow policy decision must either accept these exact installed system-file identities under cooperative OS trust or require a bounded alias audit. No copy-and-relocate workaround for the compiler is proposed because it could change runtime/config lookup.

## Exact proposed build

`proposal.json` is the complete machine-readable command/env/ownership/budget contract. Proposed cwd/fresh root:

```text
C:\Users\jonku\code\rift\typescript\build\ts035e3h-recorder-build
```

Proposed argv to the absolute installed compiler, **never executed here**:

```text
/nologo
/noconfig
/nostdlib+
/target:exe
/platform:x64
/main:LinkCommandRecorder
/langversion:5
/codepage:65001
/utf8output
/debug-
/optimize-
/unsafe-
/checked-
/warn:4
/reference:C:\Users\jonku\code\rift\typescript\build\ts035e3h-recorder-build\refs\mscorlib.dll
/out:C:\Users\jonku\code\rift\typescript\build\ts035e3h-recorder-build\out\link-command-recorder.exe
C:\Users\jonku\code\rift\typescript\build\ts035e3h-recorder-build\source\recorder.cs
```

The retained `csc.rsp` itself documents `/noconfig`; no response file is passed. `/nostdlib+` disables the implicit standard-library reference and the measured reference is supplied explicitly. Output, target and platform options select a managed console executable and x64 target. Codepage/output encoding are explicit. These options are a proposed experiment with the installed legacy compiler; unsupported options or language/API errors must stop without retry or source edits. [Advanced compiler options](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/advanced), [output options](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/output).

Copy `ts-035e3h-capture-p/recorder.cs.txt` unchanged to `source\recorder.cs`:5,797 bytes, SHA-256 `25e285690c80c9b5d9e7a18136338394cbc9b55d9d6f8c6b82f3342cffd23877`. Copy the named reference to `refs\mscorlib.dll`, with source/destination hash equality. Both private copies must be ordinary single-link files. These copies and directories are proposed only; the build root was not created by this task. The recorder's hardcoded capture root stays unchanged and is distinct from this build root.

Create the fresh root exclusively after proving it absent; reserve source/refs/out/tmp/home/program-data locations under it, reject aliases and existing output, and retain ownership/copy records. Create the exact proposed `.exe.config` before compilation, also exclusively. It requests `<supportedRuntime version="v4.0" />`; it is not a version-locked runtime or source-to-binary certificate. No `.deps.json`, SDK apphost or CoreCLR runtimeconfig is invented. A Framework executable needs an installed CLR, base library and OS startup support; it is not a standalone native executable. [Framework supportedRuntime documentation](https://learn.microsoft.com/en-us/dotnet/framework/configure-apps/file-schema/startup/supportedruntime-element).

The full16-key child environment in `proposal.json` is the earlier reviewed block rebased to this root, with SCRIPTC/ZIG controls removed and PATH explicitly restricted to the two Windows directories. No parent environment is merged, no compiler lookup uses PATH, and no ambient CLR/compiler override is allowed. The same complete block is proposed for the supervisor. TEMP/TMP, home and app-data paths are private. The PSModulePath is the retained reviewed value, not a newly discovered module closure.

## Supervision, counts and retention

`supervision-sources.json` freezes two exact wrapper replacements: an unconditional design gate and the target executable read from the fixed config. It retains the reviewed `supervisor.cs` byte-for-byte and extracts the reviewed parent watchdog mechanism exactly. These are `.txt` proposals; the parent fragment is not standalone and staging is not integrated. The wrapper gate throws before configuration reading or Add-Type.

The proposed future budget is **one helper `csc.exe` invocation plus one supervisor Add-Type compilation**. It is two compilation activities, not one overall. If the authorization permits only one compilation total, this route is blocked: a separately reviewed prebuilt supervisor artifact would be needed. The Add-Type bootstrap uses PowerShell's own runtime/reference resolution; its complete reference and dynamic dependency closure was not established by10-file metadata discovery. Its reuse requires an explicit cooperative-runtime trust decision, not an empty reference list. The retained earlier Add-Type executions are historical evidence, not an invocation in this task.

Use the reviewed creation-time job-list membership, suspended creation, resume, stream pumps and whole-job termination. Bound the child to60seconds,8MiB per stdout/stderr stream,10seconds cleanup; bound the parent watchdog to90seconds and close wait to10seconds. Kill-on-close fallback and a reported empty job are not independent proof of cleanup or complete child census. The supervisor bootstrap itself runs outside the child job; retain its failures and require parent close observation. This existing supervision limit is not silently upgraded.

Retain the entire bounded root (at most256 files/128MiB), raw streams, phase/status/errors, source/reference/tool pre/post identities and partial outputs. Bound executable bytes to16MiB. A missing/empty/aliased/oversized output, compiler error, changed input, unexpected file, exceeded bound or uncertain cleanup stops. Never launch, load, reflect over or Add-Type the generated helper. A later separately authorized offline PE/CLR inspection must establish what the binary actually contains, including AssemblyRefs and entry point; source hash and exit0 do not establish them. No retry, source workaround, install, linker test or recursive cleanup follows a failure.

## Synthetic checks and concrete blockers

`preflight-literals.json` contains30 complete command/path/state cases. `preflight-model.mjs` checks exact argv/environment/paths, ownership, private-copy kind/hash, named installed identities, the unresolved system-hardlink policy, the two-activity budget and closed runtime gate. Even the synthetic consistent case returns `canExecute:false` and `authority:none`. This is a model of required observations, not a forgeable execution credential or an implemented filesystem owner.

All35 controls passed:30 full cases plus5 mutants that skip argv, hardlink-policy, copied-file link count, bootstrap accounting or gate checks. Mutants reach the intended full-result assertion. The case representing the actual unapproved hardlink policy refuses explicitly. No compiler/reference API acceptance or emitted binary behavior is inferred from these tests.

Execution remains blocked pending: (1) explicit budget for both compilation activities or a different reviewed supervisor artifact; (2) the narrow measured-system-hardlink policy; (3) complete exact staging/preflight/controller implementation and review; (4) acceptance of named Framework/PowerShell/OS runtime trust, with transitive loading and independent process census still unresolved. If that weaker trust boundary is insufficient, stop for a separately bounded compiler/runtime dependency investigation. Do not claim that more installed filenames alone close the dependency gap.

`authoring-error.json` retains an inert extraction-script anchor error: the reviewed parent function was synchronous, not declared async. The source anchor was corrected; no compiler or runtime task failed, and no accepted source changed. `verify.mjs` preserves all13,198 base files, prior seals and the real TASKS boundary. COORDINATION is root-owned. Full provenance, E3c null binding, E2 ownership, all60 blocked slots and inherited212both/71gates remain unchanged. Return for actual/root/second review before any compilation.

Retained installed configuration/response-file copies are raw identity evidence, including original CRLF and trailing spaces; Git treats those `.retained.txt` files as data for diff checks. The metadata report retains CRLF with an explicit line-ending whitespace attribute. No retained bytes were normalized.
