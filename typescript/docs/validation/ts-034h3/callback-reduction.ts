import { Realm } from '../../../src/realm.js';
import { normal, type Value, type ValueCompletion, type OperationContext } from '../../../src/runtime.js';
import type { Location } from '../../../src/syntax.js';
function wrap(r:Realm, cb:(t:Value,a:Value[],c:OperationContext,l:Location)=>ValueCompletion):Value {
 return {kind:'object',object:r.createBuiltin('callback',0,cb)};
}
const r=new Realm((_line:string)=>{},'script');
console.log(wrap(r,(_t,_a,_c,_l):ValueCompletion=>normal()).kind);
