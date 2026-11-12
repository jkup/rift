# Strict reserved identifier review

TS-495, 2026-11-12. Independent Node syntax checks cover seven names:
implements, interface, package, private, protected, public and static. Each is
checked in sixteen contexts under strict and sloppy Script code. All 224 expected
syntax outcomes match Node: 112 valid, 112 invalid. Rift currently prepares the
28 property-name/method-name neighbors, rejects the other 84 valid sloppy cases
as unsupported, and accepts none of the invalid cases.

The [Identifier early errors](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-identifiers-static-semantics-early-errors)
restrict these names in strict code. The [lexical grammar discussion](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-keywords-and-reserved-words)
distinguishes unconditional reserved words from contextual names. Property names
remain valid. Parameters inherit a function body's use-strict directive, and
class static blocks are strict even inside sloppy Scripts.

The parser's single RESERVED string currently excludes these names at binding,
reference, arrow-parameter and shorthand sites before declaration planning can
apply scope strictness. The planner's restrictedBinding check only handles eval
and arguments, whose rules differ from reserved identifiers. Merely adding seven
names there would miss references and labels; merely loosening the parser would
admit invalid strict programs. Function/class names and inherited strictness also
need explicit review.

Implement valid sloppy identifiers and strict validation together in a subsequent
isolated task. Reuse the existing scope strictness analysis, collect real
identifier uses rather than scanning every word token, and preserve property
names. Cover var/let/const, references, parameters/arrows, function names,
patterns/shorthand, catch bindings, labels and labelled jumps, own/inherited
strictness, class contexts, and unchanged U03 bytes. Certify only after complete
supported-source analysis; unsupported syntax and resource limits remain explicit.
Keep contextual let/yield/await and escaped-identifier support separate.

This is a diagnostic review, not native acceptance or Test262 admission. Sources,
expected validity, Node subprocess results and Rift preparation outcomes are
retained under build/strict-reserved-identifier-review/results.json. The independent
reference runs node --check; no guest execution is delegated from Rift to Node.
