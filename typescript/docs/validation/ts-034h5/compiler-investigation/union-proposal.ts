import { GuestObject } from "../../../../src/runtime.js";
import { Realm } from "../../../../src/realm.js";
import { prepareBoundedScript } from "../../../../src/script-record.js";
import { createScriptSession, evaluateScript } from "../../../../src/script-execution.js";
function matches(o: GuestObject): boolean {
    const callable = o.callable;
    const constructorSlot = o.constructorSlot;
    if (callable === null || callable.kind !== "script-guest" || constructorSlot === null) return false;
    return constructorSlot === callable;
}
const realm = new Realm((_line: string) => {}, "script");
const p = prepareBoundedScript({id:"H",text:"function C(){}"},realm);
if(p.kind!=="ready")throw new Error("prepare");
evaluateScript(createScriptSession(),p.record);
const d=realm.globalObject.getOwnProperty("C");
if(d?.kind!=="data" || d.value.kind!=="object")throw new Error("C");
console.log(matches(d.value.object), matches(realm.functionPrototype), matches(new GuestObject()));
