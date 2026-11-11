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

The runtime registry still needs generation provenance, malformed/non-ASCII
lookup tests and native static validation. Local-time resolution and migration
of every constant-offset consumer remain separate admission gates. Earlier
backend notes that deferred Factory are superseded by this explicit decision.
