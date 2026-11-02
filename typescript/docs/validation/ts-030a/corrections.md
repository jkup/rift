# TS-030A retained corrections

The frozen 178-row matrix required no oracle adjustments. All resource counts,
locations, values and ordering expectations pass as frozen.

The first full Node run was 210/211: a newly authored CLI fixture expectation
mistakenly called a guest throw `Throw` at column62. Source inspection of the
literal fixture puts `throw` at column50; evaluator.statement constructs the
existing `Uncaught` diagnostic at the statement location. The corrected new
record is `1:50: runtime Uncaught: sentinel`. The original run and record are in
node-initial.log and initial-node-results.json. No prior oracle was altered.

The initial sandboxed native attempt could not access the installed Zig
libraries. native-initial.log retains the interrupted attempt. Elevated native
builds used the same pinned compiler and Zig installation.

The next build compiled the driver static-only, but the separately parsed
coverage gate correctly rejected three dynamic statements. Full evidence:
native-dynamic-failure.log, initial-native-build-results.json, and
dynamic-explanation.log. Two statements came from the two nested operator
indexing expressions. The remaining statement was a shared callback adapter.
The minimal before/after reductions live in reductions/, with complete
static-only builds, coverage and executions in results.json (both hosts match
literal expected stdout). The fixes are test-only: `operators[i].slice(0, 1)`
and all four parameters of the existing Builtin signature. An explicit return
type alone did not eliminate the adapter; coverage-after.log retains that
attempt. coverage-full-signature.log shows the shared adapter moving to the
next incomplete callback. No compiler pins, runtime helpers or guards changed.

The final ordinary coverage gate reports zero dynamic statements. The optional
explanation additionally names a class-properties metadata function with zero
statements; it is not a rejected tier statement. Acceptance uses the same
fail-closed parser as every prior gate, without relaxing its rules.
