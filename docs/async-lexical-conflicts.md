# Duplicate async and generator declarations

The Annex B duplicate-function exception applies only when every declaration of
the name is an ordinary FunctionDeclaration. Async and generator declarations
make a repeated lexical name an early error, even in sloppy blocks or switches.

The collector gathers non-legacy function names before applying the existing
unsupported ordinary-duplicate boundary. Those names reach the existing lexical
conflict path, so eval produces a catchable SyntaxError without executing source.
Strict conflicts, unsupported syntax/resource vetoes and var-scoped duplicate
function behavior remain covered by the existing preparation paths.

Focused tests cover both declaration orders, strict/sloppy blocks and switches,
mixed triples, inert preparation, eval and unrelated unsupported syntax. The
unchanged switch-scope-test.js now completes all seven reported checks.

See [ECMA-262 2025 Annex B.3.2.4](https://262.ecma-international.org/16.0/#sec-block-level-function-declarations-web-legacy-compatibility-semantics-changes-to-block-static-semantics-early-errors)
and its adjacent switch early-error rules.
