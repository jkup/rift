# Const declarations and immutable bindings

TS-120 adds ordinary single-identifier const declarations to Script execution.
An initializer is required. Declaration plans retain const as its own kind and
include it in lexical-name conflict checks. Global, function, block and switch
instantiation create an uninitialized immutable binding; executing the declaration
evaluates its initializer before initializing that binding exactly once.

Local and global binding records now carry mutability. Reads and writes check
initialization first, preserving ReferenceError during the temporal dead zone.
Later assignments to const bindings throw TypeError in both strict and sloppy
code. This represents strict immutable bindings used by const; it does not add
the silently failing immutable bindings needed for named function expressions.
The binding is immutable, not its object value. Writes preserve ordinary RHS and
numeric-coercion effects before the final failed store.

The same source retains function-name inference, closure capture, Realm ownership
and setup/initializer budgets. Global const bindings are not global-object
properties and remain visible to later scripts in that Realm. A failed initializer
leaves its binding uninitialized. Cross-script conflicts use existing declaration
instantiation checks before executing the body.

Legacy parsing remains unchanged. Multiple lexical declarations, destructuring
and lexical loop heads remain unsupported. The existing closed syntax-error
classification is not widened: malformed/unsupported const forms conservatively
use existing parse capability rejections.
In bare Statement positions, const retains its existing parse.unexpected
rejection. The frozen lexical-statement audit caught an initial change to that
code; the correction preserves this boundary without widening its let-only
syntax-error certification.

Historical tests retain their sources and case counts. Newly valid const tails
now prepare/execute, or reveal pre-existing duplicate-binding/strict-delete errors;
they no longer assert that const itself is unsupported.
Seven declaration-plan snapshots have explicit current expectations in
`tools/test262/test-support/const-plan-migrations.mjs`. The original 135 records
and 71 literal plans remain unchanged and checked. A malformed-const CLI case
continues to verify that parsing rejects the whole input before any output.
The lexical-statement audit also has six explicit migrations: two valid const
lists contain no candidates, and four valid const tails allow the existing let
statement-position rule to be certified. Const itself remains excluded from
that certification.

Sources consulted 2026-11-09:
[Declarative Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-declarative-environment-records),
[Global Environment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-global-environment-records),
and [V8 BuildVariableAssignment](https://github.com/v8/v8/blob/main/src/interpreter/bytecode-generator.cc).
The implementation follows initialization-before-mutability checks and separates
initialization from assignment. No engine source was copied.
