import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareStrictScript, type ExecutableScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { GuestObject, Environment, UNDEFINED, normal, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "../src/runtime.js";
import { Evaluator } from "../src/evaluator.js";
import { parse, auditScriptReturns } from "../src/parser.js";
import type { Location, Stmt } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function prepare(source: string, realm: Realm, id = "switch"): ExecutableScript {
    const p = prepareStrictScript({ id, text: source }, realm);
    if (p.kind !== "ready") throw new Error("prepare " + p.kind + ": " + source);
    return p.record;
}
function idle(s: ScriptSession): void { const i = s.inspect(); check(i.active === null && i.calls === 0 && i.depth === 0, "idle"); }
function run(source: string, r: Realm, s = createScriptSession()): ValueCompletion {
    const result = evaluateScript(s, prepare(source, r));
    check(result.phase === "body", "body phase"); idle(s); return result.completion;
}
function define(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function scalar(v: Value): string {
    if (v.kind === "number" || v.kind === "string" || v.kind === "boolean") return "" + v.value;
    return v.kind;
}
function num(c: ValueCompletion, n: number): void { check(c.type === "normal" && c.value.kind === "number" && c.value.value === n, "number " + n); }
function own(r: Realm, name: string): Value | null {
    const d = r.globalEnvironment.globalObject.getOwnProperty(name);
    return d !== undefined && d.kind === "data" ? d.value : null;
}

const input = readFileSync(process.argv[2], "utf8");
const inputSeven = "\"use strict\";switch(7){case 7:out(7);break;default:out(99);case 11:out(11);break;}\n";
const inputEleven = "\"use strict\";switch(11){case 7:out(7);break;default:out(99);case 11:out(11);break;}\n";
check(input === inputSeven || input === inputEleven, "whole runtime source");
function hostContext(r: Realm): OperationContext { return { realm: r, tick: (_loc) => normal(), call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("host setup cannot call"); } }; }
function recorder(r: Realm, log: string[]): void {
    for (const name of ["out", "mark"]) define(r, name, { kind: "object", object: r.createBuiltin(name, 1, (_t, args, _c, _l): ValueCompletion => {
        log.push(scalar(args[0])); return normal(name === "mark" ? args[0] : UNDEFINED);
    }) });
}
const inputRealm = fresh(), inputLog: string[] = []; recorder(inputRealm, inputLog);
const inputResult = run(input, inputRealm);
check(inputResult.type === "normal" && inputResult.value.kind === "undefined" && inputLog.join(",") === (input === inputSeven ? "7" : "11"), "runtime expected output");
console.log("PASS runtime source");
const rows = [
  {
    "id": "S01",
    "source": "switch(2){case 1:out(1);break;case 2:out(2);case 3:out(3);}",
    "log": "2,3",
    "result": "undefined"
  },
  {
    "id": "S02",
    "source": "switch(9){case 1:out(1);break;default:out(4);}",
    "log": "4",
    "result": "undefined"
  },
  {
    "id": "S03",
    "source": "switch(mark(2)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}",
    "log": "2,1,2,33,44",
    "result": "undefined"
  },
  {
    "id": "S04",
    "source": "switch(mark(1)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}",
    "log": "1,1,11,22,33,44",
    "result": "undefined"
  },
  {
    "id": "S05",
    "source": "switch(mark(9)){case mark(1):out(11);default:out(22);case mark(2):out(33);case mark(3):out(44);}",
    "log": "9,1,2,3,22,33,44",
    "result": "undefined"
  },
  {
    "id": "S06",
    "source": "switch(1){case '1':out(9);break;case 1:out(1);break;}switch(NaN){case NaN:out(9);break;default:out(2);}switch(-0){case 0:out(3);}",
    "log": "1,2,3",
    "result": "undefined"
  },
  {
    "id": "S07",
    "source": "let a={};switch(a){case {}:out(9);break;case a:out(1);break;}switch(null){case undefined:out(9);break;case null:out(2);}",
    "log": "1,2",
    "result": "undefined"
  },
  {
    "id": "S08",
    "source": "let x=2;switch(x){case 2:let x=7;out(x);}out(x);",
    "log": "7,2",
    "result": "undefined"
  },
  {
    "id": "S09",
    "source": "let x=2;switch(2){case x:let x=7;out(9);}",
    "log": "",
    "result": "diagnostic"
  },
  {
    "id": "S10",
    "source": "switch(1){case 1:out(x);break;case 2:let x=7;}",
    "log": "",
    "result": "diagnostic"
  },
  {
    "id": "S11",
    "source": "switch(1){case 1:let x=7;case 2:out(x);}",
    "log": "7",
    "result": "undefined"
  },
  {
    "id": "S12",
    "source": "switch(f()){case 2:out(f());break;default:function f(){return 2;}}",
    "log": "2",
    "result": "undefined"
  },
  {
    "id": "S13",
    "source": "switch(f()){case 2:out(f());break;default:function f(){return 2;}}",
    "log": "",
    "result": "diagnostic"
  },
  {
    "id": "S14",
    "source": "switch(2){case f():out(1);break;default:function f(){return 2;}}out(typeof f);",
    "log": "1,undefined",
    "result": "undefined"
  },
  {
    "id": "S15",
    "source": "out(x);switch(9){case 1:var x=7;}out(x);function f(){out(y);switch(1){case 1:var y=11;}return y;}out(f());",
    "log": "undefined,undefined,undefined,11",
    "result": "undefined"
  },
  {
    "id": "S16",
    "source": "let saved;switch(1){case 1:let x=7;saved=function(){return x;};break;}out(saved());",
    "log": "7",
    "result": "undefined"
  },
  {
    "id": "S17",
    "source": "switch(1){case 1:{let x=7;out(x);}case 2:{let x=11;out(x);}}",
    "log": "7,11",
    "result": "undefined"
  },
  {
    "id": "S18",
    "source": "let n=0;while(n<2){n+=1;switch(n){case 1:continue;case 2:break;}out(n);}out(n);",
    "log": "2,2",
    "result": "undefined"
  },
  {
    "id": "S19",
    "source": "switch(1){case 1:while(true){break;}out(1);switch(2){case 2:break;}out(2);break;default:out(9);}",
    "log": "1,2",
    "result": "undefined"
  },
  {
    "id": "S20",
    "source": "function f(){switch(1){case 1:return 7;default:return 9;}}out(f());",
    "log": "7",
    "result": "undefined"
  },
  {
    "id": "S21",
    "source": "let x={};try{switch(1){case 1:throw x;}}catch(e){out(e===x);}out(2);",
    "log": "true,2",
    "result": "undefined"
  },
  {
    "id": "S22",
    "source": "try{switch(1){case 1:while(true){}}}catch(e){out(9);}",
    "log": "",
    "result": "resource"
  },
  {
    "id": "S23",
    "source": "switch(mark(1)){case fail():out(9);default:out(8);}",
    "log": "1",
    "result": "sentinel"
  },
  {
    "id": "S24",
    "source": "switch(1){case 1:out(1);case fail():out(2);}",
    "log": "1,2",
    "result": "undefined"
  },
  {
    "id": "S25",
    "source": "switch(1){case 1:out(1);break;case 1:out(9);}",
    "log": "1",
    "result": "undefined"
  },
  {
    "id": "S26",
    "source": "9;switch(1){}",
    "log": "",
    "result": "undefined"
  },
  {
    "id": "S26",
    "source": "9;switch(1){case 2:7;}",
    "log": "",
    "result": "undefined"
  },
  {
    "id": "S26",
    "source": "9;switch(1){case 1:break;}",
    "log": "",
    "result": "undefined"
  },
  {
    "id": "S27",
    "source": "switch(1){case 1:7;case 2:;break;}",
    "log": "",
    "result": "7"
  },
  {
    "id": "S27",
    "source": "switch(1){case 1:7;default:break;}",
    "log": "",
    "result": "7"
  },
  {
    "id": "S28",
    "source": "switch(1){case 1:7;case 2:let x;}",
    "log": "",
    "result": "7"
  },
  {
    "id": "S29",
    "source": "let n=0;while(n<1){n+=1;switch(1){case 1:7;continue;}}",
    "log": "",
    "result": "7"
  },
  {
    "id": "S30",
    "source": "switch(1){default:7;case 2:11;break;}",
    "log": "",
    "result": "11"
  },
  {
    "id": "S30",
    "source": "switch(2){default:7;case 2:11;break;}",
    "log": "",
    "result": "11"
  }
];
for (const row of rows) {
    const r = fresh(), log: string[] = [], session = createScriptSession({ maxSteps: 300, maxCalls: 64 }); recorder(r, log);
    const sentinel: ThrowCompletion = { type: "throw", origin: { kind: "guest" }, value: { kind: "object", object: new GuestObject() }, diagnostic: { phase: "runtime", name: "sentinel", message: "exact", loc: { line: 900, column: 9 } } };
    let outerCalls = 0;
    define(r, "fail", { kind: "object", object: r.createBuiltin("fail", 0, (_t, _a, _c, _l): ValueCompletion => sentinel) });
    if (row.id === "S12") define(r, "f", { kind: "object", object: r.createBuiltin("f", 0, (_t, _a, _c, _l): ValueCompletion => { outerCalls++; return normal({ kind: "number", value: 2 }); }) });
    const record = prepare('"use strict";' + row.source, r, row.id), evaluation = evaluateScript(session, record), c = evaluation.completion;
    idle(session); check(evaluation.phase === "body" && log.join(",") === row.log, row.id + " trace");
    if (row.result === "diagnostic") check(c.type === "throw" && c.origin.kind === "engine-diagnostic" && c.diagnostic.name === "ReferenceError", row.id + " TDZ");
    else if (row.result === "resource") check(c.type === "throw" && c.origin.kind === "resource-limit" && c.origin.guardCode === "steps", row.id + " resource");
    else if (row.result === "sentinel") check(c === sentinel, row.id + " exact throw");
    else check(c.type === "normal" && scalar(c.value) === row.result, row.id + " completion");
    if (row.id === "S12") check(outerCalls === 1, "outer discriminant once");
    if (row.id === "S13") check(record.inspectMaterializations().completed === 0, "discriminant fails before setup");
    if (row.id === "S16") {
        num(run('"use strict";saved();', r), 7);
        const saved = run('"use strict";saved;', r);
        if (saved.type !== "normal" || saved.value.kind !== "object") throw new Error("S16 closure");
        const fn = saved.value.object.callable;
        check(fn !== null && fn.kind === "script-guest" && fn.realm === r && fn.record === record && fn.sourceText() === "function(){return x;}" && saved.value.object.getPrototypeOf() === r.functionPrototype, "S16 original source/Realm");
        const other = fresh(); define(other, "saved", saved.value); num(run('"use strict";saved();', other), 7);
        check(own(r, "x") === null, "S16 local remains private");
    }
}
console.log("PASS S01-S30 literal semantics");
const rejects = [
  {
    "id": "N01",
    "source": "switch(1){case 1:let x;case 2:let x;}"
  },
  {
    "id": "N02",
    "source": "switch(1){case 1:function f(){}default:let f;}"
  },
  {
    "id": "N02",
    "source": "switch(1){case 1:function f(){}case 2:function f(){}}"
  },
  {
    "id": "N03",
    "source": "switch(1){case 1:let x;case 2:var x;}"
  },
  {
    "id": "N03",
    "source": "switch(1){case 1:let x;default:{var x;}}"
  },
  {
    "id": "N04",
    "source": "switch(1){default:;default:;}"
  },
  {
    "id": "N04",
    "source": "switch(1){1;}"
  },
  {
    "id": "N04",
    "source": "switch(1){case :;}"
  },
  {
    "id": "N04",
    "source": "switch(1){case 1;}"
  },
  {
    "id": "N05",
    "source": "switch(1){case 1:continue;}"
  },
  {
    "id": "N05",
    "source": "switch(1){case 1:function f(){break;}}"
  },
  {
    "id": "N05",
    "source": "while(true){switch(1){case 1:function f(){continue;}}}"
  },
  {
    "id": "N06",
    "source": "switch(1){case 1:break label;}"
  },
  {
    "id": "N06",
    "source": "label:switch(1){case 1:break label;}"
  },
  {
    "id": "N07",
    "source": "switch(1){case 1:let x;let x;default:const y=0;}"
  },
  {
    "id": "N07",
    "source": "switch(1){case 1:break;default:class X{}}"
  },
  {
    "id": "N08",
    "source": "switch(1){case 1:return 7;}"
  },
  {
    "id": "N08",
    "source": "switch(1){case 1:try{}finally{}}"
  },
  {
    "id": "N08",
    "source": "switch(1){case 1:++x;}"
  },
  {
    "id": "N09",
    "source": "try{}catch(e){switch(1){case 1:var e;}}"
  },
  {
    "id": "N10",
    "source": "switch(1){case 1:function f(){}}"
  }
];
for (const row of rejects) {
    const r = fresh(), session = createScriptSession();
    const result = prepareStrictScript({ id: row.id, text: (row.id === "N10" ? "" : '"use strict";') + row.source }, r);
    if (row.source === "switch(1){case 1:++x;}") {
        check(result.kind === "ready" && session.inspect().steps === 0, "prefix update prepares in switch");
        const completion = run('"use strict";' + row.source, r);
        check(completion.type === "throw" && completion.diagnostic.name === "ReferenceError", "switch update resolves missing target");
        continue;
    }
    check(result.kind === "blocked" || result.kind === "conflict", row.id + " reject");
    if (row.id === "N01" || row.id === "N02") check(result.kind === "conflict" && result.conflict.kind === "duplicate-lexical", row.id);
    else if (row.id === "N03") check(result.kind === "conflict" && result.conflict.kind === "lexical-var", row.id);
    else check(result.kind === "blocked" && result.rejection.kind === "unsupported-syntax", row.id + " unsupported");
    idle(session); check(session.inspect().steps === 0, "reject no ticks");
}
for (const source of ['switch(1){case 1:let x;function f(){var x;}}', 'switch(1){case 1:{let x;}case 2:{let x;}}', 'while(true){switch(1){case 1:break;}break;}', 'function f(){switch(1){case 1:break;}}f();']) check(run('"use strict";' + source, fresh()).type === "normal", "positive neighbor");
console.log("PASS N01-N10 whole-source boundaries and neighbors");
const prefixes = [
  {"id":"P05-empty","source":"\"use strict\";\nswitch(1){}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10]],"result":"normal undefined"},
  {"id":"P09-break","source":"\"use strict\";\nswitch(1){\ncase 1:7;\ncase 2:break;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[3,8],[3,8],[4,8]],"result":"normal number7"},
  {"id":"P07-no-match","source":"\"use strict\";\nswitch(9){\ncase 1:7;\ncase 2:break;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[4,6]],"result":"normal undefined"},
  {"id":"P10-middle-later","source":"\"use strict\";\nswitch(2){\ncase 1:11;\ndefault:22;\ncase 2:33;break;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[5,6],[5,8],[5,8],[5,11]],"result":"normal number33"},
  {"id":"P12-middle-default","source":"\"use strict\";\nswitch(9){\ncase 1:11;\ndefault:22;\ncase 2:33;break;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[5,6],[4,9],[4,9],[5,8],[5,8],[5,11]],"result":"normal number33"},
  {"id":"P13-middle-first","source":"\"use strict\";\nswitch(1){\ncase 1:11;\ndefault:22;\ncase 2:33;break;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[3,8],[3,8],[4,9],[4,9],[5,8],[5,8],[5,11]],"result":"normal number33"},
  {"id":"P12-let","source":"\"use strict\";\nswitch(0){\ncase 0:let x=7;\nx;\nbreak;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,12],[3,6],[3,8],[3,14],[4,1],[4,1],[5,1]],"result":"normal number7"},
  {"id":"P11-function","source":"\"use strict\";\nswitch(0){\ndefault:function f(){return 7;}\nf;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,18],[3,9],[3,18],[3,9],[4,1],[4,1]],"result":"normal original-source function f"},
  {"id":"P08-throw","source":"\"use strict\";\nswitch(1){\ncase 1:throw 7;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,6],[3,8],[3,14]],"result":"guest throw number7 at 3:8"},
  {"id":"P07-selector-tdz","source":"\"use strict\";\nswitch(1){\ncase x:let x;\n}","ticks":[[1,1],[1,1],[2,1],[2,8],[2,10],[3,12],[3,6]],"result":"engine-diagnostic ReferenceError at 3:6; no body effects"}
]
;
let prefixCount = 0;
for (const row of prefixes) for (const seed of [0, 7]) for (let k = 0; k <= row.ticks.length; k++) {
    prefixCount++;
    const r = fresh(), session = createScriptSession({ maxSteps: seed + k, maxCalls: 64 });
    if (seed === 7) num(run('"use strict";this.seed=1;', r, session), 1);
    const record = prepare(row.source, r, row.id), evaluation = evaluateScript(session, record), c = evaluation.completion, state = session.inspect();
    idle(session); check(evaluation.phase === "body" && state.steps === seed + k + (k < row.ticks.length ? 1 : 0), row.id + " steps " + k);
    check(own(r, "x") === null && own(r, "f") === null && own(r, "saved") === null, "no local publication");
    const seeded = own(r, "seed"); check(seed === 0 ? seeded === null : seeded !== null && seeded.kind === "number" && seeded.value === 1, "seed survives");
    if (row.id === "P11-function") check(record.inspectMaterializations().completed === (k <= 6 ? 0 : 1), "materializations");
    if (k < row.ticks.length) {
        check(c.type === "throw" && c.origin.kind === "resource-limit" && c.origin.guardCode === "steps" && c.origin.count === seed+k+1 && c.origin.limit === seed+k, "prefix resource");
        if (c.type !== "throw") throw new Error("prefix throw");
        check(c.diagnostic.loc.line === row.ticks[k][0] && c.diagnostic.loc.column === row.ticks[k][1], row.id + " location " + k);
        check(state.lastAbrupt !== null && state.lastAbrupt.record === record && state.lastAbrupt.realm === r && state.lastAbrupt.unitId === row.id, "prefix provenance");
    } else if (row.id === "P08-throw") check(c.type === "throw" && c.origin.kind === "guest" && scalar(c.value) === "7" && c.diagnostic.loc.line === 3 && c.diagnostic.loc.column === 8, "full throw");
    else if (row.id === "P07-selector-tdz") check(c.type === "throw" && c.origin.kind === "engine-diagnostic" && c.diagnostic.name === "ReferenceError" && c.diagnostic.loc.line === 3 && c.diagnostic.loc.column === 6, "full TDZ");
    else if (row.id === "P11-function") {
        if (c.type !== "normal" || c.value.kind !== "object") throw new Error("full function");
        const fn = c.value.object.callable;
        check(fn !== null && fn.kind === "script-guest" && fn.record === record && fn.realm === r && fn.sourceText() === "function f(){return 7;}", "retained original function");
        for (const target of [r, fresh()]) { define(target, "saved", c.value); num(run('"use strict";saved();', target), 7); }
    } else check(c.type === "normal" && scalar(c.value) === (row.result === "normal number7" ? "7" : row.result === "normal number33" ? "33" : "undefined"), "full prefix endpoint");
}
check(prefixCount === 208, "208 prefixes"); console.log("PASS 208 fresh/seven-seeded prefixes");
// Exact propagation at each switch stage, including H1 origin filtering.
for (const mode of ["guest", "diagnostic", "resource", "unsupported"]) for (const stage of ["discriminant", "selector", "body"]) for (const wrapped of [false, true]) {
    const r = fresh(), s = createScriptSession(), log: string[] = []; recorder(r, log);
    const q: ThrowCompletion = { type: "throw", origin: mode === "diagnostic" ? { kind: "engine-diagnostic" } : mode === "resource" ? { kind: "resource-limit", guardCode: "steps", count: 10, limit: 9 } : mode === "unsupported" ? { kind: "unsupported-operation", capabilityCode: "runtime.object-to-string" } : { kind: "guest" }, value: { kind: "object", object: new GuestObject() }, diagnostic: { phase: "runtime", name: "sentinel", message: "not interpreted", loc: { line: 900, column: 9 } } };
    let calls = 0;
    define(r, "fail", { kind: "object", object: r.createBuiltin("fail", 0, (_t, _a, context, _l): ValueCompletion => { calls++; check(context.realm === r, "X01 callback Realm"); return q; }) });
    define(r, "original", q.value);
    const source = stage === "discriminant" ? 'switch(fail()){case 1:out(9);}' : stage === "selector" ? 'switch(1){case fail():out(9);default:out(8);}' : 'switch(1){case 1:fail();out(9);default:out(8);}';
    const record = prepare('"use strict";' + (wrapped ? 'try{' + source + '}catch(e){out(e===original);}' : source), r, "X01");
    const result = evaluateScript(s, record).completion, last = s.inspect().lastAbrupt;
    const caught = wrapped && (mode === "guest" || mode === "diagnostic");
    check(caught ? result.type === "normal" : result === q, "X01 exact origin propagation");
    check(calls === 1 && log.join(",") === (caught ? "true" : ""), "X01 no later effects");
    check(last !== null && last.record === record && last.realm === r && last.unitId === "X01" && last.loc !== q.diagnostic.loc && last.loc.line === 900 && last.loc.column === 9, "X01 copied defining provenance"); idle(s);
}
console.log("PASS X01 exact throw origins at three stages");

for (const cross of [false, true]) {
    const a = fresh(), b = cross ? fresh() : a, s = createScriptSession();
    const q: ThrowCompletion = { type: "throw", origin: { kind: "guest" }, value: { kind: "object", object: new GuestObject() }, diagnostic: { phase: "runtime", name: "same", message: "history", loc: { line: 900, column: 9 } } };
    let calls = 0; let activeA: ExecutableScript | null = null;
    for (const r of cross ? [a,b] : [a]) define(r, "fail", { kind: "object", object: r.createBuiltin("fail", 0, (_t, _a, context, _l): ValueCompletion => { calls++; check(context.realm === r, "X02 Realm"); if (calls === 2) check(s.inspect().lastAbrupt?.record === activeA, "X02 retained A history within execution"); return q; }) });
    const ar = prepare('"use strict";try{switch(1){case 1:fail();}}catch(e){}', a, "A");
    const br = prepare('"use strict";function again(){switch(1){case 1:fail();}}', b, "B");
    check(evaluateScript(s, ar).completion.type === "normal" && s.inspect().lastAbrupt?.record === ar, "X02 caught A history");
    check(evaluateScript(s, br).completion.type === "normal", "B definition");
    const fn = own(b, "again"); if (fn === null) throw new Error("again missing"); if (cross) define(a, "again", fn);
    calls = 0;
    activeA = prepare('"use strict";try{switch(1){case 1:fail();}}catch(e){}again();', a, "A");
    const result = evaluateScript(s, activeA).completion, last = s.inspect().lastAbrupt;
    check(result === q && result.value === q.value && result.diagnostic.loc === q.diagnostic.loc && calls === 2, "X02 exact reused completion");
    check(last !== null && last.record === br && last.realm === b && last.unitId === "B" && last.loc !== q.diagnostic.loc && last.loc.line === 900 && last.loc.column === 9, "X02 fresh B provenance"); idle(s);
}
console.log("PASS X02 consumed throw history same/cross Realm");

function sameFrame(a: ReturnType<ScriptSession["inspect"]>, b: ReturnType<ScriptSession["inspect"]>): void {
    const x = a.active, y = b.active;
    check(a.calls === b.calls && a.depth === b.depth && x !== null && y !== null, "nonzero active restoration");
    if (x === null || y === null) throw new Error("missing frame");
    check(x.realm === y.realm && x.record === y.record && x.scopeId === y.scopeId && x.lexical === y.lexical && x.variable === y.variable && x.thisValue === y.thisValue && x.function === y.function && x.phase === y.phase && x.strict === y.strict && x.privateEnvironment === y.privateEnvironment, "exact frame restoration");
}
function hostFault(action: () => void, message: string): void {
    let caught = false;
    try { action(); } catch (error) { if (!(error instanceof Error)) throw error; check(error.message === message, "host diagnostic " + message); caught = true; }
    check(caught, "host rejection");
}
for (const stage of ["discriminant", "selector", "body"]) {
    const a = fresh(), b = fresh(), sa = createScriptSession(), sb = createScriptSession(), sentinel = new Error("X03 host");
    let ac: OperationContext | null = null, bc: OperationContext | null = null, raw = 0;
    const leaf = a.createBuiltin("leaf", 0, (_t, _args, context, _l): ValueCompletion => { check(context === ac && context.realm === a, "owner capability"); raw++; return normal({ kind: "number", value: 7 }); });
    const leafValue: Value = { kind: "object", object: leaf };
    define(b, "fail", { kind: "object", object: b.createBuiltin("fail", 0, (_t, _args, context, loc): ValueCompletion => {
        bc = context; const beforeA = sa.inspect(), beforeB = sb.inspect();
        if (ac === null) throw new Error("missing A context");
        num(ac.call(leafValue, UNDEFINED, [], loc), 7); sameFrame(beforeA, sa.inspect()); sameFrame(beforeB, sb.inspect());
        throw sentinel;
    }) });
    const source = stage === "discriminant" ? 'switch(fail()){case 1:this.bad=1;}' : stage === "selector" ? 'switch(1){case fail():this.bad=1;}' : 'switch(1){case 1:fail();this.bad=1;}';
    const br = prepare('"use strict";try{' + source + '}catch(e){this.caught=1;}', b, "X03 B");
    define(a, "enter", { kind: "object", object: a.createBuiltin("enter", 0, (_t, _args, context, loc): ValueCompletion => {
        ac = context; const before = sa.inspect(); check(before.calls > 0 && before.depth > 0, "A active");
        const callable = leaf.callable; if (callable === null || callable.kind !== "builtin") throw new Error("leaf");
        hostFault(() => { callable.invoke(UNDEFINED, [], context, loc); }, "Script execution unavailable");
        let caught = false; try { evaluateScript(sb, br); } catch (error) { if (!(error instanceof Error) || error !== sentinel) throw error; caught = true; }
        check(caught && own(b, "caught") === null && own(b, "bad") === null, "X03 host bypass identity");
        idle(sb); sameFrame(before, sa.inspect()); check(context.realm === a, "restored A Realm");
        num(context.call(leafValue, UNDEFINED, [], loc), 7); sameFrame(before, sa.inspect()); return normal();
    }) });
    run('"use strict";switch(1){case 1:enter();}', a, sa); idle(sa); idle(sb); check(raw === 2, "authentic calls only");
    if (ac === null || bc === null) throw new Error("retained contexts");
    const retainedA: OperationContext = ac, retainedB: OperationContext = bc;
    hostFault(() => { retainedA.tick({ line: 1, column: 1 }); }, "inactive Script session");
    hostFault(() => { retainedB.tick({ line: 1, column: 1 }); }, "inactive Script session");
    hostFault(() => { retainedA.call(leafValue, UNDEFINED, [], { line: 1, column: 1 }); }, "inactive Script session");
}
console.log("PASS X03 nested B host fault restores active A and permits");

{
    const evaluator = new Evaluator(new Realm((_line: string) => {})), env = new Environment(null), loc = { line: 1, column: 1 };
    const rows: { node: Stmt; expected: string }[] = [
        { node: { kind: "switch", loc, discriminant: { kind: "identifier", loc, name: "effect" }, caseBlock: { loc, start: 0, end: 2, clauses: [], body: [] } }, expected: "Script switch AST requires Script execution" },
        { node: { kind: "var", loc, declarations: [] }, expected: "Script var AST requires Script execution" },
        { node: { kind: "try-catch", loc, block: { kind: "block", loc, body: [] }, parameter: { name: "e", loc, start: 0, end: 1 }, catchLoc: loc, catchStart: 0, catchEnd: 2, handler: { kind: "block", loc, body: [] } }, expected: "Script try-catch AST requires Script execution" }
    ];
    for (const row of rows) { hostFault(() => { evaluator.statementInner(row.node, env, UNDEFINED); }, row.expected); check(evaluator.steps === 0 && env.bindings.size === 0, "legacy no effects"); }
    for (const source of ['switch(1){}', 'function f(){switch(1){}}', 'return;function f(){switch(1){}}']) {
        check(parse(source).error !== null && auditScriptReturns(source).kind === "blocked", "legacy/audit switch closed");
    }
}
console.log("PASS X04 exact legacy guards and audit closure");

{
    const r = fresh();
    const source = '"use strict";switch((function(){return 1;})()){case (function(){return 1;})():let x=7;this.saved=function(){return x;};break;default:var y;}';
    const record = prepare(source, r, "X05"), plan = record.inspect(), nodes = record.inspectNodes();
    check(plan.scopes.map(s => s.kind).join(",") === "script,function,switch,function,function", "preorder ownership");
    check(plan.scopes[1].parent === 0 && plan.scopes[2].parent === 0 && plan.scopes[3].parent === 2 && plan.scopes[4].parent === 2, "outer discriminant inner selector/body");
    check(plan.scopes[0].varNames.join(",") === "y" && plan.scopes[2].lexicalNames.join(",") === "x", "switch hoisting");
    check(nodes.scopes[2].kind === "switch" && nodes.scopes[2].bodyLength === 4 && nodes.scopes[2].parameters.length === 0 && nodes.scopes[2].text === null && nodes.scopes[2].start === null && nodes.scopes[2].end === null && nodes.scopes[2].loc?.column === 14, "detached switch metadata");
    for (const scope of plan.scopes) { (scope.lexicalNames as string[]).push("poison"); (scope.varDeclarations as number[]).length = 0; }
    for (const scope of nodes.scopes) { scope.parameters.push("poison"); scope.bodyLength = 999; if (scope.loc !== null) scope.loc.column = 999; }
    nodes.scopes.length = 0; nodes.declarations.length = 0;
    check(evaluateScript(createScriptSession(), record).completion.type === "normal", "inspection cannot mutate execution");
    const saved = own(r, "saved"); if (saved === null || saved.kind !== "object") throw new Error("saved");
    const fn = saved.object.callable;
    check(fn !== null && fn.kind === "script-guest" && fn.record === record && fn.realm === r && fn.sourceText() === "function(){return x;}" && saved.object.getPrototypeOf() === r.functionPrototype, "closure source and Realm");
    for (const target of [r, fresh()]) { define(target, "saved", saved); num(run('"use strict";saved();', target), 7); }
    check(record.inspect().unit.text === source && record.inspect().scopes[2].lexicalNames.join(",") === "x", "snapshot mutations isolated");
}
console.log("PASS X05 ownership inspection and retained closure");

for (const symbol of [false, true]) {
    const r = fresh(); let conversions = 0;
    const a: Value = symbol ? { kind: "symbol", value: new GuestSymbol("same") } : { kind: "object", object: new GuestObject() };
    const b: Value = symbol ? { kind: "symbol", value: new GuestSymbol("same") } : { kind: "object", object: new GuestObject() };
    if (a.kind === "object" && b.kind === "object") for (const object of [a.object, b.object]) {
        const callback = r.createBuiltin("conversion", 0, (_t, _a, _c, _l): ValueCompletion => { conversions++; throw new Error("conversion must not run"); });
        object.defineOwnProperty(wellKnownToPrimitive, { value: { kind: "object", object: callback }, writable: true, configurable: true }, hostContext(r), { line: 1, column: 1 });
        object.defineOwnProperty("valueOf", { value: { kind: "object", object: callback }, writable: true, configurable: true }, hostContext(r), { line: 1, column: 1 });
    }
    define(r, "a", a); define(r, "b", b); num(run('"use strict";switch(a){case b:9;break;case a:7;break;}', r), 7); check(conversions === 0, "strict identity no conversion");
}
console.log("PASS S07 host symbol/object identity without coercion");

for (const source of ['"use strict";' + ' '.repeat(100001), '"use strict";' + 'switch(1){case 1:'.repeat(130) + '}'.repeat(130)]) {
    const result = prepareStrictScript({ id: "resource boundary", text: source }, fresh());
    check(result.kind === "blocked" && result.rejection.kind === "resource-limit", "source/depth resource boundary");
}
for (const calls of [3, 1000]) {
    const r = fresh(), s = createScriptSession({ maxSteps: 100000, maxCalls: calls });
    const result = run('"use strict";function f(){switch(1){case 1:return 1+f();}}try{f();}catch(e){this.bad=1;}', r, s);
    check(result.type === "throw" && result.origin.kind === "resource-limit" && result.origin.guardCode === (calls === 3 ? "calls" : "evaluation-depth") && own(r, "bad") === null, "switch call/depth bypass"); idle(s);
}
