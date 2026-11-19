import { Realm } from "../src/realm.js";
import {
    GuestObject,
    sameValue,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type BooleanCompletion,
    type InternalBooleanCompletion,
    type OperationContext,
    type PropertyKey,
    type PropertyDescriptorUpdate,
} from "../src/runtime.js";
import { wellKnownSpecies } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "object-integrity", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
for (const source of [
    "let o={x:1};Object.isExtensible(o)&&!Object.isSealed(o)&&!Object.isFrozen(o);",
    "let o={};Object.preventExtensions(o)===o&&!Object.isExtensible(o)&&Object.isSealed(o)&&Object.isFrozen(o);",
    "let o={x:1};Object.preventExtensions(o);o.x=2;!Object.isExtensible(o)&&!Object.isSealed(o)&&!Object.isFrozen(o)&&o.x===2;",
    "let o={x:1};Object.seal(o)===o&&Object.isSealed(o)&&!Object.isFrozen(o)&&!Object.isExtensible(o);",
    "let o={x:1};Object.freeze(o)===o&&Object.isSealed(o)&&Object.isFrozen(o)&&!Object.isExtensible(o);",
    "let o={x:1};Object.freeze(o);o.x=2;o.y=3;delete o.x;o.x===1&&!Object.hasOwn(o,'y');",
    "'use strict';let o={x:1};Object.freeze(o);let count=0;try{o.x=2;}catch(e){if(e instanceof TypeError)count++;}try{o.y=2;}catch(e){if(e instanceof TypeError)count++;}try{delete o.x;}catch(e){if(e instanceof TypeError)count++;}count===3;",
    "let o={x:1};Object.seal(o);o.x=2;let d=Object.getOwnPropertyDescriptor(o,'x');o.x===2&&d.writable&&!d.configurable&&d.enumerable;",
    "let o={child:{x:1}};Object.freeze(o);o.child.x=2;Object.isFrozen(o)&&!Object.isFrozen(o.child)&&o.child.x===2;",
    "let calls=0;let stored=1;let o={};Object.defineProperty(o,'x',{get:function(){calls++;return stored;},set:function(v){stored=v;},configurable:true});Object.freeze(o);let quiet=calls===0&&Object.isFrozen(o);o.x=7;quiet&&calls===0&&o.x===7&&calls===1;",
    "let a=[1,,3];Object.freeze(a);Object.isFrozen(a)&&!Object.hasOwn(a,'1')&&!Object.getOwnPropertyDescriptor(a,'length').writable&&!Object.getOwnPropertyDescriptor(a,'0').writable;",
    "let a=[1,2];Object.seal(a);a[0]=9;a.length=1;a.length===2&&a[0]===9&&a[1]===2&&Object.isSealed(a)&&!Object.isFrozen(a);",
    "let a=[];Object.seal(a);!Object.isFrozen(a)&&Object.isSealed(a);",
    "let s=new String('ab');Object.freeze(s);Object.isFrozen(s)&&s[0]==='a'&&s.length===2;",
    "let f=function(){return 7;};Object.freeze(f);Object.isFrozen(f)&&f()===7;",
    "let o={valueOf:function(){throw 1;},toString:function(){throw 2;}};Object.freeze(o);Object.isFrozen(o)&&Object.seal(o)===o&&Object.preventExtensions(o)===o;",
    "let o={x:1};Object.defineProperty(o,'x',{configurable:false,writable:false});!Object.isFrozen(o)&&Object.isFrozen(Object.preventExtensions(o));",
    "let o={};Object.defineProperty(o,'x',{value:1,enumerable:false,writable:true,configurable:true});Object.freeze(o);Object.isFrozen(o)&&!Object.getOwnPropertyDescriptor(o,'x').writable;",
]) {
    const result = run(source);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        source,
    );
}
const primitives: Value[] = [
    UNDEFINED,
    { kind: "null" },
    { kind: "number", value: -0 },
    { kind: "number", value: NaN },
    { kind: "string", value: "abc" },
    { kind: "boolean", value: false },
    { kind: "symbol", value: wellKnownSpecies },
];
for (const name of [
    "preventExtensions",
    "seal",
    "freeze",
    "isExtensible",
    "isSealed",
    "isFrozen",
]) {
    for (const input of primitives) {
        const r = fresh();
        seed(r, "input", input);
        const result = run("Object." + name + "(input);", r);
        const expected: Value =
            name === "isExtensible"
                ? { kind: "boolean", value: false }
                : name === "isSealed" || name === "isFrozen"
                  ? { kind: "boolean", value: true }
                  : input;
        check(result.type === "normal" && sameValue(result.value, expected), "primitive " + name);
    }
    const result = run(
        "Object." + name + ".name==='" + name + "'&&Object." + name + ".length===1;",
    );
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        "metadata " + name,
    );
}
for (const name of ["seal", "freeze"]) {
    const r = fresh(),
        object = r.createObject();
    object.bootstrapDefine(wellKnownSpecies, {
        value: { kind: "number", value: 7 },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    seed(r, "input", { kind: "object", object });
    const result = run("Object." + name + "(input);", r),
        descriptor = object.getOwnProperty(wellKnownSpecies);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object === object &&
            descriptor !== undefined &&
            descriptor.kind === "data" &&
            !descriptor.configurable &&
            descriptor.writable === (name === "seal"),
        "symbol integrity",
    );
}
class RejectsExtensions extends GuestObject {
    preventExtensions(): BooleanCompletion {
        return { type: "normal", value: false };
    }
}
class RejectsSecondDefinition extends GuestObject {
    defineOwnProperty(
        key: PropertyKey,
        descriptor: PropertyDescriptorUpdate,
        context: OperationContext,
        loc: Location,
    ): InternalBooleanCompletion {
        check(!this.isExtensible(), "extensions prevented before definitions");
        if (key === "b") {
            return { type: "normal", value: false };
        }
        return super.defineOwnProperty(key, descriptor, context, loc);
    }
}
for (const name of ["preventExtensions", "seal", "freeze"]) {
    const owner = fresh(),
        caller = fresh(),
        constructor = owner.globalObject.getOwnProperty("Object");
    if (
        constructor === undefined ||
        constructor.kind !== "data" ||
        constructor.value.kind !== "object"
    ) {
        throw new Error("Object constructor");
    }
    const method = constructor.value.object.getOwnProperty(name);
    if (method === undefined || method.kind !== "data") {
        throw new Error("integrity method");
    }
    seed(caller, "method", method.value);
    seed(caller, "input", {
        kind: "object",
        object: new RejectsExtensions(caller.objectPrototype),
    });
    const result = run("method(input);", caller);
    check(
        result.type === "throw" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
        "integrity rejection Realm",
    );
}
{
    const r = fresh(),
        object = new RejectsSecondDefinition(r.objectPrototype);
    for (const key of ["a", "b"]) {
        object.bootstrapDefine(key, {
            value: { kind: "number", value: 1 },
            writable: true,
            configurable: true,
        });
    }
    seed(r, "input", { kind: "object", object });
    const result = run("Object.freeze(input);", r);
    check(
        result.type === "throw" &&
            result.diagnostic.name === "TypeError" &&
            !object.isExtensible() &&
            object.getOwnProperty("a")?.configurable === false &&
            object.getOwnProperty("b")?.configurable === true,
        "partial failure retains earlier changes",
    );
}
for (const name of ["seal", "freeze", "isSealed", "isFrozen"]) {
    const r = fresh(),
        object = r.createObject();
    for (let i = 0; i < 100; i++) {
        object.bootstrapDefine(String(i), {
            value: { kind: "number", value: i },
            writable: name !== "isFrozen",
            configurable: name !== "isSealed" && name !== "isFrozen",
        });
    }
    if (name === "isSealed" || name === "isFrozen") {
        object.preventExtensions();
    }
    seed(r, "input", { kind: "object", object });
    const result = run("Object." + name + "(input);", r, 30);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "integrity scan budget",
    );
    if (name === "seal" || name === "freeze") {
        check(
            !object.isExtensible() &&
                object.getOwnProperty("0")?.configurable === false &&
                object.getOwnProperty("99")?.configurable === true,
            "budget leaves completed prefix",
        );
    }
}
check(!new Realm((_line: string) => {}).global.bindings.has("Object"), "legacy Object absent");
console.log("Object integrity passed");
