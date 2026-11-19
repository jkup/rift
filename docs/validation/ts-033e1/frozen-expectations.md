# E1 frozen interface and literal controls

Frozen before production changes, 2026-11-03, base d81840f.

`prepareStrictScript(unit, realm): ScriptPreparation` returns `ready` with an
opaque ExecutableScript, `profile-rejected` (reason `realm` or `strict`), or the
existing `blocked`/`conflict` planner result. Realm rejection precedes reading
source; parsing/EOF/conflicts precede strictness. No ticks or guest allocations.
Only preparation constructs a record: no caller-supplied body/plan constructor.
`record.belongsTo(realm)` checks exact owner identity. `record.inspect()` returns
a detached complete plan. `record.inspectNodes()` returns detached flat scope
and declaration associations (IDs, node kind, location, body length, parameters,
function range/text); no AST, maps or executable consumer export. Each ID is
interpreted only with its record. Private storage retains original body and nodes
from the same parse/iterative collector. No recursive walk, clone or reparse.

P01: `"use strict";function f(a){return a;}` length37, function[13,37),
formal a[24,25), scope1 parent0 inherited strict, root body2/function body1.
Mutate original unit and all snapshot nested arrays/sites/locations/directives;
subsequent inspection retains original values. Equal text in Realm B is independent.
P02: `"use strict";var x; function f(){const tail=0;}` blocked; removing
`const tail=0;` ready. `"use strict";let x;var x;` conflict lexical-var.
P03: empty source profile-rejected/strict; `"use strict";` ready/body1.
P04: `"use strict";let f=function(){return 1;};let g=function(){return 2;};`
functions scopes1/2, declarations null/null, inherited strict true/true,
ranges[19,40)/[47,68), distinct nodes; both root lets IDs0/1.
P05: `"use strict";let x;let x;const tail=0;` blocked before conflict;
tail-free duplicate-lexical; no arbitrary executable-state constructor.
U01: `"use strict";function f(){throw 7;}` in include:0/include:1 and
repeated equal ID/text produces distinct records with original unit/ranges.
Nested duplicate named functions and anonymous functions map by scope IDs, not
names; nested blocks map to original nodes and inherited strictness.

R06: strict directive plus99987 spaces length100000 ready; one more space
source-size resource count100001/limit100000. Existing D1 block/parenthesis
depth126/127/128/129 and 15000 binary/member/call chains are replayed unchanged;
preparation tests the same chains without recursive cloning. Legacy Realm plus
invalid/oversize source rejects realm first. Sloppy valid source rejects strict;
sloppy malformed/tail/conflict source keeps parse result. Reserved eval/arguments
in unreachable functions blocked. Input files seed|7 and other|11 are consumed
after compilation and affect names/function source; literal expectations are
independent of record/plan output. All controls run in Node/native.
