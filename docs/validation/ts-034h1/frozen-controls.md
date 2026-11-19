## H1 interface and literal acceptance

The [H1 review correction](validation/ts-034p/h1-correction.md) is normative for
the exact original-node associations, catch activation/phase/tick sequence,
consumed-propagation reset, C14 same-completion regression, frozen14/14/5/15 tick
prefixes and declaration/nesting controls D01–D10. It supersedes the original
de90653 deferral of tick placement to implementation. No H1 assignment is ready
until this correction passes independent review.

Represent the new node as `{kind:'try-catch', loc, block, parameter, catchLoc, catchStart, catchEnd, handler}`;
both blocks retain original nodes/source spans. Record a catch lexical scope
with one mutable initialized binding and a nested handler Block scope. Plan var
declarations in both arms into the enclosing variable scope, stopping at nested
functions. Include the catch parameter in lexical conflict checks (reject
`catch(e){let e;}`); var collision/Annex B cases stay explicitly unsupported
until audited. Reset catch/loop context across nested functions. No new public
body/AST accessor. Extend inspection copies only with inert scope metadata.

Extend DeclarationScope.kind with `catch` and a separate nullable catchParameter
site (do not pretend it is a formal or ordinary let declaration). Preserve all
existing scope IDs for unchanged source. Associate the original catch node with
its scope privately, validate that association during record preparation, and
materialize the catch environment only on entry. Update private scope validation
and detached inspection copying together; legacy evaluator must explicitly reject
new Script-only nodes if a trusted host supplies one. If exhaustive union changes
require an additional consumer outside these four files, stop for an exact
ownership amendment; do not silently broaden H1.

The shared Script statement evaluator evaluates block once. Only a **language
throw** enters catch: guest throws and genuine engine language failures; current
engine-diagnostic string values remain visibly provisional until H6. Resource
limits and unsupported-operation completions bypass guest catch; host exceptions
escape unchanged. Create/initialize catch binding with the identical thrown Value,
evaluate handler, apply TryStatement UpdateEmpty to undefined. Restore lexical
environment/frame in host finally for every exit. Consume the private active
propagation identity before the first catch setup tick, retaining lastAbrupt
history; a later throw, including the same completion object, captures its actual
source. The correction's C14 distinguishes source record from diagnostic Location.

All following controls are future literal expected results, not measurements.
Prefix H1 sources with literal `"use strict";`; `out` records Values via trusted
host setup and is not a corpus shim. Dedicated test host compares exact identity,
completion, source location, counters and effects, not stdout agreement alone.

| ID | Literal source / host setup | Required result |
|---|---|---|
| C01 | `try { throw 7; } catch (e) { out(e); }` | one number7; normal undefined completion |
| C02 | `try { out(1); } catch (e) { out(9); }` | only1; catch not created |
| C03 | `let e=3; try { throw 7; } catch(e) { out(e); } out(e);` | 7,3; no catch binding leakage |
| C04 | `let x={}; try { throw x; } catch(e) { out(e===x); throw e; }` | true then exact x thrown; catch source location, retained x identity |
| C05 | `function f(){try{return 5;}catch(e){return 9;}} out(f());` | 5; return is not caught |
| C06 | `try { throw 7; } catch(e) { let e; }` | unsupported/early-error only under separately audited rule; no effects, no false certified tag |
| C07 | `try { throw 7; } finally { out(9); }` | unsupported whole unit; no effects |
| C08 | `try { while(true){} } catch(e) { out(9); }` | steps resource origin; no9, counters restored, steps retained |
| C09 | host `fault()` throws exact host sentinel; `try { fault(); } catch(e) { out(9); }` | same host sentinel escapes, no9, session idle afterward |
| C10 | `try { throw 7; } catch(e) { out(8); } throw 9;` | only8 then guest9, last source is final throw, not caught7 |
| C11 | `while(true){try{break;}catch(e){out(9);}} out(1);` | only1; break propagates |
| C12 | `let n=0; while(n<2){n+=1;try{continue;}catch(e){out(9);}out(8);}out(n);` | only2; continue propagates |
| C13 | `function f(){try{throw 7;}catch(e){return function(){return e;};}} out(f()());` | 7 after catch environment exits; closure retains binding |

The correction freezes catch setup/body tick placement and all fresh/seven-seeded
prefixes for normal, rethrow, untaken catch and closure creation. Retain
C01/C04/C13 and their cross-unit/cross-Realm semantic controls. Exhaustion before
binding publication must not publish it. Retain source cap100000, parse depth128, step default100000,
call depth64/evaluation depth256. Also test empty completion normalization
`1; try {} catch(e) {}` yields undefined, and `try { 2; } catch(e) {}` yields2.
Host fault injection belongs only at reachable callbacks, separately labeled
from resource exhaustion and inherited host-helper injection lanes.
