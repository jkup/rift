# Proposed return-coverage prerequisite: literal acceptance matrix

These are future assertions, **not measured results**. None emits syntax-error.
`complete[n]` means EOF in the one-exception audit grammar and n candidates;
`blocked(code)` means no coverage certificate. Public means the existing
`parse(source)` outcome, which must be preserved. Run every row on both lanes.
For complete rows consumedUnits = source.length; offsets are UTF-16 units.

| ID | Literal source / construction | Internal audit | Public outcome |
|---|---|---|---|
| F01 | `return 1;` | complete[1], span [0,6), location 1:1 | unsupported parse.return-context |
| F02 | `"use strict"; return 1;` | complete[1], span [14,20), location 1:15 | unsupported parse.return-context |
| F03 | `function f(){return 1;}` | complete[0] | normal |
| F04 | `{return 1;}` | complete[1], span [1,7), location 1:2 | unsupported parse.return-context |
| F05 | `function f(){} return 1;` | complete[1], span [15,21), location 1:16 | unsupported parse.return-context |
| F06 | `return 1; return 2;` | complete[2], spans [0,6), [10,16) | unsupported parse.return-context at 1:1 |
| F07 | `return 1; function f(){return 2;}` | complete[1], span [0,6) | unsupported parse.return-context |
| F08 | `return 1; class C {}` | blocked(parse.unexpected) at class, no eligibility | unsupported parse.return-context |
| F09 | `return 1; ` followed by a backtick-delimited `late` and `;` | blocked(lex.character) | unsupported lex.character |
| F10 | `return 1; /x/;` | blocked(parse.unexpected) | unsupported parse.return-context |
| F11 | `return 1; let x = ;` | blocked(parse.unexpected) | unsupported parse.return-context |
| F12 | `return 1; function f(){` | blocked(parse.expected-token) | unsupported parse.return-context |
| F13 | `return 1; [a]=b;` | blocked(parse.assignment-target) | unsupported parse.return-context |
| F14 | `return 1; function f(a,a){}` | blocked(parse.duplicate-parameter), even though valid sloppy function | unsupported parse.return-context |
| F15 | `return 1; while(false) let x;` | blocked(parse.declaration-statement) | unsupported parse.return-context |
| F16 | `return 1; "unterminated` | blocked(lex.indeterminate-string-end) | unsupported lex.indeterminate-string-end |
| F17 | `return 1;` + 129 opening braces + 129 closing braces | blocked resource parse-depth, count129 limit128 | unsupported parse.return-context |
| F18 | `return 1;` + 99,992 spaces (100001 units total) | blocked resource source-units, count100001 limit100000 | resource source-units, same count/limit |
| F19 | `return 1; /* tail */` | complete[1], consumedUnits20 | unsupported parse.return-context |
| F20 | `function f(){return` + LF + `1;}` | blocked(parse.line-terminator), no candidate | unsupported parse.line-terminator |
| F21 | `"return"; let o={return:1}; o.return;` | complete[0] | normal |
| F22 | `while(false){return 1;}` | complete[1], span [13,19) | unsupported parse.return-context |
| F23 | exact pinned S20 raw and strict variant | complete[1] each; location/span agrees with original bytes plus exact 14-unit strict prefix | unsupported parse.return-context |
| F24 | exact pinned S18/S19/S21/S22, original planned variants | blocked on their existing capability codes; no return certificate | existing eight-variant matrix (six here) unchanged |
| F25 | F01 repeated with expected-negative null / parse SyntaxError / runtime TypeError in parent metadata | internal result identical; metadata absent from audit signature | same return-context in all six parent/lane runs |
| F26 | `return 1;` + CRLF + `return 2;` | complete[2], second span [11,17), location 2:1 | unsupported parse.return-context at 1:1 |
| F27 | `let x; x=42;` | complete[0] | normal |
| F28 | empty source and separately whitespace/comment-only source | complete[0], consumedUnits equals actual length | normal |
| F29 | `return` + LF + `1;` | blocked(parse.line-terminator); no ASI expansion | unsupported parse.return-context (first failure) |

Prerequisite acceptance also requires:

- No call to a guest evaluator, no changed source string, no skipped tail, no
  parser recovery and no new fatal-rejection category invented from metadata.
- Every one of C01–C08 stays non-emitting, including complete return candidates;
  parser and body observation modes retain their baseline outcomes.
- Expected public locations/messages and guard provenance remain unchanged;
  fresh Realm/global/output state remains untouched by audit and parser modes.
- Full existing checks on both lanes; retain native coverage and failure logs.
  Count new internal audit checks separately from the 212 guest baseline.

Only after independent acceptance may a separately assigned emission task turn
F01/02/04/05/06/07/19/22/23/26 complete candidates into the one reserved return
rule. F03/21/27/28 remain normal; every blocked row remains non-certified (public
first-error priority retained). No other rule or conformance profile is admitted.
That later task needs malformed child-record and parent composition tests for
bodyEvaluated/mode/stage/phase/location/nonce/ruleCode contradictions and unknown
codes, plus proof metadata swaps never influence tag selection.
