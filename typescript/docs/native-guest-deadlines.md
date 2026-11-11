# Native harness deadlines

TS-473, 2026-11-11. The private-field suite initially passed 930/934 cases.
Both inputs of harness-errors-b and harness-map-default exceeded the common
10-second process deadline. All four completed with exact expected output when
run separately under a diagnostic 60-second ceiling.

The accepted Unicode source was restored from Git and retained files, with all
929 input hashes checked against its original snapshot. Its two drivers passed
static compilation and coverage. Alternating baseline/current measurements gave:

| Driver/input | Accepted Unicode | Private fields |
| --- | ---: | ---: |
| harness-errors-b/input-a | 10,610 ms | 10,795 ms |
| harness-errors-b/input-b | 10,434 ms | 10,663 ms |
| harness-map-default/input-a | 10,609 ms | 10,140 ms |
| harness-map-default/input-b | 10,167 ms | 10,057 ms |

Both versions exceed the old deadline on this machine. These measurements do not
establish a performance benchmark, but show that the existing limit lacks room
for ordinary variation. Only these two heavy drivers now receive 30 seconds.
Other cases retain 10 seconds. Expected transcripts, statuses, fixture inputs and
timeout classification are unchanged; selected deadlines are recorded in results.

Original failures remain in `build/private-field-rollup-initial-timeouts*`.
Measurements are in `build/private-field-timeout-measurement.json` and
`build/private-field-timeout-baseline-comparison.json`. The runner-only source
adjustment is recorded separately from the unchanged compiled-input snapshot in
`build/private-field-rollup-harness-adjustment.json`. Both complete guest suites and tooling pass with the reviewed driver deadlines. The storage interruption has its own retained native log.
