# TS-005A validation — 2026-11-01

Clean base: `587f7ea7fe41d5257318515110bdbd96f37a163a` on
`typescript-scriptc-probes`. Scope: frozen array storage contract only.

Commands from `typescript/`: `npm run typecheck`, `npm run test:runner`,
`npm run test:probes`, `npm run test:guest:node`, `npm run test:guest:native`.
Final results: typecheck passes, runner 20/20, probes 10/10, rebuilt guest/host
Node and native suites 134/134 each. No skips, timeouts, crashes or harness failures
in final runs. Console logs and full subprocess JSON results are retained here.
The host array driver is one suite entry containing many throwing assertions;
134 is not an assertion count or a conformance percentage.

| Native entry | Static/analyzed |
|---|---|
| CLI | 785/785 |
| realms | 850/850 |
| object-descriptors | 250/250 |
| object-prototypes | 857/857 |
| object-keys | 295/295 |
| conversion | 340/340 |
| definition-dispatch | 879/879 |
| array-storage | 1118/1118 |

Every entry passes static-only build and the separate fail-closed coverage gate.
Windows native commands use installed Zig 0.17.0 on command-local PATH and
authorized access to its libraries. The initial sandbox linker failure is retained
in `native-sandbox-failure.log` / `native-build-sandbox-failure.json`.

The first authorized native build succeeded but the coverage gate correctly
rejected two dynamic-tier statements introduced by test-only Object.keys descriptor
inspection (`native-dynamic-failure.log` / `native-build-dynamic-failure.json`).
`descriptor-keys-probe.ts` and its `--explain-dynamic` transcript reduce that
reflection pattern. Removed Object.keys inspection; explicit value identity and
all optional descriptor-field assertions remain. No engine workaround, pin change
or acceptance relaxation was required. Final array coverage has zero dynamic tier.

## Expected-result matrix coverage

The accepted prerequisite's primitive conversion rows are all retained in the
existing compiled `test/conversion.ts`: primitive kinds/special numbers, each
whitespace and exclusion, token grammar, rounding/overflow/underflow, uint32 modulo
and explicit object rejection. The new `test/array-storage.ts` covers every
non-object array row plus the unsupported object boundary:

- Empty own length/flags/null prototype; holes versus own undefined; numeric keys
  before length and insertion-ordered strings; detached descriptor/key snapshots;
  deleting an index leaves length unchanged and length itself cannot be deleted.
- Ordinary parent Set with array receiver; array base with ordinary receiver for
  missing and existing indices; inherited hole read and prototype preservation
  during shrink. Guest source exercises the real evaluator/reference dispatch.
- Maximum index 4294967294/length 4294967295; ordinary strings 4294967295, 01, -0
  and 1e0; sparse shrink from max length to 1 completes within the harness timeout
  and preserves nonindex strings. Source inspection confirms no loop over holes.
- Fresh length-3 arrays normalize -0/null/false/empty string to +0 and remove
  indices; true/"2"/"0x10" produce 1/2/16. Invalid lengths produce RangeError,
  preserve all elements/length/writability, and precede invalid flag rejection.
- Object values with callable valueOf/toString hooks explicitly reject without
  running hooks; state stays unchanged. Error phase/name/location are asserted.
- Frozen length: direct same-value define succeeds, Set rejects, strict Set
  throws TypeError; NaN direct definition throws RangeError while Set rejects
  before conversion. Below-length writes/hole fills succeed, extension fails.
- Nonextensible hole fill/extension rejection, existing element update and length
  growth with holes; failed element definition does not accidentally grow length.
- Partial truncation deletes 5 then stops at nonconfigurable 3, retains 1, restores
  length 4, and applies optional delayed freeze. Successful shrink/freezing and
  rejected enumerable/configurable updates assert final element and flag states.
- No-value descriptor delegation and one-way writable transition; caller descriptor
  value identity and all flags unchanged across success, false and throw outcomes.
- Seeded guest assignments assert original string RHS identity, normalized stored
  length, truncation and output. Two independently seeded realms have independent
  arrays. Guest invalid/readonly/partial/object failures assert RHS effect once,
  no following statement, exact line/column, error type and final array state.

Source review also confirms separate ordered ToUint32/ToNumber calls and old length
read after conversion. Object conversion is unsupported, so future two-call object
side effects in the prerequisite matrix are deferred, not claimed as tested.

Only array module, host driver/registration, task status and scoped docs/evidence
changed. Runtime/conversion implementation, C++, pins, Claude outputs and
COORDINATION.md are untouched. No guest syntax, Array constructor, methods,
species, symbols, accessors or general exotic framework was added.
Awaiting coordinator review; no successor dispatched.
