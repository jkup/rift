# TS-005C validation (2026-11-01)

Base: 89ecebc463758864625e6244edf0818e4d2cf3e4, existing typescript-scriptc-probes branch.
Implementation is awaiting coordinator review; no successor work.

Commands run with pinned dependencies: npm run typecheck; npm run test:runner;
npm run test:probes; npm run test:guest:node; npm run test:guest:native.
Typecheck passes, runner 20/20, probes 10/10, rebuilt guest/host suites 136/136
in each lane, no skips. The native build enforces static-only plus separate
coverage gates on all ten entries; operation-context is 905/905 static with
zero dynamic statements. Full subprocess records accompany command transcripts.
Windows linking used the installed Zig 0.17.0 directory on command-local PATH
and authorized escalated library access. No compiler pins or gates changed.

The compiled actual-runtime driver asserts retained lexical counter state and
fresh context identities across top-level runs; parsed guest callbacks through
builtins; exact this, argument array/value, location and thrown record identity;
guest return/fallthrough; independent realms; nested builtin ticks (limit 3,
steps 4, two completed inner visits); guest/builtin recursion (call limit 4,
two reentries, 11 total AST ticks including setup); shared guest/builtin tick
exhaustion; noncallable-before-depth ordering; invalid builtin return/break/
continue and impossible guest break/continue; host fault propagation, prior-call
count restoration and subsequent call capacity. Existing tests are all retained.

Initial native acceptance correctly failed on four dynamic statements in the
new test, despite the compiler's misleading 'fully static' summary. See
native-initial-dynamic.txt and dynamic-explanation.txt. The 14-statement
standalone dynamic-reduction.ts reproduces three dynamic statements using
inferred narrow array identity, an un-narrowed catch comparison and a never-return
callback adapter. static-reduction.ts uses an explicit Value[] annotation,
instanceof Error narrowing and an explicit callback result annotation: all 14
statements static, zero dynamic. These reductions were coverage-inspected;
execution evidence is the rebuilt integrated driver, not a claimed reduction
execution. Full-arity callbacks and exact identity assertions remain intact.

Scope: only active context/call boundary and caller migration. No map,
property/conversion context expansion, ambient context, registration-time
evaluator capture or cross-realm intrinsic conformance claim. Guest closures
retain environments; trusted host builtins must cooperate with ticking. Call
count cleanup is guaranteed on host faults; this task does not generalize all
evaluator frame cleanup or promise arbitrary reuse after a host implementation
fault. C++, pins, Claude outputs and COORDINATION.md are untouched.
