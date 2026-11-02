# TS-028A primitive property reads and calls

Implementation for independent coordinator review, 2026-11-02. Sole writer chat
`01a19b5c-fc24-7b70-afe4-6c27ae8a01b0`, dispatch base `fba0431`, existing
`codex/primitive-computed-keys`. Accepted design: `553c9a8`; runtime baseline:
`5664a35` (189 cases per host / 29 gates). This handoff does not self-accept.

## Implementation

`runtime.getValue` boxes through existing ToObject, converts the deferred key,
saves a successful string/symbol Value, then returns internalGet with the original
base Receiver and operation location. It preserves conversion/dispatch abrupt
identity and keeps wrappers/results local. The only other production change is
an object-conversion comment. Evaluator/reference capture, bindings, writes,
delete, parser and built-in inventory are unchanged. No new compiler workaround.

The [144-row mapping](matrix.md) links the frozen rows and variants to readable
named scenarios in `test/primitive-reads.ts` and seven runtime-read fixtures.
These use independent literal values, traces, locations and resource oracles,
including native actual constructor-default64 recursion (261 host / 325 guest
ticks, peak depth 67 / 131), exact small limits, Realm restoration, retained
mutation, completion/value/diagnostic identity and host Error identity. Runtime
file cases assert stdout/stderr/status separately; the symbol fixture is injected
and read from disk by the native driver.

## Precise migrations

| Frozen entry | Implementation |
|---|---|
| A1 | Runtime GetValue sequence and successful-key publication before Get. |
| A2 | ToObject comment updated; algorithm untouched. |
| A3 | Evaluator inspected and byte-preserved; capture, receiver, arguments and RHS sequencing covered by E/M/W. |
| A4 | Boolean/String primitiveMember removed from negative rows, called positively and compared to exact String toString method. Fixture bytes/locations preserved. |
| A5 | Number primitiveMember compared to exact Number valueOf method; other negatives including namespaceCall retained. |
| A6 | Object-toString primitiveMember asserts string x; all other negative/resource rows retained. |
| A7 | Symbol implicitMember asserts exact Symbol valueOf method. Aligned names/messages/lines/columns retain numeric/implicit-string/root/readonly failures. |
| A8 | Realms W17 asserts a / undefined / undefined reads; write still rejects. String root keys, parent and payload are explicitly preserved. |
| A9 | Detached method nullish-box diagnostic; BKG unchanged. |
| A10 | Nullish read/call errors retain BK and locations; other primitive read/call paths escape ForbiddenKey Error with exact message and guard/Realm cleanup. Every write remains old error/BKR; RHS sentinel retained. |
| A11 | Symbol ForbiddenKey read/call escapes with exact message/cleanup; write unchanged. V/E/M/W provide successful symbol-base coverage. |
| A12 | Sequential direct Get/Put assertions distinguish nullish no-key reads from identical ThrowingKey sentinel and toString trace; trace reset proves writes add no reads. |
| A13 | Nested delete D23 changes only obsolete read diagnostic; direct delete tests untouched. |
| A14 | Typeof/void E10 nullish message migration; four non-null primitive variants assert BKC and undefined/U, zero old-target reads. |
| A15 | Typeof/void R13 null[k] diagnostic migration only; resource/column assertions retained. |
| A16 | In E29 null[p] diagnostic migration only; captured p trace and suppressed RHS/hook unchanged. |
| A17 | Only primitive-base and detached top-level expected stderr substrings changed. Names, source, status and stdout preserved. |
| A18 | Current feature inventory and architecture notes updated; historical validation/design files untouched. |
| A19 | Seven additive runner cases (six CLI files plus injected driver), one additive static-only/coverage entry. All baseline names/gates audited. |

## Validation

Typecheck PASS; runner **20/20**; probes **10/10**. Rebuilt Node and native
each pass **196/196**, no skips. All **30 static-only builds and separately
parsed coverage gates PASS**, zero dynamic statements. Static counts: src/cli.ts: 1532; test/realms.ts: 1888; test/primitive-reads.ts: 2292.


Final result files and [audit](audit.mjs) accompany this handoff. Run from
`typescript`: `node docs/validation/ts-028a/audit.mjs`. The audit independently
re-parses every coverage report with the fail-closed parser, preserves all 29
baseline gate entries and 189 baseline case names per lane, and rejects every
old expected-record difference except the two exact A17 changes. It also verifies
unchanged production boundaries against dispatch base. Historical 189-case
baseline evidence is read from TS-027A readability validation, not regenerated.

[Initial attempts](initial-attempts.txt), missing-Zig and sandbox-linker transcripts
are retained separately. The initial coverage report was already fully static.
No semantic oracle contradiction, compiler semantic failure, dynamic-tier
workaround, timeout, crash or skipped case was accepted. No reduction was needed
because the failures were edit/registration/environment errors, not a compiler
semantic or static-lowering failure.

The Number.toString inherited Object-method limitation is explicit. No radix
work, general primitive writes, compound/update operators, parser expansion,
accessors/proxies or new built-ins. No C++, pins, Claude/COORDINATION changes,
branch switching, main merge or successor work. Acceptance belongs to the
independent coordinator.
