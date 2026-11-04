# TS-034H2-P: strict Script switch contract

Design for independent review, 2026-11-04, base `b8baf44`; H1 corrected
`80ceea0` is the semantic baseline. Nothing here implements or executes switch.
The [audit and frozen controls](validation/ts-034h2-p/README.md) distinguish
source evidence from future Node/native acceptance. H2 remains unassigned until
actual and independent second design review. No harness/corpus admission.

## Exact implementation boundary

Production ownership remains **only** `src/syntax.ts`, `src/parser.ts`,
`src/script-declarations.ts`, `src/script-execution-internal.ts`. Use the existing
shared evaluator, `equal`, `ScriptStatementCompletion`, `updateScriptEmpty`,
BlockActivation, materializeFunction and Script environments. No facade,
runtime/completion/environment/Realm/lexer changes are needed by this design.
An actual exhaustive-consumer/compiler failure outside these files is a stop:
retain the failure and request an exact amendment before editing. Do not add a
second interpreter, expose nodes, or invent a public switch API.

Future nonproduction ownership: new `test/harness-switch.ts`,
`fixtures/harness-switch/`, one additive `tools/build-native.mjs` entry, scoped
feature inventory/task status, and new implementation evidence directory.
The exact two-site existing-test migration below is a **proposal requiring
coordinator review**, not permission from this design to edit old tests.
Coordinator retains COORDINATION. Preserve all historical files, C++, toolchain
pins, 212 records/lane, 50 existing gates, all 60 blocked variants, public CLI,
observation/driver/classification schemas and legacy profiles.

## Original syntax, parser and plan identities

Add these types in syntax.ts (field names and representation frozen):

```ts
type SwitchClause = { loc: Location; start: number; end: number;
    test: Expr | null; body: Stmt[] };
type CaseBlock = { loc: Location; start: number; end: number;
    clauses: SwitchClause[]; body: Stmt[] };
type SwitchStmt = { kind: "switch"; loc: Location; discriminant: Expr;
    caseBlock: CaseBlock };
```

Add SwitchStmt to Stmt. `null` test means default, at most once. The CaseBlock
is one original parser-owned object, not a synthetic BlockStmt. Its `loc/start`
are the opening brace and `end` is just after the closing brace. Clause spans
run from case/default keyword through its last statement, or through colon if
empty. `body` is a single parser-created flattened array of the **same original
statement references**, in clause order. It is metadata for collection/validation,
never a separate execution body. Empty clauses and repeated selector values
are valid; statements before the first clause and a second default reject.

Only `purpose === 'declaration-plan'` parses switch. Legacy parse and
return-audit remain unchanged, including exact previous diagnostic behavior.
Use the ordinary expression parser for discriminant/selectors, `statement()`
for clause StatementList items, and the existing depth128/source100000 guards.
Clause loops must stop on case/default/closing brace/EOF or parser failure;
never loop without consuming input. A default requires colon directly. Required
semicolons and all current unsupported expressions remain required/unsupported.
Whole source, including unreachable clauses and nested functions, must parse.

Add `switches` nesting counter separate from `loops`: break is permitted when
loops>0 OR switches>0, continue only when loops>0. Save/reset/restore **both** in
functionTail for declarations and expressions. Count a switch while parsing its
clause bodies, not its discriminant. Labels remain unsupported; no target field
or certified early-error code is introduced. Invalid forms retain existing
`parse.expected-token`, `parse.expression`, or `parse.loop-context` unsupported
classification as appropriate; multiple default uses `parse.expected-token`.

Add `switch` to both DeclarationScope.kind and MutableScope.kind; catchParameter
is null, formals empty. Keep DeclarationNodes.scopes' existing
`{node: Stmt | Expr | null, body: Stmt[]}` shape: associate switch scope with
the **original SwitchStmt**, and `body === node.caseBlock.body`. Private scopes
maps original switch owner to scope ID, not coordinates or cloned ASTs.

Collector order is frozen: enqueue a new `switch` Work item, then the discriminant
expression in the surrounding scope (LIFO visits it first). That Work item
creates the CaseBlock scope with surrounding parent/strictness/range, registers
the original owner, schedules block-end var propagation, then visits each clause
in source order: its selector expression in switch scope, then its statements in
that same scope. Reverse-push this work to preserve preorder IDs. Nested functions
in discriminant belong to the outer scope; functions in selectors belong to the
CaseBlock scope. No per-clause scope and no extra ordinary block scope.
Unchanged sources retain identical scope/declaration IDs.

Treat direct function declarations in switch exactly like strict block functions
in `declare` and unsupported-sloppy-function detection: lexical, created before
any selector, capturing the shared CaseBlock environment. lets likewise share
one scope and begin uninitialized. Vars from all clauses, including nested
blocks/catches, propagate with existing block-end logic through the switch to
the nearest variable scope; stop at functions. Nested block lexical declarations
stay in their block. Existing conflict pass therefore detects cross-case
duplicate let/function and lexical-versus-var conflicts across all branches.
No new Annex B allowance. Whole unsupported tail vetoes conflict certification.

Before retaining executable state, preparation additionally verifies each switch
entry: exact owner and flattened body alias, unique owner/map key, kind switch,
parent and inherited strictness, empty formals/null catchParameter, brace range,
clause ranges ordered and contained, at most one null test; flattening all clause
bodies yields exactly the retained body references in order, with no missing or
duplicated entries. Validate child scope parent/ranges using collector ownership;
keep function source identity, declaration association and H1 catch-child checks.
Execution uses scopeOfNode(originalOwner), never a search by Location.
Detached inspect() already copies scope metadata; extend kind naturally and
leave no CaseBlock/clauses/body references in inspectNodes(). Its switch entry
has owner keyword loc, flattened bodyLength, empty parameters and null function
source fields. Mutation of inspected arrays/locations cannot change execution.

## Setup and evaluation

Broaden private `#block(scopeId)` to recognize **either** original block or
original switch scope with the corresponding exact body association. Return
`{scope,node,loc}` where loc is block.loc or switch.caseBlock.loc. Only the
allocation caller changes from entry.node.loc to entry.loc. Reuse
createBlockEnvironment/instantiateBlock and existing one-use owner/scope-bound
BlockActivation. Do not weaken catch/function validation or accept arbitrary
scope kinds. Existing block ordering/ticks stay identical.

The Script switch arm performs these steps:

1. Existing #statement charges switch keyword and evaluation depth. Evaluate
   discriminant once via #value, including GetValue, in the **outer lexical
   environment**. A throw exits immediately, before CaseBlock allocation.
2. Resolve original owner scope; createBlockEnvironment charges brace Location
   once before allocation, even for an empty switch. Save the full outer frame.
   Install frame copy with CaseBlock scopeId and lexical activation; all other
   fields including variable, record, Realm, this, function and body phase remain.
   In host try/finally, instantiateBlock performs existing ordered binding setup:
   one tick at each name before create; function materialization tick at function
   keyword, then initialization tick at name. let has no initialization tick
   until ordinary declaration evaluation (which itself adds no setup tick).
   Capture setup throws **before** restoring the frame. Finally always restores
   the original frame, including host exceptions and partial setup.
3. Search clause tests in source order, skipping default, using #value and
   `equal(discriminantValue, selectorValue)` (runtime.ts strict comparison).
   Stop at first match. Remember the default index; if nothing matches, start
   there, or complete undefined if absent. This is equivalent to the specified
   two-region algorithm: when a pre-default case matches, no later selector is
   evaluated; otherwise post-default tests run before default's body. Do not
   evaluate remaining tests after a match or when falling through. No coercion,
   SameValue, selector reevaluation, extra clause/default/comparison ticks, or
   guest callbacks for bookkeeping.
4. From selected index through the last clause, run each original clause body
   via shared #list. Start V as value(undefined). For each result use
   updateScriptEmpty(result,V); nonempty normal payload becomes V. Return an
   abrupt result immediately, with its carried value. Consume only unlabeled
   break into normal(payload); all current breaks are unlabeled. A nested loop
   or switch consumes its own break before this arm sees it. Continue propagates
   to the enclosing loop; return and **exact original ThrowCompletion** propagate.
   If all bodies finish, normal(V). Empty switch, no match, bare break, empty
   clauses and declaration-only body all normalize to undefined, never inherit
   the preceding outer statement's value. Across clause boundaries, a preceding
   value survives an empty clause/break/continue.

The private active-throw marker is **not** cleared by switch entry, search,
break, normal completion or restoration. Only H1's caught-language-throw
consumption resets it; lastAbrupt history remains. Resource and unsupported
throws remain uncatchable, host faults remain host faults. Capture at defining
source before unwinding, including calls into another Realm; no replacement
completion or diagnostic string interpretation. CaseBlock setup remains phase
body, not global/function instantiation. Calls/depth/frame/Realm/builtin permit
restore on every exit; steps, materialization counts and visible effects do not
roll back. No hidden test hook or publication of partial activation is added.

## Frozen semantic controls

All rows prepend exact `"use strict";` unless explicitly saying otherwise.
`out` is a trusted recorder returning undefined, `mark(x)` records x and returns
the identical Value. They are test hosts, never corpus shims. Run every row for
both runtime inputs on both hosts; assert Values/identities, phases and provenance,
not just equal stdout. These are expected results, not observed execution.

| ID | Literal source | Required result |
|---|---|---|
| S01 | `switch(2){case 1:out(1);break;case 2:out(2);case 3:out(3);}` | out 2,3; normal undefined |
| S02 | `switch(9){case 1:out(1);break;default:out(4);}` | out 4 |
| S03 | `switch(mark(2)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}` | trace 2,1,2,33,44 |
| S04 | `switch(mark(1)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}` | trace 1,1,11,22,33,44; no later selectors |
| S05 | `switch(mark(9)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}` | trace 9,1,2,3,22,33,44 |
| S06 | `switch(1){case '1':out(9);break;case 1:out(1);break;}switch(NaN){case NaN:out(9);break;default:out(2);}switch(-0){case 0:out(3);}` | 1,2,3; strict comparison |
| S07 | `let a={};switch(a){case {}:out(9);break;case a:out(1);break;}switch(null){case undefined:out(9);break;case null:out(2);}` | 1,2; exact object identity/no coercion |
| S08 | `let x=2;switch(x){case 2:let x=7;out(x);}out(x);` | 7,2; discriminant sees outer x |
| S09 | `let x=2;switch(2){case x:let x=7;out(9);}` | engine-diagnostic ReferenceError at case x; no out (provisional string until H6) |
| S10 | `switch(1){case 1:out(x);break;case 2:let x=7;}` | ReferenceError, no out; shared cross-case TDZ |
| S11 | `switch(1){case 1:let x=7;case 2:out(x);}` | 7; initialization survives fallthrough |
| S12 | `switch(f()){case 2:out(f());break;default:function f(){return 2;}}` with outer host f returning 2 | out 2; outer f discriminant called once; selector/body sees inner guest f |
| S13 | `switch(f()){case 2:out(f());break;default:function f(){return 2;}}` without outer f | ReferenceError before allocation/materialization |
| S14 | `switch(2){case f():out(1);break;default:function f(){return 2;}}out(typeof f);` | 1,'undefined'; function from unselected default initialized before selector |
| S15 | `out(x);switch(9){case 1:var x=7;}out(x);function f(){out(y);switch(1){case 1:var y=11;}return y;}out(f());` | undefined,undefined,undefined,11; GDI/FDI hoist; no untaken initializer |
| S16 | `let saved;switch(1){case 1:let x=7;saved=function(){return x;};break;}out(saved());` | 7; closure retains CaseBlock; no global x |
| S17 | `switch(1){case 1:{let x=7;out(x);}case 2:{let x=11;out(x);}}` | 7,11; nested scopes independent |
| S18 | `let n=0;while(n<2){n+=1;switch(n){case 1:continue;case 2:break;}out(n);}out(n);` | 2,2; continue targets loop, break exits switch |
| S19 | `switch(1){case 1:while(true){break;}out(1);switch(2){case 2:break;}out(2);break;default:out(9);}` | 1,2 |
| S20 | `function f(){switch(1){case 1:return 7;default:return 9;}}out(f());` | 7 |
| S21 | `let x={};try{switch(1){case 1:throw x;}}catch(e){out(e===x);}out(2);` | true,2; exact thrown Value reaches H1 |
| S22 | `try{switch(1){case 1:while(true){}}}catch(e){out(9);}` | resource steps bypasses catch; no9 |
| S23 | `switch(mark(1)){case fail():out(9);default:out(8);}` | trace1 then exact host-provided throw from fail; no8/9; no later selector |
| S24 | `switch(1){case 1:out(1);case fail():out(2);}` | 1,2; fail never called |
| S25 | `switch(1){case 1:out(1);break;case 1:out(9);}` | 1; duplicate selector legal |
| S26 | `9;switch(1){}` / `9;switch(1){case 2:7;}` / `9;switch(1){case 1:break;}` | each normal undefined |
| S27 | `switch(1){case 1:7;case 2:;break;}` / `switch(1){case 1:7;default:break;}` | each normal number7 |
| S28 | `switch(1){case 1:7;case 2:let x;}` | normal7; empty declaration preserves value |
| S29 | `let n=0;while(n<1){n+=1;switch(1){case 1:7;continue;}}` | normal7; UpdateEmpty carries through continue/loop |
| S30 | `switch(1){default:7;case 2:11;break;}` / `switch(2){default:7;case 2:11;break;}` | each normal11; default-first search |

Run S07 also with host-seeded same versus distinct symbols and objects with
throwing conversion callbacks: matching uses identity and calls no conversion.
Run S16's saved function from another strict Script in same Realm and from a
different Script Realm via established transfer: number7, original source text,
function/prototype Realm and scope retained. No new host accessor surface.

| ID | Literal rejected source (strict prefix) | Boundary |
|---|---|---|
| N01 | `switch(1){case 1:let x;case 2:let x;}` | duplicate-lexical |
| N02 | `switch(1){case 1:function f(){}default:let f;}` / `switch(1){case 1:function f(){}case 2:function f(){}}` | duplicate-lexical |
| N03 | `switch(1){case 1:let x;case 2:var x;}` / `switch(1){case 1:let x;default:{var x;}}` | lexical-var |
| N04 | `switch(1){default:;default:;}` / `switch(1){1;}` / `switch(1){case :;}` / `switch(1){case 1;}` | malformed whole unit; unsupported, no new certified rule |
| N05 | `switch(1){case 1:continue;}` / `switch(1){case 1:function f(){break;}}` / `while(true){switch(1){case 1:function f(){continue;}}}` | context reset/rejection; no execution |
| N06 | `switch(1){case 1:break label;}` / `label:switch(1){case 1:break label;}` | labels unsupported |
| N07 | `switch(1){case 1:let x;let x;default:const y=0;}` / `switch(1){case 1:break;default:class X{}}` | unsupported tail vetoes whole certification |
| N08 | `switch(1){case 1:return 7;}` / `switch(1){case 1:try{}finally{}}` / `switch(1){case 1:x++;}` | existing unsupported contexts/features retained |
| N09 | `try{}catch(e){switch(1){case 1:var e;}}` | H1 unsupported catch-var collision survives propagation |
| N10 | unprefixed `switch(1){case 1:function f(){}}` | non-strict block-function planning unsupported; no Annex B |

Each rejects before effects/record creation/session ticks. N01–03 are existing
planner conflict records, **not** public certified SyntaxError rule admission.
Positive neighbors: nested `function f(){var x;}` does not conflict with outer
CaseBlock let x; separate nested blocks may each declare x; `while(true){switch(1){case 1:break;}break;}` is valid; a function containing its own switch/break is valid.

## Cleanup, provenance and inherited boundaries

New host controls X01–X05 are mandatory alongside the literal rows:

* X01: fail() in discriminant, selector, and selected body separately returns
  the same preallocated guest throw (Value object identity, diagnostic Location
  900:9). Verify exact completion object escapes and lastAbrupt points to the
  defining source/Realm where callback was invoked, with copied 900:9. Repeat
  as engine-diagnostic, resource and unsupported origin; only first two may
  enter surrounding H1 catch. No later selector/body effects.
* X02: use H1 C14 unchanged, plus A `"use strict";try{switch(1){case 1:fail();}}catch(e){}`
  then call B's function defined by `"use strict";function again(){switch(1){case 1:fail();}}`.
  Both callbacks return that exact same completion. After catch A history is A;
  final B throw is still same object/Value/Location but provenance B/defining
  Realm B. Run same-Realm two-record and cross-Realm variants. Switch never clears
  history or masks H1 consumed-identity reset.
* X03: replace fail in X01 with a reachable host callback throwing exact host
  sentinel, including nested active session B unwinding to still-active A.
  Assert sentinel identity, no guest catch, exact enclosing active snapshot
  restored inside A and idle after exit; saved authentic callbacks/permits still
  enforce E4 guards. This is callback fault evidence, not arbitrary tick injection.
* X04: direct trusted-host legacy evaluation of a SwitchStmt must throw exact
  `Script switch AST requires Script execution` before discriminant/body effects.
  Retain exact legacy var diagnostic and H1 try-catch guard as separate arms.
  Legacy parser/return audit still reject switch, including inside dormant bodies.
* X05: copied inspect()/inspectNodes() metadata mutation does not alter source,
  scope IDs, selector results, closure source/Realm or original associations.
  Retain existing foreign-record/environment/freshness rejection helpers; no
  public CaseBlock setup accessor is added to test unpublished state.

The [prefix table](validation/ts-034h2-p/prefixes.json) freezes all locations,
fresh/seven-seeded limits and selected source strings. No implementation-derived
expectations. Preserve H1 all104 prefixes, C14 and all E4/E3/ER/source/reference
controls. Keep source cap100000, parse depth128, default steps100000, calls64,
evaluation depth256. Parse depth/resource and source-size failures remain
separate from language errors, with no executable record. Nested switch uses
ordinary statement depth; prefix failure checks cannot claim unpublished state
was externally observed.

## Exact old-assertion migration proposal

The bounded tracked source inventory finds one active guest switch-negative:
`test/script-execution.ts:852` includes exact `"use strict";switch(1){}`.
Propose replacing **only that element** with
`"use strict";switch(1){default:const x=0;}` (unsupported dormant grammar), and
adding `{ id: "H2-empty", source: '"use strict";switch(1){}', expected: undefined }`
to its existing scalar `cases` array. Preserve labels, all other rows/assertions,
H1-empty and its finally-negative migration. Proposed exact patch is retained
in the owned evidence directory; no old test is edited here.

Historical H1 `preserve.mjs` and `legacy-diagnostic/preserve.mjs` each reconstruct
the entire old E4 file and embed the old switch line; they will intentionally
fail after an approved H2 amendment.
Do not edit/rebaseline that historical verifier or its old results. The new H2
preservation verifier must compose the exact two H2 edits against **this base**,
check the entire E4 file, and retain H1's earlier approved two-site change.
Historical docs/audit snapshots recording switch unsupported remain history.
Host-language switch statements in tests/tools are not guest negative assertions;
legacy C++ switch tests are untouched. No blanket exemption for a whole test file.

## Acceptance and sources

Two actual post-compilation runtime input files are frozen in
`validation/ts-034h2-p/input-seven.js` and `input-eleven.js`; file contents are
the entire strict guest source, not markers. Seven selects case7 and records7;
eleven misses it, searches the later case11 and records11, skipping default.
Both lanes must read these bytes after compilation, execute them, then all fixed
controls; compare literal outputs and hash inputs before either run. Do not
substitute a precompiled source or choose a host-only expected marker.

Implementation acceptance requires new Node/native switch driver, fresh native
build under unchanged static-only flag and separate zero-dynamic coverage,
212 unchanged records/lane, all50 prior gates plus one additive gate, affected
E4/E3/ER/declaration/reference/metadata and H1 replays, typecheck, runner20,
probes10, host73, observations22 and 60blocked preservation. Reduce/retain new
compiler failures before any workaround or scope expansion. Design audit and
Node reference behavior cannot satisfy those runtime gates. Stop for actual
and second review after a coherent implementation; no successor/main merge.

Normative source: [ECMA-262 edition16 §14.12](https://262.ecma-international.org/16.0/#sec-switch-statement),
CaseBlockEvaluation/CaseClauseIsSelected, §14.2.3 BlockDeclarationInstantiation,
IsStrictlyEqual and UpdateEmpty; full edition SHA256
`6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.
BreakableStatement evaluation supplies unlabeled-break normalization; it is
implemented locally in the switch arm because Rift has no separate wrapper.

Engine reference: [engine262 SwitchStatement.mts at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/SwitchStatement.mts),
lines26–34 strict selector comparison,42–179 default search/value carry,
189–199 discriminant-before-environment, and same revision Block.mts13–45
lexical/function setup. Retained source/lines/hashes/license in upstream.json.
Adopt semantic ordering, not generator architecture or post-edition disposable
resource features. Rift uses explicit completions and host finally restoration;
the simple search-then-fallthrough algorithm above is an intentional equivalent
for this synchronous subset. No upstream implementation code is copied into core.
