# Independent review corrections

Two host-boundary defects were found in milestone `73af503`. This correction
does not self-accept scope B; it is ready for another independent review.

## Preparation snapshot

`prepareObservation` previously verified the bytes and transform synchronously
but retained references to the caller's selection while awaiting build identity.
A caller could change `variant` from non-strict to strict during that wait. The
result then claimed strict identity while retaining unprefixed bytes/hash, and
`validateLaunch` accepted the internally inconsistent plan. The baseline
reproduction is retained in `review-preparation-before.json`; it imports the
committed `73af503` module without altering the current implementation.

Preparation now clones the complete selection and copies the Buffer before any
await. It validates the selected Script variant, original blob/hash, transformed
hash, and configured limits using owned values. Every later identity, source
transform, binding, negative/blocker record and archived selection derives from
that snapshot. The caller's nested metadata is never retained. Invalid variant
tags are explicitly rejected before asynchronous work.

The new T21 regression runs in both real lanes. Immediately after calling
prepareObservation, it mutates the variant, path, blob, original/transformed
hashes, lane, nested negative type, blocker reason, required harness path, corpus
revision, manifest hash, source Buffer and step limit. Assertions check the whole
archived selection, every corresponding context field, exact disk bytes, hashes,
binding, persisted plan and actual parse rejection at1:1. This preserves the
literal reviewer reproducer (`return 1;` originally non-strict) and checks its
metadata extensions, without weakening any prior test.

## Child operation consistency

The shape validator previously accepted body-mode normal completion with
bodyEvaluated=false and parser-mode runtime throws. A new T07 table failed against
the previous decoder (`review-protocol-before.log`). Child decoding now also
checks the operation's mode, body state, stage and location:

- Normal completion has no location and evaluates a body exactly in body mode.
- Runtime throws, steps/calls/evaluation-depth guards and all runtime capability
  outcomes require body mode, bodyEvaluated=true, test stage and a location.
- Lexer/parser rejections and source/parse-depth guards require
  bodyEvaluated=false, test stage and a location, in either mode.
- Driver host faults have driver stage, no evaluated body and no location.

Every invalid table entry is checked at both parseDriverResult and
composeObservation. Composition must yield a protocol fault with driver stage,
false body and null location, never the impossible semantic outcome. Positive
controls pass through both boundaries, including parser normal false, body
normal true, body parse rejection false, every runtime guard and capability,
runtime throw, and driver fault. No conformance validation or engine code changed.

## Checks and artifacts

| Check | Result | Evidence |
|---|---|---|
| Full host suite | 72/72 | review-host.log |
| Operation-consistency table and existing protocol controls | 6/6 | review-protocol-after.log |
| Actual Node/native observation suite | 16/16 | review-observations.log |
| Raw review attempts, including both preparation regressions | Retained | observations-review/manifest.json |

The additional positive composition assertions were run after the full host run;
the final 6/6 protocol run includes them. Native engine/driver/serializer inputs,
build registrations and all old guest tests are unchanged. No builds were run
while the coordinator's independent build was active. After it completed, only
the affected host/observation checks ran using those binaries. The coordinator
reported Node/native212/212 and35 static gates at `73af503`; this host-only fix
does not claim another full native build. Original milestone evidence, failure
archives and denominators are preserved. `observations-review/` is the newest
successful observation run, superseding the initial `observations-final/` run
for the changed parent implementation.
