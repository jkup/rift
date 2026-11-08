import {Realm} from "../src/realm.js";
import {parse, auditBoundedScriptLexicalStatements} from "../src/parser.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import type {ValueCompletion} from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps = 10000): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "do-while", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare loop: " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "loop session restored");
    return completion;
}
for (const text of ["do {7;} while(false);", "do {7;break;} while(missing);", "do {7;continue;} while(false);", "function f(){do{return 7;}while(missing);}f();"]) {
    const actual = run(text);
    check(actual.type === "normal" && actual.value.kind === "number" && actual.value.value === 7, "loop completion value");
}
const cases = [
    ["let i=0;let s='';do{s+='b';i++;continue;}while((s+='t')&&i<2);s;", "btbt"],
    ["let n=0;do{n++;break;}while(n++);`${n}`;", "1"],
    ["let a;let b;let i=0;do{let x=i;if(i===0){a=function(){return x;};}else{b=function(){return x;};}i++;}while(i<2);`${a()}:${b()}`;", "0:1"],
    ["do{let inner=1;}while(typeof inner!=='undefined');typeof inner;", "undefined"],
    ["let before=typeof hoisted;do{var hoisted=3;}while(false);`${before}:${hoisted}`;", "undefined:3"],
    ["let i=0;do{i++;}while(function(){return i<2;}());`${i}`;", "2"],
    ["do{}while(false) 'next';", "next"],
    ["let marker={};let n=0;try{do{throw marker;}while(n++);}catch(e){if(e!==marker){throw 7;}}`${n}`;", "0"],
    ["let marker={};let n=0;function bad(){throw marker;}try{do{n++;}while(bad());}catch(e){if(e!==marker){throw 7;}}`${n}`;", "1"],
];
for (const entry of cases) {
    const actual = run(entry[0]);
    check(actual.type === "normal" && actual.value.kind === "string" && actual.value.value === entry[1], "do-while behavior: " + entry[0]);
}
{
    const actual = run("do ; while(false);");
    check(actual.type === "normal" && actual.value.kind === "undefined", "empty loop completion");
    const endless = run("do ; while(true);", 40);
    check(endless.type === "throw" && endless.origin.kind === "resource-limit", "empty loop bounded");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 60; steps++) {
        const result = run("let i=0;do{i++;}while(i<2);i;", steps);
        if (result.type === "throw") { check(result.origin.kind === "resource-limit", "loop budget"); interrupted = true; }
        else { check(result.value.kind === "number" && result.value.value === 2, "loop budget result"); completed = true; }
    }
    check(interrupted && completed, "loop budget boundary");
}
for (const text of ["do let x; while(false);", "do function f(){} while(false);", "do {}", "do {} while();", "do {function f(){break;}}while(false);", "do {}while(false);continue;"]) {
    const result = prepareBoundedScript({id: "invalid-loop", text}, new Realm((_line: string) => {}, "script"));
    check(result.kind !== "ready", "invalid loop grammar or context");
}
{
    const audit = auditBoundedScriptLexicalStatements("do let x; while(false);");
    check(audit.kind === "eligible" && audit.candidates.length === 1 && audit.candidates[0].context === "do-while-body" && audit.candidates[0].keyword.start === 3, "do body lexical audit");
    check(parse("do {}while(false);").error !== null, "legacy grammar unchanged");
}
console.log("Do-while passed");
