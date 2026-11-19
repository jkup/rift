# Mutable array widening loses aliasing

Observed with pinned scriptc 0.4.7, Node 26.13.0 and Zig 0.17.0 on Windows x64,
2026-11-11. Both programs build with `--tier static-only`; coverage reports
7 analyzed statements, all static, for each.

| Program | Node stdout | Native stdout |
| --- | --- | --- |
| repro.ts | `1\nx\n` | `0\n` |
| control.ts | `1\nx\n` | `1\nx\n` |

The reproducer returns a `Field[]` through an `Initializer[]` return type and
pushes into that returned array. JavaScript requires the original array to
observe the mutation. Native execution instead leaves it empty. The control
uses `Initializer[]` at the storage declaration as well and preserves aliasing.
This demonstrates a problem with this conversion; it does not establish that
all array conversions or union arrays are broken.

The full static-block implementation exposed this while initializing an
instance field after a suspended computed class key. Keeping instance and
static initializer storage at the same union element type fixes that test;
the runtime still rejects static blocks in the instance list. Focused native
static-block execution and all six regression programs then passed.

Reproduce from the TypeScript project directory (Zig must be on PATH):

```powershell
node docs/validation/ts-444-array-widening/repro.ts
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-444-array-widening/repro.ts --tier static-only -o build/array-widening-repro.exe
node_modules/scriptc/bin/scriptc.exe coverage docs/validation/ts-444-array-widening/repro.ts
./build/array-widening-repro.exe
```

Repeat with `control.ts`. The failing reproducer is evidence, not a passing
probe in the acceptance suite. Do not change expected semantics to accept its
native output. Original build/coverage/output logs remain under
`build/class-static-blocks-array-union-*`.

Follow-up: inspect engine paths that widen mutable array element types and
subsequently mutate through the widened reference. Prioritize shared storage
returned from helpers; use reduced both-host probes for suspect conversions.
No broader compiler workaround or toolchain upgrade is justified yet.
