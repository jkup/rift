# Private class syntax prerequisite

TS-461 adds a structural private-syntax audit to the shared parser. It does not
admit private syntax to executable Script preparation or legacy execution.
`auditPrivateClassSyntax` retains no executable nodes. Its `valid` result means
the bounded grammar parsed and the private-name checks passed, not that every
ECMAScript early error has been checked. Unsupported grammar and resource limits
remain `blocked`; private declaration/use errors are separate `invalid` evidence.
No new serialized syntax-error provenance is emitted by this prerequisite.

Private names have explicit AST nodes, distinct from literal property keys.
Only class keys and private member positions accept those nodes. Private `in`
has its own expression node and is parsed at relational precedence; its right
operand is a ShiftExpression. Ordinary expression, declaration and suspension
visitors account for the added shape. Reaching it in execution is an invariant
failure because normal preparation cannot admit it.

Each class body opens a lexical private scope after parsing its heritage.
Declarations are collected before resolving uses, including uses in nested
classes and functions. This permits forward references without confusing a
nested class's heritage with its own declarations. Duplicate fields/methods and
mixed static/instance declarations are invalid; one getter/setter pair with
matching staticness is allowed. `#constructor`, unresolved names and deletion
of private references are rejected. Names use decoded lexer spelling without
normalization. Source spans remain UTF-16 offsets.

The parser's full-source lexical and grammar failures take precedence over
private validation. Invalid grammar such as `super.#x`, bare private names and
private names in arithmetic operands remains blocked rather than being promoted
to a certified early error. Direct eval with inherited private environments is
still outside this source-only audit.

The design follows the reviewed engine262 separation in
`class-private-elements-review.md` and the specification's
[class early errors](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions-static-semantics-early-errors)
and [relational grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-relational-operators).
The independent Node `--check` reference run covers 127 sources, including all
pairs of seven declaration forms and relational precedence controls. Evidence:
`build/private-class-reference.json`. Isolated validation passes 931 Node guests, seven both-host regression groups,
15 native tooling builds and 295 tooling tests. Combined canonical acceptance remains pending.

A separate 32-source edge review exposed an existing public class parser error:
`get` or `set` followed by a newline and a property name was split into fields.
The property name continues an accessor definition, so ASI cannot split the
earlier prefix. The fix recognizes accessor keys before looking for `(` and
removes the fallback. Two existing TypeScript test inputs now assert rejection
with their exact source strings preserved. Controls retain legitimate field
termination before `}` or a generator method. Original parser/test sources and
all initial results remain in `build/private-class-before-accessor-fix/`;
`build/private-class-edge-reference.json` records the corrected 32-case review.
The [ASI rule](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-rules-of-automatic-semicolon-insertion)
and Node references support this correction. C++ fixtures are unchanged.

