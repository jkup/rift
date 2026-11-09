import { Realm } from "../src/realm.js";
import { sameValue, type Value } from "../src/runtime.js";
import { parse } from "../src/parser.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function expect(text: string, expected: Value): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "asi", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession({ maxSteps: 50000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && sameValue(result.value, expected), text);
}
for (const text of [
    "var x=1\nx===1",
    "let x=1\nconst y=2\nx+y===3",
    "{let x=7\nvar y=x}y===7",
    "function f(){return 7}f()===7",
    "function f(){return}f()===undefined",
    "function f(){return\n7}f()===undefined",
    "function f(){return/*\n*/7}f()===undefined",
    "function f(){return\n{x:7}}f()===undefined",
    "var x=0\nwhile(true){x++\nbreak}x===1",
    "var x=0\nwhile(x<3){x++\ncontinue}x===3",
    "var n=0\nouter:while(true){while(true){n++\nbreak outer}}n===1",
    "var n=0\na:while(true){n++\nbreak\na}n===1",
    "var n=0\na:for(var i=0;i<2;i++){n++\ncontinue\na}n===2",
    "var x=1,y=1\nx\n++y\nx===1&&y===2",
    "var x=1,y=2\nx\n--y\nx===1&&y===1",
    "var x=1,y=1\nx/*\n*/++y\nx===1&&y===2",
    "var x=1\n++x\nx===2",
    "var x=1\nx++\nx===2",
    "var x=0\ndo{x++}while(x<2)x===2",
    "var x=0\nif(true)x=1\nelse x=2\nx===1",
    "var x=0\nif(false)if(true)x=1\nelse x=2\nx===0",
    "var x=1\n+2\nx===3",
    "var x=8\n/2/2\nx===2",
    "var x={a:7}\n.a\nx===7",
    "var x={a:7}\n['a']\nx===7",
    "var x=function(a){return a}\n(7)\nx===7",
    "var x=null\n?.a\nx===undefined",
    "var x=1\n, y=2\nx===1&&y===2",
    "var x=true\n?1:2\nx===1",
    "var n=0\ntry{throw 7}catch(e){n=e}n===7",
    "var o={m(){return 7}}\no.m()===7",
    "var f=()=>{return 7}\nf()===7",
    "Function('return 7')()===7",
    "function f(){return 7}f.toString()==='function f(){return 7}'",
    "function f(a=1){'use strict'\n+''\nreturn a}f()===1",
    "function f(...a){'use strict'\n.length\nreturn a.length}f(1,2)===2",
    "Function('var x=1\\nx+2; return x')()===1",
    "'use strict'\nfunction f(){return this}f()===undefined",
    "function f(){'use strict'\nreturn this}f()===undefined",
    "'other'\n'use strict'\nfunction f(){return this}f()===undefined",
    "'use strict'\n+''\nfunction f(){return this}f()===this",
    "'use strict'\n[0]\nfunction f(){return this}f()===this",
    "'use strict'\n.charAt(0)\nfunction f(){return this}f()===this",
    "'use strict'\n?.length\nfunction f(){return this}f()===this",
    "'use strict'\n,true\nfunction f(){return this}f()===this",
    "('use strict')\nfunction f(){return this}f()===this",
    "'use\\x20strict'\nfunction f(){return this}f()===this",
    "var text='a\\\nb'\nvar n=1\ntext==='ab'&&n===1",
    "var text=`a\nb`\nvar n=1\ntext==='a\\nb'&&n===1",
]) expect(text, { kind: "boolean", value: true });
for (const newline of ["\n", "\r", "\r\n", "\u2028", "\u2029", "/*\n*/", "//x\n"])
    expect("var x=1" + newline + "var y=2" + newline + "x+y===3", { kind: "boolean", value: true });
expect("'use strict'", { kind: "string", value: "use strict" });
expect("function f(){'use strict'}f()", { kind: "undefined" });

const realm = new Realm((_line: string) => {}, "script");
for (const text of [
    "var x=1 var y=2", "if(true) else 1", "if(true)", "if(true)\nelse 1", "while(true)",
    "for(var i=0\ni<3\ni++){}", "for(var i=0;i<3\ni++){}", "for(var i=0\ni<3;i++){}",
    "throw\n7", "throw/*\n*/7", "throw", "function f(){throw}",
    "var x=1\nx\n++", "var text='a\\\nb' var x=1", "var text=`a\nb` var x=1",
    "function f(a=1){'use strict'\nreturn a}", "function f(...a){'use strict'}", "(a=1)=>{'use strict'\nreturn a}",
    "'use strict'\nvar arguments=1", "'use strict'\nfunction f(a,a){}", "'use strict'\nwith(x){}",
]) check(prepareBoundedScript({ id: "invalid-asi", text }, realm).kind === "blocked", text);
for (const text of ["'use strict'\n(0)", "'use strict'\n+''", "'use strict'\n[0]", "'use strict'\n?.length"]) {
    const prepared = prepareBoundedScript({ id: "continued-string", text }, realm);
    check(prepared.kind === "ready" && !prepared.record.inspect().strictness.strict, "continued string is not a directive: " + text);
}
check(parse("var x=1\nx;").error !== null, "legacy terminators unchanged");
console.log("Semicolon insertion passed");
