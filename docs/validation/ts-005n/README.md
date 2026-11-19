# TS-005N validation — 2026-11-01

Base `561c12e`, branch `typescript-scriptc-probes`. Primitive conversion only;
awaiting coordinator review. Existing pinned Node 26.13.0, scriptc 0.4.7,
TypeScript 7.0.2 and Zig 0.17.0 on Windows x64.

## Results and reproduction

From `typescript/`, with the installed Zig directory on PATH:

```text
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
```

Typecheck passes; runner 20/20; compiler probes 10/10; rebuilt Node and native
guest/host lanes each 132/132, no skips. Conversion is one registered host case
with many throwing expected assertions, not 132 new conversion cases. All prior
131 cases are retained. JSON files hold subprocess status, stdout, stderr and
expected results; text files hold command output. Native builds require both
static-only compilation and the existing fail-closed coverage gate.

Final static counts: CLI 785/785, realms 850/850, descriptors 250/250,
prototypes 857/857, keys 294/294, conversion 340/340; no dynamic entries.

`native-initial.txt` retains the initial Zig library sandbox failure. Rerunning
with authorized library access succeeds. The initial test callback also inferred
`never` from its throw-only body, generating a dynamic adapter; its explicit
`Completion` return annotation eliminates that adapter. No gate or pin changed.

## Independent numeric expectations

`test/conversion.ts` asserts the conversion matrix from `array-prerequisites.md`:
every existing primitive kind; all 25 whitespace code points independently at
both ends and as invalid embedded whitespace; excluded whitespace and surrogates;
valid/invalid decimal, exponent, Infinity and unsigned radix tokens; signed zero;
overflow/underflow and minimum subnormal; large positive/negative finite modulo;
and runtime TypeError/location for objects with conversion hooks that must not run.

Expected values are fixed numbers and exact powers of two, never host Number of
the tested string. At 2^53 the spacing is 2, so 9007199254740993 rounds to 2^53,
while 9007199254740995 rounds to 2^53+4 (ties to even). Exact decimal 1+2^-53
rounds to 1; values immediately above/below and the next midpoint distinguish
rounding direction. Long binary/octal/hex strings encode 2^100 and its adjacent
integers, all rounding to 2^100. Additional binary/hex cases encode 2^100+2^47
(halfway, rounds down) and that value plus 1 (rounds up to 2^100+2^48).
Long radix overflow cases encode powers at least 2^1024. Modulo expectations
include 2^60+256 mapping to 256, its negative mapping to 2^32-256, and the
maximum finite binary64 value mapping to +0 because its integer spacing is
divisible by 2^32. Signed zeros are checked using Object.is.

Specification baseline: [ECMA-262 2025 ToNumber, StringToNumber and ToUint32](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-tonumber),
consulted 2026-11-01; the previously accepted engine262 source analysis and
revision are recorded in `docs/array-prerequisites.md`. No upstream code copied.

The tests support using the isolated Number(validatedToken) backend for this
primitive stage. They are not exhaustive proof of numeric parsing. Objects are
explicitly unsupported; operators, Number builtins, guest syntax, arrays and
definition-dispatch signatures remain unchanged. No successor task started.
