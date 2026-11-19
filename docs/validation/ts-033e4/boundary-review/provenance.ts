import {prepare, materialize} from './record-facade.js';
import {createSession, evaluate} from './session-facade.js';
function check(ok: boolean): void { if (!ok) throw new Error("assertion"); }
const a=prepare("same",7), b=prepare("same",11), f=materialize(a), g=materialize(b), s=createSession();
check(a !== b && a.inspect().id === b.inspect().id);
check(evaluate(s,a,f)===7 && evaluate(s,b,g)===11);
let rejected=false;
try { evaluate(s,b,f); } catch { rejected=true; }
check(rejected && s.inspect()===2);
const copy=a.inspect(); copy.id="changed";
check(a.inspect().id==="same" && evaluate(s,a,f)===7 && s.inspect()===3);
console.log("PASS facade private-record identity equal-id wrong-record rejected");
