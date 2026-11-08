# Public array iteration

TS-065 exposes `map` and `forEach` in Script Realms. Both box the receiver,
capture its length before validating the callback, skip absent elements and
read inherited elements. Presence and values remain live during traversal;
appended elements beyond the captured length are ignored. Callbacks receive
the value, index and boxed input, with the supplied `thisArg`. Throws propagate
unchanged and traversal consumes the operation budget.

`map` reuses the tested internal default-array operation. It preserves holes
and allocates its result in the builtin's Realm. Custom species construction
remains explicitly unsupported; invalid species throws TypeError. `forEach`
ignores callback results, returns undefined and never reads the constructor.
Legacy Realms retain their previous public method surface.

The implementation follows the specification's
[map](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map)
and [forEach](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.foreach)
observation order within that species boundary. Tests cover sparse and inherited
elements, live mutation, primitives, callback validation, constructor effects,
cross-Realm ownership and budgets.

Initial validation: 414/414 Node checks; the new driver has 4726/4726 static
statements. Native acceptance is pending.
