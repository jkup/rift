# JSON scanner allocation measurement

TS-193, scriptc 0.4.7 on Windows x64, 2026-11-10. No production change.
The suspected cost of repeated character concatenation did not justify replacing
this scanner. A direct JSONParser benchmark checked exact output and tick counts
for plain and escaped strings, with three native runs at each size.

| Repetitions of the three-unit decoded payload | Plain median (ms) | Escaped median (ms) |
| --- | ---: | ---: |
| 2,500 | 0 | 0 |
| 10,000 | 1 | 1 |
| 40,000 | 4 | 4 |
| 160,000 | 16 | 16 |

The largest plain input contains 480,000 payload code units; the escaped input
contains 640,000 source units and decodes to 480,000. Millisecond resolution
makes the small rows approximate. This bounded experiment shows roughly linear
scaling, not a general performance guarantee or evidence about other hosts.
Node timings are retained separately and vary with warmup.

The reviewed benchmark passes static-only compilation and parsed zero-dynamic
coverage. Its initial throwing mock callback inferred a never return and caused
one dynamic adapter; an explicit ValueCompletion return type corrected the
benchmark without changing the parser. Both initial reports are retained.
The scanner implementation and operation budget remain unchanged.

Evidence: build/json-string-draft/build/benchmark.ts, benchmark-reviewed.json,
benchmark-node.log, benchmark-initial.json and benchmark-initial-dynamic.json.
