import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, 'script'); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const p=prepareBoundedScript({id:'wellformed',text},realm);if(p.kind!=='ready')throw new Error('prepare '+text);
    const session=createScriptSession({maxSteps:steps,maxCalls:64}),r=evaluateScript(session,p.record).completion;
    check(session.inspect().active===null&&session.inspect().calls===0,'restored session');return r;
}
function expect(result:ValueCompletion,value:Value,label:string):void{check(result.type==='normal'&&sameValue(result.value,value),label);}
function passes(text:string):void{expect(run(text),{kind:'boolean',value:true},text);}
const cases: {input:string;output:string}[] = [
    {input:'',output:''},{input:'abc\0\uffff',output:'abc\0\uffff'},
    {input:'\ud800',output:'�'},{input:'\udbff',output:'�'},{input:'\udc00',output:'�'},{input:'\udfff',output:'�'},
    {input:'\ud800\udc00',output:'\ud800\udc00'},{input:'\udbff\udfff',output:'\udbff\udfff'},
    {input:'a😀b',output:'a😀b'},{input:'a\ud800b',output:'a�b'},{input:'a\udfffb',output:'a�b'},
    {input:'\ud800\ud800\udc00',output:'�\ud800\udc00'},
    {input:'\udc00\ud800',output:'��'},{input:'\udc00\udfff',output:'��'},
    {input:'\ud800\udbff',output:'��'},{input:'\ud800\udc00\udfff',output:'\ud800\udc00�'},
    {input:'\udc00x\ud800\udc00y\ud800',output:'�x\ud800\udc00y�'},
];
for(const prefix of ['',"'use strict';"])for(const row of cases){
    const realm=fresh();realm.defineScriptGlobal('text',{value:{kind:'string',value:row.input}});
    expect(run(prefix+'text.isWellFormed();',realm),{kind:'boolean',value:row.input===row.output},'wellformed predicate');
    expect(run(prefix+'text.toWellFormed();',realm),{kind:'string',value:row.output},'wellformed repair');
    expect(run(prefix+'text.toWellFormed().isWellFormed();',realm),{kind:'boolean',value:true},'repair invariant');
}
for(const name of ['isWellFormed','toWellFormed']){
    for(const source of [
        "var f=String.prototype.M;f.name==='M'&&f.length===0&&!f.hasOwnProperty('prototype');",
        "var d=Object.getOwnPropertyDescriptor(String.prototype,'M');d.writable&&!d.enumerable&&d.configurable;",
        "var n=0;var x={toString(){n++;return 'abc';}};String.prototype.M.call(x);n===1;",
        "var trace='';var x={toString(){trace+='s';return {};},valueOf(){trace+='v';return 'abc';}};String.prototype.M.call(x);trace==='sv';",
        "var x={};x[Symbol.toPrimitive]=function(hint){if(hint!=='string')throw 9;return 'abc';};String.prototype.M.call(x)!==undefined;",
        "var ok=false;try{String.prototype.M.call({toString(){throw 7;}});}catch(e){ok=e===7;}ok;",
        "var ok=false;try{new String.prototype.M();}catch(e){ok=e instanceof TypeError;}ok;",
    ])passes(source.replaceAll('M',name));
    for(const value of ['null','undefined','Symbol()'])passes("var ok=false;try{String.prototype."+name+".call("+value+");}catch(e){ok=e instanceof TypeError;}ok;");
    const owner=fresh(),caller=fresh(),method=run('String.prototype.'+name+';',owner);
    if(method.type==='normal')caller.defineScriptGlobal('f',{value:method.value});
    const error=run('f.call(null);',caller);
    check(error.type==='throw'&&error.value.kind==='object'&&error.value.object.getPrototypeOf()===owner.getErrorPrototype('TypeError'),'defining Realm error');
}
passes("String.prototype.isWellFormed.call(123)&&String.prototype.toWellFormed.call(123)==='123';");
passes("String.prototype.isWellFormed.call(new String('abc'))&&String.prototype.toWellFormed.call(new String('abc'))==='abc';");
passes("'abc'.isWellFormed({toString(){throw 7;}})&&'abc'.toWellFormed({toString(){throw 7;}})==='abc';");
const realm=fresh();realm.defineScriptGlobal('valid',{value:{kind:'string',value:'a'.repeat(1000)}});realm.defineScriptGlobal('invalid',{value:{kind:'string',value:'\ud800'+'a'.repeat(1000)}});
for(const text of ['valid.isWellFormed();','valid.toWellFormed();','invalid.toWellFormed();']){const r=run(text,realm,40);check(r.type==='throw'&&r.origin.kind==='resource-limit','bounded scan');}
expect(run('invalid.isWellFormed();',realm,40),{kind:'boolean',value:false},'early predicate exit');
const legacy=new Realm((_line:string)=>{});for(const name of ['isWellFormed','toWellFormed'])check(legacy.stringPrototype.getOwnProperty(name)===undefined,'legacy unchanged');
console.log('String well-formedness passed');
