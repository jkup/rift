import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareStrictScript, type ExecutableScript } from "../src/script-record.js";
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
const name = input[0],
    payload = input[1];
if (!((name === "seed" && payload === "7") || (name === "other" && payload === "11"))) {
    throw new Error("input");
}
const a = new Realm((_line: string) => {
    throw new Error("source ran");
}, "script");
const b = new Realm((_line: string) => {
    throw new Error("source ran");
}, "script");
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function ready(text: string, id = "A:0"): ExecutableScript {
    const result = prepareStrictScript({ id, text }, a);
    if (result.kind !== "ready") {
        throw new Error("expected ready: " + text.slice(0, 100));
    }
    return result.record;
}
function kind(text: string, expected: string): void {
    check(prepareStrictScript({ id: "bad", text }, a).kind === expected, expected);
}
const unit = { id: "A:0", text: '"use strict";function f(a){return a;}' };
const prepared = prepareStrictScript(unit, a);
if (prepared.kind !== "ready") {
    throw new Error("P01 ready");
}
const record = prepared.record;
unit.id = "changed";
unit.text = "changed";
const p = record.inspect(),
    nodes = record.inspectNodes();
check(p.unit.id === "A:0" && p.unit.text.length === 37 && p.consumedUnits === 37, "P01 unit");
check(
    p.functions.length === 1 && p.functions[0].start === 13 && p.functions[0].end === 37,
    "P01 ranges",
);
check(p.scopes[1].formals[0].start === 24 && p.scopes[1].formals[0].end === 25, "P01 formal");
check(p.scopes[1].parent === 0 && p.functions[0].strictness.inheritedStrict, "P01 strict");
check(
    nodes.scopes[0].bodyLength === 2 &&
        nodes.scopes[1].bodyLength === 1 &&
        nodes.scopes[1].text === "function f(a){return a;}",
    "P01 body",
);
check(record.belongsTo(a) && !record.belongsTo(b), "P01 owner");
// Mutation is test-only: deliberately erase readonly through structural casts.
(p.unit as { id: string; text: string }).text = "bad";
(p.strictness.directives as readonly { loc: { line: number }; raw: string }[])[0].loc.line = 99;
(p.strictness.directives as readonly { raw: string }[])[0].raw = "bad";
(p.scopes[1].formals as readonly { name: string; loc: { column: number } }[])[0].name = "bad";
(p.scopes[1].formals as readonly { loc: { column: number } }[])[0].loc.column = 99;
(p.scopes[0].varNames as string[]).push("bad");
(p.scopes[0].varDeclarations as number[]).push(99);
(p.scopes[0].lexicalNames as string[]).push("bad");
(p.scopes[0].lexicalDeclarations as number[]).push(99);
(p.declarations[0].site as { name: string; loc: { line: number } }).name = "bad";
(p.declarations[0].site.loc as { line: number }).line = 99;
(p.functions[0].strictness as { inheritedStrict: boolean }).inheritedStrict = false;
(p.functions as readonly { start: number }[])[0].start = 99;
nodes.scopes[1].parameters[0] = "bad";
nodes.scopes[1].text = "bad";
if (nodes.scopes[1].loc !== null) {
    nodes.scopes[1].loc.line = 99;
}
nodes.declarations[0].loc.line = 99;
nodes.scopes.length = 0;
const clean = record.inspect(),
    cleanNodes = record.inspectNodes();
check(
    clean.unit.text === '"use strict";function f(a){return a;}' &&
        clean.strictness.directives[0].raw === '"use strict"' &&
        clean.strictness.directives[0].loc.line === 1,
    "P01 snapshot unit/directive",
);
check(
    clean.scopes[1].formals[0].name === "a" &&
        clean.scopes[1].formals[0].loc.column === 25 &&
        clean.scopes[0].varNames.length === 1 &&
        clean.scopes[0].varDeclarations.length === 1 &&
        clean.scopes[0].lexicalNames.length === 0 &&
        clean.scopes[0].lexicalDeclarations.length === 0,
    "P01 arrays",
);
check(
    clean.declarations[0].site.name === "f" &&
        clean.declarations[0].site.loc.line === 1 &&
        clean.functions[0].strictness.inheritedStrict &&
        clean.functions[0].start === 13,
    "P01 sites",
);
check(
    cleanNodes.scopes.length === 2 &&
        cleanNodes.scopes[1].parameters[0] === "a" &&
        cleanNodes.declarations[0].loc.line === 1,
    "P01 nodes isolated",
);
const foreign = prepareStrictScript({ id: "A:0", text: clean.unit.text }, b);
check(
    foreign.kind === "ready" && foreign.record !== record && foreign.record.belongsTo(b),
    "P01 foreign",
);
console.log("P01 PASS");
kind('"use strict";var x; function f(){const tail=0;}', "ready");
ready('"use strict";var x; function f(){}');
const conflict = prepareStrictScript({ id: "conflict", text: '"use strict";let x;var x;' }, a);
check(conflict.kind === "conflict" && conflict.conflict.kind === "lexical-var", "P02 conflict");
console.log("P02 PASS");
const empty = prepareStrictScript({ id: "empty", text: "" }, a);
check(empty.kind === "profile-rejected" && empty.reason === "strict", "P03 empty");
check(ready('"use strict";').inspectNodes().scopes[0].bodyLength === 1, "P03 directive");
console.log("P03 PASS");
const anonymous = ready('"use strict";let f=function(){return 1;};let g=function(){return 2;};');
const ap = anonymous.inspect(),
    an = anonymous.inspectNodes();
check(
    ap.functions.length === 2 &&
        ap.functions[0].scope === 1 &&
        ap.functions[1].scope === 2 &&
        ap.functions[0].declaration === null &&
        ap.functions[1].declaration === null &&
        ap.functions[0].strictness.inheritedStrict &&
        ap.functions[1].strictness.inheritedStrict,
    "P04 IDs",
);
check(
    an.scopes[1].text === "function(){return 1;}" && an.scopes[2].text === "function(){return 2;}",
    "P04 text",
);
check(
    ap.functions[0].start === 19 &&
        ap.functions[0].end === 40 &&
        ap.functions[1].start === 47 &&
        ap.functions[1].end === 68,
    "P04 ranges",
);
const init = ap.declarations[0].initializer;
if (init === null) {
    throw new Error("P04 init");
}
(init as { start: number }).start = 999;
check(anonymous.inspect().declarations[0].initializer?.start === 19, "P04 detached init");
console.log("P04 PASS");
kind('"use strict";let x;let x;const tail=0;', "conflict");
const duplicate = prepareStrictScript({ id: "duplicate", text: '"use strict";let x;let x;' }, a);
check(
    duplicate.kind === "conflict" && duplicate.conflict.kind === "duplicate-lexical",
    "P05 duplicate",
);
console.log("P05 PASS");
const text = '"use strict";function f(){throw 7;}';
const first = ready(text, "include:0"),
    second = ready(text, "include:1"),
    same = ready(text, "include:0");
check(
    first !== second &&
        first !== same &&
        first.inspect().unit.id === "include:0" &&
        second.inspect().unit.id === "include:1" &&
        same.inspect().unit.id === "include:0",
    "U01 identity",
);
ready('"use strict";1;');
check(first.inspectNodes().scopes[1].text === "function f(){throw 7;}", "U01 retention");
console.log("U01 PASS");
const nested = ready(
    '"use strict";function f(){function f(){} {let x=function(){return function(){};};}} {function f(){}}',
);
const np = nested.inspect(),
    nn = nested.inspectNodes();
check(
    np.scopes.length === 8 && np.functions.length === 5 && np.declarations.length === 4,
    "NESTED count",
);
const parents = [null, 0, 1, 1, 3, 4, 0, 6];
const kinds = [
    "script",
    "function",
    "function",
    "block",
    "function",
    "function",
    "block",
    "function",
];
for (let i = 0; i < 8; i++) {
    check(
        np.scopes[i].id === i &&
            np.scopes[i].parent === parents[i] &&
            np.scopes[i].kind === kinds[i] &&
            nn.scopes[i].kind === kinds[i] &&
            np.scopes[i].strict,
        "NESTED scope",
    );
}
check(
    np.functions[0].declaration === 0 &&
        np.functions[1].declaration === 1 &&
        np.functions[2].declaration === null &&
        np.functions[3].declaration === null &&
        np.functions[4].declaration === 3,
    "NESTED declaration mapping",
);
const own = ready('"use strict";function f(){"use strict";let x=1;}');
const ownPlan = own.inspect();
check(
    ownPlan.functions[0].strictness.ownStrict && ownPlan.functions[0].strictness.inheritedStrict,
    "NESTED own strict",
);
(ownPlan.functions[0].strictness.directives[0].loc as { line: number }).line = 88;
(
    ownPlan.functions[0].strictness
        .directives as import("../src/script-metadata.js").DirectiveMetadata[]
).length = 0;
(ownPlan.scopes[1].lexicalDeclarations as number[]).length = 0;
(ownPlan.scopes[1].lexicalNames as string[])[0] = "changed";
(ownPlan.scopes as import("../src/script-declarations.js").DeclarationScope[]).length = 0;
(ownPlan.declarations as import("../src/script-declarations.js").Declaration[]).length = 0;
(ownPlan.functions as import("../src/script-declarations.js").PlannedFunction[]).length = 0;
const ownClean = own.inspect();
check(
    ownClean.functions[0].strictness.directives.length === 1 &&
        ownClean.functions[0].strictness.directives[0].loc.line === 1 &&
        ownClean.scopes[1].lexicalNames[0] === "x" &&
        ownClean.scopes[1].lexicalDeclarations[0] === 1 &&
        ownClean.declarations.length === 2,
    "NESTED detached containers",
);
console.log("NESTED PASS");
ready('"use strict";' + " ".repeat(99987));
const oversized = prepareStrictScript(
    { id: "large", text: '"use strict";' + " ".repeat(99988) },
    a,
);
check(
    oversized.kind === "blocked" &&
        oversized.rejection.kind === "resource-limit" &&
        oversized.rejection.guardCode === "source-units" &&
        oversized.rejection.count === 100001 &&
        oversized.rejection.limit === 100000,
    "R06 source",
);
for (const depth of [126, 127, 128, 129]) {
    kind(
        '"use strict";' + "{".repeat(depth) + "var x;" + "}".repeat(depth),
        depth <= 127 ? "ready" : "blocked",
    );
    kind(
        '"use strict";' + "(".repeat(depth) + "1" + ")".repeat(depth) + ";",
        depth <= 126 ? "ready" : "blocked",
    );
}
for (const chain of ["+1", ".x", "()"]) {
    const far =
        chain === "+1" ? "+function(){}" : chain === ".x" ? "[function(){}]" : "(function(){})";
    const deep = ready(
        '"use strict";(function(){return function(){};})' +
            chain.repeat(15000) +
            far +
            ";function last(){}",
    );
    const dp = deep.inspect(),
        dn = deep.inspectNodes();
    check(
        dp.functions.length === 4 &&
            dp.scopes.length === 5 &&
            dn.scopes[1].text === "function(){return function(){};}" &&
            dn.scopes[2].text === "function(){}" &&
            dn.scopes[3].text === "function(){}" &&
            dn.scopes[4].text === "function last(){}",
        "R06 deep",
    );
}
console.log("R06 PASS");
const legacy = new Realm((_line: string) => {});
for (const bad of ["", "const bad=0;", " ".repeat(100001)]) {
    const r = prepareStrictScript({ id: "legacy", text: bad }, legacy);
    check(r.kind === "profile-rejected" && r.reason === "realm", "BOUNDARY realm");
}
kind("var x;", "profile-rejected");
kind("let x;var x;", "conflict");
kind("let x;let x;const tail=0;", "conflict");
const withArguments = ready('"use strict";function f(){return arguments;}');
check(
    withArguments.inspect().functions.length === 1 &&
        withArguments.inspectNodes().scopes[1].text === "function f(){return arguments;}",
    "arguments retains original function source",
);
const withEval = ready('"use strict";function f(){eval("1");}');
check(
    withEval.inspectNodes().scopes[1].text === 'function f(){eval("1");}',
    "eval retains original function source",
);
ready('"use strict";let o={arguments:1};o.arguments;');
console.log("BOUNDARY PASS");
const dynamicText =
    '"use strict";let ' +
    name +
    "=function(){return " +
    payload +
    ";};this.effect=" +
    payload +
    ";";
const dynamic = ready(dynamicText, "runtime:" + name);
check(
    dynamic.inspect().declarations[0].site.name === name &&
        dynamic.inspectNodes().scopes[1].text === "function(){return " + payload + ";}" &&
        dynamic.inspect().unit.id === "runtime:" + name,
    "INPUT source",
);
check(a.globalEnvironment.globalObject.getOwnProperty("effect") === undefined, "INPUT no effects");
console.log("INPUT PASS");
