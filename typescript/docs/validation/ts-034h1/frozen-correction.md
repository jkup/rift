# H1 frozen correction for second review

This supersedes the underspecified H1 association, consumed-throw and tick wording
in `de90653`. It is design only, against the same `b84a5e0` production source.
No production or existing test changes, execution evidence or acceptance claim.

## Consumed propagation versus retained diagnostic identity

Current `ExecutionEngine.#capture` suppresses a completion equal to `#abrupt`.
That is correct while the same throw propagates through nested callers. A catch
**consumes that propagation**. After deciding that the protected block's result
is a catchable language throw, and before the first catch setup tick, set the
private active-propagation marker `#abrupt` to null. Do not clear or mutate
`#lastAbrupt`: it remains the detached last observed throw snapshot until another
throw is captured. Do not save/restore the consumed marker around the handler.
Every new throw from catch setup, handler or a later statement can then establish
fresh source provenance, even if a trusted builtin returns the identical
preallocated ThrowCompletion again. Resource/unsupported bypasses do not consume
the marker. No guest catch is implemented using host exception catching.

**C14, literal same-completion regression:** In Realm A install a guarded trusted
`probe` builtin. It always returns the same preallocated language ThrowCompletion
`q`, whose origin is guest, Value is one preallocated ordinary guest object `v`,
and `diagnostic.loc` is one fixed object `L={line:900,column:9}`. Never copy q/v/L
or mutate q between invocations. The builtin logs the supplied call Location and
a detached session snapshot before returning q. Prepare/load these separate
unchanged source units in A:

```js
// Unit A (the comment is a label, not part of its literal source)
"use strict";function a(){probe();}
// Unit B (likewise label only)
"use strict";function b(){1;probe();}
// Unit T (one execution; no runScript reset between the two throws)
"use strict";try{a();}catch(e){}b();
```

The literal strings are exactly the three non-comment lines above. Expected
call-site log is `[(A,1,27),(B,1,29)]`. Both callbacks use builtin allocation
Realm A; their source records are distinct A/B. At the second callback, the
retained lastAbrupt still identifies source A and loc900:9. The uncaught result
is `===q`, `result.value===v`, `result.diagnostic.loc===L`. Final lastAbrupt has
record B/unit B/Realm A and a **copied diagnostic coordinate**900:9; it must not
remain record A. Snapshot.loc is not the invocation coordinate29 and must not be
rewritten to29. The call-site log independently proves the second source site.
This preserves the existing snapshot interface: source/frame provenance and a
completion's diagnostic Location are distinct evidence, not interchangeable.
The three units share a session and budgets; definitions are loaded before T.
Repeat with B defined in Realm B and transferred callable b invoked from T in A,
with B's guarded probe returning the same host-held q: source B, allocation
Realm B, same q/v/L. Host transfer is same-profile only. Exact counters, idle
restoration and prior global effects are retained. No cross-profile bypass.

Add a control where T ends just after the catch: result normal/undefined,
lastAbrupt stays A/900:9 (consumption does not erase history). C04's guest rethrow
and C10's fresh throw remain necessary but do not replace C14.

## Exact original-node association

Use one original `TryCatchStmt` in the Stmt union with fields
`kind:'try-catch', loc, block:BlockStmt, parameter:DeclarationSite,
catchLoc:Location, catchStart:number, catchEnd:number, handler:BlockStmt`.
`loc` is the try token, `catchLoc` the catch token; offsets are UTF-16 half-open
from catch token through the handler closing brace. Both BlockStmt objects and
their body arrays are the original parser objects. There is no synthetic catch
statement/body, cloned handler, AST wrapper made during evaluation, or exported
catch node accessor. DeclarationSite is source metadata; define/share its shape
within owned syntax/declarations files without a runtime dependency cycle.

Extend DeclarationScope.kind with catch and `catchParameter: DeclarationSite|null`
(null in every other scope). No fake parameter formal/let declaration. A catch
scope has empty own declaration arrays and lexicalNames=[parameter.name]; its
handler has a separate ordinary block scope. Traversal order is: original try
block and its complete subtree; catch scope; original handler block and subtree;
next statement. Try block and catch scope have the enclosing lexical scope as
parent; handler's parent is catch. Both arms retain the enclosing variableScope;
nested functions start their own variableScope. Thus var hoists from both arms,
but nested-function vars do not. Unchanged source preserves old IDs.

Keep the existing `DeclarationNodes.scopes` entry shape `{node,body}`; widen the
node union only as the Stmt union requires. For the catch entry **node is the
original TryCatchStmt**, body is exactly `node.handler.body`. The try block and
handler each have their own entry with node equal to their original BlockStmt
and body equal to its body array. The private node-to-scope Map therefore maps
TryCatchStmt→catch ID, try BlockStmt→try block ID, handler BlockStmt→handler ID;
no duplicate key, no invented body on TryCatchStmt. Public inspection copies
catch metadata only, never those objects or arrays.

Replace preparation's blanket `entry.node.kind===scope.kind` / `node.body`
assumption with an explicit catch arm and the unchanged old arms. Before
publishing the record, validate for every try-catch node:

1. Exactly one catch entry has this original node and exact handler.body alias;
   root/body identity checks and map cardinality still hold. Both children have
   block entries pointing at the exact child objects and their exact body arrays.
2. Catch parent equals try block parent; handler parent equals catch ID. All
   child IDs correspond to the original collector traversal, not location lookup
   at execution. Require distinct child/owner identities and no duplicate map keys.
3. Catch source range and parameter site match retained parser metadata; handler
   range is within catch range, catch begins after try block, inherited strictness
   matches parent, only catch has nonnull catchParameter, arrays/names obey above.
4. Existing function source identity, declaration initializers, assignment naming,
   scope cardinality and block/function validation stay intact. A function inside
   handler captures the handler block whose outer is catch. Do not treat catch
   as a block in `#block` or supply its aliased body to ordinary block evaluation.

Internal catch creation obtains the catch ID through the original try-catch map
and verifies its explicit kind/association. Handler evaluation uses the original
handler node through ordinary `#statement`; the catch entry's body alias is only
validated metadata. Any additional union consumer outside the four H1 files
requires an exact ownership amendment, not silent edits.

## Frozen catch setup sequence

The try-catch node receives the existing `#statement` tick at its try Location,
then evaluates original try block via `#statement`, including existing block
allocation/instantiation. On catchable throw, that block frame is already restored
to the enclosing frame. Consume the propagation marker as above; then:

| Order | Tick / state transition | Failure and phase |
|---|---|---|
| 1 | Tick at catchLoc **before** allocating a fresh private CatchActivation (extends existing ScriptDeclarativeEnvironment); outer=enclosing lexical. | Failure: no allocation, enclosing frame; Script phase body. |
| 2 | Mark activation started; tick at parameter.loc, then create one mutable uninitialized binding. | Failure: unpublished activation, no binding; enclosing frame/body. |
| 3 | Tick at parameter.loc, then initialize binding to exact thrown Value; mark activation complete. | Failure: unpublished activation with uninitialized binding; enclosing frame/body. |
| 4 | Install frame copy with scopeId=catch ID, lexical=catch activation; variable/record/Realm/this/function unchanged. **No tick.** | Only after successful initialization. This is block-like setup inside Script body, not global/function instantiation phase. |
| 5 | Evaluate original handler via `#statement`: handler-open-brace statement tick, existing block-allocation tick at same brace, existing lexical/function setup ticks in order, then list. | Handler block frame/lexicals are restored by existing finally; outer finally always restores enclosing frame. |
| 6 | Apply TryStatement UpdateEmpty(undefined) to chosen completion; no extra tick on entry/exit/marker clear/installation/restoration. | Exact throws propagate, return/break/continue preserved; calls/depth restored, steps/effects never rolled back. |

CatchActivation is private in the shared engine module, owner-key/scope/original
outer bound, one-use fresh→started→complete like existing activations. No context
or callback gets it before step4. Catch setup may not call guest code or injected
test hooks. Allocation and binding operations themselves add no hidden ticks.
All catch/handler failures after global entry report `phase:'body'` externally;
phase does not change to instantiation for catch bindings. Capture resource
failures in the current source frame before restoration. Host allocation faults
escape unchanged through finally, not as catchable completions. Transient binding
states in this table are implementation invariants checked by review; actual
prefix tests assert public effects/locations/counters, not imaginary observation
of unpublished activations. Existing host-helper injection evidence stays separate.

## Literal resource prefixes frozen before assignment

All sources below are single lines, no hidden newline/prefix. Tick columns derive
from accepted E4 statement/block/expression accounting plus exactly the three
catch setup ticks above. These are **future required results**, not execution
measurements. If implementation disagrees, reduce/review the disagreement; do not
replace expectations with observed traces.

| ID | Exact source | Tick columns, all line1 | Full result |
|---|---|---|---|
| P14 | `"use strict";try{throw 7;}catch(e){e;}` | `[1,1,14,17,17,18,24,27,33,33,35,35,36,36]` | normal number7,14 ticks |
| P14R | `"use strict";try{throw 7;}catch(e){throw e;}` | `[1,1,14,17,17,18,24,27,33,33,35,35,36,42]` | guest throw number7 at1:36,14 ticks |
| P05 | `"use strict";try{}catch(e){e;}` | `[1,1,14,17,17]` | normal undefined,5 ticks, catch never entered |
| P15F | `"use strict";try{throw 7;}catch(e){(function(){return e;});}` | `[1,1,14,17,17,18,24,27,33,33,35,35,36,37,37]` | normal original-source closure,15 ticks |

For **each** row, fresh Realm/session per pair `(seed,k)`, seed in `[0,7]`,
k from0 through listed length N inclusive. For seed7 execute exact
`"use strict";this.seed=1;` first (accepted7 ticks, no user callbacks); set total
maxSteps=seed+k. For seed0 run no seed unit. For k<N, result must be resource
steps, count=seed+k+1, limit=seed+k, diagnostic line1/column=columns[k],
body phase, active=null, calls=0, depth=0. For k=N, steps=seed+N and literal full
result above; never a resource throw. Retain seed property only in seeded runs.
Final source provenance on every resource throw is the target record, not seed.

P14/P14R/P15F: k<7 cannot complete protected throw; k=7 fails catch allocation,
k=8 fails binding creation, k=9 fails initialization; k=10 fails handler statement
tick after catch installation; k=11 fails handler block allocation; k=12 reaches
the handler frame then fails first statement; later failures occur at listed
expressions/materialization. No failed prefix exposes a closure or catch binding
globally; all restore enclosing/idle frames. A seven-seeded resource failure must
retain seed1 and every prefix shares the same monotonically increasing counter.
For full P15F, host retains returned closure then installs it as `saved` through
the established Script host global API. In a subsequent same-Realm unit
`"use strict";saved();`, with sufficient total budget, result is number7 and
function source/Realm remain P15F's; no catch environment leak into global scope.
Repeat closure invocation cross-Realm using same-profile transfer after full
construction, preserving defining Realm and original record.

## Additional declaration and nesting controls

Prefix each row with literal `"use strict";`. `out` is trusted host recorder.
All rows are future two-lane expectations; rejected rows have no effects and
remain unsupported-syntax or existing declaration conflict, never a newly
certified syntax-error rule. H1 emits no new certification code.

| ID | Source | Expected |
|---|---|---|
| D01 | `out(x);out(y);try{var x=1;}catch(e){var y=2;}out(x);out(y);` | undefined,undefined,1,undefined; both vars hoisted, untaken catch initializer not run |
| D02 | `function f(){out(x);out(y);try{var x=1;throw 7;}catch(e){var y=2;}out(x);out(y);}f();` | undefined,undefined,1,2; FDI collects both arms |
| D03 | `try{throw 7;}catch(e){try{throw 11;}catch(e){out(e);}out(e);}` | 11,7; nested catch consumes each propagation independently, outer binding restored |
| D04 | `let saved;try{throw 7;}catch(e){try{throw 11;}catch(f){saved=function(){return e+f;};}}out(saved());` | 18; both captured bindings survive exit |
| D05 | `try{throw 7;}catch(e){let e;}` / `try{throw 7;}catch(e){function e(){}}` | reject parameter vs handler lexical/function conflict |
| D06 | `try{}catch(eval){}` / `try{}catch(arguments){}` / `try{}catch(implements){}` | reject strict forbidden binding; valid neighbor `try{}catch(value){}` normal undefined |
| D07 | `try{}catch(e){var e;}` / `try{}catch(e){{var e;}}` | explicit unsupported catch-var collision (including nested var); no Annex B behavior claimed |
| D08 | `try{throw 7;}catch(e){{let e=11;out(e);}out(e);}` | 11,7; nested lexical shadow is valid |
| D09 | `try{throw 7;}catch(e){function f(){var e=11;return e;}out(f());out(e);}` | 11,7; stop catch collision/var walk at nested function |
| D10 | `try{}catch(e){let x;let x;}` / `try{}catch(e){return 1;}` / `try{}catch(e){class X{}}` | reject even untaken handler; no body effects, unsupported tail never certified |

Parameter/handler lexical conflicts are checked after whole-unit grammar coverage;
strict forbidden binding forms can retain existing unsupported parser behavior.
No malformed input is admitted by merely not reaching its catch. C13 and all
prior controls remain required; these rows supplement rather than replace them.
