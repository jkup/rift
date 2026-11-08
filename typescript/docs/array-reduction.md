# Array reduction

TS-062 adds generic `reduce` and `reduceRight` with one directional traversal.
Both box the receiver and capture length before validating the callback. Missing
initial values select the first present element in traversal order; explicit
undefined is an initial value. Empty arrays and all-hole inputs without an
initial value throw TypeError. Callback validation still occurs on empty input.

Traversal checks property presence at each index, includes inherited elements,
and reads current values. Callbacks receive accumulator, element, index and the
boxed receiver, with undefined as the call receiver. Earlier callbacks can
change later elements; changes to length do not change the captured range.
All abrupt completions propagate, and each visited index charges the operation
budget, including holes.

The implementation follows [reduce](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduce)
and [reduceRight](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reduceright).
The C++ `src/builtins/array/array_iterators.cpp` implementation was consulted.
TypeScript preserves length conversion before callback validation and uses its
existing callable dispatch for builtin and Script functions.

Host tests check exact access order, callback tuple and Realm, inherited initial
elements, explicit undefined, mutations, competing failures and resource bounds.
CLI cases cover both directions, generic receivers, strict/sloppy callback this,
holes, empty inputs and metadata. Both guest suites pass 382/382, full tooling 290/290, runner30 and probes10 pass. All 80 native entries pass build and static coverage in one invocation; reduction driver4509/4509 static. All 225 C++ fixture results agree across hosts: 55 reported successes, 22 unchecked completions, 67 parse errors, 79 runtime errors and two reported failures. The empty-reduction fixture improves and all 76 previously completed files retain their outcomes. Logs: build/array-reduce-*.
