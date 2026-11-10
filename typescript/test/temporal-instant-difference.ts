import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "instant-difference", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'new Temporal.Instant(1n).until(new Temporal.Instant(3723004005007n)).toString()==="PT3723.004005006S"',
    'new Temporal.Instant(1n).until(new Temporal.Instant(3723004005007n),{largestUnit:"hour"}).toString()==="PT1H2M3.004005006S"',
    'new Temporal.Instant(1n).since(new Temporal.Instant(3723004005007n),{largestUnit:"minute"}).toString()==="-PT62M3.004005006S"',
    'new Temporal.Instant(0n).until("1970-01-02T01:00:00Z",{smallestUnit:"hour"}).toString()==="PT25H"',
    'new Temporal.Instant(0n).until("1970-01-01T00:00:01+00:00").seconds===1',
    'new Temporal.Instant(-8640000000000000000000n).until(new Temporal.Instant(8640000000000000000000n)).seconds===17280000000000',
    'new Temporal.Instant(0n).until(new Temporal.Instant(9007199254740993n),{largestUnit:"nanosecond"}).nanoseconds===9007199254740992',
    'new Temporal.Instant(0n).until(new Temporal.Instant(9007199254740993n)).toString()==="PT9007199.254740993S"',
    'var i=new Temporal.Instant(0n),r=i.until(i);r.blank&&Object.getPrototypeOf(r)===Temporal.Duration.prototype',
    'class I extends Temporal.Instant{}Object.getPrototypeOf(new I(0n).until(new I(1n)))===Temporal.Duration.prototype',
    'var i=new Temporal.Instant(1n);Object.defineProperty(i,"epochNanoseconds",{get(){throw 1}});Object.defineProperty(i,"constructor",{get(){throw 2}});i.until(i).blank',
    'var log="";new Temporal.Instant(0n).until({toString(){log+="o";return "1970-01-01T00:00:01Z"}},{get largestUnit(){log+="l"},get roundingIncrement(){log+="i"},get roundingMode(){log+="r"},get smallestUnit(){log+="s"}}).seconds===1&&log==="olirs"',
    'var touched=false,ok=false;try{new Temporal.Instant(0n).until("bad",{get largestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'new Temporal.Instant(0n).until(new Temporal.Instant(31000000000n),{smallestUnit:"second",roundingIncrement:30,roundingMode:"ceil"}).seconds===60',
]) passes(text);
const modes=['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const positive=[2,1,2,1,2,1,2,1,2],negative=[-1,-2,-2,-1,-1,-2,-2,-1,-2];
for (let i=0;i<modes.length;i++) {
    passes('new Temporal.Instant(0n).until(new Temporal.Instant(1500000000n),{smallestUnit:"second",roundingMode:"'+modes[i]+'"}).seconds==='+positive[i]);
    passes('new Temporal.Instant(0n).since(new Temporal.Instant(1500000000n),{smallestUnit:"second",roundingMode:"'+modes[i]+'"}).seconds==='+negative[i]);
    passes('new Temporal.Instant(0n).until(new Temporal.Instant(-1500000000n),{smallestUnit:"second",roundingMode:"'+modes[i]+'"}).seconds==='+negative[i]);
}
for (const method of ["until","since"]) {
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
    passes('var touched=false,ok=false;try{Temporal.Instant.prototype.'+method+'.call({}, {toString(){touched=true;return "bad"}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
    for (const value of ['undefined','null','1','1n'])
        passes('var ok=false;try{new Temporal.Instant(0n).'+method+'('+value+')}catch(e){ok=e instanceof TypeError}ok');
    for (const options of ['{largestUnit:"day"}','{smallestUnit:"day"}','{smallestUnit:"second",roundingIncrement:60}','{largestUnit:"second",smallestUnit:"hour"}'])
        passes('var ok=false;try{new Temporal.Instant(0n).'+method+'(new Temporal.Instant(0n),'+options+')}catch(e){ok=e instanceof RangeError}ok');
    const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
    const fn=run('Temporal.Instant.prototype.'+method,defining);
    if(fn.type!=="normal")throw new Error("method lookup");
    calling.defineScriptGlobal("difference",{value:fn.value});
    const result=run('difference.call(new Temporal.Instant(0n),new Temporal.Instant(1n))',calling);
    check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalDurationPrototype,"defining Realm result");
    const failed=run('difference.call(new Temporal.Instant(0n),"bad")',calling);
    check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("RangeError"),"defining Realm error");
}
console.log("temporal instant difference passed");
