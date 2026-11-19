# E3h capture correction1: snapshot directory argument

The proposed controller in rejected commit `5ef4d7bf50ff773afb03230ee3a7e875aad31f39` passed the capture directory to `exact` with its default regular-file requirement. It therefore failed before extracting any snapshot. The original source,81-control evidence, literals, manifest and seals remain unchanged in `ts-035e3h-capture-p`. Copies of the root review witness and result are retained here; the originals remain intact.

This version changes exactly one occurrence:

```diff
-const root=exact(join(c.root,'capture')),files=[];
+const root=exact(join(c.root,'capture'),true),files=[];
```

The full corrected proposal is `runner.mjs.proposed.txt`, SHA-256 `9b1c9ee8b1119065962f09d7d7ee268a9951c5e1e3ad4eeec5dbe8ddd949f501`. `source-transformation.json` pins the original `ddaddacf25f9db9263883210db31ee65c9abd0ddab922feb36272cab21f44065` source and exact replacement. No recorder/supervisor source, UTF-16 handling, limits, schema or oracle changed.

`extraction.mjs` takes the exact `exact()` function and actual snapshot-reading block from each complete proposal, with only the imports and function wrapper required to exercise them. The retained original/corrected extracted texts must reproduce byte-for-byte. Tests import those fragments, never the controller or its process-launch code.

Five direct filesystem controls passed: reproduce the original directory rejection; extract every exact file/byte from an ordinary directory using the correction; reject a regular-file capture root; reject a junction root; reject hardlinked snapshot files. They use the unchanged independent model's complete four-file snapshot. `directory-results.json` retains full fixture identities and the junction target; fixtures remain under the ignored build directory. There was no controller, recorder or compiler invocation. This tests actual extracted behavior, not merely source-string presence.

The unchanged inherited81 controls passed into new exclusive `inherited-results.json`. No old result was regenerated or relabeled. `check-correction.mjs` checks transformation/extraction correspondence, fixture preservation, root witness copies and both reports. `verify.mjs` additionally preserves all13,170 base files and historical seals through exact relocated guard copies, plus the real appended TASKS boundary. COORDINATION remains root-owned.

The unconditional controller runtime gate remains closed. Recorder staging, binary identity, compilation, Windows lifecycle/race behavior and independent attempt completeness remain unresolved. Total attempts remain unknown; no executable approval or provenance authority follows. No helper compile, Add-Type, recorder/benign lifecycle/compiler/driver invocation or scan occurred. Stop for actual/root/second review before any next stage.
