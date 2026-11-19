import { Realm } from "../../../../src/realm.js";
import { prepareBoundedScript } from "../../../../src/script-record.js";
import { createScriptSession, evaluateScript } from "../../../../src/script-execution.js";
import { normal, UNDEFINED, type Value } from "../../../../src/runtime.js";

// No map call or new species identity: reproduce the accepted design's missing
// nonstrict body-environment tick using an ordinary accessor and guarded probe.
for (const limit of [3,4,5,6,7,8]) {
    const r=new Realm((_line:string)=>{},"script");
    const setup=prepareBoundedScript({id:"getter",text:"function g(){return undefined;}"},r);
    if(setup.kind!=="ready")throw new Error("setup");
    evaluateScript(createScriptSession(),setup.record);
    const descriptor=r.globalObject.getOwnProperty("g");
    if(descriptor===undefined||descriptor.kind!=="data")throw new Error("getter");
    const holder=r.createObject();holder.bootstrapDefine("x",{get:descriptor.value,configurable:true});
    const receiver:Value={kind:"object",object:holder};
    const probe=r.createBuiltin("probe",1,(_receiver,_args,ctx,loc)=>holder.internalGet("x",receiver,ctx,loc));
    r.defineScriptGlobal("probe",{value:{kind:"object",object:probe},configurable:true});
    const prepared=prepareBoundedScript({id:"outer",text:"probe(7);\n"},r);
    if(prepared.kind!=="ready")throw new Error("outer");
    const session=createScriptSession({maxSteps:limit,maxCalls:64});
    const result=evaluateScript(session,prepared.record),state=session.inspect(),last=state.lastAbrupt;
    if(state.active!==null||state.calls!==0||state.depth!==0)throw new Error("cleanup");
    console.log("limit="+limit+" steps="+state.steps+" result="+result.completion.type+" source="+(last===null?"none":last.unitId+":"+last.loc.column));
}
