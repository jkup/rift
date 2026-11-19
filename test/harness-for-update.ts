import type { ThrowOrigin } from "../src/outcomes.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareStrictScript, type ExecutableScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import {
    GuestObject,
    Environment,
    UNDEFINED,
    normal,
    sameValue,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
    type Builtin,
    type PropertyKey,
    type PropertyDescriptorUpdate,
    type OperationContext,
} from "../src/runtime.js";
import { Evaluator } from "../src/evaluator.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import { parseDeclarationPlan, parse, auditScriptReturns } from "../src/parser.js";
import type { Stmt } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function prepare(source: string, realm: Realm, id = "switch"): ExecutableScript {
    const p = prepareStrictScript({ id, text: source }, realm);
    if (p.kind !== "ready") {
        throw new Error("prepare " + p.kind + ": " + source);
    }
    return p.record;
}
function idle(s: ScriptSession): void {
    const i = s.inspect();
    check(i.active === null && i.calls === 0 && i.depth === 0, "idle");
}
function run(source: string, r: Realm, s = createScriptSession()): ValueCompletion {
    const result = evaluateScript(s, prepare(source, r));
    check(result.phase === "body", "body phase");
    idle(s);
    return result.completion;
}
function define(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function scalar(v: Value): string {
    if (v.kind === "number" || v.kind === "string" || v.kind === "boolean") {
        return "" + v.value;
    }
    return v.kind;
}
function num(c: ValueCompletion, n: number): void {
    check(c.type === "normal" && c.value.kind === "number" && c.value.value === n, "number " + n);
}
function own(r: Realm, name: string): Value | null {
    const d = r.globalEnvironment.globalObject.getOwnProperty(name);
    return d !== undefined && d.kind === "data" ? d.value : null;
}

const loc = { line: 1, column: 1 };
function hostContext(r: Realm): OperationContext {
    return {
        realm: r,
        tick: (_loc) => normal(),
        call: (_callee, _receiver, _args, _loc): ValueCompletion => {
            throw new Error("host setup cannot call");
        },
    };
}
function property(
    r: Realm,
    o: GuestObject,
    key: PropertyKey,
    descriptor: PropertyDescriptorUpdate,
): void {
    const c = o.defineOwnProperty(key, descriptor, hostContext(r), loc);
    check(c.type === "normal" && c.value, "property setup");
}
function builtin(r: Realm, name: string, cb: Builtin): Value {
    return { kind: "object", object: r.createBuiltin(name, 1, cb) };
}
function recorder(r: Realm, log: string[]): void {
    for (const name of ["out", "mark"]) {
        define(
            r,
            name,
            builtin(r, name, (_t, args, _c, _l): ValueCompletion => {
                log.push(scalar(args[0]));
                return normal(name === "mark" ? args[0] : UNDEFINED);
            }),
        );
    }
}
const input = readFileSync(process.argv[2], "utf8");
const inputSeven =
    '"use strict";\nvar total=0;\nfor(var i=0;i<4;i++){\n  if(i===2)continue;\n  total+=i;\n}\nout(total+3);\n';
const inputEleven =
    '"use strict";\nvar total=0;\nfor(var i=0;;i++){\n  if(i===2)break;\n  total+=i;\n}\nout(total+10);\n';
check(input === inputSeven || input === inputEleven, "whole runtime source");
const inputRealm = fresh(),
    inputLog: string[] = [];
recorder(inputRealm, inputLog);
check(
    run(input, inputRealm).type === "normal" &&
        inputLog.join(",") === (input === inputSeven ? "7" : "11"),
    "runtime input output",
);
console.log("PASS runtime source");
const rows = [
    {
        id: "F01",
        source: "for(var i=0;i<3;i++)out(i);out(i);",
        log: "0,1,2,3",
        result: "undefined",
    },
    {
        id: "F02",
        source: "let i=9;for(i=0;i<2;i++)out(i);out(i);",
        log: "0,1,2",
        result: "undefined",
    },
    {
        id: "F03",
        source: "let i=0;for(;i<2;)i++;out(i);",
        log: "2",
        result: "undefined",
    },
    {
        id: "F04",
        source: "for(;;)break;",
        log: "",
        result: "undefined",
    },
    {
        id: "F05",
        source: "let i=0;for(;i<3;i++){if(i===1)continue;out(i);}out(i);",
        log: "0,2,3",
        result: "undefined",
    },
    {
        id: "F06",
        source: "let i=0;for(;i<3;i++){out(i);break;}out(i);",
        log: "0,0",
        result: "undefined",
    },
    {
        id: "F07",
        source: "function f(){for(;;out(9))return 7;}out(f());",
        log: "7",
        result: "undefined",
    },
    {
        id: "F08",
        source: "let e={};try{for(;;out(9))throw e;}catch(x){out(x===e);}",
        log: "true",
        result: "undefined",
    },
    {
        id: "F09",
        source: "for(mark(1);mark(false);mark(9))out(8);",
        log: "1,false",
        result: "undefined",
    },
    {
        id: "F10",
        source: "let i=0;for(;i<2;i++){switch(i){case 0:continue;default:break;}out(i);}out(i);",
        log: "1,2",
        result: "undefined",
    },
    {
        id: "F11",
        source: "let i=0;for(;i<2;i++){for(;;)break;out(i);}",
        log: "0,1",
        result: "undefined",
    },
    {
        id: "F12",
        source: "9;for(;false;);",
        log: "",
        result: "undefined",
    },
    {
        id: "F12",
        source: "9;for(;;)break;",
        log: "",
        result: "undefined",
    },
    {
        id: "F13",
        source: "for(;;){7;break;}",
        log: "",
        result: "7",
    },
    {
        id: "F14",
        source: "let i=0;for(;i<1;i++){7;continue;}",
        log: "",
        result: "7",
    },
    {
        id: "F15",
        source: "for(var i=0,j=i+2;i<1;i++)out(j);",
        log: "2",
        result: "undefined",
    },
    {
        id: "F16",
        source: "out(i);for(var i=4;false;);out(i);",
        log: "undefined,4",
        result: "undefined",
    },
    {
        id: "F17",
        source: "let a;let b;for(var i=0;i<2;i++){let x=i;if(i===0)a=function(){return x;};else b=function(){return x;};}out(a());out(b());out(i);",
        log: "0,1,2",
        result: "undefined",
    },
    {
        id: "F18",
        source: "let a;for(var i=0;i<2;i++)a=function(){return i;};out(a());",
        log: "2",
        result: "undefined",
    },
    {
        id: "F19",
        source: "for(var f=function(){return 7;};false;);out(f.name);out(f());",
        log: "f,7",
        result: "undefined",
    },
    {
        id: "F20",
        source: 'for(var x=("p" in {p:1});false;);out(x);',
        log: "true",
        result: "undefined",
    },
    {
        id: "H2-N08-positive",
        source: "let x=7;switch(1){case 1:out(x++);}out(x);",
        log: "7,8",
        result: "undefined",
    },
];
for (const row of rows) {
    const r = fresh(),
        log: string[] = [];
    recorder(r, log);
    const c = run('"use strict";' + row.source, r);
    check(
        c.type === "normal" && scalar(c.value) === row.result && log.join(",") === row.log,
        row.id + " output " + log.join(","),
    );
    console.log("PASS " + row.id);
}
const negatives = [
    {
        id: "N01",
        source: "for(let i=0;i<1;i++);",
    },
    {
        id: "N01",
        source: "for(const i=0;;);",
    },
    {
        id: "N02",
        source: "for(var k in o);",
    },
    {
        id: "N02",
        source: "for(k of o);",
    },
    {
        id: "N02",
        source: "for await(k of o);",
    },
    {
        id: "N03",
        source: 'for(var x="p" in o;false;);',
    },
    {
        id: "N03",
        source: 'for(x="p" in o;false;);',
    },
    {
        id: "N04",
        source: "++x;",
    },
    {
        id: "N04",
        source: "x--;",
    },
    {
        id: "N04",
        source: "--x;",
    },
    {
        id: "N04",
        source: "x++++;",
    },
    {
        id: "N05",
        source: "1++;",
    },
    {
        id: "N05",
        source: "f()++;",
    },
    {
        id: "N05",
        source: "(x+1)++;",
    },
    {
        id: "N05",
        source: "x++=1;",
    },
    {
        id: "N05",
        source: "(-x)++;",
    },
    {
        id: "N06",
        source: "x\n++;",
    },
    {
        id: "N06",
        source: "x/*\n*/++;",
    },
    {
        id: "N07",
        source: "for(;;)function f(){}",
    },
    {
        id: "N07",
        source: "for(;;)let x;",
    },
    {
        id: "N07",
        source: "for(;;){function f(){continue;}}",
    },
    {
        id: "N08",
        source: "for(;;){function f(){break;}}",
    },
    {
        id: "N08",
        source: "for(;;)break label;",
    },
    {
        id: "N09",
        source: "let x;for(var x=0;false;);",
    },
    {
        id: "N09",
        source: "{let x;for(var x=0;false;);}",
    },
    {
        id: "N10",
        source: "try{}catch(e){for(var e=0;false;);}",
    },
    {
        id: "N11",
        source: "for(;;){break;class X{}}",
    },
    {
        id: "N11",
        source: "let x;let x;for(;;){break;const y=0;}",
    },
    {
        id: "N12",
        source: "for(;){};",
    },
    {
        id: "N12",
        source: "for(var ;false;);",
    },
    {
        id: "N12",
        source: "for(;;",
    },
    {
        id: "N12",
        source: "for(x=0,y=0;false;);",
    },
    {
        id: "N13",
        source: "x++.p;",
    },
    {
        id: "N13",
        source: "x++();",
    },
    {
        id: "N13",
        source: "eval++;",
    },
    {
        id: "N13",
        source: "arguments++;",
    },
    {
        id: "N14",
        source: "for(;;){function f(){}}",
    },
];
for (const row of negatives) {
    const r = fresh(),
        session = createScriptSession();
    const result = prepareStrictScript(
        { id: row.id, text: (row.id === "N14" ? "" : '"use strict";') + row.source },
        r,
    );
    if (row.source === "for(x=0,y=0;false;);") {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "comma initializer prepares without effects",
        );
        define(r, "x", { kind: "number", value: 9 });
        define(r, "y", { kind: "number", value: 8 });
        if (result.kind !== "ready") {
            throw new Error("missing comma for record");
        }
        check(
            evaluateScript(session, result.record).completion.type === "normal",
            "comma initializer executes",
        );
        check(
            scalar(own(r, "x") ?? UNDEFINED) === "0" && scalar(own(r, "y") ?? UNDEFINED) === "0",
            "both initializers assign",
        );
        idle(session);
        continue;
    }
    if (row.id === "N01") {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "lexical for prepares without effects",
        );
        if (result.kind !== "ready") {
            throw new Error("missing lexical for record");
        }
        const completion = evaluateScript(
            createScriptSession({ maxSteps: 100, maxCalls: 64 }),
            result.record,
        ).completion;
        check(
            row.source.includes("const")
                ? completion.type === "throw" && completion.origin.kind === "resource-limit"
                : completion.type === "normal" && completion.value.kind === "undefined",
            "lexical for execution",
        );
        continue;
    }
    if (row.source === "for(var k in o);") {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "for-in prepares without effects",
        );
        run('"use strict";var o={a:1,b:2};', r, session);
        if (result.kind !== "ready") {
            throw new Error("missing for-in record");
        }
        check(
            evaluateScript(session, result.record).completion.type === "normal" &&
                scalar(own(r, "k") ?? UNDEFINED) === "b",
            "for-in assigns keys",
        );
        idle(session);
        continue;
    }
    if (row.source === "for(k of o);") {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "for-of prepares without effects",
        );
        define(r, "k", { kind: "number", value: 0 });
        run('"use strict";var o=[3,8];', r, session);
        if (result.kind !== "ready") {
            throw new Error("missing for-of record");
        }
        const completion = evaluateScript(session, result.record).completion;
        check(
            completion.type === "normal" && completion.value.kind === "undefined",
            "empty for-of body completion",
        );
        check(scalar(own(r, "k") ?? UNDEFINED) === "8", "for-of assigns each value");
        idle(session);
        continue;
    }
    if (["++x;", "x--;", "--x;"].includes(row.source)) {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "new update prepares without effects",
        );
        define(r, "x", { kind: "number", value: 7 });
        let expectedValue: number;
        if (row.source === "++x;") {
            expectedValue = 8;
        } else if (row.source === "x--;") {
            expectedValue = 7;
        } else {
            expectedValue = 6;
        }
        num(run('"use strict";' + row.source, r, session), expectedValue);
        check(
            scalar(own(r, "x") ?? UNDEFINED) === (row.source === "++x;" ? "8" : "6"),
            "new update stores result",
        );
        continue;
    }
    if (row.source === "for(;;){break;class X{}}") {
        check(
            result.kind === "ready" && session.inspect().steps === 0,
            "class loop preparation is inert",
        );
        check(
            run('"use strict";' + row.source, r, session).type === "normal",
            "original unreachable class executes",
        );
        continue;
    }
    check(result.kind !== "ready", row.id + " rejected: " + row.source);
    check(session.inspect().steps === 0, "no prepare ticks");
    idle(session);
}
console.log("PASS N01-N14 frozen negatives");
for (const separator of ["\r\n", "\u2028", "\u2029"]) {
    check(
        prepareStrictScript({ id: "N06", text: '"use strict";x' + separator + "++;" }, fresh())
            .kind !== "ready",
        "line terminator",
    );
}
const prefixes = [
    {
        id: "P04-false",
        source: '"use strict";\nfor(;false;);',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 6],
        ],
        result: "normal undefined",
        setup: "none",
    },
    {
        id: "P04-break",
        source: '"use strict";\nfor(;;)break;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 8],
        ],
        result: "normal undefined",
        setup: "none",
    },
    {
        id: "P13-continue",
        source: '"use strict";\nfor(\nx=0;\nx<1;\nx++\n)\ncontinue;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [3, 3],
            [4, 1],
            [4, 1],
            [4, 3],
            [7, 1],
            [5, 1],
            [4, 1],
            [4, 1],
            [4, 3],
        ],
        result: "normal undefined; x=1",
        setup: "host x=9; x=0 after tick5, x=1 after tick10",
    },
    {
        id: "P09-break-skips-update",
        source: '"use strict";\nfor(\nx=0;\nx<1;\nx++\n)\nbreak;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [3, 3],
            [4, 1],
            [4, 1],
            [4, 3],
            [7, 1],
        ],
        result: "normal undefined; x=0",
        setup: "host x=9; x=0 after tick5",
    },
    {
        id: "P17-var",
        source: '"use strict";\nfor(\nvar i=0;\ni<1;\ni++\n)\n;',
        ticks: [
            [3, 5],
            [3, 5],
            [3, 5],
            [3, 5],
            [1, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [3, 7],
            [4, 1],
            [4, 1],
            [4, 3],
            [7, 1],
            [5, 1],
            [4, 1],
            [4, 1],
            [4, 3],
        ],
        result: "normal undefined; i=1",
        setup: "no i initially; global i=undefined after tick4, 0 after tick9, 1 after tick14; ticks1..4 instantiation, remaining body",
    },
    {
        id: "P04-postfix",
        source: '"use strict";\nx++;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 1],
        ],
        result: "normal number7; x=8",
        setup: "host x=7; write after tick4",
    },
    {
        id: "P06-member",
        source: '"use strict";\no.p++;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 1],
            [2, 1],
            [2, 3],
        ],
        result: "normal number7; o.p=8",
        setup: "host o.p=7 ordinary data; write after tick6",
    },
    {
        id: "P08-accessor-hooks",
        source: '"use strict";\no[k]++;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 1],
            [2, 1],
            [2, 3],
            [2, 1],
            [2, 1],
        ],
        result: "normal number7; trace K,G,N,S8",
        setup: "host key k @@toPrimitive builtin records K with hint string returns p; o.p getter builtin records G returns object whose @@toPrimitive builtin records N with hint number returns string7; setter builtin records S8; no callback adds ticks; K,G after tick7 and N,S8 after tick8",
    },
    {
        id: "P05-body-throw",
        source: '"use strict";\nfor(;;)\nthrow 7;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [3, 7],
        ],
        result: "guest throw number7 at 3:1",
        setup: "none",
    },
    {
        id: "P08-block-value",
        source: '"use strict";\nfor(;;){\n7;\nbreak;\n}',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 8],
            [2, 8],
            [3, 1],
            [3, 1],
            [4, 1],
        ],
        result: "normal number7",
        setup: "none; original body BlockActivation allocated at tick5",
    },
    {
        id: "P06-update-throw",
        source: '"use strict";\nfor(;true;fail())\ncontinue;',
        ticks: [
            [1, 1],
            [1, 1],
            [2, 1],
            [2, 6],
            [3, 1],
            [2, 11],
        ],
        result: "exact host-seeded guest ThrowCompletion at diagnostic900:9; trace F",
        setup: "host fail builtin records F and returns exact guest throw sentinel; no callback ticks; F after tick6",
    },
];

function sentinel(): ThrowCompletion {
    return {
        type: "throw",
        origin: { kind: "guest" },
        value: { kind: "object", object: new GuestObject() },
        diagnostic: {
            phase: "runtime",
            name: "sentinel",
            message: "exact",
            loc: { line: 900, column: 9 },
        },
    };
}
function hooks(r: Realm, log: string[]): { o: GuestObject; k: GuestObject; old: GuestObject } {
    const o = new GuestObject(),
        k = new GuestObject(),
        old = new GuestObject();
    define(r, "o", { kind: "object", object: o });
    define(r, "k", { kind: "object", object: k });
    property(r, k, wellKnownToPrimitive, {
        value: builtin(r, "key", (_t, a, _c, _l): ValueCompletion => {
            check(_t.kind === "object" && _t.object === k, "key receiver");
            check(a[0].kind === "string" && a[0].value === "string", "key hint");
            log.push("K");
            return normal({ kind: "string", value: "p" });
        }),
        writable: true,
        configurable: true,
    });
    property(r, old, wellKnownToPrimitive, {
        value: builtin(r, "number", (_t, a, _c, _l): ValueCompletion => {
            check(_t.kind === "object" && _t.object === old, "number receiver");
            check(a[0].kind === "string" && a[0].value === "number", "number hint");
            log.push("N");
            return normal({ kind: "string", value: "7" });
        }),
        writable: true,
        configurable: true,
    });
    property(r, o, "p", {
        get: builtin(r, "get", (t, _a, _c, _l): ValueCompletion => {
            check(t.kind === "object" && t.object === o, "getter receiver");
            log.push("G");
            return normal({ kind: "object", object: old });
        }),
        set: builtin(r, "set", (t, a, _c, _l): ValueCompletion => {
            check(t.kind === "object" && t.object === o, "setter receiver");
            log.push("S" + scalar(a[0]));
            return normal();
        }),
        configurable: true,
    });
    return { o, k, old };
}
let prefixCount = 0;
for (const row of prefixes) {
    for (const seed of [0, 7]) {
        for (let k = 0; k <= row.ticks.length; k++) {
            prefixCount++;
            const r = fresh(),
                s = createScriptSession({ maxSteps: seed + k, maxCalls: 64 }),
                log: string[] = [],
                q = sentinel();
            if (seed === 7) {
                num(run('"use strict";this.seed=1;', r, s), 1);
            }
            if (row.id === "P13-continue" || row.id === "P09-break-skips-update") {
                define(r, "x", { kind: "number", value: 9 });
            }
            if (row.id === "P04-postfix") {
                define(r, "x", { kind: "number", value: 7 });
            }
            let o: GuestObject | null = null;
            if (row.id === "P06-member") {
                o = new GuestObject();
                property(r, o, "p", { value: { kind: "number", value: 7 }, writable: true });
                define(r, "o", { kind: "object", object: o });
            }
            if (row.id === "P08-accessor-hooks") {
                hooks(r, log);
            }
            if (row.id === "P06-update-throw") {
                define(
                    r,
                    "fail",
                    builtin(r, "fail", (_t, _a, _c, _l): ValueCompletion => {
                        log.push("F");
                        return q;
                    }),
                );
            }
            const record = prepare(row.source, r, row.id),
                evaluation = evaluateScript(s, record),
                c = evaluation.completion,
                state = s.inspect();
            idle(s);
            check(
                state.steps === seed + k + (k < row.ticks.length ? 1 : 0),
                row.id + " steps " + k,
            );
            check(
                evaluation.phase === (row.id === "P17-var" && k < 4 ? "instantiation" : "body"),
                row.id + " phase " + k,
            );
            if (
                row.id === "P13-continue" ||
                row.id === "P09-break-skips-update" ||
                row.id === "P04-postfix"
            ) {
                const x = own(r, "x");
                let expected: 0 | 1 | 7 | 8 | 9;
                if (row.id === "P04-postfix") {
                    if (k < 4) {
                        expected = 7;
                    } else {
                        expected = 8;
                    }
                } else if (k < 5) {
                    expected = 9;
                } else if (row.id === "P13-continue" && k >= 10) {
                    expected = 1;
                } else {
                    expected = 0;
                }
                check(
                    x !== null && x.kind === "number" && x.value === expected,
                    row.id + " mutation " + k,
                );
            }
            if (row.id === "P17-var") {
                const i = own(r, "i");
                check(
                    k < 4
                        ? i === null
                        : i !== null &&
                              (k < 9
                                  ? i.kind === "undefined"
                                  : i.kind === "number" && i.value === (k < 14 ? 0 : 1)),
                    "var prefix mutation " + k,
                );
            }
            if (o !== null) {
                const d = o.getOwnProperty("p");
                check(
                    d !== undefined &&
                        d.kind === "data" &&
                        d.value.kind === "number" &&
                        d.value.value === (k < 6 ? 7 : 8),
                    "member prefix write",
                );
            }
            if (row.id === "P08-accessor-hooks") {
                let expectedHookTrace: string;
                if (k < 7) {
                    expectedHookTrace = "";
                } else if (k < 8) {
                    expectedHookTrace = "K,G";
                } else {
                    expectedHookTrace = "K,G,N,S8";
                }
                check(log.join(",") === expectedHookTrace, "hook prefix " + k);
            }
            if (row.id === "P06-update-throw") {
                check(log.join(",") === (k < 6 ? "" : "F"), "update failure prefix");
            }
            if (k < row.ticks.length) {
                check(
                    c.type === "throw" &&
                        c.origin.kind === "resource-limit" &&
                        c.origin.guardCode === "steps" &&
                        c.origin.count === seed + k + 1 &&
                        c.origin.limit === seed + k,
                    "prefix resource",
                );
                if (c.type !== "throw") {
                    throw new Error("throw");
                }
                check(
                    c.diagnostic.loc.line === row.ticks[k][0] &&
                        c.diagnostic.loc.column === row.ticks[k][1],
                    row.id + " location " + k,
                );
                check(
                    state.lastAbrupt !== null &&
                        state.lastAbrupt.record === record &&
                        state.lastAbrupt.realm === r,
                    "prefix provenance",
                );
            } else if (row.id === "P06-update-throw") {
                check(c === q, "same update throw");
            } else if (row.id === "P05-body-throw") {
                check(
                    c.type === "throw" &&
                        c.origin.kind === "guest" &&
                        scalar(c.value) === "7" &&
                        c.diagnostic.loc.line === 3 &&
                        c.diagnostic.loc.column === 1,
                    "body throw",
                );
            } else {
                check(
                    c.type === "normal" &&
                        scalar(c.value) ===
                            (row.id === "P04-postfix" ||
                            row.id === "P06-member" ||
                            row.id === "P08-accessor-hooks" ||
                            row.id === "P08-block-value"
                                ? "7"
                                : "undefined"),
                    "prefix endpoint " + row.id,
                );
            }
        }
    }
}
check(prefixCount === 190, "190 prefixes");
console.log("PASS 190 fresh/seven-seeded prefixes");
const primitives: Value[] = [
    { kind: "number", value: -0 },
    { kind: "number", value: NaN },
    { kind: "number", value: Infinity },
    { kind: "number", value: -Infinity },
    { kind: "number", value: 9007199254740992 },
    UNDEFINED,
    { kind: "null" },
    { kind: "boolean", value: false },
    { kind: "boolean", value: true },
    { kind: "string", value: "" },
    { kind: "string", value: "0x10" },
    { kind: "string", value: "1e2" },
    { kind: "string", value: "bad" },
    { kind: "string", value: "7" },
];
const oldNumbers = [
    -0,
    NaN,
    Infinity,
    -Infinity,
    9007199254740992,
    NaN,
    0,
    0,
    1,
    0,
    16,
    100,
    NaN,
    7,
];
for (let i = 0; i < primitives.length; i++) {
    const r = fresh();
    define(r, "x", primitives[i]);
    const c = run('"use strict";x++;', r),
        x = own(r, "x");
    check(
        c.type === "normal" &&
            sameValue(c.value, { kind: "number", value: oldNumbers[i] }) &&
            x !== null &&
            sameValue(x, { kind: "number", value: oldNumbers[i] + 1 }),
        "U01-U04 numeric SameValue " + i,
    );
}
for (const source of ["let x=1;out(x++*2);out(-x++);out(x);", "let x=1;out((x)++);out(x);"]) {
    const r = fresh(),
        log: string[] = [];
    recorder(r, log);
    run('"use strict";' + source, r);
    check(log.join(",") === (source.includes("*") ? "2,-2,3" : "1,2"), "U05/U06");
}
{
    const r = fresh(),
        log: string[] = [];
    const h = hooks(r, log);
    define(
        r,
        "base",
        builtin(r, "base", (_t, _a, _c, _l): ValueCompletion => {
            log.push("base");
            return normal({ kind: "object", object: h.o });
        }),
    );
    define(
        r,
        "key",
        builtin(r, "key", (_t, _a, _c, _l): ValueCompletion => {
            log.push("key");
            return normal({ kind: "object", object: h.k });
        }),
    );
    property(r, h.old, wellKnownToPrimitive, {
        value: builtin(r, "number", (_t, a, _c, _l): ValueCompletion => {
            check(scalar(a[0]) === "number", "hint");
            log.push("N");
            property(r, h.k, wellKnownToPrimitive, {
                value: builtin(r, "changed", (_t, _a, _c, _l): ValueCompletion => {
                    throw new Error("key converted twice");
                }),
            });
            return normal({ kind: "string", value: "7" });
        }),
    });
    num(run('"use strict";base()[key()]++;', r), 7);
    check(log.join(",") === "base,key,K,G,N,S8", "U07 exact captured reference");
}
{
    const r = fresh(),
        log: string[] = [];
    const h = hooks(r, log);
    property(r, h.old, wellKnownToPrimitive, { value: UNDEFINED });
    property(r, h.old, "valueOf", {
        value: builtin(r, "valueOf", (t, _a, _c, _l): ValueCompletion => {
            check(t.kind === "object" && t.object === h.old, "valueOf receiver");
            log.push("valueOf");
            return normal(t);
        }),
    });
    property(r, h.old, "toString", {
        value: builtin(r, "toString", (_t, _a, _c, _l): ValueCompletion => {
            log.push("toString");
            return normal({ kind: "string", value: "7" });
        }),
    });
    num(run('"use strict";o.p++;', r), 7);
    check(log.join(",") === "G,valueOf,toString,S8", "U08 ordinary number conversion");
}
{
    const r = fresh(),
        o = new GuestObject(),
        k = new GuestObject(),
        sym = new GuestSymbol("key");
    let calls = 0;
    property(r, k, wellKnownToPrimitive, {
        value: builtin(r, "key", (_t, a, _c, _l): ValueCompletion => {
            calls++;
            check(scalar(a[0]) === "string", "symbol key hint");
            return normal({ kind: "symbol", value: sym });
        }),
    });
    property(r, o, sym, { value: { kind: "number", value: 7 }, writable: true });
    define(r, "o", { kind: "object", object: o });
    define(r, "k", { kind: "object", object: k });
    num(run('"use strict";o[k]++;', r), 7);
    const d = o.getOwnProperty(sym);
    check(
        calls === 1 && d !== undefined && d.kind === "data" && scalar(d.value) === "8",
        "U09 symbol cache",
    );
}
for (const stage of ["get", "number"]) {
    for (const writable of [true, false]) {
        const r = fresh(),
            log: string[] = [];
        const h = hooks(r, log);
        const change = (): void => {
            if (writable) {
                property(r, h.o, "p", {
                    set: builtin(r, "B", (_t, a, _c, _l): ValueCompletion => {
                        log.push("B" + scalar(a[0]));
                        return normal();
                    }),
                });
            } else {
                property(r, h.o, "p", { value: { kind: "number", value: 7 }, writable: false });
            }
        };
        if (stage === "get") {
            property(r, h.o, "p", {
                get: builtin(r, "get", (_t, _a, _c, _l): ValueCompletion => {
                    log.push("G");
                    change();
                    return normal({ kind: "object", object: h.old });
                }),
            });
        } else {
            property(r, h.old, wellKnownToPrimitive, {
                value: builtin(r, "number", (_t, _a, _c, _l): ValueCompletion => {
                    log.push("N");
                    change();
                    return normal({ kind: "number", value: 7 });
                }),
            });
        }
        const c = run('"use strict";o.p++;', r);
        check(
            writable
                ? c.type === "normal" && scalar(c.value) === "7"
                : c.type === "throw" && c.diagnostic.name === "TypeError",
            "U10 current descriptor",
        );
        check(log.join(",") === (writable ? "G,N,B8" : "G,N"), "U10 effects");
    }
}
{
    const r = fresh(),
        p: Value = { kind: "number", value: 3 };
    let gets = 0,
        sets = 0;
    property(r, r.numberPrototype, "x", {
        get: builtin(r, "get", (t, _a, _c, _l): ValueCompletion => {
            check(sameValue(t, p), "primitive getter receiver");
            gets++;
            return normal({ kind: "number", value: 7 });
        }),
        set: builtin(r, "set", (t, a, _c, _l): ValueCompletion => {
            check(sameValue(t, p) && scalar(a[0]) === "8", "primitive setter receiver");
            sets++;
            return normal();
        }),
    });
    define(r, "p", p);
    num(run('"use strict";p.x++;', r), 7);
    check(gets === 1 && sets === 1, "U11 inherited primitive accessor");
}
{
    const r = fresh(),
        symbol: Value = { kind: "symbol", value: new GuestSymbol("x") };
    define(r, "x", symbol);
    const c = run('"use strict";x++;', r);
    check(
        c.type === "throw" && c.diagnostic.name === "TypeError" && own(r, "x") === symbol,
        "U12 symbol failure no write",
    );
}
for (const source of ["missing++;", "x++;let x;", "undefined++;", "x++;"]) {
    const c = run('"use strict";' + source, fresh());
    check(
        c.type === "throw" &&
            c.origin.kind === "engine-diagnostic" &&
            c.diagnostic.name === (source === "undefined++;" ? "TypeError" : "ReferenceError"),
        "U13 runtime " + source,
    );
}
for (const accessor of [true, false]) {
    const r = fresh(),
        o = new GuestObject();
    let gets = 0;
    property(
        r,
        o,
        "p",
        accessor
            ? {
                  get: builtin(r, "get", (_t, _a, _c, _l): ValueCompletion => {
                      gets++;
                      return normal({ kind: "number", value: 7 });
                  }),
              }
            : { value: { kind: "number", value: 7 }, writable: false },
    );
    define(r, "o", { kind: "object", object: o });
    const c = run('"use strict";o.p++;', r);
    check(
        c.type === "throw" && c.diagnostic.name === "TypeError" && gets === (accessor ? 1 : 0),
        "U14 strict failure",
    );
}
{
    const r = fresh(),
        log: string[] = [];
    const h = hooks(r, log);
    define(
        r,
        "key",
        builtin(r, "key", (_t, _a, _c, _l): ValueCompletion => {
            log.push("key");
            return normal({ kind: "object", object: h.k });
        }),
    );
    const c = run('"use strict";null[key()]++;', r);
    check(
        c.type === "throw" && c.diagnostic.name === "TypeError" && log.join(",") === "key",
        "U15 nullish ordering",
    );
}
{
    const r = fresh();
    define(r, "x", { kind: "number", value: 7 });
    num(run('"use strict";(\nx\n)++;', r), 7);
    check(scalar(own(r, "x") ?? UNDEFINED) === "8", "U16 last token");
}
console.log("PASS U01-U16 numeric/reference/coercion controls");

const stages = [
    "initializer",
    "test",
    "body",
    "update",
    "base",
    "key",
    "key-conversion",
    "getter",
    "number",
    "setter",
];
function stageSource(r: Realm, stage: string, callback: Builtin): string {
    const fail = builtin(r, "fail", callback);
    define(r, "fail", fail);
    if (stage === "initializer") {
        return "for(fail();true;out(9))out(8);";
    }
    if (stage === "test") {
        return "for(;fail();out(9))out(8);";
    }
    if (stage === "body") {
        return "for(;;out(9)){fail();out(8);}";
    }
    if (stage === "update") {
        return "for(;true;fail()){out(1);continue;}";
    }
    const o = new GuestObject(),
        key = new GuestObject(),
        old = new GuestObject();
    define(r, "o", { kind: "object", object: o });
    define(r, "k", { kind: "object", object: key });
    property(r, o, "p", {
        value: { kind: "number", value: 7 },
        writable: true,
        configurable: true,
    });
    if (stage === "base") {
        return "fail().p++;out(9);";
    }
    if (stage === "key") {
        return "o[fail()]++;out(9);";
    }
    if (stage === "key-conversion") {
        property(r, key, wellKnownToPrimitive, { value: fail });
        return "o[k]++;out(9);";
    }
    if (stage === "getter") {
        property(r, o, "p", { get: fail });
    }
    if (stage === "number") {
        property(r, old, wellKnownToPrimitive, { value: fail });
        property(r, o, "p", { value: { kind: "object", object: old } });
    }
    if (stage === "setter") {
        property(r, o, "p", {
            get: builtin(r, "get", (_t, _a, _c, _l): ValueCompletion =>
                normal({ kind: "number", value: 7 }),
            ),
            set: fail,
        });
    }
    return "o.p++;out(9);";
}
for (const mode of ["guest", "diagnostic", "resource", "unsupported"]) {
    for (const stage of stages) {
        for (const wrapped of [false, true]) {
            const r = fresh(),
                s = createScriptSession(),
                log: string[] = [];
            recorder(r, log);
            let origin: ThrowOrigin;
            if (mode === "diagnostic") {
                origin = { kind: "engine-diagnostic" };
            } else if (mode === "resource") {
                origin = { kind: "resource-limit", guardCode: "steps", count: 10, limit: 9 };
            } else if (mode === "unsupported") {
                origin = {
                    kind: "unsupported-operation",
                    capabilityCode: "runtime.object-to-string",
                };
            } else {
                origin = { kind: "guest" };
            }
            const q: ThrowCompletion = {
                ...sentinel(),
                origin: origin,
            };
            let calls = 0;
            const source = stageSource(r, stage, (_t, _a, context, _l): ValueCompletion => {
                calls++;
                check(context.realm === r, "callback Realm");
                return q;
            });
            define(r, "original", q.value);
            const record = prepare(
                    '"use strict";' +
                        (wrapped ? "try{" + source + "}catch(e){out(e===original);}" : source),
                    r,
                    "X01",
                ),
                result = evaluateScript(s, record).completion,
                last = s.inspect().lastAbrupt;
            const caught = wrapped && (mode === "guest" || mode === "diagnostic");
            check(caught ? result.type === "normal" : result === q, "X01 exact " + stage);
            let expectedEffects: string;
            if (stage === "update") {
                if (caught) {
                    expectedEffects = "1,true";
                } else {
                    expectedEffects = "1";
                }
            } else if (caught) {
                expectedEffects = "true";
            } else {
                expectedEffects = "";
            }
            check(calls === 1 && log.join(",") === expectedEffects, "X01 effects " + stage);
            check(
                last !== null &&
                    last.record === record &&
                    last.realm === r &&
                    last.loc !== q.diagnostic.loc &&
                    last.loc.line === 900 &&
                    last.loc.column === 9,
                "X01 provenance",
            );
            idle(s);
        }
    }
}
console.log("PASS X01 four origins at ten stages, caught and uncaught");
for (const cross of [false, true]) {
    const a = fresh(),
        b = cross ? fresh() : a,
        s = createScriptSession(),
        q = sentinel();
    let calls = 0;
    let activeA: ExecutableScript | null = null;
    for (const r of cross ? [a, b] : [a]) {
        const o = new GuestObject();
        define(r, "o", { kind: "object", object: o });
        property(r, o, "p", {
            get: builtin(r, "get", (_t, _a, c, _l): ValueCompletion => {
                calls++;
                check(c.realm === r, "X02 Realm");
                if (calls === 2) {
                    check(s.inspect().lastAbrupt?.record === activeA, "A history before B throw");
                }
                return q;
            }),
        });
    }
    const br = prepare('"use strict";function again(){for(;;)o.p++;}', b, "B");
    check(evaluateScript(s, br).completion.type === "normal", "B definition");
    const fn = own(b, "again");
    if (fn === null) {
        throw new Error("again");
    }
    if (cross) {
        define(a, "again", fn);
    }
    activeA = prepare('"use strict";try{o.p++;}catch(e){}again();', a, "A");
    const result = evaluateScript(s, activeA).completion,
        last = s.inspect().lastAbrupt;
    check(
        result === q &&
            result.value === q.value &&
            calls === 2 &&
            last !== null &&
            last.record === br &&
            last.realm === b &&
            last.loc.line === 900 &&
            last.loc.column === 9,
        "X02 reused completion new provenance",
    );
    idle(s);
}
console.log("PASS X02 caught A then reused B throw same/cross Realm");
function sameFrame(
    a: ReturnType<ScriptSession["inspect"]>,
    b: ReturnType<ScriptSession["inspect"]>,
): void {
    const x = a.active,
        y = b.active;
    check(
        a.calls === b.calls && a.depth === b.depth && x !== null && y !== null,
        "nonzero active restoration",
    );
    if (x === null || y === null) {
        throw new Error("missing frame");
    }
    check(
        x.realm === y.realm &&
            x.record === y.record &&
            x.scopeId === y.scopeId &&
            x.lexical === y.lexical &&
            x.variable === y.variable &&
            x.thisValue === y.thisValue &&
            x.function === y.function &&
            x.phase === y.phase &&
            x.strict === y.strict &&
            x.privateEnvironment === y.privateEnvironment,
        "exact frame restoration",
    );
}
function hostFault(action: () => void, message: string): void {
    let caught = false;
    try {
        action();
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }
        check(error.message === message, "host diagnostic " + message);
        caught = true;
    }
    check(caught, "host rejection");
}
for (const stage of stages) {
    const a = fresh(),
        b = fresh(),
        sa = createScriptSession(),
        sb = createScriptSession(),
        sentinel = new Error("X03 host");
    let ac: OperationContext | null = null,
        bc: OperationContext | null = null,
        raw = 0;
    const leaf = a.createBuiltin("leaf", 0, (_t, _args, context, _l): ValueCompletion => {
        check(context === ac && context.realm === a, "owner capability");
        raw++;
        return normal({ kind: "number", value: 7 });
    });
    const leafValue: Value = { kind: "object", object: leaf };
    const source = stageSource(b, stage, (_t, _args, context, loc): ValueCompletion => {
        bc = context;
        const beforeA = sa.inspect(),
            beforeB = sb.inspect();
        if (ac === null) {
            throw new Error("missing A context");
        }
        num(ac.call(leafValue, UNDEFINED, [], loc), 7);
        sameFrame(beforeA, sa.inspect());
        sameFrame(beforeB, sb.inspect());
        throw sentinel;
    });
    const ignored: string[] = [];
    recorder(b, ignored);
    const br = prepare('"use strict";try{' + source + "}catch(e){this.caught=1;}", b, "X03 B");
    define(a, "enter", {
        kind: "object",
        object: a.createBuiltin("enter", 0, (_t, _args, context, loc): ValueCompletion => {
            ac = context;
            const before = sa.inspect();
            check(before.calls > 0 && before.depth > 0, "A active");
            const callable = leaf.callable;
            if (callable === null || callable.kind !== "builtin") {
                throw new Error("leaf");
            }
            hostFault(() => {
                callable.invoke(UNDEFINED, [], context, loc);
            }, "Script execution unavailable");
            let caught = false;
            try {
                evaluateScript(sb, br);
            } catch (error) {
                if (!(error instanceof Error) || error !== sentinel) {
                    throw error;
                }
                caught = true;
            }
            check(
                caught && own(b, "caught") === null && own(b, "bad") === null,
                "X03 host bypass identity",
            );
            idle(sb);
            sameFrame(before, sa.inspect());
            check(context.realm === a, "restored A Realm");
            num(context.call(leafValue, UNDEFINED, [], loc), 7);
            sameFrame(before, sa.inspect());
            return normal();
        }),
    });
    run('"use strict";switch(1){case 1:enter();}', a, sa);
    idle(sa);
    idle(sb);
    check(raw === 2, "authentic calls only");
    if (ac === null || bc === null) {
        throw new Error("retained contexts");
    }
    const retainedA: OperationContext = ac,
        retainedB: OperationContext = bc;
    hostFault(() => {
        retainedA.tick({ line: 1, column: 1 });
    }, "inactive Script session");
    hostFault(() => {
        retainedB.tick({ line: 1, column: 1 });
    }, "inactive Script session");
    hostFault(() => {
        retainedA.call(leafValue, UNDEFINED, [], { line: 1, column: 1 });
    }, "inactive Script session");
}
console.log("PASS X03 nested B host fault restores active A and permits");
for (const hook of ["getter", "number"]) {
    for (const guest of [false, true]) {
        const r = fresh(),
            s = createScriptSession({ maxSteps: 100000, maxCalls: 64 });
        const o = new GuestObject(),
            old = new GuestObject();
        define(r, "o", { kind: "object", object: o });
        run('"use strict";function recurse(){return o.p++;}', r);
        const fn = own(r, "recurse");
        if (fn === null) {
            throw new Error("recursive function");
        }
        const callback = guest
            ? fn
            : builtin(r, "recurse", (_t, _a, c, l): ValueCompletion =>
                  c.call(fn, UNDEFINED, [], l),
              );
        if (hook === "getter") {
            property(r, o, "p", { get: callback });
        } else {
            property(r, old, wellKnownToPrimitive, { value: callback });
            property(r, o, "p", { value: { kind: "object", object: old }, writable: true });
        }
        const result = run('"use strict";try{o.p++;}catch(e){this.bad=1;}', r, s);
        check(
            result.type === "throw" &&
                result.origin.kind === "resource-limit" &&
                own(r, "bad") === null,
            "X04 recursive budget " + hook,
        );
        idle(s);
        console.log("PASS X04 recursion " + hook + " " + guest + " steps " + s.inspect().steps);
    }
}
for (const hook of ["getter", "number"]) {
    const a = fresh(),
        b = fresh(),
        s = createScriptSession(),
        o = new GuestObject(),
        old = new GuestObject();
    define(a, "o", { kind: "object", object: o });
    define(b, "x", { kind: "number", value: 7 });
    run('"use strict";function increment(){return x++;}', b);
    const fn = own(b, "increment");
    if (fn === null) {
        throw new Error("increment");
    }
    let seen = 0;
    const callback = builtin(a, "reenter", (_t, _a, c, l): ValueCompletion => {
        const before = s.inspect();
        check(c.realm === a, "outer Realm");
        const result = c.call(fn, UNDEFINED, [], l);
        sameFrame(before, s.inspect());
        check(
            c.realm === a && s.inspect().steps > before.steps,
            "shared budget and restored Realm",
        );
        seen++;
        return result;
    });
    if (hook === "getter") {
        property(a, o, "p", {
            get: callback,
            set: builtin(a, "set", (_t, args, _c, _l): ValueCompletion => {
                check(scalar(args[0]) === "8", "outer new value");
                return normal();
            }),
        });
    } else {
        property(a, old, wellKnownToPrimitive, { value: callback });
        property(a, o, "p", { value: { kind: "object", object: old }, writable: true });
    }
    num(run('"use strict";o.p++;', a, s), 7);
    check(seen === 1 && scalar(own(b, "x") ?? UNDEFINED) === "8", "X04 cross Realm increments");
    idle(s);
}
console.log("PASS X04 same-session cross-Realm getter/numeric reentry");
{
    const evaluator = new Evaluator(new Realm((_line: string) => {})),
        env = new Environment(null);
    const node: Stmt = {
        kind: "for",
        loc,
        initializer: null,
        test: null,
        update: null,
        body: { kind: "empty", loc },
    };
    hostFault(() => {
        evaluator.statementInner(node, env, UNDEFINED);
    }, "Script for AST requires Script execution");
    hostFault(() => {
        evaluator.evaluate(
            {
                kind: "update",
                op: "++",
                prefix: false,
                loc,
                target: { kind: "identifier", loc, name: "effect" },
            },
            env,
            UNDEFINED,
        );
    }, "Script update AST requires Script execution");
    check(env.bindings.size === 0, "legacy no target effects");
    for (const source of ["x++;", "switch(1){case 1:x++;}", "return;class X{}x++;"]) {
        const p = parse(source);
        check(
            p.error !== null &&
                p.error.message === "unsupported operator: ++" &&
                p.rejection?.kind === "unsupported-syntax" &&
                p.rejection.capabilityCode === "lex.operator" &&
                auditScriptReturns(source).kind === "blocked",
            "legacy exact lex rejection",
        );
    }
}
{
    const r = fresh(),
        source =
            '"use strict";for(var f=function(){return 7;};function(){return false;}();function(){return 1;}()){let x;function g(){return x;}var y;}';
    const record = prepare(source, r, "associations"),
        plan = record.inspect(),
        nodes = record.inspectNodes();
    check(
        plan.scopes.map((s) => s.kind).join(",") ===
            "script,function,function,function,block,function",
        "source order scopes",
    );
    check(
        plan.scopes.map((s) => (s.parent === null ? "null" : "" + s.parent)).join(",") ===
            "null,0,0,0,0,4",
        "scope parents",
    );
    check(
        plan.declarations.map((d) => d.site.name).join(",") === "f,x,g,y" &&
            plan.scopes[0].varDeclarations.join(",") === "0,3" &&
            plan.scopes[4].lexicalDeclarations.join(",") === "1,2" &&
            plan.scopes[4].varDeclarations.join(",") === "3",
        "declaration order/association",
    );
    const texts = ["function(){return 7;}", "function(){return false;}", "function(){return 1;}"];
    for (let i = 0; i < 3; i++) {
        check(nodes.scopes[i + 1].text === texts[i], "original source span");
    }
    check(
        nodes.declarations[0].kind === "var" &&
            nodes.declarations[0].initializerKind === "function",
        "original header var",
    );
    for (const n of nodes.scopes) {
        n.bodyLength = 999;
        n.text = "poison";
    }
    nodes.declarations.length = 0;
    for (const scope of plan.scopes) {
        (scope.varDeclarations as number[]).length = 0;
    }
    check(
        evaluateScript(createScriptSession(), record).completion.type === "normal",
        "detached mutation",
    );
    const fn = own(r, "f");
    if (fn === null || fn.kind !== "object") {
        throw new Error("f");
    }
    const callable = fn.object.callable;
    check(
        callable !== null &&
            callable.kind === "script-guest" &&
            callable.record === record &&
            callable.realm === r &&
            callable.sourceText() === texts[0] &&
            fn.object.getPrototypeOf() === r.functionPrototype,
        "F19 source/Realm/prototype",
    );
    const name = fn.object.getOwnProperty("name"),
        length = fn.object.getOwnProperty("length");
    check(
        name !== undefined &&
            name.kind === "data" &&
            scalar(name.value) === "f" &&
            length !== undefined &&
            length.kind === "data" &&
            scalar(length.value) === "0",
        "function metadata",
    );
    for (const target of [r, fresh()]) {
        define(target, "saved", fn);
        num(run('"use strict";saved();', target), 7);
    }
}
{
    const r = fresh();
    run(
        '"use strict";var a;var b;for(var i=0;i<2;i++){let x=i;if(i===0)a=function(){return x;};else b=function(){return x;};}',
        r,
    );
    for (const target of [r, fresh()]) {
        for (const name of ["a", "b"]) {
            const fn = own(r, name);
            if (fn === null) {
                throw new Error("closure");
            }
            define(target, "saved", fn);
            num(run('"use strict";saved();', target), name === "a" ? 0 : 1);
        }
    }
}
for (const source of [
    "for(var i=0,i=1;false;);i;",
    "function f(){for(var i=7;false;);return i;}f();",
    "let i;function f(){for(var i=7;false;);return i;}f();",
    "for(;false;){var x;}x;",
    'for(var x=true?"p" in {p:1}:false;false;);x;',
    'for(var x=["p" in {p:1}];false;);x[0];',
    'for(var x={p:"p" in {p:1}};false;);x.p;',
]) {
    const c = run('"use strict";' + source, fresh());
    check(c.type === "normal", "positive grammar/declaration neighbor " + source);
}
for (const source of [
    '"use strict";' + " ".repeat(100001),
    '"use strict";' + "for(;;){".repeat(130) + "}".repeat(130),
]) {
    const p = prepareStrictScript({ id: "resource", text: source }, fresh());
    check(p.kind === "blocked" && p.rejection.kind === "resource-limit", "source/depth cap");
}
{
    const r = fresh(),
        s = createScriptSession({ maxSteps: 30, maxCalls: 64 });
    const c = run('"use strict";for(;;){}', r, s);
    check(
        c.type === "throw" && c.origin.kind === "resource-limit" && s.inspect().steps === 31,
        "original infinite for resource",
    );
    idle(s);
}
console.log(
    "PASS X05 legacy guards, source associations, closure retention, resource and grammar boundaries",
);

for (const source of ["-x++.p;", "!x++();", "-x++[0];"]) {
    check(
        prepareStrictScript({ id: "postfix suffix", text: '"use strict";' + source }, fresh())
            .kind !== "ready",
        "unparenthesized unary/postfix suffix",
    );
}
for (const source of ["let x=1;(-x++).p;", "let x=1;(x++).p;", '"++".length;']) {
    check(
        run('"use strict";' + source, fresh()).type === "normal",
        "parenthesized postfix/string suffix",
    );
}

{
    const nodes: DeclarationNodes = {
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
        assignmentNameEligible: new Map(),
    };
    const source = '"use strict";for(var f=function(){return 7;};false;){var y;}';
    const plan = parseDeclarationPlan({ id: "original associations", text: source }, nodes);
    check(plan.kind === "complete", "complete original plan");
    const loop = nodes.body[1],
        first = nodes.declarations.get(0),
        second = nodes.declarations.get(1);
    if (
        loop.kind !== "for" ||
        loop.initializer === null ||
        loop.initializer.kind !== "var" ||
        loop.body.kind !== "block"
    ) {
        throw new Error("original loop nodes");
    }
    check(
        first !== undefined &&
            first.node.kind === "var" &&
            first.node === loop.initializer &&
            first.initializer === loop.initializer.declarations[0].init,
        "exact original header VarStmt and initializer",
    );
    const bodyDeclaration = loop.body.body[0],
        initializer = loop.initializer.declarations[0].init;
    if (bodyDeclaration.kind !== "var" || initializer === null || initializer.kind !== "function") {
        throw new Error("original declaration kinds");
    }
    check(
        second !== undefined && second.node.kind === "var" && second.node === bodyDeclaration,
        "exact original body declaration",
    );
    const fn = nodes.scopes.get(1),
        block = nodes.scopes.get(2);
    check(
        fn !== undefined &&
            fn.node !== null &&
            fn.node.kind === "function" &&
            fn.node === initializer &&
            block !== undefined &&
            block.node !== null &&
            block.node.kind === "block" &&
            block.node === loop.body &&
            block.body === loop.body.body,
        "exact original function/block identities",
    );
}

for (const expression of ["base()[key]++", "++base()[key]", "base()[key]--", "--base()[key]"]) {
    const r = fresh();
    let trace = "",
        stored = 0;
    const target = r.createObject(),
        key = r.createObject(),
        value = r.createObject();
    define(
        r,
        "base",
        builtin(r, "base", (_receiver, _args, _context, _loc): ValueCompletion => {
            trace += "B";
            return normal({ kind: "object", object: target });
        }),
    );
    key.bootstrapDefine("toString", {
        value: builtin(r, "key", (_receiver, _args, _context, _loc): ValueCompletion => {
            trace += "K";
            return normal({ kind: "string", value: "p" });
        }),
    });
    value.bootstrapDefine("valueOf", {
        value: builtin(r, "number", (_receiver, _args, _context, _loc): ValueCompletion => {
            trace += "C";
            return normal({ kind: "number", value: 7 });
        }),
    });
    define(r, "key", { kind: "object", object: key });
    property(r, target, "p", {
        get: builtin(r, "get", (_receiver, _args, _context, _loc): ValueCompletion => {
            trace += "G";
            return normal({ kind: "object", object: value });
        }),
        set: builtin(r, "set", (_receiver, args, _context, _loc): ValueCompletion => {
            trace += "S";
            check(args[0].kind === "number", "numeric update write");
            if (args[0].kind === "number") {
                stored = args[0].value;
            }
            return normal();
        }),
        configurable: true,
    });
    const updated = expression.includes("++") ? 8 : 6;
    num(run('"use strict";' + expression + ";", r), expression.startsWith("base") ? 7 : updated);
    check(
        trace === "BKGCS" && stored === updated,
        "update reference and coercion order " + expression,
    );
}
for (const source of [
    "++1;",
    "--(a+b);",
    "++f();",
    "x++++;",
    "new ++x;",
    "x--.p;",
    "-x--();",
    "(++x)++;",
]) {
    check(
        prepareStrictScript({ id: "invalid update", text: '"use strict";' + source }, fresh())
            .kind !== "ready",
        "reject invalid update " + source,
    );
}
for (const source of [
    "let x=2; (++x).p;",
    "let x=2; (--x).p;",
    "let x=2; (-x--).p;",
    "let x=2; --(x);",
]) {
    check(
        run('"use strict";' + source, fresh()).type === "normal",
        "parenthesized update " + source,
    );
}
