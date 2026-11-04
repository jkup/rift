import type {Builtin,OperationContext,Value,Completion} from '../../../../src/runtime.js';
import type {Realm} from '../../../../src/realm.js';
import type {Location} from '../../../../src/syntax.js';
type Permit={context:OperationContext;realm:Realm;target:Builtin;receiver:Value;args:Value[];loc:Location;used:boolean};
let pending:Permit|null=null;
// Revised proposal: false means no authorization and makes no state change.
export function consume(context:OperationContext,realm:Realm,target:Builtin,receiver:Value,args:Value[],loc:Location):boolean {
    const p=pending;
    if(p===null || p.used || p.context!==context || p.realm!==realm || p.target!==target || p.receiver!==receiver || p.args!==args || p.loc!==loc)return false;
    p.used=true;
    return true;
}
// Harness-only pending-tuple control, never proposed as an export in production.
export function attempt(context:OperationContext,realm:Realm,target:Builtin,receiver:Value,args:Value[],loc:Location,action:()=>Completion):Completion {
    const saved=pending;
    pending={context,realm,target,receiver,args,loc,used:false};
    try{return action();}finally{pending=saved;}
}
