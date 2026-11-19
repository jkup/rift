# Additional frozen E4 acceptance contract

All rows are **proposed**, not run. execution-matrix.md is the complete inherited
55-row matrix; setup-matrix.md retains E3's literal18/6/12 prefixes and naming
controls; accessor-matrix.md retains ER R01–R36. Historical wording about future
E1–ER work is preserved verbatim in these copies, not asserted as current status.
E1–ER have passed their host-only boundaries; every X and R36 still needs E4.

Use fresh Realm/session for each independent variant unless persistence is the
point. Every compiled driver reads seed|7 and other|11 after compilation. Repeat
sources with the alternate identifier/payload and independent literal expectations;
do not embed only a compile-time chosen fixture. Neither host agreement nor a
PASS label substitutes for Value, identity, descriptor and phase assertions.

| ID | Literal action/setup | Expected result and negative neighbor |
|---|---|---|
| A01 | prepare `"use strict";1;`; evaluate its opaque record | body normal number1; idle caller frame restored, steps4,calls0,depth0. No parse/body public overload. Fake session, fake record, cloned record inspection and legacy Realm record fail before ticks/effects. |
| A02 | source `"use strict";function f(){return 7;}f();` | number7, trace Q below, function call source is original record; fallthrough neighbor `"use strict";function f(){7;}f();` gives undefined. |
| A03 | Execute each F05 source (dot caller/arguments, computed concatenation/key variable, typeof member), with genuine ER endpoints | body diagnostic TypeError, actual thrower callback reached exactly once; receiver exact f, get args[], defining Realm A, source callsite retained; no own restricted property. Full descriptor F04 replay in both Realms. |
| A04 | Execute all four F06 targets, separately, with simple and compound assignments | simple RHS effect7 before setter TypeError, args[7], exact receiver f, no own target. Compound getter TypeError before RHS, effect absent. Dot traces W/K below. Calls0 neighbor gives resource calls, never diagnostic TypeError; mutation follows the same pre-call ordering. |
| A05 | F07 ordinary data object then F08 deletion/redefinition/own-shadow controls | ordinary18; deleted accessor read undefined/write7 creates own data; redefine prototype arguments D(11,true,true,true), f read11/write7 own data; own caller11 shadows inherited endpoint, write7 succeeds. Fresh f still no own properties. No name blacklist. |
| A06 | A defines strict f, host transfers f to B, B evaluates `"use strict";f["caller"];` then fresh setup `"use strict";f["arguments"]=7;` | actual A thrower, caller code unit B preserved during builtin, B receiver/frame restored; no f own property. Compare with A guest function called by B: guest frame record A, object allocation prototype A, caller B restored. |
| A07 | B builtin invokes A guest that calls B builtin via context.call | guest record A; B builtin allocation Realm B but code provenance A; return to A then original caller B, same context object/session and monotonic steps. Use accepted createBuiltin callbacks for controls, not fake guest callables. |
| A08 | Call guarded Script builtin directly with a plain host context, clone/proxy of captured real view, wrong Realm, idle captured view, recovered constructor, or structural cast; additionally invoke copied call/tick callbacks through clone, spread, proxy, detached and wrongly rebound receivers while the real session is active | host rejection before raw callback, no permit/tick/counter mutation. Each callback must authenticate its invocation receiver against the exact view before consulting active state or dispatching. Use the detailed receiver matrix below, including authentic-view positives. Legacy construction with Script Realm still rejects; legacy call of Script function and Script call of legacy function still cross-profile reject. |
| A09 | During an authorized builtin callback attempt direct invocation of itself and another same-Realm builtin using captured view | consumed parent permit cannot authorize either, host fault; explicit context.call neighbor succeeds with new permit subject to same limits. Stale permit after normal/throw/resource/host exit rejects; wrong args/receiver/location identities reject. No callback can mint or fetch pending permit. |
| A10 | Nested actual calls give nonzero saved calls/depth; invoke callee normally, throwing7, exhausting steps/calls/depth, and reach a real registered builtin callback that throws preallocated host Error Y | exact before/after frame identities and saved nonzero counters; steps increase only. Guest throw identity/value/origin/loc preserved, Y===caught error. A real outer builtin catches Y from context.call to inspect the restored nonzero frame; an uncaught variant verifies root cleanup. Reach Y through guest body calls, accessor callbacks and coercion callbacks, including enclosing blocks. Resource prefixes cover GDI/factory/block/FDI/body; no assertion that Y can be injected at every engine tick. |
| A11 | Replay inherited host setup18/6/12 and marker11 controls with their supplied host contexts, separately from actual Script execution's real12/18/6 setup resource prefixes | Exact old columns/order/state, no added wrapper tick, no reset. Allocated-unpublished F/P distinguishable from binding publication. Host contexts retain injected guest/host failure identity checks, labeled host-helper evidence. Engine-owned contexts use real limits for every prefix and real nested calls for saved nonzero state; no tick substitution or synthetic marker in execution. Neither lane substitutes for the other. |
| A12 | Run T02/T05 unresolved/compound cases, TDZ L01/L02, L03/L04 FDI overwrite, L07/B01 interleaved block setup, G03 winning declaration order | Exact inherited values/order/TDZ and prefix effects. Resolve before RHS, Get before compound RHS; failure does not roll back or rerun setup. All E2 reference host controls also replay unchanged. |
| A13 | Run C01–C07 exactly, plus `"use strict";while(true){2;{break;}}` | added source normal2; contrast nested if-break normal undefined. Every empty/present-undefined distinction and continue-carried value required. Do not implement legacy block-drop-values for Script. |
| A14 | Run N01–N04 as source and inspect each produced function's name/source | N01 names x,x,empty,empty; N02 x; N03 y (both bindings same function); N04 x,y,k,empty,empty. Preserve full original slice independent of name, closure/global/local identity and record-node mapping after another unit. |
| A15 | Same exact source under include:0/include:1, equal IDs in separate records too; retain closure across later units and call from B | record identity distinct even when IDs/text equal; closure's own record/body/Realm unchanged. Source diagnostic local location remains original; private provenance identifies defining record without altering ThrowCompletion or public observation. |
| A16 | budget20; A `"use strict";this.a=1;`; B `"use strict";while(true){}`; C `"use strict";1;` | A consumes7 and leaves a1; B fails at cumulative21 (B attempted tick14), body resource steps; C same session fails at22 before body effect. Independent session C normal1 with steps4. No fresh evaluator in builtin/GDI/FDI/second unit. |
| A17 | depth/call guard at nonzero saved counters; default recursive `"use strict";function f(){return f();}f();` | call-limit resource before unbounded stack; restore every saved nesting counter. Depth257 rejected then restored to256 in host-driven nested-depth control. calls>=64 rejects without increment. Calls do not accrue cumulatively across sequential successful calls. |
| A18 | All grammar-negative neighbors from design, including `"use strict";if(false){const x=1;}`, arguments/eval in unreachable functions, nonstrict empty unit | no record, no ticks/body; preserve exact existing unsupported/profile/conflict classification. Property arguments/caller neighbors remain executable; no unsupported-syntax excuse for ER accessors. |

### A08 receiver authentication matrix

Run each call AND tick case inside a real authorized builtin callback while its
session is active, then repeat applicable cases after return. Save counters/frame
before each negative: rejection must leave steps/calls/depth and pending permit
state unchanged and invoke no target callback. `v` is the exact view received by
the real builtin; `c` and `t` are its copied ordinary, unbound call/tick functions.

| Receiver/action | Expected result |
|---|---|
| `clone={realm:v.realm,call:c,tick:t}`; clone.call/clone.tick | reject both before effects |
| spread-derived view with copied c/t fields; spread.call/spread.tick | reject both, whether getters were enumerable or c/t had to be copied explicitly |
| forwarding Proxy(v) returning c/t unchanged; proxy.call/proxy.tick | reject both by exact receiver identity; a proxy getter may reject earlier but is not sufficient coverage of the callback check |
| detached `c(...)` / `t(...)` | reject both (undefined receiver) |
| c/t.call or bind with undefined, null, clone, proxy, plain host context, or another genuine session's view | reject both, including when the other session is active |
| v.call/v.tick while v active | normal authorized nested call / one real tick, subject to existing resource limits |
| c/t.call or bind with exact active v | same authorized behavior; host already possesses authentic capability, no claim that invocation syntax is secret |
| v.call/v.tick or c/t rebound to v after its session is idle | reject both before effects |
| assignment or defineProperty replacing v.call/v.tick/v.realm | frozen view remains unchanged; failed host mutation cannot change future dispatch |

No arrow or pre-bound callback can satisfy this matrix. A host-supplied proxy
that deliberately rebinds to authentic v forwards an already-held capability;
it is equivalent to the exact-view positive, not a forged-context negative.
Direct builtin.invoke with v still fails unless the dispatcher has armed the
matching one-use permit. No copied callback/receiver can arm that permit.

## Literal tick model (implementation acceptance, not spec step counts)

All locations below are line1. No entry/session/permit/reference resolution tick.
One statement or expression entry tick; reference capture itself does not tick,
but evaluates member base/key with their normal ticks. Direct identifier/member
callee capture does not add an evaluate(callee) tick. Every entered statement or
expression then checks depth; no depth increment if its tick failed. Existing
array slot and builtin loops keep their accepted ticks. Calls check calls>=limit
without tick, increment for the body, then restore. Existing record setup helpers
keep all ticks. No declaration execution tick beyond its statement entry.

Fresh root `"use strict";1;`: columns `[1,1,14,14]`, all no mutation.
Root `"use strict";this.a=1;`: `[1,1,14,14,14,19,21]`; a absent after successful
prefixes0..6; a1 after7. Any failing tick retains the shorter prefix state.

GDI prefix D for the following function fixtures is
`[23,23,23,23,14,23]`: check var, reverse select, scan var, before materializer,
M allocation, publish. Prefixes0..4 f absent/no allocation;5 F/P allocated but
f absent;6 global f published W/E/C=true/true/false. D2 is not transactional.
Then directive statement/expression and function declaration statement add
`[1,1,14]` (D+these =9). Function declaration returns empty.

| Trace | Complete literal source | Full ordered columns | Result at sufficient budget |
|---|---|---|---|
| Q | `"use strict";function f(){return 7;}f();` | `[23,23,23,23,14,23,1,1,14,37,37,14,27,34]` | normal7 at14 ticks; tick12 allocates activation, empty FDI adds0;13 return statement,14 operand |
| G | `"use strict";function f(){}f.arguments;` | `[23,23,23,23,14,23,1,1,14,28,28,28,30]` | actual getter TypeError after13, call count briefly+1, no additional tick |
| W | `"use strict";function f(){}f.arguments=(this.effect=7);` | `[23,23,23,23,14,23,1,1,14,28,28,28,30,41,41,46,53]` | effect7 then setter TypeError after17; effect absent through prefix16 |
| K | `"use strict";function f(){}f.arguments+=(this.effect=7);` | `[23,23,23,23,14,23,1,1,14,28,28,28,30]` | getter TypeError after13; RHS never entered/effect absent |

The expanded arrays are frozen now in `restricted-traces.json`: all four targets
for read, set and compound, plus typeof. All assignment variants include the
literal `let k="caller";` from F06; G/W/K above are additional minimal controls.
`freeze-traces.mjs` records source-position arithmetic only; it neither parses
nor runs source. Future driver copies these literal arrays before implementation,
never learns them from the evaluator. Variable-key source includes its let setup,
and typeof adds the unary entry tick. Each trace assertion includes event kind
and source record, not just columns; equal columns do not prove operation order.

For every explicit N-tick trace here and inherited setup trace, budgets0..N-1
fail with resource steps at budget+1 and exactly the state after budget successes;
budget N reaches the stated normal/diagnostic result. Repeat after seed steps7
with limits7+budget: count is8+budget, not budget+1. Every engine execution prefix
uses real resource limits, never host-sentinel tick injection. Separately retain
the inherited setup helpers' per-tick host/guest injection tests with supplied
host contexts; these are not integrated execution claims. Host-sentinel execution
cleanup uses the reachable real callbacks in A10, not arbitrary setup ticks. Also
test limit N-1 with nonzero calls/depth established by real outer guest/builtin
calls, measuring before/after nested state; do not add a public seed/reset API.
Real nested entry costs are included in the seed, not silently subtracted.

An empty-block loop `"use strict";while(true){}` starts `[1,1,14]`, then repeats
`[20,25,25]` (test, block statement, block allocation). Empty BDI has0 ticks.
A16 therefore fails on B tick14, column25 (block statement), cumulative21;
the previous block's lexical state has already been restored. C fails at its
directive statement column1, cumulative22. Budget0 calls on G/W/K must return
calls resource at the actual accessor call, with W retaining effect7.

Historical copied matrices retain their original host-fault language. For E4,
R02's GDI/factory/block/FDI fault projections and setup-matrix P01 are the separate
host-helper injection lane above; actual execution requires every real resource
prefix plus reachable callback host faults. This clarification supersedes any
reading that requires injected host errors at all engine-owned ticks. Host
sentinels in real callbacks unwind expression/statement/block/function/root
frames; setup instructions without such a callback have resource-prefix coverage
and host-helper propagation evidence, not integrated arbitrary-host-fault coverage.

## Mandatory preservation and review limitations

This is no runtime/native result. New driver must expand every inherited X row,
every F05/F06 variant and all A01–A18 into explicit assertions; no placeholders,
skips or "covered by host inspection" for actual Script behavior. Existing guard
tests using arbitrary contexts remain negative after E4. Real engine-created
contexts gain permission only for the exact dispatcher call. Old48 gates and
212 records remain untouched; additive driver may expose compiler problems.
Retain failed builds, unexpected prefixes and any necessary bounded reduction.
