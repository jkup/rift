# TS-031A host-only milestone evidence

2026-11-02; base `83e0eaa`; branch `codex/test262-classification`.
Implementation is ready for independent review, not self-accepted.

Implemented exact-byte local verification, validated YAML metadata, ordered variant
and harness planning, current-profile blockers, closed result envelopes, pure
classification, selection/attempt persistence and per-lane reporting. No guest
execution, subprocess supervisor, native integration, profile admission or runtime
capability changes. See [tool usage](../../../tools/test262/README.md) and the
[115-row coverage/deferred map](matrix.md).

Actual validation:

| Command / evidence | Result |
|---|---|
| `npm run test:test262` / [host-tests.txt](host-tests.txt) | 58/58; no skips |
| `node tools/test262/corpus.integration.mjs ROOT docs/validation/ts-031a` / [corpus-tests.txt](corpus-tests.txt) | 4/4; no skips |
| `npm run typecheck` / [typecheck.txt](typecheck.txt) | exit 0 |
| `npm run test:runner` / [runner.txt](runner.txt) | 20/20 |
| Protected source/build/test/probe diff / [preservation.txt](preservation.txt) | unchanged from base; 32 native gate entries retained |

An explicit one-time validation preparation fetched only the 33 frozen test files
and three harness files from `raw.githubusercontent.com/tc39/test262/` at full
revision `91c70759363c46557b694792bf34a2551a7af5ba`, into an external temporary root
`C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075`. No upstream bytes
are committed. All 36 Git blob identities verified before decoding. This does not
claim verification of the rest of the upstream repository or its Git tree. SHA-256
and byte lengths for all selected files, exact transformed hashes and ordered
harness identities are retained in each final ledger. Actual U11 CR/U+2028/U+2029
round-trip checks pass; newline rewriting and a one-byte S01 mutation fail.

The production preflight results are identical in count but independently retained
for each lane identity:

| Lane | Files | Planned / terminal | Executed | Pass / fail | Feature blocked | Profile blocked | Input errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| node | 33 | 60 / 60 | 0 | 0 / 0 | 19 | 41 | 0 |
| native | 33 | 60 / 60 | 0 | 0 / 0 | 19 | 41 | 0 |

Each lane has 30 strict, 28 non-strict, one raw and one module variant. Pass/planned
is 0/60; conditional pass/(pass+fail) is undefined (0/0). Adapter report exit is 1
for each complete blocked selection. Native here is only a requested lane identity;
no native binary ran. Engine/build/toolchain facts are null, not invented hashes.
All profiles remain blocked, and a planned blocked variant rejects an injected
normal result. The `*-initial-ledger.json` snapshots retain the full selection
before any terminal record; `*-ledger.json` and `*-report.json` retain final
records/status vectors separately. There are no failed/successful guest attempts.

The offline suite additionally injects all eight result statuses, constructor-name
and phase mismatches, audited/unsupported syntax, harness failures and guards,
deadline/crash-after-envelope/protocol/output-cap cases, duplicate/unknown fields,
observation-only exclusion, partial pairs, unknown counts, cancellation and explicit
retries. Those successes are synthetic control outcomes only. H/C semantic rows
remain future requirements: real Error values, audited engine rule provenance,
Script profiles, independently validated unmodified harness and fresh Realms.

Two issues found during validation were corrected: include errors after valid
metadata retain their known variants, and legacy unquoted numeric `es6id` fields
in S01-S05 are retained as informational scalars. The initial sandbox run blocked
temporary Windows junction creation with EPERM; the test was rerun with approved
filesystem access and passed, without removing the escape assertion. Initial
metadata-only count expectations were corrected to 19/41 after enumerating the
explicit file blockers; final production verification independently confirms them.

The sole added dependency is exact host-only `yaml@2.8.3`, ISC, with npm tarball
integrity retained in package-lock.json. Documented API: https://eemeli.org/yaml/.
The initially considered 2.8.1 version had GHSA-48c2-rrv3-qjmp; 2.8.3 is the narrow
patch fixing it, and installation reported zero audit vulnerabilities. No existing
toolchain pin changed, install scripts were disabled, and native engine code never
imports this package. JSON duplicate-key checking uses the same parser after strict
JSON syntax validation; there is no hand-written partial YAML parser.

Guest/native/probe/static gates were deliberately not rerun for this host-only
slice. Accepted TS-030A 211/211 per host and 32 native gates remain inherited
evidence, with exact protected-file preservation verified. No C++, Claude research,
compiler pin, engine, guest fixture/driver, runner or probe changes are included.
Coordinator-owned concurrent COORDINATION changes remain outside this commit.

Limitations: paths are checked against real local containment in a stable external
corpus directory; this is not an adversarial concurrent-filesystem sandbox. Additional
include blobs outside the frozen harness map fail closed. Error extraction and rule
certification are represented only as future driver evidence, never implemented.
The transport boundary consumes injected supervisor facts, not an actual runner.
No conformance percentage, broader support or successor implementation is claimed.
