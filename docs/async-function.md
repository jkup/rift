# Async function calls

Ordinary async declarations and expressions create non-constructable functions
with the intrinsic AsyncFunction prototype. Dynamic AsyncFunction construction
uses Rift parsing and global scope, through the same bounded source validation
as ordinary and generator constructors. Async block declarations do not receive
Annex B var copies.

Each call creates an intrinsic Promise capability before parameter setup. The
body starts synchronously; an explicit return resolves the Promise, normal
completion resolves undefined, and guest setup/body throws reject it. Resolution
uses existing thenable assimilation and job checkpoints. Resource and unsupported
failures remain fatal. Replacing the global Promise or Promise.resolve cannot
replace the intrinsic operation. Current-call Realm/session state is restored.

Await, async arrows/methods and async generators remain unsupported in this slice.
Await must reuse the detached activation and expression frames, with job handlers
that accept the current operation context rather than retaining an old evaluator.
It must suspend even for non-Promise values and preserve cleanup on rejection.

Reviewed [ECMA-262 async definitions](https://262.ecma-international.org/16.0/#sec-async-function-definitions),
[engine262 EvaluateAsyncFunctionBody](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/EvaluateBody.mts)
and [AsyncFunctionStart](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/async-function-operations.mts).
The intrinsic factory uses the existing Promise object and resolving functions;
it does not consult mutable global properties or introduce a second Promise type.

The first native run matched Node but failed zero-dynamic coverage. Two conditional
object spreads lost the FunctionSource shape. Explicitly typed intermediate
metadata fixes it. The reduced source-spread probe reports one dynamic statement;
the typed variant reports zero. Both probes and the initial report are retained in
build/async-function-draft/build. Historical job, regex-certification and Script
execution rejection inputs remain covered under their newly supported behavior.
