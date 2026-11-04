# TS-035A pre-implementation binding review request

Base: `c4310c7`. Scope: synthetic data only. No production implementation or
acceptance claim. The coordinator's existing COORDINATION.md modification is
untouched.

The accepted contract requires both decoder layers to enforce the operation
table, including: “non-raw conformance requires parent-validated preflight ID and
harnessValidated=true”. It also requires rejecting “raw with harness units”.
However, the closed ScriptDecoderBinding and its fixed hashed request contain
no variant; only the full-envelope context's identity has that field.

Run `node docs/validation/ts-035a/binding-review.mjs` from `typescript/`.
The witness supplies identical validly hashed binding objects and identical
child bytes for raw and non-strict contexts. The child is test/body normal,
with no harness units, preflightId=null and harnessValidated=false. Raw and
non-strict transformations can both preserve the exact source `1;`.
The raw-specific preflight rule permits that combination; the non-raw rule
requires rejection. A deterministic `parseScriptDriverResult(bytes,binding)`
cannot distinguish them. This is an information-flow witness, not evidence
that either decoder has been implemented or that a corpus row is admitted.

Requested narrow contract decision, before freezing the acceptance matrix:

- Either bind variant explicitly in the closed trusted binding and fixed
  request digest, with equality to context.identity.variant; or
- Explicitly reserve variant-dependent validation for the full-envelope/context
  layer, and narrow the claim that both layers enforce those invariants.

The first option preserves the stronger child-decoder requirement. Neither
option has been implemented. Inferring raw from absent preflight/harness data
would make the invalid non-raw case indistinguishable from the permitted raw
case and is not an acceptable workaround.

Validation performed: the isolated witness and git diff whitespace checks.
Full suites/native builds were not run because there is no implementation yet.
The T01–T04/U01/U02/R01/B01/D01 fixture freeze remains outstanding pending this
decision. No v1, existing tests, compiler, launch/admission, historical evidence,
build registration, or feature inventory was changed.
