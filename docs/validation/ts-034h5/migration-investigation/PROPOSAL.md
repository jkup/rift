# H5 bootstrap expectation migration: review required

The accepted H5 design explicitly installs a Script-only
`Function.prototype[wellKnownHasInstance]` method. The existing
`test/script-realm-bootstrap.ts` B03 inventory asserts an exact six-string-key
list for Function.prototype and therefore fails `key count` after the new symbol
is installed. The design's two-migration audit missed this third executable
consumer. It is not a reason to remove or hide the required method.

The old bootstrap source is untouched. The original test fails identically on
Node and native with both runtime fixture variants (B01/B02 pass, B03 fails).
See `results.json`; `bootstrap-original.ts.txt` retains the complete original.
All 212 original guest records per lane and all 54 static gates pass; 16 of the
17 inherited groups pass, with bootstrap the sole outstanding group.

## Exact proposed third migration, not applied

`proposed-migration.json` records four unique replacements against base
`7f80383` in `typescript/test/script-realm-bootstrap.ts`:

1. Import the canonical `wellKnownHasInstance` symbol.
2. Append that exact symbol to the Function.prototype inventory list. All six
   existing string keys remain in the same order. Ordinary OwnPropertyKeys
   emits symbols after strings, regardless of installation order.
3. Add explicit W/E/C=false method-property assertions, defining-Realm and
   Function.prototype identity, no constructor slot/own prototype, exact
   `[Symbol.hasInstance]` name and length1 with their existing builtin metadata
   flags. No existing assertion is removed or relaxed; the general `method`
   helper stays unchanged because it expects configurable=true.
4. In B01 explicitly assert that both legacy Realms lack the symbol property.

The full proposed original-path source is `bootstrap-proposed.ts.txt`.
`bootstrap-proposal.ts` differs from that only in relative import paths so it
can compile in this isolated evidence directory. `check.mjs` documents the
reproduction. Proposed source passes strict TypeScript with the repository's
Node types, static-only native build, separate coverage3926/3926 zero dynamic,
and B01–B18 on Node/native for both runtime-read inputs. All four original runs
still fail at the original assertion. Initial standalone typecheck omitted Node
types; that harness error is preserved in `initial-check-results.json` and was
corrected in the invocation, not in the source.

Approval requested only for this exact old-test expectation/strengthening and
adding this path/replacement set to the H5 whole-file preservation verifier.
No production, API, grammar, compiler/pin, manifest, public-admission, old output
label/denominator, or historical-evidence change. After approval, apply the four
replacements, rebuild/replay the actual bootstrap driver and its gate, confirm
all17 inherited groups and preservation, then commit the fully tested H5
candidate. No publication or successor assignment is implied.
