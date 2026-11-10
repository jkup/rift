# Direct yield expression receivers

A direct yield expression can initialize one var/let/const binding, supply a
return value, or stand alone in parentheses. The continuation retains a small
receiver record: a captured var reference, lexical binding/environment, return,
or no receiver. Normal next values complete that receiver in the current frame;
abrupt resumes discard it and follow the usual unwind path.

Yield-star completion values use the same receiver. Its delegated return remains
an abrupt outer return and does not initialize a pending binding. Operand effects
run once; lexical bindings stay uninitialized during suspension, and var writes
retain the reference resolved before operand evaluation. No old engine or context
is captured.

The parser admits only these direct expression roots and skips admission traversal
when a function contains no yields. Nested arithmetic, assignment, call and
multi-declarator suspension remain blocked until their pending operations exist.

Tests cover received values, TDZ, closures, inferred-name boundaries, delegation
results, catch/finally interactions and cross-session binding identity. The
unchanged original generator-test.js passes all 88 checks on both Node and native
Rift; four other original generator fixtures also match. Snapshot hashes and
static coverage evidence are in build/original-generators-reviewed.json in the
isolated draft. The complete Node lane passes 712/712 without skips.
TS-223 adds for-of continuation records and iterator cleanup during unwinding;
see [generator for-of iteration](generator-for-of.md).
