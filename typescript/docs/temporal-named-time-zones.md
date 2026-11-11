# Named timezone guest inputs

The shared Temporal timezone parser admits identifiers from pinned IANA 2026f.
ASCII case is normalized to the registered spelling. Display identifiers retain
aliases; equality compares primary identities. Fixed numeric offsets keep their
existing grammar and remain distinct from named zones with the same offset.

Constructors, from/with conversions, plain-to-zoned conversion, Instant formatting
and Now factories use the same named-zone provider. Existing unknown-zone,
malformed-offset and option-order tests remain. Former known-zone rejection
examples are replaced with unknown-zone controls and covered positively through
the public API. This does not enable Intl, system timezone discovery or additional
calendars.

Factory is retained with its pinned zero offset and its own identity. This follows
the IANA Zone inventory and the recorded identifier policy, rather than Node's
ICU rejection. It is not a geographic location or an alias for UTC. Etc/Unknown
remains invalid. See [identifier decision](iana-timezone-identifier-review.md) and
[ECMA-402 identifier enumeration](https://tc39.es/ecma402/#sec-availablenamedtimezoneidentifiers).

Validation includes 1,170 public behavior controls, 1,794 identifier/casing/alias
controls covering all 598 names, affected fixed-offset regressions, full guest
and tooling suites, and both-host static-only/zero-dynamic gates. Combined
integration acceptance is separate from this isolated draft.
