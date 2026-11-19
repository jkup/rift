import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp/regexp-pattern-syntax.js";
import { compileRegExpPattern, matchRegExp } from "../src/regexp/regexp-matcher.js";
import {
    normal,
    resourceFailure,
    type OperationContext,
    type ValueCompletion,
} from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
for (const text of [
    String.raw`/(?i:a)b/.test('Ab')&&!/(?i:a)b/.test('AB')`,
    String.raw`/(?i:a(?-i:b)c)/.test('AbC')&&!/(?i:a(?-i:b)c)/.test('ABC')`,
    String.raw`/(?i:a|b)c/.test('Bc')&&!/^(?:(?i:a)|b)$/.test('B')`,
    String.raw`/^(?i:a){2,3}b$/.test('aAAb')&&!/^(?i:a){2,3}b$/.test('aAAB')`,
    String.raw`/(?i:[a-z])/.test('Q')&&!/(?i:[^a-z])/.test('Q')&&!/(?i:[\W])/.test('Q')`,
    String.raw`/x\n(?m:^a$)\ny/.test('x\na\ny')&&!/x\n(?-m:^a$)\ny/m.test('x\na\ny')`,
    String.raw`['\n','\r','\u2028','\u2029'].every(function(c){return /(?s:.)/.test(c)&&!/(?s:.)./.test(c+c)&&!/(?-s:.)/s.test(c)})`,
    String.raw`/(a)(?i:\1)/.test('aA')&&!/(?i:(a))\1/.test('Aa')&&!/(a)(?-i:\1)/i.test('aA')`,
    String.raw`/(?<x>a)(?i:\k<x>)/.test('aA')&&/(?i:\k<x>)(?<x>a)/.test('a')`,
    String.raw`/(?i:(?=a))A/.test('A')&&!/(?i:(?=a))a/.test('A')&&/(?-i:(?!a))A/i.test('A')`,
    String.raw`/(?i:k)/u.test('K')&&!/(?i:k)/.test('K')&&/(k)(?i:\1)/u.test('kK')`,
    String.raw`/(?i:\bſ\b)/u.test('ſ')&&!/(?i:ſ)\b/u.test('ſ')`,
    String.raw`/(?i:\p{Lowercase_Letter})/u.test('A')&&/(?i:\P{Lowercase_Letter})/u.test('a')&&!/(?-i:\P{Lowercase_Letter})/iu.test('a')`,
    String.raw`var r=/(?i:a)(b)/d,m=r.exec('Ab');r.flags==='d'&&r.ignoreCase===false&&m.length===2&&m[1]==='b'&&m.indices[1][0]===1`,
    String.raw`var m=/(?i:(a)|(b))+/.exec('aB');m[0]==='aB'&&m[1]===undefined&&m[2]==='B'`,
    String.raw`/(?i-:a)/.test('A')&&/(?smi:a)/.test('A')&&!/(?-smi:a)/ims.test('A')`,
    String.raw`['(?-:a)','(?ii:a)','(?i-i:a)','(?g:a)','(?i)'].every(function(p){try{new RegExp(p);return false}catch(e){return e instanceof SyntaxError}})`,
]) {
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    const prepared = prepareBoundedScript({ id: "scoped-modifiers", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("preparation: " + text);
    }
    const result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
}
const source = String.raw`(?im-s:(a|b)+)(?-i:\1)`;
let parsingSteps = 0;
const parsed = parseRegExpSyntax(source, () => {
    parsingSteps++;
    return true;
});
if (parsed.kind !== "ready") {
    throw new Error("budget pattern");
}
for (let limit = 0; limit < parsingSteps; limit++) {
    let steps = 0;
    check(
        parseRegExpSyntax(source, () => steps++ < limit).kind === "stopped",
        "modifier parsing budget",
    );
}
const realm = new Realm((_line: string) => {}, "script"),
    loc = { line: 1, column: 1 };
let steps = 0,
    limit = 100000;
const context: OperationContext = {
    realm,
    call: (_callee, _receiver, _args, _loc): ValueCompletion => {
        throw new Error("no guest calls");
    },
    tick: (location): ValueCompletion =>
        ++steps > limit
            ? resourceFailure("steps", steps, limit, "modifier budget", location)
            : normal(),
};
const compiled = compileRegExpPattern(
    parsed.pattern,
    { ignoreCase: false, multiline: false, dotAll: false },
    context,
    loc,
);
if (compiled.kind !== "ready") {
    throw new Error("budget compilation");
}
const compilationSteps = steps;
for (limit = 0; limit < compilationSteps; limit++) {
    steps = 0;
    const result = compileRegExpPattern(
        parsed.pattern,
        { ignoreCase: false, multiline: false, dotAll: false },
        context,
        loc,
    );
    check(
        result.kind === "abrupt" && result.completion.origin.kind === "resource-limit",
        "modifier compilation budget",
    );
}
limit = 3;
steps = 0;
const stopped = matchRegExp(compiled.program, "aAb", 0, true, context, loc);
check(
    stopped.kind === "abrupt" && stopped.completion.origin.kind === "resource-limit",
    "modifier matching budget",
);
check(parseRegExpSyntax("(?i:(?<=a))", () => true).kind === "ready", "lookbehind inside modifiers");
console.log("regexp modifiers passed");
