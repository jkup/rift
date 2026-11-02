# TS-032A backend implementation evidence

2026-11-02, Windows x64, Node 26.13.0, scriptc 0.4.7, installed Zig 0.17.0.
Assignment base: `9c39011d50f9acf2864f9ae0f360910f4165daac` on
`codex/test262-classification`. Coordinator subsequently committed its own
assignment record at `b772d50`; this writer did not edit COORDINATION.
Implementation complete, awaiting independent acceptance. No builtin integration.

## Implementation and proof boundary

`src/number-radix.ts` exports only `numberToStringRadix(value, radix)`.
`src/number-radix-internal.ts` implements the frozen half-gap initialization,
upper-endpoint scale, first-hit digit termination, three-exponent/six-candidate
closest/even selection and canonical positional rendering. Its exported classes
and helpers are private numerical test seams, not engine interfaces. The public
entry and instrumented driver call the same implementation. No oracle helper,
host formatter/parser, logarithm estimate, fallback, cache, or custom limbs enter
the backend. Invalid inputs throw the specified host fault before extraction or
radix arithmetic. The decimal backend is unchanged.

The equations and bounds remain those in `docs/radix-formatter-backend.md`.
The first scale's exponent is implicit in its exact scaling state: only the
minimum k is needed afterward; the final selector recomputes the magnitude from
the immutable original interval. The prefix is retained through digit generation
but is never rendered. Whole-significand parity and binary endpoint parity are
separate. Same-parity distinct exact ties fault. Resource instrumentation watches
arithmetic results, retaining the largest absolute intermediate without bigint
formatting; the driver counts its bits by shifting. Initial positive chained
products have intermediate factors no larger than their watched final product.
The 16384-bit guard constant itself is constructed without exceeding that width.

## Acceptance matrix

| Row | Result / retained evidence |
|---|---|
| B01 | All 24 unchanged literal vectors match exactly in both lanes, including the seven cross-power choices and original counterexamples. |
| B02 | Frozen 13350 rows retained byte-for-byte at the start of runtime-input.txt. SHA256 `9102f9fe83fc37b2b883a55e29c9ec173e4c0d54118eaf96113a166702dc1c6d`. Each lane independently judged for whole-string canonical form, interval, minimum k and Note2. |
| B03 | Production interval output independently compared to oracle adjacent-pattern midpoint rationals at minsub, maxsub, minnormal, next normal power, max finite and odd normal. Exact endpoints, outside half-unit neighbours and negative candidates checked by the actual membership helper. |
| B04 | Actual selector tested with synthetic only-low, only-high, both, ties in both parity orders, base3 significands 3/4, clipping/duplicates; actual comparison helper tests distance denominators, duplicate identity and same-parity fault. Cross-power cases also have frozen literal checks. |
| B05 | Additive 1394 rows cover all 34 supported radices at selected exponent boundary groups and adjacent bit patterns, low subnormals and max finite. The selection is explicit in the orchestration; it does not claim all binary64 boundaries. Duplicates are retained. |
| B06 | 17 malformed/noncanonical full strings rejected; unpadded `1` for 256/base16 fails interval, canonical `100` accepted. Oracle source unchanged. |
| B07 | Six invalid values and eight invalid radices throw the exact host Error in both public and instrumented entries. Instrumented counters remain untouched. |
| B08 | Both lanes: max k53, scale1073, power1075, intermediate2159 bits, unsigned length1076, six candidates. Derived limits remain57/1076/1131/16384/1076. Synthetic scale1077 and 16385-bit values exercise guard faults. Timings/RSS below. |
| B09 | Final runtime-input driver: static-only build, separately parsed220/220 static, zero dynamic. Complete commands/version/build/coverage in backend-build-results.json; source hashes in preservation.json and executable/JS hashes in summary.json. Inputs are read after compilation, with no embedded answers. |
| B10 | Both full guest suites212/212, all36 old static gates plus additive backend gate pass; runner20/20, probes10/10, typecheck pass. Full native-build-results.json precedes final timing-only driver additions; backend-build-results.json is the final driver's gate. No old target/record changes. |
| B11 | All18 original TS021P decimal controls pass in each lane using the rebuilt unchanged original decimal probe, with its own static/coverage gate. Protected source/evidence and unchanged old build-target list checked against base. No registration, decimal, coercion, Realm, parser, protocol, compiler/pin, test262, C++, or CL006 changes. |

`summary.json`, `node-verdicts.json`, `native-verdicts.json`, and both corpus
transcripts contain 14768 results per lane (13350+1394+24), with zero skips,
crashes, timeouts or dropped outputs. Index, bit-pattern/radix identity, count,
exact literal strings and Node/native bytes are checked. Oracle results are
computed independently from production, using the unchanged host-only CL005
oracle. Agreement between hosts is an additional check, not the oracle.
All process failures are fatal; transcript recording precedes assertions.

## Resource observations

Final run: five warm batches of14768 public calls each; median/max elapsed
Node409.673/410.556ms, native750/750ms. Batches include runtime bit decoding and
length accumulation, but no output, oracle work or bit-width measurement.
Single instrumented calls: Node median0.0189ms/max0.8374ms; native median0/max16ms.
The native clock is visibly quantized; zero does not mean zero cost. Full driver
process elapsed (including output, width counting, duplicate public calls and
five warm batches) was3140.641ms Node /5562.016ms native.

Driver-reported RSS before/after: Node44748800/58351616 bytes;
native8630272/8040448 bytes. These are runtime snapshots, not peak memory or
allocation/GC guarantees. Timing is diagnostic, with no semantic threshold.
No exhaustive binary64 or non-Windows claim follows from these finite samples.

## Retained unsuccessful attempts

* `build-initial.log`: sandbox could not access Zig's installed libraries.
  Approved build succeeded; no compiler or source workaround.
* `validation-initial-failure.log`, `node-corpus-initial.json`: all Node outputs
  were obtained, but the first identity assertion compared bits/radix to the
  frozen row's extra provenance label. Corrected identity comparison retains
  the complete original input bytes and compares both actual identity fields.
* `audit-initial-failure.log`: preservation audit initially treated the
  coordinator's concurrent assignment commit as an implementation change.
  It now explicitly excludes coordinator-owned committed metadata and checks
  that this writer has no working-tree coordinator edit.
* `decimal-parser-failure.*`, `audit-decimal-parser-failure.log`: an initial
  guest-CLI decimal-control transport used unsupported exponent literals.
  No parser change was made. The original typed TS021P probe is the final
  control transport.
* `decimal-import-coverage-failure.json` and related audit/validation logs:
  importing production numberToString into the isolated driver built but
  reported587/591 static, with unrelated unreached boxing methods. Direct
  imported decimal executions matched18/18 in each lane, retained in
  decimal-import-execution.json, but that artifact is not accepted as a static
  gate. Before changing transport, `import-reduction.ts` reduced this to one
  import and one call:364/368, same unreached methods; `import-control.ts`
  is1/1. Full diagnostics are retained. The final driver drops that unrelated
  import and the unchanged original decimal probe supplies the18 controls.
  No runtime workaround, compiler change, gate relaxation, or limb replacement.

Earlier successful build/control/log snapshots are retained and explicitly
superseded by backend-build-results.json, summary.json and audit.log.

## Reproduction

From `typescript`, with the pinned dependencies and installed Zig on PATH:

```
npm run test:guest:node
npm run test:guest:native
npm run test:runner
npm run test:probes
npm run typecheck
node tools/test-number-radix.mjs --build
node tools/audit-number-radix.mjs
```

On this Windows sandbox, native linking required approved access to Zig's
installation. The audit rebuilds the original decimal probe and requires the
full-suite result files. It preserves existing files and uses this directory
only for its evidence. Independent review should inspect the frozen derivation,
actual source and seam assertions as well as rerunning. No Number.prototype
registration or successor work is included; no main merge is authorized here.
