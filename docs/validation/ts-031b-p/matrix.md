# Frozen acceptance matrix

These are requirements, not measured results. Scope A=provenance/in-process
slice; B=driver/parent slice; C=deferred rule certification. Each row runs in
Node and native where it exercises engine/child code; parent/schema-only rows
run under Node with controlled child transports. C rows must remain unsupported
in A/B. In source cells, `\n` denotes a literal LF and `repeat` means exact string
generation, not guest execution. Default unit is `test/observation.js`; stage
test, harnessValidated=false. No row has Classification or counts as conformance.
Source rows use parser-observation unless body is explicit. A diagnostic's
historical text/location must remain unchanged; codes never derive from text.

## Parse and whole-source controls

| ID | Scope | Exact source/setup | Required outcome and assertions |
|---|---|---|---|
| P01 | A | empty string | normal; bodyEvaluated=false; no location |
| P02 | A | `let x; x = 2;` | normal; no Realm binding/output effects in parser mode |
| P03 | A | `1 = 2;` | unsupported parse.assignment-target at1:1; no body |
| P04 | A | `while(false) let x;` | unsupported parse.declaration-statement at1:14 |
| P05 | A | `while(false) { let x; }` | normal |
| P06 | A | `return 1;` | unsupported parse.return-context at1:1 |
| P07 | A | `function f(){return 1;}` | normal |
| P08 | A | `function f(x,x){}` | unsupported parse.duplicate-parameter at1:1 |
| P09 | A | `"use strict"; function f(x,x){}` | still unsupported duplicate-parameter at1:15; inert directive certifies nothing |
| P10 | A | `{function f(){} function f(){}}` | unsupported parse.duplicate-binding at1:17 |
| P11 | A | `let x; let x;` | unsupported duplicate-binding at1:8 |
| P12 | A | `function f(x){let x;}` | unsupported duplicate-binding at1:15 |
| P13 | A | `let x=1\n x;` | unsupported parse.expected-token at2:2, not certified missing-semicolon error |
| P14 | A | `let eval;` | unsupported parse.binding-identifier at1:5; sloppy valid neighbor remains unsupported |
| P15 | A | `let o={}; o.1;` | unsupported parse.property-name at1:13 |
| P16 | A | `let o={1:2};` | unsupported parse.object-key at1:8; valid ECMAScript need not be supported |
| P17 | A | `const x=1;` | unsupported parse.unexpected at1:1 |
| P18 | A | `function f(){return\n1;}` | unsupported parse.line-terminator at1:14; valid ASI neighbor not genuine error |
| P19 | A | `throw\n1;` | unsupported parse.line-terminator at1:1, even though invalid ECMAScript |
| P20 | A | `throw;` | unsupported parse.throw-expression at1:1 |
| P21 | A | `break;` | unsupported parse.loop-context at1:1 |
| P22 | A | `continue;` | unsupported parse.loop-context at1:1 |
| P23 | A | `delete x;` | unsupported parse.delete-identifier at1:1; strict/sloppy distinction deferred |
| P24 | A | `[...x];` | unsupported parse.array-spread at1:2 |
| P25 | A | `let o={__proto__:null};` | unsupported parse.prototype-literal at1:8 |
| P26 | A | `/*` | unsupported lex.indeterminate-comment at1:1 |
| P27 | A | `'a\nb';` | unsupported lex.indeterminate-string-newline at1:1 |
| P28 | A | single quote followed by `a` and EOF | unsupported lex.indeterminate-string-end at1:1 |
| P29 | A | `01;` | unsupported lex.leading-zero at1:1 |
| P30 | A | `1e2;` | unsupported lex.numeric-literal at1:1; valid exponent remains unsupported |
| P31 | A | `'\x41';` | unsupported lex.string-escape at1:1; valid escape remains unsupported |
| P32 | A | `1**2;` | unsupported lex.operator at1:2 |
| P33 | A | `let π=1;` | unsupported lex.character at1:5; valid Unicode identifier remains unsupported |
| P34 | A | `return 1; 1**2;` | lex.operator at1:12 preempts return candidate; no reparse |
| P35 | A | `1=2; const x=1;` | first parser error unsupported assignment-target; no claim suffix was audited |
| P36 | A | `'\x` ending at EOF | historical unterminated-string overwrite retained; rejection matches final diagnostic |
| P37 | A | `\r\nreturn 1;` | return-context at2:1; CRLF one boundary |
| P38 | A | U+2028 then U+2029 then `return 1;` | return-context at3:1 |
| P39 | A | `'` + U+2028 + `';` | normal; raw LS allowed in string |
| P40 | A | BOM then `1;` | lex.character at1:1; do not silently strip BOM |
| P41 | A | NUL then `1;` | lex.character at1:1; no truncation |
| P42 | A | `console.log('no'); const x=1;`, body mode | unsupported parse.unexpected at1:20; stdout empty, bodyEvaluated=false |

## Guards, runtime provenance and cleanup

Host setups use existing public evaluator operations at loc={line:7,column:9}.
Seeded depth/calls are test setup only, never child CLI arguments. Assert original
diagnostic/value/location identity for propagated sentinel completions.

| ID | Scope | Exact setup/action | Required outcome and retained state |
|---|---|---|---|
| R01 | A | source=`' '.repeat(100000)` | normal parse; no body |
| R02 | A | source=`' '.repeat(100001)` | source-units100001/100000, parse1:1 |
| R03 | A | source=`'//'+ '😀'.repeat(49999)` | 100000 UTF-16 units, normal; bytes differ from units |
| R04 | A | append one space to R03 | source-units100001/100000, not UTF-8 byte count |
| R05 | A | source=`'('.repeat(127)+'1'+')'.repeat(127)+';'` | parse-depth129/128 at1:128; statement contributes one depth |
| R06 | A | same with126 pairs | normal parse; max depth128 |
| R07 | A | source=`'{'.repeat(128)+';'+ '}'.repeat(128)` | statement parse-depth129/128 at1:129 |
| R08 | A | Evaluator(maxSteps=0); tick(loc) | steps1/0, diagnostic RangeError runtime7:9, steps1/calls0/depth0 |
| R09 | A | maxSteps=1; two tick(loc) | first normal; second steps2/1; no reset |
| R10 | A | depth=256,steps=4; evaluate literal at loc | evaluation-depth257/256, steps5, restored depth256; calls unchanged |
| R11 | A | depth=256,steps=4; statement empty at loc | same as R10 via statement guard |
| R12 | A | depth=256,maxSteps=0; evaluate literal | steps1/0 wins; depth256 unchanged |
| R13 | A | maxCalls=0; call real builtin at loc | calls0/0; builtin effect counter0; Realm unchanged |
| R14 | A | calls=64; call real builtin default maxCalls64 | calls64/64; no increment/Realm switch/effects |
| R15 | A | calls=63; builtin returns normal | builtin executes once; calls restored63, no resource record |
| R16 | A | calls=64; call number Value | engine-diagnostic TypeError noncallable wins; not resource |
| R17 | A | body `while(true){}` at actual defaults | steps100001/100000; calls/depth0 after unwind; no timeout under adequate parent deadline |
| R18 | A | body `function f(){f();} f();` actual defaults | calls64/64, runtime1:14; restored calls/depth0; native process alive |
| R19 | A | host builtin recursively calls itself via context.call, loc7:9 | actual default64 call limit64/64; original Realm restored; no host stack crash |
| R20 | A | parsed depth-safe host AST with257 nested evaluate entries | actual native evaluation-depth257/256; restored0; keep parser bypass labelled host setup |
| R21 | A | calls=2,depth=3,steps=5; foreign builtin returns marker | marker identity; caller Realm restored, calls2/depth3/steps5 |
| R22 | A | same foreign builtin throws host Error instance | same host Error escapes; Realm/calls/depth restored; no manufactured guest throw |
| R23 | A | same foreign builtin calls tick with maxSteps5 | steps6/5 preserved through call; Realm/calls/depth seeds restored |
| R24 | A | body `throw 'RangeError: call depth limit exceeded';` | guest origin/string; runtime1:1, constructor absent; never resource |
| R25 | A | body `throw {name:'TypeError'};` | guest object; constructor unsupported; no property reads or coercions |
| R26 | A | body `missing;` | engine-diagnostic ReferenceError; projected string throw, constructor absent, runtime1:1 |
| R27 | A | seed Realm global x; body `let x;` | runtime SyntaxError engine-diagnostic at1:1; bodyEvaluated=true, old binding/value retained |
| R28 | A | host array length descriptor value=-1 at loc | engine-diagnostic RangeError invalid array length; old length/elements retained; not resource |
| R29 | A | direct toNumber(object,loc) | unsupported-operation runtime.object-to-number; old TypeError Value/diagnostic preserved |
| R30 | A | direct toString(object,loc) | unsupported-operation runtime.object-to-string; no coercion hook called |
| R31 | A | map array with nonundefined constructor | unsupported-operation runtime.map-species; callback count0; length/Get effects already performed retained |
| R32 | A | map callback invalid and oversized length | callback TypeError precedes length RangeError; not guard |
| R33 | A | map sparse holes with maxSteps0 | first iteration steps1/0; no callback; original array unchanged |
| R34 | A | toPrimitive object, first context.tick exhausted | same resource completion propagates; no method Get/call after tick |
| R35 | A | body `let x=1; x=2; throw 'stop';` | x remains2; guest throw runtime1:15; no rollback |
| R36 | A | ten migrated manual test throws | same value/diagnostic/location and completion identities; explicit guest origin only |
| R37 | A | host output callback throws Error on console.log | host-fault, never throw/RangeError; prior guest effects retained |
| R38 | A | two observations with different new Realms | no binding/object leak; reset only by new Evaluator/Realm, not by projection |

## Driver/parent trust boundary

| ID | Scope | Exact setup | Required outcome |
|---|---|---|---|
| T01 | B | parser mode on `console.log('no');` | child normal, bodyEvaluated=false; stdout empty |
| T02 | B | body mode on `console.log('yes');` | normal, bodyEvaluated=true; stdout `yes\n` captured separately |
| T03 | B | guest prints JSON resembling full successful result | stdout only; cannot supply/replace result file |
| T04 | B | no result file with exit0 | host-fault protocol |
| T05 | B | truncated/multiple JSON documents | host-fault protocol, retain raw bytes |
| T06 | B | duplicate key including escaped equivalent | host-fault protocol |
| T07 | B | unknown field, mode or driverVersion | host-fault protocol |
| T08 | B | wrong nonce/unit/mode or stale prior attempt file | host-fault protocol; never reuse |
| T09 | B | result normal then exit70 | host-fault crash; normal discarded as terminal evidence |
| T10 | B | normal then deadline event | timeout overrides normal |
| T11 | B | child dies with signal/no record | host-fault crash; no source-derived diagnosis |
| T12 | B | combined output exactly1048576 bytes | no cap event; normal only if valid result and exit0 |
| T13 | B | next observed chunk raises total to1048600 | output resource count1048600/1048576; deliberate termination tracked |
| T14 | B | deadline and output cap both fired | timeout; raw cap count retained |
| T15 | B | unrelated crash precedes cap | host-fault crash |
| T16 | B | result payload65537 bytes, quiet guest | host-fault protocol; not output resource |
| T17 | B | read failure, bad arg count, bad mode | driver fault, exit70; no guest observation success |
| T18 | B | maxSteps/maxCalls each -1, NaN, fraction, overflow, empty | reject before Realm; driver fault; test each value separately |
| T19 | B | requested source/parse/eval caps differ from constants | parent rejects configuration before launch; no false Inputs |
| T20 | B | child attempts Identity/Inputs/process/hash/Classification field | protocol fault; parent never adopts field |
| T21 | B | mutate each parent Identity/Inputs field after planning | context mismatch; no accepted record |
| T22 | B | strict prefix + `return 1;` | location2:1 in transformed source; distinct original/transformed hashes |
| T23 | B | quotes, slash, CR/LF, NUL, lone surrogates in diagnostic | exact JSON roundtrip in both lanes; zero dynamic coverage |
| T24 | B | parser-observation non-strict variant, no harness | accepted observation with false harnessValidated and no Classification |
| T25 | B | same false harnessValidated in conformance test stage | rejected; existing invariant preserved |
| T26 | B | observation claims loaded harness or harnessValidated=true | rejected, not proof of harness support |
| T27 | B | observation passed to appendAttempt/report | rejected; existing conformance ledger unchanged |
| T28 | B | all current33 files/60 variants per lane planning | zero execution/pass; all prior profile/harness blockers intact |
| T29 | B | change expectedNegative in child payload | extra field rejected; selection metadata unchanged |
| T30 | B | cancel parent before child closes | unfinished attempt retained; no terminal success |
| T31 | B | result path symlink/alias/preexisting | reject before launch; preserve prior file |
| T32 | B | constructor/name getters on thrown object have effects | not invoked; constructor unsupported; body effects only |

## Deferred certification and preservation

| ID | Scope | Control | Requirement |
|---|---|---|---|
| C01 | C | exact pinned S18 and separately named `let x; x=42;` neighbor | eventual assignment-target only after full source/context audit; currently unsupported |
| C02 | C | S19 and braced while-body neighbor | eventual lexical-declaration-statement only for let declaration; function/Annex B excluded |
| C03 | C | S20 and return inside function neighbor | eventual return-outside-function only for Script context; no wrapper |
| C04 | C | S21 and distinct parameters; unprefixed duplicate counterpart | strict context required; sloppy counterpart unsupported, never certified |
| C05 | C | S22 and different names; top-level duplicate functions | strict block required; top-level/Annex B counterparts excluded |
| C06 | C | `[a]=b;`, `({a:1}=b);`, `f()=1;` | no broad non-reference AST certification |
| C07 | C | valid neighbors with late unsupported lex token or grammar | unsupported whole-source outcome; no edited-body evidence |
| C08 | C | source negative metadata swapped/null | engine tag selection unchanged; expected result cannot select rule |
| V01 | A/B | existing211 guest names/expectations,32 build entries | exact preservation plus additive cases/gates only |
| V02 | A/B | human CLI usage/file/-e/throw/parse/host-fault cases | unchanged status/output/filename/location; disk-file lane included |
| V03 | A/B | typecheck, runner, probes, all rebuilt guests | pass in both hosts; all old gates and additive gates zero dynamic |
| V04 | A/B | construction-site and caller inventory regeneration | every producer covered; required origins cannot be silently omitted |

Total: 124 distinct rows (P42 + R38 + T32 + C8 + V4). Multi-value rows explicitly
require each value, not a representative sample. A later implementation must map
every applicable ID to assertions, retain failures and request review for oracle
changes rather than adjusting runtime budgets to make rows pass.
