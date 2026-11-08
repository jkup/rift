import { scriptGlobalKeys, objectConstructorKeys } from "./current-builtin-inventory.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { GuestObject, GuestError, UNDEFINED, normal, sameValue, unsupportedFailure, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext, type Builtin, type ConstructBuiltin, type PropertyKey } from "../src/runtime.js";
import { GuestBoolean, GuestNumber, GuestStringObject, GuestSymbolObject } from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownSpecies, wellKnownIterator } from "../src/symbols.js";
import { prepareBoundedScript, type ExecutableScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import type { Location } from "../src/syntax.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
function check(ok:boolean,label:string):void {if(!ok)throw new Error(label);}
function obj(object:GuestObject):Value{return {kind:"object",object};}
function num(value:number):Value{return {kind:"number",value};}
function str(value:string):Value{return {kind:"string",value};}
const loc:Location={line:1,column:1};
function fresh():Realm{return new Realm((_line:string)=>{throw new Error("output");},"script");}
function define(r:Realm,k:string,v:Value):void{r.defineScriptGlobal(k,{value:v,writable:true,configurable:true});}
function data(o:GuestObject,k:PropertyKey,v:Value):void{o.bootstrapDefine(k,{value:v,writable:true,configurable:true});}
function own(o:GuestObject,k:PropertyKey):Value{const d=o.getOwnProperty(k);if(d===undefined||d.kind!=="data")throw new Error("own data");return d.value;}
function object(v:Value):GuestObject{if(v.kind!=="object")throw new Error("object");return v.object;}
function value(v:ValueCompletion):Value{if(v.type!=="normal")throw new Error("normal "+v.diagnostic.message);return v.value;}
function prepare(text:string,r:Realm,id:string):ExecutableScript{const p=prepareBoundedScript({id,text},r);if(p.kind!=="ready")throw new Error("prepare "+text);return p.record;}
function idle(s:ScriptSession):void{const v=s.inspect();check(v.active===null&&v.calls===0&&v.depth===0,"idle");}
function run(text:string,r:Realm,s:ScriptSession=createScriptSession(),id:string=inputId):ValueCompletion{const v=evaluateScript(s,prepare(text,r,id));idle(s);return v.completion;}
function seed(s:ScriptSession,r:Realm,n:number):void{if(n){run(";;;;;;;",r,s,"seed");check(s.inspect().steps===7,"seed");}}
function error(v:ValueCompletion,r:Realm):void{check(v.type==="throw"&&v.origin.kind==="engine-diagnostic"&&v.diagnostic.name==="TypeError"&&v.value.kind==="object"&&v.value.object instanceof GuestError&&v.value.object.getPrototypeOf()===r.getErrorPrototype("TypeError"),"genuine TypeError Realm");}
function keys(o:GuestObject,expected:PropertyKey[]):void{const got=o.ownPropertyKeys();check(got.length===expected.length&&got.every((k,i)=>k===expected[i]),"exact keys");}
function descriptor(o:GuestObject,k:string,v:Value,w:boolean,e:boolean,c:boolean):void{const d=o.getOwnProperty(k);check(d!==undefined&&d.kind==="data"&&sameValue(d.value,v)&&d.writable===w&&d.enumerable===e&&d.configurable===c,"descriptor "+k);}
function box(v:ValueCompletion,r:Realm,text:string):GuestStringObject{const o=object(value(v));check(o instanceof GuestStringObject&&o.stringData===text&&o.getPrototypeOf()===r.stringPrototype,"StringData/prototype");if(!(o instanceof GuestStringObject))throw new Error("box");return o;}
function hostFault(f:()=>void):void{let caught=false;try{f();}catch(e){if(!(e instanceof Error))throw e;caught=true;}check(caught,"host denial");}
function callSlot(o:GuestObject):Builtin{const c=o.callable;if(c===null||c.kind!=="builtin")throw new Error("call slot");return c.invoke;}
function constructSlot(o:GuestObject):ConstructBuiltin{const c=o.constructorSlot;if(c===null||c.kind!=="builtin-constructor")throw new Error("construct slot");return c.invoke;}
const input=readFileSync(process.argv[2],"utf8");check(input==="String(7);\n"||input==="String(11);\n","runtime input");
const numeric=input==="String(7);\n"?7:11,payload=numeric===7?"seven":"eleven",inputId=numeric===7?"input-a":"input-b";
type Trace={id:string;source:string;columns:number[];effects:string[];sourceTicks:number;calls:number;terminal:string};
const traces:Trace[]=[
  {
    "id": "T13",
    "source": "String(m);\n",
    "columns": [
      1,
      1,
      8,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "M"
    ],
    "sourceTicks": 3,
    "calls": 2,
    "terminal": "normal"
  },
  {
    "id": "T14",
    "source": "new String(m);\n",
    "columns": [
      1,
      1,
      5,
      12,
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "",
      "M",
      ""
    ],
    "sourceTicks": 4,
    "calls": 2,
    "terminal": "normal"
  },
  {
    "id": "T15",
    "source": "Object(o);\n",
    "columns": [
      1,
      1,
      8
    ],
    "effects": [
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "T16",
    "source": "new Object(o);\n",
    "columns": [
      1,
      1,
      5,
      12
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "T17",
    "source": "Object();\n",
    "columns": [
      1,
      1,
      1
    ],
    "effects": [
      "",
      "",
      ""
    ],
    "sourceTicks": 2,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "T18",
    "source": "new Object();\n",
    "columns": [
      1,
      1,
      5,
      1
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "C01",
    "source": "String(7);\n",
    "columns": [
      1,
      1,
      8
    ],
    "effects": [
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "C02",
    "source": "new String(7);\n",
    "columns": [
      1,
      1,
      5,
      12,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "C03",
    "source": "String(s);\n",
    "columns": [
      1,
      1,
      8
    ],
    "effects": [
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "C04",
    "source": "new String(s);\n",
    "columns": [
      1,
      1,
      5,
      12
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4,
    "calls": 1,
    "terminal": "engine TypeError"
  },
  {
    "id": "C05",
    "source": "String(m);\n",
    "columns": [
      1,
      1,
      8,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "M"
    ],
    "sourceTicks": 3,
    "calls": 2,
    "terminal": "engine TypeError"
  },
  {
    "id": "C06",
    "source": "new String(m);\n",
    "columns": [
      1,
      1,
      5,
      12,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      "M"
    ],
    "sourceTicks": 4,
    "calls": 2,
    "terminal": "engine TypeError"
  },
  {
    "id": "C07",
    "source": "String(w);\n",
    "columns": [
      1,
      1,
      8,
      1
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 2,
    "terminal": "engine TypeError"
  },
  {
    "id": "C08",
    "source": "new String(w);\n",
    "columns": [
      1,
      1,
      5,
      12,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4,
    "calls": 2,
    "terminal": "engine TypeError"
  },
  {
    "id": "C09",
    "source": "Object(p);\n",
    "columns": [
      1,
      1,
      8,
      1
    ],
    "effects": [
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 3,
    "calls": 1,
    "terminal": "normal"
  },
  {
    "id": "C10",
    "source": "new Object(p);\n",
    "columns": [
      1,
      1,
      5,
      12,
      1
    ],
    "effects": [
      "",
      "",
      "",
      "",
      ""
    ],
    "sourceTicks": 4,
    "calls": 1,
    "terminal": "normal"
  }
];
function fixture(t:Trace,cross:boolean,parsed:boolean=false,throwing:boolean=false,stop:number=0){
 const a=fresh(),b=cross?fresh():a,h=cross?fresh():a,m=b.createObject(),o=b.createObject(),symbol:Value={kind:"symbol",value:new GuestSymbol("x")};let effects="";
 const sentinel=new Error("host sentinel"),q:ThrowCompletion={type:"throw",value:stop===1?num(7):obj(h.createError("Error","foreign")),diagnostic:{phase:"runtime",name:"Uncaught",message:"exact",loc},origin:{kind:"guest"}},unsupported=unsupportedFailure("runtime.object-to-string","TypeError","exact unsupported",loc);
 const protocol=t.id==="C05"||t.id==="C06";
 const method=h.createBuiltin("method",0,(receiver,args,c,l):ValueCompletion=>{
  check(c.realm===h&&receiver.kind==="object"&&receiver.object===m&&l.line===1&&l.column===1,"method Realm/receiver/location");
  check(protocol?args.length===1&&sameValue(args[0],str("string")):args.length===0,"conversion hint/arguments");effects+="M";
  if(stop===4)throw sentinel;if(stop===3)return unsupported;if(stop!==0)return q;
  return normal(protocol?symbol:str(payload));
 });
 data(m,protocol?wellKnownToPrimitive:"toString",obj(method));
 if(parsed){define(h,"method",obj(method));define(h,"marker",q.value);run(throwing?"function g(){throw marker;}":"function g(){return method;}",h,createScriptSession(),"getter");m.bootstrapDefine("toString",{get:own(h.globalObject,"g"),configurable:true});}
 define(b,"String",own(a.globalObject,"String"));define(b,"Object",own(a.globalObject,"Object"));define(b,"m",obj(m));define(b,"o",obj(o));define(b,"s",symbol);define(b,"w",obj(h.createSymbolObject(symbol.kind==="symbol"?symbol.value:new GuestSymbol("bad"))));define(b,"p",num(numeric));
 return {a,b,h,m,o,symbol,sentinel,q,unsupported,method,effects:()=>effects};
}
function terminal(t:Trace,v:ValueCompletion,f:ReturnType<typeof fixture>):void{
 if(t.terminal!=="normal"){error(v,f.a);return;}
 if(t.id==="T13")check(sameValue(value(v),str(payload)),"T13 value");
 else if(t.id==="T14")box(v,f.a,payload);
 else if(t.id==="T15"||t.id==="T16")check(sameValue(value(v),obj(f.o)),"Object exact identity");
 else if(t.id==="T17"||t.id==="T18"){const o=object(value(v));check(o!==f.o&&o.getPrototypeOf()===f.a.objectPrototype,"fresh Object Realm");keys(o,[]);}
 else if(t.id==="C01")check(sameValue(value(v),str(String(numeric))),"runtime String value");
 else if(t.id==="C02")box(v,f.a,String(numeric));
 else if(t.id==="C03")check(sameValue(value(v),str("Symbol(x)")),"direct Symbol");
 else if(t.id==="C09"||t.id==="C10"){const o=object(value(v));check(o instanceof GuestNumber&&o.numberData===numeric&&o.getPrototypeOf()===f.a.numberPrototype,"Number box");}
 else throw new Error("terminal "+t.id);
}
let prefixes=0,callControls=0,abruptControls=0;
for(const t of traces)for(const cross of [false,true])for(const start of [0,7])for(const callMode of [false,true])for(let k=0;k<=(callMode?2:t.columns.length+1);k++){
 const f=fixture(t,cross),s=createScriptSession(callMode?{maxCalls:k,maxSteps:100000}:{maxSteps:start+k,maxCalls:64});seed(s,f.b,start);
 const source=t.id==="C01"?input:t.id==="C02"?"new String("+numeric+");":t.source;
 const v=run(source,f.b,s),n=t.columns.length,failed=callMode?k<t.calls:k<n;
 let ticks=n,fx=t.effects.join(""),column=1,realm=f.a;
 if(callMode&&failed){ticks=k===0?t.sourceTicks:t.effects.indexOf("M")>=0?t.effects.indexOf("M")+1:n;fx="";realm=k===0?f.b:f.a;}
 if(!callMode){ticks=Math.min(k+1,n);fx=t.effects.slice(0,Math.min(k,n)).join("");if(failed){column=t.columns[k];realm=k<t.sourceTicks?f.b:f.a;}}
 const label=t.id+" "+cross+" "+start+" calls="+callMode+" k="+k;
 check(s.inspect().steps===start+ticks,label+" ticks "+s.inspect().steps+" expected "+(start+ticks));check(f.effects()===fx,label+" effects");
 if(failed){check(v.type==="throw"&&v.origin.kind==="resource-limit"&&v.origin.guardCode===(callMode?"calls":"steps")&&v.origin.count===(callMode?k:start+k+1)&&v.origin.limit===(callMode?k:start+k),label+" resource");}
 else terminal(t,v,f);
 if(v.type==="throw"){const p=s.inspect().lastAbrupt;check(p!==null&&p.realm===realm&&p.unitId===inputId&&p.loc.line===1&&p.loc.column===column,label+" provenance");}
 if(callMode)callControls++;else prefixes++;
}
for(const t of traces)if(t.effects.includes("M"))for(const cross of [false,true])for(const start of [0,7])for(const mode of [1,2,3,4])for(let k=0;k<=t.columns.length+1;k++){
 const f=fixture(t,cross,false,false,mode),s=createScriptSession({maxSteps:start+k,maxCalls:64});seed(s,f.b,start);let v:ValueCompletion=normal(),host=false;
 try{v=run(t.source,f.b,s);}catch(e){if(!(e instanceof Error)||e!==f.sentinel)throw e;host=true;}idle(s);
 const at=t.effects.indexOf("M")+1,reached=k>=at;check(s.inspect().steps===start+(reached?at:k+1),"abrupt exact ticks");check(f.effects()===(reached?"M":""),"abrupt cutoff");
 if(reached){check(host===(mode===4),"host classification");if(!host){check(v===(mode===3?f.unsupported:f.q),"exact abrupt completion");check(s.inspect().lastAbrupt?.realm===f.h&&s.inspect().lastAbrupt?.unitId===inputId,"hook provenance");}}
 else check(!host&&v.type==="throw"&&v.origin.kind==="resource-limit","earlier resource");abruptControls++;
}
console.log("PASS host schedules prefixes="+prefixes+" calls="+callControls+" abrupt="+abruptControls);
// Parsed accessor schedules are literal CP2 tables, including nonstrict setup.
type Parsed={construct:boolean;throwing:boolean;columns:number[];sourceTicks:number;getterStart:number};
const parsed:Parsed[]=[
 {construct:false,throwing:false,columns:[1,1,8,1,1,1,1,14,21],sourceTicks:3,getterStart:5},
 {construct:false,throwing:true,columns:[1,1,8,1,1,1,1,14,20],sourceTicks:3,getterStart:5},
 {construct:true,throwing:false,columns:[1,1,5,12,1,1,1,1,14,21,1],sourceTicks:4,getterStart:6},
 {construct:true,throwing:true,columns:[1,1,5,12,1,1,1,1,14,20],sourceTicks:4,getterStart:6}
];
let parsedPrefixes=0,parsedCalls=0,parsedAbrupt=0;
for(const t of parsed)for(const cross of [false,true])for(const start of [0,7])for(const callMode of [false,true])for(let k=0;k<=(callMode?3:t.columns.length+1);k++){
 const base=traces[t.construct?1:0],f=fixture(base,cross,true,t.throwing),s=createScriptSession(callMode?{maxCalls:k,maxSteps:100000}:{maxSteps:start+k,maxCalls:64});seed(s,f.b,start);
 const v=run(t.construct?"new String(m);":"String(m);",f.b,s),n=t.columns.length,failed=callMode?k<2:k<n;
 const ticks=callMode?(k===0?t.sourceTicks:k===1?t.getterStart:n):Math.min(k+1,n),method=!t.throwing&&(callMode?k>=2:k>=t.getterStart+4);
 const label="parsed "+t.construct+" "+t.throwing+" "+cross+" "+start+" "+callMode+" "+k;
 check(s.inspect().steps===start+ticks,label+" ticks");check(f.effects()===(method?"M":""),label+" effects");
 if(failed)check(v.type==="throw"&&v.origin.kind==="resource-limit"&&v.origin.guardCode===(callMode?"calls":"steps")&&v.origin.count===(callMode?k:start+k+1)&&v.origin.limit===(callMode?k:start+k),label+" resource");
 else if(t.throwing)check(v.type==="throw"&&v.origin.kind==="guest"&&sameValue(v.value,f.q.value),label+" exact guest marker");
 else if(t.construct)box(v,f.a,payload);else check(sameValue(value(v),str(payload)),label+" string");
 if(v.type==="throw"){
  const inGetter=!callMode&&failed&&k>=t.getterStart&&k<t.getterStart+4;
  const realm=failed?(callMode?(k===0?f.b:f.a):k<t.sourceTicks?f.b:inGetter?f.h:f.a):f.h;
  const source=inGetter||!failed?"getter":inputId,column=failed?(callMode?1:t.columns[k]):14,p=s.inspect().lastAbrupt;
  check(p!==null&&p.realm===realm&&p.unitId===source&&p.loc.column===column,label+" provenance");
 }
 if(callMode)parsedCalls++;else parsedPrefixes++;
}
for(const t of parsed)if(!t.throwing)for(const cross of [false,true])for(const start of [0,7])for(const mode of [1,2,3,4])for(let k=0;k<=t.columns.length+1;k++){
 const f=fixture(traces[t.construct?1:0],cross,true,false,mode),s=createScriptSession({maxSteps:start+k,maxCalls:64});seed(s,f.b,start);let v:ValueCompletion=normal(),host=false;
 try{v=run(t.construct?"new String(m);":"String(m);",f.b,s);}catch(e){if(!(e instanceof Error)||e!==f.sentinel)throw e;host=true;}idle(s);
 const at=t.getterStart+4,reached=k>=at;check(s.inspect().steps===start+(reached?at:k+1)&&f.effects()===(reached?"M":""),"parsed abrupt cutoff");
 if(reached){check(host===(mode===4),"parsed host");if(!host)check(v===(mode===3?f.unsupported:f.q)&&s.inspect().lastAbrupt?.realm===f.h&&s.inspect().lastAbrupt?.unitId===inputId,"parsed exact abrupt/source");}
 else check(!host&&v.type==="throw"&&v.origin.kind==="resource-limit","parsed lower prefix");parsedAbrupt++;
}
console.log("PASS parsed prefixes="+parsedPrefixes+" calls="+parsedCalls+" abrupt="+parsedAbrupt);
// F01-F12: fixed semantic rows are executed for every runtime input.
for(const cross of [false,true]){
 const a=fresh(),b=cross?fresh():a,symbol:Value={kind:"symbol",value:new GuestSymbol("x")};define(b,"String",own(a.globalObject,"String"));define(b,"Object",own(a.globalObject,"Object"));define(b,"s",symbol);
 for(const pair of [["String();",""],["String(undefined);","undefined"],["String(null);","null"],["String(-0);","0"],["String(true);","true"],["String(NaN);","NaN"],["String(Infinity);","Infinity"]])check(sameValue(value(run(pair[0],b)),str(pair[1])),"F01 primitives");
 check(sameValue(value(run("String(s);",b)),str("Symbol(x)")),"F02 direct");error(run("new String(s);",b),a);
 for(const symbolValue of [new GuestSymbol(undefined),new GuestSymbol(""),new GuestSymbol("\ud800")]){define(b,"s",{kind:"symbol",value:symbolValue});check(sameValue(value(run("String(s);",b)),str("Symbol("+(symbolValue.description===undefined?"":symbolValue.description)+")")),"Symbol descriptive UTF16");}define(b,"s",symbol);
 const bs=box(run("new String('ab');",b),a,"ab");keys(bs,["0","1","length"]);descriptor(bs,"0",str("a"),false,true,false);descriptor(bs,"1",str("b"),false,true,false);descriptor(bs,"length",num(2),false,false,false);
 for(const text of ["","\ud800","\ud83d\ude00","a\u0000b"]){define(b,"text",str(text));const o=box(run("new String(text);",b),a,text);descriptor(o,"length",num(text.length),false,false,false);for(let i=0;i<text.length;i++)descriptor(o,String(i),str(text.charAt(i)),false,true,false);}
 box(run("new String();",b),a,"");box(run("new String(undefined);",b),a,"undefined");
 const allocated:GuestObject[]=[];
 for(const expression of ["Object();","Object(null);","Object(undefined);","new Object();","new Object(null);","new Object(undefined);"]){const o=object(value(run(expression,b)));check(o.getPrototypeOf()===a.objectPrototype&&!allocated.includes(o),"F06 distinct defining Realm");keys(o,[]);allocated.push(o);}
 class Poison extends GuestObject{internalGet(_k:PropertyKey,_r:Value,_c:OperationContext,_l:Location):ValueCompletion{throw new Error("identity path Get");}}
 const q=new Poison(b.objectPrototype),qv=obj(q);define(b,"q",qv);for(const expression of ["Object(q);","new Object(q);"]){const s=createScriptSession();check(value(run(expression,b,s))===qv&&q.getPrototypeOf()===b.objectPrototype,"F07 exact Value/object/prototype");check(s.inspect().steps===(expression.startsWith("new")?4:3),"identity no tick");}
 for(const constructing of [false,true])for(let i=0;i<4;i++){
  const values:Value[]=[num(7),{kind:"boolean",value:false},str("a"),symbol];define(b,"v",values[i]);const o=object(value(run((constructing?"new ":"")+"Object(v);",b)));
  if(i===0)check(o instanceof GuestNumber&&o.numberData===7&&o.getPrototypeOf()===a.numberPrototype,"F08 Number7");
  if(i===1)check(o instanceof GuestBoolean&&!o.booleanData&&o.getPrototypeOf()===a.booleanPrototype,"F08 Boolean");
  if(i===2)check(o instanceof GuestStringObject&&o.stringData==="a"&&o.getPrototypeOf()===a.stringPrototype,"F08 String");
  if(i===3)check(o instanceof GuestSymbolObject&&symbol.kind==="symbol"&&o.symbolData===symbol.value&&o.getPrototypeOf()===a.symbolPrototype,"F08 Symbol identity");
 }
 check(sameValue(value(run("Object.prototype.toString.call({});",b)),str("[object Object]")),"F11 fallback");const thrown=run("String({toString:function(){throw 7;}});",b);check(thrown.type==="throw"&&thrown.origin.kind==="guest"&&sameValue(thrown.value,num(7)),"F11 exact guest seven");
 check(sameValue(value(run(input,b)),str(String(numeric))),"F12 runtime input");box(run("new String("+numeric+");",b),a,String(numeric));
 const m=b.createObject();let effects="";data(m,wellKnownToPrimitive,obj(b.createBuiltin("convert",1,(receiver,args,c,_l)=>{check(receiver.kind==="object"&&receiver.object===m&&args.length===1&&sameValue(args[0],str("string"))&&c.realm===b,"F05 protocol");effects+="M";return normal(str(payload));})));define(b,"m",obj(m));check(sameValue(value(run("String(m);",b)),str(payload)),"F05 call");box(run("new String(m);",b),a,payload);check(effects==="MM","F05 once per operation");
}
for(const r of [fresh(),fresh()]){
 keys(r.globalObject,scriptGlobalKeys);
 keys(r.stringPrototype,["length","toString","valueOf","trim","trimStart","trimEnd","toLowerCase","toUpperCase","concat","lastIndexOf","indexOf","charAt","charCodeAt","slice","split","constructor","includes","startsWith","endsWith",wellKnownIterator]);keys(r.objectPrototype,["valueOf","toString","constructor","hasOwnProperty","propertyIsEnumerable","isPrototypeOf"]);
 for(const name of ["String","Object"]){const cv=own(r.globalObject,name),ctor=object(cv),proto=name==="String"?r.stringPrototype:r.objectPrototype;
  descriptor(r.globalObject,name,cv,true,false,true);descriptor(ctor,"name",str(name),false,false,true);descriptor(ctor,"length",num(1),false,false,true);descriptor(ctor,"prototype",obj(proto),false,false,false);descriptor(proto,"constructor",cv,true,false,true);keys(ctor,name==="Object"?objectConstructorKeys():["name","length","prototype"]);check(ctor.getPrototypeOf()===r.functionPrototype,"F10 Function link");
  const c=ctor.callable,k=ctor.constructorSlot;check(c!==null&&c.kind==="builtin"&&c.realm===r&&k!==null&&k.kind==="builtin-constructor"&&k.realm===r&&k.callable===c,"F10 exact guard graph");
  data(ctor,"name",str("changed"));check(sameValue(value(run(name+".toString();",r)),str("function "+name+"() { [native code] }")),"initial native name");
 }
 check(object(own(r.globalObject,"Number")).callable!==null&&object(own(r.globalObject,"Number")).constructorSlot!==null&&object(own(r.numberPrototype,"constructor"))===object(own(r.globalObject,"Number")),"Number constructor");
}
{
 const legacy=new Realm((_line:string)=>{});check([...legacy.global.bindings.keys()].join(",")==="undefined,NaN,Infinity,console,Number","legacy whitelist");keys(legacy.stringPrototype,["length","toString","valueOf","indexOf","charAt","charCodeAt","slice"]);keys(legacy.objectPrototype,["valueOf","toString"]);
 const a=fresh(),b=fresh();for(const name of ["String","Object"]){check(!sameValue(own(a.globalObject,name),own(b.globalObject,name)),"distinct Realm constructors");}
}
console.log("PASS F01-F12 semantics metadata UTF16 legacy cross-Realm");
// An explicit Object constructor keeps canonical species observable on its chain.
for(const where of ["own","function","object"])for(let mode=0;mode<5;mode++){
 const r=fresh(),ctor=object(own(r.globalObject,"Object")),a=r.createArray(),marker=obj(r.createError("Error","marker"));let getters=0,callbacks=0;
 data(a,"constructor",obj(ctor));
 check(sameValue(a.get("constructor",{realm:r,call:(_f,_r,_a,_l):ValueCompletion=>{throw new Error("unexpected call");},tick:(_l)=>normal()},loc),obj(ctor)),"actual C explicit Object");
 const target=where==="own"?ctor:where==="function"?r.functionPrototype:r.objectPrototype;
 const poison=r.createBuiltin("species",0,(receiver,_args,c,_l):ValueCompletion=>{getters++;check(sameValue(receiver,obj(ctor))&&c.realm===r,"actual species receiver");return {type:"throw",value:marker,diagnostic:{phase:"runtime",name:"Uncaught",message:"marker",loc},origin:{kind:"guest"}};});
 if(mode===4)target.bootstrapDefine(wellKnownSpecies,{get:obj(poison),configurable:true});else data(target,wellKnownSpecies,mode===0?UNDEFINED:mode===1?{kind:"null"}:mode===2?num(7):obj(r.getErrorConstructor("Error")));
 data(target,"Symbol.species",num(7));data(target,new GuestSymbol("Symbol.species"),num(7));
 const cb=r.createBuiltin("callback",3,(_r,_args,_c,_l)=>{callbacks++;return normal();});define(r,"probe",obj(r.createBuiltin("probe",0,(_r,_args,c,l)=>mapObjectDefaultArray(a,obj(cb),UNDEFINED,c,l))));
 const v=run("probe();",r);check(callbacks===0&&getters===(mode===4?1:0),"empty no callback exact getters");
 if(mode<2)check(object(value(v)).getPrototypeOf()===r.arrayPrototype,"actual default");else if(mode===2)error(v,r);else if(mode===3)check(v.type==="throw"&&v.origin.kind==="unsupported-operation"&&v.origin.capabilityCode==="runtime.map-species","actual custom unsupported");else check(v.type==="throw"&&sameValue(v.value,marker),"actual poison exact");
}
console.log("PASS actual C Object-link species controls=15");
// Reentrant construction retains the original owners and checks finally on host unwind.
let reentries=0;
for(const constructing of [false,true])for(const mode of [0,1,2,3,4,5,6]){
 const a=fresh(),b=fresh(),h=fresh(),outer=createScriptSession(),inner=createScriptSession({maxSteps:mode===5?0:100000,maxCalls:mode===6?0:64}),sentinel=new Error("inner host"),marker=obj(h.createError("Error","inner"));let restored=0,innerCalls=0;
 let retained:OperationContext|null=null;
 const ctor=object(own(a.globalObject,"String")),objectCtor=object(own(a.globalObject,"Object")),m=a.createObject();
 const deny=(c:OperationContext):void=>{for(const k of [ctor,objectCtor]){hostFault(()=>{callSlot(k)(UNDEFINED,[],c,loc);});hostFault(()=>{constructSlot(k)(k,[],c,loc);});}};
 define(b,"String",obj(ctor));define(b,"m",obj(m));
 define(h,"inner",obj(h.createBuiltin("inner",0,(_r,_args,c,l):ValueCompletion=>{innerCalls++;deny(c);if(mode===4)throw sentinel;if(mode===3)return unsupportedFailure("runtime.object-to-string","TypeError","inner",l);if(mode===1||mode===2)return {type:"throw",value:mode===1?num(7):marker,diagnostic:{phase:"runtime",name:"Uncaught",message:"inner",loc:l},origin:{kind:"guest"}};return normal(str(payload));})));
 const hook=h.createBuiltin("method",0,(_r,_args,c,_l):ValueCompletion=>{
  retained=c;const before=outer.inspect();check(before.steps===(constructing?6:5)&&before.active?.realm===h&&before.calls===2&&before.depth===2,"outer checkpoint");
  try{return run("inner();",h,inner,"inner");}
  finally{
   const after=outer.inspect(),x=before.active,y=after.active;if(x===null||y===null)throw new Error("frame");
   check(y.record===x.record&&y.realm===x.realm&&y.scopeId===x.scopeId&&y.lexical===x.lexical&&y.variable===x.variable&&y.function===x.function&&y.strict===x.strict&&sameValue(y.thisValue,x.thisValue)&&y.privateEnvironment===x.privateEnvironment&&y.phase===x.phase,"complete finally frame");
   check(after.steps===before.steps&&after.calls===before.calls&&after.depth===before.depth&&c.realm===h,"finally state");idle(inner);deny(c);check(outer.inspect().steps===before.steps&&innerCalls===(mode===5||mode===6?0:1),"finally denial effects");restored++;
  }
 });data(m,"toString",obj(hook));
 let v:ValueCompletion=normal(),host=false;try{v=run(constructing?"new String(m);":"String(m);",b,outer);}catch(e){if(!(e instanceof Error)||e!==sentinel)throw e;host=true;}
 check(host===(mode===4)&&restored===1,"every finally");idle(outer);idle(inner);
 if(mode===0){if(constructing)box(v,a,payload);else check(sameValue(value(v),str(payload)),"reentry return");}
 else if(mode===1||mode===2)check(v.type==="throw"&&sameValue(v.value,mode===1?num(7):marker),"inner exact value");
 else if(mode===3)check(v.type==="throw"&&v.origin.kind==="unsupported-operation","unsupported bypass");
 else if(mode===5||mode===6)check(v.type==="throw"&&v.origin.kind==="resource-limit"&&v.origin.guardCode===(mode===5?"steps":"calls"),"inner immutable resource");
 check(outer.inspect().steps===(constructing?(mode===0?7:6):5)&&inner.inspect().steps===(mode===5?1:2),"literal owner steps");
 const retainedContext:OperationContext|null=retained;if(retainedContext===null)throw new Error("retained");deny(retainedContext);
 for(const owner of [{r:b,s:outer,exhausted:0},{r:h,s:inner,exhausted:mode===5?1:mode===6?2:0}]){
  const before=owner.s.inspect().steps;const result=run("String(7);",owner.r,owner.s,"reuse");
  if(owner.exhausted===0){check(sameValue(value(result),str("7"))&&owner.s.inspect().steps===before+3,"BOTH original owners String reuse +3");
   define(owner.r,"resume",obj(owner.r.createBuiltin("resume",1,(_r,args,c,_l)=>{const snap=owner.s.inspect();check(snap.active?.realm===owner.r&&snap.calls===1&&snap.depth===2,"live reuse frame");deny(c);deny(retainedContext);return normal(args[0]);})));
   check(sameValue(value(run("resume(7);",owner.r,owner.s,"reuse-live")),num(7))&&owner.s.inspect().steps===before+6,"live original owner raw denial");
  }else{check(result.type==="throw"&&result.origin.kind==="resource-limit"&&result.origin.guardCode===(owner.exhausted===1?"steps":"calls")&&owner.s.inspect().steps===before+(owner.exhausted===1?1:3),"exhausted original owner unchanged limit");}
  idle(owner.s);const end=owner.s.inspect().steps;deny(retainedContext);check(owner.s.inspect().steps===end,"idle denial no effects");
 }
 reentries++;
}
console.log("PASS separate-session reentries="+reentries+" finally BOTH original reuse raw denials");
// C constructors use the unchanged tagged B authority; copied slots cannot Get.
for(const name of ["String","Object"]){
 const a=fresh(),b=fresh(),legacy=new Realm((_line:string)=>{}),ctor=object(own(a.globalObject,name));let gets=0,ticks=0;
 for(const r of [a,b,legacy]){const c:OperationContext={realm:r,call:(_f,_r,_args,_l):ValueCompletion=>{throw new Error("unexpected call");},tick:(_l)=>{ticks++;return normal();}};hostFault(()=>{callSlot(ctor)(UNDEFINED,[],c,loc);});hostFault(()=>{constructSlot(ctor)(ctor,[],c,loc);});}
 const shell=new GuestObject(a.functionPrototype,false,ctor.callable,ctor.constructorSlot);shell.bootstrapDefine("prototype",{get:obj(a.createBuiltin("poison",0,(_r,_args,_c,_l)=>{gets++;return normal();})),configurable:true});define(a,"K",obj(shell));const s=createScriptSession();hostFault(()=>{run("new K();",a,s);});idle(s);check(s.inspect().steps===3&&gets===0&&ticks===0,"copied slot denial before Get/effects");
 const other=object(own(a.globalObject,name==="String"?"Object":"String"));define(a,"K",obj(new GuestObject(a.functionPrototype,false,other.callable,ctor.constructorSlot)));hostFault(()=>{run("new K();",a);});check(gets===0&&ticks===0,"mismatched constructor/callable");
}
console.log("PASS C guard negatives; immutable prototype order remains source-reviewed");
console.log("PASS runtime "+inputId+" "+numeric+" "+payload);
