# Unicode ignore-case ranges

Unicode ignore-case character classes keep ranges wider than 256 code points as
intervals and test the canonical input against existing simple-fold equivalence
groups. The groups contain at most four members. Small ranges retain the folded
Set path, bounding their expansion while preserving ordinary matching speed.
Non-Unicode uppercase folding retains its existing implementation.

Measured compiler work for a full Unicode interval drops from a stop at 100001
steps to four steps, without increasing the execution limit. A Unicode ASCII
range retains its 30 steps; the non-Unicode cases also retain their counts.
These are deterministic operation counts, not a wall-clock speedup claim.

Focused tests cover every Unicode code point's singleton equivalence and full
range membership, selected range boundaries, non-monotonic folds, surrogate and
astral behavior, negation, mixed property classes, scoped flags and lookbehind.
Independent reference expressions agree with all eleven expected guest results.
Compile and match resource-stop controls remain explicit.

The first interval-only candidate passed focused semantics but increased the
sampled native small-range matching medians from 7 ms to 8–8.5 ms in alternating
runs. Its source, binaries and 989/991 regression ledger are archived. The hybrid
revision retains the original small-range path. Fresh native checks pass, and
alternating comparisons have eight of nine medians equal to baseline at 7 ms;
one is 7.5 ms. These short samples show no consistent slowdown and do not
establish a general speedup.

Isolated validation passes all 991 Node guests, 34 diagnostic controls on each
host, 296 tooling tests and 35 runner checks. The focused test, diagnostic probe,
15 tooling drivers, benchmark and amended regression pass 19 fresh native
static-only/zero-dynamic gates. Generated Unicode data reproduces exactly.

One historical test retains its full-Unicode pattern and 20-step limit, now
expecting successful compilation and matching. Every smaller compiler-budget
cutoff is checked. Its original failure, test and source snapshot are archived;
production inputs did not change during that expectation migration.

READY for integration in the combined matcher milestone. Canonical acceptance
remains pending.
