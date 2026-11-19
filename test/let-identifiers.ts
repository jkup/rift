import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}
function expectTrue(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "let-execution", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") {
        return;
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 10000, maxCalls: 64 }),
        prepared.record,
    ).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const executions = [
    "var let=6;let++;let===7",
    "function f(let){return let}f(7)===7",
    "function f(let=7){return let}f()===7",
    "function f(...let){return let[0]}f(7)===7",
    "function let(){return 7}let()===7",
    "var f=function let(){return 7};f()===7",
    "var f=let=>let;f(7)===7",
    "var f=(let)=>let;f(7)===7",
    "var {let}={let:7};let===7",
    "var [let]=[7];let===7",
    "var let;({x:let}={x:7});let===7",
    "var let;[...let]=[7];(let)[0]===7",
    "var let=7;var o={let};o.let===7",
    "var out=0;try{throw 7}catch(let){out=let}out===7",
    "var out=0;let:while(true){out=7;break let}out===7",
    "var out=0;let:for(var i=0;i<3;i++){if(i<2)continue let;out=7}out===7",
    "var let=0;if(true)let=7;let===7",
    "var let=0;while(let<7)let++;let===7",
    "var let=0;label:let=7;let===7",
    "var let=7;let\n1;let===7",
    "var let=x=>x;let\n(7)===7",
    "let\nx=7;x===7",
    "var let={x:7};let.x===7",
    "var let=[7];(let)[0]===7",
    "var let;for(let in {x:7}){}let==='x'",
    "var let={};for(let.x in {x:7}){}let.x==='x'",
    "var let;for((let) of [7]){}let===7",
    "var let={};for((let.x) of [7]){}let.x===7",
    "var out=0;for(var let of [3,4])out+=let;out===7",
    "var let;for(let=0;let<7;let++){}let===7",
    "var let=7;for(let;false;){}let===7",
    "var out=0;for(let of of [7])out=of;out===7",
    "function* f(let){yield let}f(7).next().value===7",
    "var out=0;async function f(let){out=let}f(7);out===7",
    "var let=7;eval('let')===7",
    "Function('let','return let')(7)===7",
];
for (const text of executions) {
    expectTrue(text);
}
for (const text of [
    '"use strict";var let=1;',
    '"use strict";let;',
    '"use strict";let:while(false){break let;}',
    'function let(){"use strict";}',
    'function f(let){"use strict";}',
    "class C{x=let}",
    "class C{m(let){}}",
]) {
    let effects = 0;
    const prepared = prepareBoundedScript(
        { id: "let-strict", text },
        new Realm((_line: string) => {
            effects++;
        }, "script"),
    );
    check(
        prepared.kind === "blocked" &&
            prepared.rejection.kind === "syntax-error" &&
            prepared.rejection.ruleCode === "strict-reserved-identifier",
        text,
    );
    check(effects === 0, "strict preparation must not execute");
}
for (const text of [
    "let let=1;",
    "const let=1;",
    "let {let}={};",
    "let {x:let}={};",
    "let [let]=[];",
    "for(let let in {}){}",
    "for(const let of []){}",
    "let[0];",
    "let\n[0];",
    "if(true)let[0];",
    "for(let of []){}",
    "for(let.x of []){}",
    "for(let[0] in {}){}",
    '"use strict";var let=1;import x from "x";',
]) {
    const prepared = prepareBoundedScript(
        { id: "let-unsupported", text },
        new Realm((_line: string) => {}, "script"),
    );
    check(prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax", text);
}
expectTrue('"use strict";class C{let(){return 7}}new C().let()===7');
expectTrue('"use strict";let {let:x}={let:7};x===7');
expectTrue(
    'var ok=false;try{eval("\\\"use strict\\\";var let=1")}catch(e){ok=e instanceof SyntaxError}ok',
);
check(parse("var let=1;").rejection?.kind === "unsupported-syntax", "legacy admission unchanged");
check(executions.length === 36, "execution denominator");
console.log("let identifiers passed");
