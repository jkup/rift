# Native harness performance investigation

TS-448, 2026-11-11. Publication is held pending a fix and fresh acceptance.

The zoned milestone's native suite completed 913/917 twice. Both input variants
of harness-errors-b and harness-map-default exceeded the unchanged 10-second
limit. The second run started after all competing builds/tooling terminated,
so contention does not explain the recurring failure. Both reports and logs
are retained as temporal-zoned-native-contended* and
 temporal-zoned-native-isolated-timeouts* under build/.

A separate diagnostic permits up to 120 seconds to measure completion; it does
not count as an acceptance pass. With input-a, every expected output byte was
preserved:

| Driver | Node | Native |
| --- | ---: | ---: |
| harness-errors-b | 3,906 ms | 10,831 ms |
| harness-map-default | 3,021 ms | 10,485 ms |

Evidence: build/native-harness-performance/current.json, including output
chunks and arrival times, and build/measure-native-harness.mjs. These are single
measurements on this machine, not a general benchmark.

Descriptor validation currently creates a temporary two-element array on each
call solely to check getter/setter values. An isolated candidate replaces that
loop with two calls to the same predicate. It preserves mixed-descriptor checks,
accepted endpoint types and error messages, and changes no Realm sharing or
property storage policy. Typechecking passes; native comparison and regressions
are pending. Do not assume this allocation explains the full regression before
measuring it.

Matched baseline and candidate harness builds plus descriptor/array/accessor
regressions are being prepared under build/descriptor-validation-draft/ and
build/native-harness-performance/. Canonical runtime remains unchanged. Any
accepted runtime fix requires fresh combined native/guest/tooling validation;
the earlier build matrix cannot certify changed runtime code. Do not relax
timeouts, remove assertions or reclassify timeouts as successes.
