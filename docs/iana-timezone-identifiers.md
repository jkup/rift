# Pinned timezone identifier registry

The internal registry contains all 598 Zone/Link names from the reviewed IANA
2026f build and 450 primary identities. It preserves the case-normalized input
identifier, primary identifier and selected offset data as separate fields.
Guest named-zone parsing remains disabled pending local-time resolution and
migration of constant-offset consumers.

Generation verifies hashes for tzdata.zi, zone.tab, backzone and factory, and
binds the output to the generated timezone data's provenance. UTC, zone.tab and
country exceptions follow the reviewed identifier policy. Aliases select their
primary identifier's data; raw links alone are insufficient. Factory is retained
with its encoded zero offset and distinct identity; Etc/Unknown is absent.

Lookup rejects empty, overlong and non-ASCII input before lowercasing, then binary
searches the sorted generated keys using the shared UTF-16 comparison helper.
The maximum accepted length is generated from the pinned inventory.

Both hosts validate every identifier/primary/data association against the review
fixture, 1,794 original/lower/upper casing lookups, shared primary data identity,
all 65,408 non-ASCII code units at the folding boundary, malformed names and
Factory's exact endpoint offsets. Native coverage is 244 static statements with
zero dynamic operations; all five regression groups pass. Ten generator controls
verify deterministic output and rejection of corrupt metadata, data bindings and
outputs without changing the draft. All 944 Node guests, 15 tooling builds,
296 tooling tests and 16 parent-envelope checks pass. Combined integration
acceptance remains pending.

Regenerate with `node tools/generate-iana-timezone-identifiers.mjs <review-directory>`;
use `--check` for read-only verification. Provenance records source and output
hashes and the data binding.
