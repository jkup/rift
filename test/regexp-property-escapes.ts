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
function passes(text: string, realm = new Realm((_line: string) => {}, "script")): void {
    const prepared = prepareBoundedScript({ id: "property-escapes", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const session = createScriptSession(),
        result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
}
for (const text of [
    "/^\\p{Letter}+$/u.test('α𐐀') && !/^\\p{L}+$/u.test('a1')",
    "/^\\p{sc=Greek}$/u.test('α') && !/^\\p{Script=Greek}$/u.test('A')",
    "/^\\p{scx=Hira}$/u.test('ー') && !/^\\p{sc=Hira}$/u.test('ー')",
    "/^\\p{General_Category=Surrogate}$/u.test('\ud800') && !/^\\p{Cs}$/u.test('😀')",
    "/^\\p{Any}$/u.test('😀') && /^\\p{Emoji}$/u.test('😀')",
    "/^\\p{White_Space}$/u.test('\u0085') && !/^\\p{White_Space}$/u.test('\ufeff')",
    "/^\\p{Cn}$/u.test('\u0378') && !/^\\p{Assigned}$/u.test('\u0378')",
    "/^\\p{ASCII}$/ui.test('K') && !/^\\p{ASCII}$/u.test('K')",
    "/^\\P{Lowercase_Letter}$/ui.test('a') && !/^[^\\p{Lowercase_Letter}]$/ui.test('a')",
    "/^[\\P{Lowercase_Letter}]$/ui.test('a') && !/^[^\\P{Lowercase_Letter}]$/ui.test('a')",
    "/^[\\p{L}0-9_]$/u.test('_') && /^[\\p{L}0-9_]$/u.test('α') && !/^[^\\p{L}0-9_]$/u.test('α')",
    "!/^\\p{sc=Hrkt}$/u.test('あ') && /^\\P{scx=Katakana_Or_Hiragana}$/u.test('あ')",
    "var r=/\\p{Emoji}/gu, m=r.exec('a😀b');m.index===1&&r.lastIndex===3&&r.exec('a😀b')===null&&r.lastIndex===0",
    "var r=/\\p{L}/uy;r.lastIndex=1;r.test('aα')&&r.lastIndex===2",
    "'aα1'.replace(/\\p{L}/gu,'x')==='xx1' && 'a1α'.split(/\\p{Nd}/u).join(',')==='a,α'",
    "var m=/(?<letter>\\p{L})\\k<letter>/du.exec('αα');m.groups.letter==='α'&&m.indices[0][1]===2",
    "/^\\p{ASCII}$/u.source==='^\\\\p{ASCII}$' && /\\p{ASCII}/u.flags==='u'",
    "/^\\p{ASCII}$/.test('p{ASCII}') && /^\\P{L}$/.test('P{L}')",
]) {
    passes(text);
}

for (const pattern of [
    "\\p",
    "\\p{}",
    "\\p{L",
    "\\p{letter}",
    "\\p{Greek}",
    "\\p{Script=greek}",
    "\\p{Script =Greek}",
    "\\p{ASCII=Yes}",
    "\\p{RGI_Emoji}",
    "[a-\\p{L}]",
    "[\\p{L}-a]",
]) {
    check(
        parseRegExpSyntax(pattern, () => true, true).kind === "syntax-error",
        "invalid property " + pattern,
    );
    passes(
        "var ok=false;try{new RegExp(" +
            JSON.stringify(pattern) +
            ",'u')}catch(e){ok=e instanceof SyntaxError}ok",
    );
    const prepared = prepareBoundedScript(
        { id: "invalid-property", text: "var touched=1;/" + pattern + "/u" },
        new Realm((_line: string) => {}, "script"),
    );
    check(prepared.kind !== "ready", "invalid literal rejected before execution");
}
const foreign = new Realm((_line: string) => {}, "script"),
    realm = new Realm((_line: string) => {}, "script");
const constructor = foreign.globalObject.getOwnProperty("RegExp");
if (constructor === undefined || constructor.kind !== "data") {
    throw new Error("foreign RegExp");
}
realm.defineScriptGlobal("ForeignRegExp", { value: constructor.value });
realm.defineScriptGlobal("ForeignSyntaxError", {
    value: { kind: "object", object: foreign.getErrorConstructor("SyntaxError") },
});
passes(
    "var ok=false;try{new ForeignRegExp('\\\\p{bad}','u')}catch(e){ok=e instanceof ForeignSyntaxError&&!(e instanceof SyntaxError)}ok",
    realm,
);

let work = 0;
check(
    parseRegExpSyntax("\\p{General_Category=Lowercase_Letter}", () => ++work < 8, true).kind ===
        "stopped",
    "property parsing charges input",
);
const parsed = parseRegExpSyntax("^\\P{Lowercase_Letter}$", () => true, true);
if (parsed.kind !== "ready") {
    throw new Error("budget pattern");
}
work = 0;
const context: OperationContext = {
    realm,
    call: (_callee, _receiver, _args, _loc): ValueCompletion => {
        throw new Error("no guest calls");
    },
    tick: (loc): ValueCompletion =>
        ++work > 40 ? resourceFailure("steps", work, 40, "property budget", loc) : normal(),
};
const compiled = compileRegExpPattern(
    parsed.pattern,
    { ignoreCase: true, multiline: false, dotAll: false },
    context,
    { line: 1, column: 1 },
    true,
);
if (compiled.kind !== "ready") {
    throw new Error("bounded property compilation");
}
check(
    matchRegExp(compiled.program, "a", 0, false, context, { line: 1, column: 1 }).kind === "match",
    "complement folding stays bounded",
);
console.log("regexp property escapes passed");
