import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"]) {
        const realm = new Realm((_line: string) => {}, "script");
        const prepared = prepareBoundedScript({ id: "arrow-cover", text: prefix + text }, realm);
        if (prepared.kind !== "ready") throw new Error("prepare: " + text);
        const result = evaluateScript(createScriptSession({ maxSteps: 50000, maxCalls: 64 }), prepared.record).completion;
        check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
    }
}
passes("var a=1,b=2; (a,b)===2 && ((a))===1 && (a+=2,b*=3,a+b)===9;");
passes("var a=1,b=2; (a=3,b=4)===4 && a===3 && b===4;");
passes("var f=(a=(1,2),b=(x=>x+1)(a),...rest)=>[a,b,rest.length].join(','); f(undefined,undefined,7,8)==='2,3,2';");
passes("var f=(a=()=>({x:2}),b=(x=>x)(3))=>a().x+b; f()===5;");
passes("var calls=0; var f=(a=(calls++,4))=>a; calls===0&&f()===4&&calls===1&&f(8)===8&&calls===1;");
passes("var f=(a=(b=()=>3)=>b())=>a(); f()===3;");
passes("var f=(a=`x${(()=>2)()}`,)=>a; f()==='x2';");
passes("var f=(a=1,...rest)=>rest[0]+a; f(2,3)===5&&f.length===0&&f.toString()==='(a=1,...rest)=>rest[0]+a';");
passes("var f=(a /* ) => */ , b=')=>')=>a+b; f('x')==='x)=>';");
passes("var f=(a=1)=>{let b=2;return a+b}; f()===3&&((x=>x)(4))===4;");
passes("var f=true?(x)=>x+1:(x)=>x-1; f(3)===4&&[()=>1,(x)=>x][1](7)===7;");
passes("var x=0; ((x=1,()=>x))()===1&&(function(){return 4})()===4;");
passes("var a={x:1}; (a.x)=2; a.x===2&&((a.x))===2;");
passes("class A{m(){return 3}} class B extends A{m(){return (f=()=>super.m())=>f()}} new B().m()()===3;");
passes("function C(){return (x=new.target)=>x} new C()()===C;");
passes("var f=(a)=>a; (f)(5)===5&&((f))(6)===6;");

for (const text of [
    "();", "(a,);", "(...a);", "(...a,)=>a;", "(...a=1)=>a;", "(a,...b,c)=>a;",
    "((a))=>a;", "((a)=1)=>a;", "(a.b)=>a;", "(a+b)=>a;", "(a+=1)=>a;",
    "(a,a)=>a;", "(a=1,a)=>a;", "(a,...a)=>a;", "(a)\n=>a;",
    "(a)/*\r\n*/=>a;", "1+(a)=>a;", "new (a)=>a;", "(a)=>{}.x;",
    "(a)=>{let a;};", "(a=1)=>{'use strict';return a};", "(...a)=>{'use strict'};",
    "({a})=>a;", "([a])=>a;", "(a={x:1}, {b})=>a;",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    check(prepareBoundedScript({ id: "arrow-cover-rejected", text }, realm).kind !== "ready", "reject: " + text);
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const text = "(".repeat(140) + "1" + ")".repeat(140);
    check(prepareBoundedScript({ id: "arrow-cover-depth", text }, realm).kind !== "ready", "nested cover depth remains bounded");
}
console.log("Arrow cover passed");
