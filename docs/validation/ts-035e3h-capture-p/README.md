# E3h capture-P: inert source and synthetic contracts

Base `56bf080e48d2c02c2add79070dac5a8e9ab174a4`. This is a source-design checkpoint, not a build or execution checkpoint. The three source proposals remain `.txt`. No C# compiler, Add-Type, recorder process, benign lifecycle, compiler/driver/linker invocation, object launch or tool/library scan occurred. The previous design document, proposal and all historical evidence remain unchanged.

## Frozen source and contracts

| Inert source | SHA-256 |
| --- | --- |
| `recorder.cs.txt` | `25e285690c80c9b5d9e7a18136338394cbc9b55d9d6f8c6b82f3342cffd23877` |
| `supervisor.cs.proposed.txt` | `825cc0cccfa96c5e5ed303768d0679c5dff6938e42f3641d0d8ca5ac18a3d5bb` |
| `runner.mjs.proposed.txt` | `ddaddacf25f9db9263883210db31ee65c9abd0ddab922feb36272cab21f44065` |

`source-transformations.json` reproduces the latter two from the exact reviewed E3f supervisor/controller source, with old/new text, counts and hashes. The old source is untouched. `source-identities.json` also pins the format model, literals, tests and contracts. `contract.json` defines binary layout, field constraints, limits, source stages, errors and precedence. `output-schema.json` closes every decoded/result shape.

The supervisor adds bounded capture-directory polling and exclusive marker opening before it signals whole-job termination. It preserves creation-time job membership, suspended creation, resume, stream pumps and cleanup mechanics. It removes the prior successful-compilation outcome. Its `CaptureRuntimeEnabled=false` gate blocks execution. The controller has an unconditional source-only gate, a proposed bounded post-cleanup snapshot and a review result that always stops. **It is not an integrated runnable controller:** recorder staging, binary identity, new contract/preflight integration and independent child coverage remain unresolved. Removing either gate requires new reviewed source identities. No disabled path is claimed tested by execution.

## First winner and duplicate evidence

1. Obtain PID and process creation FILETIME. The filename key is eight lowercase PID hex digits, hyphen, sixteen lowercase creation-time hex digits. PID alone is insufficient; reuse with a different creation time is a distinct entry.
2. Exclusively create `entry-<key>.bin`, write its complete32-byte identity, flush and close. Only afterward attempt exclusive creation of `winner.bin`. There is no check-then-create election.
3. Exactly one successful `CreateNew` winner can proceed under the cooperative filesystem contract. A second process first leaves its own entry, then records error3 at stage4 and holds. An identical PID/time entry collision records a stage3 failure; it does not silently reuse the entry. Partial winner publication never permits reelection.
4. The winner captures fields, then exclusively writes, flushes and closes `first-command.bin`. Only then may it publish `record-complete`. All caught failures attempt an exclusive per-identity failure record and hold. No return-to-producer error path, child spawn, forwarding or output launch is intended.
5. The supervisor does not equate visible marker with closed marker. It must acquire it with `FileShare.None`, read32 bytes and release it; sharing/lock errors poll until bounded timeout. Invalid closed markers stop. Duplicate entries and failure markers stop earlier. The marker is a stop hint, not a valid-capture certificate. Post-termination review validates every bounded file, name, kind, identity and declared length.

The source uses [FileMode.CreateNew](https://learn.microsoft.com/en-us/dotnet/api/system.io.filemode?view=net-10.0) to refuse existing paths and [Flush(true)](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.flush?view=net-10.0) before closing each publication. These documented APIs motivate the proposal; no Windows race, durability or fault-injection result has been measured here. [GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes) supplies the process creation time used in the key. The key is a consistency identifier, not process-origin authentication.

**The total attempt count remains unknown.** A process can fail before managed entry/registration, lose its entry or failure marker to an I/O error, or be terminated during publication. A duplicate may start while termination is being requested. There is no independent complete process census in the inherited supervisor. Every model result therefore has `totalAttempts:null`, `attemptCoverage:"unproven"` and `authority:"none"`, including a complete single registered capture. The best outcome is `captured-attempt-count-unproven`. A future claim of exactly one process attempt requires separately designed independent child coverage; it cannot be inferred from one entry, a marker or an empty job report.

## Binary and text treatment

`RCAP0001` begins a24-byte header: magic8, PID u32, zero reserved u32 and creation FILETIME u64. All integers are little-endian. Four fields follow in order: raw command line, cwd, image path and complete environment block. Each is a u32 code-unit count followed by that many u16 values. Then a u32 argument count and the same length-prefixed representation for each API-derived argument. There is no optional field, padding or accepted trailing data. Image path is not a hash or proof of image bytes.

All UTF-16 units, including unpaired surrogates, are preserved with explicit ushort writes. No UTF-8 round trip, replacement fallback, normalization or BOM interpretation occurs. Raw command-line text is the authoritative received string; the argv view is labeled `CommandLineToArgvW`, not treated as a universal parser or exact parent CreateProcess input. Quoting literals test preservation and distinction of these fields; they do not run the Windows parsing API.

[GetEnvironmentStringsW](https://learn.microsoft.com/en-us/windows/win32/api/processenv/nf-processenv-getenvironmentstringsw) supplies an ordered NUL-separated block ending in double NUL. The format retains its complete code units, including empty values, duplicates and drive-style entries without interpreting them as a map. An empty block is two zero units. An absent variable and a present empty value remain distinct through their bytes. Early double termination and missing final termination reject. Text arguments may be empty but may not embed NUL; cwd/image may not be empty.

Limits:1MiB complete capture,32,767 units per ordinary string,131,072 units for the environment including terminators,4096 arguments,132 snapshot files and64 registered entries. Identity, winner, completion and failure records are exactly32 bytes with separate magic. Completion includes record byte length; failure includes an enumerated code and source stage. `contract.json` fixes decoder and snapshot error precedence. Source I/O exceptions are recorded as255 with phase, not fabricated native-error detail; write/flush/close failures in one phase are intentionally not distinguished. Environment/argv cleanup failure supersedes a prior exception in the source finally block. Failure-marker publication itself may fail; missing/partial evidence is incomplete, never success.

Record/marker partial writes, failed flush or close, marker-before-record, duplicate filenames, mismatched PID/time, late duplicate registration, malformed UTF-16 lengths and unknown files all lead to refusal or explicit incomplete states. An `@` argv token stops as `response-file-unexpanded`; no target is opened. Filesystem alias/race protection beyond the reviewed cooperative owner preflight is not supplied by these records.

## Independent synthetic evidence

`author-literals.mjs` writes full byte/result and snapshot/result literals without importing the parser or recorder. `byte-literals.json` has36; `additional-byte-literals.json` adds two explicit high-bit-magic/odd-byte cases. `model-literals.json` has31 complete snapshots. Coverage includes exact1MiB size, exact text/environment/argument limits, over-limit precedence, zero/empty fields, unpaired surrogates, ordered environments, quoting, PID reuse, entry/record/marker publication races and failure/cleanup states.

`test-results.json` retains the first79-control pass. Static review then tightened magic comparison to preserve high bits rather than allow ASCII aliases, and added the two independent cases before their first run. `test-results-2.json` retains the final81-control pass:38 byte literals,31 state literals,2 additional checks,5 intended-assertion mutation kills and5 source-text checks. No failed run was relabeled. The five mutants hide duplicates, claim one total attempt, skip filename identity, skip completion length or ignore cleanup. They import successfully and fail the intended full-result assertion. `check-design.mjs` additionally rejects extra fields on all69 full expected outputs and verifies exact source transformations.

These are JavaScript format/model checks and source-text checks. They do not prove C# compilation, CLR startup, API behavior, actual argument parsing, process census, file flush/close semantics or cleanup races. The empty/full snapshots are independently authored outcomes, not observations of Windows executions.

## Gates and preservation

Separate source review, exact helper-build proposal/approval, compiled binary identity, benign process/race/fault validation and complete controller/staging review remain required before any compiler observation. There is no helper binary hash, build command or execution approval in this checkpoint. The source assumes cooperative Windows, CLR and installed tools; no hermetic provenance, external-writer exclusion, child-image allowlist or default-driver equivalence is claimed.

`preservation.json` and copied historical guards preserve all13,138 accepted-base files and earlier seals. The real TASKS boundary is checked independently; COORDINATION is root-owned. Run `node typescript/docs/validation/ts-035e3h-capture-p/verify.mjs` for read-only design/preservation verification. A synthetic replay needs a new exclusive output path for `tests.mjs`. Do not compile the text proposals or remove gates.

E3c null binding, E2 ownership, all60 blocked slots and inherited212both/71gates remain unchanged. Full provenance remains blocked. Stop for actual/root/second review; no automatic activation.

The supervisor proposal retains four CRLF lines from its accepted source amid LF lines. Its scoped Git whitespace attribute recognizes those carriage returns as line endings; no source bytes or transformation hashes were normalized.
