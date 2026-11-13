# Legacy function Statement review

TS-546 compares fifteen independently specified controls against the frozen,
reviewed declaration-list Node and native hosts. Both agree: one existing braced
control passes, eight valid unbraced conditional/labelled cases reject, and six
invalid cases reject. Raw programs, process results and native executable/gate
hashes are in build/legacy-function-context-reviewed/.

An initial expectation incorrectly assumed that a conditional function would
replace a same-named formal parameter. Node returns the original parameter type;
Annex B.3.2.1 explicitly excludes parameter names. The corrected control expects
number. The initial failed review remains in build/legacy-function-context-review/.

C++ parse_if_statement and parse_labeled_statement accept a general statement
body; their evaluators execute that child. These are source-level support paths,
not proof of correct hoisting, strictness or Annex B behavior. Its with parser
always throws unsupported after parsing the body, despite a comment describing
a later runtime failure; with execution is a shared gap.

The next bounded work should separate conditional functions from labelled ones.
For ordinary conditional declarations, model the synthetic block required by
[Annex B.3.3](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-functiondeclarations-in-ifstatement-statement-clauses)
while retaining original source spans and existing legacy block-function copy
rules. Preserve lexical and parameter vetoes, unexecuted branches and strict
rejection. Do not fabricate brace tokens to satisfy the block association checks.

[Annex B.3.1](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-labelled-function-declarations)
allows labelled ordinary functions in sloppy code, but conditional and iteration
Statement slots still reject labelled functions. Labelled async/generator forms
remain invalid. Cover nested labels, declaration ownership and early errors
before admitting this separate grammar path. Neither feature is implemented by
this review; classic-for validation remains the immediate implementation priority.
