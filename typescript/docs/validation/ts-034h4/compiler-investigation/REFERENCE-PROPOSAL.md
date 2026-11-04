# Second H4 checkpoint: optional Reference field loses native key mutation

The rebuilt native guest suite passes 211/212, with no skips. Its sole failure is
unchanged `test/key-coercion.ts:150`: `direct read reuses saved key`. Node passes
212/212. The actual failing guest result is retained in
`../guest-native-results.json`; the original assertion and fixtures are unchanged.

The minimal `reference-original.ts` has a property-reference union containing the
approved optional `strict?: boolean` field. An inferred object without that field
is passed to a function that mutates its key. Node prints `string`; the native
binary prints `object`: mutation is lost at the structural widening boundary.
The separate coverage report is fully static, so coverage alone cannot detect it.

Two controls isolate the trigger:

- `reference-baseline.ts` removes only the optional strict field: Node/native both
  print `string`, matching the pre-H4 Reference shape.
- `reference-annotated.ts` adds only an explicit `Reference` annotation to the
  caller: Node/native both print `string`.

All three typecheck and build static-only. Sources, build logs, explained
coverage, and exact two-lane results are retained in `reference-results.json`.
The annotated control is **not** a proposed old-test migration. Fixing only the
old test would mask the native regression for other structurally typed callers.
No test, assertion, compiler, pin or production workaround has been changed.

## Proposed contract amendment for review (not implemented)

Keep the original `runtime.Reference` shape exactly unchanged. Carry the Script
mode in a private ExecutionEngine wrapper instead of adding an optional field to
this shared mutable Reference:

```ts
type EngineReference = Reference
    | { kind: "script"; binding: ScriptBindingReference }
    | { kind: "script-property"; reference: Reference; strict: boolean };
```

At the Script property-reference site, explicitly create the original typed
`Reference`, then wrap it with the source-derived captured strictness. The wrapper
owns no semantic property/key cache: the contained original Reference remains
the single mutable cache used by Get/Put/Delete and method receiver selection.
The legacy path continues to construct/use its old unwrapped Reference.

Change only the failure-mode argument of the two existing operations:

```ts
putValue(ref: Reference, value: Value, context: OperationContext, loc: Location,
    strict = true): Completion
deleteReference(ref: Reference, context: OperationContext, loc: Location,
    strict = true): ValueCompletion
```

The private Script wrapper forwards its captured mode; all old callers omit it
and remain strict. Get forwards the contained Reference unchanged. Call receiver
selection uses its captured base. Key conversion/cache mutation, primitive
Receiver, abrupt identity, evaluation order, budgets and guards remain unchanged.
There is no new source override or execution authority: preparation and references
still derive mode from source. No extra guest allocations or ticks are introduced; the wrapper allocates a host object.

This would supersede the frozen optional-field rows for runtime/delete-reference
and the internal property-reference row. It stays inside the existing nine-file
ownership and preserves zero old-test migrations, but it is an unapproved API and
representation amendment. It requires actual review before implementation and
fresh native semantic verification afterward. The first signature-union proposal
in `PROPOSAL.md` is a separate necessary gate correction.

Alternative designs may be selected by the coordinator. This writer has stopped
before applying either proposal, as required by the H4 contract.
