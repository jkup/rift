# Try/finally

TS-125 adds try/finally and try/catch/finally to Script execution. Optional catch
bindings, destructuring, labels and asynchronous cleanup remain separate.

A try-finally node contains either the source try block or the existing
try-catch node, plus the finalizer block. This composes cleanup with catch
handling without changing catch parameter ownership or its source range. There
is no synthetic block or extra lexical scope. Declaration traversal visits the
body before the finalizer; their blocks retain ordinary lexical environments.

After a guest completion, the finalizer runs in the restored outer environment.
A normal finalizer preserves the earlier completion and payload; an abrupt
finalizer replaces it. Empty statement payloads become undefined at the try
boundary. Returns, throws, breaks and continues use explicit completion records,
not host exceptions.

While cleanup runs, a pending guest throw's propagation identity is suspended.
If cleanup finishes normally and that throw resumes, its identity and source
snapshot are restored, even if cleanup caught another throw. A replacement throw
keeps the finalizer's source. Resource/capability stops bypass guest finalizers,
and a fatal stop during cleanup wins over a pending guest completion. Host faults
also bypass guest cleanup; existing frame/depth finally blocks still restore the
host session.

The driver checks normal/caught/uncaught paths, all abrupt completion forms,
nesting, closures and shadowing, iterator cleanup order, source restoration and
fatal/host boundaries. Historical finally rejection sources remain and now test
inert preparation plus execution. The first focused native run executed correctly
but parsed coverage found one dynamic test comparison against an untyped caught
exception. Narrowing it with instanceof Error restored all-static coverage;
initial evidence remains in `build/finally-focused-*` and `build/finally-dynamic.log`.

Sources consulted 2026-11-09:
[TryStatement evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-try-statement-runtime-semantics-evaluation)
and [V8 VisitTryFinallyStatement](https://github.com/v8/v8/blob/main/src/interpreter/bytecode-generator.cc).
V8 also separates try/catch and try/finally nodes; Rift uses its existing explicit
completions instead of bytecode continuation registers. No engine source was copied.
