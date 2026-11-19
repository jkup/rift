# TS-022A implementation evidence — review required

2026-11-02; assignment base `4a0f051`, accepted design `1c34ebd`, existing
`codex/primitive-computed-keys`. This is the bounded join/toString implementation.
No C++, toolchain pin, evaluator/conversion semantics, COORDINATION, companion
output, formatting backend or later task changed.

Acceptance is incomplete against the literal frozen matrix: C2 requests `[] == 0`
but the existing lexer rejects `==`; C3 requests guest delete syntax but the
parser rejects `delete`. Adding those language features is outside this task.
`c2-unsupported-equality.txt`, `c2-lexer-evidence.txt`, and
`c3-unsupported-delete.txt` retain the failures. The driver asserts the exact
existing parse boundaries; C3 also tests effectful Array key conversion followed
by internalDelete. Neither is represented as executing the unsupported syntax.
Coordinator interim read-only review confirmed these design-oracle corrections
and directed that C2/C3 remain explicitly partial without parser expansion.
Independent rebuild and final acceptance are still pending.

## Commands and final evidence

From typescript/, use the pinned npm scripts:

* `npm run typecheck`
* `npm run test:runner` — 20/20
* `npm run test:probes` — 10/10; static-only, separate parsed coverage, both hosts
* `npm run test:guest:node` — 166/166, no skips
* `npm run test:guest:native` — 166/166, no skips; rebuilds all 24 entry points

The 164 existing cases and 23 gates remain; the new driver and runtime-read
fixture add two cases and one gate. Retained `full-node.txt`, `full-native.txt`,
`runner.txt`, `probes.txt`, `typecheck.txt` and final JSON records capture results.
Final separate coverage includes CLI 1415/1415, object-valueof 2698/2698 and
array-string-conversion 1906/1906, with no dynamic-tier statements.

Native compilation requires the installed Zig directory on PATH and sandbox
access to its libraries. `initial-native-sandbox.txt` retains the installation
access error. An earlier attempt without Zig on PATH failed SC3004/ENOENT;
neither failure is a semantic skip. Approved rebuilds use the unchanged pins.

## Fixed matrix mapping

`test/array-string-conversion.ts` is a standalone native/Node driver. Comments
identify each row; assertions use fixed values, traces, identities and located
diagnostics independently of stdout agreement. Effectful callbacks retain full
parameter lists and multiline bodies. Host Get subclasses are instrumentation,
not guest accessor support.

| Rows | Evidence |
|---|---|
| J1-J14 | Empty/root, defaults/null/empty separator, sparse Get without Has, nullish elision, nested separators, inherited/generic inputs, lengths, primitive/boxed UTF-16 String, nullish rejection and separator hooks/errors |
| J15-J22 | LSAB and number/string hints, exact sentinel identity, symbol/boxed symbol, symbol protocol and ordinary fallbacks, null-root/both-object errors, converted nullish spelling |
| J23-J30 | Separator and element length/index mutations, one captured length, fresh indices, original indexed throw, repeated-object conversion |
| T1-T9 | Ignored arguments, exact forwarded values/receiver/args, noncallable/missing join tags, lookalike/String, fresh defining boxes, tag overrides, Get/Call throws |
| T10-T14 | Call observer proves original intrinsic identity after public replacement/deletion in either Realm, saved Array methods, fetched F then G, nullish receivers, direct object result vs surrounding ToPrimitive continuation |
| R1-R5 | Fresh identities, key order, metadata/descriptors, nonextensibility/no writes, A/B/C/B/A transitions, exact captured fallback, defining String boxing and indexed read order, existing foreign boxes |
| R6-R11 | Guest/host/step failure at each boundary including callable join, exact host Error identity, cleanup, zero calls before effects, one-call forwarding failure, exact iteration ticks and huge generic lengths |
| R12-R15 | Self/mutual cycles at 1/2/4/64 calls, finite nesting, separator/element reentry at 2/64 calls, later independent call and monotonic retained steps, shared subarray read twice |
| C1-C3 | Runtime binding reads for addition/unary/numeric/relational and computed read/write/call order; abstract equality is explicitly blocked; internal key deletion plus retained guest parse rejection |
| C4-C9 | Effectful array-like lengths, Array length assignment/two conversions and preserved storage, Object.valueOf identity/zero ticks, staged Object/Function/Number controls, null-root/both-object and primitive-only converter controls |

Direct self/mutual join at call limits 1, 2, 4, 64 consumes 4, 5, 10, 160
steps respectively, then returns located runtime RangeError `call depth limit
exceeded`. Finite [[1]] consumes 7 steps and needs 3 active calls. Separator
reentry at 2/64 calls consumes 2/64 steps; element reentry consumes 3/87 steps.
All unwind to calls=0 and original Realm. The final driver stdout fixes these
counts, including the default64 native cases; no crash is accepted as a guard.

## Migration inventory and first-run failures

Read the accepted full inventory before edits; `migration-inventory.txt` records
the focused pre-edit search. `baseline-inventory.txt` reproduces the accepted
patterns against git assignment base: 65 source files / 59 candidate lines.
Search candidates alone did not discover every semantic dependence.

The four planned sites were updated: realms G17/W1 root keys and missing join;
object-tostring fixture empty Array addition; object-valueof V6 Array callee,
empty result and 5-step total. Explicit Object Array tags, Number string-hint,
Function defaults and null-root/both-object negatives were preserved.

The first full Node run found three additional actual default Array operands:
realms G14 numeric/addition/length, operator-coercion's `[]` operator row, and
boolean-string-conversions M8 Array default. The retained first-node JSON/text
shows 163/166 before these fixes. Their empty Array expectations now use empty
text, +0/-0 and normal numeric/relational results; length assignment becomes 0.
Object/Function rows retain their prior tags/NaN, and Number controls stay intact.
The first native run overlapped these test edits, so two earlier compiled
expectations failed (164/166); first-native JSON/text retains that run. Final
validation rebuilt the complete suite after all edits.

## Compiler failure reduction

The initial matrix driver built static-only but separate coverage reported two
dynamic scalar equality statements for host-fault variables typed `unknown`.
Retained: driver-build-first.txt, driver-coverage-first.txt,
driver-dynamic-details.txt and driver-before-catch-narrowing.ts.txt.
Before changing the test, catch-identity-reduction.ts reduced the issue to six
statements; its coverage reports one dynamic equality. The test now narrows the
catch with `instanceof Error` and stores Error|null, preserving exact identity
and rejecting unexpected non-Error faults. This follows the existing compiler
contract; no production workaround, pin change or gate weakening was needed.

Strengthening J12 with a throwing separator exposed the pinned compiler's
inferred-never callback adapter: static-only build succeeded but coverage found
one dynamic `dyn.this`. `boxing-dynamic-details.txt` (named while investigating
the simultaneously added boxing instrumentation), throw-callback-native-build.txt
and driver-before-throw-annotation.ts.txt retain the evidence. Before annotation,
throw-callback-reduction.ts reproduced the adapter in five statements, with its
separate coverage retained. Explicit ValueCompletion on the throwing callback
removes the adapter; all callback parameters remain present. Final gates were
rerun after this correction. No runtime implementation change was involved.

## Limits

Only the pinned Windows x64/Node lanes are evidenced. Cyclic empty-string
compatibility, allocation limits/OOM recovery, throughput, implicit member
boxing, accessors/proxies, other Array APIs and Number formatting remain deferred.
No main merge or successor task is authorized here. Stop for independent review.
