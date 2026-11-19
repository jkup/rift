import { PrivateName, PrivateEnvironment } from "../src/private-names.js";
import { declarePrivateName, resolvePrivateName, privateFieldAdd, privateMethodOrAccessorAdd, privateGet, privateSet, privateHas } from "../src/private-elements.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, resourceFailure, languageFailure, type Value, type ValueCompletion, type OperationContext, type Builtin, type Completion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const loc = { line: 3, column: 7 }, realm = new Realm((_line: string) => {}, "script");
let calls = 0;
function context(limit = 1000, owner = realm): OperationContext {
    let work = 0;
    const result: OperationContext = {
        realm: owner,
        tick: location => ++work > limit ? resourceFailure("steps", work, limit, "private operation budget", location) : normal(),
        call: (callee, receiver, args, location): ValueCompletion => {
            calls++;
            if (callee.kind !== "object" || callee.object.callable?.kind !== "builtin") throw new Error("expected test builtin");
            const completion = callee.object.callable.invoke(receiver, args, result, location);
            if (completion.type !== "normal" && completion.type !== "throw") throw new Error("invalid builtin result");
            return completion.type === "throw" ? completion : normal(completion.value);
        },
    };
    return result;
}
function value(object: GuestObject): Value { return { kind: "object", object }; }
function builtin(invoke: Builtin): Value { return value(new GuestObject(null, false, { kind: "builtin", realm, initialName: null, invoke })); }
function number(result: ValueCompletion, expected: number): void {
    check(result.type === "normal" && result.value.kind === "number" && result.value.value === expected, "numeric result");
}
function typeError(result: ValueCompletion, owner = realm): void {
    check(result.type === "throw" && result.diagnostic.name === "TypeError" && result.diagnostic.loc === loc
        && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "Realm TypeError");
}
function stopped(result: ValueCompletion): void {
    check(result.type === "throw" && result.origin.kind === "resource-limit", "resource completion");
}
const outer = new PrivateEnvironment(), inner = new PrivateEnvironment(outer), sibling = new PrivateEnvironment();
const first = declarePrivateName(outer, "#x", context(), loc), second = declarePrivateName(sibling, "#x", context(), loc);
if (first.type !== "normal" || second.type !== "normal") throw new Error("declaration");
check(first.value !== second.value, "same spelling has fresh identity");
const inherited = resolvePrivateName(inner, "#x", context(), loc);
check(inherited.type === "normal" && inherited.value === first.value, "lexical lookup");
const shadow = declarePrivateName(inner, "#x", context(), loc);
if (shadow.type !== "normal") throw new Error("shadow declaration");
const resolved = resolvePrivateName(inner, "#x", context(), loc);
check(resolved.type === "normal" && resolved.value === shadow.value && shadow.value !== first.value, "lexical shadowing");
const blockedName = declarePrivateName(inner, "#blocked", context(0), loc);
check(blockedName.type === "throw" && inner.ownName("#blocked") === undefined, "budget before name insertion");
const deep = new PrivateEnvironment(new PrivateEnvironment(outer));
check(resolvePrivateName(deep, "#x", context(2), loc).type === "throw", "lookup charges each environment");
check(resolvePrivateName(deep, "#x", context(3), loc).type === "normal", "lookup exact budget");
let duplicateDeclaration = false, unresolved = false;
try { inner.declare("#x"); } catch { duplicateDeclaration = true; }
try { resolvePrivateName(inner, "#unknown", context(), loc); } catch { unresolved = true; }
check(duplicateDeclaration && unresolved, "validated syntax invariants fail closed");

const name = first.value, a = new GuestObject(), b = new GuestObject(a), av = value(a), bv = value(b);
a.preventExtensions();
check(privateFieldAdd(a, name, { kind: "number", value: 1 }, context(), loc).type === "normal", "private field on nonextensible receiver");
number(privateGet(av, name, context(), loc), 1);
typeError(privateGet(bv, name, context(), loc));
typeError(privateGet(av, second.value, context(), loc));
typeError(privateFieldAdd(a, name, { kind: "number", value: 9 }, context(), loc));
number(privateGet(av, name, context(), loc), 1);
check(a.ownPropertyKeys().length === 0 && a.getOwnProperty("#x") === undefined, "private storage is not properties");
check(privateFieldAdd(b, name, { kind: "number", value: 2 }, context(), loc).type === "normal", "same name on another receiver");
check(privateSet(av, name, { kind: "number", value: 3 }, context(), loc).type === "normal", "field update");
number(privateGet(av, name, context(), loc), 3);number(privateGet(bv, name, context(), loc), 2);
const present = privateHas(av, name, context(), loc), absent = privateHas(av, second.value, context(), loc);
check(present.type === "normal" && present.value && absent.type === "normal" && !absent.value, "private presence");
typeError(privateGet(UNDEFINED, name, context(), loc));
const primitive = privateHas({ kind: "number", value: 1 }, name, context(), loc);
check(primitive.type === "throw" && primitive.diagnostic.name === "TypeError", "private in does not box primitives");

const accessorName = new PrivateName("#accessor"), methodName = new PrivateName("#method");
let stored: Value = UNDEFINED;
const getter = builtin((receiver, args, active, location) => {
    check(receiver === av && args.length === 0 && active.realm === realm && location === loc, "getter call arguments");return normal(stored);
});
const setter = builtin((receiver, args, _active, location) => {
    check(receiver === av && args.length === 1 && location === loc, "setter call arguments");stored = args[0];return normal({ kind: "number", value: 99 });
});
check(privateMethodOrAccessorAdd(a, accessorName, { kind: "accessor", get: getter, set: setter }, context(), loc).type === "normal", "accessor insertion");
const set = privateSet(av, accessorName, { kind: "number", value: 8 }, context(), loc);
check(set.type === "normal" && set.value.kind === "undefined", "setter return is ignored");
number(privateGet(av, accessorName, context(), loc), 8);check(calls === 2, "one call per accessor operation");
check(privateMethodOrAccessorAdd(a, methodName, { kind: "method", value: getter }, context(), loc).type === "normal", "method insertion");
const method = privateGet(av, methodName, context(), loc);
check(method.type === "normal" && method.value === getter && calls === 2, "method retrieval does not call");
typeError(privateSet(av, methodName, UNDEFINED, context(), loc));
typeError(privateMethodOrAccessorAdd(a, methodName, { kind: "method", value: setter }, context(), loc));
const missing = new PrivateName("#missing-halves");
privateMethodOrAccessorAdd(a, missing, { kind: "accessor", get: UNDEFINED, set: UNDEFINED }, context(), loc);
typeError(privateGet(av, missing, context(), loc));typeError(privateSet(av, missing, UNDEFINED, context(), loc));
const abruptName = new PrivateName("#abrupt"), abrupt = languageFailure(realm, "RangeError", "getter error", loc);
const throwing = builtin((_receiver, _args, _active, _location): Completion => abrupt);
privateMethodOrAccessorAdd(a, abruptName, { kind: "accessor", get: throwing, set: throwing }, context(), loc);
check(privateGet(av, abruptName, context(), loc) === abrupt && privateSet(av, abruptName, UNDEFINED, context(), loc) === abrupt, "accessor abrupt completion identity");

const blocked = new PrivateName("#blocked");
stopped(privateFieldAdd(a, blocked, UNDEFINED, context(0), loc));check(a.findPrivateElement(blocked) === undefined, "budget before field insertion");
stopped(privateMethodOrAccessorAdd(a, blocked, { kind: "method", value: getter }, context(0), loc));check(a.findPrivateElement(blocked) === undefined, "budget before method insertion");
check(privateHas(av, name, context(0), loc).type === "throw", "presence lookup budget");
stopped(privateSet(av, name, UNDEFINED, context(0), loc));number(privateGet(av, name, context(), loc), 3);
const before = calls;stopped(privateGet(av, accessorName, context(0), loc));stopped(privateSet(av, accessorName, UNDEFINED, context(0), loc));check(calls === before, "budget before accessor call");
const foreign = new Realm((_line: string) => {}, "script");typeError(privateGet(bv, accessorName, context(100, foreign), loc), foreign);
console.log("private elements passed");
