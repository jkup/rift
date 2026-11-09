import { Realm } from "../src/realm.js";
import { sameValue } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
for (const prefix of ["", "'use strict';"]) {
    for (const source of [
        "var o={a:1,b:2,};Object.keys(o).join(',')==='a,b';",
        "var o={m(){return 7;},};o.m()===7&&o.m.toString()==='m(){return 7;}';",
        "var o={get x(){return this.y;},set x(v){this.y=v;},};o.x=9;o.x===9;",
        "var o={a:{b:3,},};o.a.b===3;",
        "var o={a:function(){return 7;},};o.a.name==='a'&&o.a()===7;",
        "var a=[];a.push(1,2,);a.length===2&&a.join(',')==='1,2';",
        "var a=[];a.push(...[],);a.length===0;",
        "var a=[];a.push(1,...[2,3],);a.length===3&&a.join(',')==='1,2,3';",
        "new Array(3,).length===3&&!new Array(3,).hasOwnProperty('0');",
        "new Array(...[],).length===0&&new Array(...[1,2],).join(',')==='1,2';",
        "function C(x){this.x=x;}new C(7,).x===7;",
        "var trace='';function arg(x){trace+=x;return x;}var o={a:arg('a'),b:arg('b'),};var a=[];a.push(arg('c'),arg('d'),);trace==='abcd'&&a.length===2;",
        "var o={a:1, /* end */ };var a=[];a.push(o.a, // end\n);a.length===1&&a[0]===1;",
        "var n=0;function fail(){throw 7;}var ok=false;try{({a:fail(),b:(n=1),});}catch(e){ok=e===7;}ok&&n===0;",
        "var n=0;function fail(){throw 7;}var ok=false;try{Math.max(fail(),(n=1),);}catch(e){ok=e===7;}ok&&n===0;",
    ]) {
        const prepared = prepareBoundedScript({id: 'trailing-comma', text: prefix + source}, fresh());
        check(prepared.kind === 'ready', 'prepare ' + source);
        if (prepared.kind !== 'ready') throw new Error('ready');
        const session = createScriptSession();
        const result = evaluateScript(session, prepared.record).completion;
        check(result.type === 'normal' && sameValue(result.value, {kind: 'boolean', value: true}), source);
        check(session.inspect().active === null, 'restored session');
    }
}
for (const source of ['f(,);','f(1,,);','new C(,);','new C(1,,);','({,});','({a:1,,});','({m(){},,});','function f(a,){}','({m(a,){}});','f(...,);'])
    check(prepareBoundedScript({id: 'invalid', text: source}, fresh()).kind !== 'ready', 'reject ' + source);
for (const source of ['f(1,);','({a:1,});']) check(parse(source).error !== null, 'legacy boundary');
console.log('Trailing commas passed');
