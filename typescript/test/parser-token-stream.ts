import { lex } from "../src/lexer.js";
import { parseBoundedScriptDeclarationPlan } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "token-stream", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession({ maxSteps: 50000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
passes("var f=(a=`x${{b:`y${1}`}.b}`)=>a; f()==='xy1';");
passes("var x=8\n/2/2; x===2;");
passes("var x=8; x/=2; x===4;");
passes("var x=0; outer: inner: for(let y of [1,2]){x+=y;continue outer} x===3;");
passes("var x=0; for(let y in {a:1,b:2}){x++} x===2;");
passes("var x=0; let {a:[y=3]}={a:[]}; ({x}={x:y}); x===3;");
passes("class A{static f(){return 2} get x(){return 3} set x(v){this.y=v}} var a=new A();a.x=4;A.f()+a.x+a.y===9;");
passes("var f=function(a){'use strict';return this===undefined&&a===3}; f(3)&&f.toString()===\"function(a){'use strict';return this===undefined&&a===3}\";");
passes("function f(){return/*\r\n*/3} f()===undefined;");
passes("var x=1; x\n++x; x===2;");
passes("var f=(a=()=>`x${2}`)=>a(); f()==='x2';");

for (const text of [
    "let = ; @", "( ; 'unterminated", "function f( { /* unfinished", "return ; `x${1", "let = ; 1e+",
    "let = ; '\\u{110000}'", "var x=;\r\n@", "'unterminated", "a".repeat(100001),
]) {
    const lexical = lex(text, true);
    check(lexical.error !== null, "fixture has lexical failure");
    const parsed = parseBoundedScriptDeclarationPlan({ id: "lexical-priority", text });
    check(parsed.kind === "blocked", "lexical failure blocks plan");
    if (parsed.kind !== "blocked") throw new Error("blocked plan invariant");
    check(JSON.stringify(parsed.diagnostic) === JSON.stringify(lexical.error), "whole-source lexical diagnostic precedence");
    check(JSON.stringify(parsed.rejection) === JSON.stringify(lexical.rejection), "whole-source lexical rejection precedence");
}
for (const text of ["", "/* comment */", "var x=1;", "function f(){'use strict';return 1}", "var f=(x)=>x;"]) {
    const plan = parseBoundedScriptDeclarationPlan({ id: "complete-source", text });
    check(plan.kind !== "blocked", "complete plan: " + text);
}
console.log("Parser token stream passed");
