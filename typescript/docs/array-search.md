# Array indexOf and includes

TS-042 implements generic `indexOf` and `includes` using existing guest object
operations. Both capture length before converting `fromIndex`, skip that
conversion for empty receivers, and clamp the resulting offset to the search
range. Each iteration charges the shared execution budget.

`indexOf` checks property presence before reading an element and compares with
strict equality. `includes` reads every position and uses SameValueZero, so it
can match both holes as `undefined` and numeric `NaN`. Neither method coerces the
search value. Inherited elements and abrupt property operations retain their
ordinary semantics.

Sources: ECMA-262 [indexOf](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.indexof)
and [includes](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.includes),
checked against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/ArrayPrototype.mts).
The two loops remain explicit so their different property operations are easy
to see. Only offset conversion and the general equality operation are shared.

The new host test covers traversal order, inherited matches, length changes
during coercion, empty receivers, failures and budgets. CLI tests cover primitive
receivers, offsets, safe-integer bounds, identity, `NaN`, zero and method metadata.
The existing Script Realm bootstrap checks now run on two inputs in the ordinary
guest suite, instead of requiring a historical replay script.

Node guest checks pass 244/244. Native acceptance is pending. These methods do
not introduce proxies, reflection or `Symbol.unscopables` support.
