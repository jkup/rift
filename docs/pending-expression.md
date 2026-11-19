# Pending expression state prerequisite

The host-only probe captures a compound assignment's Reference and left Value,
then completes it in another ScriptSession through the shared binary and
reference operations. Pending state holds data and the operation Realm. It does
not hold an ExecutionEngine, OperationContext, callback closure or permit.

The expected trace proves the key conversion and getter happen once before
suspension. A mutation of the key hook during RHS evaluation does not change the
cached key. A mutation of the captured object's valueOf is observed when the
operator subsequently converts it, and a replacement setter is looked up when
PutValue runs. The original property receiver is preserved.

The second session supplies call dispatch and budget; the captured operation
Realm supplies errors. An abrupt RHS bypasses conversion and writing while
preserving the exact throw record. Symbol conversion and strict write failures
use the captured Realm. A resource stop charges only the resuming session and
clears pending state.

This tests retained operands and references with real guest effects. The guest
AST still executes synchronously within each callback; it does not prove saved
lexical-frame installation, a full expression continuation stack, yield syntax,
finally resumption or iterator cleanup. Those remain separate generator work.

Evidence: test/pending-expression.ts and
build/pending-expression-draft/build/pending-expression-reviewed.json. See
[the context probe](suspension-context.md) and
[the generator boundary](generator-boundary.md).
