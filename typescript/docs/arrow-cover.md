# Parenthesized arrow parameters

The parser reads parenthesized expressions once, then interprets them as the currently supported parameter list when followed by an arrow. It no longer scans tokens ahead to find a matching parenthesis. This is needed before regex literal admission: parentheses inside a regex body are not JavaScript grouping tokens.

Cover entries retain their first token and expression. An identifier is a simple parameter; an assignment to an unparenthesized identifier supplies a default. A final rest entry must remain an identifier without a default or trailing comma. Duplicate names and non-simple strict directives retain their checks. Destructured parameters remain unsupported.

Without an arrow, entries form the original comma expression and receive the parenthesized marker used by assignment and precedence checks. Empty lists, rest entries and trailing commas cannot become ordinary parenthesized expressions. The enclosing expression controls whether an unparenthesized arrow is permitted at its precedence. Arrow bodies share the existing lexical-context, source-range and declaration handling.

This follows [ECMAScript 2025 arrow definitions](https://262.ecma-international.org/16.0/#sec-arrow-function-definitions) and the cover-grammar approach reviewed in [engine262 ExpressionParser at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/parser/ExpressionParser.mts). No implementation code was copied.

Focused both-host checks pass at 11048 static statements, zero dynamic. The existing 341 fixture sources produce identical results in nine parser/plan/audit APIs, totaling 3069 exact comparisons. Focused tests retain defaults, rest, evaluation timing, source text, lexical super/new.target, comma expressions and rejection boundaries. Full canonical acceptance follows integration.
