import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "bigint-width", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
const cases = [
    "BigInt.asUintN(8,-1n)===255n&&BigInt.asIntN(8,255n)===-1n",
    "BigInt.asIntN(8,127n)===127n&&BigInt.asIntN(8,128n)===-128n&&BigInt.asIntN(8,-129n)===127n",
    "BigInt.asUintN(8,256n)===0n&&BigInt.asIntN(8,-256n)===0n&&BigInt.asUintN(8,-257n)===255n",
    "BigInt.asIntN(1,1n)===-1n&&BigInt.asUintN(1,-2n)===0n",
    "BigInt.asIntN(0,-999n)===0n&&BigInt.asUintN(0,999n)===0n",
    "BigInt.asIntN(undefined,1n)===0n&&BigInt.asUintN(NaN,1n)===0n&&BigInt.asUintN(null,1n)===0n",
    "BigInt.asUintN(-0.9,1n)===0n&&BigInt.asUintN(8.9,257n)===1n",
    "BigInt.asUintN(\"8\",true)===1n&&BigInt.asIntN(8,\"255\")===-1n&&BigInt.asUintN(8,false)===0n",
    "BigInt.asUintN(8,Object(257n))===1n&&BigInt.asIntN(8,{valueOf(){return 255n}})===-1n",
    "BigInt.asUintN(64,-1n)===18446744073709551615n&&BigInt.asIntN(64,9223372036854775808n)===-9223372036854775808n",
    "BigInt.asUintN(128,-1n)===340282366920938463463374607431768211455n",
    "BigInt.asIntN(128,170141183460469231731687303715884105728n)===-170141183460469231731687303715884105728n",
    "BigInt.asIntN(9007199254740991,-1n)===-1n&&BigInt.asUintN(9007199254740991,1n)===1n",
    "BigInt.asIntN(9007199254740991,0n)===0n&&BigInt.asUintN(9007199254740991,0n)===0n",
    "var trace=\"\",bits={valueOf(){trace+=\"B\";return 8}},value={valueOf(){trace+=\"V\";return -1n}};BigInt.asUintN(bits,value)===255n&&trace===\"BV\"",
    "var trace=\"\",value={valueOf(){trace+=\"V\";return 1n}};try{BigInt.asUintN(-1,value)}catch(e){trace+=e instanceof RangeError?\"R\":\"?\"}trace===\"R\"",
    "var trace=\"\",bits={valueOf(){trace+=\"B\";throw 7}},value={valueOf(){trace+=\"V\";return 1n}};try{BigInt.asIntN(bits,value)}catch(e){trace+=e}trace===\"B7\"",
    "var trace=\"\",value={valueOf(){trace+=\"V\";throw 7}};try{BigInt.asIntN(0,value)}catch(e){trace+=e}trace===\"V7\"",
    "var hint=\"\",bits={[Symbol.toPrimitive](h){hint+=h;return 8}},value={[Symbol.toPrimitive](h){hint+=h;return -1n}};BigInt.asUintN(bits,value)===255n&&hint===\"numbernumber\"",
    "BigInt.asIntN.length===2&&BigInt.asUintN.length===2&&BigInt.asIntN.name===\"asIntN\"&&BigInt.asUintN.name===\"asUintN\"",
    "var d=Object.getOwnPropertyDescriptor(BigInt,\"asIntN\");d.writable&&!d.enumerable&&d.configurable",
    "BigInt.asUintN.call(null,8,-1n)===255n",
    "var ok=false;try{BigInt.asIntN(-1,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asIntN(Infinity,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asIntN(-Infinity,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asIntN(9007199254740992,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asIntN(8n,1n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(Symbol(),1n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(8,1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(0,1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(8,null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(8,undefined)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(8,Symbol())}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asIntN(8,\"1.0\")}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{BigInt.asIntN(8,\"1n\")}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{BigInt.asUintN(-1,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asUintN(Infinity,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asUintN(-Infinity,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asUintN(9007199254740992,1n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt.asUintN(8n,1n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(Symbol(),1n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(8,1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(0,1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(8,null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(8,undefined)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(8,Symbol())}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.asUintN(8,\"1.0\")}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{BigInt.asUintN(8,\"1n\")}catch(e){ok=e instanceof SyntaxError}ok"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "width case " + i);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
run("var convert=BigInt.asUintN", defining);
const method = defining.globalObject.getOwnProperty("convert");
if (method === undefined || method.kind !== "data") throw new Error("method");
calling.defineScriptGlobal("convert", { value: method.value });
const failed = run("convert(-1,1n)", calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "builtin error Realm");
const session = createScriptSession({ maxSteps: 200, maxCalls: 64 });
const stopped = run("try{convert(9007199254740991,-1n)}catch(e){true}", calling, session);
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "huge unsigned allocation is bounded and uncatchable");
check(session.inspect().active === null && session.inspect().calls === 0 && session.inspect().depth === 0, "resource cleanup");
console.log("bigint width passed");
