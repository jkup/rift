# Named timezone identifier policy

TS-480 review, 2026-11-11. No guest named zones are enabled.

The registry will preserve the IANA-cased input identifier, primary identifier
and selected data record separately. Match ASCII case only; reject non-ASCII
input before folding. Keep the registry immutable for the engine instance.
Follow the UTC, zone.tab and country exceptions in
[ECMA-402 §6.5](https://tc39.es/ecma402/#sec-use-of-iana-time-zone-database).
In particular, primary identity must select the data record used for offsets;
following the input alias's raw Link can select a different history.

The pinned inventory contains 598 identifiers and 450 primary identities. The
review verifies primary idempotence and equal data references within each primary
group. Nineteen records select a different data name through primary identity
than through raw links, including UTC aliases, Pacific/Truk, Africa/Asmera,
Iceland and America/Coral_Harbour. This counts data routes, not necessarily
nineteen distinct offset mismatches. Their complete list is retained in
`build/iana-timezone-review/identifier-policy-review.json`.

## Factory decision

Include Factory in the future named registry, with primary/data identifier
Factory and the pinned encoded zero offset. This follows the selected policy of
including all pinned Zone/Link names: the
[identifier algorithm](https://tc39.es/ecma402/#sec-availablenamedtimezoneidentifiers)
starts with every such name. The pinned upstream `source/factory` explicitly
distinguishes valid Factory from invalid Etc/Unknown. Factory's unspecified
designation does not make it UTC or a real location. Etc/Unknown stays absent.

This is an intentional difference from installed Node 26.13.0/ICU78.3, which
rejects Factory. All 597 other identifiers agree with Node for original, lower
and upper ASCII casing and primary-identity equality. The 1,794 observations
retain all three Factory rejections rather than hiding them. This evidence does
not use Node's older 2026e offset data as an oracle for pinned 2026f data.

The lookup prototype passes all 598 names, 1,794 casing checks, 65,408 non-ASCII
code-unit controls and explicit malformed-name/Factory checks on both hosts with
zero dynamic operations. It bounds input length to the measured maximum of 32,
checks ASCII before lowercasing and uses the existing string comparison helper
for binary search. Evidence: `build/iana-timezone-review/identifier-probe-results.json`.

The runtime registry still needs generation provenance and integrated validation.
Local-time resolution and migration
of every constant-offset consumer remain separate admission gates. Earlier
backend notes that deferred Factory are superseded by this explicit decision.

## Isolated implementation evidence

The TS-480 draft now generates the complete registry with pinned metadata hashes
and an explicit dependency on the generated offset data's provenance. Its lookup
passes all inventory, casing, shared-data, malformed/non-ASCII and Factory offset
checks on both hosts. Native coverage is 244 static statements with zero dynamic
operations; all five regression groups pass. Ten generator controls reject
corrupted metadata, data bindings and generated outputs while preserving draft
files. The full Node suite passes 944/944 without skips; all fifteen tooling
builds, 296 tooling tests and sixteen parent-envelope checks pass. Inherited-file,
typecheck and both generators' deterministic checks establish isolated READY
status. No guest API admission has changed.
