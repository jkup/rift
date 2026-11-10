# Async generator delegation

Async yield-star uses a data-only delegate record. It caches next, looks up throw
and return at each abrupt resume, awaits method results, and validates result
objects before reading done and value. Missing throw awaits return cleanup before
raising TypeError; missing return awaits the supplied return value.

Async iterator values are forwarded directly by yield-star. Ordinary async yield
unwraps its value, while a synchronous delegate unwraps through the async-from-sync
adapter. Keeping those paths distinct preserves Promise identity and job order.
Return expressions still use the existing return receiver and finally handling.

The focused tests cover queued requests, live methods, rejection and missing-method
cleanup, sync fallback, Promise-valued results, cross-Realm result prototypes,
current-session budgets and fatal cleanup. The unchanged synchronous delegation,
nested yield, async generator, methods and for-await suites are regression gates.

The native compiler cannot directly widen a merged synchronous/asynchronous result
union after checking its yield tag (SC2003). An explicit single-arm binding keeps
the same result object and compiles statically. Reduced failing and passing probes
are retained in build/async-generator-delegate-draft/build/delegate-union-*.ts.

Semantics were checked against [ECMA-262 YieldExpression](https://262.ecma-international.org/16.0/#sec-generator-function-definitions-runtime-semantics-evaluation)
and engine262 src/runtime-semantics/YieldExpression.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. Generated reports and initial failures stay
in the ignored draft build directory. Combined canonical validation is required
before milestone acceptance.
