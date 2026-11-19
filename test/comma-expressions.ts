import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "comma", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    try {
        return evaluateScript(session, prepared.record).completion;
    } finally {
        check(
            session.inspect().active === null && session.inspect().calls === 0,
            "restored session",
        );
    }
}
function expect(result: ValueCompletion, expected: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, expected), label);
}
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"]) {
        expect(run(prefix + text), { kind: "boolean", value: true }, text);
    }
}

passes("(1,2,3)===3;");
passes(
    "var trace='';function f(x){trace+=x;return x;}var r=(f('a'),f('b'),f('c'));r==='c'&&trace==='abc';",
);
passes("var a=0;var b=(a=1,a+=2,a*4);a===3&&b===12;");
passes("var a=0;var b=0;a=1,b=2;a===1&&b===2;");
passes("var x=0;var y=(false?1:x=2,x=3);x===3&&y===3;");
passes("var x=0;var y=(true?(x=1,x+1):(x=9,x));x===1&&y===2;");
passes("var x=0;false&&(x=1),x=2;x===2;");
passes("function f(){return 1,2,3;}f()===3;");
passes("var ok=false;try{throw 1,2;}catch(e){ok=e===2;}ok;");
passes("var x=0;if(x=1,false){x=9;}x===1;");
passes("var i=0;var x=0;while(i++,i<3){x++;}i===3&&x===2;");
passes("var i=0;var x=0;do{x++;}while(i++,i<2);i===2&&x===2;");
passes("var i=9;var j=9;var sum=0;for(i=0,j=3;i<3;i++,j--){sum+=j;}sum===6&&i===3&&j===0;");
passes("var sum=0;for(var i=0,j=3;i<3;i++,j--){sum+=j;}sum===6;");
passes("var trace='';for(var k in trace+='r',{a:1}){trace+=k;}trace==='ra';");
passes("var sum=0;for(var x of (0,[1,2])){sum+=x;}sum===3;");
passes("var x=0;switch(x=1,2){case (x=3,2):x+=4;}x===7;");
passes("var o={a:3};o[(0,'a')]===3;");
passes("`${1,2}`==='2';");
passes("function f(a,b){return a*10+b;}f(1,2)===12&&f((1,2),3)===23;");
passes("function C(a,b){this.n=a*10+b;}new C((1,2),3).n===23;");
passes("var a=[(1,2),3];var o={a:(1,2),b:3};a.length===2&&a[0]===2&&o.a===2&&o.b===3;");
passes("var a=(1,2),b=3;a===2&&b===3;");
passes("let a=(1,2);const b=(3,4);a===2&&b===4;");
passes("function f(a,b){return a+b;}f(...(0,[1,2]))===3&&[...(0,[3,4])].join(',')==='3,4';");
passes(
    "var trace='';var o={get a(){trace+='a';return 1;},get b(){trace+='b';return 2;}};var x=(o.a,o.b);trace==='ab'&&x===2;",
);
passes(
    "var hit=false;var ok=false;try{(missing,hit=true);}catch(e){ok=e instanceof ReferenceError;}ok&&!hit;",
);
passes(
    "var hit=false;var o={get a(){throw 7;}};var ok=false;try{(o.a,hit=true);}catch(e){ok=e===7;}ok&&!hit;",
);
passes("var x={valueOf(){throw 9;},toString(){throw 9;}};(x,3)===3&&(0,x)===x;");
passes("var o={m(){'use strict';return this;}};o.m()===o&&(0,o.m)()===undefined;");
passes("function f(){'use strict';return this;}(0,f)()===undefined;");
passes("var ok=false;try{typeof (0,missing);}catch(e){ok=e instanceof ReferenceError;}ok;");
passes(
    "var count=0;var o={get x(){count++;return 3;}};delete (0,o.x);count===1&&o.hasOwnProperty('x');",
);
passes("var f=(0,function(){});var g=(function(){});f.name===''&&g.name==='g';");
passes("var o={x:(0,function(){})};o.x.name==='';");
passes("function f(){return (1,2);}f.toString()==='function f(){return (1,2);}';");

for (const text of [
    "(1,);",
    "(,1);",
    "(1,,2);",
    "1 ',' 2;",
    "var a=0;var b=0;(a,b)=1;",
    "var a=0;var b=0;(a,b)++;",
    "for(var x of 0,[1]){}",
    "var o={a:1,2};",
    "let a=1,2;",
    "const a=1,2;",
]) {
    const realm = new Realm((_line: string) => {
        throw new Error("preparation executed output");
    }, "script");
    const prepared = prepareBoundedScript(
        { id: "invalid-comma", text: "console.log('bad');" + text },
        realm,
    );
    check(prepared.kind !== "ready", "reject whole source: " + text);
}
for (const text of ["(1,2);", "1,2;", "function f(){return 1,2;}"]) {
    check(parse(text).error !== null, "legacy admission unchanged");
}
{
    const owner = fresh(),
        caller = fresh();
    const target = run("function f(){return (0,missing);}f;", owner);
    if (target.type !== "normal") {
        throw new Error("foreign target");
    }
    caller.defineScriptGlobal("f", { value: target.value });
    const result = run("f();", caller);
    check(
        result.type === "throw" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === owner.getErrorPrototype("ReferenceError"),
        "target Realm error",
    );
}
{
    const realm = fresh();
    check(
        run("var hit=false;function loop(){while(true){}}", realm).type === "normal",
        "prepare loop",
    );
    const result = run("try{(loop(),hit=true);}catch(e){hit=true;}", realm, 40);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "fatal comma left side",
    );
    expect(
        run("hit;", realm),
        { kind: "boolean", value: false },
        "no right side or guest catch after resource stop",
    );
}
console.log("Comma expressions passed");
