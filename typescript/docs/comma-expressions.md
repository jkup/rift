# Comma expressions

TS-139 adds Script comma expressions at the lowest precedence, using existing binary-expression traversal. Evaluation obtains the left value before evaluating the right and returns the right value. This deliberately loses references: a detached method receives no object receiver, typeof does not suppress an unresolved name inside a sequence, and delete evaluates the sequence without deleting its last property.

Arguments, array elements, object values, declarations and conditional arms retain AssignmentExpression boundaries. Parenthesized sequences work within them. for-in accepts an Expression on its right; for-of retains AssignmentExpression. Legacy parsing, eval and destructuring remain unchanged.

References consulted 2026-11-09: ECMAScript [comma operator](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-comma-operator) and V8 [ParseExpressionCoverGrammar](https://github.com/v8/v8/blob/main/src/parsing/parser-base.h). Rift retains the Expression/AssignmentExpression distinction without adding cover-grammar machinery for unsupported arrow/destructuring forms.

Acceptance pending. Initial full Node validation passed 621/627: one lexical-initializer precedence bug and five obsolete comma rejection expectations were corrected before the full native build. Original rejection sources and the initial log remain preserved; corrected Node validation passes 627/627.
