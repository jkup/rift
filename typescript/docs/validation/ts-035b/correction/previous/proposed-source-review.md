# Private fallback proposal — not applied

Rendered by `propose-source.mjs` from the current candidate. The exact before
and after hashes and five replacements are in `proposed-source.json`; the full
proposed file and diff are `proposed-source.ts.txt` and `proposed-source.patch`.
Production bytes are checked unchanged. This is review evidence only; no new
compiler/runtime claim is made for the proposal.

One private engine field holds record/unit/location, never Realm or authority.
Inspection installs a copied original source anchor alongside its existing
saved abrupt history. Capture uses this source only while the anchor is active,
and always keeps the actual frame Realm. Thus pre-dispatch failure is in the
entry Realm, while a builtin failure is in the builtin defining Realm.

The entire existing actual Script function execution method, including function
identity lookup, activation allocation and instantiation, suspends the anchor
and restores it in finally. No frame/context/lexical/strictness mutation is
added. Suspension depends on actual execution, not record equality. The existing
first-propagation completion identity check remains before source selection, so
an actual guest failure is not overwritten when it unwinds through a builtin
whose synthetic anchor has been restored. Original inspection bookkeeping and
anchor are restored on guest/resource/unsupported/host exits; separate sessions
have independent private anchors.

`proposed-source-controls.json` freezes literal P01-P09 controls for both runtime
inputs and fresh/seven-seeded sessions. P08's strict, zero-parameter getter has
one activation tick then the throw statement and marker expression: entry uses
two ticks; setup/body failures are 3/4/5, success consumes five. The exact source
columns are 15 (function), 28 (throw), 34 (marker). P03 specifically catches an
incorrect record-equality implementation. P02/P04 additionally propagate through
an ordinary builtin wrapper to check first-propagation identity after suspension.

Existing X/U, detached-result, raw-context/permit denial and both-session reuse
controls remain unchanged. New actual controls would assert the new snapshots,
including unchanged original history and no anchor leakage on subsequent throws.
No codec, public API, registry, compiler, pin or ownership expansion is proposed.
