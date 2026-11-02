import { readFileSync } from "node:fs";
import { Realm, type RealmProfile } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { run } from "../src/interpreter.js";
import { observe } from "../src/observation.js";
import { resolveStrictGlobalBinding, getStrictGlobalBinding, putStrictGlobalBinding } from "../src/global-environment.js";
import { Environment, GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type Completion, type ValueCompletion, type OperationContext, type PropertyKey } from "../src/runtime.js";
import { wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
const loc = { line: 1, column: 1 };
const legacyError = "legacy Realm required", crossError = "cross-profile callable invocation", unavailable = "Script execution unavailable";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function n(value: number): Value { return { kind: "number", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function object(value: Value): GuestObject { if (value.kind !== "object") throw new Error("object expected"); return value.object; }
function value(result: Completion, expected: Value): void { check(result.type === "normal" && sameValue(result.value, expected), "completion value"); }
function error(action: () => void, message: string): void {
    let caught = false;
    try { action(); } catch (e) { if (!(e instanceof Error)) throw new Error("non Error"); check(e.message === message, "host error: " + e.message); caught = true; }
    check(caught, "missing host error: " + message);
}
function guestError(result: ValueCompletion, name: string): void {
    check(result.type === "throw" && result.diagnostic.name === name && result.diagnostic.loc.line === 1 && result.diagnostic.loc.column === 1 && result.origin.kind === "engine-diagnostic", "guest error/location");
}
function own(o: GuestObject, key: PropertyKey): Value { const d = o.getOwnProperty(key); if (d === undefined) throw new Error("missing own key"); return d.value; }
function keys(o: GuestObject, expected: PropertyKey[]): void { const actual = o.ownPropertyKeys(); check(actual.length === expected.length, "key count"); for (let i=0;i<actual.length;i++) check(actual[i] === expected[i], "key order"); }
function desc(o: GuestObject, key: PropertyKey, v: Value, w: boolean, e: boolean, c: boolean): void { const d=o.getOwnProperty(key); check(d !== undefined && sameValue(d.value,v) && d.writable===w && d.enumerable===e && d.configurable===c, "descriptor"); }
function define(o: GuestObject, key: PropertyKey, v: Value): void { o.bootstrapDefine(key,{value:v,writable:true,enumerable:true,configurable:true}); }
function seed(a: Realm, name: string, v: Value): void { a.defineScriptGlobal(name,{value:v,writable:true,enumerable:true,configurable:true}); }
function stub(realm: Realm): OperationContext { return { realm, call: (_callee,_receiver,_args,_loc): ValueCompletion => { throw new Error("unexpected call"); }, tick: (_loc): ValueCompletion => { throw new Error("unexpected tick"); } }; }
function invoke(v: Value, context: OperationContext): Completion { const f=object(v).callable; if(f===null || f.kind!=="builtin") throw new Error("builtin expected"); return f.invoke(UNDEFINED,[],context,loc); }
function log(a: Realm): Value { return own(object(a.profile === "legacy" ? a.global.bindings.get("console")!.value : own(a.globalObject,"console")),"log"); }
function restored(e: Evaluator, realm: Realm): void { check(e.context.realm===realm && e.calls===0 && e.depth===0,"restored context/counters"); }
function method(a: Realm,o: GuestObject,key: PropertyKey,name: string,length: number,w: boolean=true): void {
    const v=own(o,key), f=object(v); desc(o,key,v,w,false,true);
    check(f.getPrototypeOf()===a.functionPrototype && f.callable!==null && f.callable.realm===a,"builtin owner");
    keys(f,["name","length"]); desc(f,"name",{kind:"string",value:name},false,false,true); desc(f,"length",n(length),false,false,true);
}
function inventory(a: Realm): void {
    const c=object(own(a.globalObject,"console")), num=object(own(a.globalObject,"Number"));
    check(c.getPrototypeOf()===a.objectPrototype && c.callable===null && num.getPrototypeOf()===a.objectPrototype && num.callable===null && num!==a.numberPrototype,"namespaces");
    keys(c,["log"]); method(a,c,"log","log",0);
    const names=["NaN","POSITIVE_INFINITY","NEGATIVE_INFINITY","MAX_VALUE","MIN_VALUE","EPSILON","MAX_SAFE_INTEGER","MIN_SAFE_INTEGER"];
    const values=[NaN,Infinity,-Infinity,1.7976931348623157e308,5e-324,2.220446049250313e-16,9007199254740991,-9007199254740991];
    keys(num,[...names,"isNaN","isFinite"]); for(let i=0;i<names.length;i++) desc(num,names[i],n(values[i]),false,false,false);
    method(a,num,"isNaN","isNaN",1); method(a,num,"isFinite","isFinite",1);
    const prototypes=[a.objectPrototype,a.functionPrototype,a.arrayPrototype,a.booleanPrototype,a.numberPrototype,a.stringPrototype,a.symbolPrototype];
    const lists: PropertyKey[][]=[["valueOf","toString"],["name","length","call","toString"],["length","join","toString"],["toString","valueOf"],["toString","valueOf"],["length","toString","valueOf"],["toString","valueOf",wellKnownToPrimitive,wellKnownToStringTag]];
    for(let i=0;i<prototypes.length;i++) {
        const p=prototypes[i]; keys(p,lists[i]); check(p.getPrototypeOf()===(i===0?null:a.objectPrototype),"prototype chain");
        for(const k of lists[i]) if(typeof k==="string" && k!=="name" && k!=="length") method(a,p,k,k,k==="call"||k==="join"||(i===4&&k==="toString")?1:0);
    }
    desc(a.functionPrototype,"name",{kind:"string",value:""},false,false,true); desc(a.functionPrototype,"length",n(0),false,false,true);
    check(a.functionPrototype.callable!==null && a.functionPrototype.callable.realm===a,"inline owner");
    desc(a.arrayPrototype,"length",n(0),true,false,false); desc(a.stringPrototype,"length",n(0),false,false,false);
    method(a,a.symbolPrototype,wellKnownToPrimitive,"[Symbol.toPrimitive]",1,false); desc(a.symbolPrototype,wellKnownToStringTag,{kind:"string",value:"Symbol"},false,false,true);
    check(!a.objectPrototype.setPrototypeOf(a.createObject()).value,"immutable object root");
    check(!a.booleanPrototype.booleanData && a.numberPrototype.numberData===0 && a.stringPrototype.stringData==="","primitive slots");
    check(a.createObject().getPrototypeOf()===a.objectPrototype && a.createArray().getPrototypeOf()===a.arrayPrototype && a.createBooleanObject(true).getPrototypeOf()===a.booleanPrototype && a.createNumberObject(1).getPrototypeOf()===a.numberPrototype && a.createStringObject("a").getPrototypeOf()===a.stringPrototype && a.createSymbolObject(wellKnownToPrimitive).getPrototypeOf()===a.symbolPrototype,"factories");
}
function row(id: string,name: string,initial: number): void {
    let output="";
    let outputCalls=0;
    const a=new Realm((line:string)=>{output+=line; outputCalls++;},"script"), b=new Realm((line:string)=>{output+=line; outputCalls++;},"script");
    const x=new Realm((line:string)=>{output+=line; outputCalls++;}), y=new Realm((line:string)=>{output+=line; outputCalls++;},"legacy");
    const e=new Evaluator(x), context=stub(a), first=n(initial), next=n(initial===7?11:7);
    const globals=["undefined","NaN","Infinity","console","Number"];
    switch(id) {
    case "B01": {
        for(const l of [x,y]) { let i=0; for(const [key,binding] of l.global.bindings) { check(key===globals[i] && binding.initialized && binding.mutable===(i>=3),"legacy bindings"); if(i===0) check(binding.value.kind==="undefined","undefined"); if(i===1) check(sameValue(binding.value,n(NaN)),"NaN"); if(i===2) check(sameValue(binding.value,n(Infinity)),"Infinity"); i++; } check(i===5,"five legacy globals"); }
        const env=new Environment(null); x.global=env; check(x.global===env,"replace global");
        const r=run("let "+name+"="+initial+";",x); check(r.phase==="runtime" && r.completion.type==="normal","legacy run"); check(sameValue(x.global.bindings.get(name)!.value,first),"legacy binding");
        error(()=>{new Realm((_line:string)=>{throw new Error("output");},"bad" as RealmProfile);},"invalid Realm profile");
        error(()=>{x.installGlobal(name,first,true);},"invalid bootstrap global"); break;
    }
    case "B02": {
        keys(a.globalObject,globals); check(a.globalObject.getPrototypeOf()===a.objectPrototype && a.globalObject.callable===null && a.globalObject.isExtensible(),"global shape");
        check(object(a.globalThisValue)===a.globalObject && object(a.globalEnvironment.getThisBinding())===a.globalObject,"same this object");
        for(let i=0;i<globals.length;i++) desc(a.globalObject,globals[i],i===0?UNDEFINED:i===1?n(NaN):i===2?n(Infinity):own(a.globalObject,globals[i]),i>=3,false,i>=3);
        check(a.globalObject.getOwnProperty("globalThis")===undefined,"no globalThis property"); error(()=>{a.installGlobal(name,first,true);},"invalid bootstrap global"); break;
    }
    case "B03": inventory(a); break;
    case "B04": {
        const left=[a.objectPrototype,a.functionPrototype,a.arrayPrototype,a.booleanPrototype,a.numberPrototype,a.stringPrototype,a.symbolPrototype,a.globalObject,object(own(a.globalObject,"console")),object(own(a.globalObject,"Number")),x.objectPrototype,x.functionPrototype,x.arrayPrototype,x.booleanPrototype,x.numberPrototype,x.stringPrototype,x.symbolPrototype,object(x.global.bindings.get("console")!.value),object(x.global.bindings.get("Number")!.value)];
        const right=[b.objectPrototype,b.functionPrototype,b.arrayPrototype,b.booleanPrototype,b.numberPrototype,b.stringPrototype,b.symbolPrototype,b.globalObject,object(own(b.globalObject,"console")),object(own(b.globalObject,"Number")),y.objectPrototype,y.functionPrototype,y.arrayPrototype,y.booleanPrototype,y.numberPrototype,y.stringPrototype,y.symbolPrototype,object(y.global.bindings.get("console")!.value),object(y.global.bindings.get("Number")!.value)];
        for(let i=0;i<left.length;i++) { check(left[i]!==right[i],"fresh objects"); for(const key of left[i].ownPropertyKeys()) { const l=own(left[i],key),r=own(right[i],key); if(l.kind==="object") check(r.kind==="object" && l.object!==r.object,"fresh methods"); } }
        check(a.symbolPrototype.ownPropertyKeys()[2]===b.symbolPrototype.ownPropertyKeys()[2],"canonical symbol"); seed(a,name,first); guestError(b.readScriptGlobal(name,loc),"ReferenceError"); break;
    }
    case "B05": error(()=>{a.global;},legacyError); error(()=>{a.global=x.global;},legacyError); error(()=>{x.globalObject;},"Script Realm required"); error(()=>{x.globalEnvironment;},"Script Realm required"); error(()=>{x.globalThisValue;},"Script Realm required"); break;
    case "B06": seed(a,name,first); value(a.readScriptGlobal(name,loc),first); desc(a.globalObject,name,first,true,true,true); seed(a,name,next); value(a.readScriptGlobal(name,loc),next); a.globalObject.preventExtensions(); error(()=>{seed(a,name+"new",first);},"invalid internal property definition: "+name+"new"); check(a.globalObject.getOwnProperty(name+"new")===undefined,"no failed seed"); break;
    case "B07": { const r=resolveStrictGlobalBinding(a.globalEnvironment,name,loc); if(r.type==="throw") throw new Error("resolve"); seed(a,name,first); guestError(putStrictGlobalBinding(r.reference,next,context),"ReferenceError"); guestError(getStrictGlobalBinding(r.reference),"ReferenceError"); value(a.readScriptGlobal(name,loc),first); break; }
    case "B08": { seed(a,name,first); const r=resolveStrictGlobalBinding(a.globalEnvironment,name,loc); if(r.type==="throw") throw new Error("resolve"); value(a.globalEnvironment.createMutableBinding(name,loc),UNDEFINED); guestError(getStrictGlobalBinding(r.reference),"ReferenceError"); seed(a,name,first); guestError(a.readScriptGlobal(name,loc),"ReferenceError"); value(a.globalEnvironment.initializeBinding(name,next,context,loc),UNDEFINED); value(getStrictGlobalBinding(r.reference),next); desc(a.globalObject,name,first,true,true,true); guestError(b.readScriptGlobal(name,loc),"ReferenceError"); break; }
    case "B09": for(const source of ["let "+name+"="+initial+";","return 1;",""]) error(()=>{run(source,a);},legacyError); check(run("",x).phase==="runtime" && run("return 1;",x).phase==="parse","legacy neighbors"); break;
    case "B10": for(const source of ["let "+name+"="+initial+";","return 1;",""]) { error(()=>{observe(source,a,"body-observation","unit");},legacyError); const p=observe(source,a,"parser-observation","unit"),q=observe(source,x,"parser-observation","unit"); check(JSON.stringify(p)===JSON.stringify(q) && !p.bodyEvaluated,"neutral parser"); check(p.observation.kind===(source==="return 1;"?"syntax-error":"normal"),"literal parser result"); } for(const mode of ["parser-observation","body-observation"] as const) error(()=>{observe("return 1;",a,mode,"unit",{steps:-1,calls:0});},"observation limits must be nonnegative safe integers"); break;
    case "B11": error(()=>{new Evaluator(a);},legacyError); error(()=>{a.createGuestFunction([],[],x.global,null);},legacyError); error(()=>{a.createGuestFunction([],[],x.global,{source:{text:""},start:-1,end:0});},legacyError); a.createBuiltin("allowed",0,(_r,_a,_c,_l): Completion=>{throw new Error("callback");}); break;
    case "B12": { const foreign=log(a),saved=own(a.functionPrototype,"call"); for(const limit of [64,0]) { e.maxCalls=limit; for(const f of [foreign,saved,obj(a.functionPrototype)]) { error(()=>{e.call(f,UNDEFINED,[{kind:"string",value:"bad"}],loc);},crossError); restored(e,x); check(e.steps===0,"zero budget effects"); } } a.functionPrototype.internalDelete("call"); error(()=>{e.call(saved,UNDEFINED,[],loc);},crossError); const r=e.call(n(1),UNDEFINED,[],loc); guestError(r,"TypeError"); break; }
    case "B13": error(()=>{e.call(own(x.functionPrototype,"call"),log(a),[UNDEFINED,{kind:"string",value:"bad"}],loc);},crossError); restored(e,x); check(e.steps===0,"forwarding adds no ticks"); break;
    case "B14": for(const f of [log(a),obj(a.functionPrototype),own(a.functionPrototype,"call")]) { error(()=>{invoke(f,stub(x));},crossError); error(()=>{invoke(f,context);},unavailable); } error(()=>{invoke(log(x),context);},crossError); break;
    case "B15": for(const f of [log(x),obj(x.createGuestFunction([],[],x.global,null))]) { error(()=>{seed(a,name,f);},"cross-profile callable transfer"); check(a.globalObject.getOwnProperty(name)===undefined,"no foreign seed"); } seed(a,name,log(b)); error(()=>{invoke(own(a.globalObject,name),context);},unavailable); x.global.bindings.set(name,{value:log(a),initialized:true,mutable:true}); error(()=>{e.call(x.global.bindings.get(name)!.value,UNDEFINED,[],loc);},crossError); restored(e,x); break;
    case "B16": {
        const r=run("function f(){return this;} function g(){throw "+initial+";}",y); check(r.phase==="runtime","guest factories");
        value(e.call(y.global.bindings.get("f")!.value,first,[],loc),first); restored(e,x); check(e.steps===2,"guest receiver ticks");
        const alloc=y.createBuiltin("alloc",0,(_r,_a,c,_l)=>normal(obj(c.realm.createObject()))); const allocated=e.call(obj(alloc),UNDEFINED,[],loc); check(allocated.type==="normal" && object(allocated.value).getPrototypeOf()===y.objectPrototype,"defining allocation"); restored(e,x);
        const thrown=e.call(y.global.bindings.get("g")!.value,UNDEFINED,[],loc); check(thrown.type==="throw" && sameValue(thrown.value,first),"guest throw value"); restored(e,x); check(e.steps===4,"throw ticks");
        const abrupt=failure("Sentinel","original",loc),sentinel=new Error("sentinel");
        const guest=y.createBuiltin("abrupt",0,(_r,_a,_c,_l)=>abrupt); check(e.call(obj(guest),UNDEFINED,[],loc)===abrupt,"original abrupt identity");
        const host=y.createBuiltin("host",0,(_r,_a,_c,_l): Completion=>{throw sentinel;}); let caught=false; try { e.call(obj(host),UNDEFINED,[],loc); } catch(err) { check(err instanceof Error && err===sentinel,"host identity"); caught=true; } check(caught,"host thrown"); restored(e,x);
        const direct=y.createBuiltin("direct",0,(_r,_a,c,_l)=>normal(obj(c.realm.createObject()))); const d=invoke(obj(direct),stub(x)); check(d.type==="normal" && object(d.value).getPrototypeOf()===x.objectPrototype,"direct context preserved");
        e.maxCalls=0; const limited=e.call(obj(alloc),UNDEFINED,[],loc); check(limited.type==="throw" && limited.origin.kind==="resource-limit","legacy budget"); restored(e,x); break;
    }
    case "B17": {
        let effects=0; const foreign=log(a); const nested=x.createObject(); define(nested,name,foreign);
        const outer=y.createBuiltin("outer",0,(_r,_a,c,l)=>{effects++; return c.call(own(nested,name),UNDEFINED,[],l);}); error(()=>{e.call(obj(outer),UNDEFINED,[],loc);},crossError); restored(e,x); check(effects===1,"outer effects retained");
        const hook=x.createObject(); define(hook,wellKnownToPrimitive,foreign); error(()=>{toPrimitive(obj(hook),"number",e.context,loc);},crossError); restored(e,x); check(e.steps===1,"coercion tick retained");
        const array=x.createArray(); define(array,"0",first); error(()=>{mapObjectDefaultArray(array,foreign,UNDEFINED,e.context,loc);},crossError); restored(e,x);
        const returned=y.createBuiltin("returned",0,(_r,_a,_c,_l)=>normal(foreign)); const result=e.call(obj(returned),UNDEFINED,[],loc); if(result.type!=="normal") throw new Error("return callable"); error(()=>{e.call(result.value,UNDEFINED,[],loc);},crossError); restored(e,x); break;
    }
    case "B18": {
        const g=a.globalEnvironment;
        check(g.withBaseObject()===UNDEFINED,"identifier receiver");
        // TS-033B's literal descriptor matrix on the actual Script global.
        for(const flags of ["000:0:1","001:1:0","010:0:1","011:1:0","100:0:1","101:1:0","110:1:1","111:1:0"]) {
            const key=name+flags.slice(0,3);
            a.defineScriptGlobal(key,{value:first,writable:flags[0]==="1",enumerable:flags[1]==="1",configurable:flags[2]==="1"});
            const can=g.canDeclareGlobalFunction(key), restricted=g.hasRestrictedGlobalProperty(key);
            check(can.type==="normal" && can.value===(flags[4]==="1"),"function admission");
            check(restricted.type==="normal" && restricted.value===(flags[6]==="1"),"restricted admission");
            value(g.createGlobalVarBinding(key,context,loc),UNDEFINED);
            desc(a.globalObject,key,first,flags[0]==="1",flags[1]==="1",flags[2]==="1");
            if(flags[4]==="1") {
                value(g.createGlobalFunctionBinding(key,next,context,loc),UNDEFINED);
                desc(a.globalObject,key,next,true,true,false);
            }
        }
        define(a.objectPrototype,name+"inherited",first);
        value(g.getBindingValue(name+"inherited",loc),first);
        value(g.setMutableBinding(name+"inherited",next,context,loc),UNDEFINED);
        desc(a.globalObject,name+"inherited",next,true,true,true);
        desc(a.objectPrototype,name+"inherited",first,true,true,true);
        seed(a,name+"deleted",first);
        const captured=resolveStrictGlobalBinding(g,name+"deleted",loc);
        if(captured.type==="throw") throw new Error("capture");
        a.globalObject.internalDelete(name+"deleted");
        guestError(getStrictGlobalBinding(captured.reference),"ReferenceError");
        guestError(putStrictGlobalBinding(captured.reference,next,context),"ReferenceError");
        value(g.createMutableBinding(name,loc),UNDEFINED); guestError(g.getBindingValue(name,loc),"ReferenceError"); guestError(g.createMutableBinding(name,loc),"TypeError"); value(g.initializeBinding(name,first,context,loc),UNDEFINED); error(()=>{g.initializeBinding(name,next,context,loc);},"binding already initialized: "+name); value(g.setMutableBinding(name,next,context,loc),UNDEFINED); value(g.getBindingValue(name,loc),next);
        guestError(g.setMutableBinding(name+"missing",first,context,loc),"ReferenceError"); value(g.createGlobalVarBinding(name+"var",context,loc),UNDEFINED); desc(a.globalObject,name+"var",UNDEFINED,true,true,false);
        value(g.createGlobalFunctionBinding(name+"fn",first,context,loc),UNDEFINED); desc(a.globalObject,name+"fn",first,true,true,false);
        guestError(g.setMutableBinding("undefined",first,context,loc),"TypeError"); check(g.hasRestrictedGlobalProperty("undefined").type==="normal","restricted");
        a.globalObject.preventExtensions(); value(g.createGlobalVarBinding(name+"absent",context,loc),UNDEFINED); check(a.globalObject.getOwnProperty(name+"absent")===undefined,"nonextensible var"); guestError(g.createGlobalFunctionBinding(name+"absent",first,context,loc),"TypeError"); break;
    }
    default: throw new Error("unknown row");
    }
    check(output==="" && outputCalls===0,"no output"); console.log(id+" PASS");
}
for(const line of readFileSync(process.argv[2],"utf8").trim().split("\n")) { const fields=line.trim().split("|"); check(fields.length===3 && (fields[1]==="seed"||fields[1]==="other") && (fields[2]==="7"||fields[2]==="11"),"fixture"); row(fields[0],fields[1],Number(fields[2])); }

