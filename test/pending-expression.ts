import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import { applyBinaryOperator } from "../src/binary-operator.js";
import {
    getReferenceValue,
    putReferenceValue,
    type EvaluationReference,
} from "../src/evaluation-reference.js";
import {
    UNDEFINED,
    normal,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    source: string,
    realm: Realm,
    session: ScriptSession = createScriptSession(),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "pending-expression", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind);
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "session restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function expect(source: string, realm: Realm): void {
    const result = run(source, realm);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        source,
    );
}

// Probe-only pending state: the guest AST itself still executes synchronously.
class PendingCompound {
    constructor(
        readonly reference: EvaluationReference,
        readonly left: Value,
        readonly realm: Realm,
    ) {}
    finish(right: ValueCompletion, current: OperationContext, loc: Location): ValueCompletion {
        if (right.type === "throw") {
            return right;
        }
        const context: OperationContext = {
            realm: this.realm,
            call: current.call,
            tick: current.tick,
            construct: current.construct,
            enqueueJob: current.enqueueJob,
        };
        const value = applyBinaryOperator("+", this.left, right.value, context, loc);
        if (value.type === "throw") {
            return value;
        }
        const written = putReferenceValue(context, this.reference, value.value, loc);
        if (written.type !== "normal" && written.type !== "throw") {
            throw new Error("invalid PutValue completion");
        }
        return written.type === "throw" ? written : normal(written.value);
    }
}
let pending: PendingCompound | null = null;
let injected: ValueCompletion | null = null;
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
define(A, "capture", {
    kind: "object",
    object: A.createBuiltin(
        "capture",
        2,
        (
            _receiver: Value,
            args: Value[],
            context: OperationContext,
            loc: Location,
        ): ValueCompletion => {
            const reference: EvaluationReference = {
                kind: "script-property",
                strict: true,
                reference: { kind: "property", base: args[0], key: args[1], loc },
            };
            const value = getReferenceValue(context, reference, loc);
            if (value.type === "throw") {
                return value;
            }
            if (value.type !== "normal") {
                throw new Error("invalid GetValue completion");
            }
            pending = new PendingCompound(reference, value.value, context.realm);
            return normal();
        },
    ),
});
define(B, "finish", {
    kind: "object",
    object: B.createBuiltin(
        "finish",
        1,
        (
            _receiver: Value,
            args: Value[],
            context: OperationContext,
            loc: Location,
        ): ValueCompletion => {
            const operation = pending;
            if (operation === null) {
                throw new Error("missing pending operation");
            }
            pending = null;
            const right =
                injected === null ? normal(args.length === 0 ? UNDEFINED : args[0]) : injected;
            injected = null;
            const result = operation.finish(right, context, loc);
            check(context.realm === B, "resume caller Realm restored");
            return result;
        },
    ),
});
const setupSession = createScriptSession(),
    firstSession = createScriptSession(),
    secondSession = createScriptSession();
check(
    run(
        'var trace="";var observed=0;var receiverOK=false;var operand={valueOf:function(){trace+="old";return 1;}};var target={get x(){trace+="G";return operand;},set x(v){trace+="old-set";}};var key={toString:function(){trace+="K";return "x";}};function right(){trace+="R";key.toString=function(){trace+="BAD";return "bad";};operand.valueOf=function(){trace+="V";return 10;};Object.defineProperty(target,"x",{set:function(v){trace+="S";observed=v;receiverOK=this===target;},configurable:true});return 2;}',
        A,
        setupSession,
    ).type === "normal",
    "setup",
);
define(B, "right", own(A, "right"));
check(run("capture(target,key);", A, firstSession).type === "normal", "capture left");
expect('trace==="KG";', A);
const firstSteps = firstSession.inspect().steps,
    setupSteps = setupSession.inspect().steps;
const result = run("finish(right());", B, secondSession);
check(
    result.type === "normal" && result.value.kind === "number" && result.value.value === 12,
    "captured value/current coercion",
);
check(
    pending === null &&
        firstSession.inspect().steps === firstSteps &&
        setupSession.inspect().steps === setupSteps &&
        secondSession.inspect().steps > 0,
    "current budget and consumed state",
);
expect('trace==="KGRVS" && observed===12 && receiverOK;', A);

check(run('trace="";capture(target,"x");', A).type === "normal", "abrupt capture");
const failure = run("throw target;", A);
check(failure.type === "throw", "throw setup");
injected = failure;
check(run("finish();", B) === failure && pending === null, "abrupt RHS identity");
expect('trace==="G" && observed===12;', A);

check(run('capture({x:Symbol("x")},"x");', A).type === "normal", "symbol capture");
const symbolFailure = run("finish(1);", B);
check(
    symbolFailure.type === "throw" &&
        symbolFailure.value.kind === "object" &&
        symbolFailure.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "captured operation error Realm",
);
check(pending === null, "error consumes pending state");

check(
    run(
        'var frozen={};Object.defineProperty(frozen,"x",{value:1,writable:false});capture(frozen,"x");',
        A,
    ).type === "normal",
    "frozen capture",
);
const writeFailure = run("finish(2);", B);
check(
    writeFailure.type === "throw" &&
        writeFailure.value.kind === "object" &&
        writeFailure.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "strict write error Realm",
);
expect("frozen.x===1;", A);

check(
    run('operand.valueOf=function(){while(true){}};capture({x:operand},"x");', A, firstSession)
        .type === "normal",
    "budget capture",
);
const beforeBudget = firstSession.inspect().steps,
    limited = createScriptSession({ maxSteps: 60, maxCalls: 16 });
const stopped = run("finish(1);", B, limited);
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "current budget stop");
check(
    pending === null &&
        firstSession.inspect().steps === beforeBudget &&
        limited.inspect().steps > 60,
    "resource state cleanup",
);
console.log("pending expression state passed");
