import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
import { compileRegExpPattern, matchRegExp } from "../src/regexp-matcher.js";
import {
    normal,
    resourceFailure,
    type OperationContext,
    type ValueCompletion,
} from "../src/runtime.js";

function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "duplicate-names", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession(),
        result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
}
const matches: [string, string, string | undefined][] = [
    [String.raw`(?<x>a)|(?<x>b)`, "a", "a"],
    [String.raw`(?<x>a)|(?<x>b)`, "b", "b"],
    [String.raw`(?:(?<x>a)|(?<x>b))\k<x>`, "aa", "a"],
    [String.raw`(?:(?<x>a)|(?<x>b))\k<x>`, "bb", "b"],
    [String.raw`^(?:(?<x>a)|(?<x>b))+\k<x>$`, "abb", "b"],
    [String.raw`^(?:(?<x>a)|(?<x>b))+$`, "ab", "b"],
    [String.raw`^(?:(?<x>a)|(?<x>b))?\k<x>$`, "", undefined],
    [String.raw`(?:(?=(?<x>a))a|(?<x>b))\k<x>`, "aa", "a"],
    [String.raw`(?:(?=(?<x>a))a|(?<x>b))\k<x>`, "bb", "b"],
    [String.raw`\k<x>(?:(?<x>a)|(?<x>b))`, "b", "b"],
    [String.raw`(?:(?<x>a)|(?:(?<x>b)|(?<x>c)))`, "c", "c"],
    [String.raw`(?<x>)|(?<x>b)`, "", ""],
];
for (const [pattern, input, expected] of matches) {
    const assertion =
        "m!==null&&m[0]===" +
        JSON.stringify(input) +
        "&&m.groups.x===" +
        (expected === undefined ? "undefined" : JSON.stringify(expected)) +
        "&&Object.getPrototypeOf(m.groups)===null&&Object.keys(m.groups).join(',')==='x'&&Object.hasOwn(m.indices.groups,'x')&&m.indices.groups.x===m.indices[m.findIndex(function(v,i){return i>0&&v!==undefined})]";
    passes(
        "var m=new RegExp(" +
            JSON.stringify(pattern) +
            ",'d').exec(" +
            JSON.stringify(input) +
            ");" +
            assertion,
    );
    passes("var m=/" + pattern + "/d.exec(" + JSON.stringify(input) + ");" + assertion);
}
const invalid: string[] = [
    String.raw`(?<x>a)(?<x>b)`,
    String.raw`(?<x>a|(?<x>b))`,
    String.raw`(?=(?<x>a))(?<x>a)`,
    String.raw`(?<x>a)|(?<x>b)(?<x>c)`,
    String.raw`(?:(?<x>a)|b)(?:(?<x>c)|d)`,
    String.raw`(?<x>a){0}(?<x>b)`,
    String.raw`(?!(?<x>a))(?<x>b)`,
];
for (const pattern of invalid) {
    check(parseRegExpSyntax(pattern, () => true).kind === "syntax-error", pattern);
    passes(
        "var ok=false;try{new RegExp(" +
            JSON.stringify(pattern) +
            ")}catch(e){ok=e instanceof SyntaxError}ok",
    );
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript(
        { id: "duplicate-literal", text: "/" + pattern + "/" },
        realm,
    );
    check(
        prepared.kind === "blocked" &&
            prepared.rejection.kind === "syntax-error" &&
            prepared.rejection.ruleCode === "regexp-literal",
        "invalid literal " + pattern,
    );
}
for (const source of [
    String.raw`'bb'.replace(/(?:(?<x>a)|(?<x>b))\k<x>/,'[$<x>]')==='[b]'`,
    String.raw`var m=/(?<π>a)|(?<\u03c0>b)/d.exec('b');m.groups['π']==='b'&&m.indices.groups['π']===m.indices[2]`,
    String.raw`var m=/(?<x>a)(?<y>b)|(?<y>c)(?<x>d)/d.exec('cd');Object.keys(m.groups).join(',')==='x,y'&&m.groups.x==='d'&&m.groups.y==='c'&&m.indices.groups.x===m.indices[4]&&m.indices.groups.y===m.indices[3]`,
    String.raw`var m=/(?<__proto__>a)|(?<__proto__>b)/d.exec('b');Object.getPrototypeOf(m.groups)===null&&m.groups.__proto__==='b'&&m.indices.groups.__proto__===m.indices[2]`,
    String.raw`/^(?:(?<x>a)|(?<x>b))\k<x>$/.exec('ab')===null`,
    String.raw`var m=/(?:(?<x>a)|(?<x>ab))\k<x>c/d.exec('ababc');m.groups.x==='ab'&&m[1]===undefined&&m.indices.groups.x===m.indices[2]`,
    String.raw`/(?:(?<x>a)|(?<x>b))\k<x>/i.test('bB')`,
    String.raw`var m=[...'ab'.matchAll(/(?<x>a)|(?<x>b)/gd)];m.length===2&&m[0].groups.x==='a'&&m[1].groups.x==='b'&&m[0].groups!==m[1].groups`,
    String.raw`'ab'.replace(/(?<x>a)|(?<x>b)/g,function(m,a,b,i,s,g){return g.x.toUpperCase()})==='AB'`,
]) {
    passes(source);
}
const pattern = String.raw`(?:(?<x>a)|(?<x>b))\k<x>`;
let steps = 0;
check(
    parseRegExpSyntax(pattern, () => {
        steps++;
        return true;
    }).kind === "ready",
    "budget baseline",
);
for (let budget = 0; budget < steps; budget++) {
    let remaining = budget;
    check(
        parseRegExpSyntax(pattern, () => remaining-- > 0).kind === "stopped",
        "parser stop " + budget,
    );
}
const realm = new Realm((_line: string) => {}, "script"),
    loc = { line: 1, column: 1 };
let work = 0;
function context(limit: number): OperationContext {
    work = 0;
    return {
        realm,
        call: (_callee, _receiver, _args, _loc): ValueCompletion => {
            throw new Error("no guest calls");
        },
        tick: (location): ValueCompletion =>
            ++work > limit
                ? resourceFailure("steps", work, limit, "duplicate name budget", location)
                : normal(),
    };
}
const parsed = parseRegExpSyntax(pattern, () => true);
if (parsed.kind !== "ready") {
    throw new Error("budget pattern");
}
const compiled = compileRegExpPattern(
    parsed.pattern,
    { ignoreCase: false, multiline: false, dotAll: false },
    context(10000),
    loc,
);
if (compiled.kind !== "ready") {
    throw new Error("budget compile");
}
const compileWork = work;
for (let budget = 0; budget < compileWork; budget++) {
    const result = compileRegExpPattern(
        parsed.pattern,
        { ignoreCase: false, multiline: false, dotAll: false },
        context(budget),
        loc,
    );
    check(
        result.kind === "abrupt" && result.completion.origin.kind === "resource-limit",
        "compile stop " + budget,
    );
}
check(
    matchRegExp(compiled.program, "bb", 0, true, context(10000), loc).kind === "match",
    "match budget baseline",
);
const matchWork = work;
for (let budget = 0; budget < matchWork; budget++) {
    const result = matchRegExp(compiled.program, "bb", 0, true, context(budget), loc);
    check(
        result.kind === "abrupt" && result.completion.origin.kind === "resource-limit",
        "match stop " + budget,
    );
}
console.log("regexp duplicate names passed");
