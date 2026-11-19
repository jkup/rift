# E2 API and literal controls frozen before implementation

Base14704f7. New modules only; no existing production migration.
ScriptEnvironment is a union of ScriptDeclarativeEnvironment (kind declarative),
ScriptFunctionEnvironment (kind function), and {kind:global,record:GlobalEnvironment}.
Both local classes have private mutable bindings and readonly outer, and completion-aware
hasBinding/createMutableBinding/initializeBinding/getBindingValue/setMutableBinding.
Duplicate create, missing initialize/get/set and repeated initialize are host invariant
faults; TDZ get/set are guest ReferenceError. Mutable-only, no deletion or implicit create.
Function constructor additionally stores exact thisValue and Callable identity as host
metadata. It does not construct a callable or expose a call path.
resolveScriptBinding(environment,name,loc) returns normal/reference or original throw;
reference captures base|null, strict:true, name and copied location. getScriptBinding and
putScriptBinding dispatch only to captured base. scriptIdentifierReceiver returns undefined.
No typeof evaluator helper: consumers can inspect null base; TDZ remains resolved.

ScriptStatementPayload = empty | value(Value). ScriptStatementCompletion has
normal/break/continue payload, return Value, or unchanged ThrowCompletion.
updateScriptEmpty(completion,previousPayload) fills only empty normal/break/continue;
all nonempty/return/throw identities survive. scriptExpressionCompletion explicitly maps
ValueCompletion to statement value (including undefined), preserving throws. No legacy
Completion adapter or execution/loop/if/function/Script-exit helper.

L01 local TDZ ReferenceError, initialize7, mutate11, duplicate/missing/reinitialize host
fault; L02 nested shadow TDZ then0, sibling7, captured outer becomes11 despite new inner
binding; L03 20000 outer links resolve global7 and absent null; L04 exact strict this
undefined/null/0/object and same callable, identifier receiver undefined.
T01 captured null remains ReferenceError after creation; copied site3:9 survives input
site mutation. T02 captured global gets changed11, read-only Put TypeError, deleted Get/
Put ReferenceError; lexical created after resolution is live and shadows object (TDZ then0).
T03 Has/Get/Set injected original guest/resource throws preserve identity, exact operation
traces H/HG/HS; host sentinel escapes unchanged. Captured locals do not redo hasBinding.
C01 empty differs from present undefined; C02 previous7 carried through empty normal,
break,continue; C03 zero,false,undefined remain present and preserve record identity;
C04 return/guest throw/resource throw identity unchanged; expression undefined is value.
Two post-compilation runtime fixtures seed|7 and other|11 yield respectively runtime7
and runtime11 after captured local mutation; no source text execution.

Semantics follow fixed2025 clauses and pinned engine262 evidence retained by accepted
docs/script-execution-integration.md and ts-033e-p/spec.json; no new normative research.
