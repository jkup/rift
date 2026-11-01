# TS-008 validation — 2026-11-01

Implemented on `codex/primitive-computed-keys`, base `620cd29`. Awaiting
coordinator review; this is implementation evidence, not acceptance by review.

Unary +/- and binary - * / % now reuse partial toNumber. The evaluator preserves
operand evaluation/GetValue order, conversion order and exact abrupt records.
The existing expression location is passed through (binary AST locations point
to the expression start). No conversion, runtime or parser API changed.
Versioned spec and engine research is recorded in
[architecture decisions](../../architecture-decisions.md#primitive-numeric-operators-ts-008).

## Results

| Gate | Result | Retained evidence |
|---|---|---|
| `npm run typecheck` | pass | typecheck.txt |
| `npm run test:runner` | 20/20 | runner.txt |
| `npm run test:probes` | 10/10; static gates pass | probes-final.txt, probe-results.json |
| `npm run test:guest:node` | 155/155, no skips | guest-node.txt, guest-node-results.json |
| `npm run test:guest:native` | 155/155, no skips | guest-native-final.txt, guest-native-results.json |
| Native static-only + coverage | 14/14 entries fully static | native-build-results.json |

CLI coverage is 1013/1013 and the new numeric operator driver is 1062/1062.
All 153 previous cases remain; the runtime-read CLI fixture and compiled driver
add two cases. The driver contains 140 primitive/operator fixed numeric results,
25 edge results, object rejection/read/call checks, exact throw identity checks,
evaluation/GetValue ordering, unchanged plus/relational boundaries and a closure
fixture. Number expectations use Object.is, distinguishing both zero signs and
recognizing NaN. Both hosts assert these expectations independently.

The primitive matrix covers undefined, null, both booleans, number, empty and
whitespace strings, decimal and radix strings, invalid strings, signed zero,
NaN and both infinities. Every binary operation tests these on either side.
Additional cases cover division by zero signs, overflow, underflow, remainder
signs/zeros/infinities, exponent strings and radix combinations. Ordinary object,
array and function operands reject with located errors and zero hook calls;
an internalGet observer proves conversion does not read hooks. Exact sentinel
records survive calls and property GetValue on either side. A left throw skips
RHS, and a RHS throw takes precedence over left object conversion. Existing
budget and independent-realm tests remain in both lanes.

Initial builds/probes failed with `spawnSync zig ENOENT`: this chat did not inherit
Zig on PATH. Both sandboxed and escalated failures are retained in
guest-native-initial.txt, guest-native.txt, probes-initial.txt and probes.txt.
Successful runs explicitly prepended the installed directory
`C:\Users\jonku\AppData\Local\Microsoft\WinGet\Packages\zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe\zig-x86_64-windows-0.17.0`
to PATH and used approved access to its libraries. No pin or gate changed.
Early test authoring errors (missing Realm output callback and an expectation
of operator-token location rather than existing AST location) were corrected
before the final runs. No numeric backend discrepancy was found.

## Boundaries

This is primitive ToNumber integration, not full ToNumeric/ToPrimitive.
Object conversion, BigInt, symbols, boxing, binary-plus coercion, relational
coercion, new syntax/operators and Array APIs remain excluded. C++, toolchain
pins, companion outputs and COORDINATION.md were untouched. No branch switch,
main merge or successor dispatch. Commit/push is the bounded handoff.
