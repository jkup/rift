# TS-035E3h-P: capture the missing command before selecting libraries

Design disposition: choose a bounded, deliberately substituted linker-driver command observation. **Execution remains blocked.** The smallest next scope is inert recorder source, capture-format literals and supervisor transformation design with synthetic validation. No recorder exists, no binary identity is available, and no compiler, driver or linker invocation is authorized by this document.

Base `c10556e250d4b853651c0eeb41972ecbff7a752b`. The exact future command, full proposed environment, retained tool identities, input bytes, ownership, bounds and gates are in [proposal.json](validation/ts-035e3h-p/proposal.json). Null recorder identities mean unavailable, never an accepted wildcard. No production implementation or authority is frozen.

## What is known and what is missing

The accepted [E3f analysis](validation/ts-035e3f-p/link-info-analysis/README.md) reconciles41 runtime objects and one program object to the archive. Its retained metadata identifies MSVC-target objects but supplies GNU driver flag fragments and three library names. It does not contain an observed complete linker executable/argv. Its1077-file source audit did not find the referenced `native-toolchain.ts` producer implementation. Five conditional runtime-manifest libraries are not an independently established selected dependency list. No list here fills in CRT, SDK, sysroot, library search order, DLLs or cache inputs.

The accepted [E3g observation](validation/ts-035e3g-empty-observation/README.md) has42 complete inventories:14,416 sections,23,950 primary symbols and49,202 relocations. Its directive arrays are empty. `_fltused` is recorded as section-defined in `scr_win.o` and undefined in `probe.obj`, without recorded relocation sites. These accepted facts are read here; no new symbol cross-reference or object interpretation has been performed. They make the bridge visible but do not identify a driver command or resolve the symbols.

The retained [scriptc README](validation/ts-035e3f-p/link-info-analysis/scriptc-readme.txt), line31, documents `SCRIPTC_LINKER` as a driver override. Retained `discovery-commands.json` CLI help advertises `--emit exe` and says `--print native-link-info` implies object emission and never links. Therefore repeating that metadata command cannot answer the missing-command question. The override's exact producer implementation and any driver-name-dependent behavior remain unknown.

## Candidate comparison

| Candidate | Question it could answer | Disposition |
| --- | --- | --- |
| Offline external-symbol cross-reference over retained JSON | Which byte-identical names have candidate external definitions among these42 objects? | Defer. This could annotate candidates but cannot establish the missing invocation or selected libraries. Storage class, weak externals, opaque auxiliary records, COMDAT selection/associations, duplicate definitions, archive extraction, dead stripping and name decoration prevent treating it as a linker. It would require separately reviewed full independent literals, closed schema/errors/limits before implementation. None is implemented here. |
| Read-only effective tool/library discovery | What installations or search directories does a particular query report? | Defer. Without the actual producer-selected command, host scans yield candidates rather than effective inputs. Prior PATH/Zig/SDK discovery already left that distinction unresolved. Do not enumerate more libraries or turn metadata names into paths. |
| Controlled command capture at a substituted driver | What first command string does this pinned producer pass to the explicitly named recorder for this probe? | Select as the useful first slice. It can replace guessed command construction with one observed boundary under an explicit override, without forwarding to a linker. It cannot recover the unmodified default command or prove that a real driver would accept it. |

## Exact proposed observation and stopping criterion

The future fresh root is `C:\Users\jonku\code\rift\typescript\build\ts035e3h-link-command-observation`. It must be absent and exclusively created; never reuse the E3f root. Proposed executable: that root's `node_modules\scriptc\bin\scriptc.exe`,78,885,376 bytes, SHA-256 `efd8c43e12448bf2a3f00e6ac358ccd9bb88d423802d6d961dc9916e6763f65b`. This is an accepted retained identity, not a fresh tool measurement.

Proposed argv, **not an executed command**:

```json
["build","probe.ts","--tier","static-only","--emit","exe","-o","probe.exe"]
```

The probe, dependency and package bytes are exactly the E3f proposed inputs retained in `proposal.json`. Copy only the previously enumerated package inputs, excluding the named verification sidecar, and verify source/copy identity before and after. Record root ownership, ordinary ancestors, file/link identities, all outputs and changes. The future controller must refuse any preexisting root or tool/source drift; no installer or package refresh. The output name is an explicit experimental request, not inferred from metadata. Any resulting `probe.exe` is unexpected and must never be launched.

The complete proposed environment is the accepted21-key E3f block rebased into the new root, plus `SCRIPTC_LINKER` pointing to `recorder\link-command-recorder.exe` and `RIFT_LINK_CAPTURE` pointing to `capture\first-command.bin`. No parent environment is merged. The added variable is recorder configuration, not a claim of scriptc support. Exact host tool paths/hashes and Zig library/cache settings are in the proposal. Preserve them as proposed values; unknown scriptc-added child environment entries must be captured, not silently discarded.

The recorder will capture the **first invocation only**, including a version/probe invocation if that is what the producer sends. It never forwards, resolves libraries, expands response files or spawns a child. Preserve the received raw UTF-16 command-line code units, cwd, actual image identity and complete child environment block. A parsed argv view must name its parsing API and remain secondary. Microsoft documents [GetCommandLineW](https://learn.microsoft.com/en-us/windows/win32/api/processenv/nf-processenv-getcommandlinew) as the current process's command string and notes that Windows may change the executable-name spelling. [CommandLineToArgvW](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-commandlinetoargvw) has its own quote/backslash rules. Neither result should be relabeled as universally correct driver argument parsing or the parent's exact CreateProcess string.

Use exclusive zero-sharing creation of the raw record, flush/close, then exclusive completion-marker creation. A marker alone is never success. After capture **or capture failure**, the recorder holds without returning to scriptc until the supervisor terminates the whole job. Returning an intentional nonzero status could trigger unknown producer fallback, so it is not the proposed protocol. A missing marker ends at the watchdog. This handshake needs exact source and synthetic review; it is not implemented.

Bound the compiler to one invocation,60seconds,8MiB per stream,10seconds cleanup and90seconds supervisor watchdog. Bound the record to1MiB, command line32,767 UTF-16 code units and environment131,072 code units. Archive at most10,000 root files/2GiB with8MiB chunks. Any exceedance is an incomplete failed observation, never a silently truncated success or permission to delete evidence. Retain raw streams, partial files, stage/status errors and unexpected outputs. No retry or alternate driver.

Stop after the first recorder invocation and bounded job termination. A complete first record answers only what that invocation received. If it is a version query, contains an `@response-file` token, records additional attempts, lacks command capture, or exposes an unexpected alternate tool/output, classify the question as still incomplete and return for review. Do not answer a probe, read response targets or continue to a second invocation. No success literal predicting producer argv can be authored from existing evidence.

## Ownership and trust limits

Proposed supervision reuses the reviewed suspended-create/atomic-job-assignment/resume lifecycle and bounded watchdog, but only through new exact source transformations reviewed separately. The old supervisor and evidence remain unchanged. A reported empty job is cooperative Windows/supervisor evidence, not independent cleanup verification. Retain the fresh tree after termination; perform no recursive cleanup of historical outputs.

An exclusive directory/file and a job do not prevent arbitrary outside writers or constrain every child image, DLL, network access or library read. The recorder's no-forwarding behavior does not prove scriptc cannot spawn an alternate linker concurrently. This design explicitly depends on cooperative installed tools and Windows. If that assumption is unacceptable, execution stays blocked until a separately approved process/image confinement mechanism exists. No binary filename, PATH restriction or post-run snapshot is presented as such enforcement.

Capture under `SCRIPTC_LINKER` may change producer behavior based on the supplied name. Do not substitute the default Zig name into the record, append `cc`, convert libraries to `-l`, add search flags or infer omitted defaults. Even a complete capture is not a linked executable, default-driver observation, resolved library closure, source-to-binary proof or hermetic provenance.

## Smallest next scope and approval gates

The concrete next assignment, if separately authorized, is **source and synthetic design only** in a new sibling: inert recorder source; exact capture schema and encoding; full independent literals for quoting, empty arguments, Unicode including UTF-16 edge cases, absent/empty environment, oversized/truncated/partial/duplicate records, marker-before-completion refusal, first-invocation arbitration and hold/termination faults; exact controller/supervisor transformation proposals. No helper compilation, tool/library scan, scriptc invocation or driver execution belongs to that scope.

After source review, a separate helper-build proposal must freeze its exact build command/environment and capture the resulting binary identity; no helper compiler command is invented here. A separate benign execution checkpoint must validate the capture/hold protocol. Only then may root and second review a concrete binary hash, exact supervisor/controller sources and fresh-root preflight for one scriptc observation. This design cannot activate any stage automatically.

E3c remains input-only with null execution binding; E2 ownership and its closure remain unchanged; all60 slots remain blocked.212 records in each lane and71 gates are inherited, not rerun. No production, registry, launcher, CLI, profile, existing manifest, blocker, package, compiler or pin edits. Full build provenance remains blocked. Return for actual/root/second design review.
