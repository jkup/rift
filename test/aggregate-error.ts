import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "aggregate-error", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text + " expected " + expected,
    );
}
const cases: { source: string; expected: string }[] = [
    {
        source: "var e=new AggregateError([1,2],'many');e.toString()+':'+e.errors.join(',')+':'+(e instanceof Error)+':'+Error.isError(e)",
        expected: "AggregateError: many:1,2:true:true",
    },
    {
        source: "var e=AggregateError([]);e.name+':'+e.message+':'+e.hasOwnProperty('message')+':'+e.errors.length",
        expected: "AggregateError::false:0",
    },
    { source: "AggregateError('ab',3).errors.join(',')", expected: "a,b" },
    {
        source: "var token={},values=[token];var e=AggregateError(values);values[0]=2;String(e.errors!==values && e.errors[0]===token)",
        expected: "true",
    },
    {
        source: "var e=AggregateError([],undefined,{cause:7});e.hasOwnProperty('message')+':'+e.cause+':'+Object.keys(e).length",
        expected: "false:7:0",
    },
    {
        source: "var options=Object.create({cause:3});String(AggregateError([],null,options).cause)",
        expected: "3",
    },
    {
        source: "var e=AggregateError([,2],'x',{cause:undefined});var d=Object.getOwnPropertyDescriptor(e,'errors');d.writable+':'+d.enumerable+':'+d.configurable+':'+e.errors.hasOwnProperty('0')+':'+e.hasOwnProperty('cause')",
        expected: "true:false:true:true:true",
    },
    {
        source: "AggregateError.length+':'+AggregateError.name+':'+(Object.getPrototypeOf(AggregateError)===Error)+':'+(Object.getPrototypeOf(AggregateError.prototype)===Error.prototype)",
        expected: "2:AggregateError:true:true",
    },
    {
        source: "Error.isError(AggregateError.prototype)+':'+Object.prototype.toString.call(AggregateError([]))+':'+AggregateError.prototype.hasOwnProperty('errors')",
        expected: "false:[object Error]:false",
    },
    {
        source: "class E extends AggregateError{}var e=new E([1],'x');(e instanceof E)+':'+(e instanceof AggregateError)+':'+e.errors[0]+':'+e.message",
        expected: "true:true:1:x",
    },
    {
        source: "var receiver={};var e=AggregateError.call(receiver,[1]);String(e!==receiver && e instanceof AggregateError)",
        expected: "true",
    },
    {
        source: "function C(){}var e=Reflect.construct(AggregateError,[[2],'x'],C);String(Object.getPrototypeOf(e)===C.prototype)+':'+e.errors[0]+':'+Error.isError(e)",
        expected: "true:2:true",
    },
    {
        source: "var order='',input={},message={toString(){order+='m';return 'msg'}},options={get cause(){order+='c';return 1}};Object.defineProperty(input,Symbol.iterator,{get(){order+='g';return function(){order+='i';var n=0;return {next(){order+='n';return n++===0?{done:false,value:2}:{done:true}}}}}});function C(){}var target=C.bind(null);Object.defineProperty(target,'prototype',{get(){order+='p';return C.prototype}});Reflect.construct(AggregateError,[input,message,options],target);order",
        expected: "pmcginn",
    },
    {
        source: "var order='',input={};input[Symbol.iterator]=()=>{order+='wrong'};try{AggregateError(input,{toString(){order+='m';throw 7}},{get cause(){order+='wrong'}})}catch(e){order+=e}order",
        expected: "m7",
    },
    {
        source: "var order='',input={};input[Symbol.iterator]=()=>{order+='wrong'};try{AggregateError(input,'x',{get cause(){order+='c';throw 7}})}catch(e){order+=e}order",
        expected: "c7",
    },
    {
        source: "var order='',input={};input[Symbol.iterator]=()=>({next(){throw 7},return(){order+='wrong'}});try{AggregateError(input)}catch(e){order+=e}order",
        expected: "7",
    },
    {
        source: "var order='',input={};input[Symbol.iterator]=()=>({next(){return {done:false,get value(){throw 7}}},return(){order+='wrong'}});try{AggregateError(input)}catch(e){order+=e}order",
        expected: "7",
    },
    {
        source: "var e=AggregateError([]);e.errors=[4];delete e.errors;String(!e.hasOwnProperty('errors'))",
        expected: "true",
    },
];
for (const test of cases) {
    string(test.source, test.expected);
}
for (const source of [
    "AggregateError()",
    "AggregateError(null)",
    "AggregateError(1)",
    "AggregateError([],Symbol())",
]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
{
    const realm = fresh(),
        foreign = fresh();
    const constructor = foreign.globalObject.getOwnProperty("AggregateError");
    if (constructor === undefined || constructor.kind !== "data") {
        throw new Error("foreign AggregateError");
    }
    realm.defineScriptGlobal("ForeignAggregate", { value: constructor.value });
    realm.defineScriptGlobal("foreignArrayPrototype", {
        value: { kind: "object", object: foreign.arrayPrototype },
    });
    string(
        "var e=ForeignAggregate([1]);String(Object.getPrototypeOf(e)===ForeignAggregate.prototype)+':'+(Object.getPrototypeOf(e.errors)===foreignArrayPrototype)",
        "true:true",
        realm,
    );
    string(
        "function C(){}var target=C.bind(null);target.prototype=0;var result=Reflect.construct(ForeignAggregate,[[2]],target);String(Object.getPrototypeOf(result)===AggregateError.prototype)+':'+(Object.getPrototypeOf(result.errors)===foreignArrayPrototype)",
        "true:true",
        realm,
    );
}
{
    const realm = fresh(),
        session = createScriptSession({ maxSteps: 100, maxCalls: 32 });
    const prepared = prepareBoundedScript(
        {
            id: "aggregate-budget",
            text: "var closed=false,input={};input[Symbol.iterator]=()=>({next(){return {done:false,value:1}},return(){closed=true}});AggregateError(input)",
        },
        realm,
    );
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(session, prepared.record).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "infinite errors bounded",
    );
    string("String(closed)", "false", realm);
}
console.log("AggregateError passed");
