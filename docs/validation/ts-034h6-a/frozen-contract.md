# Frozen semantic matrix (proposed, not execution results)

Use actual Rift Values/descriptors and exact object references in a new dedicated
driver. `out` is a trusted recorder, not console display; a row saying object
requires an object assertion. `A` and `B` are fresh Script Realms; names such as
AE mean a host-transferred **actual** intrinsic, not a same-named replacement.
Unprefixed programs use prepareBoundedScript; prefix `"use strict";` where shown.
No unsupported syntax may be silently dropped. Read both input files after native
compilation and run all fixed rows for each input; freeze their bytes/hashes and
expected output before running either lane.

## A: allocation kernel, first bounded slice

Only three production files: runtime.ts, realm.ts, builtins/object.ts. Error
constructors and globals are deliberately absent in A. Test internal allocation
through an ordinary guarded host builtin as described in harness-errors.md.

| ID | Literal setup/source | Expected |
|---|---|---|
| A01 | runtime source `make("seven");` versus `make("eleven");` | Distinct own message strings; TypeError intrinsic prototype; ErrorData; normal object. Every invocation yields a distinct object. |
| A02 | For each family, createError(name,"x") twice in A and once in B | All objects differ; A instances use A family prototype; B uses B. Five distinct family prototypes per Realm; four NativeError prototypes → Error.prototype → Object.prototype → null. |
| A03 | Inspect descriptors before any Script publication | Own instance keys exactly [message]; message Wtrue/Efalse/Ctrue. No own name, constructor, diagnostic, stack or location. Prototype name/message as frozen. A constructor links are not yet installed. |
| A04 | Relink a branded object to null; host call Object.prototype.toString through trusted alias | `[object Error]`; an ordinary object linked to the internal Error prototype gives `[object Object]`. No reads of name/message. |
| A05 | Seed @@toStringTag on branded object with string Custom, then number7, then getter throwing q | `[object Custom]`, `[object Error]`, exact q; existing toStringTag tick/ordering unchanged. |
| A06 | Transfer make from A into B, execute runtime source in B | Instance/prototype from A; caller source B, guarded builtin frame Realm A; idle frame/calls/depth restored. |
| A07 | Direct callback invocation with fabricated context / retained callback after session ends | Existing host guard errors; no allocation exposed; no tick or output. |
| A08 | Run each input with all3 fresh and all3 seven-seeded failing prefixes, two success limits and calls0/1 | Exact counts/locations in main contract. Resource origin; no returned instance at failed prefix; cleanup on every exit. |
| A09 | Legacy Realm with same old direct helper/error/control sources | Same five globals/prototypes and212 records. createError on legacy Realm is a host misuse rejection; no new guest global. |

A retains old54 gates and adds kernel gate55. No compiler feasibility probe is
required in advance: this uses established class/Realm patterns; if actual static
coverage fails, retain the failing build and a bounded reduction before revising.


## Literal budget contract

For A, a trusted builtin `make` checks its string argument and returns
`context.realm.createError("TypeError", args[0].value)` without ticks or guest
conversion. Runtime files contain `make("seven");` and `make("eleven");`.
Each has exactly3 ticks at line1 columns1,1,6. Fresh limits0,1,2 fail with
step counts1,2,3 at those columns; limits3,4 return a fresh branded TypeError
with own message seven/eleven. Seven-seeded limits7,8,9 fail at counts8,9,10;
limits10,11 succeed. Call limit0 fails after the three source ticks, count0/
limit0; limit1 succeeds. No catch/constructor claims in A. The helper has the
existing one-use call permit and allocates in its defining Realm.


Frozen before production edits. All A01-A09 run for both runtime inputs. Expected stdout: PASS A01 through PASS A09, one line per row.
