# Required provenance decision before a workaround

This is an implementation checkpoint, not a completed candidate. The assignment
requires review for substantive API/ownership ambiguities before a workaround.

The accepted contract requires inspection to use the entry frame's Realm/context,
retain the original defining source separately, and report actual secondary
source identity. It does not specify the location/provenance of the synthetic
constructor/name Get itself when the original throw came from another record.

`source-review.mjs` is a minimal actual-parser/guest-function/accessor witness:

* Other Realm defines `function fail(){throw target;}` in unit `original`.
* Current Realm evaluates `fail();` in unit `entry` (seven source units).
* A current-Realm builtin constructor getter returns a guest throw using the
  exact location passed to its existing Builtin signature.
* Original site is correctly `original:1:17`, other Realm.
* With original diagnostic.loc passed to internalGet, the current frame yields
  secondary `entry:1:17`, current Realm. That location is outside `entry`.

The same mismatch can affect a call-limit failure before getter entry and
resource/unsupported builtins that retain the supplied location. Actual guest
getter-body throws already capture their defining record correctly.

No clamping to 1:1, guessed call site, frame/Realm rewriting, registry seam,
codec relaxation, new public API or compiler workaround has been adopted.
Original history and both-session reuse still pass in the witness.

Please freeze the intended fallback site for synthetic inspection Gets. A
possible rule is to retain the original source site as the provenance of the
inspection operation (while using entry Realm/context for execution), and let
actual guest getter code override it with its defining site. This would require
a reviewed bounded private provenance implementation: merely passing a Location
cannot carry its owning record through the existing builtin call/capture path.
An alternative is a separately specified entry-site anchor, but the current
API provides no genuine guest source location for the post-evaluation Get.

Run from typescript: `node docs/validation/ts-035b/source-review.mjs`.
The retained JSON records the exact counterexample. Full validation of the
remaining implemented boundary may proceed, but B is not complete/acceptable
until this provenance rule and both-host controls are resolved.
