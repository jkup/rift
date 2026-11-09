import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"uri",text},realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + " " + text);
    const session = createScriptSession({maxSteps:steps,maxCalls:32});
    const result = evaluateScript(session,prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0,"restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value,{kind:"boolean",value:true}),text);
}
const encodings: [string,string,string][] = [
    [String.fromCharCode(56319,57343),"%F4%8F%BF%BF","%F4%8F%BF%BF"],
    ["https://x/a b?q=x#f","https://x/a%20b?q=x#f","https%3A%2F%2Fx%2Fa%20b%3Fq%3Dx%23f"],
    [";/?:@&=+$,#",";/?:@&=+$,#","%3B%2F%3F%3A%40%26%3D%2B%24%2C%23"],
    ["AZaz09-_.!~*'()","AZaz09-_.!~*'()","AZaz09-_.!~*'()"],
    ["é😀","%C3%A9%F0%9F%98%80","%C3%A9%F0%9F%98%80"],
    ["\u0000\u007f\u0080\u07ff\u0800\uffff","%00%7F%C2%80%DF%BF%E0%A0%80%EF%BF%BF","%00%7F%C2%80%DF%BF%E0%A0%80%EF%BF%BF"],
    ["%{}|^[]\\\"","%25%7B%7D%7C%5E%5B%5D%5C%22","%25%7B%7D%7C%5E%5B%5D%5C%22"],
];
for(const [input,uri,component] of encodings) {
    const realm=fresh();realm.defineScriptGlobal("input",{value:{kind:"string",value:input}});
    for(const [name,expected] of [["encodeURI",uri],["encodeURIComponent",component]]) {
        const result=run(name+"(input);",realm);
        check(result.type === "normal" && sameValue(result.value,{kind:"string",value:expected}),name+" encoding");
    }
    realm.defineScriptGlobal("encoded",{value:{kind:"string",value:component}});
    const result=run("decodeURIComponent(encoded);",realm);
    check(result.type === "normal" && sameValue(result.value,{kind:"string",value:input}),"decode exact");
}
passes("decodeURI('%3b%2f%23%20%41')==='%3b%2f%23 A'&&decodeURIComponent('%3b%2f%23%20%41')===';/# A';");
for(const name of ["encodeURI","encodeURIComponent","decodeURI","decodeURIComponent"]) {
    passes(name+"() === 'undefined'&&"+name+"(null)==='null'&&"+name+"(true)==='true'&&"+name+"(123)==='123';");
    passes("var trace='';var a={toString:function(){trace+='S';return {};},valueOf:function(){trace+='V';return 'a';}};"+name+"(a)==='a'&&trace==='SV';");
    passes("var hint='';var a={};a[Symbol.toPrimitive]=function(h){hint=h;return 'a';};"+name+"(a)==='a'&&hint==='string';");
    passes("var caught=0;var a={toString:function(){throw 7;}};try{"+name+"(a);}catch(e){caught=e;}caught===7;");
    passes("var ok=false;try{"+name+"(Symbol());}catch(e){ok=e instanceof TypeError;}ok;");
    passes("var ok=false;try{new "+name+"('a');}catch(e){ok=e instanceof TypeError;}ok&&"+name+".length===1&&"+name+".name==='"+name+"'&&!Object.hasOwn("+name+",'prototype');");
    passes("var d=Object.getOwnPropertyDescriptor(this,'"+name+"');d.writable&&!d.enumerable&&d.configurable;");
    passes("var d=Object.getOwnPropertyDescriptor("+name+",'length');!d.writable&&!d.enumerable&&d.configurable;");
    passes("var old="+name+";"+name+"=7;var ok="+name+"===7;delete this."+name+";ok&&typeof "+name+"==='undefined'&&old('a')==='a';");
}
for(const name of ["encodeURI","encodeURIComponent"]) for(const text of ["\ud800","\udfff","a\ud800b","\ud800\ud800","\udc00\ud800"]) {
    const realm=fresh();realm.defineScriptGlobal("input",{value:{kind:"string",value:text}});
    const result=run(name+"(input);",realm);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === realm.getErrorPrototype("URIError"),"malformed UTF-16");
}
for(const name of ["decodeURI","decodeURIComponent"]) for(const text of ["%","%0","%G0","%80","%C0%AF","%C1%BF","%C2","%C2%20","%E0%80%80","%ED%A0%80","%F0%80%80%80","%F4%90%80%80","%F5%80%80%80","%FF","%E2%82"]) {
    const realm=fresh();realm.defineScriptGlobal("input",{value:{kind:"string",value:text}});
    const result=run(name+"(input);",realm);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === realm.getErrorPrototype("URIError"),"malformed UTF-8 "+text);
}
for (const name of ["decodeURI", "decodeURIComponent"]) {
    const realm=fresh();
    const input=String.fromCharCode(0xd800)+"raw";
    realm.defineScriptGlobal("input",{value:{kind:"string",value:input}});
    const result=run(name+"(input);",realm);
    check(result.type === "normal" && sameValue(result.value,{kind:"string",value:input}),"unescaped UTF-16 preserved");
}
const owner=fresh(),caller=fresh();const fn=run("decodeURI;",owner);
if(fn.type !== "normal")throw new Error("foreign setup");
caller.defineScriptGlobal("decode",{value:fn.value});const error=run("decode('%');",caller);
check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("URIError"),"codec error Realm");
const boundedRealm=fresh();boundedRealm.defineScriptGlobal("input",{value:{kind:"string",value:"x".repeat(1000)}});
const bounded=run("try{encodeURI(input);}catch(e){7;}",boundedRealm,100);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit","codec input budget uncatchable");
console.log("URI codecs passed");
