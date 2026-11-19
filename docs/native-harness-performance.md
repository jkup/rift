# Native harness performance regression

TS-448, 2026-11-11. The fix passes isolated validation; fresh combined acceptance
is still required before publication.

The zoned native suite completed 913/917 twice. Both input variants of
harness-errors-b and harness-map-default exceeded the existing 10-second limit,
including a rerun with no competing builds or tooling. Reports remain under
build/temporal-zoned-native-contended* and
build/temporal-zoned-native-isolated-timeouts*.

Descriptor validation allocated a temporary two-element array solely to check
getter/setter endpoints. The fix uses a shared predicate directly and returns
after the mixed-descriptor guard when neither accessor is present. It changes
no endpoint rules, error messages, Realm sharing or property storage policy.

Sequential native comparisons against the same feature baseline preserve every
expected output byte:

| Driver/input | Baseline | Final candidate |
| --- | ---: | ---: |
| harness-errors-b/input-a | 10,912 ms | 8,927 ms |
| harness-errors-b/input-b | 11,226 ms | 8,793 ms |
| harness-map-default/input-a | 10,743 ms | 8,674 ms |
| harness-map-default/input-b | 10,737 ms | 8,632 ms |

These single-machine measurements show roughly 18–22% improvement. Diagnostic
runs allow 120 seconds to measure the failing baseline; they do not replace the
unchanged 10-second acceptance gate. The earlier array-removal-only candidate
and its measurements are retained separately.

The final candidate passes typechecking, 923/923 Node guests, five static-only
native builds with parsed zero-dynamic coverage, and descriptor/array/accessor
regressions on both hosts. The accessor control initially lacked its required
fixture argument; that invocation failure is retained and the corrected control
passes. The first full Node launch also lacked copied historical fixture files;
those were restored before the successful full run. No assertion was removed.

Evidence: build/native-harness-performance/{comparison,fast-path-builds}.json,
individual regression reports, build/descriptor-validation-node.log and the
isolated build/descriptor-validation-draft/. Canonical runtime changes require
fresh combined native/guest/tooling checks; earlier binaries cannot certify them.
