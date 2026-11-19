import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { auditBoundedScriptNumericAssignments, parseDeclarationPlan } from "../src/parser.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps=100000) {
    const prepared=prepareBoundedScript({id:"catch-var",text},new Realm((_line:string)=>{},"script"));
    if(prepared.kind!=="ready")throw new Error("prepare: "+text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
for(const strict of [false,true])for(const body of [
    "var ok=false;try{throw 1}catch(e){var e=7;ok=e===7}ok&&e===undefined",
    "var e=9,ok=false;try{throw 1}catch(e){var e=7;ok=e===7}ok&&e===9",
    "var ok=false;try{throw 1}catch(e){var e;ok=e===1}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){{var e=7}ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){{let e=9}var e=7;ok=e===7}ok&&e===undefined",
    "var saved;try{throw 1}catch(e){var e=7;saved=()=>e}saved()===7&&e===undefined",
    "function f(){var ok=false;try{throw 1}catch(e){var e=7;ok=e===7}return ok&&e===undefined}f()",
    "function f(e){var ok=false;try{throw 1}catch(e){var e=7;ok=e===7}return ok&&e===9}f(9)",
    "var ok=false;try{throw 1}catch(e){var [e]=[7];ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){var {x:e}={x:7};ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){for(var e of [7]){}ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){for(var [e] of [[7]]){}ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){for(var e in {x:1}){}ok=e==='x'}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){for(var e=0;e<7;e++){}ok=e===7}ok&&e===undefined",
    "var ok=false;try{throw 1}catch(e){try{throw 2}catch(e){var e=7;ok=e===7}ok=ok&&e===1}ok&&e===undefined"
]){
    const text=(strict?'\"use strict\";':'')+body,result=run(text);
    check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,text);
}
for(const text of [
    "function f(){try{throw 1}catch(e){var e;eval('var e=7');if(e!==7)return false}return e===undefined}f()",
    "function f(){try{throw 1}catch(e){var e;eval('function e(){return 7}');if(e!==1)return false}return e()===7}f()",
    "function f(){try{throw 1}catch(e){var e;eval('\"use strict\";var e=7');if(e!==1)return false}return e===undefined}f()"
]){const r=run(text);check(r.type==='normal'&&r.value.kind==='boolean'&&r.value.value,text);}
for(const text of ["try{}catch(e){let e}","try{}catch(e){const e=1}","try{}catch(e){function e(){}}","let e;try{}catch(e){var e}","try{}catch({e}){var e}","try{}catch(e){{let e;var e}}"])
    check(prepareBoundedScript({id:'invalid-catch',text},new Realm((_line:string)=>{},'script')).kind!=='ready',text);
check(parseDeclarationPlan({id:'legacy',text:'\"use strict\";try{}catch(e){var e}'}).kind==='blocked','legacy declaration boundary');
check(auditBoundedScriptNumericAssignments('42=1;try{}catch(e){var e}').kind==='eligible','catch var no longer vetoes numeric audit');
const limited=run('try{throw 1}catch(e){var e;while(true){}}',100);
check(limited.type==='throw'&&limited.origin.kind==='resource-limit','fatal budget');
console.log('Catch var declarations passed');
