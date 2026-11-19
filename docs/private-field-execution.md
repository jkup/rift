# Private field execution

TS-465 is in progress. The draft connects private reference reads, writes and
call receivers to identity-based storage, and routes instance/static private
field initialization through the existing ordered initializer records. Bounded
parser admission, suspended references and direct eval are connected. Focused
tests cover ordinary, async and generator execution, cross-Realm errors and
syntax provenance. Six historical test files migrate their original source
strings explicitly; exact replacements and baselines are retained.

The initial draft passes 934 Node guests. Its native build rejects a property
union narrowing with SC2003. Capturing the field key in a local variable passes
the same focused test in a separate full-source control, with all 19,788
statements static. Smaller standalone controls compile successfully and do not
reproduce that failure. The original full failure and the passing control are
retained under `build/private-field-execution-draft/build/initial-private-key-*`
and `build/private-key-full-control/`. The draft now uses the local capture;
fresh full validation remains pending. No private-field support is accepted yet.

The first tooling run passed 294 of 295 tests and caught an incomplete protocol
update: only the child decoder accepted `private-name`. The parent decoder now
accepts the same exact rule, and the pinned source comparison records only that
addition. A new codec test checks both boundaries and invalid neighbors. Sixteen
real Node/native producer records also pass parent envelope decoding under
test-only identity metadata. The original tooling failure is retained; the
corrected 296-test tooling suite must pass before readiness.

Reference creation resolves the private name without validating the receiver.
Plain assignment evaluates its right-hand side before the write rejects a null,
primitive or unbranded receiver. Compound assignment reads first, and a private
call reads the function before evaluating arguments. Optional access skips its
remaining operations for null and undefined. This follows
[MakePrivateReference](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-makeprivatereference)
and the GetValue/PutValue operations on that page. Do not insert an early
RequireObjectCoercible check into reference creation.

[DefineField](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-definefield)
evaluates the initializer before inserting the field. A duplicate stamp must
therefore retain the initializer's side effects, and an abrupt later initializer
leaves earlier fields installed. The existing uniform initializer array type
is preserved to avoid the TS-444 mutable-array widening bug.

`build/review-private-field-order-reference.mjs` independently checks these
boundaries in Node, including frozen-object stamping and partial initialization.
All 28 checks pass. They are reference expectations, not Rift acceptance.

The corrected tooling run passes 296/296 tests. Isolated readiness also passes 934/934 Node guests, focused native static-only/zero-dynamic execution, thirteen native regression groups, fifteen tooling builds and sixteen parent-envelope records. Combined canonical acceptance remains pending.
