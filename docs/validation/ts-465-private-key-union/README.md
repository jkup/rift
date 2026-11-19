# Private field-key narrowing

The TS-465 full-engine build fails with SC2003 when passing `field.key` to
`GuestObject.defineOwnProperty` after excluding `PrivateName` with an
`instanceof` branch ending in `continue`. TypeScript accepts the narrowing from
`PrivateName | GuestSymbol | string` to `GuestSymbol | string`.

The failing code has this shape inside `#initializeClassElements`:

```ts
if (field.key instanceof PrivateName) {
    const added = privateFieldAdd(receiver, field.key, value.value, this.context, field.loc);
    if (added.type === "throw") { this.#capture(added); return added; }
    continue;
}
const defined = receiver.defineOwnProperty(field.key, {
    value: value.value, writable: true, enumerable: true, configurable: true,
}, this.context, field.loc);
```

Capturing `const fieldKey = field.key` before computing the initializer name,
then using that local throughout the remainder of the iteration, passes the
same focused native assertions. Both the separate full-source control and the
corrected draft report all 19,788 statements static. The stored initializer
array retains its uniform union element type; this does not use the unsafe
array widening identified in TS-444.

This is not a minimized compiler reproduction. Standalone controls covering
tagged field/block records, overlapping class layouts, preceding conditionals,
method calls and the actual imported name/symbol classes all compile. The
specific full-engine trigger remains to be isolated. Do not generalize this
finding to all property narrowing or claim that the standalone controls fail.

Evidence retained in the working checkout:

- `build/private-field-execution-draft/build/initial-private-key-union.ts` and
  `initial-private-key-union-reviewed.json`: original full source and failed
  build/coverage, with passing focused Node execution.
- `build/private-key-full-control/`: complete control source, native executable
  and raw passing report.
- `build/private-field-execution-draft/build/private-field-execution-reviewed.json`:
  fresh corrected-draft both-host execution and coverage.
- `build/private-key-union-probe/`: passing smaller controls and intermediate
  build results. The final `method-node` outputs are explicitly rooted and
  freshly compiled; earlier imported-class Node paths are not execution evidence.

After TS-465 integration, the full failure can be investigated by substituting
`field.key` for that local within `#initializeClassElements`, preserving the
rest of the feature, then building `test/private-field-execution.ts` with the
pinned compiler. Keep the failed variant separate from accepted source.
