# Suspended for-loop tests

For-loop iteration preparation now finishes before evaluating its test. A
continuation saves the resulting environment and first-iteration state before
the test suspends. Resuming uses the existing loop-test receiver, which starts
the body or exits without repeating the update or creating another environment.
Ordinary for loops use the same separated preparation and test operations.

Tests cover var/let/const bindings, per-iteration closures, update order, continue,
labels, break, throw/return interruption, nested expressions and async conditions.
The original rejected for-test input is preserved as a positive execution check.
Initializer and update suspension remain separate features. Evidence stays under
ignored build/generator-for-test-* paths; combined canonical validation remains
required before acceptance.
The native return boundary uses an explicit ThrowCompletion arm binding, matching
the existing SC2003 workaround. Initial build and regression-driver failures are
retained alongside the passing reports in the ignored draft build directory.
