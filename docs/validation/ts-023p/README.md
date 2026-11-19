# TS-023P design evidence and handoff

2026-11-02, assignment base c21ea28, dispatch fec364f. Sole design writer;
coordinator retains COORDINATION.md. No Claude queue/output edits.

Deliverables: [contract](../../function-string-conversion.md),
[expected-result/migration matrix](matrix.md), [source ledger](source-cases.mjs)
and its [checked output](source-cases.txt), [migration inventory](inventory.txt)
with [reproducer](inventory.mjs). This is design evidence, not a Function feature
implementation or native validation milestone.

## Evidence retrieved

Read 2026-11-02. Normative pages are fixed ECMA-262 2025, not the rolling spec:

* [20.2.3.5 and NativeFunction grammar](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-function.prototype.tostring):
  source priority, builtin initial name, callable fallback and receiver rejection.
* [20.2.5](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-hosthassourcetextavailable):
  availability is deterministic for each function; the default is true.
* [15.2 function definitions](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions):
  declaration/expression instantiation passes the source matched by that
  production to OrdinaryFunctionCreate. Other steps such as MakeConstructor and
  inferred public names are outside this bounded implementation proposal.

Engine evidence is source inspection only; no engine executed guest inputs.
GitHub connector fetched files and directory blob identities. The following
revisions and blobs make the inspected evidence reproducible:

| Repository/revision | File / inspected functions | Git blob |
|---|---|---|
| engine262/engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171 | [src/intrinsics/FunctionPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts), FunctionProto_toString, bootstrapFunctionPrototype | 893620c920ac185d2798fac0bd22af957b942e3a |
| v8/v8 release 13.0.245 | [src/objects/js-function.cc](https://github.com/v8/v8/blob/13.0.245/src/objects/js-function.cc), NativeCodeFunctionSourceString, JSFunction::ToString | 5e282fde39d0eaf3eb97806555a4001eb78ae516 |
| v8/v8 release 13.0.245 | [src/objects/shared-function-info.cc](https://github.com/v8/v8/blob/13.0.245/src/objects/shared-function-info.cc), GetSourceCodeHarmony | db8fe6c02b89136f8ccf9929b3b11242401c3082 |
| v8/v8 release 13.0.245 | [src/builtins/builtins-function.cc](https://github.com/v8/v8/blob/13.0.245/src/builtins/builtins-function.cc), FunctionPrototypeToString | 3a5b2a2f6d70223f7b6ed9841f776e67bcabbbc4 |

engine262 uses SourceText and InitialName separately; its unnamed formatting is
not identical to Rift's selected whitespace. Its current code mentions
UTF16Encode, whereas the fixed 2025 algorithm names CodePointsToString. Treat
that as edition terminology, not permission to normalize the retained spelling.
V8 reads shared script source using function-token/end offsets. Its class,
wrapped-function, asm.js and unavailable-source paths are not adopted. Rift's
parsed functions cannot lose availability. No upstream source code is copied.

Initial web retrieval attempts against the full ecma-international.org edition
failed its response-size limit; alternate multipage URLs there were inaccessible.
The fixed tc39.es 2025 multipage pages succeeded. Raw GitHub/Googlesource attempts
for V8 13.8.258 failed retrieval; no claim relies on that revision. Connected
GitHub reads of the pinned 13.0.245 release succeeded. These were retrieval
failures, not semantic test failures.

## Local review and checks

Inspected lexer, parser, syntax, runtime callable/object records, evaluator
allocation/call/guard paths, Realm bootstrap/factories, guest-string boundary,
ordinary/symbol primitive conversion, primitive conversion helpers, Object and
Function builtin registration, plus the affected host drivers and fixtures.
The inventory examined 92 src/test files and found 46 review candidates. It is
not an exhaustive semantic oracle; the matrix classifies changes versus controls.

Run from repository root:

```powershell
node typescript/docs/validation/ts-023p/source-cases.mjs
node typescript/docs/validation/ts-023p/inventory.mjs
git diff --check
```

Final ledger output: `9 source cases / 11 fixed ranges checked (data only).`
Final inventory output: `92 source files inspected; 46 migration candidates.`
The first draft ledger check caught hand-counted end offsets (S1 first failure);
all eleven fixed ranges were recounted and checked before handoff. S6 separates
the high/low lone surrogates with `x`, avoiding accidentally testing a second
valid pair. No semantic implementation was changed to satisfy the ledger.

No compiler probe was warranted: the proposal uses already exercised readonly
records, nullable fields, string slices and shared object references. These are
grounds to defer probes, not proof of integrated compilation. No runtime suites,
static-only builds or coverage commands were run for this docs-only task.
Accepted runtime baseline remains 3d8d37f, independently 166/166 both hosts and
24 gates as supplied by coordinator. Do not increment that denominator or claim
new Function support. Follow-up implementation must run all required gates and
retain any actual compiler reductions before adopting workarounds.

## Review boundary

Ready for independent coordinator review: exact source and native-name contracts,
S1-S19/F1-F15/R1-R12/C1-C15 expected outcomes, API call-site inventory and explicit
tag/root-key/budget migrations. The proposed implementation is one atomic change;
the coordinator decides its assignment after review. No successor, main merge,
branch switch, runtime, integrated test, manifest, pin or C++ change was made.
