# Async harness completion review

The pinned U08 test completes correctly in both Rift hosts when a diagnostic
`print` adapter is supplied. No engine change is justified by this review.
The starter runner still excludes async tests; this review does not admit them
or change its 33-file, 60-variant denominator.

The original test and all three harness files were verified against the pinned
manifest and executed as separate Script units. Both strict and non-strict
variants were retained. The adapter is a separate unit that forwards `print` to
the Realm output callback through `console.log`; it does not replace `$DONE`.

All 44 cases per host pass their explicit expected outcomes, and structured
Node/native results match exactly. The native diagnostic passes static-only
compilation with 20,435 static statements and zero dynamic operations. Controls
cover synchronous and queued completion, chained jobs, missing completion,
pending/rejected Promises, callback throws, duplicate completion, error objects,
primitive errors, failure after success, and abrupt completion after `$DONE`.

## Findings

- Without `print`, U08 has normal Script completion and no failed jobs, but no
  completion output. The callback's ReferenceError rejects its resulting Promise.
  A runner that equates normal Script completion with async success would accept
  this broken harness execution.
- With the adapter, U08 emits exactly one completion marker in both modes.
- Missing `$DONE`, a pending Promise, and an unhandled rejection all yield no
  completion marker. They must not become passes merely because the job queue
  is empty.
- The pinned helper treats falsy `$DONE` arguments as success. Explicit `false`,
  `0`, and `null` controls preserve that behavior.
- A failure marker after success must remain visible. A synchronous throw after
  success also survives in the Script result.
- An unhandled rejection after success does not become a job failure under the
  current host rejection policy. Broadening that policy is a separate decision.
- Guest code can print the same completion marker without calling `$DONE`.
  Output matching alone establishes the helper's wire convention, not the
  identity or number of actual `$DONE` calls.

## Next boundary

A future async adapter needs an explicit completion state and a real host
`print` binding, separate harness/test Script execution, bounded job draining,
and precedence for harness faults, abrupt completion, resource limits, failure
markers and duplicate completion. Exhausting the available queue without
completion must remain an incomplete result. Decide whether the adapter trusts
the pinned output convention or observes a host-owned completion hook before
claiming call identity. Preserve these distinctions in both-host tests before
changing capability admission.

Evidence is in `build/async-harness-review/`, including the exact selection,
inputs, both result ledgers, compiler report and `reviewed.json`. The producing
helpers are `build/review-async-harness.mjs` and
`build/build-async-harness-review.mjs`. Canonical source was unchanged throughout.
