# Private brand check review

TS-467, 2026-11-11. Implementation and acceptance remain pending.

`#name in object` checks the receiver's own private entry for the lexically
resolved identity. It does not invoke an accessor, convert a property key or
walk the prototype chain. A field can be absent during its initializer or after
partial initialization, while private methods are already installed.

Evaluate the right operand and obtain its value before rejecting primitives
with TypeError. Resolve the private identity afterward. Ordinary and suspended
evaluation should share this final operation, using the existing `privateHas`
backend. The suspended frame only needs the expression; the active frame
already retains the private environment.

The grammar gives the right operand shift-expression precedence. Parentheses
cannot turn a private name into an ordinary expression, and the parser's
`allowIn` boundary must remain intact. See the specification's
[relational grammar and evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-relational-operators-runtime-semantics-evaluation).

The independent Node reference run passes 22 semantic and eight syntax checks:
`build/review-private-brand-reference.mjs` and `build/private-brand-reference.json`.
They cover identity, shadowing, own storage, accessor non-invocation, partial
initialization, frozen-object stamping, direct eval, suspension and precedence.
These results establish expectations; they are not Rift acceptance. Add async,
foreign-Realm error and budget/restoration tests during implementation. Preserve
all historical fixture source strings when migrating unsupported expectations.
