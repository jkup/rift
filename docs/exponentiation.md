# Number exponentiation

TS-122 adds `**` and `**=` to the Script parser and evaluator. BigInt remains
unsupported. The legacy parser retains its previous operator boundary.

Exponentiation binds above multiplication and associates to the right. Unary
and update operands stop above that precedence; an unparenthesized unary base
is rejected, while parenthesized bases and update expressions are accepted.
The lexer recognizes `**=` before `**` and `*=`.

The evaluator uses the existing arithmetic conversion path: evaluate both
operands, obtain their values, then convert left followed by right with the
number hint. Compound assignment retains one reference and its old value across
RHS evaluation and conversion, then writes once. Conversion failures and write
failures preserve their existing Realm and completion behavior.

Number exponentiation uses host `Math.pow`, as the existing Math builtin does.
Literal expected-result tests cover NaN, signed zero, infinities, fractional and
negative exponents on both Node and scriptc. This primitive operation does not
execute guest source in the host engine. Resource limits still bound parsing,
guest coercion hooks and execution.

Sources consulted 2026-11-09:
[Exponentiation grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-exp-operator),
[Number::exponentiate](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-exponentiate),
[ordered numeric operations](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator),
and [V8 parser](https://github.com/v8/v8/blob/main/src/parsing/parser-base.h).
V8 likewise handles right associativity separately and rejects unary bases;
Rift retains its existing precedence parser. No engine source was copied.

The initial full Node run passed 607/609: two historical CLI files now reach
their undefined effect() call instead of rejecting **=. Their sources remain
unchanged and expect the runtime ReferenceError. Added CLI cases verify a
successful compound assignment after effects and unary-base rejection before
effects. Existing legacy-parser operator rejections remain valid.

The initial tooling run passed 289/290. Historical assignment-audit row G4
(42**=7;) now reaches invalid-assignment-target rejection rather than lexical
operator rejection. Its explicit current expectation preserves the frozen record
and keeps exponentiation outside the audit candidate allowlist. No production
change or native rebuild is needed for this expectation migration.

Acceptance: 611/611 guest cases on each host; all 121 native entries pass
static-only build and parsed coverage (7243/7243 statements in this driver).
Corrected tooling passes 290/290; runner 31/31 and ten probes pass. All 225
fixture results agree, with 133 completions including all 132 prior completions
and the exponentiation fixture reporting 12 checks passed.
