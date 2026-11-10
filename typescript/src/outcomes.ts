// Provenance is independent of human diagnostic text. Reserved syntax rules do not emit.
export type Guard = "source-units" | "parse-depth" | "steps" | "calls" | "evaluation-depth";
export type SyntaxCapability =
    | "lex.indeterminate-comment"
    | "lex.leading-zero"
    | "lex.numeric-literal"
    | "lex.indeterminate-string-newline"
    | "lex.string-escape"
    | "lex.indeterminate-string-end"
    | "lex.operator"
    | "lex.character"
    | "lex.regexp-literal"
    | "parse.regexp-pattern"
    | "parse.expected-token"
    | "parse.binding-identifier"
    | "parse.duplicate-binding"
    | "parse.declaration-statement"
    | "parse.return-context"
    | "parse.line-terminator"
    | "parse.throw-expression"
    | "parse.loop-context"
    | "parse.duplicate-parameter"
    | "parse.property-name"
    | "parse.assignment-target"
    | "parse.delete-identifier"
    | "parse.array-spread"
    | "parse.object-key"
    | "parse.prototype-literal"
    | "parse.unexpected";
export type RuntimeCapability = "runtime.regexp-pattern" | "runtime.object-to-number" | "runtime.object-to-string" | "runtime.map-species" | "runtime.splice-species" | "runtime.json-reviver" | "runtime.slice-species" | "runtime.concat-species" | "runtime.filter-species" | "runtime.flat-species" | "runtime.flatmap-species" | "runtime.dynamic-function-source" | "runtime.eval-source";
export type SyntaxRule = "regexp-literal" | "numeric-separator" | "assignment-target" | "lexical-declaration-statement" | "return-outside-function" | "duplicate-strict-parameter" | "duplicate-block-lexical-function";
export type ResourceOrigin = { readonly kind: "resource-limit"; readonly guardCode: Guard; readonly count: number; readonly limit: number };
export type Rejection =
    | { readonly kind: "unsupported-syntax"; readonly capabilityCode: SyntaxCapability }
    | { readonly kind: "syntax-error"; readonly ruleCode: SyntaxRule }
    | ResourceOrigin;
export type ThrowOrigin =
    | { readonly kind: "guest" }
    | { readonly kind: "engine-diagnostic" }
    | { readonly kind: "unsupported-operation"; readonly capabilityCode: RuntimeCapability }
    | ResourceOrigin;
