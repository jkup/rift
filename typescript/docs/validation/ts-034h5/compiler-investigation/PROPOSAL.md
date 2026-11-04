# H5 compiler checkpoint: bounded test-only correction for review

The first native build of the new, partial `test/harness-construct.ts` fails
SC1090 at line 86: `o.constructorSlot === o.callable` compares nullable/union
properties. The exact failing driver and build/coverage logs are retained here.
The driver has not been corrected. No compiler pin or production API amendment
is proposed.

`union-original.ts` retains the actual GuestObject consumer, with a real prepared
Script function, Function.prototype, and plain-object controls. Both TypeScript
and Node succeed (`true false false`); static-only build and coverage reject the
identity comparison (3476 static / 3477 analyzed). `union-proposal.ts` reads the
two slots into locals and explicitly narrows before comparing:

```ts
function matches(o: GuestObject): boolean {
    const callable = o.callable;
    const constructorSlot = o.constructorSlot;
    if (callable === null || callable.kind !== "script-guest" || constructorSlot === null) return false;
    return constructorSlot === callable;
}
```

The proposal passes static-only build, separate coverage (3481/3481, zero
dynamic), TypeScript, Node, and native. Both lanes print `true false false`.
Complete records are in `results.json`, produced by `reduce.mjs` with installed
Zig on PATH and approved linker access.

## Exact requested correction, not applied

Add the above helper, named `matchingConstructorSlot`, only in the new owned
`test/harness-construct.ts`, and replace only
`o.callable!==null&&o.constructorSlot===o.callable` in the D01/D05 assertion with
`matchingConstructorSlot(o)`. Preserve the rest of the assertion and all
callbacks. This strengthens the ordinary Script function assertion by explicitly
requiring the script-guest discriminant and a present constructor slot; it still
compares exact callable identity. No production change, relaxed assertion,
additional public surface, new union shape, tick, or toolchain change.

The initial synthetic reduction did not reproduce SC1090 and its direct Node
execution could not strip parameter properties. The partial-import reduction
reproduced SC1090 but introduced unreachable dependency/static-slot noise.
Property-only narrowing still failed; local narrowing is required by the
observed compiler. These attempts and the sandbox Zig installation lookup
failure are retained separately, not counted as passing validation.

H5 remains incomplete and uncommitted. This is an early compiler checkpoint,
not a candidate for implementation acceptance. The 172-prefix tests, A/X
controls, additive native gate, full old suites/replays, and final evidence are
still to be completed after review. Do not publish or start a successor.
