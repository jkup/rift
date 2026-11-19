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
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
} from "../src/runtime.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import type { Location, Stmt } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function prepare(source: string, realm: Realm, id = "catch"): ExecutableScript {
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
const input = readFileSync(process.argv[2], "utf8");
check(
    input === '"use strict"; try{throw 7;}catch(e){out(e);}' ||
        input === '"use strict"; try{throw 11;}catch(e){out(e);}',
    "runtime source",
);
const inputRealm = fresh(),
    inputLog: string[] = [];
define(inputRealm, "out", {
    kind: "object",
    object: inputRealm.createBuiltin("out", 1, (_t, args, _c, _l): ValueCompletion => {
        inputLog.push(scalar(args[0]));
        return normal();
    }),
});
check(
    run(input, inputRealm).type === "normal" &&
        inputLog.join(",") === (input.includes("7") ? "7" : "11"),
    "literal runtime output",
);
console.log("PASS runtime source");

const rows = [
    { id: "C01", source: "try { throw 7; } catch (e) { out(e); }", log: "7" },
    { id: "C02", source: "try { out(1); } catch (e) { out(9); }", log: "1" },
    { id: "C03", source: "let e=3; try { throw 7; } catch(e) { out(e); } out(e);", log: "7,3" },
    { id: "C05", source: "function f(){try{return 5;}catch(e){return 9;}} out(f());", log: "5" },
    { id: "C11", source: "while(true){try{break;}catch(e){out(9);}} out(1);", log: "1" },
    {
        id: "C12",
        source: "let n=0; while(n<2){n+=1;try{continue;}catch(e){out(9);}out(8);}out(n);",
        log: "2",
    },
    {
        id: "C13",
        source: "function f(){try{throw 7;}catch(e){return function(){return e;};}} out(f()());",
        log: "7",
    },
    {
        id: "D01",
        source: "out(x);out(y);try{var x=1;}catch(e){var y=2;}out(x);out(y);",
        log: "undefined,undefined,1,undefined",
    },
    {
        id: "D02",
        source: "function f(){out(x);out(y);try{var x=1;throw 7;}catch(e){var y=2;}out(x);out(y);}f();",
        log: "undefined,undefined,1,2",
    },
    {
        id: "D03",
        source: "try{throw 7;}catch(e){try{throw 11;}catch(e){out(e);}out(e);}",
        log: "11,7",
    },
    {
        id: "D04",
        source: "let saved;try{throw 7;}catch(e){try{throw 11;}catch(f){saved=function(){return e+f;};}}out(saved());",
        log: "18",
    },
    { id: "D08", source: "try{throw 7;}catch(e){{let e=11;out(e);}out(e);}", log: "11,7" },
    {
        id: "D09",
        source: "try{throw 7;}catch(e){function f(){var e=11;return e;}out(f());out(e);}",
        log: "11,7",
    },
];
for (const row of rows) {
    const r = fresh(),
        log: string[] = [];
    const out = r.createBuiltin("out", 1, (_this, args, _context, _loc): ValueCompletion => {
        log.push(scalar(args[0]));
        return normal();
    });
    define(r, "out", { kind: "object", object: out });
    const result = run('"use strict";' + row.source, r);
    check(
        result.type === "normal" && result.value.kind === "undefined" && log.join(",") === row.log,
        row.id,
    );
    console.log("PASS " + row.id);
}
const rejects = [
    "try { throw 7; } catch(e) { let e; }",
    "try { throw 7; } finally { out(9); }",
    "try{throw 7;}catch(e){function e(){}}",
    "try{}catch(eval){}",
    "try{}catch(arguments){}",
    "try{}catch(implements){}",
    "try{}catch(e){var e;}",
    "try{}catch(e){{var e;}}",
    "try{}catch(e){let x;let x;}",
    "try{}catch(e){return 1;}",
    "try{}catch(e){class X{}}",
    "try{}catch{}",
    "try{}catch({e}){}",
    "try{}catch(e){}finally{}",
    "try 1;catch(e){}",
    "try{}catch(e)1;",
];
for (const source of rejects) {
    const r = fresh(),
        log: string[] = [];
    define(r, "out", {
        kind: "object",
        object: r.createBuiltin("out", 1, (_r, args, _c, _l): ValueCompletion => {
            log.push(scalar(args[0]));
            return normal();
        }),
    });
    const p = prepareStrictScript({ id: "reject", text: '"use strict";' + source }, r);
    if (
        source === "try { throw 7; } finally { out(9); }" ||
        source === "try{}catch(e){}finally{}"
    ) {
        check(p.kind === "ready" && log.length === 0, "finally preparation is inert");
        const result = run('"use strict";' + source, r);
        if (source.includes("throw 7")) {
            check(
                result.type === "throw" && scalar(result.value) === "7" && log.join(",") === "9",
                "finally runs before rethrow",
            );
        } else {
            check(result.type === "normal" && log.length === 0, "empty finally executes");
        }
        continue;
    }
    if (source === "try{}catch({e}){}") {
        check(p.kind === "ready" && log.length === 0, "pattern catch preparation is inert");
        check(
            run('"use strict";' + source, r).type === "normal" && log.length === 0,
            "original unentered pattern catch executes",
        );
        continue;
    }
    if (source === "try{}catch{}") {
        check(p.kind === "ready" && log.length === 0, "optional catch preparation is inert");
        check(
            run('"use strict";' + source, r).type === "normal" && log.length === 0,
            "original optional catch executes",
        );
        continue;
    }
    if (source === "try{}catch(e){class X{}}") {
        check(p.kind === "ready" && log.length === 0, "class catch preparation is inert");
        check(
            run('"use strict";' + source, r).type === "normal" && log.length === 0,
            "original unentered class catch executes",
        );
        continue;
    }
    check(p.kind === "blocked" || p.kind === "conflict", "whole-unit reject " + source);
    if (p.kind === "blocked") {
        check(p.rejection.kind === "unsupported-syntax", "no certification");
    }
}
check(parse('"use strict";try{}catch(e){}').error !== null, "legacy grammar closed");
check(
    prepareStrictScript({ id: "sloppy", text: "try{}catch(e){}" }, fresh()).kind === "blocked",
    "sloppy catch closed",
);
check(run('"use strict";try{}catch(value){}', fresh()).type === "normal", "D06 valid neighbor");
console.log("PASS C06 C07 D05 D06 D07 D10 grammar neighbors");

// Literal pre-assignment arrays; never produced from evaluator observations.
const prefixes = [
    {
        id: "P14",
        source: '"use strict";try{throw 7;}catch(e){e;}',
        columns: [1, 1, 14, 17, 17, 18, 24, 27, 33, 33, 35, 35, 36, 36],
    },
    {
        id: "P14R",
        source: '"use strict";try{throw 7;}catch(e){throw e;}',
        columns: [1, 1, 14, 17, 17, 18, 24, 27, 33, 33, 35, 35, 36, 42],
    },
    { id: "P05", source: '"use strict";try{}catch(e){e;}', columns: [1, 1, 14, 17, 17] },
    {
        id: "P15F",
        source: '"use strict";try{throw 7;}catch(e){(function(){return e;});}',
        columns: [1, 1, 14, 17, 17, 18, 24, 27, 33, 33, 35, 35, 36, 37, 37],
    },
];
for (const row of prefixes) {
    for (const seed of [0, 7]) {
        for (let k = 0; k <= row.columns.length; k++) {
            const r = fresh(),
                s = createScriptSession({ maxSteps: seed + k, maxCalls: 64 });
            if (seed === 7) {
                num(run('"use strict";this.seed=1;', r, s), 1);
                check(s.inspect().steps === 7, "seed7");
            }
            const record = prepare(row.source, r, row.id),
                result = evaluateScript(s, record),
                c = result.completion;
            idle(s);
            check(result.phase === "body", "prefix body " + row.id + ":" + k);
            check(
                s.inspect().steps === seed + k + (k < row.columns.length ? 1 : 0),
                "prefix steps",
            );
            const seedValue = own(r, "seed");
            check(
                seed === 0
                    ? seedValue === null
                    : seedValue !== null && seedValue.kind === "number" && seedValue.value === 1,
                "seed preserved",
            );
            check(own(r, "e") === null && own(r, "saved") === null, "no catch publication");
            if (k < row.columns.length) {
                check(
                    c.type === "throw" &&
                        c.origin.kind === "resource-limit" &&
                        c.origin.guardCode === "steps" &&
                        c.origin.count === seed + k + 1 &&
                        c.origin.limit === seed + k,
                    "resource prefix",
                );
                if (c.type !== "throw") {
                    throw new Error("prefix throw");
                }
                check(
                    c.diagnostic.loc.line === 1 && c.diagnostic.loc.column === row.columns[k],
                    "prefix location " + row.id + ":" + k,
                );
                check(s.inspect().lastAbrupt?.record === record, "target provenance");
            } else if (row.id === "P14") {
                num(c, 7);
            } else if (row.id === "P14R") {
                check(
                    c.type === "throw" &&
                        c.origin.kind === "guest" &&
                        c.value.kind === "number" &&
                        c.value.value === 7 &&
                        c.diagnostic.loc.column === 36,
                    "rethrow full",
                );
            } else if (row.id === "P05") {
                check(c.type === "normal" && c.value.kind === "undefined", "empty update");
            } else {
                if (c.type !== "normal" || c.value.kind !== "object") {
                    throw new Error("full closure");
                }
                const fn = c.value.object.callable;
                check(
                    fn !== null &&
                        fn.kind === "script-guest" &&
                        fn.record === record &&
                        fn.realm === r,
                    "original closure",
                );
                // A new ample-budget session invokes the retained closure. Limits never change.
                define(r, "saved", c.value);
                num(run('"use strict";saved();', r, createScriptSession()), 7);
                const other = fresh();
                define(other, "saved", c.value);
                num(run('"use strict";saved();', other, createScriptSession()), 7);
            }
        }
    }
    console.log("PASS " + row.id + " fresh/seven-seeded all prefixes");
}

for (const cross of [false, true]) {
    const a = fresh(),
        b = cross ? fresh() : a,
        s = createScriptSession();
    const v: Value = { kind: "object", object: new GuestObject() },
        loc: Location = { line: 900, column: 9 };
    const q: ThrowCompletion = {
        type: "throw",
        origin: { kind: "guest" },
        value: v,
        diagnostic: { phase: "runtime", name: "sentinel", message: "same", loc },
    };
    const calls: number[] = [];
    let recordA: ExecutableScript | null = null,
        recordB: ExecutableScript | null = null;
    for (const r of cross ? [a, b] : [a]) {
        const probe = r.createBuiltin(
            "probe",
            0,
            (_this, _args, context, site): ValueCompletion => {
                check(context.realm === r, "allocation Realm");
                const state = s.inspect();
                check(
                    state.steps === (calls.length === 0 ? 28 : 40) && state.calls === 2,
                    "C14 exact shared counters",
                );
                check(
                    state.active !== null &&
                        state.active.record === (calls.length === 0 ? recordA : recordB),
                    "callback source",
                );
                if (calls.length === 1) {
                    check(
                        state.lastAbrupt !== null &&
                            state.lastAbrupt.record === recordA &&
                            state.lastAbrupt.loc.line === 900 &&
                            state.lastAbrupt.loc.column === 9,
                        "retained A history",
                    );
                }
                check(site.line === 1, "call line");
                calls.push(site.column);
                return q;
            },
        );
        define(r, "probe", { kind: "object", object: probe });
    }
    recordA = prepare('"use strict";function a(){probe();}', a, "A");
    recordB = prepare('"use strict";function b(){1;probe();}', b, "B");
    evaluateScript(s, recordA);
    check(s.inspect().steps === 9, "A definition ticks");
    evaluateScript(s, recordB);
    check(s.inspect().steps === 18, "B definition ticks");
    if (cross) {
        const f = own(b, "b");
        if (f === null) {
            throw new Error("b");
        }
        define(a, "b", f);
    }
    const result = run('"use strict";try{a();}catch(e){}b();', a, s);
    check(
        result === q && result.value === v && result.diagnostic.loc === loc,
        "C14 exact completion/value/location",
    );
    check(calls.join(",") === "27,29", "C14 callsites");
    check(
        s.inspect().steps === 40 && own(a, "a") !== null && own(b, "b") !== null,
        "C14 counters and prior effects retained",
    );
    const last = s.inspect().lastAbrupt;
    check(
        last !== null &&
            last.record === recordB &&
            last.unitId === "B" &&
            last.realm === b &&
            last.loc !== loc &&
            last.loc.line === 900 &&
            last.loc.column === 9,
        "C14 recaptured B snapshot",
    );
    console.log("PASS C14 " + (cross ? "cross Realm" : "same Realm"));
}
{
    const r = fresh(),
        s = createScriptSession();
    const loc: Location = { line: 900, column: 9 };
    const q: ThrowCompletion = {
        type: "throw",
        origin: { kind: "guest" },
        value: { kind: "object", object: new GuestObject() },
        diagnostic: { phase: "runtime", name: "sentinel", message: "history", loc },
    };
    define(r, "probe", {
        kind: "object",
        object: r.createBuiltin("probe", 0, (_t, _a, _c, _l): ValueCompletion => q),
    });
    const a = prepare('"use strict";function a(){probe();}', r, "history");
    evaluateScript(s, a);
    const c = run('"use strict";try{a();}catch(e){}', r, s);
    const last = s.inspect().lastAbrupt;
    check(
        c.type === "normal" &&
            c.value.kind === "undefined" &&
            last !== null &&
            last.record === a &&
            last.loc.line === 900 &&
            last.loc.column === 9 &&
            s.inspect().steps === 24,
        "consumption retains history",
    );
}
{
    const r = fresh(),
        s = createScriptSession(),
        log: string[] = [];
    define(r, "out", {
        kind: "object",
        object: r.createBuiltin("out", 1, (_t, args, _c, _l): ValueCompletion => {
            log.push(scalar(args[0]));
            return normal();
        }),
    });
    const c = run(
        '"use strict";let x={}; try { throw x; } catch(e) { out(e===x); throw e; }',
        r,
        s,
    );
    check(
        c.type === "throw" &&
            c.origin.kind === "guest" &&
            c.value.kind === "object" &&
            log.join(",") === "true" &&
            c.diagnostic.loc.column === 64,
        "C04 exact guest rethrow",
    );
    log.length = 0;
    const d = run('"use strict";try { throw 7; } catch(e) { out(8); } throw 9;', r, s);
    check(
        d.type === "throw" &&
            d.value.kind === "number" &&
            d.value.value === 9 &&
            d.diagnostic.loc.column === 52 &&
            log.join(",") === "8" &&
            s.inspect().lastAbrupt?.loc.column === 52,
        "C10 fresh final source",
    );
}
for (const mode of ["resource", "unsupported", "host", "diagnostic"]) {
    const r = fresh(),
        s = createScriptSession({ maxSteps: 100, maxCalls: 64 }),
        sentinel = new Error("host catch bypass");
    let effects = 0;
    define(r, "out", {
        kind: "object",
        object: r.createBuiltin("out", 1, (_t, _a, _c, _l): ValueCompletion => {
            effects++;
            return normal();
        }),
    });
    const q: ThrowCompletion = {
        type: "throw",
        origin: { kind: "unsupported-operation", capabilityCode: "runtime.object-to-string" },
        value: { kind: "string", value: "unsupported" },
        diagnostic: {
            phase: "runtime",
            name: "TypeError",
            message: "unsupported",
            loc: { line: 88, column: 4 },
        },
    };
    define(r, "fault", {
        kind: "object",
        object: r.createBuiltin("fault", 0, (_t, _a, _c, _l): ValueCompletion => {
            if (mode === "host") {
                throw sentinel;
            }
            return q;
        }),
    });
    if (mode === "host") {
        let caught = false;
        try {
            run('"use strict";try { fault(); } catch(e) { out(9); }', r, s);
        } catch (e) {
            if (!(e instanceof Error) || e !== sentinel) {
                throw e;
            }
            caught = true;
        }
        check(caught, "C09 host identity");
    } else {
        const source =
            mode === "resource"
                ? '"use strict";try { while(true){} } catch(e) { out(9); }'
                : mode === "diagnostic"
                  ? '"use strict";try{missing;}catch(e){out(e);}'
                  : '"use strict";try{fault();}catch(e){out(9);}';
        const c = run(source, r, s);
        if (mode === "resource") {
            check(
                c.type === "throw" &&
                    c.origin.kind === "resource-limit" &&
                    s.inspect().steps === 101,
                "C08 resource bypass",
            );
        } else if (mode === "unsupported") {
            check(c === q, "unsupported exact bypass");
        } else {
            check(c.type === "normal" && effects === 1, "engine diagnostic is language throw");
        }
    }
    idle(s);
    check(effects === (mode === "diagnostic" ? 1 : 0), "bypass effects");
}
for (const calls of [3, 1000]) {
    const r = fresh(),
        s = createScriptSession({ maxSteps: 100000, maxCalls: calls });
    const c = run(
        '"use strict";function f(){return 1+f();}try{f();}catch(e){this.caught=1;}',
        r,
        s,
    );
    check(
        c.type === "throw" &&
            c.origin.kind === "resource-limit" &&
            c.origin.guardCode === (calls === 3 ? "calls" : "evaluation-depth") &&
            own(r, "caught") === null,
        "call/depth resources bypass catch",
    );
}
console.log("PASS C04 C08 C09 C10 consumption history and origin distinction");

{
    const r = fresh(),
        record = prepare('"use strict";try{var a;}catch(e){var b;function f(){var c;}let d;}', r);
    const p = record.inspect(),
        scopes = p.scopes;
    check(
        scopes.length === 5 &&
            scopes[1].kind === "block" &&
            scopes[1].parent === 0 &&
            scopes[2].kind === "catch" &&
            scopes[2].parent === 0 &&
            scopes[3].kind === "block" &&
            scopes[3].parent === 2 &&
            scopes[4].kind === "function" &&
            scopes[4].parent === 3,
        "original traversal scope associations",
    );
    check(
        scopes[0].varNames.join(",") === "a,b" &&
            scopes[2].varNames.length === 0 &&
            scopes[2].lexicalDeclarations.length === 0 &&
            scopes[2].varDeclarations.length === 0 &&
            scopes[2].lexicalNames.join(",") === "e",
        "catch metadata and hoisting",
    );
    const parameter = scopes[2].catchParameter;
    check(
        parameter !== null &&
            parameter.name === "e" &&
            parameter.start === 30 &&
            parameter.end === 31,
        "parameter offsets",
    );
    check(
        parameter !== record.inspect().scopes[2].catchParameter &&
            parameter?.loc !== record.inspect().scopes[2].catchParameter?.loc,
        "detached parameter identities",
    );
    check(
        record.inspect().scopes[2].catchParameter?.loc.column === 31,
        "detached parameter snapshot",
    );
    for (const scope of scopes) {
        if (scope.kind !== "catch") {
            check(scope.catchParameter === null, "other parameter null");
        }
    }
}
console.log("PASS declaration inspection detached catch metadata");

check(
    run('"use strict";1;try{}catch(e){}', fresh()).value.kind === "undefined",
    "try UpdateEmpty undefined",
);
num(run('"use strict";try{2;}catch(e){}', fresh()), 2);
for (const cross of [false, true]) {
    const a = fresh(),
        b = cross ? fresh() : a,
        s = createScriptSession();
    const v: Value = { kind: "object", object: new GuestObject() };
    define(b, "original", v);
    const source = prepare(
        '"use strict";function fail(){throw original;}function retain(){try{throw original;}catch(e){return function(){return e;};}}',
        b,
        "defining",
    );
    evaluateScript(s, source);
    if (cross) {
        for (const name of ["fail", "retain"]) {
            const value = own(b, name);
            if (value === null) {
                throw new Error("missing function");
            }
            define(a, name, value);
        }
        define(a, "original", v);
    }
    const caught = run('"use strict";try{fail();}catch(e){e===original;}', a, s);
    check(
        caught.type === "normal" && caught.value.kind === "boolean" && caught.value.value,
        "cross-unit C01 exact catch value",
    );
    const rethrow = run('"use strict";try{fail();}catch(e){throw e;}', a, s);
    check(
        rethrow.type === "throw" && rethrow.value === v && s.inspect().lastAbrupt?.realm === a,
        "cross-unit C04 rethrow",
    );
    const retained = run('"use strict";retain();', a, s);
    if (retained.type !== "normal" || retained.value.kind !== "object") {
        throw new Error("retained closure");
    }
    const fn = retained.value.object.callable;
    check(
        fn !== null && fn.kind === "script-guest" && fn.record === source && fn.realm === b,
        "C13 retained defining provenance",
    );
    define(a, "saved", retained.value);
    const called = run('"use strict";saved();', a, s);
    check(called.type === "normal" && called.value === v, "C13 cross-unit closure exact value");
}
console.log("PASS explicit empty and C01 C04 C13 cross-unit cross-Realm controls");

// Trusted-host AST calls cannot select Script semantics through the legacy API.
// Preserve the pre-H1 var diagnostic verbatim, independently of the new arm.
{
    const evaluator = new Evaluator(new Realm((_line: string) => {}));
    const environment = new Environment(null),
        loc: Location = { line: 1, column: 1 };
    const rows: { node: Stmt; expected: string }[] = [
        {
            node: { kind: "var", loc, declarations: [] },
            expected: "Script var AST requires Script execution",
        },
        {
            node: {
                kind: "try-catch",
                loc,
                block: { kind: "block", loc, body: [] },
                parameter: { name: "e", start: 12, end: 13, loc },
                catchLoc: loc,
                catchStart: 5,
                catchEnd: 16,
                handler: { kind: "block", loc, body: [] },
            },
            expected: "Script try-catch AST requires Script execution",
        },
    ];
    for (const row of rows) {
        let rejected = false;
        try {
            evaluator.statementInner(row.node, environment, UNDEFINED);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }
            check(error.message === row.expected, "literal legacy AST diagnostic");
            rejected = true;
        }
        check(
            rejected &&
                evaluator.steps === 0 &&
                evaluator.calls === 0 &&
                evaluator.depth === 0 &&
                environment.bindings.size === 0,
            "legacy AST rejection before effects",
        );
    }
}
console.log("PASS exact legacy var and distinct try-catch AST diagnostics");
