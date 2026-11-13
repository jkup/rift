# Remaining declaration contexts

TS-542 reviewed twelve small Scripts against explicit expected output. Node
reference processes execute separate `.cjs` files. Both Rift hosts agree on all
outcomes; the native CLI has verified static coverage, executable hashes and
engine sources matching the current unscopables candidate.

| Context | Current Rift result |
| --- | --- |
| Identifier `var` list | Expected output |
| Ordinary and arrow formal patterns | Expected output |
| Identifier `let` and `const` lists | Parse rejection |
| Pattern-first and identifier-first mixed lexical lists | Parse rejection |
| Pattern-first `var` list | Parse rejection |
| Classic-for lexical list and binding pattern | Parse rejection |
| Catch pattern and optional catch parameter | Parse rejection |

The reference programs and raw process results are retained in
`build/declaration-context-review/`. These controls identify boundaries; they do
not establish comprehensive conformance or change the 225-file corpus score.

The current C++ parser's `parse_variable_declaration` contains a list path for
identifier-first declarations, including later binding patterns. A pattern-first
declaration takes a separate early return. This is source evidence, not a claim
that a particular C++ binary passes these controls. Its catch parser explicitly
requires one identifier, so catch patterns and optional bindings are shared gaps.

The next implementation should represent a declaration's ordered declarators
explicitly and reuse existing binding initialization. Do not introduce a block
scope or execute by rewriting guest source. All lexical names must be available
to declaration planning before any initializer executes. Preserve left-to-right
initialization, TDZ, abrupt completion, inferred function names, original source
locations, and traversal of expressions inside patterns. Existing generator and
async machinery must resume each initializer without repeating earlier work.
Classic-for declarations additionally need per-iteration binding treatment and
should receive a separate follow-up using the shared representation.

The remaining TS-152 work is declaration lists, classic-for patterns and catch
patterns. Formal patterns are already accepted under TS-230/231; the older task
paragraphs are historical checkpoints.

Reference: [ECMAScript 2025 lexical declaration evaluation](https://262.ecma-international.org/16.0/#sec-let-and-const-declarations-runtime-semantics-evaluation).
