# TS-004B validation and design record

Validated 2026-11-01 on Windows x64 with the pinned compiler contract. Base
`984064e` includes accepted TS-004A and the frozen TS-004B interfaces. This is a
bounded ordinary data-property implementation, awaiting coordinator review.

## Results and reproduction

Run from `typescript/` with the installed Zig directory on PATH:

- `npm run typecheck`: passes (`typecheck.txt`).
- `npm run test:runner`: 20/20 (`runner.txt`).
- `npm run test:guest:node`: rebuilds TypeScript; 130/130 (`guest-node.txt`).
- `npm run test:guest:native`: rebuilds all four executables; 130/130 (`guest-native.txt`).
- `npm run test:probes`: all ten probes pass both lanes and static coverage (`probes.txt`).

No skips, timeouts, crashes or guest harness failures in the successful runs.
The 130-case total retains all 129 previous cases and adds one compiled host
program with throwing assertions. Its many assertions are not counted as separate
conformance tests. JSON files retain individual subprocess results and expectations.

| Native entry | Static statements | Gate |
|---|---:|---|
| src/cli.ts | 753/753 | PASS |
| test/realms.ts | 818/818 | PASS |
| test/object-descriptors.ts | 218/218 | PASS |
| test/object-prototypes.ts | 825/825 | PASS |

Every entry is built with static-only and separately checked with the fail-closed
coverage parser. No dynamic tier or compiler workaround was introduced. The initial
sandboxed native build failed to locate Zig's installation libraries; its full
transcript and build JSON are retained as `guest-native-initial.txt` and
`native-build-initial.json`. The successful retry used authorized escalated library
access. The initial failure is environment evidence, not a passing build or skip.

## Expected semantics exercised

The host driver tests null initial prototypes, absent and shadowed reads, distinct
lookup base/receiver writes, primitive receiver rejection, receiver-own read-only
and nonextensible checks, update flag preservation, creation flags, inherited
read-only rejection (including same value), exact assignment RHS, self/indirect
cycles, unchanged prototype on nonextensible objects, unlink/relink, and deep
20,000-link reads/writes/cycle rejection. Failed writes and cycle changes preserve
state. The compiled driver reads `test/fixtures/prototypes.js` at runtime, seeds two
independent realms and checks explicit output. Guest evaluation exercises inherited
reads, method this, writes through inherited methods, detached calls, strict errors,
RHS effects before rejection, abrupt RHS propagation and realm isolation.

## Sources and choices

Consulted on 2026-11-01:

- [ECMAScript OrdinaryGet](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryget).
- [OrdinarySetWithOwnDescriptor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetwithowndescriptor).
- [OrdinarySetPrototypeOf](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetprototypeof).
- [engine262 objects.mts](https://github.com/engine262/engine262/blob/main/src/abstract-ops/objects.mts), inspected source blob
  `3fce3dab52c171f0f08e39f0afcceafc0f501e21` via the GitHub connector.

The specification governs lookup, receiver checks and mutation order. engine262's
OrdinaryGet/OrdinarySetWithOwnDescriptor retain Receiver across parent dispatch,
check its own descriptor separately, and propagate abrupt results with Q/yield.
Its OrdinarySetPrototypeOf checks identity before extensibility and walks ordinary
prototype slots before committing. Rift follows those semantic boundaries but uses
explicit normal/throw unions and iterative traversal rather than generators and
recursive dispatch. No upstream code was copied. Direct slot traversal is suitable
only while every object is ordinary and descriptors are data-only.

The strict set wrapper converts normal false to guest TypeError; PutValue delegates
to it. GetValue calls internalGet directly, preserving throw completions. Existing
host-test get convenience delegates to internalGet and treats a throw as a host
inspection fault. The evaluator source needs no change: its existing property
references already preserve the call receiver and route reads/writes through
GetValue/PutValue. The fixture validates this integration in both compiled lanes.

No automatic intrinsic hierarchy, accessor descriptors, exotic objects, guest
Object/Reflect APIs, coercion, arrays, deletion or ordering were added. Initial
prototypes remain null; guest prototype construction syntax remains unsupported.
The union interfaces permit future guest throws, but current data-only internal
operations cannot generate one. TS-004C remains blocked pending its own API freeze.
