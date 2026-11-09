import { Realm } from "../src/realm.js";
import { GuestObject, sameValue, normal, type PropertyKey, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "for-in", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + " " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, {kind:"boolean",value:true}), text);
}
for (const prefix of ["", "'use strict';"]) {
    for (const kind of ["var", "let", "const"]) {
        for (const source of [
            "var a=[];for(K k in {b:1,2:2,1:3,a:4})a.push(k);a.join(',')==='1,2,b,a';",
            "var a=[];for(K k in [4,,6])a.push(k);a.join(',')==='0,2';",
            "var a=[];for(K k in 'A😀')a.push(k);a.join(',')==='0,1,2';",
            "var n=0;for(K k in null)n++;for(K k in undefined)n++;for(K k in 3)n++;for(K k in true)n++;for(K k in Symbol())n++;n===0;",
            "var p={x:1,z:2};var o=Object.create(p);o.a=3;o.x=4;var a=[];for(K k in o)a.push(k);a.join(',')==='a,x,z';",
            "var p={x:1,y:2};var o=Object.create(p);Object.defineProperty(o,'x',{value:3,enumerable:false});var a=[];for(K k in o)a.push(k);a.join(',')==='y';",
            "var o={a:1};o[Symbol()]=2;var a=[];for(K k in o)a.push(k);a.join(',')==='a';",
            "var o={a:1,b:2};var a=[];for(K k in o){a.push(k);delete o.b;o.c=3;}a.join(',')==='a';",
            "var o={a:1,b:2};var a=[];for(K k in o){a.push(k);Object.defineProperty(o,'b',{enumerable:false});}a.join(',')==='a';",
            "var p={b:2};var o=Object.create(p);o.a=1;o.b=3;var a=[];for(K k in o){a.push(k);delete o.b;}a.join(',')==='a,b';",
            "var o={a:1,b:2};var a=[];for(K k in o){if(k==='a')continue;a.push(k);}a.join(',')==='b';",
            "var a=[];for(K k in {a:1,b:2}){try{continue;}finally{a.push(k);}}a.join(',')==='a,b';",
            "var n=0;for(K k in {a:1,b:2}){n++;break;}n===1;",
            "function f(){for(K k in {a:1})return k;}f()==='a';",
            "var count=0;var o={a:1};Object.defineProperty(o,'b',{enumerable:true,get:function(){count++;throw 1;}});var a=[];for(K k in o)a.push(k);count===0&&a.join(',')==='a,b';",
            "var o={a:1};o[Symbol.iterator]=function(){throw 1;};Object.defineProperty(o,'return',{get:function(){throw 2;}});for(K k in o)break;true;",
        ]) passes(prefix+source.replaceAll('K ',kind+' '));
        const c=run(prefix+'for('+kind+' k in {a:1,b:2}){k;}');
        check(c.type === "normal" && sameValue(c.value,{kind:"string",value:'b'}),'completion value');
    }
    for (const kind of ["let","const"]) {
        passes(prefix+'var a=[];for('+kind+' k in {a:1,b:2})a.push(function(){return k;});a[0]()===\'a\'&&a[1]()===\'b\'&&typeof k===\'undefined\';');
        passes(prefix+'let k={a:1};var ok=false;try{for('+kind+' k in k){}}catch(e){ok=e instanceof ReferenceError;}ok;');
        passes(prefix+'var f;for('+kind+' k in (function(){f=function(){return k;};return {};})()){}var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;');
        passes(prefix+'var a=[];for('+kind+' k in {a:1,b:2}){let k=9;a.push(k);}a.join(\',\')===\'9,9\';');
        for(const body of ['var k;','{var k;}','{if(false){var k;}}'])
            check(prepareBoundedScript({id:'conflict',text:prefix+'for('+kind+' k in {})'+body},fresh()).kind === 'conflict','head/body conflict');
    }
    passes(prefix+"var k;var o={};var n=0;function target(){n++;return o;}for(target().x in {a:1,b:2}){}n===2&&o.x==='b';");
    passes(prefix+"var n=0;function target(){n++;return {};}for(target().x in null){}n===0;");
    passes(prefix+"var a=[];for(let k in {a:1,b:2}){a.push(function(){return k;});k+='!';}a[0]()==='a!'&&a[1]()==='b!';");
    passes(prefix+"var ok=false;try{for(const k in {a:1})k=2;}catch(e){ok=e instanceof TypeError;}ok;");
    passes(prefix+"for(var k in null){}Object.hasOwn(this,'k')&&k===undefined;");
    const empty=run(prefix+'7;for(var k in null){}');check(empty.type === 'normal' && empty.value.kind === 'undefined','empty completion');
}
for(const text of ['for(var k=1 in {}){}','for(let k=1 in {}){}','for(const k=1 in {}){}','for(var k,j in {}){}','for(let [k] in {}){}','for(1 in {}){}','for(let k in {})let x;'])
    check(prepareBoundedScript({id:'unsupported',text},fresh()).kind !== 'ready','reject '+text);
const owner=fresh(),caller=fresh();
const fn=run("var f;for(const k in {a:1})f=function(){k=1;};f;",owner);
check(fn.type === 'normal','foreign closure');if(fn.type === 'normal')caller.defineScriptGlobal('f',{value:fn.value});
const error=run('f();',caller);check(error.type === 'throw' && error.value.kind === 'object' && error.value.object.getPrototypeOf() === owner.getErrorPrototype('TypeError'),'foreign Realm error');
const foreign=run('({a:1,b:2});',owner);if(foreign.type === 'normal')caller.defineScriptGlobal('o',{value:foreign.value});
const names=run("var a=[];for(let k in o)a.push(k);a.join(',');",caller);check(names.type === 'normal' && sameValue(names.value,{kind:'string',value:'a,b'}),'foreign object');
const realm=fresh();let object:GuestObject=realm.createObject();for(let i=0;i<80;i++)object=new GuestObject(object);
realm.defineScriptGlobal('chain',{value:{kind:'object',object}});
const bounded=run('for(var k in chain){}',realm,40);check(bounded.type === 'throw' && bounded.origin.kind === 'resource-limit','empty prototype traversal bounded');
const wide=fresh();for(let i=0;i<100;i++)wide.defineScriptGlobal('key'+i,{value:{kind:'number',value:i},enumerable:false});
const scanned=run('for(var k in this){}',wide,50);check(scanned.type === 'throw' && scanned.origin.kind === 'resource-limit','non-enumerable scan bounded');
const host=fresh(),fault=new Error('enumeration host fault');
class FaultObject extends GuestObject { override ownPropertyKeys(): PropertyKey[] { throw fault; } }
host.defineScriptGlobal('o',{value:{kind:'object',object:new FaultObject(host.objectPrototype)}});
let effects=0;host.defineScriptGlobal('effect',{value:{kind:'object',object:host.createBuiltin('effect',0,(_t,_a,_c,_l):ValueCompletion=>{effects++;return normal();})}});
const session=createScriptSession();const prepared=prepareBoundedScript({id:'host',text:'try{for(let k in o){}}catch(e){effect();}finally{effect();}'},host);
check(prepared.kind === 'ready','host prepares');let caught=false;if(prepared.kind === 'ready')try{evaluateScript(session,prepared.record);}catch(e){caught=e instanceof Error && e===fault;}
check(caught&&effects===0&&session.inspect().active===null&&session.inspect().depth===0,'host fault restoration');
const text='for(const k in {a:1}){var x;let y;}';const plan=parseDeclarationPlan({id:'plan',text});check(plan.kind === 'complete','plan complete');
if(plan.kind === 'complete')check(plan.scopes[1].kind === 'for-in'&&plan.scopes[1].start===0&&plan.scopes[1].end===text.length&&plan.scopes[0].varNames.join(',')==='x'&&plan.scopes[1].lexicalNames.join(',')==='k','loop scope ownership');
console.log('For-in passed');
