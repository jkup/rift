# Generator for loops

Ordinary and lexical for statements schedule a continuation after initialization.
The record retains the loop AST, outer environment, current iteration frame and
first-iteration flag. A resumed body finishes before cloning let bindings,
performing the update and testing the next iteration. Continue enters that same
next-iteration path; break discards it.

The synchronous evaluator and generator driver share prepareForIteration for
binding cloning, update and test evaluation. This preserves initializer-closure
identity, per-iteration let cells, shared var cells, const behavior and abrupt
update/test ordering without maintaining two copies of the algorithm.

Tests assert initializer/test/update/body traces, closure mutation, nested loops,
break/continue, abrupt resumes, failed updates, direct eval and foreign-session
iteration cells. Iterator loops, labelled suspension, cleanup scopes and yield
inside expressions remain unsupported. The original infinite-for rejection input
is retained as a positive first-yield/return case.

This builds on [generator loop records](generator-loops.md) and the same explicit
completion and current-context invariants.
The first native for-loop check exposed the documented SC2003 completion-union
narrowing boundary. An explicit ThrowCompletion local, matching existing engine
call sites, resolves it without changing runtime semantics. The initial report
is retained as build/generator-for-initial.json alongside the passing report.
