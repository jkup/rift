import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
function passes(text: string, realm = new Realm((_line: string) => {}, "script")): void {
    const prepared = prepareBoundedScript({ id: "unicode-mode", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const session = createScriptSession(),
        result = evaluateScript(session, prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
}
const cases: [string, string, string, boolean][] = [
    ["^.$", "u", "😀", true],
    ["^.$", "", "😀", false],
    ["^.$", "u", "\ud800", true],
    ["^.$", "u", "\udc00", true],
    ["^\\u{1F600}$", "u", "😀", true],
    ["^\\uD83D\\uDE00$", "u", "😀", true],
    ["^[😀-🙏]$", "u", "😁", true],
    ["^[^a]$", "u", "😀", true],
    ["^\\uD83D$", "u", "😀", false],
    ["^😀+$", "u", "😀😀", true],
    ["^[a-z]$", "ui", "K", true],
    ["^[a-z]$", "i", "K", false],
    ["^[a-z]$", "ui", "ſ", true],
    ["^[a-z]$", "i", "ſ", false],
    ["^ω$", "ui", "Ω", true],
    ["^ω$", "i", "Ω", false],
    ["^ß$", "ui", "ẞ", true],
    ["^ß$", "ui", "ss", false],
    ["^i$", "ui", "İ", false],
    ["^i$", "ui", "ı", false],
    ["^\\w$", "ui", "K", true],
    ["^\\W$", "ui", "ſ", false],
    ["^\\bK\\b$", "ui", "K", true],
    ["^(𐐀)\\1$", "ui", "𐐀𐐨", true],
];
for (const [pattern, flags, input, expected] of cases) {
    passes(
        "new RegExp(" +
            JSON.stringify(pattern) +
            "," +
            JSON.stringify(flags) +
            ").test(" +
            JSON.stringify(input) +
            ")===" +
            expected,
    );
    passes("/" + pattern + "/" + flags + ".test(" + JSON.stringify(input) + ")===" + expected);
}
const invalid: string[] = [
    "\\a",
    "\\_",
    "\\-",
    "\\8",
    "\\01",
    "\\xZ0",
    "\\uZZZZ",
    "\\u{110000}",
    "\\c1",
    "{",
    "}",
    "]",
    "[\\d-a]",
    "(?=a)?",
    "\\k<x>",
];
for (const pattern of invalid) {
    passes(
        "var ok=false;try{new RegExp(" +
            JSON.stringify(pattern) +
            ",'u')}catch(e){ok=e instanceof SyntaxError}ok",
    );
    const prepared = prepareBoundedScript(
        { id: "unicode-literal-error", text: "/" + pattern + "/u" },
        new Realm((_line: string) => {}, "script"),
    );
    check(
        prepared.kind === "blocked" &&
            prepared.rejection.kind === "syntax-error" &&
            prepared.rejection.ruleCode === "regexp-literal",
        "literal error phase " + pattern,
    );
}
for (const text of [
    "var r=/(?<x>😀)(.)/du,m=r.exec('x😀a');m.index===1&&m[0]==='😀a'&&m.groups.x==='😀'&&m.indices[0][0]===1&&m.indices[0][1]===4&&m.indices.groups.x===m.indices[1]&&m.indices[1][1]===3&&m.indices[2][0]===3",
    "var r=/./duy;r.lastIndex=1;var m=r.exec('😀a');m.index===0&&m[0]==='😀'&&m.indices[0][0]===0&&m.indices[0][1]===2&&r.lastIndex===2",
    "var r=/./dug;r.lastIndex=1;var m=r.exec('😀a');m.index===0&&r.lastIndex===2&&r.exec('😀a').index===2&&r.lastIndex===3&&r.exec('😀a')===null&&r.lastIndex===0",
    "var r=/^/uy;r.lastIndex=1;var m=r.exec('😀');m.index===0&&m[0]===''&&r.lastIndex===0",
    "var r=/\\uDE00/ug;r.lastIndex=1;var m=r.exec('😀\\uDE00');m.index===2&&r.lastIndex===3",
    "var r=/a/uy;r.lastIndex=1;r.exec('😀a')===null&&r.lastIndex===0",
    "var r=/(?:)/gu;var a=[...'😀a'.matchAll(r)];a.length===3&&a[0].index===0&&a[1].index===2&&a[2].index===3&&r.lastIndex===0",
    "'😀a'.split(/(?:)/u).join(',')==='😀,a'&&'😀a'.replace(/(?:)/gu,'-')==='-😀-a-'",
    "'😀😀'.replace(/(?<x>😀)/gu,'[$<x>]')==='[😀][😀]'&&'😀a'.search(/a/u)===2",
    "var m=/(?:(?<x>😀)|(?<x>a))+\\k<x>/du.exec('😀aa');m.groups.x==='a'&&m[1]===undefined&&m.indices.groups.x===m.indices[2]&&m.indices[2][0]===2",
    "var r=new RegExp('😀','iudg');r.unicode&&!r.unicodeSets&&r.flags==='dgiu'&&r.toString()==='/😀/dgiu'&&new RegExp(r).unicode&&new RegExp(r,'').unicode===false",
    "var order='',r=new RegExp({toString(){order+='p';return '😀'}},{toString(){order+='f';return 'u'}});order==='pf'&&r.test('😀')",
    "var r=/^.$/u;Object.getOwnPropertyDescriptor(RegExp.prototype,'unicode').get.call(r)===true&&RegExp.prototype.unicode===undefined",
]) {
    passes(text);
}

{
    const realm = new Realm((_line: string) => {}, "script"),
        foreign = new Realm((_line: string) => {}, "script");
    const constructor = foreign.globalObject.getOwnProperty("RegExp");
    if (constructor === undefined || constructor.kind !== "data") {
        throw new Error("foreign RegExp");
    }
    realm.defineScriptGlobal("ForeignRegExp", { value: constructor.value });
    realm.defineScriptGlobal("ForeignSyntaxError", {
        value: { kind: "object", object: foreign.getErrorConstructor("SyntaxError") },
    });
    realm.defineScriptGlobal("foreignArrayPrototype", {
        value: { kind: "object", object: foreign.arrayPrototype },
    });
    passes(
        "var r=new ForeignRegExp('(?<x>😀)','du'),m=r.exec('😀');Object.getPrototypeOf(r)===ForeignRegExp.prototype&&Object.getPrototypeOf(m)===foreignArrayPrototype&&m.indices.groups.x===m.indices[1]",
        realm,
    );
    passes(
        "var ok=false;try{new ForeignRegExp(String.fromCharCode(92)+'a','u')}catch(e){ok=e instanceof ForeignSyntaxError&&!(e instanceof SyntaxError)}ok",
        realm,
    );
}
for (const text of ["/[a-z]/ui", "/(?:(😀)+)+b/u.test('😀😀😀😀😀😀')"]) {
    const prepared = prepareBoundedScript(
        { id: "unicode-budget", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 25, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "Unicode operation budget",
    );
}
passes("var r=new RegExp(String.fromCharCode(92)+'p{ASCII}','u');r.test('A')&&!r.test('α')");
for (const pattern of ["(?<=a)"]) {
    const text = "try{new RegExp(" + JSON.stringify(pattern) + ",'u')}catch(e){'caught'}";
    const prepared = prepareBoundedScript(
        { id: "unicode-unsupported", text },
        new Realm((_line: string) => {}, "script"),
    );
    if (prepared.kind !== "ready") {
        throw new Error("unsupported prepare");
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(
        result.type === "normal" && result.value.kind === "object",
        "Unicode lookbehind constructor",
    );
}
console.log("regexp unicode mode passed");
