import { Realm } from '../../../src/realm.js';
import { normal, type Builtin, type Value, type ValueCompletion, type OperationContext } from '../../../src/runtime.js';
import type { Location } from '../../../src/syntax.js';
function wrap(r:Realm, cb:Builtin):Value {
 return {kind:'object',object:r.createBuiltin('callback',0,cb)};
}
function stage(r:Realm, cb:(t:Value,a:Value[],c:OperationContext,l:Location)=>ValueCompletion):Value { return wrap(r,cb); }
const r=new Realm((_line:string)=>{},'script');
console.log(stage(r,(_t,_a,_c,_l):ValueCompletion=>normal()).kind);
