# TS-007P validation — 2026-11-01

Design/probe only; runtime base b4eb7945d146c3d051d22e99e4ddbe0c888cdc27.
See [proposal](../../property-key-conversion.md). No interpreter behavior or
full numeric-format conformance is claimed.

## Measured results

| Check | Result |
|---|---|
| Node 26.13.0 fixed number-string expectations | 36/36, exit 0 |
| scriptc 0.4.7 static-only native expectations | 36/36, exit 0 |
| Separate probe coverage | 11/11 statements static, no dynamic tier |
| Node-only reference order script | 5/5 scenarios |
| npm run typecheck | exit 0 |
| npm run test:runner | 20/20, no skips |
| npm run test:probes | 10/10, both lanes and static gates pass |
| git diff --check | exit 0 |

Installed versions independently checked with npm ls --depth=0:
scriptc 0.4.7, TypeScript 7.0.2, @types/node 26.6.6. Native linker:
installed Zig 0.17.0 on Windows x64. No pins changed.

The numeric source contains the complete fixed matrix, including nearest
listed neighbors of 1e-6 and 1e21, safe integers, shortest-roundtrip examples,
signed zero, NaN, infinities, maximum finite, minimum normal and subnormals.
Each row prints label, expected, actual and pass/fail; any failure makes the
execution status nonzero. Both lane statuses must be zero; parity alone
cannot pass. The existing fail-closed probeVerdict additionally requires
successful static-only build, recognized complete static coverage, no process
errors/signals/timeouts, and equal output. The runner timeout is 120 seconds
per subprocess. Unknown coverage formats fail.

- [results.json](results.json): successful isolated numeric run, every command,
  stdout/stderr, status, signal and error retained.
- [compiler-probes.json](compiler-probes.json): unchanged ten-probe regression
  results, with complete lane/build/coverage records.
- [initial-environment-failure.json](initial-environment-failure.json):
  first attempt failed before Node execution because isolated tsc needed
  explicit --types node; native linking also lacked sandbox access to Zig's
  installation. Added the local runner flag and reran with authorized access.
  This was not a formatting discrepancy or skipped acceptance gate.

Reproduction from typescript/ (PowerShell):

```powershell
$env:PATH = 'C:\Users\jonku\AppData\Local\Microsoft\WinGet\Packages\zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe\zig-x86_64-windows-0.17.0;' + $env:PATH
node probes/property-key-conversion/run.mjs
node probes/property-key-conversion/order.mjs
npm run typecheck
npm run test:runner
npm run test:probes
```

Use the installed Zig location appropriate to the machine, and authorized
library access when the sandbox cannot resolve it. Generated artifacts stay
under ignored build/. order.mjs asserts host JavaScript evaluation directly;
it neither evaluates guest text nor claims native/Rift object coercion.

No new guest-suite run was necessary for this design-only task; src, existing
tests, manifests and build scripts are unchanged. The coordinator's earlier
152/152 Node/native TS-006 acceptance is historical, not a fresh TS-007P claim.
Full rebuilt interpreter tests and native integration of the proposed module
cycle are required by the follow-on contract. No successors were started.
