# Frozen controls, before implementation

`freeze.mjs` defines literal status/reason expectations independently of codecs.
`frozen.json` contains both runtime inputs, every child Result and constructor
arm, primitive kinds, registered-other Realm, original/secondary sites, all
five guards, normal parse/body and instantiation throw, with and without the
diagnostic escape sentinel. Its digest is frozen-sha256.txt. Native and Node
serializer bytes must each equal the frozen ASCII, not merely each other.

Required host mutation matrix (all rejected at both applicable layers):

- T01: v1/v2 rejection in both directions, alpha/beta, exact UTF-16 sentinel.
- T02: empty/truncated/concatenated JSON, duplicate and escaped-equivalent keys,
  versions 1/3, unknown/missing keys at every object depth, invalid UTF-8,
  65537 bytes, noninteger/negative/NaN counts, source lengths and coordinates.
- T03: nonce/hash/mode/ordinal/Realm/preflight drift, missing original site,
  primitive available constructor, available null/unknown Realm, source/build/
  registry context drift. No production launch is implemented in A.
- T04: exact child-to-envelope composition in test only, parse/assert/inspect
  roundtrip, forged classification, blocked context refusing executed pass,
  deadline > independent crash > output > protocol > child > harness > match.
  Cap-kill stays output resource using trusted transport. No v2 ledger append
  API exists in A; actual v1 ledger rejection and 60 blocked are preserved.
- U01/U02: all three runtime codes direct/secondary, wrong arm/phase/syntax code,
  missing original/inspection on parse-only/extra Constructor/unknown site.
- R01: other registered Script Realm matches by name; explicit foreign-profile
  and unregistered outcomes unsupported; legacy registry/unknown ID reject.
- B01: exact seven limits, missing sources/limits, text hash drift, source
  reorder/duplicate, stale request hash, nonexistent in-length coordinates,
  sources on wire; raw/non-strict same source with distinct request hashes,
  missing/unknown variant, context mismatch, raw harness/preflight/validation,
  nonraw test without preflight; ordered successful harness prefixes, repeated
  path occurrences retain unique IDs, unloaded source references rejected.
- D01: every nonnormal result with/without diagnostic; each parent timeout,
  host-fault, not-run, output resource with/without `TypeError: text only`.
  Null/empty/number/misplaced/nested diagnostic, unknown/missing fields reject;
  normal diagnostic rejects. Diagnostics never affect classification.

Parent literals: timeout/deadline; host-fault/crash and host-fault/protocol;
not-run with an unsupported-feature blocker yields that blocker; output cap
yields resource-limit/output; harness ordinary result yields harness-error/
harness and cannot be corpus pass. Unlaunched not-run is the only null-binding
case. All other results require binding. Transport process is parent-owned.
