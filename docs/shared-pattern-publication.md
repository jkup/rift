# Shared pattern publication

TS-560 publishes declaration, assignment and loop pattern suspension together,
following the existing combined-validation approach used for TS-553. They extend
the same continuation machinery and form a strict dependency chain.

Each isolated draft must first pass its own complete Node and runner checks,
focused native compilation and execution, tooling suite and READY review:

| Feature | Guests | Native gates | Native executions |
| --- | ---: | ---: | ---: |
| TS-556 declarations | 1000 | 41 | 48 |
| TS-557 assignments | 1001 | 49 | 57 |
| TS-559 loops | 1002 | 57 | 65 |

All three require 35 runner and 296 tooling checks. Each also builds four native
tooling prerequisites: number-radix, return-audit, script-strict-parameter-audit
and script-strict-parameter-dispatch. These are additional to the feature gates
in the table; tooling and final review verify their coverage and executable hashes.
Native builds must pass
static-only compilation and parsed zero-dynamic coverage. A provisional draft
cannot be promoted until its predecessor's final validated hashes match its
recorded base. Any compiler fix that changes a predecessor requires reconciling
and revalidating its successors before their acceptance.

First finish and publish TS-551. Its active source snapshot and four-worker native
allocation remain untouched. Then validate the three drafts in dependency order,
integrate each accepted isolated change as a separate feature commit, and run one
full canonical suite on the combined source. Nothing from this group is pushed
to main before that suite passes.

The combined gate requires 1002 guests on each host, 484 native build/coverage
gates, typechecking, 35 runner checks, ten compiler probes, 296 tooling checks and
the original 225-file corpus compared against the accepted predecessor. Preserve
all original fixture programs and failure evidence for migrated expectations.
Runtime source, executables and validation results must remain tied to the final
frozen snapshot. A timeout, signal or missing result is not acceptance.

This avoids two redundant full builds of intermediate versions while preserving
separate feature review and complete validation of the source that is published.

## Accepted combined validation — 2026-11-15

TS-556, TS-557 and TS-559 are integrated as `1fcce9da`, `8e234bdf` and
`c2cb6466`. Each passed the isolated requirements above, including its four
additional tooling prerequisites. Canonical session 21893 exited successfully
through all five stages. Independently repeated acceptance verifies 1002 guests
per host without skips, 484 compiler checks and executable hashes, 296 tooling
checks, 35 runner checks, ten compiler probes and typechecking.

The 1097-input source snapshot has SHA-256
`99559e60217a2ffe67fb037e1fedf07072f75b635a98187b6f15d8876ee774fe`.
Evidence is retained under `build/pattern-cohort-rollup-*`; the independent
acceptance command is `node build/accept-pattern-cohort-rollup.mjs`.
Corpus runs `node-ZIMckm` and `native-K5lmj4` match all 225 original fixture
records against the accepted predecessor, preserving 191 completions with no
changed or added outcomes. Original fixtures are unchanged. Compiler checks,
port regression cases and original corpus outcomes are separate measures;
none is a percentage of full C++ or ECMAScript parity.
