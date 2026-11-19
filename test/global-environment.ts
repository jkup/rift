import { validatePropertyDescriptorUpdate } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import {
    GlobalEnvironment,
    resolveStrictGlobalBinding,
    getStrictGlobalBinding,
    putStrictGlobalBinding,
    type StrictGlobalReference,
} from "../src/global-environment.js";
import {
    GuestObject,
    UNDEFINED,
    failure,
    normal,
    sameValue,
    type Value,
    type ValueCompletion,
    type InternalBooleanCompletion,
    type OperationContext,
    type PropertyKey,
    type PropertyDescriptorUpdate,
    type ThrowCompletion,
} from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function number(value: number): Value {
    return { kind: "number", value };
}
function value(result: ValueCompletion, expected: Value): void {
    check(result.type === "normal" && sameValue(result.value, expected), "value mismatch");
}
function unused(result: ValueCompletion): void {
    value(result, UNDEFINED);
}
function bool(result: InternalBooleanCompletion, expected: boolean): void {
    check(result.type === "normal" && result.value === expected, "boolean mismatch");
}
function error(result: ValueCompletion, name: string, loc: Location): void {
    check(
        result.type === "throw" &&
            result.diagnostic.name === name &&
            result.diagnostic.phase === "runtime" &&
            result.diagnostic.loc.line === loc.line &&
            result.diagnostic.loc.column === loc.column &&
            result.origin.kind === "engine-diagnostic",
        "error name/location/origin",
    );
}
function descriptor(
    object: GuestObject,
    name: string,
    expected: Value,
    w: boolean,
    e: boolean,
    c: boolean,
): void {
    const d = object.getOwnProperty(name);
    check(
        d !== undefined &&
            d.kind === "data" &&
            sameValue(d.value, expected) &&
            d.writable === w &&
            d.enumerable === e &&
            d.configurable === c,
        "descriptor mismatch",
    );
}
function capture(env: GlobalEnvironment, name: string, loc: Location): StrictGlobalReference {
    const result = resolveStrictGlobalBinding(env, name, loc);
    if (result.type === "throw") {
        throw new Error("unexpected resolve failure");
    }
    return result.reference;
}
function define(
    object: GuestObject,
    name: string,
    v: Value,
    w: boolean = true,
    e: boolean = true,
    c: boolean = true,
): void {
    object.bootstrapDefine(name, { value: v, writable: w, enumerable: e, configurable: c });
}

// Fault injection validates only the dispatch contract. It does not implement a
// guest exotic object. Every operation records the exact receiver/context/location.
class FaultObject extends GuestObject {
    trace = "";
    mode = "";
    readonly abrupt: ThrowCompletion;
    readonly hostFault = new Error("host sentinel");
    constructor(
        readonly context: OperationContext,
        readonly loc: Location,
    ) {
        super();
        this.abrupt = failure("Sentinel", "original", { line: 91, column: 23 });
    }
    private visit(operation: string, loc: Location): void {
        this.trace += operation;
        check(loc.line === this.loc.line && loc.column === this.loc.column, "dispatch location");
        if (this.mode === "host" + operation) {
            throw this.hostFault;
        }
    }
    override internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.visit("H", loc);
        return this.mode === "H" ? this.abrupt : super.internalHasProperty(key, loc);
    }
    override internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): ValueCompletion {
        this.visit("G", loc);
        check(receiver.kind === "object" && receiver.object === this, "get receiver");
        return this.mode === "G" ? this.abrupt : super.internalGet(key, receiver, context, loc);
    }
    override internalSet(
        key: PropertyKey,
        v: Value,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): InternalBooleanCompletion {
        this.visit("S", loc);
        check(
            context === this.context && receiver.kind === "object" && receiver.object === this,
            "set context/receiver",
        );
        if (this.mode === "S") {
            return this.abrupt;
        }
        if (this.mode === "falseS") {
            return { type: "normal", value: false };
        }
        return super.internalSet(key, v, receiver, context, loc);
    }
    override defineOwnProperty(
        key: PropertyKey,
        desc: PropertyDescriptorUpdate,
        context: OperationContext,
        loc: Location,
    ): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        this.visit("D", loc);
        check(context === this.context, "define context");
        if (this.mode === "D") {
            return this.abrupt;
        }
        if (this.mode === "falseD") {
            return { type: "normal", value: false };
        }
        return super.defineOwnProperty(key, desc, context, loc);
    }
}

const realmA = new Realm((_line: string) => {});
const realmB = new Realm((_line: string) => {});
let calls = 0;
let ticks = 0;
const context: OperationContext = {
    realm: realmA,
    call: (_callee, _receiver, _args, _loc): ValueCompletion => {
        calls++;
        return normal();
    },
    tick: (_loc): ValueCompletion => {
        ticks++;
        return normal();
    },
};
const contextB: OperationContext = { realm: realmB, call: context.call, tick: context.tick };
const lines = readFileSync(process.argv[2], "utf8").trim().split("\n");
for (const line of lines) {
    const fields = line.trim().split("|");
    const id = fields[0],
        name = fields[1];
    const input = number(Number(fields[2]));
    const loc = { line: Number(fields[3]), column: Number(fields[4]) };
    check(name.length > 0 && loc.line === 17 && loc.column === 9, "runtime fixture");
    const object = new GuestObject();
    const env = new GlobalEnvironment(object, object);
    switch (id) {
        case "H01": {
            bool(env.hasBinding(name, loc), false);
            unused(env.createMutableBinding(name, loc, null));
            bool(env.hasBinding(name, loc), true);
            check(env.hasLexicalDeclaration(name), "lexical presence");
            const ref = capture(env, name, loc);
            error(getStrictGlobalBinding(ref, context), "ReferenceError", loc);
            error(putStrictGlobalBinding(ref, input, context), "ReferenceError", loc);
            error(env.getBindingValue(name, context, loc), "ReferenceError", loc);
            unused(env.initializeBinding(name, input, context, loc));
            value(getStrictGlobalBinding(ref, context), number(7));
            unused(putStrictGlobalBinding(ref, number(8), context));
            value(env.getBindingValue(name, context, loc), number(8));
            check(object.getOwnProperty(name) === undefined, "lexical leaked to object");
            break;
        }
        case "H02": {
            const temporary = name + "temporary";
            unused(env.createGlobalVarBinding(temporary, context, loc, true));
            descriptor(object, temporary, UNDEFINED, true, true, true);
            unused(env.setMutableBinding(temporary, input, context, loc));
            unused(env.createGlobalVarBinding(temporary, context, loc));
            descriptor(object, temporary, input, true, true, true);
            bool(env.deleteBinding(temporary, context, loc), true);
            check(object.getOwnProperty(temporary) === undefined, "temporary var deletion");
            bool(env.canDeclareGlobalVar(name), true);
            unused(env.createGlobalVarBinding(name, context, loc));
            descriptor(object, name, UNDEFINED, true, true, false);
            unused(env.setMutableBinding(name, input, context, loc));
            unused(env.createGlobalVarBinding(name, context, loc));
            descriptor(object, name, number(7), true, true, false);
            check(!env.hasLexicalDeclaration(name), "var is not lexical");
            define(object, name + "fixed", number(3), false, false, false);
            unused(env.createGlobalVarBinding(name + "fixed", context, loc));
            descriptor(object, name + "fixed", number(3), false, false, false);
            break;
        }
        case "H03": {
            const first: Value = { kind: "object", object: realmA.createObject() };
            const second: Value = { kind: "object", object: realmB.createObject() };
            const temporary = name + "temporary";
            unused(env.createGlobalFunctionBinding(temporary, first, context, loc, true));
            descriptor(object, temporary, first, true, true, true);
            unused(env.createGlobalFunctionBinding(temporary, second, context, loc, true));
            descriptor(object, temporary, second, true, true, true);
            bool(env.deleteBinding(temporary, context, loc), true);
            check(object.getOwnProperty(temporary) === undefined, "temporary function deletion");
            unused(env.createGlobalFunctionBinding(temporary, first, context, loc));
            unused(env.createGlobalFunctionBinding(temporary, second, context, loc, true));
            descriptor(object, temporary, second, true, true, false);
            bool(env.deleteBinding(temporary, context, loc), false);
            bool(env.canDeclareGlobalFunction(name), true);
            unused(env.createGlobalFunctionBinding(name, first, context, loc));
            descriptor(object, name, first, true, true, false);
            unused(env.createGlobalFunctionBinding(name, second, context, loc));
            descriptor(object, name, second, true, true, false);
            value(env.getBindingValue(name, context, loc), second);
            break;
        }
        case "H04": {
            unused(env.createMutableBinding(name, loc, null));
            unused(env.initializeBinding(name, input, context, loc));
            check(
                env.hasLexicalDeclaration(name) && !env.hasLexicalDeclaration(name + "other"),
                "prior lexical conflict inspection",
            );
            // CanDeclare queries the object only; the future caller must check
            // lexical conflicts first. No multi-name atomicity claim here.
            bool(env.canDeclareGlobalVar(name), true);
            bool(env.canDeclareGlobalFunction(name), true);
            value(env.getBindingValue(name, context, loc), number(7));
            check(object.getOwnProperty(name) === undefined, "prechecks changed state");
            break;
        }
        case "H05": {
            bool(env.hasRestrictedGlobalProperty(name), false);
            define(object, name, input, true, true, false);
            bool(env.hasRestrictedGlobalProperty(name), true);
            check(!env.hasLexicalDeclaration(name), "restriction not lexical");
            descriptor(object, name, number(7), true, true, false);
            const proto = new GuestObject();
            define(proto, "undefined", UNDEFINED, false, false, false);
            const inherited = new GlobalEnvironment(new GuestObject(proto), object);
            bool(inherited.hasRestrictedGlobalProperty("undefined"), false);
            define(object, "undefined", UNDEFINED, false, false, false);
            bool(env.hasRestrictedGlobalProperty("undefined"), true);
            break;
        }
        case "H06": {
            define(object, name, input);
            bool(env.hasRestrictedGlobalProperty(name), false);
            unused(env.createMutableBinding(name, loc, null));
            error(env.getBindingValue(name, context, loc), "ReferenceError", loc);
            unused(env.initializeBinding(name, number(2), context, loc));
            value(env.getBindingValue(name, context, loc), number(2));
            descriptor(object, name, number(7), true, true, true);
            unused(env.setMutableBinding(name, number(3), context, loc));
            descriptor(object, name, number(7), true, true, true);
            break;
        }
        case "H07": {
            const proto = new GuestObject();
            define(proto, "inherited", input);
            bool(object.setPrototypeOf(proto), true);
            define(object, name, input);
            object.preventExtensions();
            bool(env.canDeclareGlobalVar(name), true);
            bool(env.canDeclareGlobalFunction(name), true);
            bool(env.canDeclareGlobalVar("inherited"), false);
            bool(env.canDeclareGlobalFunction("inherited"), false);
            bool(env.canDeclareGlobalVar("missing"), false);
            bool(env.canDeclareGlobalFunction("missing"), false);
            unused(env.createGlobalVarBinding("missing", context, loc));
            unused(env.createGlobalVarBinding("inherited", context, loc));
            error(
                env.createGlobalFunctionBinding("missing", input, context, loc),
                "TypeError",
                loc,
            );
            check(
                object.getOwnProperty("missing") === undefined &&
                    object.getOwnProperty("inherited") === undefined,
                "nonextensible mutation",
            );
            unused(env.createGlobalVarBinding(name, context, loc));
            descriptor(object, name, number(7), true, true, true);
            unused(env.setMutableBinding(name, number(8), context, loc));
            descriptor(object, name, number(8), true, true, true);
            break;
        }
        case "H08": {
            // Literal matrix, not a computed oracle from the implementation.
            const flags = [
                "000:0:1",
                "001:1:0",
                "010:0:1",
                "011:1:0",
                "100:0:1",
                "101:1:0",
                "110:1:1",
                "111:1:0",
            ];
            for (const row of flags) {
                const obj = new GuestObject();
                const e = new GlobalEnvironment(obj, obj);
                define(obj, name, input, row[0] === "1", row[1] === "1", row[2] === "1");
                obj.preventExtensions();
                bool(e.canDeclareGlobalVar(name), true);
                bool(e.canDeclareGlobalFunction(name), row[4] === "1");
                bool(e.hasRestrictedGlobalProperty(name), row[6] === "1");
                unused(e.createGlobalVarBinding(name, context, loc));
                descriptor(obj, name, number(7), row[0] === "1", row[1] === "1", row[2] === "1");
                if (row[4] === "1") {
                    unused(e.createGlobalFunctionBinding(name, number(8), context, loc));
                    descriptor(obj, name, number(8), true, true, false);
                } else {
                    descriptor(obj, name, number(7), row[0] === "1", row[1] === "1", false);
                }
            }
            break;
        }
        case "H09": {
            const proto = new GuestObject();
            define(proto, name, input);
            define(proto, "undefinedValue", UNDEFINED);
            define(proto, "readonly", input, false);
            bool(object.setPrototypeOf(proto), true);
            bool(env.hasBinding("undefinedValue", loc), true);
            value(env.getBindingValue("undefinedValue", context, loc), UNDEFINED);
            value(env.getBindingValue(name, context, loc), number(7));
            unused(env.setMutableBinding(name, number(8), context, loc));
            descriptor(object, name, number(8), true, true, true);
            descriptor(proto, name, number(7), true, true, true);
            error(env.setMutableBinding("readonly", number(8), context, loc), "TypeError", loc);
            check(object.getOwnProperty("readonly") === undefined, "readonly inherited write");
            unused(env.createGlobalVarBinding("readonly", context, loc));
            descriptor(object, "readonly", UNDEFINED, true, true, false);
            unused(env.createGlobalFunctionBinding("undefinedValue", input, context, loc));
            descriptor(object, "undefinedValue", number(7), true, true, false);
            break;
        }
        case "H10": {
            const ref = capture(env, name, loc);
            check(ref.environment === null, "unresolved capture");
            bool(object.internalSet(name, input, { kind: "object", object }, context, loc), true);
            error(putStrictGlobalBinding(ref, number(8), context), "ReferenceError", loc);
            error(getStrictGlobalBinding(ref, context), "ReferenceError", loc);
            descriptor(object, name, number(7), true, true, true);
            const lexical = capture(env, "laterLexical", loc);
            unused(env.createMutableBinding("laterLexical", loc, null));
            unused(env.initializeBinding("laterLexical", input, context, loc));
            error(putStrictGlobalBinding(lexical, number(8), context), "ReferenceError", loc);
            value(env.getBindingValue("laterLexical", context, loc), number(7));
            value(getStrictGlobalBinding(capture(env, name, loc), context), number(7));
            break;
        }
        case "H11": {
            define(object, name, input);
            const mutableLoc = { line: 17, column: 9 };
            const ref = capture(env, name, mutableLoc);
            mutableLoc.line = 88;
            check(ref.environment === env, "resolved composite base");
            bool(object.internalDelete(name), true);
            error(getStrictGlobalBinding(ref, context), "ReferenceError", loc);
            error(putStrictGlobalBinding(ref, number(8), context), "ReferenceError", loc);
            define(object, name, number(9));
            value(getStrictGlobalBinding(ref, context), number(9));
            unused(env.createMutableBinding(name, loc, null));
            error(getStrictGlobalBinding(ref, context), "ReferenceError", loc);
            unused(env.initializeBinding(name, number(2), context, loc));
            unused(putStrictGlobalBinding(ref, number(3), context));
            value(getStrictGlobalBinding(ref, context), number(3));
            descriptor(object, name, number(9), true, true, true);
            break;
        }
        case "H12": {
            const other = new GuestObject();
            const alternateThis = new GuestObject();
            const envB = new GlobalEnvironment(other, alternateThis);
            value(normal(env.getThisBinding()), { kind: "object", object });
            value(normal(envB.getThisBinding()), { kind: "object", object: alternateThis });
            check(
                env.withBaseObject() === UNDEFINED && envB.withBaseObject() === UNDEFINED,
                "identifier receiver",
            );
            unused(env.createMutableBinding(name, loc, null));
            unused(env.initializeBinding(name, input, context, loc));
            bool(envB.hasBinding(name, loc), false);
            unused(envB.createGlobalVarBinding(name, contextB, loc));
            unused(envB.setMutableBinding(name, number(2), contextB, loc));
            value(env.getBindingValue(name, context, loc), number(7));
            descriptor(other, name, number(2), true, true, false);
            check(
                realmA.global.resolve(name) === null && realmB.global.resolve(name) === null,
                "legacy Realm changed",
            );
            check(context.realm === realmA && contextB.realm === realmB, "Realm context identity");
            break;
        }
        case "H13": {
            const obj = new FaultObject(context, loc);
            const e = new GlobalEnvironment(obj, obj);
            define(obj, name, input);
            const ref = capture(e, name, loc);
            for (const mode of ["H", "G", "S", "D"]) {
                obj.mode = mode;
                obj.trace = "";
                let result: ValueCompletion;
                if (mode === "H") {
                    const resolution = resolveStrictGlobalBinding(e, name, loc);
                    check(resolution === obj.abrupt, "resolve abrupt identity");
                    check(obj.trace === "H", "resolve abrupt trace");
                    obj.trace = "";
                    result = putStrictGlobalBinding(ref, number(8), context);
                } else if (mode === "G") {
                    result = getStrictGlobalBinding(ref, context);
                } else if (mode === "S") {
                    result = putStrictGlobalBinding(ref, number(8), context);
                } else {
                    result = e.createGlobalFunctionBinding(name, number(8), context, loc);
                }
                check(result === obj.abrupt, "original abrupt identity");
                let expected: "D" | "H" | "HG" | "HS";
                if (mode === "H") {
                    expected = "H";
                } else if (mode === "G") {
                    expected = "HG";
                } else if (mode === "S") {
                    expected = "HS";
                } else {
                    expected = "D";
                }
                check(obj.trace === expected, "abrupt operation order");
                check(
                    obj.abrupt.diagnostic.loc.line === 91 &&
                        obj.abrupt.diagnostic.loc.column === 23,
                    "original abrupt location",
                );
            }
            obj.mode = "D";
            obj.trace = "";
            check(
                e.createGlobalVarBinding("fresh", context, loc) === obj.abrupt && obj.trace === "D",
                "var definition abrupt",
            );
            obj.mode = "S";
            obj.trace = "";
            check(
                e.createGlobalVarBinding("fresh", context, loc) === obj.abrupt &&
                    obj.trace === "DHS",
                "var initialization abrupt",
            );
            descriptor(obj, "fresh", UNDEFINED, true, true, false);
            obj.trace = "";
            check(
                e.createGlobalFunctionBinding(name, number(8), context, loc) === obj.abrupt &&
                    obj.trace === "DS",
                "function set abrupt",
            );
            descriptor(obj, name, number(8), true, true, false);
            obj.mode = "falseS";
            obj.trace = "";
            unused(e.createGlobalFunctionBinding(name, number(9), context, loc));
            check(obj.trace === "DS", "function Set false is not strict");
            obj.trace = "";
            error(e.setMutableBinding(name, input, context, loc), "TypeError", loc);
            check(obj.trace === "HS", "strict Set false trace");
            obj.mode = "falseD";
            obj.trace = "";
            error(e.createGlobalFunctionBinding(name, input, context, loc), "TypeError", loc);
            check(obj.trace === "D", "failed definition stops Set");
            obj.mode = "H";
            obj.trace = "";
            unused(e.createMutableBinding(name, loc, null));
            error(e.getBindingValue(name, context, loc), "ReferenceError", loc);
            error(e.setMutableBinding(name, input, context, loc), "ReferenceError", loc);
            bool(e.hasBinding(name, loc), true);
            check(obj.trace === "", "lexical precedence avoids object dispatch");
            break;
        }
        case "H14": {
            const obj = new FaultObject(context, loc);
            const e = new GlobalEnvironment(obj, obj);
            define(obj, name, input);
            for (const operation of ["H", "G", "S", "D"]) {
                obj.mode = "host" + operation;
                let caught = false;
                try {
                    if (operation === "H") {
                        resolveStrictGlobalBinding(e, name, loc);
                    } else if (operation === "G") {
                        e.getBindingValue(name, context, loc);
                    } else if (operation === "S") {
                        e.setMutableBinding(name, input, context, loc);
                    } else {
                        e.createGlobalFunctionBinding(name, input, context, loc);
                    }
                } catch (fault) {
                    caught = fault instanceof Error && fault === obj.hostFault;
                }
                check(caught && context.realm === realmA, "host fault identity/context");
            }
            break;
        }
        case "H15": {
            unused(env.createMutableBinding(name, loc, null));
            error(env.createMutableBinding(name, loc, null), "TypeError", loc);
            error(env.getBindingValue(name, context, loc), "ReferenceError", loc);
            unused(env.initializeBinding(name, input, context, loc));
            let caught = false;
            try {
                env.initializeBinding(name, number(8), context, loc);
            } catch (fault) {
                caught =
                    fault instanceof Error &&
                    fault.message === "binding already initialized: " + name;
            }
            check(caught, "double initialization invariant");
            value(env.getBindingValue(name, context, loc), number(7));
            define(object, "readonly", input, false);
            unused(env.initializeBinding("readonly", number(8), context, loc));
            descriptor(object, "readonly", number(7), false, true, true);
            error(env.getBindingValue("missing", context, loc), "ReferenceError", loc);
            error(env.setMutableBinding("missing", input, context, loc), "ReferenceError", loc);
            break;
        }
        default:
            throw new Error("unknown host row: " + id);
    }
    check(
        calls === 0 && ticks === 0 && context.realm === realmA && contextB.realm === realmB,
        "unexpected context effects",
    );
    console.log(id + " PASS");
}
