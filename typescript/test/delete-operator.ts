import { readFileSync } from "node:fs";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { deleteReference } from "../src/delete-reference.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type Completion, type ValueCompletion, type InternalBooleanCompletion, type PropertyKey, type Builtin, type ThrowCompletion } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { GuestNumber } from "../src/primitive-objects.js";
import type { Location, Stmt } from "../src/syntax.js";

class MeasuredEvaluator extends Evaluator {
    peakDepth = 0;
    guestInvocations = 0;
    evaluate(expr: import("../src/syntax.js").Expr, env: import("../src/runtime.js").Environment, receiver: Value): Completion {
        this.peakDepth = Math.max(this.peakDepth, this.depth + 1);
        return super.evaluate(expr, env, receiver);
    }
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        if (callee.kind === "object" && callee.object.callable !== null
        && callee.object.callable.kind === "guest" && this.calls < this.maxCalls) this.guestInvocations++;
        return super.call(callee, receiver, args, at);
    }
}
const U = UNDEFINED;
const loc: Location = { line: 7, column: 9 };
const delLoc: Location = { line: 7, column: 2 };

function n(value: number): Value {
    return { kind: "number", value };
}

function s(value: string): Value {
    return { kind: "string", value };
}

function b(value: boolean): Value {
    return { kind: "boolean", value };
}

function o(object: GuestObject): Value {
    return { kind: "object", object };
}

function check(ok: boolean, label: string): void {
    if (!ok) throw new Error("delete " + label);
}

function put(target: GuestObject, key: PropertyKey, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}

function bind(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}

function fn(realm: Realm, body: Builtin): Value {
    return o(realm.createBuiltin("hook", 0, body));
}

function stmt(source: string): Stmt {
    const p = parse(source);
    check(p.error === null && p.body.length === 1, "parse " + source);
    return p.body[0];
}

function run(e: Evaluator, source: string): Completion {
    return e.statement(stmt(source), e.context.realm.global, U);
}

function expect(result: Completion, value: Value = b(true)): void {
    check(result.type === "normal" && sameValue(result.value, value), "result");
}

function error(result: Completion, message: string, line = 1, column = 1): void {
    check(result.type === "throw" && result.diagnostic.phase === "runtime" && result.diagnostic.message === message
    && result.diagnostic.loc.line === line && result.diagnostic.loc.column === column, "error " + message + " @" + line + ":" + column);
}

function helper(e: Evaluator, base: Value, key: Value): ValueCompletion {
    return deleteReference({ kind: "property", base, key, loc }, e.context, delLoc);
}
const effectSource = readFileSync("test/fixtures/delete-effects.js", "utf8").trim();

// P1-P6 and P17-P27: literal diagnostics, independently fixed columns.

const badSources = ["delete x;", "delete (((x)));", "effect(); delete x;", "if (false) { delete x; }", "function f(x) { delete x; }", "'use strict'; delete x;", "delete o.x = 1;", "delete;", "let delete = 1;", "delete typeof x;", "delete void x;", "delete super.x;", "delete (o.x, o.y);", "delete " + "(".repeat(127) + "1" + ")".repeat(127) + ";"];
const columns = [1,1,11,14,17,15,1,7,5,8,8,8,12,134];
const messages = ["delete of an identifier is not allowed", "delete of an identifier is not allowed", "delete of an identifier is not allowed", "delete of an identifier is not allowed", "delete of an identifier is not allowed", "delete of an identifier is not allowed", "invalid assignment target", "unsupported or unexpected syntax: ;", "expected binding identifier", "unsupported or unexpected syntax: typeof", "unsupported or unexpected syntax: void", "unsupported or unexpected syntax: super", "expected ')', found ','", "syntax nesting limit exceeded"];
for (let i = 0; i < badSources.length; i++) {
    const p = parse(badSources[i]);
    check(p.error !== null && p.error.phase === "parse" && p.error.name === "SyntaxError" && p.error.message === messages[i]
    && p.error.loc.line === 1 && p.error.loc.column === columns[i], "P diagnostic " + i);
}
for (const name of ["missing", "x", "undefined", "f"]) check(parse("delete " + name + ";").error !== null, "P1 binding independent");
for (const term of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    const r = new Realm((_line) => {  }); const e = new Evaluator(r); const target = r.createObject();
    put(target,"x",n(7));
    bind(r,"o",o(target));
    expect(run(e,"delete" + term + "o.x;"));
    const p = stmt("delete" + term + "o.x;");
    check(p.kind === "expression" && p.expression.kind === "unary" && p.expression.operand.loc.line === 2 && p.expression.operand.loc.column === 1,"P22 location");
    expect(run(e,"delete /*" + term + "*/ o.x;"));
}

class Observed extends GuestObject {
    trace = "";
    reads = 0;
    deletes = 0;
    getFailure: ThrowCompletion | null = null;
    deleteFailure: ThrowCompletion | null = null;
    onDelete: () => void = () => {  };
    refuse = false;
    hostFault: Error | null = null;
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        this.reads++;
        if (this.getFailure !== null) return this.getFailure;
        return super.internalGet(key,receiver,at);
    }
    internalDelete(key: PropertyKey): InternalBooleanCompletion {
        this.trace += "D";
        this.deletes++;
        this.onDelete();
        if (this.hostFault !== null) throw this.hostFault;
        if (this.deleteFailure !== null) return this.deleteFailure;
        if (this.refuse) return { type: "normal", value: false };
        return super.internalDelete(key);
    }
}

// P7-P16, P20-P21, D24: reference versus value classification and no final Get.
for (const source of ["delete this;", "delete null;", "delete 1;", "delete 'x';", "delete true;", "delete (o.x);", "delete (((o.x)));", "delete (x = 1);", "delete (true ? o.x : o.y);", "delete (true && o.x);", "delete (false || o.x);", "delete f();", "delete o.x === true;", "!delete o.x;", "+delete o.x;", "delete delete o.x;", "delete o.delete;", "delete o['delete'];"]) {
    const r = new Realm((_line) => {  });
    const e = new Evaluator(r);
    const target = new Observed();
    put(target,"x",n(7));
    put(target,"delete",n(8));
    bind(r,"o",o(target));
    bind(r,"x",n(0));
    let calls = 0;
    bind(r,"f",fn(r,(_receiver,_args,_context,_at) => {
        calls++;
        return normal(o(target));
    }));
    expect(run(e,source),source === "!delete o.x;" ? b(false) : source === "+delete o.x;" ? n(1) : b(true));
    const reads = source.includes("?") || source.includes("&&") || source.includes("||");
    check(target.reads === (reads ? 1 : 0),"P reads " + source);
    check(calls === (source === "delete f();" ? 1 : 0),"P calls");
    if (reads) check(target.getOwnProperty("x") !== undefined && target.deletes === 0,"P value retains");
    if (source === "delete (x = 1);") check(sameValue(r.global.bindings.get("x")!.value,n(1)),"P9 assignment");
}
{
    const r = new Realm((_line) => {  });
    const e = new Evaluator(r);
    error(run(e,"delete missing.x;"),"missing is not defined",1,8);
    error(run(e,"delete (true && missing);"),"missing is not defined",1,17);
    const p = parse("let deleted = 1; deleted;");
    check(p.error === null,"P20 parse");
    e.block(p.body,r.global,U);
    check(sameValue(r.global.bindings.get("deleted")!.value,n(1)),"P20 value");
    const target = new Observed();
    put(target,"x",n(7));
    target.getFailure = failure("Error","forbidden read",loc);
    bind(r,"o",o(target));
    expect(run(e,"delete o.x;"));
    check(target.reads === 0,"D forbidden Get");
    const parent = new Observed();
    put(parent,"child",o(target));
    put(target,"x",n(7));
    bind(r,"o",o(parent));
    expect(run(e,"delete o.child.x;"));
    check(parent.reads === 1 && target.reads === 0 && parent.getOwnProperty("child") !== undefined,"D24");
}

// D1-D6: complete descriptor/prototype/key snapshots on strict failures.
for (const writable of [false,true]) for (const enumerable of [false,true]) for (const configurable of [false,true]) {
    const r = new Realm((_line) => {  }); const e = new Evaluator(r); const parent = r.createObject();
    put(parent,"x",n(9));
    const target = new GuestObject(parent);
    target.bootstrapDefine("x",{ value:n(7),writable,enumerable,configurable });
    put(target,"z",n(8));
    bind(r,"o",o(target));
    const result = run(e,"delete o.x;");
    if (configurable) {
        expect(result);
        check(target.getOwnProperty("x") === undefined && sameValue(target.get("x"),n(9)),"D3 reveal");
        expect(run(e,"delete o.x;"));
    }
    else {
        error(result,"property is not configurable: x");
        const d=target.getOwnProperty("x");
        check(d !== undefined && sameValue(d.value,n(7)) && d.writable === writable && d.enumerable === enumerable && !d.configurable,"D5 descriptor");
        check(target.ownPropertyKeys()[0] === "x" && target.ownPropertyKeys()[1] === "z","D5 order");
        const raw=target.internalDelete("x");
        check(raw.type === "normal" && !raw.value,"D5 raw false");
    }
    check(target.getPrototypeOf() === parent && sameValue(parent.get("x"),n(9)) && sameValue(target.get("z"),n(8)),"D unchanged");
}
for (const inheritedConfigurable of [false,true]) {
    const r=new Realm((_line)=>{  }); const p=new GuestObject(); p.bootstrapDefine("x",{ value:n(9),configurable:inheritedConfigurable} );
    const t=new GuestObject(p);
    t.preventExtensions();
    put(p,"y",n(2));
    expect(helper(new Evaluator(r),o(t),s("x")));
    check(t.getOwnProperty("x")===undefined && sameValue(p.get("x"),n(9)) && !t.isExtensible(),"D2/D6 inherited");
    const own=new GuestObject();
    put(own,"x",n(7));
    own.preventExtensions();
    expect(helper(new Evaluator(r),o(own),s("x")));
    check(!own.isExtensible(),"D6 own");
}

// D7-D14, D23 precise locations and low-level dispatch.
for (const source of ["delete Number.NaN;","delete null.x;","delete undefined.x;","delete 'ab'[0];","delete 'ab'.length;","delete 'ab'[-0];","delete ''.length;","delete 'ab'.x.y;"]) {
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const nullish=source.includes("null")||source.includes("undefined");
    const read=source.includes(".x.y");
    const key=source.includes("NaN")?"NaN":source.includes("length")?"length":"0";
    error(run(e,source),nullish?"cannot convert null or undefined to object":read?"property base must be an object":"property is not configurable: "+key,1,nullish||read?8:1);
}
for (const source of ["delete 'ab'[2];","delete 'ab'['01'];","delete 'ab'['-0'];","delete ''[0];"]) expect(run(new Evaluator(new Realm((_line)=>{
})),source));
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const a=r.createArray();
    for (let i=0; i<3; i++) put(a,String(i),n(i+1));
    bind(r,"a",o(a));
    expect(run(e,"delete a[1];"));
    check(a.ownPropertyKeys().length===3 && a.ownPropertyKeys()[0]==="0" && a.ownPropertyKeys()[1]==="2" && a.ownPropertyKeys()[2]==="length" && sameValue(a.get("length"),n(3)),"D8");
    expect(run(e,"delete a[1];"));
    expect(run(e,"delete a[8];"));
    error(run(e,"delete a.length;"),"property is not configurable: length");
    a.defineOwnProperty("0",{ configurable:false} ,e.context,loc);
    error(run(e,"delete a[0];"),"property is not configurable: 0");
    check(sameValue(a.get("length"),n(3)) && sameValue(a.get("0"),n(1)),"D9 D10");
    const t=r.createObject();
    for (const k of ["9","2","a","b","c"]) put(t,k,n(1)); expect(helper(e,o(t),s("b"))); put(t,"b",n(2));
    put(t,"a",n(3));
    const keys=t.ownPropertyKeys();
    check(keys[0]==="2" && keys[1]==="9" && keys[2]==="a" && keys[3]==="c" && keys[4]==="b","D11");
    const sym=new GuestSymbol("x");
    const other=new GuestSymbol("x");
    put(t,sym,n(4));
    put(t,other,n(5));
    put(t,"x",n(6));
    bind(r,"o",o(t));
    bind(r,"s",{ kind:"symbol",value:sym} );
    expect(run(e,"delete o[s];"));
    check(t.getOwnProperty(sym)===undefined && sameValue(t.get(other),n(5)) && sameValue(t.get("x"),n(6)),"D12");
    put(t,sym,n(7));
    const reordered=t.ownPropertyKeys();
    check(reordered[reordered.length-2]===other && reordered[reordered.length-1]===sym,"D12 order");
    t.bootstrapDefine(sym,{ configurable:false} );
    error(run(e,"delete o[s];"),"property is not configurable: Symbol(x)");
}

// D15-D22 all primitive payloads and relinked/foreign/null String prototypes.
for (const value of [b(true),b(false),n(0),n(-0),n(NaN),n(Infinity),n(-Infinity),{ kind:"symbol",value:new GuestSymbol("x")} ] as Value[] ) {
    const r=new Realm((_line)=>{  }); const e=new Evaluator(r); for(const p of [r.booleanPrototype,r.numberPrototype,r.symbolPrototype]) p.bootstrapDefine("x",{ value:n(7),configurable:false} );
    bind(r,"b",value);
    for(const k of ["x","valueOf","toString"]) expect(run(e,"delete b."+k+";"));
    check(r.numberPrototype.getOwnProperty("x")!==undefined && r.booleanPrototype.getOwnProperty("valueOf")!==undefined,"D15 roots");
}
for (let mode=0; mode<4; mode++) {
    const r=new Realm((_line)=>{  });
    const foreign=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const box=r.createStringObject("\ud83d\ude00");
    if(mode===1) box.setPrototypeOf(null);
    if(mode===2) box.setPrototypeOf(new GuestObject());
    if(mode===3) box.setPrototypeOf(foreign.stringPrototype);
    const proto=box.getPrototypeOf();
    put(box,"x",n(7));
    const sym=new GuestSymbol("0");
    put(box,sym,n(8));
    for (const base of [s("\ud83d\ude00"),o(box)]) {
        for(const key of [n(0),n(1),s("length")]) error(helper(e,base,key),"property is not configurable: "+(key.kind==="number"?String(key.value):"length"),7,2); for(const key of [n(2),s("01"),s("-0"),{
            kind:"symbol",value:sym} as Value]) expect(helper(e,base,key)); }
    expect(helper(e,o(box),s("x")));
    check(box.stringData==="\ud83d\ude00" && box.getPrototypeOf()===proto,"D20/D21 payload");
}

// E1-E21: runtime-read expression, captured references, exact traces/identities.
for (let mode=0; mode<29; mode++) {
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const t=new Observed();
    const alternate=r.createObject();
    put(t,"x",n(7));
    put(t,"y",n(8));
    put(alternate,"x",n(9));
    const key=new Observed(r.objectPrototype);
    const thrown=failure("Sentinel","original",loc);
    let trace="";
    let hookCalls=0;
    t.onDelete=()=>{
        trace+="D";
    };
    let base:Value=o(t);
    let keyValue:Value=o(key);
    bind(r,"o",base);
    bind(r,"k",keyValue);
    const canonical=fn(r,(receiver,args,_context,_at)=>{
        trace+="H";
        hookCalls++;
        check(receiver.kind==="object" && receiver.object===key && args.length===1 && sameValue(args[0],s("string")),"E canonical receiver/hint");
        if(mode===4) {
            put(t,"changed",n(1));
            return thrown;
        }
        if(mode===5) return normal(o(key));
        if(mode===13) {
            bind(r,"o",o(alternate));
            t.setPrototypeOf(alternate);
        }
        if(mode===14) bind(r,"k",o(alternate));
        if(mode===15) t.internalDelete("x");
        if(mode===16) put(t,"x",n(42));
        if(mode===17) t.bootstrapDefine("x",{ configurable:false} );
        return normal(s("x"));
    });
    put(key,wellKnownToPrimitive,canonical);
    const ordinary=fn(r,(receiver,args,_context,_at)=>{
        trace+="T";
        check(receiver.kind==="object" && receiver.object===key && args.length===0,"E ordinary receiver");
        if(mode===21) put(key,"valueOf",replacement);
        if(mode===22) {
            key.internalDelete("valueOf");
            const p=new GuestObject();
            put(p,"valueOf",replacement);
            key.setPrototypeOf(p);
        }
        if(mode===23) {
            key.internalDelete("valueOf");
            key.setPrototypeOf(null);
        }
        return normal(mode===7||mode===8 ? s("x") : o(key));
    });
    const replacement=fn(r,(_receiver,_args,_context,_at)=>{
        trace+="V";
        return normal(s("y"));
    });
    const valueOf=fn(r,(receiver,args,_context,_at)=>{
        trace+="V";
        check(receiver.kind==="object"&&receiver.object===key&&args.length===0,"E valueOf receiver");
        return normal(mode===10?o(key):s("x"));
    });
    if([7,8,9,10,11,21,22,23,25].includes(mode)) {
        key.internalDelete(wellKnownToPrimitive);
        put(key,"toString",ordinary);
        put(key,"valueOf",valueOf);
    }
    if(mode===8) put(key,wellKnownToPrimitive,{ kind:"null"} );
    if(mode===11) put(key,"toString",n(1));
    if(mode===6) put(key,wellKnownToPrimitive,n(1));
    if(mode===20) {
        key.internalDelete(wellKnownToPrimitive);
        key.setPrototypeOf(null);
    }
    if(mode===24) key.getFailure=thrown;
    if(mode===25) put(key,wellKnownToPrimitive,U);
    if(mode===18) t.deleteFailure=thrown;
    if(mode===19) t.refuse=true;
    if(mode===3 || mode===26) base=mode===3?{ kind:"null"} :U;
    if(mode===27) base={ kind:"null"} ;
    bind(r,"base",fn(r,(_receiver,_args,_context,_at)=>{
        trace+="B";
        return mode===1?thrown:normal(base);
    }));
    bind(r,"key",fn(r,(_receiver,_args,_context,_at)=>{
        trace+="K";
        if(mode===2||mode===27) return thrown;
        if(mode===12) {
            bind(r,"o",o(alternate));
            return normal(s("x"));
        }
        return normal(keyValue);
    }));
    const result=run(e,effectSource);
    const expected=["BKHD","B","BK","BK","BKH","BKH","BK","BKTD","BKTD","BKTVD","BKTV","BKVD","BKD","BKHD","BKHD","BKHDD","BKHD","BKHD","BKHD","BKHD","BK","BKTVD","BKTVD","BKT","BK","BKTVD","BK","BK","BKHD"][mode];
    check(trace===expected,"E trace "+mode+" "+trace);
    const identity=[1,2,4,18,24,27].includes(mode);
    if(identity) check(result===thrown,"E abrupt identity "+mode);
    else if(mode===3||mode===26) error(result,"cannot convert null or undefined to object",1,8);
    else if([5,10,20,23].includes(mode)) error(result,"cannot convert object to primitive",1,8);
    else if(mode===6) error(result,"symbol toPrimitive method is not callable",1,8);
    else if(mode===17||mode===19) error(result,"property is not configurable: x");
    else {
        expect(result);
        check(t.getOwnProperty(mode===21||mode===22?"y":"x")===undefined,"E removed");
    }
    check(t.reads===0 && e.calls===0 && e.depth===0 && e.context.realm===r,"E no reads/cleanup");
    if(mode===4) check(t.getOwnProperty("changed")!==undefined,"E mutation survives");
    if(mode===12||mode===13) check(alternate.getOwnProperty("x")!==undefined,"E captured base");
    if(mode===13) check(t.getPrototypeOf()===alternate,"E relink retained");
    if(mode===14) check(hookCalls===1,"E captured key");
    if(mode===17) check(t.getOwnProperty("x")!.configurable===false,"E strict mutation retained");
}

// Throwing ordinary Get versus forbidden target Get.

class LookupFailure extends GuestObject {
    constructor(readonly thrown: ThrowCompletion) {
        super(null);
    }
    internalGet(key: PropertyKey, _receiver: Value, _at: Location): ValueCompletion {
        return key===wellKnownToPrimitive?normal():this.thrown;
    }
}
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const t=new Observed();
    const thrown=failure("Error","lookup",loc);
    check(helper(e,o(t),o(new LookupFailure(thrown)))===thrown && t.deletes===0,"E ordinary lookup identity");
}
const primitiveKeys:Value[]=[U,{ kind:"null"} ,b(true),b(false),n(0),n(-0),n(NaN),n(Infinity),n(-Infinity)];
const keyNames=["undefined","null","true","false","0","0","NaN","Infinity","-Infinity"];
for (let i=0; i<primitiveKeys.length; i++) {
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const t=new Observed();
    put(t,keyNames[i],n(7));
    let trace="";
    bind(r,"base",fn(r,(_receiver,_args,_context,_at)=>{
        trace+="B";
        return normal(o(t));
    }));
    bind(r,"key",fn(r,(_receiver,_args,_context,_at)=>{
        trace+="K";
        return normal(primitiveKeys[i]);
    }));
    expect(run(e,effectSource));
    check(trace+t.trace==="BKD" && t.getOwnProperty(keyNames[i])===undefined,"E20 keys");
}
for (const hook of [false,true]) {
    const r=new Realm((_line)=>{  }); const e=new Evaluator(r); const t=r.createObject();
    const sym=new GuestSymbol("x");
    const other=new GuestSymbol("x");
    put(t,sym,n(1));
    put(t,other,n(2));
    put(t,"x",n(3));
    const k=r.createObject();
    put(k,wellKnownToPrimitive,fn(r,(_receiver,_args,_context,_at)=>normal({ kind:"symbol",value:sym} )));
    expect(helper(e,o(t),hook?o(k):{ kind:"symbol",value:sym} ));
    check(t.getOwnProperty(sym)===undefined&&t.getOwnProperty(other)!==undefined&&t.getOwnProperty("x")!==undefined,"E21 identity");
}

// E22/E23 default consumer keys, preserving Number's bounded string hint.
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const pair=r.createArray();
    put(pair,"0",n(1));
    put(pair,"1",n(2));
    const source="function f() { return 7; }";
    const parsed=parse(source);
    e.block(parsed.body,r.global,U);
    const f=r.global.bindings.get("f")!.value;
    const values=[o(r.createArray()),o(pair),f,o(r.createBooleanObject(true)),o(r.createStringObject("payload")),o(r.createNumberObject(12))];
    const keys=["","1,2",source,"true","payload","[object Number]"];
    for (let i=0; i<values.length; i++){
        const t=r.createObject();
        put(t,keys[i],n(7));
        expect(helper(e,o(t),values[i]));
        check(t.getOwnProperty(keys[i])===undefined,"E22/E23");
    }
    if(f.kind!=="object") throw new Error("function");
    put(f.object,"name",s("f"));
    put(f.object,"length",n(0));
    bind(r,"f",f);
    expect(run(e,"delete f.name;"));
    expect(run(e,"delete f.length;"));
    expect(e.call(f,U,[],loc),n(7));
    expect(run(e,"f.toString();"),s(source));
}

class BoxingRealm extends Realm {
    boxes=0;
    last: GuestNumber | null=null;
    createNumberObject(value:number): GuestNumber {
        this.boxes++;
        const box=super.createNumberObject(value);
        this.last=box;
        return box;
    }
}

// E24/E25/R21: defining Realm switching, pre-hook boxing, faults and monotonic steps.
for (const mode of [0,1,2,3]) {
    const a=new BoxingRealm((_line)=>{  }); const foreign=new Realm((_line)=>{  }); const e=new Evaluator(a);
    const k=foreign.createObject();
    const fault=new Error("host sentinel");
    const thrown=failure("Error","foreign",loc);
    let seen=0;
    put(k,wellKnownToPrimitive,fn(foreign,(_receiver,_args,context,_at)=>{
        check(a.boxes===1&&a.last!==null&&a.last.getPrototypeOf()===a.numberPrototype&&context.realm===foreign,"E24 box-before-hook/Realm");
        seen++;
        if(mode===1)return thrown;
        if(mode===2)throw fault;
        return normal(s("x"));
    }));
    bind(a,"base",fn(a,(_receiver,_args,_context,_at)=>normal(n(2))));
    bind(a,"key",fn(a,(_receiver,_args,_context,_at)=>normal(o(k))));
    if(mode===3)e.maxCalls=0;
    let caught=false;
    try {
        const result=run(e,effectSource);
        if(mode===0)expect(result);
        if(mode===1)check(result===thrown,"E24 guest identity");
        if(mode===3)error(result,"call depth limit exceeded",1,8);
    }
    catch(err){
        check(err instanceof Error && err===fault&&mode===2,"E25 identity");
        caught=true;
    }
    check(caught===(mode===2)&&e.context.realm===a&&e.calls===0&&e.depth===0,"R21 cleanup");
    const before=e.steps;
    e.maxCalls=64;
    expect(helper(e,o(a.createObject()),s("x")));
    check(e.steps===before,"R21 monotonic");
    check(seen===(mode===3?0:1),"E24 count");
}
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const t=new Observed();
    const fault=new Error("delete fault");
    t.hostFault=fault;
    bind(r,"o",o(t));
    let caught=false;
    try{
        run(e,"delete o.x;");
    }
    catch(err){
        caught=err instanceof Error && err===fault;
    }
    check(caught&&e.calls===0&&e.depth===0&&e.steps===4,"E25 delete fault cleanup");
    const k=r.createObject();
    let trace="";
    const saved=fn(r,(_receiver,_args,_context,_at)=>{
        trace+="A";
        return normal(s("x"));
    });
    put(k,wellKnownToPrimitive,saved);
    t.hostFault=null;
    put(t,"x",n(1));
    expect(helper(e,o(t),o(k)));
    put(k,wellKnownToPrimitive,fn(r,(_receiver,_args,_context,_at)=>{
        trace+="B";
        return normal(s("y"));
    }));
    put(t,"y",n(2));
    expect(helper(e,o(t),o(k)));
    expect(e.call(saved,o(k),[s("string")],loc),s("x"));
    check(trace==="ABA","E26 fresh lookup/saved callable");
}

// R1-R5/R14-R15 direct helpers have no evaluator frames or hidden charges.
for (let kind=0; kind<5; kind++) for (const limit of [0,1,2,100]) {
    const r=new Realm((_line)=>{  }); const e=new Evaluator(r,limit); const t=r.createObject();
    put(t,"x",n(7));
    const k=new GuestObject(null);
    let calls=0;
    let peak=0;
    const method=fn(r,(_receiver,_args,_context,_at)=>{
        calls++;
        peak=Math.max(peak,e.calls);
        return normal(kind===3&&calls===1?o(k):s("x"));
    });
    if(kind===1)put(k,wellKnownToPrimitive,method);
    if(kind===2||kind===3){
        put(k,"toString",method);
        put(k,"valueOf",method);
    }
    const result=helper(e,o(t),kind===0?s("x"):o(k));
    const cost=[0,1,2,3,3][kind];
    check(e.steps===Math.min(cost,limit+1)&&e.calls===0&&e.depth===0,"R helper steps");
    if(limit<cost)error(result,"execution step limit exceeded",7,9);
    else if(kind===4)error(result,"cannot convert object to primitive",7,9);
    else expect(result);
    const expectedCalls=kind===1&&limit>=1?1:kind===2&&limit>=2?1:kind===3?(limit>=3?2:limit>=2?1:0):0;
    check(calls===expectedCalls&&peak===(calls>0?1:0),"R helper calls");
}
for (const base of [n(1),s(""),b(false),U,{
    kind:"null"} as Value]) {
    const e=new Evaluator(new Realm((_line)=>{  } ),0); const result=helper(e,base,s("x")); if(base.kind==="null"||base.kind==="undefined")error(result,"cannot convert null or undefined to object",7,9);
    else expect(result);
    check(e.steps===0&&e.calls===0,"R1 boxing");
}
for (const limit of [0,1,2,3,4]) for(const fixed of [false,true]) {
    const r=new Realm((_line)=>{  }); const e=new MeasuredEvaluator(r,limit); const t=r.createObject();
    t.bootstrapDefine("x",{ value:n(7),configurable:!fixed} );
    bind(r,"o",o(t));
    const result=run(e,"delete o.x;");
    check(e.steps===Math.min(4,limit+1)&&e.depth===0,"R6-R8 steps");
    if(limit<4){
        error(result,"execution step limit exceeded",1,[1,1,8,10][limit]);
        check(t.getOwnProperty("x")!==undefined,"R7 no deletion");
    }
    else if(fixed)error(result,"property is not configurable: x");
    else expect(result);
    if(limit===4)check(e.peakDepth===3,"R6 peak depth");
}
for(const limit of [2,3]){
    const e=new Evaluator(new Realm((_line)=>{  } ),limit);
    const result=run(e,"delete 1;");
    check(e.steps===3,"R9 steps");
    if(limit===2)error(result,"execution step limit exceeded",1,8);
    else expect(result);
}
for (let kind=0; kind<3; kind++)for (const variant of [0,1,2]) {
    const r=new Realm((_line)=>{  }); const e=new Evaluator(r,variant===1?4:100,variant===2?0:64); const t=r.createObject();
    put(t,"x",n(7));
    const k=new GuestObject(null);
    let calls=0;
    const method=fn(r,(_receiver,_args,_context,_at)=>{
        calls++;
        return normal(kind===2&&calls===1?o(k):s("x"));
    });
    if(kind===0)put(k,wellKnownToPrimitive,method);
    else{
        put(k,"toString",method);
        put(k,"valueOf",method);
    }
    bind(r,"o",o(t));
    bind(r,"k",o(k));
    const result=run(e,"delete o[k];");
    if(variant===0){
        expect(result);
        check(e.steps===5+kind&&calls===(kind===2?2:1),"R10/R12");
    }
    else{
        error(result,variant===1?"execution step limit exceeded":"call depth limit exceeded",1,8);
        check(calls===0&&e.steps===(variant===1?5:kind===0?5:6),"R10/R11 guard");
    }
}
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r,4);
    const k=r.createObject();
    put(k,wellKnownToPrimitive,fn(r,(_receiver,_args,_context,_at): Completion =>{
        throw new Error("nullish hook");
    }));
    bind(r,"k",o(k));
    error(run(e,"delete null[k];"),"cannot convert null or undefined to object",1,8);
    check(e.steps===4,"R13");
}

// R16-R19 actually run the native default64 recursion, without lowering limits.
for (const guest of [false,true])for(const bound of [0,1,2,64]) {
    const r=new Realm((_line)=>{  }); const e=bound===64?new MeasuredEvaluator(r):new MeasuredEvaluator(r,100000,bound); const t=new Observed();
    put(t,"x",n(7));
    const k=r.createObject();
    bind(r,"o",o(t));
    bind(r,"k",o(k));
    const operation=stmt("delete o[k];");
    let calls=0;
    if(guest){
        const setup=parse("function h() { return delete o[k]; }");
        new Evaluator(r).block(setup.body,r.global,U);
        put(k,wellKnownToPrimitive,r.global.bindings.get("h")!.value);
    }
    else put(k,wellKnownToPrimitive,fn(r,(_receiver,_args,_context,_at)=>{
        calls++;
        if(operation.kind!=="expression")throw new Error("expression");
        return e.evaluate(operation.expression,r.global,U);
    }));
    const result=e.statement(operation,r.global,U);
    error(result,"call depth limit exceeded",1,guest&&bound>0?30:8);
    check(e.steps===(guest?5*bound+5:4*bound+5),"R recursion steps "+guest+" "+bound);
    check(e.calls===0&&e.depth===0&&t.deletes===0&&e.context.realm===r,"R recursion cleanup");
    if(!guest)check(calls===bound,"R invocation count");
    else check(e.guestInvocations===bound,"R guest invocation count");
}
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r,14,2);
    const k=r.createObject();
    bind(r,"o",o(r.createObject()));
    bind(r,"k",o(k));
    const setup=parse("function h() { return delete o[k]; }");
    new Evaluator(r).block(setup.body,r.global,U);
    put(k,wellKnownToPrimitive,r.global.bindings.get("h")!.value);
    error(run(e,"delete o[k];"),"execution step limit exceeded",1,30);
    check(e.steps===15&&e.calls===0&&e.depth===0,"R18 priority");
    e.maxSteps=100;
    e.depth=256;
    const operation=stmt("delete o.x;");
    if(operation.kind!=="expression")throw new Error("expr");
    const before=e.steps;
    error(e.evaluate(operation.expression,r.global,U),"evaluation nesting limit exceeded");
    check(e.steps===before+1&&e.depth===256,"R20");
}

// D26/C8 cross-Realm aliases; unshared roots and objects stay intact.
{
    const a=new Realm((_line)=>{  });
    const bRealm=new Realm((_line)=>{  });
    const fresh=new Realm((_line)=>{  });
    const target=a.createObject();
    const unrelated=bRealm.createObject();
    put(target,"x",n(1));
    put(unrelated,"x",n(2));
    bind(a,"o",o(target));
    bind(bRealm,"o",o(target));
    expect(run(new Evaluator(bRealm),"delete o.x;"));
    check(target.getOwnProperty("x")===undefined&&sameValue(unrelated.get("x"),n(2))&&target.getPrototypeOf()===a.objectPrototype&&fresh.objectPrototype!==a.objectPrototype,"D26/C8");
}

// Full runtime-read integration, including exact source strings and method calls.
{
    const r=new Realm((_line)=>{  });
    const e=new Evaluator(r);
    const p=parse(readFileSync("test/fixtures/delete-operator.js","utf8"));
    check(p.error===null,"C fixture parse");
    check(e.block(p.body,r.global,U).type==="normal","C fixture");
}

// C2/C3: inherited reads/calls and the existing host map consumer.
for (const inherited of [false, true]) {
    const r = new Realm((_line) => {  }); const e = new Evaluator(r); const array = r.createArray();
    for (let i = 0; i < 3; i++) put(array, String(i), n(i + 1));
    const parent = new GuestObject(r.arrayPrototype);
    if (inherited) put(parent, "1", n(9));
    array.setPrototypeOf(parent);
    bind(r, "a", o(array));
    expect(run(e, "delete a[1];"));
    expect(run(e, "a.join();"), s(inherited ? "1,9,3" : "1,,3"));
    let visited = "";
    const callback = fn(r, (_receiver, args, _context, _at) => {
        check(args[1].kind === "number", "C3 index");
        if (args[1].kind === "number") visited += String(args[1].value);
        return normal(args[0]);
    });
    const mapped = mapObjectDefaultArray(array, callback, U, e.context, loc);
    check(mapped.type === "normal" && mapped.value.kind === "object"
    && sameValue(mapped.value.object.get("length"), n(3)), "C3 map length");
    check(visited === (inherited ? "012" : "02"), "C3 hole/inherited map");
    const target = new GuestObject(parent);
    put(target, "x", n(7));
    put(parent, "x", n(9));
    put(parent, "method", fn(r, (receiver, _args, _context, _at) => {
        check(receiver.kind === "object" && receiver.object === target, "C2 receiver");
        return normal(n(42));
    }));
    put(target, "method", n(1));
    bind(r, "o", o(target));
    expect(run(e, "delete o.x;"));
    expect(run(e, "o.x;"), n(9));
    expect(run(e, "delete o.method;"));
    expect(run(e, "o.method();"), n(42));
}
// Helper invariants, strict false sites and unchanged abrupt records.
{
    const r = new Realm((_line) => {});
    const e = new Evaluator(r);
    const target = new Observed();
    target.refuse = true;
    error(helper(e, o(target), s("x")), "property is not configurable: x", 7, 2);
    const thrown = failure("Sentinel", "unchanged", loc);
    target.deleteFailure = thrown;
    check(helper(e, o(target), s("x")) === thrown, "D direct delete abrupt identity");
    check(e.steps === 0 && e.calls === 0, "R1 false/throw costs");
    bind(r, "f", fn(r, (_receiver, _args, _context, _at) => thrown));
    check(run(e, "delete f();") === thrown, "P12 abrupt call identity");
    let invariant = false;
    try {
        deleteReference({ kind: "binding", environment: r.global, name: "x" }, e.context, loc);
    } catch (err) {
        invariant = err instanceof Error && err.message === "delete requires a property reference";
    }
    check(invariant, "helper binding invariant");
    invariant = false;
    try {
        e.evaluate({ kind: "unary", op: "delete", loc, operand: { kind: "identifier", name: "x", loc } }, r.global, U);
    } catch (err) {
        invariant = err instanceof Error && err.message === "delete requires a property reference";
    }
    check(invariant && e.depth === 0, "malformed AST invariant cleanup");
    let parent = new GuestObject();
    parent.bootstrapDefine("x", { value: n(9), configurable: false });
    for (let i = 0; i < 1024; i++) parent = new GuestObject(parent);
    const deep = new Observed(parent);
    deep.getFailure = thrown;
    expect(helper(e, o(deep), s("x")));
    check(deep.reads === 0 && deep.deletes === 1, "D deep prototype no Get");
}

// C4/E26: guest deletion exposes inherited conversion methods, not cached keys.
for (const mode of [0, 1, 2]) {
    const r = new Realm((_line) => {});
    const e = new Evaluator(r);
    const parent = new GuestObject(null);
    const key = new GuestObject(parent);
    const target = r.createObject();
    const methodKey: PropertyKey = mode === 0 ? wellKnownToPrimitive : mode === 1 ? "toString" : "valueOf";
    let trace = "";
    const saved = fn(r, (_receiver, _args, _context, _at) => {
        trace += "A";
        return normal(s("x"));
    });
    put(key, methodKey, saved);
    put(parent, methodKey, fn(r, (_receiver, _args, _context, _at) => {
        trace += "B";
        return normal(s("y"));
    }));
    bind(r, "k", o(key));
    bind(r, "method", typeof methodKey === "string" ? s(methodKey) : { kind: "symbol", value: methodKey });
    put(target, "x", n(1));
    put(target, "y", n(2));
    bind(r, "o", o(target));
    expect(run(e, "delete o[k];"));
    expect(run(e, "delete k[method];"));
    expect(run(e, "delete o[k];"));
    expect(e.call(saved, o(key), [], loc), s("x"));
    check(trace === "ABA" && target.getOwnProperty("x") === undefined
        && target.getOwnProperty("y") === undefined, "C4 inherited fresh conversion");
}

// R21: a failure inside a foreign hook restores nonzero caller state too.
{
    const a = new Realm((_line) => {});
    const foreign = new Realm((_line) => {});
    const e = new Evaluator(a, 100, 2);
    const k = foreign.createObject();
    const leaf = fn(foreign, (_receiver, _args, _context, _at) => normal(s("x")));
    put(k, wellKnownToPrimitive, fn(foreign, (_receiver, _args, context, at) => {
        check(context.realm === foreign, "R21 entered foreign hook");
        return context.call(leaf, U, [], at);
    }));
    e.calls = 1;
    e.depth = 4;
    error(helper(e, o(a.createObject()), o(k)), "call depth limit exceeded", 7, 9);
    check(e.calls === 1 && e.depth === 4 && e.context.realm === a && e.steps === 1, "R21 previous state restored");
    expect(helper(e, o(a.createObject()), s("x")));
    check(e.steps === 1, "R21 subsequent remaining budget");
}
console.log("delete-operator ok");
