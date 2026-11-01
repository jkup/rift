# TS-016A graph/allocation/metadata evidence

Implementation base: `5819ace`, branch `codex/primitive-computed-keys`.
The accepted TS-016P contract is implemented without standard methods or
constructor exposure. All 162 baseline guest entries and 21 static gates remain.

## Assertions

- G1-G7/G17: `test/realms.ts` checks six distinct extensible roots, exact chains
  and initial keys, immutable Object slot independent of property extensibility,
  explicit null defaults, callable Function root/cleanup, exact metadata and
  descriptors, exotic Array growth/shrink, context-free silent bootstrap and a
  bootstrap host fault. Invalid metadata covers NaN, both infinities, negative
  and fractional lengths; accepted -0 becomes +0.
- G8-G11: runtime-read `test/fixtures/realm-intrinsics.js` supplies object/array/
  declaration/expression/nested/repeated allocations. The driver checks roots,
  freshness, saved Values and captured environment; inherited lookup, own shadow,
  delete restoration and readonly assignment after RHS effects; foreign identity,
  independent roots and the existing caller-context allocation limitation.
- G12/G13/G16: `test/array-map.ts` checks explicit result Realm for every prior
  map result, including the old foreign-context case. New foreign array/generic
  inputs retain exact element Values and holes; inherited Realm constructor
  values preserve exact species rejection, and inherited numeric indices on the
  array root become own mapped elements. The original trace/ordering/abrupt/
  mutation/resource tests remain unchanged in purpose.
- G14/G15: realm fixture checks exact located no-method errors for objects,
  arrays and functions, addition, keys and length; Function root honors exhausted
  call budget without leaking call slots. All existing compiled coercion,
  direct-converter zero-hook, reentry, host-fault and exact budget tests remain.
  Array-literal slot budgets still pass unchanged, proving no added allocation
  ticks. Every shape assertion now names its expected Realm.

## Boundaries

Low-level storage fixtures remain null-root, including their explicit null/cycle/
nonextensibility checks. Number remains a noncallable partial namespace. Guest
functions inherit empty name/zero length and have no inferred own metadata or
construction support. No Object/Function/Array globals, constructor back-links,
conversion/call/map/join methods, wrappers, symbols or realm-entry switching.
Foreign closures keep captured environments but execute using the caller context;
internal map intentionally uses its supplied context Realm.

Production construction search finds `new GuestObject`/`new GuestArray` only in
Realm bootstrap/factories. All registration call sites supply the frozen arities.
No parser, production converter, manifest, pin, C++, Claude or coordinator-file
change. The coordinator approved one extra test/conversion.ts import after the
[compiler reduction](coverage-notes.md); all its assertions remain intact.

## Validation records

`node.txt`, `runner.txt`, `typecheck.txt`, `native.txt` and `probes.txt` retain the
command transcripts. Machine-readable build/guest/probe reports accompany the
final results. Initial timeout and SC2009 evidence are retained separately in
coverage-inventory.json, native-build-only.json and the reduced entry reports. The initial sandbox link attempt could not locate Zig's installation
libraries; `native-sandbox.txt` records the interrupted failing attempt. The rerun
uses the same pinned Zig with installation access, with no relaxed gates.

## Final results (2026-11-01)

Normal required commands after the approved import fix:

- `npm run typecheck`: pass.
- `npm run test:runner`: 20/20 pass.
- `npm run test:probes`: 10/10 pass, Node/native expected results and both gates.
- `npm run test:guest:node`: rebuilt, 162/162 pass, no skips.
- `npm run test:guest:native`: rebuilt, 162/162 pass, no skips.
- All 21 normal static-only builds and separate coverage gates pass; no dynamic
  tier or gate relaxation. Final reports supersede the retained initial failures.
- `git diff --check`: pass.

The only compiler workaround is the coordinator-approved test-only import in
conversion.ts. The full normal native command, not the focused or build-only
experiments, supplies final acceptance evidence. Initial sandbox linking failed
before installed-library access was granted. No toolchain version changed.

### Final static statement counts

| Entry | Static / analyzed |
| --- | --- |
| `src/cli.ts` | 1157/1157 |
| `test/realms.ts` | 1353/1353 |
| `test/object-descriptors.ts` | 877/877 |
| `test/object-prototypes.ts` | 1231/1231 |
| `test/object-keys.ts` | 871/871 |
| `test/conversion.ts` | 503/503 |
| `test/definition-dispatch.ts` | 1281/1281 |
| `test/array-storage.ts` | 1432/1432 |
| `test/array-like.ts` | 916/916 |
| `test/operation-context.ts` | 1265/1265 |
| `test/array-map.ts` | 1533/1533 |
| `test/array-literals.ts` | 1202/1202 |
| `test/property-key-conversion.ts` | 1373/1373 |
| `test/numeric-operators.ts` | 1216/1216 |
| `test/addition.ts` | 1230/1230 |
| `test/relational.ts` | 1261/1261 |
| `test/primitive-conversion.ts` | 1352/1352 |
| `test/operator-coercion.ts` | 1276/1276 |
| `test/key-coercion.ts` | 1306/1306 |
| `test/length-coercion.ts` | 1435/1435 |
| `test/array-length-coercion.ts` | 1630/1630 |
