import { registerPromise } from "./builtins/promise.js";
import { registerRegExp } from "./builtins/regexp.js";
import { registerReflect } from "./builtins/reflect.js";
import { registerFunctionConstructor } from "./builtins/function-constructor.js";
import { registerURI } from "./builtins/uri.js";
import { registerArrayFlat } from "./builtins/array-flat.js";
import { registerArrayIterators } from "./builtins/array-iterator.js";
import { registerStringIterator } from "./builtins/string-iterator.js";
import { registerStringSearch } from "./builtins/string-search.js";
import { registerMap } from "./builtins/map.js";
import { registerMapIterators } from "./builtins/map-iterator.js";
import { registerSet } from "./builtins/set.js";
import { registerSetIterators } from "./builtins/set-iterator.js";
import { registerStringSplit } from "./builtins/string-split.js";
import { registerArraySort, registerArrayToSorted } from "./builtins/array-sort.js";
import { registerArraySlice, registerArrayConcat, registerArrayToReversed, registerArrayToSpliced, registerArrayWith } from "./builtins/array-copy.js";
import { registerJSON } from "./builtins/json.js";
import type { GuestSymbol } from "./symbols.js";
import { registerErrors, createErrorConstructor } from "./builtins/error.js";
import type { ConstructBuiltin, Callable } from "./runtime.js";
import { GuestArray } from "./array-object.js";
import { Environment, GuestObject, GuestError, UNDEFINED, display, normal, type ErrorName, type Builtin, type Value, validatePropertyDescriptorUpdate, type PropertyDescriptorUpdate, type ValueCompletion } from "./runtime.js";
import { registerNumber, registerNumberConversions, registerGlobalNumericPredicates } from "./builtins/number.js";
import { registerFunction, nativeFunctionString } from "./builtins/function.js";
import { registerRestrictedFunctionProperties } from "./builtins/restricted-function.js";
import { registerObject, registerObjectValueOf, registerObjectToString } from "./builtins/object.js";
import { registerSymbol, registerSymbolConversions } from "./builtins/symbol.js";
import { registerBoolean, registerBooleanConversions } from "./builtins/boolean.js";
import { registerString, registerStringConversions, registerStringMethods } from "./builtins/string.js";
import { registerStringHTML } from "./builtins/string-html.js";
import { registerStringWellFormed } from "./builtins/string-wellformed.js";
import { registerArray, registerArrayConversions } from "./builtins/array.js";
import { registerArrayMutators, registerArraySplice, registerArrayRangeMutators } from "./builtins/array-mutation.js";
import { registerArraySearch } from "./builtins/array-search.js";
import { registerArrayPredicates } from "./builtins/array-predicate.js";
import {registerMath} from "./builtins/math.js";
import { registerArrayReduction } from "./builtins/array-reduce.js";
import { registerScriptArrayIteration } from "./builtins/array-iteration.js";
import { GlobalEnvironment } from "./global-environment.js";
import type { Stmt, FunctionSource, Location } from "./syntax.js";
import { GuestBoolean, GuestNumber, GuestStringObject, GuestSymbolObject } from "./primitive-objects.js";
import type { GuestString } from "./strings.js";
import type { ExecutableScript } from "./script-record.js";
// scriptc follows value-import reachability when lowering opaque class types.
// Keep the factory's module reachable without exporting its private classes;
// Callable still imports ScriptGuestCallable as a type only. No setup runs here.
// Reduced before/after evidence: docs/validation/ts-033e3a/reachability-*.ts.
import { consumeScriptBuiltinPermit, consumeScriptConstructorPermit, createEvalIntrinsic } from "./script-execution-internal.js";
import type { ScriptEnvironment } from "./script-environment.js";
import type { OperationContext } from "./runtime.js";
import type { RandomState } from "./random.js";

export type Output = (line: string) => void;
export type RealmProfile = "legacy" | "script";
export class Realm {
    randomState: RandomState | null = null;
    private legacyGlobal: Environment | null = null;
    private scriptGlobal: GlobalEnvironment | null = null;
    private errorPrototypes: Map<ErrorName, GuestObject> = new Map();
    private errorConstructors: Map<ErrorName, GuestObject> = new Map();
    readonly objectPrototype: GuestObject;
    readonly functionPrototype: GuestObject;
    readonly arrayPrototype: GuestArray;
    readonly iteratorPrototype: GuestObject;
    readonly arrayIteratorPrototype: GuestObject;
    readonly stringIteratorPrototype: GuestObject;
    readonly regexpStringIteratorPrototype: GuestObject;
    readonly promisePrototype: GuestObject;
    readonly regexpPrototype: GuestObject;
    readonly mapPrototype: GuestObject;
    readonly mapIteratorPrototype: GuestObject;
    readonly setPrototype: GuestObject;
    readonly setIteratorPrototype: GuestObject;
    readonly arrayConstructor: GuestObject | null = null;
    readonly arrayValues: Value = UNDEFINED;
    readonly restrictedFunctionThrower: Value = UNDEFINED;
    readonly evalIntrinsic: GuestObject | null = null;
    readonly booleanPrototype: GuestBoolean;
    readonly numberPrototype: GuestNumber;
    readonly symbolPrototype: GuestObject;
    readonly stringPrototype: GuestStringObject;
    constructor(output: Output, readonly profile: RealmProfile = "legacy") {
        if (profile !== "legacy" && profile !== "script") throw new Error("invalid Realm profile");
        // Bootstrap dependencies directly, before factories or global installation.
        this.objectPrototype = new GuestObject(null, true);
        if (profile === "script") {
            const errorPrototype = new GuestObject(this.objectPrototype);
            const names: ErrorName[] = ["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "EvalError", "URIError", "AggregateError"];
            for (const name of names) {
                const proto = name === "Error" ? errorPrototype : new GuestObject(errorPrototype);
                proto.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: true, enumerable: false, configurable: true });
                proto.bootstrapDefine("message", { value: { kind: "string", value: "" }, writable: true, enumerable: false, configurable: true });
                this.errorPrototypes.set(name, proto);
            }
        }
        this.functionPrototype = new GuestObject(this.objectPrototype, false, {
            kind: "builtin", initialName: "", realm: this, invoke: this.guardBuiltin((_receiver, _args, _context, _loc) => normal(UNDEFINED)),
        });
        setBuiltinMetadata(this.functionPrototype, "", 0);
        if (profile === "script") this.restrictedFunctionThrower = registerRestrictedFunctionProperties(this);
        this.arrayPrototype = new GuestArray(this.objectPrototype);
        this.iteratorPrototype = new GuestObject(this.objectPrototype);
        this.arrayIteratorPrototype = new GuestObject(this.iteratorPrototype);
        this.stringIteratorPrototype = new GuestObject(this.iteratorPrototype);
        this.regexpStringIteratorPrototype = new GuestObject(this.iteratorPrototype);
        this.promisePrototype = new GuestObject(this.objectPrototype);
        this.regexpPrototype = new GuestObject(this.objectPrototype);
        this.mapPrototype = new GuestObject(this.objectPrototype);
        this.mapIteratorPrototype = new GuestObject(this.iteratorPrototype);
        this.setPrototype = new GuestObject(this.objectPrototype);
        this.setIteratorPrototype = new GuestObject(this.iteratorPrototype);
        this.booleanPrototype = new GuestBoolean(false, this.objectPrototype);
        this.numberPrototype = new GuestNumber(0, this.objectPrototype);
        this.stringPrototype = new GuestStringObject("", this.objectPrototype);
        this.symbolPrototype = new GuestObject(this.objectPrototype);
        registerObjectValueOf(this);
        const objectToString = registerObjectToString(this);
        registerArrayConversions(this, objectToString);
        registerArrayMutators(this);
        if (profile === "script") {
            registerArraySplice(this);
            registerArrayRangeMutators(this);
            registerArraySlice(this);
            registerArrayConcat(this);
            registerArraySort(this);
            registerArrayToReversed(this);
            registerArrayToSorted(this);
            registerArrayToSpliced(this);
            registerArrayWith(this);
            registerArrayFlat(this);
        }
        registerArraySearch(this);
        registerArrayPredicates(this);
        registerArrayReduction(this);
        registerFunction(this);
        registerSymbolConversions(this);
        registerBooleanConversions(this);
        registerStringConversions(this);
        registerStringMethods(this);
        if (profile === "script") {
            registerStringSplit(this);
            registerStringHTML(this);
            registerStringWellFormed(this);
        }
        registerNumberConversions(this);
        if (profile === "legacy") this.legacyGlobal = new Environment(null);
        else {
            const object = new GuestObject(this.objectPrototype);
            this.scriptGlobal = new GlobalEnvironment(object, object);
        }
        this.installGlobal("undefined", UNDEFINED, false);
        this.installGlobal("NaN", { kind: "number", value: NaN }, false);
        this.installGlobal("Infinity", { kind: "number", value: Infinity }, false);
        const consoleObject = this.createObject();
        this.registerBuiltin(consoleObject, "log", 0, (_receiver, args, _context, _loc) => {
            let line = "";
            for (let i = 0; i < args.length; i++) { if (i > 0) line += " "; line += display(args[i]); }
            output(line);
            return normal();
        });
        this.installGlobal("console", { kind: "object", object: consoleObject }, true);
        if (profile === "script") {
            registerFunctionConstructor(this);
            registerReflect(this);
            registerPromise(this);
            registerRegExp(this);
            this.evalIntrinsic = createEvalIntrinsic(this);
            this.defineScriptGlobal("globalThis", { value: this.globalThisValue, writable: true, enumerable: false, configurable: true });
            this.defineScriptGlobal("eval", { value: { kind: "object", object: this.evalIntrinsic }, writable: true, enumerable: false, configurable: true });
        }
        registerNumber(this);
        if (profile === "script") {
            const names: ErrorName[] = ["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "EvalError", "URIError", "AggregateError"];
            for (const name of names) this.errorConstructors.set(name, createErrorConstructor(this, name));
            registerErrors(this);
            registerString(this);
            registerBoolean(this);
            registerObject(this);
            this.arrayConstructor = registerArray(this);
            registerMath(this);
            registerGlobalNumericPredicates(this);
            registerURI(this);
            registerJSON(this);
            registerSymbol(this);
            registerScriptArrayIteration(this);
            this.arrayValues = registerArrayIterators(this);
            registerStringIterator(this);
            registerStringSearch(this);
            registerMap(this);
            registerMapIterators(this);
            registerSet(this);
            registerSetIterators(this);
        }
    }
    get global(): Environment {
        if (this.legacyGlobal === null) throw new Error("legacy Realm required");
        return this.legacyGlobal;
    }
    set global(environment: Environment) {
        if (this.profile !== "legacy") throw new Error("legacy Realm required");
        this.legacyGlobal = environment;
    }
    get globalEnvironment(): GlobalEnvironment {
        if (this.scriptGlobal === null) throw new Error("Script Realm required");
        return this.scriptGlobal;
    }
    get globalObject(): GuestObject { return this.globalEnvironment.globalObject; }
    get globalThisValue(): Value { return this.globalEnvironment.getThisBinding(); }
    // Trusted bootstrap only: declarations use the composite environment APIs.
    installGlobal(name: string, value: Value, mutable: boolean): void {
        if (name !== "undefined" && name !== "NaN" && name !== "Infinity" && name !== "console" && name !== "Number") throw new Error("invalid bootstrap global");
        if (this.profile === "legacy") this.global.bindings.set(name, { initialized: true, mutable, value });
        else this.globalObject.bootstrapDefine(name, { value, writable: mutable, enumerable: false, configurable: mutable });
    }
    defineScriptGlobal(name: string, descriptor: PropertyDescriptorUpdate): void {
        const object = this.globalObject;
        validatePropertyDescriptorUpdate(descriptor);
        for (const value of [descriptor.value, descriptor.get, descriptor.set]) {
            if (value !== undefined && value.kind === "object" && value.object.callable !== null && value.object.callable.realm.profile !== this.profile) throw new Error("cross-profile callable transfer");
        }
        object.bootstrapDefine(name, descriptor);
    }
    readScriptGlobal(name: string, context: OperationContext, loc: Location): ValueCompletion { return this.globalEnvironment.getBindingValue(name, context, loc); }
    private guardBuiltin(invoke: Builtin): Builtin {
        const guarded: Builtin = (receiver, args, context, loc) => {
            if (context.realm.profile !== this.profile) throw new Error("cross-profile callable invocation");
            if (this.profile === "script" && !consumeScriptBuiltinPermit(context, this, guarded, receiver, args, loc))
                throw new Error("Script execution unavailable");
            return invoke(receiver, args, context, loc);
        };
        return guarded;
    }
    createObject(): GuestObject { return new GuestObject(this.objectPrototype); }
    getErrorConstructor(name: ErrorName): GuestObject {
        const constructor = this.errorConstructors.get(name);
        if (this.profile !== "script" || constructor === undefined) throw new Error("Script Error constructor required");
        return constructor;
    }
    getErrorPrototype(name: ErrorName): GuestObject {
        const proto = this.errorPrototypes.get(name);
        if (this.profile !== "script" || proto === undefined) throw new Error("Script Error prototype required");
        return proto;
    }
    // Trusted allocation does not call guest code or consume execution budget.
    createError(name: ErrorName, message: string): GuestError {
        const error = new GuestError(this.getErrorPrototype(name));
        error.bootstrapDefine("message", { value: { kind: "string", value: message }, writable: true, enumerable: false, configurable: true });
        return error;
    }
    createScriptFunction(record: ExecutableScript, scopeId: number, environment: ScriptEnvironment,
        inferredName: string | null, context: OperationContext): ValueCompletion {
        if (this.profile !== "script" || context.realm !== this || !record.belongsTo(this))
            throw new Error("invalid Script factory Realm");
        return record.materializeFunction(scopeId, environment, inferredName, context);
    }
    createArray(): GuestArray { return new GuestArray(this.arrayPrototype); }
    createBooleanObject(value: boolean): GuestBoolean { return new GuestBoolean(value, this.booleanPrototype); }
    createNumberObject(value: number): GuestNumber { return new GuestNumber(value, this.numberPrototype); }
    createStringObject(value: GuestString): GuestStringObject { return new GuestStringObject(value, this.stringPrototype); }
    createSymbolObject(value: GuestSymbol): GuestSymbolObject { return new GuestSymbolObject(value, this.symbolPrototype); }
    createGuestFunction(params: string[], body: Stmt[], environment: Environment, source: FunctionSource | null): GuestObject {
        if (this.profile !== "legacy") throw new Error("legacy Realm required");
        if (source !== null && (!Number.isInteger(source.start) || !Number.isInteger(source.end) || source.start < 0 || source.start >= source.end || source.end > source.source.text.length)) {
            throw new Error("invalid function source range");
        }
        return new GuestObject(this.functionPrototype, false, { kind: "guest", realm: this, params, body, environment, source });
    }
    createBuiltin(name: string, length: number, invoke: Builtin): GuestObject {
        nativeFunctionString(name);
        const object = new GuestObject(this.functionPrototype, false, { kind: "builtin", initialName: name, realm: this, invoke: this.guardBuiltin(invoke) });
        setBuiltinMetadata(object, name, length);
        return object;
    }
    createBuiltinConstructor(name: string, length: number, call: Builtin, construct: ConstructBuiltin): GuestObject {
        if (this.profile !== "script") throw new Error("Script Realm required");
        nativeFunctionString(name);
        const callable: Callable = { kind: "builtin", initialName: name, realm: this, invoke: this.guardBuiltin(call) };
        const guarded: ConstructBuiltin = (callee, newTarget, args, context, loc) => {
            if (context.realm.profile !== this.profile) throw new Error("cross-profile callable invocation");
            if (callee !== object) throw new Error("invalid builtin constructor metadata");
            if (!consumeScriptConstructorPermit(context, this, guarded, callee, newTarget, args, loc))
                throw new Error("Script execution unavailable");
            return construct(callee, newTarget, args, context, loc);
        };
        const object = new GuestObject(this.functionPrototype, false, callable,
            { kind: "builtin-constructor", realm: this, callable, invoke: guarded });
        setBuiltinMetadata(object, name, length);
        return object;
    }
    registerBuiltin(target: GuestObject, name: string, length: number, invoke: Builtin): Value {
        const object = this.createBuiltin(name, length, invoke);
        const value: Value = { kind: "object", object };
        target.bootstrapDefine(name, { value: value, writable: true, enumerable: false, configurable: true });
        return value;
    }
}

// Trusted metadata uses validated storage and never calls guest code.
function setBuiltinMetadata(object: GuestObject, name: string, length: number): void {
    if (!Number.isFinite(length) || !Number.isInteger(length) || length < 0) throw new Error("invalid builtin length");
    object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: length === 0 ? 0 : length }, writable: false, enumerable: false, configurable: true });
}
