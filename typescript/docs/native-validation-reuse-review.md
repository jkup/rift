# Native validation reuse review

TS-554 is a read-only comparison of the accepted conditional-function snapshot
and the frozen labelled-function/optional-catch snapshot. No results were reused,
no compiler workers were added, and the current 480-gate run is unchanged.

The installed TypeScript compiler's successful --noEmit --traceResolution run
provided 4,777 module-resolution records. The review follows local imports,
including type dependencies, and compares their bytes against both snapshots.
Of 480 entry points, 427 reach changed source and 53 have unchanged local source
closures. All 53 have a passing predecessor gate and recorded executable hash.
No relative import was unresolved. This is a candidate inventory, not cache
acceptance: TypeScript's resolution trace does not establish scriptc's complete
build inputs or prove the absence of generated/external dependencies.

The 53 candidates are mostly isolated calendar, numeric and parsing helpers.
Their count does not measure saved build time. Existing per-entry process records
contain exit status/output but no durations. Whole-stage time also includes worker
scheduling and cache state, so it cannot supply a defensible per-entry estimate.

Before implementing reuse, record per-entry build/coverage durations and prove a
cache key includes the pinned compiler/linker binaries, build flags, resolution
configuration, full source/type/generated inputs and relevant environment. Retain
immutable binaries and raw static-only/zero-dynamic evidence; the shared build/native
output directory is overwritten by later runs. Revalidate executable hashes and
rerun semantic tests on the current fixtures in their original isolated processes.
Unknown dependencies must force a rebuild. Never infer reuse from an entry file's
hash alone.

Keep the current combined-milestone approach. It already avoids an extra full
canonical run without reducing coverage. Evaluate further reuse only after timing
evidence shows useful savings; the current review does not authorize a cache or
relax fresh validation requirements.

Evidence: build/native-reuse-review/{reviewed,entries,graph}.json and resolution.log.
The first review script used the old TypeScript parser API, which is not exported
by the installed package; the successful compiler trace replaced that attempt.

TS-561 measured the completed TS-560 compiler stage: all 484 entries passed on
their first attempt, in 9,107,498 ms (about 2 hours 32 minutes) with four workers.
Summed subprocess elapsed time was 30,745,361 ms for builds and 5,535,481 ms for
coverage, approximately 85% and 15% of the total. These overlapping durations
include worker contention; they are neither CPU time nor isolated benchmarks.
The slowest combined entry was `test/regexp-literals.ts` at 90,861 ms. The runner
removed 30,852,948,152 bytes of regenerable LLVM output after successful checks.

The independent timing review verifies all executable hashes and finite,
nonnegative build/coverage durations. Evidence is retained in
`build/pattern-cohort-rollup-timings-reviewed.json`, including hashes of the
source snapshot, final results and complete attempt log. This measures validation
cost; it does not establish a safe cache key or authorize result reuse. Native
behavioral and corpus acceptance remain separate from compiler-stage completion.
