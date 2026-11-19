import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import { PrivateEnvironment } from "../src/private-names.js";
import { normal, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
    session: ScriptSession = createScriptSession(),
): Value {
    const prepared = prepareBoundedScript({ id: "private-capture", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const result = evaluateScript(session, prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("execute " + text);
    }
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restoration");
    return result.value;
}
function item(value: Value, name: string): Value {
    if (value.kind !== "object") {
        throw new Error("expected object");
    }
    const descriptor = value.object.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("expected data property " + name);
    }
    return descriptor.value;
}
function environment(value: Value): PrivateEnvironment | null {
    if (value.kind !== "object" || value.object.callable?.kind !== "script-guest") {
        throw new Error("expected Script callable");
    }
    return value.object.callable.privateEnvironment;
}
check(environment(run("function f(){} f")) === null, "global function has no private environment");
const captured = run(`class C {
    field = ()=>{};
    static field = function(){};
    constructor(value=()=>{}) { this.parameter=value; function declared(){} this.declared=declared; }
    method(){ return ()=>{}; }
    blocks(){ { function block(){} return block; } }
    static { function declared(){} this.declared=declared; this.block=()=>{}; }
    direct(){ return eval("()=>{}"); }
    evalDeclaration(){ return eval("function f(){} f"); }
    indirect(){ return (0,eval)("()=>{}"); }
    dynamic(){ return Function("return ()=>{}")(); }
}
var c=new C(); [C,C.prototype.method,c.field,C.field,c.parameter,c.declared,c.method(),c.blocks(),C.declared,C.block,c.direct(),c.evalDeclaration(),c.indirect(),c.dynamic()]`);
const classEnvironment = environment(item(captured, "0"));
check(
    classEnvironment instanceof PrivateEnvironment && classEnvironment.outer === null,
    "class creates private environment",
);
for (let index = 1; index <= 11; index++) {
    check(
        environment(item(captured, String(index))) === classEnvironment,
        "captured class environment " + index,
    );
}
check(
    environment(item(captured, "12")) === null && environment(item(captured, "13")) === null,
    "indirect eval and Function use root environment",
);
const nested = run(
    "class C { make(){var heritage;var D=class extends (heritage=()=>{},Object) { method(){} };return [heritage,D,D.prototype.method];} } [C,new C().make()]",
);
const outer = environment(item(nested, "0")),
    innerValues = item(nested, "1"),
    inner = environment(item(innerValues, "1"));
check(
    outer !== null && inner !== null && inner !== outer && inner.outer === outer,
    "nested private scope",
);
check(
    environment(item(innerValues, "0")) === outer && environment(item(innerValues, "2")) === inner,
    "heritage precedes inner private scope",
);
const fresh = run("function make(){return class {m(){}}} [make(),make()]");
check(
    environment(item(fresh, "0")) !== environment(item(fresh, "1")),
    "fresh identity per evaluation",
);
const suspended = run(
    "class C{*make(){return class extends (yield Object){[yield 'key'](){}}}}var g=new C().make();g.next();g.next(Object);var D=g.next('key').value;[C,D,D.prototype.key]",
);
const suspendedOuter = environment(item(suspended, "0")),
    suspendedInner = environment(item(suspended, "1"));
check(
    suspendedInner !== null &&
        suspendedInner.outer === suspendedOuter &&
        environment(item(suspended, "2")) === suspendedInner,
    "suspended heritage and computed key retain inner scope",
);
const generator = run(
    "class C{*g(){yield ()=>{};return ()=>{}}}var g=new C().g();[C,g.next().value,g.next().value]",
);
check(
    environment(item(generator, "0")) === environment(item(generator, "1")) &&
        environment(item(generator, "1")) === environment(item(generator, "2")),
    "generator resumes captured environment",
);
const cancelled = run(
    "var out;class C{*g(){try{return class{[yield 1](){}}}finally{out=()=>{}}}}var g=new C().g();g.next();g.return();[C,out]",
);
check(
    environment(item(cancelled, "0")) === environment(item(cancelled, "1")),
    "cancelled class key restores enclosing private environment",
);
const asyncRealm = new Realm((_line: string) => {}, "script");
const jobs = createScriptSession();
run(
    "var out;class C{async m(){await 1;return ()=>{}}async *g(){await 1;yield ()=>{}}}var c=new C();Promise.all([c.m(),c.g().next()]).then(v=>out=[C,v[0],v[1].value]);",
    asyncRealm,
    jobs,
);
const drained = drainScriptJobs(jobs);
check(!drained.fatal && drained.failures.length === 0, "drain async capture");
const asyncValues = item({ kind: "object", object: asyncRealm.globalObject }, "out");
check(
    environment(item(asyncValues, "0")) === environment(item(asyncValues, "1")) &&
        environment(item(asyncValues, "1")) === environment(item(asyncValues, "2")),
    "async and async generator capture",
);
const foreign = new Realm((_line: string) => {}, "script");
foreign.defineScriptGlobal("method", { value: item(captured, "1") });
check(
    environment(run("method()", foreign)) === classEnvironment,
    "foreign caller preserves defining private environment",
);
const inspected: (PrivateEnvironment | null)[] = [],
    inspectingRealm = new Realm((_line: string) => {}, "script"),
    inspectingSession = createScriptSession();
const probe = inspectingRealm.createBuiltin(
    "probe",
    0,
    (
        _receiver: Value,
        _args: Value[],
        _context: OperationContext,
        _loc: Location,
    ): ValueCompletion => {
        const active = inspectingSession.inspect().active;
        if (active === null) {
            throw new Error("missing active frame");
        }
        inspected.push(active.privateEnvironment);
        return normal();
    },
);
inspectingRealm.defineScriptGlobal("probe", { value: { kind: "object", object: probe } });
const prepared = prepareBoundedScript(
    {
        id: "private-inspection",
        text: "probe();class C{static{probe()}m(){probe();eval('probe()');(0,eval)('probe()');probe();}}new C().m();probe();try{class D{static{probe();throw 1}}}catch(e){}probe();C",
    },
    inspectingRealm,
);
if (prepared.kind !== "ready") {
    throw new Error("inspection preparation");
}
const result = evaluateScript(inspectingSession, prepared.record).completion;
if (result.type !== "normal") {
    throw new Error("inspection execution");
}
const inspectedClass = environment(result.value);
check(
    inspected.length === 9 &&
        inspected[0] === null &&
        inspected[1] === inspectedClass &&
        inspected[2] === inspectedClass &&
        inspected[3] === inspectedClass &&
        inspected[4] === null &&
        inspected[5] === inspectedClass &&
        inspected[6] === null,
    "exact private frame restoration around eval",
);
check(
    inspected[7] !== null &&
        inspected[7] !== inspectedClass &&
        inspected[7]?.outer === null &&
        inspected[8] === null,
    "abrupt class initialization restores private environment",
);
check(inspectingSession.inspect().active === null, "inspection frame restored");
console.log("private environment capture passed");
