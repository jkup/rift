import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseBoundedScriptDeclarationPlan } from "../src/parser.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm = new Realm((_line: string) => {}, "script"),
    steps = 50000,
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "regexp-literals", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"]) {
        const result = run(prefix + text);
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            text,
        );
    }
}
passes("/a/.test('cat')&&!/a/.test('dog')&&/a/i.test('A');");
passes("var r=/a/dg; var m=r.exec('ba');m[0]==='a'&&m.indices[0][0]===1&&r.lastIndex===2;");
passes("/=a/.test('=a')&&/[/]/.test('/')&&/a\\/b/.test('a/b');");
passes("/[/*]/.test('*')&&/[()]/.test('(')&&/['\"`]/.test('\"');");
passes("/\\u0061/.source==='\\\\u0061'&&/\\u0061/.test('a')&&/😀/.exec('x😀').index===1;");
passes("var a=/a/g,b=/a/g;a!==b&&a.exec('a')[0]==='a'&&a.lastIndex===1&&b.lastIndex===0;");
passes(
    "function f(){return /a/g}var a=f(),b=f();a!==b&&Object.getPrototypeOf(a)===RegExp.prototype;",
);
passes(
    "var C=RegExp;RegExp=function(){throw 1};var r=/a/;Object.getPrototypeOf(r)===C.prototype&&r.test('a');",
);
passes("var C=RegExp;Object.defineProperty(C,'prototype',{writable:false});/a/.constructor===C;");
passes("var x=8\n/2/2;var y=8;y/=2;x===2&&y===4;");
passes("var x=0;if(true)/a/.test('a')&&(x=1);x===1;");
passes("var x=0;while(x<1)/a/.test('a')&&x++;x===1;");
passes("var x=0;{x=1}/a/.test('a')&&x===1;");
passes("var x=({a:8}).a/2;var y=function(){return 8}()/2;x===4&&y===4;");
passes("function f(){return /a/}function g(){return\n/a/}f().test('a')&&g()===undefined;");
passes("var x=/a/ /* tail */.test('a'); // /[bad\n x;");
passes("var x=`a${/[}]/.test('}')}b${/[$]/.test('$')}`;x==='atruebtrue';");
passes("var x=`a${`b${/[`]/.test('`')}`}`;x==='abtrue';");
passes("var f=(a=/[()]/)=>a.test('(');f()&&f(/x/)===false;");
passes("var f=(a=/=/)=>a.source;f()==='='&&((/a/)).test('a');");
passes("var f=()=>/a/;f().test('a')&&((a=/a/)=>a.test('a'))();");
passes("var x=0;(/a/.test('a'),x=2)===2&&x===2;");
passes("var f=(a=()=>/[)]/)=>a().test(')');f();");
passes("var o={x:/a/,m(){return /b/}};o.x.test('a')&&o.m().test('b');");
passes("class A{m(){return /a/}}new A().m().test('a');");
passes(
    "'a,b'.split(/,/).join('|')==='a|b'&&'aba'.replace(/a/g,'x')==='xbx'&&'aba'.match(/a/g).length===2;",
);
passes("var a=[];for(var i=0;i<2;i++)a.push(/a/g);a[0]!==a[1]&&a[1].lastIndex===0;");
passes("if(false)/a{1000000000}/;true;");
passes("eval('/a/.test(\"a\")')&&Function('return /b/.test(\"b\")')();");
passes("var ok=false;try{eval('/a/gg')}catch(e){ok=e instanceof SyntaxError}ok;");
passes("var ok=false;try{Function('return /(/')}catch(e){ok=e instanceof SyntaxError}ok;");
passes("var ok=false;try{new Function('return /a/z')}catch(e){ok=e instanceof SyntaxError}ok;");

check(
    parseBoundedScriptDeclarationPlan({ id: "lookahead-admission", text: "/(?=a)/;" }).kind ===
        "complete",
    "lookahead literal admitted",
);
for (const text of [
    "/a/gg; /(?=a)/",
    "/a/gg; async function f(){await 1;}",
    "/a/gg; async function f(){}",
    "/(/;",
    "/a/gg;",
    "/a/z;",
    "/a/0;",
    "/a/uv;",
    "if(false)/[z-a]/;",
    "function f(){return /a{3,2}/}",
]) {
    const realm = new Realm((_line: string) => {
        throw new Error("early error must not execute");
    }, "script");
    const result = prepareBoundedScript(
        { id: "literal-early-error", text: "console.log('wrong');" + text },
        realm,
    );
    check(result.kind !== "ready", "invalid literal is early: " + text);
    const plan = parseBoundedScriptDeclarationPlan({ id: "literal-provenance", text });
    check(
        plan.kind === "blocked" &&
            plan.rejection.kind === "syntax-error" &&
            plan.rejection.ruleCode === "regexp-literal",
        "certified literal early error: " + text,
    );
}
for (const text of ["/a/u;", "/a/v;", "/(?<x>a)/;"]) {
    const plan = parseBoundedScriptDeclarationPlan({ id: "literal-unsupported", text });
    if (text !== "/a/v;") {
        check(run(text).type === "normal", "retained literal executes");
    } else {
        check(
            plan.kind === "blocked" &&
                plan.rejection.kind === "unsupported-syntax" &&
                plan.rejection.capabilityCode === "parse.regexp-pattern",
            "unsupported pattern: " + text,
        );
    }
}
for (const text of ["/a", "/[a/", "/a\n/", "/a\\\n/", "/a/gé"]) {
    const plan = parseBoundedScriptDeclarationPlan({ id: "literal-lexical", text });
    check(
        plan.kind === "blocked" &&
            plan.rejection.kind === "unsupported-syntax" &&
            plan.rejection.capabilityCode === "lex.regexp-literal",
        "uncovered lexical form: " + text,
    );
}
for (const text of ['/a/gg; import x from "x";', "/(/; @", "/a/gg; let = ;"]) {
    const plan = parseBoundedScriptDeclarationPlan({ id: "literal-incomplete-coverage", text });
    check(
        plan.kind === "blocked" && plan.rejection.kind === "unsupported-syntax",
        "no certification without complete supported grammar",
    );
}
{
    const first = new Realm((_line: string) => {}, "script"),
        second = new Realm((_line: string) => {}, "script");
    const foreign = run("()=>/a/", first);
    if (foreign.type !== "normal") {
        throw new Error("foreign function");
    }
    second.defineScriptGlobal("foreign", { value: foreign.value });
    second.defineScriptGlobal("foreignPrototype", {
        value: { kind: "object", object: first.regexpPrototype },
    });
    const result = run(
        "var r=foreign();Object.getPrototypeOf(r)===foreignPrototype&&Object.getPrototypeOf(/a/)===RegExp.prototype;",
        second,
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "literal uses executing code Realm",
    );
}
const limited = run("/a{1000000000}/", undefined, 100);
check(
    limited.type === "throw" && limited.origin.kind === "resource-limit",
    "literal compilation is budgeted at evaluation",
);

check(
    parseBoundedScriptDeclarationPlan({ id: "backreference-migration", text: "/(a)\\1/;" }).kind ===
        "complete",
    "historical backreference now supported",
);
console.log("RegExp literals passed");
