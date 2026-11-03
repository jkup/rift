# ER-B pre-implementation ownership review

Sole writer chat `01a1a017-50d5-7382-afe2-c18c2236bf20`, branch
`codex/test262-classification`, accepted implementation base `31cedae`;
checkout HEAD `529a022` includes coordinator dispatch documentation.
The accepted ER-P matrix was copied byte-for-byte to `frozen-matrix.md`
before any implementation edit. Only R29–R32/R35 are assigned here.

The assignment requires returning a precise proposal before changing an existing
Script surface assertion. Source inspection identifies one required additional
test file: `test/script-realm-bootstrap.ts`. No production or test edits have
been made at this review boundary.

## Proposed exact migration

* B03, `inventory`, lines 49–52: change only the Function.prototype key list
  from `name,length,call,toString` to
  `name,length,caller,arguments,call,toString`. The new hook runs immediately
  after metadata and before method registration, so this is the exact insertion
  order. Preserve every other prototype list, prototype-chain assertion and
  method assertion. For the two new keys, assert accessor kind, E=false/C=true,
  object getter and identical setter/getter Values, and shared endpoint identity
  between the two descriptors. Do not send them through `method`, which requires
  data descriptors. Keep all existing method checks for the existing keys.
* B04, line 87: retain the fresh-object and data-value method identity assertions.
  Discriminate descriptor kind before reading value. Require matching kinds in
  the paired Realms. The accessor branch must be limited to the Script
  Function.prototype pair (`i === 1`) and keys caller/arguments, assert E=false,
  C=true, getter/setter object endpoints, sharing within each Realm and distinct
  endpoint objects between Realms. Unexpected accessors anywhere else fail.
  Descriptor inspection must not invoke endpoints. Do not weaken `own()` globally.

This affects B03 and B04 assertions only; keep their stdout and all 18 bootstrap
row IDs unchanged. No fixture, old runner expectation, record name or denominator
change is proposed. New R29 assertions will additionally cover all thrower metadata,
nonextensibility and exact keys. New R35 assertions cover legacy absence and guards.

## Preservation inventory and proposed checks

The Script function materialization test's lines 84/88 assert **own** function
keys and own caller/arguments absence; those remain correct and unchanged.
The legacy realm test's exact Function.prototype key assertions at lines 141/298
remain correct and unchanged. Other Script tests inspect named methods, own
function keys or binding names; no additional semantic expectation migration
was found by scanning `functionPrototype`, `ownPropertyKeys`, `caller`,
`arguments` and descriptor consumers.

After coordinator approval, implement only the assigned ER-B files plus these
two bounded assertion migrations. Run both bootstrap inputs on rebuilt Node/native
with exact B01–B18 output, the full 212-record suites, 47 retained plus one new
static-only/separate zero-dynamic gates, the new runtime-selected ER-B inputs,
and all inherited acceptance controls from the assignment. No runtime, native
or implementation success is claimed at this documentation-only boundary.
