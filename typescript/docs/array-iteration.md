# Public array iteration

TS-065 exposes `map` and `forEach` in Script Realms. Both box the receiver,
capture its length before validating the callback, skip absent elements and
read inherited elements. Presence and values remain live during traversal;
appended elements beyond the captured length are ignored. Callbacks receive
the value, index and boxed input, with the supplied `thisArg`. Throws propagate
unchanged and traversal consumes the operation budget.

`map` uses the shared [species construction](array-species.md) operation and
preserves holes. Default arrays belong to the method's Realm; selected constructors
may return other objects. Mapped elements are defined as own data properties,
without a final length assignment. Invalid species or rejected property creation
throws TypeError. `forEach` ignores callback results, returns undefined and never
reads the constructor. Legacy Realms retain their previous public method surface.

The implementation follows the specification's
[map](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map)
and [forEach](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.foreach)
observation order within that species boundary. Tests cover sparse and inherited
elements, live mutation, primitives, callback validation, constructor effects,
cross-Realm ownership and budgets.

Original TS-065 acceptance: both guest suites pass 414/414, full tooling 290/290, runner30 and probes10 pass. All 82 native entries pass build and static coverage; iteration driver4726/4726 static. All 225 C++ fixture results agree across hosts: 58 reported successes, 23 unchecked completions, 67 parse errors, 75 runtime errors and two reported failures. All 78 previously successful or unchecked files retain their outcomes. Logs: build/array-iteration-*.
