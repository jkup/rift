# H4 compiler checkpoint: review required

The full 53-entry build completed. All static-only builds succeeded; 52 coverage
gates passed, including the new H4 driver. The unchanged
`test/script-function-setup.ts` reports 3,697 static statements **plus two dynamic
operations**. This is a failed gate, not 100% static acceptance. Original full
results are retained in `../initial-full-build-results.json`; the exact explanation
is `../setup-explain-dynamic.log`.

The dynamic sites are unchanged test helpers `value` (line62) and `state` (line67).
Both invoke `getBindingValue(name, context, loc)` on the union of
ScriptFunctionEnvironment, ScriptDeclarativeEnvironment, and GlobalEnvironment.
H4's approved GlobalEnvironment amendment adds a fourth defaulted `strict`
parameter. The local-binding method still has three parameters. scriptc lowers
this unequal-signature union method call through dynamic receiver dispatch.

`union-default-original.ts` reduces it to two classes, one union call, and four
analyzed statements: four static **plus one dynamic**. Both Node and native print
`6 7`. `union-default-proposal.ts` adds only an unused fourth defaulted parameter
to the local method: four static, zero dynamic, with the same two-lane output.
`results.json` retains typecheck, static-only build, separate explained coverage,
and execution results. The first invocation's missing TypeScript7
`--ignoreConfig` argument is retained separately; it is not a compiler failure.

## Exact requested amendment (not applied)

In the already-owned `src/script-environment.ts`, change only the local-binding
read signature from:

```ts
getBindingValue(name: string, _context: OperationContext, loc: Location): ValueCompletion
```

to:

```ts
getBindingValue(name: string, _context: OperationContext, loc: Location, _strict = true): ValueCompletion
```

Its entire body remains unchanged: missing local binding stays a host invariant
failure; an uninitialized local always throws guest TDZ ReferenceError; otherwise
it returns the stored Value. The unused flag matches the GlobalEnvironment
signature without making declarative reads permissive. No caller/test edits,
strictness inference changes, extra ticks, compiler/pin changes or dynamic-tier
allowance are proposed. Only this local read signature is requested; no unused
parameter is proposed for other methods.

This is a new API/signature amendment beyond the frozen table, so the production
change has **not** been applied. The isolated proposal is evidence for review,
not proof that the full actual-driver gate passes after amendment. If approved,
apply the exact one-line change, recheck affected gates and full acceptance,
retain zero old-test migrations, and only then commit the coherent candidate.

H4 remains incomplete and uncommitted pending coordinator review. There is no
main publication, successor, or public Script admission.
