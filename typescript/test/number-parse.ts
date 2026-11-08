import { Realm } from "../src/realm.js";
import { normal, sameValue, type ValueCompletion } from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, steps = 10000, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "number-parse", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
const sources = [
    "parseInt()", "parseInt('')", "parseInt('-0')", "parseInt('  -0Xffjunk')",
    "parseInt('08')", "parseInt('0b11')", "parseInt('0x11',10)", "parseInt('0x11',16)",
    "parseInt('0x',16)", "parseInt('11',2)", "parseInt('zZ!',36)", "parseInt('11',4294967298)",
    "parseInt('11',-4294967294)", "parseInt('11',2147483648)", "parseInt('11',1)",
    "parseInt('11',Infinity)", "parseInt('1e2')", "parseInt('900719925474099267')",
    "parseInt('ffffffffffffffff',16)", "parseFloat()", "parseFloat('')", "parseFloat('-0')",
    "parseFloat('1.e+')", "parseFloat('.5tail')", "parseFloat('1.25e+2!')", "parseFloat('1e-')",
    "parseFloat('-.')", "parseFloat('0xff')", "parseFloat('-Infinityjunk')", "parseFloat('infinity')",
    "parseFloat('1e400')", "parseFloat('-1e-400')", "parseFloat('5e-324')", "parseFloat('900719925474099267')",
    "parseInt('\uFEFF\u202812')", "parseFloat('\u008512')", "parseInt('１２')"
];
const expected = [NaN,NaN,-0,-255,8,0,0,17,NaN,3,1295,3,3,NaN,NaN,11,1,900719925474099300,18446744073709552000,
    NaN,NaN,-0,1,0.5,125,1,NaN,0,-Infinity,NaN,Infinity,-0,5e-324,900719925474099300,12,NaN,NaN];
for (let i = 0; i < sources.length; i++) {
    const result = run(sources[i] + ";");
    if (result.type !== "normal" || !sameValue(result.value, { kind: "number", value: expected[i] })) throw new Error(sources[i]);
}
for (const source of [
    "Number.parseInt===parseInt&&Number.parseFloat===parseFloat&&parseInt.length===2&&parseFloat.length===1&&parseInt.name==='parseInt'&&parseFloat.name==='parseFloat';",
    "let d=Object.getOwnPropertyDescriptor(Number,'parseInt');d.writable&&!d.enumerable&&d.configurable;",
    "let order='';let x={toString:function(){order+='S';return {};},valueOf:function(){order+='V';return '11';}};let r={valueOf:function(){order+='R';return 2;}};parseInt(x,r)===3&&order==='SVR';",
    "let order='';let r={valueOf:function(){order+='R';return 1;}};let x={toString:function(){order+='S';return '1';}};Number.isNaN(parseInt(x,r))&&order==='SR';",
    "let marker={};let touched=false;try{parseInt({toString:function(){throw marker;}},{valueOf:function(){touched=true;return 10;}});}catch(e){e===marker&&!touched;}",
    "let marker={};try{parseInt('1',{valueOf:function(){throw marker;}});}catch(e){e===marker;}",
    "parseFloat('12',{valueOf:function(){throw 1;}})===12;",
    "let x={toString:function(){return '-1.25tail';},valueOf:function(){throw 1;}};parseFloat(x)===-1.25;",
    "let ok=false;try{new parseInt('1');}catch(e){ok=e instanceof TypeError;}ok;"
]) {
    const result = run(source);
    if (result.type !== "normal" || !sameValue(result.value, { kind: "boolean", value: true })) throw new Error(source);
}
for (const name of ["parseInt", "parseFloat"]) {
    const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
    const descriptor = owner.globalObject.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data" || !descriptor.writable || descriptor.enumerable || !descriptor.configurable) throw new Error("global descriptor");
    caller.defineScriptGlobal("method", { value: descriptor.value });
    caller.defineScriptGlobal("symbol", { value: { kind: "symbol", value: wellKnownToPrimitive } });
    const bad = run("method(symbol);", 10000, caller);
    if (bad.type !== "throw" || bad.value.kind !== "object" || bad.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("parser error Realm");
    const input = caller.createObject();
    let calls = 0;
    input.bootstrapDefine(wellKnownToPrimitive, { value: { kind: "object", object: caller.createBuiltin("convert", 1, (_receiver, args, context, _loc): ValueCompletion => {
        if (args[0].kind !== "string" || args[0].value !== "string" || context.realm !== caller) throw new Error("parser conversion hint");
        calls++;
        return normal({ kind: "string", value: "12tail" });
    }) } });
    caller.defineScriptGlobal("input", { value: { kind: "object", object: input } });
    const result = run("method(input);", 10000, caller);
    if (result.type !== "normal" || !sameValue(result.value, { kind: "number", value: 12 }) || calls !== 1) throw new Error("parser converts once");
    if (new Realm((_line: string) => {}).global.bindings.has(name)) throw new Error("legacy parser absent");
    for (const text of [" ".repeat(300) + "1", "1".repeat(300)]) {
        const result = run(name + "('" + text + "');", 100);
        if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("scan budget " + name);
    }
}
console.log("Numeric parsing passed");
