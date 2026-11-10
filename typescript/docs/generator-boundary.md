# Generator suspension boundary

TS-196 prerequisite review, 2026-11-10. Generator grammar was unsupported at that checkpoint. TS-213 now admits
generator bodies without yield; suspension within a body remains unsupported.

The pinned compiler can retain a host Generator in a class, yield tagged values
with object identity, and receive/return explicit normal, return and throw
records. The reduced probe passes both hosts with 26 static statements and zero
dynamic coverage. It extends the numeric suspension smoke test; it does not
establish that a suspended Rift evaluation can safely be resumed.

The current evaluator assumes synchronous completion. ExecutionEngine owns the
active Script frame, operation Realm, call/depth counters, source inspection
state and jobs. Statement/call boundaries restore these in finally blocks;
OperationContext helpers and execution permits are tied to that active engine.
A stored host generator closing over an old engine cannot simply be resumed
from a later ScriptSession or a foreign caller. It could retain stale budget,
permission or Realm state even if a small native suspension probe passes.

The next implementation boundary should be a detached Script activation and
explicit resume protocol. Retain record/scope identity, environments, this,
references, pending evaluation operands and pending completion state. Each
resume must install that activation in the current execution context and restore
the caller on yield, completion or fault. Budgets belong to the current resume;
no hidden suspended call depth should charge unrelated callers. Prove this
boundary with ordinary synchronous evaluation before adding yield syntax.

Subsequent slices can add suspended-start/executing/suspended-yield/completed
states, generator object/prototype metadata and next/return/throw dispatch,
then expression/statement continuations. Finally blocks, iterator closing,
per-iteration lexical environments and yield delegation must preserve pending
completion identity and execute side effects once. Async functions and async
generators should build on the same continuation boundary, not a separate
interpreter or a replay of earlier statements.

The original generator corpus includes obsolete phase-2 placeholder commentary
as well as real yield/resume, return-value, loop and destructuring assertions.
Do not implement a completed iterator merely to make the placeholder file
finish. Keep the unchanged corpus and add independent semantic expectations,
including reentrant next, resume from another session/Realm, abrupt resumption,
cleanup that yields, resource stops and suspension inside compound expressions.

Evidence: build/generator-boundary-review/tagged.ts and results.json;
probes/suspension.ts; src/script-execution-internal.ts call, #statement, #list,
ActiveOperationContext and ScriptSession boundaries. No guest feature is
accepted by this note, and host generators remain an implementation option
only after the activation/lifetime constraints are resolved.

TS-205 isolated implementation separates function instantiation from body
execution. PreparedFunctionBody stores the body AST, body frame and function
environment; it stores no engine, operation callbacks, budget or pending permit.
Preparation and execution restore the caller frame/Realm in finally blocks, and
retain the existing abrupt-source capture and derived-constructor behavior.
The draft passes all 697 Node guests and native Script execution/constructor
matrices, including exact setup prefixes and cross-Realm/reentry traces.
This is a synchronous foundation, not a suspension implementation or proof that
pending expression state can be transferred. Next: represent pending evaluation
operands and completions explicitly, and validate resume with current-session
budgets before exposing yield. C++ generator statement-skipping resumption is
not adopted; it cannot establish once-only compound-expression side effects.

TS-210 extracts captured-value binary operations into applyBinaryOperator. It
accepts only operand Values, the current OperationContext and a source location;
no execution engine or frame is retained. Ordinary and compound expressions
share the helper through the existing evaluator method. Evaluation order,
coercion order, exact completions and resource charges are unchanged. The
isolated draft passes 701 Node guests and native numeric-operator, primitive
conversion, compound-assignment and abstract-equality suites with zero dynamic
coverage. This prepares a reusable value-operation boundary; it does not itself
save pending operands or suspend a guest expression.

TS-211 moves reference data and Get/Put/Delete/receiver operations into
shared semantic helpers. References retain strictness, receiver and the existing
successful key cache; the current OperationContext supplies dispatch and errors.
The isolated draft passes 701 Node guests and native optional-chain, super,
delete and both for-update runtime variants with zero dynamic coverage. This
removes an engine dependency from retained reference operations without changing
key-conversion timing or claiming resumable AST evaluation.

TS-213 implements suspended-start generator activation retention and execution
in a later ScriptSession. The prepared body executes through the existing Script
statement evaluator with its saved lexical/source frame installed in the current
engine. Parameters run at call time; the body runs on first next. Current budgets,
caller cleanup and captured-body error provenance pass both hosts, including host
faults. No AST continuation survives a yield yet. See [generator start](generator-start.md)
for the admitted boundary and the remaining suspended-yield work.
