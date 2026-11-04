# H6-C implementation candidate

Accepted base `a578ddc`; exact adoption contract is the accepted CP2 proposal.
Only `src/realm.ts`, `src/builtins/string.ts` and `src/builtins/object.ts` change
in production. This candidate stops for actual and independent second review.
The coordinator owns COORDINATION and publication.

Script Realms register String then Object after the existing Error constructors.
String call alone descriptively renders an original primitive Symbol. All other
String inputs undergo the existing string-hint conversion once; construction
converts before prototype Get, defining-Realm fallback, one allocation tick and
creation of a genuine String object. Missing and explicit undefined differ.
Object call and construction return an exact existing object Value without Get,
conversion or allocation. Missing/nullish inputs allocate once; other primitives
box once, using the defining Realm. No constructor.prototype Get occurs there.

The B constructor factory, tagged consume-once permits, dispatch, context API,
legacy whitelist and existing conversion methods remain unchanged. No static
methods, Symbol factory, JSON, public map, Array constructor, grammar, observer,
admission or compiler/pin changes are included.

## Frozen evidence and historical migration

`freeze.json` records byte-identical copies of CP2 REVIEW, F01-F12 matrix,
16 host schedules, four parsed schedules, exact replacement manifest and both
runtime inputs before production edits. `baseline-hashes.json` protects all
preexisting files outside the assigned scope (and coordinator-owned status).
`driver-source-freeze.json` records the driver before native execution.

The only historical test edits are the three complete CP2 proposed files and
seven exact replacements. `preserve.mjs` reconstructs every replacement from
the accepted base, checks complete resulting bytes and hashes, protects the
other historical tests and evidence, verifies unchanged old methods/Realm
machinery and one additive native gate, and checks the 60 blocked variants.
Historical validators are immutable; local replay copies redirect only evidence
paths. The full proposed M driver runs, including genuine missing-constructor
and explicit undefined-shadow controls, plus C's direct actual-Object-link checks.

## Executed coverage

The C driver reads `String(7);` or `String(11);` after compilation. Every input
runs F01-F12, both same/cross-Realm dimensions and fresh/seven-seeded sessions.
Per input and host:

- 400 host step-prefix controls, 192 host call-limit controls and 464 exact
  hook-abrupt prefix controls.
- 188 parsed accessor step prefixes, 64 call-limit controls and 384 returned
  method abrupt-prefix controls. The four literal schedules include the
  existing nonstrict lexical setup tick; return totals9/11, throw totals9/10.
- Primitive Symbol versus wrapper/returned-Symbol distinctions, genuine boxes,
  UTF-16 indices/flags, missing versus undefined, metadata and initial native
  names, exact object Value identity/no Get, legacy absence and Realm isolation.
- 15 actual public C Object-link species controls across own, Function.prototype
  and Object.prototype properties, including absent/undefined/null default,
  genuine TypeError, unsupported custom construction and exact poison completion.
  Equal-description symbols and string spellings do not alias canonical species.
- 14 separate-session reentries (call/new across normal, numeric guest throw,
  foreign Error, unsupported, host, inner step-limit and inner call-limit exits).
  Finally checks the complete restored outer frame/Realm/counters even during
  host unwind. BOTH original owners perform String(7) with exact +3 steps when
  their immutable budget permits. Exhausted owners reject at their next guard.
  Raw call/construct attempts reject in finally, live reuse and idle without effects.

Counts include both same/cross dimensions and do not inflate the twelve semantic
rows. `oracle-audit.mjs` compares literal executable tables to CP2 and includes
four negative mutation controls. `validate.mjs` requires exact output, successful
exit, empty stderr and static build/coverage evidence on both inputs and hosts.

## Observability and limits

Genuine constructor.prototype is immutable. Conversion -> Get -> fallback ->
tick -> allocation order is therefore reviewed in source and supported by
reachable abrupt/resource controls; a copied-slot accessor shell is a guard
negative, not a positive prototype-Get observation. No mutable intrinsic, public
Construct, alternate context or authority seam was added. B's exact guard suite
and source checks remain authoritative for permit tuple details not independently
isolated by publicly reachable negatives. There is no real foreign intrinsic Array.

The initial sandbox Zig-library lookup failure is retained in
`development/initial-zig-gate.json`; the authorized native build passed with
4181 static statements and zero dynamic tier. No substantive compiler or oracle
failure required a workaround or contract amendment. Test setup corrections
used required ScriptLimits fields, existing name-before-length metadata order,
and the existing full trusted Get signature; no frozen expectation was relaxed.

Final validation is recorded in `suite-results.json`, `formatting-results.json`,
`map-results.json`, `feature-checks.json`, `replays/replays-results.json`,
`source-preservation.json`, `preservation.json` and `completion.json`.

## Candidate validation result

All required checks pass. Both lanes retain all 212 exact records; all 58 native
gates pass static-only and separate zero-dynamic checks. The C gate has 4181
static statements. C and the full proposed M driver pass both inputs/hosts,
as do H1-H6-B/E4, all 17 inherited groups, both Node boundaries/slots, typecheck,
runner20, probes10, host73 and observations22. Preservation protects 4238 files
and 140 unchanged old tests, with exactly three migrated files/seven replacements.
All 60 variants remain blocked. `completion.json` records the completed checks.
No publication or successor is authorized by this candidate handoff.

Hash records retain original working-copy bytes. Canonical LF hashes additionally
allow Git core.autocrlf=input normalization when reviewing a fresh checkout;
that fallback applies only to valid UTF-8 text without NUL. Binary files still
require their original byte hash. The driver pre-native raw hash is retained
alongside its canonical hash; no executable source or oracle changed.
