import {Realm} from "../src/realm.js";
import {lex} from "../src/lexer.js";
import {parse} from "../src/parser.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {normal, type ValueCompletion} from "../src/runtime.js";
import {wellKnownToPrimitive, wellKnownSpecies} from "../src/symbols.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "templates", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare template: " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "template session restored");
    return completion;
}
const cases = [
    ["`plain`;", "plain"], ["``;", ""], ["`if`;", "if"], ["`}`;", "}"],
    ["`a${1+2}b${true}c${null}d${undefined}`;", "a3btruecnulldundefined"],
    ["`outer${`inner${{x:7}.x}`}tail`;", "outerinner7tail"],
    ["`${function(){return {x:'ok'}; }().x}`;", "ok"],
    ["`${1/* } ${ ` */}x${2// } `\n}`;", "1x2"],
    ["`\\`\\${literal}\\\\`;", "`${literal}\\"],
    ["`a\r\nb\rc\nd`;", "a\nb\nc\nd"],
    ["`a\\\r\nb\\\nc`;", "abc"],
    ["`\\x41\\u0042\\u{1F600}\\uD800`;", "AB\ud83d\ude00\ud800"],
    ["`\\0\\b\\f\\v\\n\\r\\t\\q`;", "\0\b\f\v\n\r\tq"],
    ["`use strict`; function f(){return this===undefined;} `${f()}`;", "false"],
    ["'use strict'; function f(){return this===undefined;} `${f()}`;", "true"],
    ["let o={toString:function(){return 'string';},valueOf:function(){return 7;}}; `${o}`;", "string"],
    ["let s=''; function value(n){s+=n;return {toString:function(){s+='s';return n;}};} let t=`${value(1)}${value(2)}`; t+':'+s;", "12:1s2s"],
    ["function f(){return `${function(){let x='closure';return x;}()}`;} f();", "closure"],
    ["let x='live'; `${x}`.slice(1);", "ive"],
];
for (const entry of cases) {
    const actual = run(fresh(), entry[0]);
    check(actual.type === "normal" && actual.value.kind === "string" && actual.value.value === entry[1], "template result: " + entry[0]);
}
for (const text of ["`", "`a${1", "`a${1}", "`${}`;", "`\\1`;", "`\\01`;", "`\\8`;", "`\\xG0`;", "`\\u{}`;", "`\\u{110000}`;", "`\\u123`;", "`x`=7;"]) {
    const result = prepareBoundedScript({id: "invalid-template", text}, fresh());
    check(result.kind !== "ready", "reject malformed or unsupported template: " + text);
}
{
    const realm = fresh(), object = realm.createObject();
    let trace = "";
    const convert = realm.createBuiltin("convert", 1, (receiver, args, context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === object && context.realm === realm, "template conversion receiver and Realm");
        check(args.length === 1 && args[0].kind === "string" && args[0].value === "string", "template string hint");
        trace += "convert;";
        return normal({kind: "string", value: "hook"});
    });
    object.bootstrapDefine(wellKnownToPrimitive, {value: {kind: "object", object: convert}});
    realm.defineScriptGlobal("value", {value: {kind: "object", object}});
    const result = run(realm, "`${value}`;");
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === "hook" && trace === "convert;", "canonical conversion hook");
    realm.defineScriptGlobal("symbol", {value: {kind: "symbol", value: wellKnownSpecies}});
    const symbol = run(realm, "`${symbol}`;");
    check(symbol.type === "throw" && symbol.diagnostic.name === "TypeError", "template symbol throws");
}
{
    const actual = run(fresh(), "let marker={};let n=0;let o={toString:function(){throw marker;}};try{`${o}${n++}`;}catch(e){if(e!==marker){throw 7;}}n;");
    check(actual.type === "normal" && actual.value.kind === "number" && actual.value.value === 0, "conversion throw prevents later substitution");
}
{
    const tokens = lex("`a\r\n${1}z`; missing;", true);
    check(tokens.error === null && tokens.tokens[1].loc.line === 2 && tokens.tokens[1].loc.column === 3, "substitution source location");
    check(tokens.tokens[0].cooked === "a\n" && tokens.tokens[0].text === "`a\r\n${", "raw and cooked text separated");
    check(parse("`x`;").error !== null, "legacy grammar unchanged");
    const deep = lex("`${".repeat(130) + "0" + "}`".repeat(130), true);
    check(deep.rejection !== null && deep.rejection.kind === "resource-limit", "template lexical nesting bounded");
}
{
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 45; steps++) {
        const actual = run(fresh(), "let o={toString:function(){return 'x';}};`${o}${o}`;", steps);
        if (actual.type === "throw") { check(actual.origin.kind === "resource-limit", "template budget"); interrupted = true; }
        else { check(actual.value.kind === "string" && actual.value.value === "xx", "template budget result"); completed = true; }
    }
    check(interrupted && completed, "template budget boundary");
}
check(run(fresh(), "function f(){} f`x`;").type === "normal", "historical tagged function input");
for(const text of ["(1)`x`;", "`a` `b`;"]){const result=run(fresh(),text);check(result.type==='throw'&&result.diagnostic.name==='TypeError','historical noncallable tag input');}
console.log("Script templates passed");
