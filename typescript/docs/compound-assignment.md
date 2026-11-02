# Arithmetic compound assignment design (TS-030P)

Design for independent review, 2026-11-02; baseline `5169978`, inspected
`fae6ef9`. Nothing here claims implemented support. Admission is exactly `+=`,
`-=`, `*=`, `/=`, `%=` in the existing strict-write profile, using represented
Values and existing arithmetic. No BigInt, updates, logical assignments,
exponentiation, bitwise/shift assignments, destructuring, accessors, proxies,
new binary operators or built-ins. Full strict Script semantics remain unclaimed.

## Representation and parser

Keep `assign` unchanged for `=`. Add one Expr arm `compound` with `loc`, `target`,
`value`, and `op: "+" | "-" | "*" | "/" | "%"`. The op is the binary operation;
the parser maps the five admitted tokens explicitly. This separate arm makes
the additional read visible and avoids changing existing hand-built assign ASTs.
No lowering to `x = x + y`: that duplicates reference evaluation and key hooks.
No synthetic binary node: it would charge a fictional evaluate tick/frame.

In lexer.ts remove only the five two-character tokens from the rejection list
and admit them in the existing two-character punctuator branch. Comments retain
priority over slash tokens; triple equality retains priority. Keep `**` rejected
before a possible `*=` suffix. Do not consume whitespace/comments inside a token.
Retain the current diagnostics for unsupported longer families (`**=`, `>>>=`,
`&&=`, etc.); general punctuator cleanup is outside this change.

In parser.ts give all six assignment forms precedence 1, parse their RHS at 1
(right associative), and require the same identifier/member target check.
Conditional arms and array elements already parse at 1; other productions need
no expansion. Parentheses continue returning the enclosed Expr. Preserve the
current expression-start location convention, including outer parenthesis
locations on compound nodes and inner locations on preserved member targets.
Token start/end offsets remain UTF-16 offsets; retained function source is raw.

## Evaluation invariant

Inside the normally guarded compound expression arm:

1. `reference(target, env, receiver)` exactly once; propagate abrupt completion.
2. `getValue(ref, context, expr.loc)` exactly once; retain its Value.
3. `evaluate(value, env, receiver)` exactly once; retain its Value.
4. `binary(op, oldValue, rhsValue, expr.loc)`; propagate non-normal completion.
5. `putValue(ref, result.value, context, expr.loc)` exactly once; return it.

These are existing helper contracts. In particular PutValue already returns the
computed Value on success. Keep clear local variables and early returns. Do not
reevaluate the target, resolve its binding again, reread its value, reconvert an
object key, or wrap a captured Value in an evaluated literal.

For a member, reference() evaluates base then raw key. GetValue boxes before
key conversion, stores a successful string/symbol Value key before internalGet,
and preserves the original base Receiver. PutValue boxes afresh, uses that saved
key without a second object hook, and passes the same original Receiver to
internalSet. There is no cached wrapper or cached property descriptor. Each
primitive successful read followed by attempted write has two distinct wrappers;
neither receives an own write. Nullish bases fail during Get before RHS, but
after raw key evaluation. Failed conversion leaves the raw key on direct refs;
successful conversion survives a dispatch failure. No runtime helper change is
needed for these properties.

Capture means Value identity, not deep copy. RHS can mutate the old object's
conversion methods, which are consulted later; replacing the binding/property
does not replace the captured old Value. Likewise deleting or freezing the target
can affect Put without undoing RHS/coercion side effects. An outer lexical
reference remains tied to its resolved Environment even if the RHS executes in
a different scope. Missing/TDZ bindings fail in Get before RHS; an initialized
immutable binding is read, then RHS and arithmetic run, and only Put rejects.
Use host-seeded immutable bindings; this task does not add `const` syntax.

The binary helper preserves `+=` default-hint conversion of both operands before
string/number choice. The other four use number hint and finish the left numeric
conversion before converting the right. Thus a left symbol with a right object
still runs the right hook for `+=`, but suppresses it for the numeric operators.
RHS evaluation errors precede all operand conversion. Conversion errors precede
strict-write rejection, including primitive, readonly and nonextensible targets.
Array length/index writes retain existing definition dispatch and partial-shrink
effects. Result values are primitive, so Array length's two conversions must not
rerun operand hooks. No new Number formatter or Symbol facility is implied.

No catch/rethrow layer is added. Existing evaluate/statement/call finally paths
restore depth, call count and active Realm for guest throws and host faults.
Hooks execute in their defining Realm; property boxing resumes in the caller
Realm after the hook. Host observer subclasses are test instrumentation, not
guest accessor/proxy support. Observe original Receiver on both Get and Set.

## Locations and resource contract

Get's ToObject/key errors use `ref.loc`; its dispatch receives `expr.loc`.
Binding errors, operand conversion, Put false translation and Array definition
errors use `expr.loc`. Child expression errors keep the child's location.
Existing guest throw completions and host exception identity are untouched.
The new node costs one normal evaluate tick/frame, just as simple assignment.
reference(), GetValue and PutValue add no generic ticks; conversion helper
lookups and actual child evaluation retain their existing charges. Call of an
identifier/member uses reference/GetValue, not evaluate(callee). No extra tick
is authorized for a callee reference, final member target, arithmetic helper,
saved key or internal dispatch. See the literal [resource matrix](validation/ts-030p/matrix.md).

## Evidence and implementation acceptance

The [evidence/migration ledger](validation/ts-030p/README.md) records fixed-edition
specification and revision-pinned engine inspection. The matrices are independent
expected results derived from those semantics and the current source; they are
not runtime measurements. New runtime validation is for the implementation task.
Any contradictory oracle must be reported with a reduction before changing it.

Implementation must retain all 203 baseline case names and 31 native gates,
with only the enumerated obsolete migrations; preserve historical evidence.
Add a readable dedicated host driver and guest fixtures, covering every named
row and explicit variant on Node-hosted and native Rift, actual constructor
default64 recursion, small limits and seeded cleanup. Require typecheck,
runner20, probes10, rebuilt full suites, static-only builds and independently
parsed zero-dynamic coverage. Audit baseline fixture and expected-record diffs.
Compiler failures require retained reductions, not speculative workarounds.
No main merge, successor or self-acceptance is authorized by this document.
