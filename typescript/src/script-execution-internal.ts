import { toNumeric } from "./numeric.js";
import { bigintOperation } from "./bigint-arithmetic.js";
import { appendArrayElement, finishArrayLiteral } from "./array-literal.js";
import { resumeAsyncDelegate, type AsyncDelegate } from "./async-generator-delegate.js";
import { getAsyncIterator } from "./async-iterator.js";
import { isSuspendingGeneratorExpression, type GeneratorExpressionFrame } from "./generator-expression.js";
import { hasParameterExpressions, hasParameterPatterns } from "./formal-parameters.js";
import type { GeneratorYieldReceiver } from "./generator-yield-receiver.js";
import type { GeneratorYieldStmt } from "./syntax.js";
import type { TryFinallyStmt } from "./syntax.js";
import { resumeGeneratorDelegate, type GeneratorResumeMode } from "./generator-delegate.js";
import { iteratorResult } from "./iterator-result.js";
import { getReferenceValue, putReferenceValue, deleteReferenceValue, referenceCallReceiver, type EvaluationReference, type EvaluationReferenceResult, type ExpressionResult } from "./evaluation-reference.js";
import { applyBinaryOperator, skipsRightOperand } from "./binary-operator.js";
import { copyDataProperties } from "./copy-data-properties.js";
import { regExpCreate } from "./builtins/regexp.js";
import type { SuperContext } from "./syntax.js";
import { getPrototypeFromConstructor } from "./constructor-prototype.js";
import type { ClassExpr, ClassElement } from "./syntax.js";
import type { ArrayPattern, ObjectPattern, DestructuringPattern } from "./syntax.js";
import { instanceofOperator } from "./builtins/function.js";
import { createArgumentsObject } from "./arguments-object.js";
import { getIterator, iteratorStep, iteratorStepValue, iteratorCloseNormally, iteratorCloseOnThrow, type IteratorRecord } from "./iterator.js";
import { ForInEnumerator } from "./for-in.js";
import type { ConstructBuiltin, BuiltinConstructor, BoundCallable, InternalBooleanCompletion } from "./runtime.js";
import { parseDeclarationPlan, parseBoundedScriptPreparation } from "./parser.js";
import type { Realm } from "./realm.js";
import type { Declaration, DeclarationNodes, DeclarationPlanResult, ScriptDeclarationPlan, DeclarationSite } from "./script-declarations.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Expr, ChainExpr, Argument, ObjectProperty, Stmt, FunctionSource, Location, TryCatchStmt, ForEachStmt, ForStmt, ForLexicalStmt, SwitchStmt } from "./syntax.js";
import { GuestObject, UNDEFINED, normal, type Value, type PropertyKey, type ValueCompletion, type ThrowCompletion, type OperationContext, type ScriptJob, type Builtin, type Completion, type Reference, type ReferenceResult, Environment, equal, languageFailure, failure, resourceFailure, unsupportedFailure, truthy } from "./runtime.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment, type ScriptEnvironment, resolveScriptBinding, putScriptBinding } from "./script-environment.js";
import type { GlobalEnvironment } from "./global-environment.js";
import type { ScriptBindingCell } from "./script-environment.js";
import { instantiateBoundedGlobalDeclarations, type DeclarationMaterializer } from "./script-global-declarations.js";

function lexicalLoopBindings(node: ForEachStmt | ForLexicalStmt): { declarationKind: "let" | "const"; sites: readonly DeclarationSite[] } | null {
    if (node.kind === "for-lexical") return { declarationKind: node.declarationKind, sites: [node.binding.site] };
    if (node.head.kind === "lexical") return { declarationKind: node.head.declarationKind, sites: [node.head.site] };
    if (node.head.kind === "pattern" && node.head.declarationKind !== "var")
        return { declarationKind: node.head.declarationKind, sites: node.head.sites };
    return null;
}
class ActivationKey {}
export type { EvalCallable };
class EvalCallable {
    readonly kind = "eval";
    #realm: Realm;
    private constructor(realm: Realm) { this.#realm = realm; }
    static create(realm: Realm): EvalCallable { return new EvalCallable(realm); }
    static check(callable: EvalCallable): void {
        if (!(callable instanceof EvalCallable)) throw new Error("invalid eval callable brand");
    }
    get realm(): Realm { return this.#realm; }
}
export function createEvalIntrinsic(realm: Realm): GuestObject {
    if (realm.profile !== "script") throw new Error("Script Realm required");
    const object = new GuestObject(realm.functionPrototype, false, EvalCallable.create(realm));
    object.bootstrapDefine("name", { value: { kind: "string", value: "eval" }, writable: false, enumerable: false, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: 1 }, writable: false, enumerable: false, configurable: true });
    return object;
}
type FunctionExecution = {
    callee: GuestObject;
    enter: (environment: ScriptEnvironment) => void;
    evaluate: (initializer: Expr, name: string | null) => ValueCompletion;
    initializePattern: (pattern: DestructuringPattern, value: Value, environment: ScriptEnvironment) => ValueCompletion;
};
type CallableState = { async: boolean; generator: boolean; homeObject: GuestObject | null; classConstructor: { scope: number; bodyScope: number | null; derived: boolean } | null; strict: boolean; lexicalThis: boolean; key: ActivationKey; record: ExecutableScript; realm: Realm; scopeId: number;
    environment: ScriptEnvironment; unit: ScriptSourceUnit; start: number; end: number; text: string; formals: string[] };
export type { ScriptGuestCallable };
class ScriptGuestCallable {
    #state: CallableState;
    private constructor(state: CallableState) { this.#state = state; }
    static create(state: CallableState): ScriptGuestCallable { return new ScriptGuestCallable(state); }
    static check(callable: ScriptGuestCallable, key: ActivationKey, record: ExecutableScript): CallableState {
        if (!(callable instanceof ScriptGuestCallable) || callable.#state.key !== key || callable.#state.record !== record)
            throw new Error("invalid Script callable brand");
        return callable.#state;
    }
    get homeObject(): GuestObject | null { return this.#state.homeObject; }
    get isAsync(): boolean { return this.#state.async; }
    get isGenerator(): boolean { return this.#state.generator; }
    get isClassConstructor(): boolean { return this.#state.classConstructor !== null; }
    get isDerivedClassConstructor(): boolean { return this.#state.classConstructor !== null && this.#state.classConstructor.derived; }
    get isDefaultClassConstructor(): boolean { return this.#state.classConstructor !== null && this.#state.classConstructor.bodyScope === null; }
    get kind(): "script-guest" { return "script-guest"; }
    get realm(): Realm { return this.#state.realm; }
    get record(): ExecutableScript { return this.#state.record; }
    get scopeId(): number { return this.#state.scopeId; }
    get environment(): ScriptEnvironment { return this.#state.environment; }
    get strict(): boolean { return this.#state.strict; }
    get thisMode(): "lexical" | "strict" | "global" { return this.#state.lexicalThis ? "lexical" : this.#state.strict ? "strict" : "global"; }
    get privateEnvironment(): null { return null; }
    sourceText(): string { return this.#state.text; }
    inspectFormals(): string[] { return this.#state.formals.slice(); }
}
// The record owns only a key. Each transient activation owns its phase and key;
// no registry on the record keeps completed or abandoned activations alive.
class FunctionActivation extends ScriptFunctionEnvironment {
    #ownerKey: ActivationKey;
    #scopeId: number;
    #thisInitialized: boolean;
    #boundThis: Value;
    #bodyEnvironment: ScriptEnvironment | null = null;
    #variableEnvironment: ScriptEnvironment | null = null;
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scopeId: number, outer: ScriptEnvironment, callable: ScriptGuestCallable, receiver: Value, newTarget: Value, readonly callee: GuestObject | null) {
        super(outer, receiver, callable, newTarget);
        this.#thisInitialized = !callable.isDerivedClassConstructor;
        this.#boundThis = receiver;
        this.#ownerKey = key;
        this.#scopeId = scopeId;
    }
    inspectThis(): Value { return this.#boundThis; }
    getThisBinding(realm: Realm, loc: Location): ValueCompletion {
        return this.#thisInitialized ? normal(this.#boundThis)
            : languageFailure(realm, "ReferenceError", "this has not been initialized", loc);
    }
    bindThis(value: Value, realm: Realm, loc: Location): ValueCompletion {
        if (!this.callable.isDerivedClassConstructor || value.kind !== "object") throw new Error("invalid derived this binding");
        if (this.#thisInitialized) return languageFailure(realm, "ReferenceError", "this has already been initialized", loc);
        this.#boundThis = value;
        this.#thisInitialized = true;
        return normal(value);
    }
    checkFresh(key: ActivationKey, scopeId: number): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "fresh")
            throw new Error("invalid fresh Script activation");
    }
    begin(key: ActivationKey, scopeId: number): void {
        this.checkFresh(key, scopeId);
        this.#phase = "started";
    }
    complete(key: ActivationKey, scopeId: number, bodyEnvironment: ScriptEnvironment, variableEnvironment: ScriptEnvironment): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "started")
            throw new Error("invalid started Script activation");
        this.#bodyEnvironment = bodyEnvironment;
        this.#variableEnvironment = variableEnvironment;
        this.#phase = "complete";
    }
    bodyEnvironment(key: ActivationKey): ScriptEnvironment {
        if (key !== this.#ownerKey || this.#phase !== "complete" || this.#bodyEnvironment === null)
            throw new Error("incomplete Script function activation");
        return this.#bodyEnvironment;
    }
    variableEnvironment(key: ActivationKey): ScriptEnvironment {
        if (key !== this.#ownerKey || this.#phase !== "complete" || this.#variableEnvironment === null)
            throw new Error("incomplete Script function activation");
        return this.#variableEnvironment;
    }
}
export type ScriptFunctionEnvironmentCompletion = { type: "normal"; environment: ScriptFunctionEnvironment } | ThrowCompletion;
class BlockActivation extends ScriptDeclarativeEnvironment {
    #ownerKey: ActivationKey;
    #scopeId: number;
    #originalOuter: ScriptEnvironment;
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scopeId: number, outer: ScriptEnvironment) {
        super(outer);
        this.#ownerKey = key;
        this.#scopeId = scopeId;
        this.#originalOuter = outer;
    }
    checkFresh(key: ActivationKey, scopeId: number): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.outer !== this.#originalOuter || this.#phase !== "fresh")
            throw new Error("invalid fresh Script block activation");
    }
    begin(key: ActivationKey, scopeId: number): void {
        this.checkFresh(key, scopeId);
        this.#phase = "started";
    }
    complete(key: ActivationKey, scopeId: number): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "started")
            throw new Error("invalid started Script block activation");
        this.#phase = "complete";
    }
}
export type ScriptBlockEnvironmentCompletion = { type: "normal"; environment: ScriptDeclarativeEnvironment } | ThrowCompletion;
// A distinct private activation prevents ordinary block setup from consuming it.
class CatchActivation extends ScriptDeclarativeEnvironment {
    #key: ActivationKey;
    #scope: number;
    #outer: ScriptEnvironment;
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scope: number, outer: ScriptEnvironment) {
        super(outer); this.#key = key; this.#scope = scope; this.#outer = outer;
    }
    begin(key: ActivationKey, scope: number): void {
        if (key !== this.#key || scope !== this.#scope || this.outer !== this.#outer || this.#phase !== "fresh")
            throw new Error("invalid fresh catch activation");
        this.#phase = "started";
    }
    complete(key: ActivationKey, scope: number): void {
        if (key !== this.#key || scope !== this.#scope || this.outer !== this.#outer || this.#phase !== "started")
            throw new Error("invalid started catch activation");
        this.#phase = "complete";
    }
}

export type ScriptPreparation =
    | { readonly kind: "ready"; readonly record: ExecutableScript }
    | { readonly kind: "profile-rejected"; readonly reason: "realm" | "strict" }
    | Exclude<DeclarationPlanResult, ScriptDeclarationPlan>;
export type ScriptNodeInspection = {
    scopes: { id: number; kind: string; loc: Location | null; bodyLength: number;
        parameters: string[]; start: number | null; end: number | null; text: string | null }[];
    declarations: { id: number; kind: string; loc: Location; initializerKind: string | null }[];
};
type ScriptState = { realm: Realm; plan: ScriptDeclarationPlan; nodes: DeclarationNodes; scopes: Map<Expr | Stmt, number> };

// No exported path accepts an AST or plan. Even a JavaScript caller bypassing
// TypeScript's private constructor can only create an unusable empty shell.
export type { ExecutableScript };
class ExecutableScript {
    #state: ScriptState | null = null;
    #activationKey = new ActivationKey();
    #completedMaterializations = 0;
    private constructor() {}
    static prepare(unit: ScriptSourceUnit, realm: Realm, bounded: boolean, inheritedStrict = false, newTargetAllowed = false, superContext: SuperContext = "none"): ScriptPreparation {
        if (realm.profile !== "script") return { kind: "profile-rejected", reason: "realm" };
        const nodes: DeclarationNodes = { source: { text: "" }, body: [], scopes: new Map(), declarations: new Map(), assignmentNameEligible: new Map(), argumentsScopes: new Set() };
        const plan = bounded ? parseBoundedScriptPreparation(unit, nodes, inheritedStrict, newTargetAllowed, superContext) : parseDeclarationPlan(unit, nodes);
        if (plan.kind !== "complete") return plan;
        if (!bounded && !plan.strictness.strict) return { kind: "profile-rejected", reason: "strict" };
        // Associations were assigned in the collector's original iterative walk.
        // Verify all identities before retaining any executable state.
        if (nodes.scopes.size !== plan.scopes.length || nodes.declarations.size !== plan.declarations.length)
            throw new Error("Script node association mismatch");
        const root = nodes.scopes.get(0);
        if (root === undefined || root.node !== null || root.body !== nodes.body)
            throw new Error("Script root body mismatch");
        for (const fn of plan.functions) {
            const entry = nodes.scopes.get(fn.scope);
            if (entry === undefined || entry.node === null || entry.node.kind !== "function")
                throw new Error("Script function node mismatch");
            const source = entry.node.source;
            if (source === null || source.source !== nodes.source || source.source.text !== plan.unit.text || source.start !== fn.start || source.end !== fn.end || entry.body !== entry.node.body)
                throw new Error("Script function source mismatch");
            if (fn.declaration !== null) {
                const declaration = nodes.declarations.get(fn.declaration);
                if (declaration === undefined || declaration.node.kind !== "function" || declaration.node !== entry.node)
                    throw new Error("Script function declaration mismatch");
            }
        }
        const record = new ExecutableScript();
        const scopes = new Map<Expr | Stmt, number>();
        for (const scope of plan.scopes) {
            const entry = nodes.scopes.get(scope.id);
            if (entry === undefined) throw new Error("missing Script scope association");
            if (scope.id === 0) {
                if (scope.kind !== "script" || entry.node !== null || entry.body !== nodes.body) throw new Error("invalid Script root");
            } else if (scope.kind === "class") {
                const node = entry.node;
                if (node === null || node.kind !== "class" || scopes.has(node) || !scope.strict ||
                    node.source !== nodes.source || node.start !== scope.start || node.end !== scope.end || entry.body.length !== 0 ||
                    scope.parent === null || scope.formals.length !== 0 || scope.lexicalDeclarations.length !== 0 || scope.varDeclarations.length !== 0 || scope.varNames.length !== 0 ||
                    scope.lexicalNames.length !== (node.name === null ? 0 : 1) || (node.name !== null && scope.lexicalNames[0] !== node.name.name))
                    throw new Error("invalid class scope association");
                const parent = plan.scopes[scope.parent];
                if (scope.parent >= scope.id || scope.start < parent.start || scope.end > parent.end ||
                    (node.name !== null && node.source.text.slice(node.name.start, node.name.end) !== node.name.name) ||
                    (node.constructorMethod !== null && node.elements.filter(element => element.value === node.constructorMethod && !element.isStatic && element.kind === "method").length !== 1))
                    throw new Error("invalid class source range");
                scopes.set(node, scope.id);
            } else if (scope.kind === "switch") {
                if (entry.node === null || entry.node.kind !== "switch" || scopes.has(entry.node))
                    throw new Error("invalid switch owner");
                const block = entry.node.caseBlock;
                if (entry.body !== block.body || scope.start !== block.start || scope.end !== block.end ||
                    scope.parent === null || scope.strict !== plan.scopes[scope.parent].strict || scope.formals.length !== 0)
                    throw new Error("invalid CaseBlock association");
                let previous = block.start, offset = 0, defaults = 0;
                const statements = new Map<Stmt, boolean>();
                for (const clause of block.clauses) {
                    if (clause.start <= previous || clause.end <= clause.start || clause.end >= block.end)
                        throw new Error("invalid switch clause range");
                    previous = clause.end - 1;
                    if (clause.test === null) defaults++;
                    for (const statement of clause.body) {
                        if (block.body[offset++] !== statement || statements.has(statement))
                            throw new Error("invalid CaseBlock body identity");
                        statements.set(statement, true);
                    }
                }
                if (defaults > 1 || offset !== block.body.length) throw new Error("invalid CaseBlock flattening");
                scopes.set(entry.node, scope.id);
            } else if (scope.kind === "for-of" || scope.kind === "for-in" || scope.kind === "for-lexical") {
                if (entry.node === null || (entry.node.kind !== "for-lexical" && entry.node.kind !== "for-of" && entry.node.kind !== "for-in") || scopes.has(entry.node))
                    throw new Error("invalid lexical loop owner");
                const node = entry.node;
                const head = lexicalLoopBindings(node);
                if (head === null || scope.kind !== node.kind) throw new Error("invalid lexical loop kind");
                const initializer = node.kind === "for-lexical" ? node.binding.initializer : null;
                if (entry.body.length !== 1 || entry.body[0] !== node.body || scope.start !== node.start || scope.end !== node.end ||
                    scope.parent === null || scope.parent >= scope.id || scope.strict !== plan.scopes[scope.parent].strict || scope.formals.length !== 0 ||
                    scope.start < plan.scopes[scope.parent].start || scope.end > plan.scopes[scope.parent].end ||
                    scope.lexicalDeclarations.length !== head.sites.length || scope.lexicalNames.length !== head.sites.length)
                    throw new Error("invalid lexical loop association");
                for (let i = 0; i < head.sites.length; i++) {
                    const site = head.sites[i];
                    const declaration = plan.declarations[scope.lexicalDeclarations[i]];
                    if (scope.lexicalNames[i] !== site.name || declaration === undefined || declaration.kind !== head.declarationKind ||
                        declaration.site.start !== site.start || declaration.site.end !== site.end || declaration.site.name !== site.name || declaration.scope !== scope.id ||
                        declaration.functionScope !== null || (initializer === null ? declaration.initializer !== null
                            : declaration.initializer === null || declaration.initializer.start !== initializer.start || declaration.initializer.end !== initializer.end) ||
                        site.start <= node.start || site.end >= node.end ||
                        (initializer !== null && (initializer.start <= site.end || initializer.end >= node.end || initializer.end <= initializer.start)))
                        throw new Error("invalid lexical loop binding association");
                }
                scopes.set(node, scope.id);
            } else if (scope.kind === "catch") {
                if (entry.node === null || entry.node.kind !== "try-catch" || entry.body !== entry.node.handler.body || scopes.has(entry.node))
                    throw new Error("invalid catch node identity");
                const node = entry.node;
                const parameter = scope.catchParameter;
                if (parameter !== node.parameter || scope.start !== node.catchStart || scope.end !== node.catchEnd ||
                    scope.parent === null || scope.strict !== plan.scopes[scope.parent].strict ||
                    scope.formals.length !== 0 || scope.lexicalDeclarations.length !== 0 || scope.varDeclarations.length !== 0 ||
                    scope.varNames.length !== 0 || scope.lexicalNames.length !== 1 || scope.lexicalNames[0] !== parameter.name)
                    throw new Error("invalid catch metadata");
                scopes.set(node, scope.id);
            } else {
                if (entry.node === null || (entry.node.kind !== "block" && entry.node.kind !== "function") || entry.node.kind !== scope.kind || entry.body !== entry.node.body || scopes.has(entry.node))
                    throw new Error("invalid Script scope identity");
                scopes.set(entry.node, scope.id);
            }
            if (scope.kind !== "catch" && scope.catchParameter !== null) throw new Error("foreign catch parameter");
            if (scope.parent !== null) {
                const parent = plan.scopes[scope.parent];
                if (scope.kind === "switch" || parent.kind === "switch") {
                    if (scope.parent >= scope.id || scope.start < parent.start || scope.end > parent.end ||
                        (scope.kind !== "function" && scope.kind !== "class" && scope.strict !== parent.strict))
                        throw new Error("invalid CaseBlock child scope");
                }
            }
        }
        for (const scope of plan.scopes) {
            if (scope.kind !== "catch") continue;
            const entry = nodes.scopes.get(scope.id);
            if (entry === undefined || entry.node === null || entry.node.kind !== "try-catch") throw new Error("missing catch association");
            const node = entry.node;
            const tryId = scopes.get(node.block), handlerId = scopes.get(node.handler);
            if (tryId === undefined || handlerId === undefined || tryId >= scope.id || handlerId !== scope.id + 1 ||
                node.block === node.handler || node.block.body === node.handler.body)
                throw new Error("invalid catch children");
            const protectedScope = plan.scopes[tryId], handlerScope = plan.scopes[handlerId];
            if (protectedScope.kind !== "block" || handlerScope.kind !== "block" || protectedScope.parent !== scope.parent ||
                handlerScope.parent !== scope.id || protectedScope.end > scope.start || handlerScope.start < scope.start ||
                handlerScope.end !== scope.end || handlerScope.strict !== scope.strict || protectedScope.strict !== scope.strict)
                throw new Error("invalid catch child scope");
        }
        record.#state = { realm, plan, nodes, scopes };
        return { kind: "ready", record };
    }
    // These seams require the unexported execution key and never return bodies
    // to a host callback, context, facade or inspection result.
    static state(record: ExecutableScript, key: ExecutionKey): ScriptState {
        if (key !== executionKey || !(record instanceof ExecutableScript)) throw new Error("invalid Script record");
        return record.#readState();
    }
    static readRoot(record: ExecutableScript, key: ExecutionKey): Stmt[] {
        return ExecutableScript.state(record, key).nodes.body;
    }
    static readFunction(record: ExecutableScript, callable: ScriptGuestCallable, key: ExecutionKey): { scopeId: number; body: Stmt[]; needsParameterExecution: boolean; needsArguments: boolean } {
        ExecutableScript.state(record, key);
        const metadata = ScriptGuestCallable.check(callable, record.#activationKey, record);
        const entry = record.#function(metadata.scopeId);
        return { scopeId: metadata.scopeId, body: entry.node.body,
            needsParameterExecution: hasParameterExpressions(entry.node.parameters) || hasParameterPatterns(entry.node.parameters), needsArguments: record.#needsArguments(metadata.scopeId) };
    }
    static instantiateFunctionForExecution(record: ExecutableScript, environment: ScriptFunctionEnvironment,
        args: Value[], context: OperationContext, execution: FunctionExecution, key: ExecutionKey): ValueCompletion {
        ExecutableScript.state(record, key);
        return record.#instantiateFunction(environment, args, context, execution);
    }
    static scopeOfNode(record: ExecutableScript, node: Expr | Stmt, key: ExecutionKey): number {
        const scope = ExecutableScript.state(record, key).scopes.get(node);
        if (scope === undefined) throw new Error("foreign Script node");
        return scope;
    }
    static assignmentMayName(record: ExecutableScript, node: Expr, key: ExecutionKey): boolean {
        return ExecutableScript.state(record, key).nodes.assignmentNameEligible.get(node) === true;
    }
    static legacyDeclaration(record: ExecutableScript, node: Stmt, key: ExecutionKey): Declaration | null {
        const state = ExecutableScript.state(record, key);
        if (state.plan.legacyBlockFunctions === undefined) return null;
        const scope = ExecutableScript.scopeOfNode(record, node, key);
        const id = record.#function(scope).fn.declaration;
        return id !== null && state.plan.legacyBlockFunctions.includes(id) ? state.plan.declarations[id] : null;
    }
    static activateLoop(record: ExecutableScript, node: ForEachStmt | ForLexicalStmt, outer: ScriptEnvironment, value: Value | null,
        context: OperationContext, key: ExecutionKey): ScriptBlockEnvironmentCompletion {
        const state = ExecutableScript.state(record, key);
        const scopeId = ExecutableScript.scopeOfNode(record, node, key);
        const head = lexicalLoopBindings(node);
        if (head === null || state.plan.scopes[scopeId].kind !== node.kind) throw new Error("invalid lexical loop activation");
        record.#validateEnvironment(outer, context);
        const allocation = context.tick(node.loc);
        if (allocation.type === "throw") { const abrupt: ThrowCompletion = allocation; return abrupt; }
        const environment = new ScriptDeclarativeEnvironment(outer);
        for (const site of head.sites) {
            const creation = context.tick(site.loc);
            if (creation.type === "throw") { const abrupt: ThrowCompletion = creation; return abrupt; }
            // The iterable expression sees mutable TDZ bindings, including const heads.
            const created = (node.kind === "for-lexical" || value !== null) && head.declarationKind === "const"
                ? environment.createImmutableBinding(site.name, site.loc) : environment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") { const abrupt: ThrowCompletion = created; return abrupt; }
        }
        if (value !== null && (node.kind === "for-lexical" || node.head.kind !== "pattern")) {
            const site = head.sites[0];
            const initialization = context.tick(site.loc);
            if (initialization.type === "throw") { const abrupt: ThrowCompletion = initialization; return abrupt; }
            const initialized = environment.initializeBinding(site.name, value, context, site.loc);
            if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
        }
        return { type: "normal", environment };
    }
    static activateCatch(record: ExecutableScript, node: TryCatchStmt, outer: ScriptEnvironment, value: Value,
        context: OperationContext, key: ExecutionKey): ScriptBlockEnvironmentCompletion {
        const state = ExecutableScript.state(record, key);
        const scopeId = ExecutableScript.scopeOfNode(record, node, key);
        const scope = state.plan.scopes[scopeId], entry = state.nodes.scopes.get(scopeId);
        if (scope.kind !== "catch" || entry === undefined || entry.node !== node || entry.body !== node.handler.body || scope.catchParameter !== node.parameter)
            throw new Error("invalid catch activation association");
        record.#validateEnvironment(outer, context);
        const allocation = context.tick(node.catchLoc);
        if (allocation.type === "throw") { const abrupt: ThrowCompletion = allocation; return abrupt; }
        const activation = new CatchActivation(record.#activationKey, scopeId, outer);
        activation.begin(record.#activationKey, scopeId);
        const creation = context.tick(node.parameter.loc);
        if (creation.type === "throw") { const abrupt: ThrowCompletion = creation; return abrupt; }
        const created = activation.createMutableBinding(node.parameter.name, node.parameter.loc);
        if (created.type === "throw") { const abrupt: ThrowCompletion = created; return abrupt; }
        const initialization = context.tick(node.parameter.loc);
        if (initialization.type === "throw") { const abrupt: ThrowCompletion = initialization; return abrupt; }
        const initialized = activation.initializeBinding(node.parameter.name, value, context, node.parameter.loc);
        if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
        activation.complete(record.#activationKey, scopeId);
        return { type: "normal", environment: activation };
    }
    #readState(): ScriptState {
        if (this.#state === null) throw new Error("unprepared Script record");
        return this.#state;
    }
    belongsTo(realm: Realm): boolean { return this.#readState().realm === realm; }
    #validateEnvironment(environment: ScriptEnvironment, context: OperationContext): void {
        const state = this.#readState();
        if (state.realm.profile !== "script" || context.realm !== state.realm) throw new Error("invalid Script context Realm");
        const seen = new Map<ScriptEnvironment, boolean>();
        let current = environment;
        while (true) {
            if (current === null || typeof current !== "object" || seen.has(current)) throw new Error("invalid Script environment chain");
            seen.set(current, true);
            if (current.kind === "global") {
                if (current.record !== state.realm.globalEnvironment) throw new Error("foreign Script environment terminal");
                return;
            }
            if ((current.kind !== "declarative" || !(current instanceof ScriptDeclarativeEnvironment)) &&
                (current.kind !== "function" || !(current instanceof ScriptFunctionEnvironment)))
                throw new Error("invalid Script environment tag");
            current = current.outer;
        }
    }
    #needsArguments(scopeId: number): boolean {
        const state = this.#readState();
        let used = state.nodes.argumentsScopes !== undefined && state.nodes.argumentsScopes.has(scopeId);
        if (!used && state.plan.legacyBlockFunctions !== undefined) for (const id of state.plan.legacyBlockFunctions) {
            const declaration = state.plan.declarations[id];
            if (declaration.variableScope === scopeId && declaration.site.name === "arguments") used = true;
        }
        if (!used) return false;
        const entry = this.#function(scopeId);
        if (entry.source.arrow === true) return false;
        for (const formal of entry.scope.formals) if (formal.name === "arguments") return false;
        if (!hasParameterExpressions(entry.node.parameters)) {
            if (entry.scope.lexicalNames.includes("arguments")) return false;
            for (const id of entry.scope.varDeclarations) {
                const declaration = state.plan.declarations[id];
                if (declaration.kind === "function" && declaration.site.name === "arguments") return false;
            }
        }
        return true;
    }
    #function(scopeId: number) {
        const state = this.#readState();
        if (!Number.isInteger(scopeId) || scopeId < 0 || scopeId >= state.plan.scopes.length)
            throw new Error("invalid Script function scope");
        const scope = state.plan.scopes[scopeId];
        const entry = state.nodes.scopes.get(scopeId);
        const fn = state.plan.functions.find(candidate => candidate.scope === scopeId);
        if (scope.kind !== "function" || fn === undefined || scope.strict !== fn.strictness.strict ||
            entry === undefined || entry.node === null || entry.node.kind !== "function")
            throw new Error("invalid Script function association");
        if (scope.parent === null || fn.strictness.inheritedStrict !== state.plan.scopes[scope.parent].strict ||
            scope.strict !== (fn.strictness.ownStrict || fn.strictness.inheritedStrict))
            throw new Error("invalid Script function strictness");
        const node = entry.node;
        const source = node.source;
        if (source === null || source.source !== state.nodes.source || source.source.text !== state.plan.unit.text ||
            source.start !== fn.start || source.end !== fn.end || entry.body !== node.body)
            throw new Error("invalid Script function provenance");
        return { scope, fn, node, source };
    }
    #classDefinition(scopeId: number): ClassExpr {
        const state = this.#readState();
        const scope = state.plan.scopes[scopeId], entry = state.nodes.scopes.get(scopeId);
        if (scope === undefined || scope.kind !== "class" || entry === undefined || entry.node === null || entry.node.kind !== "class")
            throw new Error("invalid class definition association");
        return entry.node;
    }
    static validateClassConstructor(record: ExecutableScript, callable: ScriptGuestCallable, key: ExecutionKey): void {
        const state = ExecutableScript.state(record, key);
        const metadata = ScriptGuestCallable.check(callable, record.#activationKey, record);
        const info = metadata.classConstructor;
        if (info === null) throw new Error("class constructor metadata required");
        const node = record.#classDefinition(info.scope);
        const expectedBody = node.constructorMethod === null ? null : state.scopes.get(node.constructorMethod);
        if (expectedBody === undefined || info.derived !== (node.heritage !== null) || info.bodyScope !== expectedBody || metadata.scopeId !== (info.bodyScope ?? info.scope) ||
            metadata.text !== node.source.text.slice(node.start, node.end) || !metadata.strict || metadata.lexicalThis)
            throw new Error("invalid class constructor provenance");
    }
    static materializeClassConstructor(record: ExecutableScript, scopeId: number, environment: ScriptEnvironment, name: string,
        prototypeObject: GuestObject, constructorParent: GuestObject, context: OperationContext, key: ExecutionKey): ValueCompletion {
        const state = ExecutableScript.state(record, key);
        record.#validateEnvironment(environment, context);
        const node = record.#classDefinition(scopeId);
        const bodyScope = node.constructorMethod === null ? null : state.scopes.get(node.constructorMethod);
        if (bodyScope === undefined) throw new Error("missing constructor body scope");
        const entry = bodyScope === null ? null : record.#function(bodyScope);
        const budget = context.tick(node.loc);
        if (budget.type === "throw") return budget;
        const callable = ScriptGuestCallable.create({ homeObject: prototypeObject, async: false, generator: false, key: record.#activationKey, record, realm: state.realm,
            scopeId: bodyScope ?? scopeId, environment, strict: true, lexicalThis: false,
            classConstructor: { scope: scopeId, bodyScope, derived: node.heritage !== null }, unit: state.plan.unit,
            start: entry === null ? node.start : entry.source.start, end: entry === null ? node.end : entry.source.end,
            text: node.source.text.slice(node.start, node.end), formals: entry === null ? [] : entry.node.params.slice() });
        const object = new GuestObject(constructorParent, false, callable, callable);
        const value: Value = { kind: "object", object };
        let length = entry === null ? 0 : entry.node.parameters!.length - (entry.source.rest === true ? 1 : 0);
        if (entry !== null && entry.node.parameters !== undefined) {
            for (let i = 0; i < entry.node.parameters.length; i++) if (entry.node.parameters[i].initializer !== null) { length = i; break; }
        }
        object.bootstrapDefine("length", { value: { kind: "number", value: length }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("prototype", { value: { kind: "object", object: prototypeObject }, writable: false, enumerable: false, configurable: false });
        prototypeObject.bootstrapDefine("constructor", { value, writable: true, enumerable: false, configurable: true });
        record.#completedMaterializations++;
        return normal(value);
    }
    static makeMethod(value: Value, homeObject: GuestObject, key: ExecutionKey): void {
        if (key !== executionKey || value.kind !== "object" || value.object.callable?.kind !== "script-guest") throw new Error("invalid method materialization");
        const callable = value.object.callable, record = callable.record;
        const metadata = ScriptGuestCallable.check(callable, record.#activationKey, record);
        if (metadata.homeObject !== null || record.#function(metadata.scopeId).source.method !== true) throw new Error("invalid method home object");
        metadata.homeObject = homeObject;
    }
    materializeFunction(scopeId: number, environment: ScriptEnvironment, inferredName: string | null, context: OperationContext, prototype: GuestObject | null = null): ValueCompletion {
        this.#validateEnvironment(environment, context);
        const state = this.#readState();
        const entry = this.#function(scopeId);
        if ((entry.fn.declaration !== null && inferredName !== null) || (inferredName !== null && typeof inferredName !== "string"))
            throw new Error("invalid Script inferred name");
        const name = entry.source.name !== undefined ? entry.source.name.name
            : entry.fn.declaration === null ? (inferredName === null ? "" : inferredName)
            : state.plan.declarations[entry.fn.declaration].site.name;
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") return budget;
        let namedEnvironment: ScriptDeclarativeEnvironment | null = null;
        if (entry.source.name !== undefined) {
            namedEnvironment = new ScriptDeclarativeEnvironment(environment);
            const created = namedEnvironment.createImmutableBinding(name, entry.source.name.loc, false);
            if (created.type === "throw") return created;
            environment = namedEnvironment;
        }
        const callable = ScriptGuestCallable.create({ homeObject: null, async: entry.source.async === true, generator: entry.source.generator === true, classConstructor: null, key: this.#activationKey, record: this, realm: state.realm,
            scopeId, environment, strict: entry.scope.strict, lexicalThis: entry.source.arrow === true,
            unit: state.plan.unit, start: entry.source.start, end: entry.source.end,
            text: entry.source.source.text.slice(entry.source.start, entry.source.end), formals: entry.node.params.slice() });
        const constructable = entry.source.method !== true && entry.source.arrow !== true && entry.source.generator !== true && entry.source.async !== true;
        const object = new GuestObject(prototype === null ? (entry.source.async === true ? (entry.source.generator === true ? state.realm.asyncGeneratorFunctionPrototype : state.realm.asyncFunctionPrototype) : entry.source.generator === true ? state.realm.generatorFunctionPrototype : state.realm.functionPrototype) : prototype, false, callable, constructable ? callable : null);
        const value: Value = { kind: "object", object };
        let length = entry.node.parameters!.length - (entry.source.rest === true ? 1 : 0);
        if (entry.node.parameters !== undefined) {
            for (let i = 0; i < entry.node.parameters.length; i++) {
                if (entry.node.parameters[i].initializer !== null) { length = i; break; }
            }
        }
        object.bootstrapDefine("length", { value: { kind: "number", value: length }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
        if (constructable || entry.source.generator === true) {
            const prototypeObject = new GuestObject(entry.source.generator === true ? (entry.source.async === true ? state.realm.asyncGeneratorPrototype : state.realm.generatorPrototype) : state.realm.objectPrototype);
            if (constructable) prototypeObject.bootstrapDefine("constructor", { value, writable: true, enumerable: false, configurable: true });
            object.bootstrapDefine("prototype", { value: { kind: "object", object: prototypeObject }, writable: true, enumerable: false, configurable: false });
        }
        if (namedEnvironment !== null) {
            const initialized = namedEnvironment.initializeBinding(name, value, context, entry.node.loc);
            if (initialized.type === "throw") return initialized;
        }
        this.#completedMaterializations++;
        return normal(value);
    }
    createFunctionEnvironment(callable: ScriptGuestCallable, receiver: Value, context: OperationContext, newTarget: Value = UNDEFINED, callee: GuestObject | null = null): ScriptFunctionEnvironmentCompletion {
        const metadata = ScriptGuestCallable.check(callable, this.#activationKey, this);
        if (metadata.classConstructor !== null) ExecutableScript.validateClassConstructor(this, callable, executionKey);
        this.#validateEnvironment(metadata.environment, context);
        const state = this.#readState();
        const entry = this.#function(metadata.scopeId);
        if (metadata.unit !== state.plan.unit || metadata.start !== entry.source.start || metadata.end !== entry.source.end ||
            callable.record !== this || callable.realm !== state.realm || callable.scopeId !== metadata.scopeId || callable.environment !== metadata.environment ||
            callable.kind !== "script-guest" || metadata.strict !== entry.scope.strict || callable.strict !== metadata.strict ||
            metadata.lexicalThis !== (entry.source.arrow === true) ||
            callable.thisMode !== (metadata.lexicalThis ? "lexical" : metadata.strict ? "strict" : "global") || callable.privateEnvironment !== null)
            throw new Error("invalid Script callable metadata");
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") { const abrupt: ThrowCompletion = budget; return abrupt; }
        if (newTarget.kind !== "undefined" && (newTarget.kind !== "object" || newTarget.object.constructorSlot === null))
            throw new Error("invalid function newTarget");
        let boundThis = receiver;
        if (metadata.lexicalThis) {
            let outer = metadata.environment;
            while (outer.kind === "declarative") {
                const tick = context.tick(entry.node.loc);
                if (tick.type === "throw") return tick;
                outer = outer.outer;
            }
            boundThis = outer.kind === "function" ? outer.thisValue : state.realm.globalThisValue;
        } else if (!metadata.strict) {
            if (receiver.kind === "null" || receiver.kind === "undefined") boundThis = state.realm.globalThisValue;
            else if (receiver.kind !== "object") {
                const boxed = toObject(receiver, context, entry.node.loc);
                if (boxed.type === "throw") { const abrupt: ThrowCompletion = boxed; return abrupt; }
                boundThis = { kind: "object", object: boxed.value };
            }
        }
        return { type: "normal", environment: new FunctionActivation(this.#activationKey, metadata.scopeId, metadata.environment, callable, boundThis, newTarget, callee) };
    }
    instantiateFunction(environment: ScriptFunctionEnvironment, args: Value[], context: OperationContext): ValueCompletion {
        return this.#instantiateFunction(environment, args, context, null);
    }
    #instantiateFunction(environment: ScriptFunctionEnvironment, args: Value[], context: OperationContext, execution: FunctionExecution | null): ValueCompletion {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid Script function activation");
        const metadata = ScriptGuestCallable.check(environment.callable, this.#activationKey, this);
        this.#validateEnvironment(environment, context);
        const state = this.#readState();
        const entry = this.#function(metadata.scopeId);
        const parameters = entry.node.parameters;
        const parameterExpressions = hasParameterExpressions(parameters);
        const hasPatterns = hasParameterPatterns(parameters);
        if ((parameterExpressions || hasPatterns) && execution === null) throw new Error("default parameter initialization requires Script execution");
        const needsArguments = this.#needsArguments(metadata.scopeId);
        if (needsArguments && (execution === null || execution.callee.callable !== environment.callable))
            throw new Error("arguments initialization requires Script execution");
        if (environment.outer !== metadata.environment || metadata.realm !== state.realm || metadata.unit !== state.plan.unit ||
            metadata.start !== entry.source.start || metadata.end !== entry.source.end)
            throw new Error("invalid Script function activation metadata");
        environment.checkFresh(this.#activationKey, metadata.scopeId);
        const argumentsList = args.slice();
        environment.begin(this.#activationKey, metadata.scopeId);
        const selected = new Map<string, boolean>();
        const winners: Declaration[] = [];
        for (let i = entry.scope.varDeclarations.length - 1; i >= 0; i--) {
            const declaration = state.plan.declarations[entry.scope.varDeclarations[i]];
            const tick = this.#setupTick(context, declaration.site.loc);
            if (tick.type === "throw") return tick;
            if (declaration.kind === "function" && !selected.has(declaration.site.name)) {
                selected.set(declaration.site.name, true);
                winners.push(declaration);
            }
        }
        winners.reverse();
        let parameterEnvironment: ScriptFunctionEnvironment | ScriptDeclarativeEnvironment = environment;
        if (parameterExpressions && !metadata.strict) {
            const tick = this.#setupTick(context, entry.node.loc);
            if (tick.type === "throw") return tick;
            parameterEnvironment = new ScriptDeclarativeEnvironment(environment);
        }
        if ((parameterExpressions || hasPatterns) && execution !== null) execution.enter(parameterEnvironment);
        const parameterNames = new Set(entry.scope.formals.map(formal => formal.name));
        const hasDuplicates = parameterNames.size !== entry.scope.formals.length;
        if (hasDuplicates && (metadata.strict || parameterExpressions || hasPatterns || entry.source.rest === true))
            throw new Error("invalid duplicate parameter activation");
        for (const formal of entry.scope.formals) {
            const tick = this.#setupTick(context, formal.loc);
            if (tick.type === "throw") return tick;
            const present = parameterEnvironment.hasBinding(formal.name, formal.loc);
            if (present.type === "throw") return present;
            if (present.value) continue;
            const created = parameterEnvironment.createMutableBinding(formal.name, formal.loc);
            if (created.type === "throw") return created;
            if (hasDuplicates) {
                const initialized = parameterEnvironment.initializeBinding(formal.name, UNDEFINED, context, formal.loc);
                if (initialized.type === "throw") return initialized;
            }
        }
        if (needsArguments) {
            if (execution === null) throw new Error("missing arguments execution");
            const mapped = !metadata.strict && !parameterExpressions && !hasPatterns && entry.source.rest !== true;
            const cells: (ScriptBindingCell | null)[] = [];
            if (mapped) {
                const last = new Map<string, number>();
                for (let i = 0; i < entry.scope.formals.length; i++) last.set(entry.scope.formals[i].name, i);
                for (let i = 0; i < entry.scope.formals.length; i++) {
                    const name = entry.scope.formals[i].name;
                    cells.push(last.get(name) === i ? parameterEnvironment.parameterCell(name) : null);
                }
            }
            const object = createArgumentsObject(state.realm, argumentsList, mapped ? execution.callee : null, cells, context, entry.node.loc);
            if (object.type === "throw") return object;
            const created = metadata.strict ? parameterEnvironment.createImmutableBinding("arguments", entry.node.loc)
                : parameterEnvironment.createMutableBinding("arguments", entry.node.loc);
            if (created.type === "throw") return created;
            const initialized = parameterEnvironment.initializeBinding("arguments", object.value, context, entry.node.loc);
            if (initialized.type === "throw") return initialized;
        }
        for (let i = 0; i < parameters!.length; i++) {
            const parameter = parameters![i];
            const loc = parameter.kind === "identifier" ? parameter.site.loc : parameter.pattern.loc;
            const tick = this.#setupTick(context, loc);
            if (tick.type === "throw") return tick;
            let value = i < argumentsList.length ? argumentsList[i] : UNDEFINED;
            const initializer = parameter.initializer;
            if (value.kind === "undefined" && initializer !== null) {
                if (execution === null) throw new Error("missing parameter execution");
                const evaluated = execution.evaluate(initializer, parameter.kind === "identifier" ? parameter.site.name : null);
                if (evaluated.type === "throw") return evaluated;
                value = evaluated.value;
            }
            if (entry.source.rest === true && i === parameters!.length - 1) {
                const array = state.realm.createArray();
                for (let j = i; j < argumentsList.length; j++) {
                    const copyTick = this.#setupTick(context, loc);
                    if (copyTick.type === "throw") return copyTick;
                    const defined = array.defineOwnProperty(String(j - i), {
                        value: argumentsList[j], writable: true, enumerable: true, configurable: true,
                    }, context, loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh rest array element invariant");
                }
                value = { kind: "object", object: array };
            }
            if (parameter.kind === "pattern") {
                if (execution === null) throw new Error("missing parameter pattern execution");
                const initialized = execution.initializePattern(parameter.pattern, value, parameterEnvironment);
                if (initialized.type === "throw") return initialized;
                continue;
            }
            const initialized = hasDuplicates
                ? parameterEnvironment.setMutableBinding(parameter.site.name, value, context, loc, false)
                : parameterEnvironment.initializeBinding(parameter.site.name, value, context, loc);
            if (initialized.type === "throw") return initialized;
        }
        let variableEnvironment: ScriptFunctionEnvironment | ScriptDeclarativeEnvironment = parameterEnvironment;
        if (parameterExpressions) {
            const tick = this.#setupTick(context, entry.node.loc);
            if (tick.type === "throw") return tick;
            variableEnvironment = new ScriptDeclarativeEnvironment(parameterEnvironment);
        }
        for (const id of entry.scope.varDeclarations) {
            const site = state.plan.declarations[id].site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const present = variableEnvironment.hasBinding(site.name, site.loc);
            if (present.type === "throw") return present;
            if (present.value) continue;
            const createTick = this.#setupTick(context, site.loc);
            if (createTick.type === "throw") return createTick;
            const created = variableEnvironment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
            const initializeTick = this.#setupTick(context, site.loc);
            if (initializeTick.type === "throw") return initializeTick;
            let initialValue = UNDEFINED;
            if (parameterExpressions && !selected.has(site.name)) {
                const parameter = parameterEnvironment.hasBinding(site.name, site.loc);
                if (parameter.type === "throw") return parameter;
                if (parameter.value) {
                    const value = parameterEnvironment.getBindingValue(site.name, context, site.loc);
                    if (value.type === "throw") return value;
                    initialValue = value.value;
                }
            }
            const initialized = variableEnvironment.initializeBinding(site.name, initialValue, context, site.loc);
            if (initialized.type === "throw") return initialized;
        }
        if (state.plan.legacyBlockFunctions !== undefined) for (const id of state.plan.legacyBlockFunctions) {
            const declaration = state.plan.declarations[id];
            if (declaration.variableScope !== metadata.scopeId || declaration.site.name === "arguments") continue;
            const site = declaration.site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const present = variableEnvironment.hasBinding(site.name, site.loc);
            if (present.type === "throw") return present;
            if (present.value) continue;
            const created = variableEnvironment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
            const initialized = variableEnvironment.initializeBinding(site.name, UNDEFINED, context, site.loc);
            if (initialized.type === "throw") return initialized;
        }
        // Sloppy functions separate body lexicals from parameter/var bindings,
        // even when empty. Hoisted functions capture this body environment.
        let lexicalEnvironment: ScriptEnvironment = variableEnvironment;
        if (!metadata.strict) {
            const tick = this.#setupTick(context, entry.node.loc);
            if (tick.type === "throw") return tick;
            lexicalEnvironment = new ScriptDeclarativeEnvironment(variableEnvironment);
        }
        for (const id of entry.scope.lexicalDeclarations) {
            const declaration = state.plan.declarations[id];
            const site = declaration.site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const created = declaration.kind === "const" ? lexicalEnvironment.createImmutableBinding(site.name, site.loc)
                : lexicalEnvironment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
        }
        for (const declaration of winners) {
            if (declaration.functionScope === null) throw new Error("missing Script function scope");
            const value = this.materializeFunction(declaration.functionScope, lexicalEnvironment, null, context);
            if (value.type === "throw") return value;
            const tick = this.#setupTick(context, declaration.site.loc);
            if (tick.type === "throw") return tick;
            const written = variableEnvironment.setMutableBinding(declaration.site.name, value.value, context, declaration.site.loc);
            if (written.type === "throw") return written;
        }
        environment.complete(this.#activationKey, metadata.scopeId, lexicalEnvironment, variableEnvironment);
        return normal();
    }
    // Publish only a completed activation's original body environment.
    functionBodyEnvironment(environment: ScriptFunctionEnvironment): ScriptEnvironment {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid Script function activation");
        return environment.bodyEnvironment(this.#activationKey);
    }
    functionVariableEnvironment(environment: ScriptFunctionEnvironment): ScriptEnvironment {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid Script function activation");
        return environment.variableEnvironment(this.#activationKey);
    }
    #setupTick(context: OperationContext, loc: Location): ValueCompletion {
        return context.tick({ line: loc.line, column: loc.column });
    }
    #block(scopeId: number) {
        const state = this.#readState();
        if (!Number.isInteger(scopeId) || scopeId < 0 || scopeId >= state.plan.scopes.length)
            throw new Error("invalid Script block scope");
        const scope = state.plan.scopes[scopeId];
        const entry = state.nodes.scopes.get(scopeId);
        if (entry === undefined || entry.node === null || scope.parent === null ||
            scope.strict !== state.plan.scopes[scope.parent].strict)
            throw new Error("invalid Script block association");
        if (scope.kind === "block" && entry.node.kind === "block" && entry.body === entry.node.body)
            return { scope, node: entry.node, loc: entry.node.loc };
        if (scope.kind === "switch" && entry.node.kind === "switch" && entry.body === entry.node.caseBlock.body)
            return { scope, node: entry.node, loc: entry.node.caseBlock.loc };
        throw new Error("invalid Script block association");
    }
    createBlockEnvironment(scopeId: number, outer: ScriptEnvironment, context: OperationContext): ScriptBlockEnvironmentCompletion {
        this.#validateEnvironment(outer, context);
        const entry = this.#block(scopeId);
        const tick = this.#setupTick(context, entry.loc);
        if (tick.type === "throw") { const abrupt: ThrowCompletion = tick; return abrupt; }
        return { type: "normal", environment: new BlockActivation(this.#activationKey, scopeId, outer) };
    }
    instantiateBlock(scopeId: number, environment: ScriptDeclarativeEnvironment, context: OperationContext): ValueCompletion {
        if (!(environment instanceof BlockActivation)) throw new Error("invalid Script block activation");
        this.#validateEnvironment(environment, context);
        const entry = this.#block(scopeId);
        const state = this.#readState();
        environment.checkFresh(this.#activationKey, scopeId);
        environment.begin(this.#activationKey, scopeId);
        for (const id of entry.scope.lexicalDeclarations) {
            const declaration = state.plan.declarations[id];
            const tick = this.#setupTick(context, declaration.site.loc);
            if (tick.type === "throw") return tick;
            const created = declaration.kind === "const" ? environment.createImmutableBinding(declaration.site.name, declaration.site.loc)
                : environment.createMutableBinding(declaration.site.name, declaration.site.loc);
            if (created.type === "throw") return created;
            if (declaration.kind === "function") {
                if (declaration.functionScope === null) throw new Error("missing Script block function scope");
                const value = this.materializeFunction(declaration.functionScope, environment, null, context);
                if (value.type === "throw") return value;
                const initializeTick = this.#setupTick(context, declaration.site.loc);
                if (initializeTick.type === "throw") return initializeTick;
                const initialized = environment.initializeBinding(declaration.site.name, value.value, context, declaration.site.loc);
                if (initialized.type === "throw") return initialized;
            }
        }
        environment.complete(this.#activationKey, scopeId);
        return normal();
    }
    createGlobalMaterializer(environment: GlobalEnvironment, context: OperationContext): DeclarationMaterializer {
        this.#validateEnvironment({ kind: "global", record: environment }, context);
        const state = this.#readState();
        return (declaration, fn, suppliedEnvironment, unit, suppliedContext): ValueCompletion => {
            if (suppliedEnvironment !== environment || suppliedContext !== context || unit !== state.plan.unit ||
                declaration !== state.plan.declarations[declaration.id] ||
                fn !== state.plan.functions.find(candidate => candidate.declaration === declaration.id) ||
                declaration.functionScope !== fn.scope)
                throw new Error("invalid Script global materializer identity");
            this.#validateEnvironment({ kind: "global", record: environment }, context);
            return this.materializeFunction(fn.scope, { kind: "global", record: environment }, null, context);
        };
    }
    static instantiateEval(record: ExecutableScript, lexical: ScriptDeclarativeEnvironment, variable: ScriptEnvironment,
        context: OperationContext, enabledLegacyFunctions: Set<number>, key: ExecutionKey): ValueCompletion {
        const state = ExecutableScript.state(record, key), plan = state.plan, root = plan.scopes[0];
        record.#validateEnvironment(lexical, context);
        record.#validateEnvironment(variable, context);
        for (const id of root.varDeclarations) {
            const site = plan.declarations[id].site;
            const conflict = record.#evalBindingConflict(lexical, variable, site, context, true);
            if (conflict.type === "throw") return conflict;
            if (conflict.value) return languageFailure(context.realm, "SyntaxError", "eval declaration conflicts with lexical binding: " + site.name, site.loc);
        }
        const selected = new Set<string>(), functions: Declaration[] = [];
        for (let i = root.varDeclarations.length - 1; i >= 0; i--) {
            const declaration = plan.declarations[root.varDeclarations[i]], site = declaration.site;
            const tick = context.tick(site.loc);
            if (tick.type === "throw") return tick;
            if (declaration.kind !== "function" || selected.has(site.name)) continue;
            if (variable.kind === "global") {
                const allowed = variable.record.canDeclareGlobalFunction(site.name);
                if (allowed.type === "throw") return allowed;
                if (!allowed.value) return languageFailure(context.realm, "TypeError", "cannot declare eval function: " + site.name, site.loc);
            }
            selected.add(site.name);
            functions.push(declaration);
        }
        functions.reverse();
        const variables = new Map<string, DeclarationSite>();
        for (const id of root.varDeclarations) {
            const declaration = plan.declarations[id], site = declaration.site;
            const tick = context.tick(site.loc);
            if (tick.type === "throw") return tick;
            if (declaration.kind !== "var" || selected.has(site.name)) continue;
            if (variable.kind === "global") {
                const allowed = variable.record.canDeclareGlobalVar(site.name);
                if (allowed.type === "throw") return allowed;
                if (!allowed.value) return languageFailure(context.realm, "TypeError", "cannot declare eval var: " + site.name, site.loc);
            }
            if (!variables.has(site.name)) variables.set(site.name, site);
        }
        if (plan.legacyBlockFunctions !== undefined) for (const id of plan.legacyBlockFunctions) {
            const declaration = plan.declarations[id], site = declaration.site;
            if (declaration.variableScope !== 0) continue;
            const conflict = record.#evalBindingConflict(lexical, variable, site, context, false);
            if (conflict.type === "throw") return conflict;
            if (conflict.value) continue;
            if (variable.kind === "global") {
                const allowed = variable.record.canDeclareGlobalVar(site.name);
                if (allowed.type === "throw") return allowed;
                if (!allowed.value) continue;
            }
            if (!selected.has(site.name) && !variables.has(site.name)) {
                const created = record.#createEvalVar(variable, site, context);
                if (created.type === "throw") return created;
                selected.add(site.name);
            }
            enabledLegacyFunctions.add(id);
        }
        for (const id of root.lexicalDeclarations) {
            const declaration = plan.declarations[id], site = declaration.site;
            const tick = context.tick(site.loc);
            if (tick.type === "throw") return tick;
            const created = declaration.kind === "const" ? lexical.createImmutableBinding(site.name, site.loc)
                : lexical.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
        }
        for (const declaration of functions) {
            if (declaration.functionScope === null) throw new Error("eval function scope missing");
            const site = declaration.site;
            const value = record.materializeFunction(declaration.functionScope, lexical, null, context);
            if (value.type === "throw") return value;
            if (variable.kind === "global") {
                const created = variable.record.createGlobalFunctionBinding(site.name, value.value, context, site.loc, true);
                if (created.type === "throw") return created;
            } else {
                const present = variable.hasBinding(site.name, site.loc);
                if (present.type === "throw") return present;
                if (present.value) {
                    const assigned = variable.setMutableBinding(site.name, value.value, context, site.loc, false);
                    if (assigned.type === "throw") return assigned;
                } else {
                    const created = variable.createMutableBinding(site.name, site.loc, true);
                    if (created.type === "throw") return created;
                    const initialized = variable.initializeBinding(site.name, value.value, context, site.loc);
                    if (initialized.type === "throw") return initialized;
                }
            }
        }
        for (const site of variables.values()) {
            const created = record.#createEvalVar(variable, site, context);
            if (created.type === "throw") return created;
        }
        return normal();
    }
    #evalBindingConflict(lexical: ScriptEnvironment, variable: ScriptEnvironment, site: DeclarationSite,
        context: OperationContext, skipCatch: boolean): InternalBooleanCompletion {
        if (variable.kind === "global" && variable.record.hasLexicalDeclaration(site.name)) return { type: "normal", value: true };
        let current = lexical;
        while (current !== variable) {
            const tick = context.tick(site.loc);
            if (tick.type === "throw") return tick;
            if (current.kind === "global") throw new Error("eval variable environment is not an ancestor");
            if (!skipCatch || !(current instanceof CatchActivation)) {
                const present = current.hasBinding(site.name, site.loc);
                if (present.type === "throw" || present.value) return present;
            }
            current = current.outer;
        }
        return { type: "normal", value: false };
    }
    #createEvalVar(variable: ScriptEnvironment, site: DeclarationSite, context: OperationContext): ValueCompletion {
        const tick = context.tick(site.loc);
        if (tick.type === "throw") return tick;
        if (variable.kind === "global") return variable.record.createGlobalVarBinding(site.name, context, site.loc, true);
        const present = variable.hasBinding(site.name, site.loc);
        if (present.type === "throw") return present;
        if (present.value) return normal();
        const created = variable.createMutableBinding(site.name, site.loc, true);
        if (created.type === "throw") return created;
        return variable.initializeBinding(site.name, UNDEFINED, context, site.loc);
    }
    instantiateGlobals(environment: GlobalEnvironment, context: OperationContext, enabledLegacyFunctions: Set<number> | null = null): ValueCompletion {
        const materialize = this.createGlobalMaterializer(environment, context);
        return instantiateBoundedGlobalDeclarations(this.#readState().plan, environment, context, materialize, enabledLegacyFunctions);
    }
    inspectMaterializations(): { completed: number } { return { completed: this.#completedMaterializations }; }
    inspectNamingSites(): { loc: Location; eligible: boolean }[] {
        const result: { loc: Location; eligible: boolean }[] = [];
        for (const [expr, eligible] of this.#readState().nodes.assignmentNameEligible)
            result.push({ loc: { line: expr.loc.line, column: expr.loc.column }, eligible });
        result.sort((a, b) => a.loc.line - b.loc.line || a.loc.column - b.loc.column);
        return result;
    }
    inspect(): ScriptDeclarationPlan {
        const plan = this.#readState().plan;
        const result: ScriptDeclarationPlan = { kind: "complete", goal: "Script", unit: { id: plan.unit.id, text: plan.unit.text },
            consumedUnits: plan.consumedUnits, strictness: copyStrictness(plan.strictness),
            scopes: plan.scopes.map(scope => ({ id: scope.id, kind: scope.kind, parent: scope.parent,
                catchParameter: scope.catchParameter === null ? null : copySite(scope.catchParameter),
                start: scope.start, end: scope.end, strict: scope.strict, formals: scope.formals.map(copySite),
                lexicalDeclarations: scope.lexicalDeclarations.slice(), varDeclarations: scope.varDeclarations.slice(),
                lexicalNames: scope.lexicalNames.slice(), varNames: scope.varNames.slice() })),
            declarations: plan.declarations.map(declaration => ({ id: declaration.id, kind: declaration.kind,
                site: copySite(declaration.site), scope: declaration.scope, variableScope: declaration.variableScope,
                functionScope: declaration.functionScope, initializer: declaration.initializer === null ? null :
                    { start: declaration.initializer.start, end: declaration.initializer.end } })),
            functions: plan.functions.map(fn => ({ scope: fn.scope, declaration: fn.declaration,
                start: fn.start, end: fn.end, strictness: copyStrictness(fn.strictness) })) };
        return plan.legacyBlockFunctions === undefined ? result : { ...result, legacyBlockFunctions: plan.legacyBlockFunctions.slice() };
    }
    inspectNodes(): ScriptNodeInspection {
        const state = this.#readState();
        const result: ScriptNodeInspection = { scopes: [], declarations: [] };
        for (const scope of state.plan.scopes) {
            const entry = state.nodes.scopes.get(scope.id);
            if (entry === undefined) throw new Error("missing Script scope");
            const node = entry.node;
            const source = node !== null && node.kind === "function" ? node.source : null;
            result.scopes.push({ id: scope.id, kind: node === null ? "script" : node.kind,
                loc: node === null ? null : { line: node.loc.line, column: node.loc.column },
                bodyLength: entry.body.length, parameters: node !== null && node.kind === "function" ? node.params.slice() : [],
                start: source === null ? null : source.start, end: source === null ? null : source.end,
                text: source === null ? null : source.source.text.slice(source.start, source.end) });
        }
        for (const declaration of state.plan.declarations) {
            const entry = state.nodes.declarations.get(declaration.id);
            if (entry === undefined) throw new Error("missing Script declaration");
            result.declarations.push({ id: declaration.id, kind: entry.node.kind,
                loc: { line: entry.node.loc.line, column: entry.node.loc.column },
                initializerKind: entry.initializer === null ? null : entry.initializer.kind });
        }
        return result;
    }
}
export function prepareStrictScript(unit: ScriptSourceUnit, realm: Realm): ScriptPreparation {
    return ExecutableScript.prepare(unit, realm, false);
}
function copySite(site: DeclarationSite): DeclarationSite {
    return { name: site.name, start: site.start, end: site.end, loc: { line: site.loc.line, column: site.loc.column } };
}
export function prepareBoundedScript(unit: ScriptSourceUnit, realm: Realm): ScriptPreparation {
    return ExecutableScript.prepare(unit, realm, true);
}
export type DynamicFunctionKind = "ordinary" | "generator" | "async" | "async-generator";
function dynamicFunctionRecord(source: string, parametersOnly: boolean, context: OperationContext, loc: Location, kind: DynamicFunctionKind):
    { type: "normal"; record: ExecutableScript; scope: number } | ThrowCompletion {
    for (let i = 0; i < source.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
    }
    const prepared = prepareBoundedScript({ id: kind === "async-generator" ? "<AsyncGeneratorFunction>" : kind === "async" ? "<AsyncFunction>" : kind === "generator" ? "<GeneratorFunction>" : "<Function>", text: source }, context.realm);
    if (prepared.kind === "profile-rejected") throw new Error("invalid dynamic function Realm");
    if (prepared.kind === "conflict") return languageFailure(context.realm, "SyntaxError", prepared.diagnostic.message, loc);
    if (prepared.kind === "blocked") {
        const rejection = prepared.rejection;
        if (rejection.kind === "resource-limit")
            return resourceFailure(rejection.guardCode, rejection.count, rejection.limit, prepared.diagnostic.message, loc);
        if (rejection.kind === "syntax-error") return languageFailure(context.realm, "SyntaxError", prepared.diagnostic.message, loc);
        return unsupportedFailure("runtime.dynamic-function-source", "SyntaxError", prepared.diagnostic.message, loc);
    }
    const state = ExecutableScript.state(prepared.record, executionKey);
    const node = state.nodes.body[0];
    if (state.nodes.body.length !== 1 || node.kind !== "function" || node.name !== "anonymous" || node.source === null ||
        node.source.start !== 0 || node.source.end !== source.length || (parametersOnly && node.body.length !== 0))
        return languageFailure(context.realm, "SyntaxError", "invalid dynamic function source boundary", loc);
    return { type: "normal", record: prepared.record, scope: ExecutableScript.scopeOfNode(prepared.record, node, executionKey) };
}
export function createDynamicFunction(parameters: string[], body: string, context: OperationContext, loc: Location, newTarget: GuestObject, kind: DynamicFunctionKind = "ordinary"): ValueCompletion {
    const prefix = kind === "async-generator" ? "async function* anonymous(" : kind === "async" ? "async function anonymous(" : kind === "generator" ? "function* anonymous(" : "function anonymous(", middle = "\n) {\n", suffix = "\n}";
    let length = prefix.length + middle.length + body.length + suffix.length + Math.max(parameters.length - 1, 0);
    for (const parameter of parameters) length += parameter.length;
    if (length > 100000) return resourceFailure("source-units", length, 100000, "dynamic function source exceeds 100000 UTF-16 units", loc);
    const params = parameters.join(",");
    const parameterRecord = dynamicFunctionRecord(prefix + params + middle + suffix, true, context, loc, kind);
    if (parameterRecord.type === "throw") return parameterRecord;
    const bodyRecord = dynamicFunctionRecord(prefix + middle + body + suffix, false, context, loc, kind);
    if (bodyRecord.type === "throw") return bodyRecord;
    const complete = dynamicFunctionRecord(prefix + params + middle + body + suffix, false, context, loc, kind);
    if (complete.type === "throw") return complete;
    const prototype = getPrototypeFromConstructor(newTarget, kind === "async-generator" ? "AsyncGeneratorFunction" : kind === "async" ? "AsyncFunction" : kind === "generator" ? "GeneratorFunction" : "Function", context, loc);
    if (prototype.type === "throw") return prototype;
    // Materialize the declaration without instantiating an anonymous global binding.
    return complete.record.materializeFunction(complete.scope, { kind: "global", record: context.realm.globalEnvironment }, null, context, prototype.value);
}
function copyStrictness(strictness: StrictnessMetadata): StrictnessMetadata {
    return { ownStrict: strictness.ownStrict, inheritedStrict: strictness.inheritedStrict, strict: strictness.strict,
        directives: strictness.directives.map(d => ({ start: d.start, end: d.end, statementEnd: d.statementEnd,
            loc: { line: d.loc.line, column: d.loc.column }, raw: d.raw, useStrict: d.useStrict })) };
}

import { GuestPromise, promiseResolve, intrinsicPromiseCapability, fatalPromiseCompletion, type PromiseCapability } from "./promise.js";
import { stringConcat } from "./strings.js";
import { GuestArray } from "./array-object.js";
import { toObject } from "./object-conversion.js";
import { applyUnaryValueOperator } from "./unary-operator.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, toString, toPropertyKey } from "./conversion.js";

import { updateScriptEmpty, scriptExpressionCompletion, type ScriptStatementCompletion, type ScriptStatementPayload } from "./script-completion.js";
class ExecutionKey {}
const executionKey = new ExecutionKey();
export type ScriptJobFailure = { readonly completion: ThrowCompletion; readonly source: ScriptSourceSnapshot };
export type ScriptJobDrain = { readonly completed: number; readonly failures: ScriptJobFailure[]; readonly fatal: boolean };
type QueuedScriptJob = { readonly realm: Realm; readonly run: (context: OperationContext) => ValueCompletion; readonly source: ScriptSourceSnapshot };
export type ScriptLimits = { readonly maxSteps: number; readonly maxCalls: number };
export type ScriptEvaluation = { phase: "body"; completion: ValueCompletion } | { phase: "instantiation"; completion: ThrowCompletion };
export type ScriptSourceSnapshot = { readonly realm: Realm; readonly record: ExecutableScript; readonly unitId: string; readonly loc: Location };
export type ScriptThrowInspection =
    | { readonly kind: "available"; readonly name: string; readonly realm: Realm }
    | { readonly kind: "absent" | "non-callable" | "foreign-profile" }
    | { readonly kind: "non-string-name"; readonly realm: Realm }
    | { readonly kind: "abrupt" | "resource-limit" | "unsupported-operation";
        readonly completion: ThrowCompletion; readonly source: ScriptSourceSnapshot };
export type ObservedScriptEvaluation = { readonly evaluation: ScriptEvaluation;
    readonly source: ScriptSourceSnapshot | null; readonly inspection: ScriptThrowInspection | null };
export type ScriptFrameSnapshot = { readonly realm: Realm; readonly record: ExecutableScript;
    readonly scopeId: number; readonly lexical: ScriptEnvironment; readonly variable: ScriptEnvironment;
    readonly strict: boolean; readonly thisValue: Value; readonly function: ScriptGuestCallable | null;
    readonly privateEnvironment: null; readonly phase: "instantiation" | "body" };
export type { GeneratorResumeCallable };
class GeneratorResumeCallable {
    readonly kind = "generator-resume";
    #realm: Realm;
    #mode: GeneratorResumeMode;
    private constructor(realm: Realm, mode: GeneratorResumeMode) { this.#realm = realm; this.#mode = mode; }
    static create(realm: Realm, mode: GeneratorResumeMode): GeneratorResumeCallable { return new GeneratorResumeCallable(realm, mode); }
    static check(callable: GeneratorResumeCallable): void {
        if (!(callable instanceof GeneratorResumeCallable) || !(#mode in callable)) throw new Error("invalid generator resume callable");
    }
    get realm(): Realm { return this.#realm; }
    get mode(): GeneratorResumeMode { return this.#mode; }
}
export function createGeneratorResumeIntrinsic(realm: Realm, mode: GeneratorResumeMode): GuestObject {
    if (realm.profile !== "script") throw new Error("Script Realm required");
    const object = new GuestObject(realm.functionPrototype, false, GeneratorResumeCallable.create(realm, mode));
    object.bootstrapDefine("name", { value: { kind: "string", value: mode }, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: 1 }, configurable: true });
    return object;
}
type GeneratorSequence = { kind: "sequence"; frame: ScriptFrameSnapshot; body: Stmt[]; nextStatement: number; depth: number; labels?: readonly string[] | null };
type GeneratorLoop = { kind: "loop"; frame: ScriptFrameSnapshot; test: Expr; body: Stmt; testFirst: boolean; first: boolean; depth: number; labels?: readonly string[] | null };
type GeneratorForLoop = { kind: "for"; frame: ScriptFrameSnapshot; statement: ForStmt | ForLexicalStmt; outer: ScriptEnvironment | null; first: boolean; phase: "prepare" | "test"; depth: number; labels?: readonly string[] | null };
type GeneratorCatch = { kind: "catch"; frame: ScriptFrameSnapshot; statement: TryCatchStmt; depth: number };
type GeneratorAbrupt = { type: "return"; value: Value } | { type: "break" | "continue"; target?: string } | ThrowCompletion;
type GeneratorPending = GeneratorAbrupt | { type: "normal" };
type GeneratorFinally = { kind: "finally"; frame: ScriptFrameSnapshot; statement: TryFinallyStmt; depth: number };
type GeneratorCleanup = { kind: "cleanup"; frame: ScriptFrameSnapshot; pending: GeneratorPending;
    abrupt: ThrowCompletion | null; source: ScriptSourceSnapshot | null; depth: number };
type GeneratorForOf = { kind: "iterator"; awaiting?: boolean; frame: ScriptFrameSnapshot; statement: ForEachStmt; iterator: IteratorRecord;
    target: Expr | null; lexical: boolean; scopeId: number; depth: number; labels?: readonly string[] | null };
type GeneratorForIn = { kind: "enumerator"; frame: ScriptFrameSnapshot; statement: ForEachStmt; enumerator: ForInEnumerator;
    target: Expr | null; lexical: boolean; scopeId: number; depth: number; labels?: readonly string[] | null };
type GeneratorForSource = { kind: "for-source"; frame: ScriptFrameSnapshot; outer: ScriptFrameSnapshot; statement: ForEachStmt;
    lexical: boolean; scopeId: number; depth: number; labels: readonly string[] | null };
type GeneratorLabel = { kind: "label"; frame: ScriptFrameSnapshot; name: string; depth: number };
type GeneratorSwitch = { kind: "switch"; frame: ScriptFrameSnapshot; depth: number;
    selection: { statement: SwitchStmt; discriminant: Value; nextClause: number; fallback: number } | null };
type AsyncIteratorCloseFrame = { kind: "async-close"; frame: ScriptFrameSnapshot; loc: Location; depth: number; pending: GeneratorAbrupt; abrupt: ThrowCompletion | null; source: ScriptSourceSnapshot | null };
type GeneratorFrame = GeneratorForSource | AsyncIteratorCloseFrame | GeneratorSwitch | GeneratorSequence | GeneratorLoop | GeneratorForLoop | GeneratorCatch | GeneratorFinally | GeneratorCleanup | GeneratorForOf | GeneratorForIn | GeneratorLabel;
type ExecutionContinuation = { asyncGenerator?: true; sequences: GeneratorFrame[]; expressionFrames: GeneratorExpressionFrame[]; yieldLoc: Location | null; receiver: GeneratorYieldReceiver | null; delegate: { iterator: IteratorRecord; asynchronous: AsyncDelegate | null; loc: Location; depth: number } | null };
type ContinuationResult = ValueCompletion | { type: "async-delegate-yield"; value: Value } | { type: "yield"; result: Value } | { type: "await"; value: Value; loc: Location; depth: number };
type ExpressionContinuationResult = ContinuationResult | { type: "suspended-delegate" };
class GuestGenerator extends GuestObject {
    #state: "suspended-start" | "suspended-yield" | "executing" | "completed" = "suspended-start";
    #continuation: ExecutionContinuation | null;
    constructor(key: ExecutionKey, prototype: GuestObject, activation: PreparedFunctionBody) {
        super(prototype);
        if (key !== executionKey) throw new Error("invalid generator allocation");
        this.#continuation = { expressionFrames: [], sequences: [{ kind: "sequence", frame: activation.frame, body: activation.body, nextStatement: 0, depth: 0 }], yieldLoc: null, receiver: null, delegate: null };
    }
    static is(object: GuestObject): object is GuestGenerator {
        if (!(object instanceof GuestGenerator)) return false;
        const branded: GuestGenerator = object;
        return #state in branded;
    }
    get state(): "suspended-start" | "suspended-yield" | "executing" | "completed" { return this.#state; }
    start(key: ExecutionKey): ExecutionContinuation {
        if (key !== executionKey || (this.#state !== "suspended-start" && this.#state !== "suspended-yield") || this.#continuation === null)
            throw new Error("invalid generator resume");
        const continuation = this.#continuation;
        this.#continuation = null;
        this.#state = "executing";
        return continuation;
    }
    suspend(key: ExecutionKey, continuation: ExecutionContinuation): void {
        if (key !== executionKey || this.#state !== "executing") throw new Error("invalid generator suspension");
        this.#continuation = continuation;
        this.#state = "suspended-yield";
    }
    complete(key: ExecutionKey): void {
        if (key !== executionKey) throw new Error("invalid generator completion");
        this.#state = "completed";
        this.#continuation = null;
    }
}

class AsyncActivation {
    #continuation: ExecutionContinuation | null;
    #state: "suspended" | "executing" | "completed" = "suspended";
    constructor(key: ExecutionKey, readonly realm: Realm, readonly capability: PromiseCapability, activation: PreparedFunctionBody) {
        if (key !== executionKey) throw new Error("invalid async activation");
        this.#continuation = { expressionFrames: [], sequences: [{ kind: "sequence", frame: activation.frame, body: activation.body, nextStatement: 0, depth: 0 }], yieldLoc: null, receiver: null, delegate: null };
    }
    start(key: ExecutionKey): ExecutionContinuation {
        if (key !== executionKey || this.#state !== "suspended" || this.#continuation === null) throw new Error("invalid async resume");
        const continuation = this.#continuation;
        this.#continuation = null;
        this.#state = "executing";
        return continuation;
    }
    suspend(key: ExecutionKey, continuation: ExecutionContinuation): void {
        if (key !== executionKey || this.#state !== "executing") throw new Error("invalid async suspension");
        this.#continuation = continuation;
        this.#state = "suspended";
    }
    complete(key: ExecutionKey): void {
        if (key !== executionKey) throw new Error("invalid async completion");
        this.#continuation = null;
        this.#state = "completed";
    }
}
export type { AsyncResumeCallable };
class AsyncResumeCallable {
    readonly kind = "async-resume";
    #activation: AsyncActivation;
    constructor(key: ExecutionKey, readonly realm: Realm, activation: AsyncActivation, readonly mode: "next" | "throw") {
        if (key !== executionKey) throw new Error("invalid async handler");
        this.#activation = activation;
    }
    static activation(callable: AsyncResumeCallable, key: ExecutionKey): AsyncActivation {
        if (key !== executionKey || !(callable instanceof AsyncResumeCallable) || !(#activation in callable))
            throw new Error("invalid async handler access");
        return callable.#activation;
    }
}
function asyncResumeHandler(activation: AsyncActivation, mode: "next" | "throw"): Value {
    const callable = new AsyncResumeCallable(executionKey, activation.realm, activation, mode);
    const object = new GuestObject(activation.realm.functionPrototype, false, callable);
    object.bootstrapDefine("name", { value: { kind: "string", value: "" }, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: 1 }, configurable: true });
    return { kind: "object", object };
}

type AsyncGeneratorWait = "await" | "yield" | "resume-return" | "completed-return";
type AsyncGeneratorRequest = { mode: GeneratorResumeMode; value: Value; capability: PromiseCapability; loc: Location };
type AsyncGeneratorData = { state: "suspended-start" | "suspended-yield" | "executing" | "completed";
    waiting: AsyncGeneratorWait | null; immediateFailure: { value: Value; loc: Location } | null; head: number; continuation: ExecutionContinuation | null; queue: AsyncGeneratorRequest[] };
function abortAsyncGenerator(data: AsyncGeneratorData): void {
    data.state = "completed"; data.waiting = null; data.immediateFailure = null; data.continuation = null; data.queue.length = 0; data.head = 0;
}
class GuestAsyncGenerator extends GuestObject {
    #data: AsyncGeneratorData;
    constructor(key: ExecutionKey, prototype: GuestObject, activation: PreparedFunctionBody) {
        super(prototype);
        if (key !== executionKey) throw new Error("invalid async generator allocation");
        this.#data = { state: "suspended-start", waiting: null, immediateFailure: null, head: 0, queue: [],
            continuation: { asyncGenerator: true, expressionFrames: [], sequences: [{ kind: "sequence", frame: activation.frame, body: activation.body, nextStatement: 0, depth: 0 }], yieldLoc: null, receiver: null, delegate: null } };
    }
    static is(object: GuestObject): object is GuestAsyncGenerator {
        if (!(object instanceof GuestAsyncGenerator)) return false;
        const branded: GuestAsyncGenerator = object;
        return #data in branded;
    }
    static data(object: GuestAsyncGenerator, key: ExecutionKey): AsyncGeneratorData {
        if (key !== executionKey || !GuestAsyncGenerator.is(object)) throw new Error("invalid async generator access");
        return object.#data;
    }
}
export type { AsyncGeneratorCallable };
class AsyncGeneratorCallable {
    readonly kind = "async-generator";
    #generator: GuestAsyncGenerator | null;
    constructor(key: ExecutionKey, readonly realm: Realm, readonly mode: GeneratorResumeMode, generator: GuestAsyncGenerator | null) {
        if (key !== executionKey) throw new Error("invalid async generator callable");
        this.#generator = generator;
    }
    static generator(callable: AsyncGeneratorCallable, key: ExecutionKey): GuestAsyncGenerator | null {
        if (key !== executionKey || !(callable instanceof AsyncGeneratorCallable) || !(#generator in callable)) throw new Error("invalid async generator callable access");
        return callable.#generator;
    }
}
function asyncGeneratorHandler(realm: Realm, mode: GeneratorResumeMode, generator: GuestAsyncGenerator | null): GuestObject {
    const callable = new AsyncGeneratorCallable(executionKey, realm, mode, generator);
    const object = new GuestObject(realm.functionPrototype, false, callable);
    object.bootstrapDefine("name", { value: { kind: "string", value: generator === null ? mode : "" }, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: 1 }, configurable: true });
    return object;
}
export function createAsyncGeneratorResumeIntrinsic(realm: Realm, mode: GeneratorResumeMode): GuestObject {
    return asyncGeneratorHandler(realm, mode, null);
}

type PreparedFunctionBody = { frame: ScriptFrameSnapshot; body: Stmt[]; environment: ScriptFunctionEnvironment };
type FunctionPreparation = { type: "normal"; activation: PreparedFunctionBody } | ThrowCompletion;
export type ScriptSessionSnapshot = { steps: number; calls: number; depth: number;
    active: ScriptFrameSnapshot | null; lastAbrupt: ScriptSourceSnapshot | null };
type BuiltinPermit = { kind: "call"; context: OperationContext; realm: Realm; invoke: Builtin; receiver: Value;
    args: Value[]; loc: Location; used: boolean } |
    { kind: "construct"; context: OperationContext; realm: Realm; invoke: ConstructBuiltin; callee: GuestObject; newTarget: GuestObject;
    args: Value[]; loc: Location; used: boolean };
let pendingBuiltin: BuiltinPermit | null = null;
// Consume-only: possessing a context never creates dispatcher authority. This
// check intentionally reads no context fields; Realm performs profile checks first.
export function consumeScriptBuiltinPermit(context: OperationContext, realm: Realm, invoke: Builtin,
    receiver: Value, args: Value[], loc: Location): boolean {
    const permit = pendingBuiltin;
    if (permit === null || permit.kind !== "call" || permit.used || permit.context !== context || permit.realm !== realm ||
        permit.invoke !== invoke || permit.receiver !== receiver || permit.args !== args || permit.loc !== loc) return false;
    permit.used = true;
    return true;
}
export function consumeScriptConstructorPermit(context: OperationContext, realm: Realm, invoke: ConstructBuiltin,
    callee: GuestObject, newTarget: GuestObject, args: Value[], loc: Location): boolean {
    const permit = pendingBuiltin;
    if (permit === null || permit.kind !== "construct" || permit.used || permit.context !== context || permit.realm !== realm ||
        permit.invoke !== invoke || permit.callee !== callee || permit.newTarget !== newTarget || permit.args !== args || permit.loc !== loc) return false;
    permit.used = true;
    return true;
}
export type { ScriptSession };
class ScriptSession {
    #engine: ExecutionEngine | null = null;
    #limits: ScriptLimits;
    constructor(key: ExecutionKey, limits: ScriptLimits) {
        if (key !== executionKey) throw new Error("invalid Script session constructor");
        this.#limits = { maxSteps: limits.maxSteps, maxCalls: limits.maxCalls };
    }
    static evaluate(session: ScriptSession, record: ExecutableScript): ScriptEvaluation {
        if (!(session instanceof ScriptSession) || !(#engine in session)) throw new Error("invalid Script session");
        const state = ExecutableScript.state(record, executionKey);
        if (state.realm.profile !== "script") throw new Error("Script Realm required");
        if (session.#engine === null) session.#engine = new ExecutionEngine(state.realm, session.#limits.maxSteps, session.#limits.maxCalls, executionKey);
        return session.#engine.runScript(record, executionKey, false).evaluation;
    }
    static evaluateObserved(session: ScriptSession, record: ExecutableScript): ObservedScriptEvaluation {
        if (!(session instanceof ScriptSession) || !(#engine in session)) throw new Error("invalid Script session");
        const state = ExecutableScript.state(record, executionKey);
        if (state.realm.profile !== "script") throw new Error("Script Realm required");
        if (session.#engine === null) session.#engine = new ExecutionEngine(state.realm, session.#limits.maxSteps, session.#limits.maxCalls, executionKey);
        return session.#engine.runScript(record, executionKey, true);
    }
    static drainJobs(session: ScriptSession): ScriptJobDrain {
        if (!(session instanceof ScriptSession) || !(#engine in session)) throw new Error("invalid Script session");
        return session.#engine === null ? { completed: 0, failures: [], fatal: false } : session.#engine.drainJobs(executionKey);
    }
    inspect(): ScriptSessionSnapshot {
        if (!(#engine in this)) throw new Error("invalid Script session");
        return this.#engine === null ? { steps: 0, calls: 0, depth: 0, active: null, lastAbrupt: null } : this.#engine.inspectScript(executionKey);
    }
}
export function createScriptSession(limits: ScriptLimits = { maxSteps: 100000, maxCalls: 64 }): ScriptSession {
    if (!Number.isFinite(limits.maxSteps) || !Number.isInteger(limits.maxSteps) || limits.maxSteps < 0 ||
        !Number.isFinite(limits.maxCalls) || !Number.isInteger(limits.maxCalls) || limits.maxCalls < 0)
        throw new Error("invalid Script limits");
    return new ScriptSession(executionKey, limits);
}
export function drainScriptJobs(session: ScriptSession): ScriptJobDrain { return ScriptSession.drainJobs(session); }
export function evaluateScript(session: ScriptSession, record: ExecutableScript): ScriptEvaluation {
    return ScriptSession.evaluate(session, record);
}
export function evaluateScriptObserved(session: ScriptSession, record: ExecutableScript): ObservedScriptEvaluation {
    return ScriptSession.evaluateObserved(session, record);
}

// OperationContext is readonly to helpers, but this canonical projection is
// engine-writable. Script callbacks capture their owner; hosts must not mutate it.
type ActiveOperationContext = {
    realm: Realm;
    call: (callee: Value, receiver: Value, args: Value[], loc: Location) => ValueCompletion;
    tick: (loc: Location) => ValueCompletion;
    enqueueJob?: (job: ScriptJob, loc: Location) => ValueCompletion;
    construct?: (callee: Value, args: Value[], newTarget: Value, loc: Location) => ValueCompletion;
};

class ExecutionEngine {
    #frame: ScriptFrameSnapshot | null = null;
    #jobs: (QueuedScriptJob | null)[] = [];
    #legacyGlobalFunctions: Set<number> = new Set();
    #abrupt: ThrowCompletion | null = null;
    #lastAbrupt: ScriptSourceSnapshot | null = null;
    // Synthetic inspection Gets have an original source anchor, but execute in
    // the entry/builtin Realm. Actual Script code temporarily suspends it.
    #inspectionSource: { record: ExecutableScript; unitId: string; loc: Location } | null = null;
    #script: boolean;
    steps = 0;
    calls = 0;
    depth = 0;
    private readonly activeContext: ActiveOperationContext;
    readonly context: OperationContext;
    constructor(realm: Realm, public maxSteps: number, public maxCalls: number, key: ExecutionKey | null) {
        if (realm.profile !== "legacy" && key !== executionKey) throw new Error("legacy Realm required");
        this.#script = key === executionKey;
        this.activeContext = {
            realm,
            call: (callee, receiver, args, loc) => this.call(callee, receiver, args, loc),
            tick: (loc) => this.tick(loc),
            enqueueJob: (job, loc) => this.#enqueueJob(job, loc),
            construct: (callee, args, newTarget, loc) => this.#construct(callee, args, loc, newTarget),
        };
        this.context = this.activeContext;
    }
    #enqueueJob(job: ScriptJob, loc: Location): ValueCompletion {
        if (!this.#script) throw new Error("Script jobs require a Script session");
        const frame = this.#active();
        const realm = job.realm === null ? frame.realm : job.realm;
        if (realm.profile !== "script") throw new Error("invalid Script job Realm");
        const budget = this.tick(loc);
        if (budget.type === "throw") return budget;
        this.#jobs.push({ realm, run: job.run, source: { realm: frame.realm, record: frame.record,
            unitId: ExecutableScript.state(frame.record, executionKey).plan.unit.id, loc: { line: loc.line, column: loc.column } } });
        return normal();
    }
    drainJobs(key: ExecutionKey): ScriptJobDrain {
        if (key !== executionKey || !this.#script) throw new Error("invalid Script checkpoint");
        if (this.#frame !== null) throw new Error("Script checkpoint requires an idle session");
        const savedRealm = this.activeContext.realm, savedAbrupt = this.#abrupt, savedSource = this.#lastAbrupt;
        const savedInspection = this.#inspectionSource;
        const failures: ScriptJobFailure[] = [];
        let completed = 0, fatal = false;
        try {
            for (let index = 0; index < this.#jobs.length; index++) {
                const job = this.#jobs[index];
                if (job === null) throw new Error("consumed Script job");
                this.#jobs[index] = null;
                const global: ScriptEnvironment = { kind: "global", record: job.realm.globalEnvironment };
                this.#frame = { realm: job.realm, record: job.source.record, scopeId: 0, lexical: global, variable: global,
                    strict: false, thisValue: job.realm.globalThisValue, function: null, privateEnvironment: null, phase: "body" };
                this.activeContext.realm = job.realm;
                this.#abrupt = null;
                this.#lastAbrupt = null;
                this.#inspectionSource = { record: job.source.record, unitId: job.source.unitId, loc: job.source.loc };
                const budget = this.tick(job.source.loc);
                const result = budget.type === "throw" ? budget : job.run(this.context);
                if (budget.type !== "throw") completed++;
                if (result.type === "throw") {
                    this.#capture(result);
                    const source = this.#sourceSnapshot();
                    if (source === null) throw new Error("missing Script job source");
                    failures.push({ completion: result, source });
                    fatal = result.origin.kind === "resource-limit" || result.origin.kind === "unsupported-operation";
                    if (fatal) break;
                } else if (result.type !== "normal") throw new Error("invalid Script job completion");
            }
            return { completed, failures, fatal };
        } finally {
            this.#jobs = [];
            this.#frame = null;
            this.activeContext.realm = savedRealm;
            this.#inspectionSource = savedInspection;
            const last = failures.length === 0 ? null : failures[failures.length - 1];
            this.#abrupt = last === null ? savedAbrupt : last.completion;
            this.#lastAbrupt = last === null ? savedSource : { realm: last.source.realm, record: last.source.record,
                unitId: last.source.unitId, loc: { line: last.source.loc.line, column: last.source.loc.column } };
        }
    }
    tick(loc: Location): ValueCompletion {
        if (this.#script) this.#active();
        if (++this.steps > this.maxSteps) return resourceFailure("steps", this.steps, this.maxSteps, "execution step limit exceeded", loc);
        return normal();
    }
    closure(params: string[], body: Stmt[], environment: Environment, source: FunctionSource | null): Value {
        if (this.context.realm.profile !== "legacy") throw new Error("legacy Realm required");
        const object = this.context.realm.createGuestFunction(params, body, environment, source);
        return { kind: "object", object };
    }
    block(body: Stmt[], env: Environment, receiver: Value): Completion {
        if (this.context.realm.profile !== "legacy") throw new Error("legacy Realm required");
        // Instantiate before execution: let bindings start in the TDZ; functions
        // capture this same environment and are callable before their declaration.
        for (const stmt of body) {
            if (stmt.kind === "let" || stmt.kind === "function") {
                if (env.bindings.has(stmt.name)) return failure("SyntaxError", "duplicate binding: " + stmt.name, stmt.loc);
            }
        }
        for (const stmt of body) {
            if (stmt.kind === "let" || stmt.kind === "function") {
                env.bindings.set(stmt.name, { initialized: stmt.kind === "function", mutable: true,
                    value: stmt.kind === "function" ? this.closure(stmt.params, stmt.body, env, stmt.source) : UNDEFINED });
            }
        }
        for (const stmt of body) {
            const result = this.statement(stmt, env, receiver);
            if (result.type !== "normal") return result;
        }
        return normal();
    }
    statement(stmt: Stmt, env: Environment, receiver: Value): Completion {
        const budget = this.tick(stmt.loc);
        if (budget.type !== "normal") return budget;
        if (++this.depth > 256) {
            const result = resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", stmt.loc);
            this.depth--;
            return result;
        }
        try {
            return this.statementInner(stmt, env, receiver);
        } finally {
            this.depth--;
        }
    }
    statementInner(stmt: Stmt, env: Environment, receiver: Value): Completion {
        switch (stmt.kind) {
            case "class-declaration": throw new Error("Script class AST requires Script execution");
            case "for": case "for-of": case "for-in": case "for-lexical": throw new Error("Script for AST requires Script execution");
            case "do-while": throw new Error("Script do-while AST requires Script execution");
            case "labelled": throw new Error("Script labelled AST requires Script execution");
            case "pattern-declaration": throw new Error("Script pattern AST requires Script execution");
            case "var": throw new Error("Script var AST requires Script execution");
            case "const": throw new Error("Script const AST requires Script execution");
            case "switch": throw new Error("Script switch AST requires Script execution");
            case "try-finally": throw new Error("Script try-finally AST requires Script execution");
            case "try-catch": throw new Error("Script try-catch AST requires Script execution");
            case "empty": case "function": return normal();
            case "expression": return this.evaluate(stmt.expression, env, receiver);
            case "let": {
                const result = stmt.init === null ? normal() : this.evaluate(stmt.init, env, receiver);
                if (result.type !== "normal") return result;
                const binding = env.bindings.get(stmt.name);
                if (binding === undefined) throw new Error("uninstantiated lexical declaration");
                binding.value = result.value;
                binding.initialized = true;
                return normal();
            }
            case "block": return this.block(stmt.body, new Environment(env), receiver);
            case "if": {
                const test = this.evaluate(stmt.test, env, receiver);
                if (test.type !== "normal") return test;
                if (truthy(test.value)) return this.statement(stmt.consequent, env, receiver);
                return stmt.alternate === null ? normal() : this.statement(stmt.alternate, env, receiver);
            }
            case "while": {
                while (true) {
                    const test = this.evaluate(stmt.test, env, receiver);
                    if (test.type !== "normal") return test;
                    if (!truthy(test.value)) return normal();
                    const result = this.statement(stmt.body, env, receiver);
                    if (result.type === "break") return normal();
                    if (result.type !== "normal" && result.type !== "continue") return result;
                }
            }
            case "yield": throw new Error("generator yield requires Script execution");
            case "return": case "throw": {
                const result = stmt.value === null ? normal() : this.evaluate(stmt.value, env, receiver);
                if (result.type !== "normal") return result;
                if (stmt.kind === "return") return { type: "return", value: result.value };
                return { type: "throw", origin: { kind: "guest" }, value: result.value, diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: stmt.loc } };
            }
            case "break": case "continue": return { type: stmt.kind, value: UNDEFINED };
        }
    }
    reference(expr: Expr, env: Environment, receiver: Value): ReferenceResult {
        if (expr.kind === "identifier") return { type: "reference", reference: { kind: "binding", environment: env.resolve(expr.name), name: expr.name } };
        if (expr.kind === "member") {
            const base = this.evaluate(expr.base, env, receiver);
            if (base.type !== "normal") return { type: "abrupt", completion: base };
            const key = this.evaluate(expr.key, env, receiver);
            if (key.type !== "normal") return { type: "abrupt", completion: key };
            return { type: "reference", reference: { kind: "property", base: base.value, key: key.value, loc: expr.loc } };
        }
        throw new Error("parser admitted a non-reference target");
    }
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        return this.#evaluate(expr, env, receiver, allowUnresolvable, null);
    }
    expression(expr: Expr, env: Environment, receiver: Value): Completion {
        return this.#expression(expr, env, receiver, null);
    }
    #eval(expr: Expr, env: Environment | null, receiver: Value, allowUnresolvable = false, name: string | null = null): Completion {
        return env === null ? this.#evaluate(expr, null, receiver, allowUnresolvable, name) : this.evaluate(expr, env, receiver, allowUnresolvable);
    }
    #evaluate(expr: Expr, env: Environment | null, receiver: Value, allowUnresolvable: boolean, name: string | null): Completion {
        const budget = this.tick(expr.loc);
        if (budget.type !== "normal") return budget;
        if (++this.depth > 256) {
            const result = resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", expr.loc);
            this.depth--;
            return result;
        }
        try {
            // Only the direct typeof identifier may bypass GetValue, and only
            // when resolution found no binding. TDZ and resource guards remain.
            if (allowUnresolvable && expr.kind === "identifier") {
                const ref = this.#reference(expr, env, receiver);
                if (ref.type === "abrupt") {
                    return ref.completion;
                }
                if ((ref.reference.kind === "binding" && ref.reference.environment === null) || (ref.reference.kind === "script" && ref.reference.binding.base === null)) {
                    return normal();
                }
                return getReferenceValue(this.context, ref.reference, expr.loc);
            }
            const result = env === null ? this.#expression(expr, null, receiver, name) : this.expression(expr, env, receiver);
            if (result.type === "throw") this.#capture(result);
            return result;
        } finally {
            this.depth--;
        }
    }
    #updateReference(reference: EvaluationReference, op: "++" | "--", prefix: boolean, loc: Location): ValueCompletion {
        const oldValue = getReferenceValue(this.context, reference, loc);
        if (oldValue.type === "throw") return oldValue;
        if (oldValue.type !== "normal") throw new Error("invalid update read completion");
        const numeric = toNumeric(oldValue.value, this.context, loc);
        if (numeric.type === "throw") return numeric;
        let newValue: Value;
        if (numeric.value.kind === "bigint") {
            const result = bigintOperation(op === "++" ? "+" : "-", numeric.value.value, 1n, this.context, loc);
            if (result.type === "throw") return result;
            newValue = { kind: "bigint", value: result.value };
        } else newValue = { kind: "number", value: op === "++" ? numeric.value.value + 1 : numeric.value.value - 1 };
        const written = putReferenceValue(this.context, reference, newValue, loc);
        if (written.type === "throw") return written;
        return normal(prefix ? newValue : numeric.value);
    }
    #objectPropertyName(property: ObjectProperty, key: PropertyKey | null): string | null {
        if (property.kind === "spread" || property.kind === "prototype") return null;
        if (key === null) throw new Error("object property without key");
        const name = typeof key === "string" ? key : key.description === undefined ? "" : "[" + key.description + "]";
        return property.kind === "data" ? name : property.kind + " " + name;
    }
    #defineObjectLiteralProperty(object: GuestObject, property: ObjectProperty, key: PropertyKey | null, value: Value, loc: Location): ThrowCompletion | null {
        if (property.kind === "spread") {
            const copied = copyDataProperties(object, value, null, this.context, property.loc);
            return copied.type === "throw" ? copied : null;
        }
        if (property.kind === "prototype") {
            if (value.kind === "object" || value.kind === "null") {
                const changed = object.internalSetPrototypeOf(value.kind === "null" ? null : value.object, this.context, loc);
                if (changed.type === "throw") return changed;
                if (!changed.value) throw new Error("fresh object prototype invariant");
            }
            return null;
        }
        if (key === null) throw new Error("object property without key");
        if (this.#script && property.value.kind === "function" && property.value.source?.method === true)
            ExecutableScript.makeMethod(value, object, executionKey);
        const descriptor = property.kind === "get" ? { get: value, enumerable: true, configurable: true }
            : property.kind === "set" ? { set: value, enumerable: true, configurable: true }
            : { value, writable: true, enumerable: true, configurable: true };
        const defined = object.defineOwnProperty(key, descriptor, this.context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) throw new Error("fresh object property definition failed");
        return null;
    }
    #templateString(value: Value, loc: Location): { type: "normal"; value: string } | ThrowCompletion {
        const primitive = toPrimitive(value, "string", this.context, loc);
        return primitive.type === "throw" ? primitive : toString(primitive.value, loc, this.context.realm);
    }
    #spreadArguments(input: Value, values: Value[], loc: Location): ThrowCompletion | null {
        const acquired = getIterator(input, this.context, loc);
        if (acquired.type === "throw") return acquired;
        while (true) {
            const next = iteratorStepValue(acquired.value, this.context, loc);
            if (next.type === "throw") return next;
            if (next.done) return null;
            values.push(next.value);
        }
    }
    #arguments(argumentsList: Argument[], env: Environment | null, receiver: Value): { type: "normal"; values: Value[] } | ThrowCompletion {
        const values: Value[] = [];
        for (const arg of argumentsList) {
            if (arg.kind === "spread") {
                if (env !== null) throw new Error("Script argument spread AST requires Script execution");
                const input = this.#value(arg.expression);
                if (input.type === "throw") return input;
                const spread = this.#spreadArguments(input.value, values, arg.loc);
                if (spread !== null) return spread;
            } else {
                const value = this.#eval(arg, env, receiver);
                if (value.type === "throw") return value;
                if (value.type !== "normal") throw new Error("invalid argument completion");
                values.push(value.value);
            }
        }
        return { type: "normal", values };
    }
    #expression(expr: Expr, env: Environment | null, receiver: Value, name: string | null): Completion {
        switch (expr.kind) {
            case "await": case "yield": throw new Error("suspension expression requires a continuation");
            case "class": {
                if (env !== null) throw new Error("class requires Script execution");
                return this.#classExpression(expr, name);
            }
            case "template-object": return this.context.realm.getTemplateObject(expr, this.context);
            case "regexp": {
                if (env !== null) throw new Error("RegExp literal requires Script execution");
                return regExpCreate({ kind: "string", value: expr.pattern }, { kind: "string", value: expr.flags }, this.context, expr.loc);
            }
            case "bigint": {
                for (let i = 0; i < expr.value.length; i++) {
                    const work = this.context.tick(expr.loc);
                    if (work.type === "throw") return work;
                }
                return normal({ kind: "bigint", value: BigInt(expr.value) });
            }
            case "literal": {
                const value = expr.value;
                if (value === null) return normal({ kind: "null" });
                if (typeof value === "number") return normal({ kind: "number", value });
                if (typeof value === "boolean") return normal({ kind: "boolean", value });
                return normal({ kind: "string", value });
            }
            case "this": {
                if (!this.#script) return normal(receiver);
                const environment = this.#thisEnvironment(this.#active().lexical);
                return environment instanceof FunctionActivation ? environment.getThisBinding(this.context.realm, expr.loc)
                    : normal(environment === null ? this.#active().realm.globalThisValue : environment.thisValue);
            }
            case "new-target": {
                if (env !== null) throw new Error("Script new.target AST requires Script execution");
                const environment = this.#thisEnvironment(this.#active().lexical);
                if (environment === null) throw new Error("missing new.target function environment");
                return normal(environment.newTarget);
            }
            case "template": {
                let text = expr.strings[0];
                for (let i = 0; i < expr.expressions.length; i++) {
                    const value = this.#eval(expr.expressions[i], env, receiver);
                    if (value.type !== "normal") return value;
                    const converted = this.#templateString(value.value, expr.expressions[i].loc);
                    if (converted.type === "throw") return converted;
                    text = stringConcat(stringConcat(text, converted.value), expr.strings[i + 1]);
                }
                return normal({ kind: "string", value: text });
            }
            case "chain": {
                if (env !== null) throw new Error("Script optional chain requires Script execution");
                const result = this.#chain(expr, receiver);
                return this.#expressionValue(result, expr.loc);
            }
            case "identifier": case "member": case "super-member": {
                const ref = this.#reference(expr, env, receiver);
                return ref.type === "abrupt" ? ref.completion : getReferenceValue(this.context, ref.reference, expr.loc);
            }
            case "destructure": {
                if (env !== null) throw new Error("Script pattern requires Script execution");
                const input = this.#value(expr.value);
                if (input.type === "throw") return input;
                const assigned = this.#initializePattern(expr.pattern, null, input.value, null, null);
                return assigned.type === "throw" ? assigned : input;
            }
            case "assign": {
                const ref = this.#reference(expr.target, env, receiver);
                if (ref.type === "abrupt") return ref.completion;
                const inferred = env === null && expr.target.kind === "identifier" &&
                    ExecutableScript.assignmentMayName(this.#active().record, expr, executionKey) ? expr.target.name : null;
                const value = this.#eval(expr.value, env, receiver, false, inferred);
                if (value.type !== "normal") return value;
                return putReferenceValue(this.context, ref.reference, value.value, expr.loc);
            }
            case "update": {
                if (env !== null) throw new Error("Script update AST requires Script execution");
                const ref = this.#reference(expr.target, null, receiver);
                if (ref.type === "abrupt") return ref.completion;
                return this.#updateReference(ref.reference, expr.op, expr.prefix, expr.loc);
            }
            case "compound": {
                const ref = this.#reference(expr.target, env, receiver);
                if (ref.type === "abrupt") return ref.completion;
                const oldValue = getReferenceValue(this.context, ref.reference, expr.loc);
                if (oldValue.type !== "normal") return oldValue;
                const logical = expr.op === "&&" || expr.op === "||" || expr.op === "??";
                if (skipsRightOperand(expr.op, oldValue.value)) return oldValue;
                const inferred = logical && env === null && expr.target.kind === "identifier" &&
                    ExecutableScript.assignmentMayName(this.#active().record, expr, executionKey) ? expr.target.name : null;
                const right = this.#eval(expr.value, env, receiver, false, inferred);
                if (right.type !== "normal") return right;
                const result = logical ? right : this.binary(expr.op, oldValue.value, right.value, expr.loc);
                if (result.type !== "normal") return result;
                return putReferenceValue(this.context, ref.reference, result.value, expr.loc);
            }
            case "function": {
                if (env !== null) return normal(this.closure(expr.params, expr.body, env, expr.source));
                const frame = this.#active();
                return frame.record.materializeFunction(ExecutableScript.scopeOfNode(frame.record, expr, executionKey), frame.lexical, name, this.context);
            }
            case "array": {
                const object = this.context.realm.createArray();
                let index = 0;
                for (let i = 0; i < expr.elements.length; i++) {
                    // Holes cost a slot tick too; nested elements share this budget.
                    const budget = this.tick(expr.loc);
                    if (budget.type !== "normal") return budget;
                    const element = expr.elements[i];
                    if (element === null) { index++; continue; }
                    if (element.kind === "spread" && env !== null) throw new Error("Script array spread AST requires Script execution");
                    const value = this.#eval(element.kind === "spread" ? element.expression : element, env, receiver);
                    if (value.type !== "normal") return value;
                    const appended = appendArrayElement(object, index, value.value, element.kind === "spread", this.context,
                        element.kind === "spread" ? element.loc : expr.loc);
                    if (appended.type === "throw") return appended;
                    index = appended.index;
                }
                return finishArrayLiteral(object, index, this.context, expr.loc);
            }

            case "object": {
                const object = this.context.realm.createObject();
                for (const property of expr.properties) {
                    let key: PropertyKey | null = null;
                    if (property.kind !== "spread") {
                        if (typeof property.key === "string") key = property.key;
                        else {
                            const evaluated = this.#eval(property.key, env, receiver);
                            if (evaluated.type !== "normal") return evaluated;
                            const converted = toPropertyKey(evaluated.value, this.context, property.key.loc);
                            if (converted.type === "throw") return converted;
                            key = converted.value;
                        }
                    }
                    const value = this.#eval(property.value, env, receiver, false, this.#objectPropertyName(property, key));
                    if (value.type !== "normal") return value;
                    const defined = this.#defineObjectLiteralProperty(object, property, key, value.value, expr.loc);
                    if (defined !== null) return defined;
                }
                return normal({ kind: "object", object });
            }
            case "super-call": {
                if (!this.#script) throw new Error("Script super call unavailable");
                const environment = this.#superCallEnvironment();
                const parent = environment.callee!.getPrototypeOf();
                const args = this.#arguments(expr.args, env, receiver);
                if (args.type === "throw") return args;
                return this.#finishSuperCall(environment, parent, args.values, expr.loc);
            }
            case "new": {
                if (!this.#script) throw new Error("Script construction unavailable");
                const callee = this.#eval(expr.callee, env, receiver);
                if (callee.type !== "normal") return callee;
                const args = this.#arguments(expr.args, env, receiver);
                if (args.type === "throw") return args;
                return this.#construct(callee.value, args.values, expr.loc);
            }
            case "call": {
                const result = this.#expressionReference(expr.callee, env, receiver);
                const callee = this.#expressionValue(result, expr.loc);
                if (callee.type !== "normal") return callee;
                const args = this.#arguments(expr.args, env, receiver);
                if (args.type === "throw") return args;
                if (this.#script && !expr.tagged && expr.callee.kind === "identifier" && expr.callee.name === "eval" &&
                    callee.value.kind === "object" && callee.value.object === this.#active().realm.evalIntrinsic)
                    return this.#callScript(callee.value, UNDEFINED, args.values, expr.loc, true);
                return this.call(callee.value, referenceCallReceiver(result), args.values, expr.loc);
            }
            case "unary": {
                if (expr.op === "delete") {
                    if (expr.operand.kind === "identifier" && (env !== null || this.#active().strict)) throw new Error("delete requires a property reference");
                    if (expr.operand.kind === "chain") {
                        if (env !== null) throw new Error("Script optional chain requires Script execution");
                        const result = this.#chain(expr.operand, receiver);
                        if (result.type === "abrupt") return result.completion;
                        return result.type === "reference" ? deleteReferenceValue(this.context, result.reference, expr.loc) : normal({ kind: "boolean", value: true });
                    }
                    if (expr.operand.kind === "member" || expr.operand.kind === "super-member" || expr.operand.kind === "identifier") {
                        // Capture once, without reading the final property.
                        const ref = this.#reference(expr.operand, env, receiver);
                        return ref.type === "abrupt" ? ref.completion : deleteReferenceValue(this.context, ref.reference, expr.loc);
                    }
                    const value = this.#eval(expr.operand, env, receiver);
                    return value.type === "normal" ? normal({ kind: "boolean", value: true }) : value;
                }
                const result = this.#eval(expr.operand, env, receiver, expr.op === "typeof");
                if (result.type !== "normal") return result;
                return applyUnaryValueOperator(expr.op, result.value, this.context, expr.loc);
            }
            case "conditional": {
                const test = this.#eval(expr.test, env, receiver);
                if (test.type !== "normal") return test;
                // Return the chosen arm's value or abrupt completion unchanged.
                if (truthy(test.value)) return this.#eval(expr.consequent, env, receiver);
                return this.#eval(expr.alternate, env, receiver);
            }
            case "binary": {
                if (expr.op === "instanceof" && !this.#script) throw new Error("Script instanceof unavailable");
                const left = this.#eval(expr.left, env, receiver);
                if (left.type !== "normal") return left;
                if (skipsRightOperand(expr.op, left.value)) return left;
                const right = this.#eval(expr.right, env, receiver);
                if (right.type !== "normal") return right;
                if (expr.op === "??" || expr.op === "&&" || expr.op === "||" || expr.op === ",") return right;
                if (expr.op === "instanceof") return instanceofOperator(left.value, right.value, this.context, expr.loc);
                return this.binary(expr.op, left.value, right.value, expr.loc);
            }
        }
    }
    call(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion {
        if (this.#script) this.#active();
        if (callee.kind !== "object" || callee.object.callable === null) return languageFailure(this.context.realm, "TypeError", "value is not callable", loc);
        const fn = callee.object.callable;
        if (fn.realm.profile !== this.context.realm.profile) throw new Error("cross-profile callable invocation");
        if (this.#script) return this.#callScript(callee, receiver, args, loc);
        if (this.context.realm.profile !== "legacy") throw new Error("Script execution unavailable");
        if (fn.kind === "script-guest" || fn.kind === "bound" || fn.kind === "eval" || fn.kind === "generator-resume" || fn.kind === "async-resume" || fn.kind === "async-generator") throw new Error("Script execution unavailable");
        if (this.calls >= this.maxCalls) return resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
        const callerRealm = this.activeContext.realm;
        this.calls++;
        try {
            this.activeContext.realm = fn.realm;
            let result: Completion;
            if (fn.kind === "builtin") result = fn.invoke(receiver, args, this.context, loc);
            else if (fn.kind === "guest") {
                const env = new Environment(fn.environment);
                for (let i = 0; i < fn.params.length; i++) {
                    env.bindings.set(fn.params[i], {
                        initialized: true,
                        mutable: true,
                        value: i < args.length ? args[i] : UNDEFINED,
                    });
                }
                result = this.block(fn.body, env, receiver);
                if (result.type === "return") return normal(result.value);
                if (result.type === "normal") return normal();
            } else { const unreachable: never = fn; throw new Error("invalid callable"); }
            if (result.type === "throw") return result;
            if (result.type === "normal") return normal(result.value);
            throw new Error("invalid completion escaped call boundary: " + result.type);
        } finally {
            // Restore the caller even when a host fault escapes.
            this.activeContext.realm = callerRealm;
            this.calls--;
        }
    }
    binary(op: string, left: Value, right: Value, loc: Location): ValueCompletion {
        return applyBinaryOperator(op, left, right, this.context, loc);
    }
    #active(): ScriptFrameSnapshot {
        if (!this.#script || this.#frame === null) throw new Error("inactive Script session");
        return this.#frame;
    }
    #capture(completion: ThrowCompletion): void {
        if (!this.#script || this.#frame === null || completion === this.#abrupt) return;
        this.#abrupt = completion;
        const frame = this.#frame;
        const anchor = this.#inspectionSource;
        const loc = anchor === null ? completion.diagnostic.loc : anchor.loc;
        const record = anchor === null ? frame.record : anchor.record;
        this.#lastAbrupt = { realm: frame.realm, record,
            unitId: anchor === null ? ExecutableScript.state(record, executionKey).plan.unit.id : anchor.unitId,
            loc: { line: loc.line, column: loc.column } };
    }
    inspectScript(key: ExecutionKey): ScriptSessionSnapshot {
        if (key !== executionKey || !this.#script) throw new Error("invalid Script inspection");
        const f = this.#frame;
        const a = this.#lastAbrupt;
        const thisEnvironment = f === null ? null : this.#thisEnvironment(f.lexical);
        const thisValue = thisEnvironment instanceof FunctionActivation && thisEnvironment.callable.isDerivedClassConstructor
            ? thisEnvironment.inspectThis() : f === null ? UNDEFINED : f.thisValue;
        return { steps: this.steps, calls: this.calls, depth: this.depth,
            active: f === null ? null : { realm: f.realm, record: f.record, scopeId: f.scopeId,
                lexical: f.lexical, variable: f.variable, strict: f.strict, thisValue,
                function: f.function, privateEnvironment: null, phase: f.phase },
            lastAbrupt: a === null ? null : { realm: a.realm, record: a.record, unitId: a.unitId,
                loc: { line: a.loc.line, column: a.loc.column } } };
    }
    #sourceSnapshot(): ScriptSourceSnapshot | null {
        const source = this.#lastAbrupt;
        return source === null ? null : { realm: source.realm, record: source.record, unitId: source.unitId,
            loc: { line: source.loc.line, column: source.loc.column } };
    }
    #inspectionAbrupt(completion: ThrowCompletion): ScriptThrowInspection {
        this.#capture(completion);
        const source = this.#sourceSnapshot();
        if (source === null) throw new Error("missing inspection source");
        const origin = completion.origin.kind;
        return { kind: origin === "resource-limit" ? "resource-limit" : origin === "unsupported-operation" ? "unsupported-operation" : "abrupt",
            completion, source };
    }
    #inspectConstructor(completion: ThrowCompletion): ScriptThrowInspection {
        const value = completion.value;
        if (value.kind !== "object") return { kind: "absent" };
        const loc = completion.diagnostic.loc;
        const constructor = value.object.internalGet("constructor", value, this.context, loc);
        if (constructor.type === "throw") return this.#inspectionAbrupt(constructor);
        const callee = constructor.value;
        if (callee.kind === "null" || callee.kind === "undefined") return { kind: "absent" };
        if (callee.kind !== "object" || callee.object.callable === null) return { kind: "non-callable" };
        const realm = callee.object.callable.realm;
        if (realm.profile !== "script") return { kind: "foreign-profile" };
        const name = callee.object.internalGet("name", callee, this.context, loc);
        if (name.type === "throw") return this.#inspectionAbrupt(name);
        return name.value.kind === "string" ? { kind: "available", name: name.value.value, realm }
            : { kind: "non-string-name", realm };
    }
    #observeEvaluation(evaluation: ScriptEvaluation, observed: boolean): ObservedScriptEvaluation {
        const completion = evaluation.completion;
        if (completion.type === "throw" && (completion.origin.kind === "resource-limit" || completion.origin.kind === "unsupported-operation")) this.#jobs = [];
        const source = completion.type === "throw" ? this.#sourceSnapshot() : null;
        if (!observed || completion.type !== "throw" ||
            (completion.origin.kind !== "guest" && completion.origin.kind !== "engine-diagnostic"))
            return { evaluation, source, inspection: null };
        // Inspection is a separate propagation. Even a getter throwing the exact
        // original completion must capture its own source, then restore history.
        if (source === null) throw new Error("missing original throw source");
        const savedAbrupt = this.#abrupt, savedSource = this.#lastAbrupt;
        const savedInspectionSource = this.#inspectionSource;
        this.#abrupt = null;
        this.#lastAbrupt = null;
        this.#inspectionSource = { record: source.record, unitId: source.unitId,
            loc: { line: source.loc.line, column: source.loc.column } };
        try {
            return { evaluation, source, inspection: this.#inspectConstructor(completion) };
        } finally {
            this.#abrupt = savedAbrupt;
            this.#lastAbrupt = savedSource;
            this.#inspectionSource = savedInspectionSource;
        }
    }
    runScript(record: ExecutableScript, key: ExecutionKey, observed: boolean): ObservedScriptEvaluation {
        if (key !== executionKey || !this.#script) throw new Error("invalid Script entry");
        if (this.#frame !== null) throw new Error("Script session already active");
        const state = ExecutableScript.state(record, key);
        const realm = state.realm;
        const savedRealm = this.activeContext.realm;
        const savedCalls = this.calls, savedDepth = this.depth;
        const global: ScriptEnvironment = { kind: "global", record: realm.globalEnvironment };
        this.#abrupt = null;
        this.#lastAbrupt = null;
        this.#frame = { realm, record, scopeId: 0, lexical: global, variable: global,
            strict: state.plan.strictness.strict, thisValue: realm.globalThisValue, function: null, privateEnvironment: null, phase: "instantiation" };
        this.activeContext.realm = realm;
        try {
            this.#legacyGlobalFunctions.clear();
            const setup = record.instantiateGlobals(realm.globalEnvironment, this.context, this.#legacyGlobalFunctions);
            if (setup.type === "throw") { this.#capture(setup); return this.#observeEvaluation({ phase: "instantiation", completion: setup }, observed); }
            const f = this.#active();
            this.#frame = { ...f, phase: "body" };
            const result = this.#list(ExecutableScript.readRoot(record, key));
            if (result.type === "throw") { this.#capture(result); return this.#observeEvaluation({ phase: "body", completion: result }, observed); }
            if (result.type !== "normal") throw new Error("invalid Script root completion");
            return this.#observeEvaluation({ phase: "body", completion: normal(result.payload.kind === "empty" ? UNDEFINED : result.payload.value) }, observed);
        } catch (error) {
            this.#jobs = [];
            throw error;
        } finally {
            this.#frame = null;
            this.#legacyGlobalFunctions.clear();
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
            this.depth = savedDepth;
        }
    }
    #expressionReference(expr: Expr, env: Environment | null, receiver: Value): ExpressionResult {
        if (expr.kind === "identifier" || expr.kind === "member" || expr.kind === "super-member") return this.#reference(expr, env, receiver);
        if (expr.kind === "chain") {
            if (env !== null) throw new Error("Script optional chain requires Script execution");
            return this.#chain(expr, receiver);
        }
        const result = this.#eval(expr, env, receiver);
        return result.type === "normal" ? { type: "value", value: result.value } : { type: "abrupt", completion: result };
    }
    #expressionValue(result: ExpressionResult, loc: Location): Completion {
        if (result.type === "abrupt") return result.completion;
        return result.type === "value" ? normal(result.value) : getReferenceValue(this.context, result.reference, loc);
    }
    #chain(expr: ChainExpr, receiver: Value): ExpressionResult {
        let result = this.#expressionReference(expr.base, null, receiver);
        if (result.type === "abrupt") return result;
        for (const link of expr.links) {
            const budget = this.tick(link.loc);
            if (budget.type !== "normal") return { type: "abrupt", completion: budget };
            const base = this.#expressionValue(result, link.loc);
            if (base.type !== "normal") return { type: "abrupt", completion: base };
            if (link.optional && (base.value.kind === "null" || base.value.kind === "undefined"))
                return { type: "value", value: UNDEFINED };
            if (link.kind === "member") {
                const key = this.#eval(link.key, null, receiver);
                if (key.type !== "normal") return { type: "abrupt", completion: key };
                const reference: Reference = { kind: "property", base: base.value, key: key.value, loc: link.loc };
                result = { type: "reference", reference: { kind: "script-property", reference, strict: this.#active().strict } };
            } else {
                const args = this.#arguments(link.args, null, receiver);
                if (args.type === "throw") return { type: "abrupt", completion: args };
                const called = this.call(base.value, referenceCallReceiver(result), args.values, link.loc);
                if (called.type !== "normal") return { type: "abrupt", completion: called };
                result = { type: "value", value: called.value };
            }
        }
        return result;
    }
    #superCallEnvironment(): FunctionActivation {
        const environment = this.#thisEnvironment(this.#active().lexical);
        if (!(environment instanceof FunctionActivation) || !environment.callable.isDerivedClassConstructor || environment.callee === null)
            throw new Error("invalid super call environment");
        return environment;
    }
    #finishSuperCall(environment: ScriptEnvironment, parent: GuestObject | null, args: Value[], loc: Location): ValueCompletion {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid retained super call environment");
        if (parent === null || parent.constructorSlot === null)
            return languageFailure(this.context.realm, "TypeError", "superclass is not a constructor", loc);
        const result = this.#construct({ kind: "object", object: parent }, args, loc, environment.newTarget);
        if (result.type === "throw") return result;
        return environment.bindThis(result.value, this.context.realm, loc);
    }
    #superContext(loc: Location): { type: "normal"; homeObject: GuestObject; receiver: Value } | ThrowCompletion {
        const environment = this.#thisEnvironment(this.#active().lexical);
        if (!(environment instanceof FunctionActivation) || environment.callable.homeObject === null) throw new Error("invalid super property environment");
        const receiver = environment.getThisBinding(this.context.realm, loc);
        if (receiver.type === "throw") return receiver;
        return { type: "normal", homeObject: environment.callable.homeObject, receiver: receiver.value };
    }
    #superReference(homeObject: GuestObject, receiver: Value, key: Value, loc: Location): EvaluationReference {
        const parent = homeObject.getPrototypeOf();
        const base: Value = parent === null ? { kind: "null" } : { kind: "object", object: parent };
        const reference: Reference = { kind: "property", base, key, loc };
        return { kind: "script-super", reference, receiver, strict: this.#active().strict };
    }
    #reference(expr: Expr, env: Environment | null, receiver: Value): EvaluationReferenceResult {
        if (env !== null) return this.reference(expr, env, receiver);
        if (expr.kind === "identifier") {
            const result = resolveScriptBinding(this.#active().lexical, expr.name, expr.loc, this.#active().strict);
            if (result.type === "throw") return { type: "abrupt", completion: result };
            return { type: "reference", reference: { kind: "script", binding: result.reference } };
        }
        if (expr.kind === "super-member") {
            const superContext = this.#superContext(expr.loc);
            if (superContext.type === "throw") return { type: "abrupt", completion: superContext };
            const key = this.#eval(expr.key, null, receiver);
            if (key.type !== "normal") return { type: "abrupt", completion: key };
            return { type: "reference", reference: this.#superReference(superContext.homeObject, superContext.receiver, key.value, expr.loc) };
        }
        if (expr.kind === "member") {
            const strict = this.#active().strict;
            const base = this.#eval(expr.base, null, receiver);
            if (base.type !== "normal") return { type: "abrupt", completion: base };
            const key = this.#eval(expr.key, null, receiver);
            if (key.type !== "normal") return { type: "abrupt", completion: key };
            const reference: Reference = { kind: "property", base: base.value, key: key.value, loc: expr.loc };
            return { type: "reference", reference: { kind: "script-property", reference, strict } };
        }
        throw new Error("parser admitted a non-reference target");
    }
    #arrayPattern(pattern: ArrayPattern, input: Value, environment: ScriptEnvironment | null = null): ValueCompletion {
        if (++this.depth > 256) {
            this.depth--;
            return resourceFailure("evaluation-depth", 257, 256, "evaluation nesting limit exceeded", pattern.loc);
        }
        try {
            const acquired = getIterator(input, this.context, pattern.loc);
            if (acquired.type === "throw") return acquired;
            const iterator = acquired.value;
            let result: ValueCompletion = normal();
            for (const element of pattern.elements) {
                result = this.context.tick(pattern.loc);
                if (result.type === "throw") break;
                if (element === null) {
                    if (!iterator.done) {
                        const skipped = iteratorStep(iterator, this.context, pattern.loc);
                        if (skipped.type === "throw") { result = skipped; break; }
                    }
                } else {
                    result = this.#patternElement(element.pattern, element.initializer, iterator, false, environment);
                    if (result.type === "throw") break;
                }
            }
            if (result.type === "normal" && pattern.rest !== null)
                result = this.#patternElement(pattern.rest, null, iterator, true, environment);
            if (iterator.done) return result;
            return result.type === "throw" ? iteratorCloseOnThrow(iterator, result, this.context, pattern.loc)
                : iteratorCloseNormally(iterator, this.context, pattern.loc);
        } finally { this.depth--; }
    }
    #patternElement(pattern: DestructuringPattern, initializer: Expr | null, iterator: IteratorRecord, rest: boolean, environment: ScriptEnvironment | null): ValueCompletion {
        const target = this.#patternReference(pattern, environment);
        if (target !== null && target.type === "abrupt") {
            if (target.completion.type !== "throw") throw new Error("invalid pattern reference completion");
            return target.completion;
        }
        const reference = target === null ? null : target.reference;
        let value: Value = UNDEFINED;
        if (rest) {
            const array = this.context.realm.createArray();
            let index = 0;
            while (!iterator.done) {
                const next = iteratorStepValue(iterator, this.context, pattern.loc);
                if (next.type === "throw") return next;
                if (next.done) break;
                const defined = array.defineOwnProperty(String(index++), { value: next.value, writable: true, enumerable: true, configurable: true }, this.context, pattern.loc);
                if (defined.type === "throw") return defined;
                if (!defined.value) throw new Error("fresh rest array invariant");
            }
            value = { kind: "object", object: array };
        } else if (!iterator.done) {
            const next = iteratorStepValue(iterator, this.context, pattern.loc);
            if (next.type === "throw") return next;
            value = next.value;
        }
        return this.#initializePattern(pattern, initializer, value, environment, reference);
    }
    #patternReference(pattern: DestructuringPattern, environment: ScriptEnvironment | null): EvaluationReferenceResult | null {
        if (pattern.kind === "target") return this.#reference(pattern.target, null, this.#active().thisValue);
        if (pattern.kind === "binding" && environment === null) {
            const target = resolveScriptBinding(this.#active().lexical, pattern.site.name, pattern.loc, this.#active().strict);
            if (target.type === "throw") return { type: "abrupt", completion: target };
            return { type: "reference", reference: { kind: "script", binding: target.reference } };
        }
        return null;
    }
    #initializePattern(pattern: DestructuringPattern, initializer: Expr | null, value: Value, environment: ScriptEnvironment | null, reference: EvaluationReference | null): ValueCompletion {
        if (value.kind === "undefined" && initializer !== null) {
            const evaluated = this.#value(initializer, pattern.kind === "target" ? pattern.inferredName : pattern.kind === "binding" ? pattern.site.name : null);
            if (evaluated.type === "throw") return evaluated;
            value = evaluated.value;
        }
        if (pattern.kind === "array-pattern") return this.#arrayPattern(pattern, value, environment);
        if (pattern.kind === "object-pattern") return this.#objectPattern(pattern, value, environment);
        if (pattern.kind === "binding" && environment !== null) {
            return environment.kind === "global" ? environment.record.initializeBinding(pattern.site.name, value, this.context, pattern.loc)
                : environment.initializeBinding(pattern.site.name, value, this.context, pattern.loc);
        }
        if (reference === null) throw new Error("missing pattern reference");
        const assigned = putReferenceValue(this.context, reference, value, pattern.loc);
        if (assigned.type === "throw") return assigned;
        if (assigned.type !== "normal") throw new Error("invalid pattern assignment completion");
        return normal();
    }
    #createClassConstructor(expr: ClassExpr, scopeId: number, environment: ScriptDeclarativeEnvironment, inferredName: string | null,
        superclass: Value | null): { type: "normal"; constructor: GuestObject; prototype: GuestObject } | ThrowCompletion {
        const active = this.#active();
        let prototypeParent: GuestObject | null = active.realm.objectPrototype;
        let constructorParent = active.realm.functionPrototype;
        if (superclass !== null) {
            if (superclass.kind === "null") prototypeParent = null;
            else {
                const loc = expr.heritage === null ? expr.loc : expr.heritage.loc;
                if (superclass.kind !== "object" || superclass.object.constructorSlot === null)
                    return languageFailure(active.realm, "TypeError", "class heritage is not a constructor", loc);
                const parent = superclass.object.internalGet("prototype", superclass, this.context, loc);
                if (parent.type === "throw") return parent;
                if (parent.value.kind !== "object" && parent.value.kind !== "null")
                    return languageFailure(active.realm, "TypeError", "superclass prototype is not an object or null", loc);
                prototypeParent = parent.value.kind === "object" ? parent.value.object : null;
                constructorParent = superclass.object;
            }
        }
        const prototype = new GuestObject(prototypeParent);
        const constructor = ExecutableScript.materializeClassConstructor(active.record, scopeId, environment,
            expr.name === null ? (inferredName ?? "") : expr.name.name, prototype, constructorParent, this.context, executionKey);
        if (constructor.type === "throw") return constructor;
        if (constructor.value.kind !== "object") throw new Error("class constructor result invariant");
        return { type: "normal", constructor: constructor.value.object, prototype };
    }
    #defineClassMethod(element: ClassElement, key: PropertyKey, constructor: GuestObject, prototype: GuestObject): ThrowCompletion | null {
        const propertyName = typeof key === "string" ? key : key.description === undefined ? "" : "[" + key.description + "]";
        const name = element.kind === "method" ? propertyName : element.kind + " " + propertyName;
        const method = this.#value(element.value, name);
        if (method.type === "throw") return method;
        const object = element.isStatic ? constructor : prototype;
        ExecutableScript.makeMethod(method.value, object, executionKey);
        const descriptor = element.kind === "get" ? { get: method.value, enumerable: false, configurable: true }
            : element.kind === "set" ? { set: method.value, enumerable: false, configurable: true }
            : { value: method.value, writable: true, enumerable: false, configurable: true };
        const defined = object.defineOwnProperty(key, descriptor, this.context, element.value.loc);
        if (defined.type === "throw") return defined;
        return defined.value ? null : languageFailure(this.context.realm, "TypeError", "cannot define class method", element.value.loc);
    }
    #classExpression(expr: ClassExpr, inferredName: string | null): ValueCompletion {
        const saved = this.#active();
        const scopeId = ExecutableScript.scopeOfNode(saved.record, expr, executionKey);
        const environment = new ScriptDeclarativeEnvironment(saved.lexical);
        if (expr.name !== null) {
            const created = environment.createImmutableBinding(expr.name.name, expr.name.loc);
            if (created.type === "throw") return created;
        }
        this.#frame = { ...saved, scopeId, lexical: environment, strict: true };
        try {
            let superclass: Value | null = null;
            if (expr.heritage !== null) {
                const evaluated = this.#value(expr.heritage);
                if (evaluated.type === "throw") return evaluated;
                superclass = evaluated.value;
            }
            const created = this.#createClassConstructor(expr, scopeId, environment, inferredName, superclass);
            if (created.type === "throw") return created;
            for (const element of expr.elements) {
                if (element.value === expr.constructorMethod) continue;
                const keyValue = this.#value(element.key);
                if (keyValue.type === "throw") return keyValue;
                const key = toPropertyKey(keyValue.value, this.context, element.key.loc);
                if (key.type === "throw") return key;
                const defined = this.#defineClassMethod(element, key.value, created.constructor, created.prototype);
                if (defined !== null) return defined;
            }
            const value: Value = { kind: "object", object: created.constructor };
            if (expr.name !== null) {
                const initialized = environment.initializeBinding(expr.name.name, value, this.context, expr.name.loc);
                if (initialized.type === "throw") return initialized;
            }
            return normal(value);
        } finally { this.#frame = saved; }
    }
    #objectPattern(pattern: ObjectPattern, input: Value, environment: ScriptEnvironment | null): ValueCompletion {
        if (++this.depth > 256) {
            this.depth--;
            return resourceFailure("evaluation-depth", 257, 256, "evaluation nesting limit exceeded", pattern.loc);
        }
        try {
            const boxed = toObject(input, this.context, pattern.loc);
            if (boxed.type === "throw") return boxed;
            const excluded = new Set<PropertyKey>();
            for (const property of pattern.properties) {
                const tick = this.context.tick(property.key.loc);
                if (tick.type === "throw") return tick;
                const keyValue = this.#value(property.key);
                if (keyValue.type === "throw") return keyValue;
                const key = toPropertyKey(keyValue.value, this.context, property.key.loc);
                if (key.type === "throw") return key;
                excluded.add(key.value);
                const target = this.#patternReference(property.element.pattern, environment);
                if (target !== null && target.type === "abrupt") {
                    if (target.completion.type !== "throw") throw new Error("invalid property binding reference");
                    return target.completion;
                }
                const value = boxed.value.internalGet(key.value, input, this.context, property.key.loc);
                if (value.type === "throw") return value;
                const initialized = this.#initializePattern(property.element.pattern, property.element.initializer, value.value, environment, target === null ? null : target.reference);
                if (initialized.type === "throw") return initialized;
            }
            if (pattern.rest === null) return normal();
            const target = this.#patternReference(pattern.rest, environment);
            if (target !== null && target.type === "abrupt") {
                if (target.completion.type !== "throw") throw new Error("invalid rest binding reference");
                return target.completion;
            }
            const rest = this.context.realm.createObject();
            const copied = copyDataProperties(rest, { kind: "object", object: boxed.value }, excluded, this.context, pattern.rest.loc);
            if (copied.type === "throw") return copied;
            return this.#initializePattern(pattern.rest, null, { kind: "object", object: rest }, environment, target === null ? null : target.reference);
        } finally { this.depth--; }
    }
    #value(expr: Expr, name: string | null = null): ValueCompletion {
        const result = this.#eval(expr, null, this.#active().thisValue, false, name);
        if (result.type === "throw") return result;
        if (result.type === "normal") return normal(result.value);
        throw new Error("invalid Script expression completion");
    }
    #list(body: Stmt[]): ScriptStatementCompletion {
        let previous: ScriptStatementPayload = { kind: "empty" };
        for (const statement of body) {
            const result = updateScriptEmpty(this.#statement(statement), previous);
            if (result.type !== "normal") return result;
            previous = result.payload;
        }
        return { type: "normal", payload: previous };
    }
    #statement(stmt: Stmt, labels: readonly string[] | null = null, sequences: GeneratorFrame[] | null = null): ScriptStatementCompletion {
        // Explicit throw-arm locals retain identity and the accepted E2 static
        // union lowering (see script-completion.ts); they do not wrap failures.
        const budget = this.tick(stmt.loc);
        if (budget.type === "throw") { this.#capture(budget); const abrupt: ThrowCompletion = budget; return abrupt; }
        const savedDepth = this.depth;
        this.depth++;
        try {
            if (this.depth > 256) {
                const result = resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", stmt.loc);
                this.#capture(result);
                const abrupt: ThrowCompletion = result; return abrupt;
            }
            const result = this.#scriptStatement(stmt, labels, sequences);
            if (result.type === "throw") this.#capture(result);
            return result;
        } finally { this.depth = savedDepth; }
    }
    #initializeForEach(stmt: ForEachStmt, saved: ScriptFrameSnapshot, scopeId: number, lexical: boolean, target: Expr | null, value: Value): ValueCompletion {
        if (lexical) {
            const created = ExecutableScript.activateLoop(saved.record, stmt, saved.lexical, value, this.context, executionKey);
            if (created.type === "throw") return created;
            this.#frame = { ...saved, scopeId, lexical: created.environment };
            return stmt.head.kind === "pattern" ? this.#initializePattern(stmt.head.pattern, null, value, created.environment, null) : normal();
        }
        if (stmt.head.kind === "pattern" || stmt.head.kind === "assignment-pattern")
            return this.#initializePattern(stmt.head.pattern, null, value, null, null);
        if (target === null) throw new Error("missing loop assignment target");
        const reference = this.#reference(target, null, saved.thisValue);
        const assigned = reference.type === "abrupt" ? reference.completion : putReferenceValue(this.context, reference.reference, value, target.loc);
        if (assigned.type === "throw") { const abrupt: ThrowCompletion = assigned; return abrupt; }
        if (assigned.type !== "normal") throw new Error("invalid loop assignment completion");
        return normal(assigned.value);
    }
    #prepareForIteration(stmt: ForStmt | ForLexicalStmt, outer: ScriptEnvironment | null): ValueCompletion {
        if (stmt.kind === "for-lexical" && stmt.declarationKind === "let") {
            const frame = this.#active();
            if (!(frame.lexical instanceof ScriptDeclarativeEnvironment) || outer === null)
                throw new Error("invalid for iteration environment");
            const previous = frame.lexical.getBindingValue(stmt.binding.site.name, this.context, stmt.loc);
            if (previous.type === "throw") { const abrupt: ThrowCompletion = previous; return abrupt; }
            const created = ExecutableScript.activateLoop(frame.record, stmt, outer, previous.value, this.context, executionKey);
            if (created.type === "throw") { const abrupt: ThrowCompletion = created; return abrupt; }
            this.#frame = { ...frame, lexical: created.environment };
        }
        return normal();
    }
    #forBody(stmt: ForStmt | ForLexicalStmt, outer: ScriptEnvironment | null, labels: readonly string[] | null): ScriptStatementCompletion {
        let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
        let first = true;
        while (true) {
            const prepared = this.#prepareForIteration(stmt, outer);
            if (prepared.type === "throw") { const abrupt: ThrowCompletion = prepared; return abrupt; }
            if (!first && stmt.update !== null) {
                const updated = this.#value(stmt.update);
                if (updated.type === "throw") { const abrupt: ThrowCompletion = updated; return abrupt; }
            }
            const test = stmt.test === null ? normal({ kind: "boolean", value: true }) : this.#value(stmt.test);
            if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
            first = false;
            if (!truthy(test.value)) return { type: "normal", payload: value };
            const result = this.#statement(stmt.body);
            if (result.type === "break" && result.target === undefined) return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
            if (result.type !== "normal" && (result.type !== "continue" || !this.#continueTarget(result.target, labels))) return updateScriptEmpty(result, value);
            if (result.payload.kind !== "empty") value = result.payload;
        }
    }
    #enterSwitchClauses(boundary: GeneratorSwitch, sequences: GeneratorFrame[], selected: number): void {
        const selection = boundary.selection;
        if (selection === null) throw new Error("switch already selected");
        boundary.selection = null;
        const clauses = selection.statement.caseBlock.clauses;
        if (selected >= 0) for (let i = clauses.length - 1; i >= selected; i--)
            sequences.push({ kind: "sequence", frame: boundary.frame, body: clauses[i].body, nextStatement: 0, depth: boundary.depth });
    }
    #switchBody(stmt: SwitchStmt, discriminant: Value, sequences: GeneratorFrame[] | null): ScriptStatementCompletion {
        const saved = this.#active();
        const scopeId = ExecutableScript.scopeOfNode(saved.record, stmt, executionKey);
        const created = saved.record.createBlockEnvironment(scopeId, saved.lexical, this.context);
        if (created.type === "throw") return created;
        this.#frame = { ...saved, scopeId, lexical: created.environment };
        try {
            const setup = saved.record.instantiateBlock(scopeId, created.environment, this.context);
            if (setup.type === "throw") { this.#capture(setup); const abrupt: ThrowCompletion = setup; return abrupt; }
            if (sequences !== null) {
                const frame = this.#active(), depth = sequences[sequences.length - 1].depth + 1;
                sequences.push({ kind: "switch", frame, depth, selection: { statement: stmt, discriminant, nextClause: 0, fallback: -1 } });
                return { type: "normal", payload: { kind: "empty" } };
            }
            const clauses = stmt.caseBlock.clauses;
            let selected = -1, fallback = -1;
            for (let i = 0; i < clauses.length; i++) {
                const test = clauses[i].test;
                if (test === null) { fallback = i; continue; }
                const selector = this.#value(test);
                if (selector.type === "throw") { const abrupt: ThrowCompletion = selector; return abrupt; }
                if (equal(discriminant, selector.value)) { selected = i; break; }
            }
            if (selected < 0) selected = fallback;
            let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
            if (selected >= 0) for (let i = selected; i < clauses.length; i++) {
                const result = updateScriptEmpty(this.#list(clauses[i].body), value);
                if (result.type === "break" && result.target === undefined) return { type: "normal", payload: result.payload };
                if (result.type !== "normal") return result;
                if (result.payload.kind !== "empty") value = result.payload;
            }
            return { type: "normal", payload: value };
        } finally { this.#frame = saved; }
    }
    #copyLegacyFunction(stmt: Stmt): ValueCompletion {
        const frame = this.#active();
        const declaration = ExecutableScript.legacyDeclaration(frame.record, stmt, executionKey);
        if (declaration === null || (declaration.variableScope === 0 && !this.#legacyGlobalFunctions.has(declaration.id))) return normal();
        const lexical = frame.lexical, variable = frame.variable;
        if (lexical.kind === "global") throw new Error("legacy function missing block environment");
        const name = declaration.site.name;
        const value = lexical.getBindingValue(name, this.context, stmt.loc);
        if (value.type === "throw") return value;
        if (variable.kind !== "global" && name === "arguments") {
            const present = variable.hasBinding(name, stmt.loc);
            if (present.type === "throw") return present;
            if (!present.value) {
                const created = variable.createMutableBinding(name, stmt.loc, declaration.variableScope === 0);
                if (created.type === "throw") return created;
                return variable.initializeBinding(name, value.value, this.context, stmt.loc);
            }
        }
        return variable.kind === "global" ? variable.record.setMutableBinding(name, value.value, this.context, stmt.loc, false)
            : variable.setMutableBinding(name, value.value, this.context, stmt.loc, false);
    }
    #continueTarget(target: string | undefined, labels: readonly string[] | null): boolean {
        return target === undefined || (labels !== null && labels.includes(target));
    }
    #forEachBody(stmt: ForEachStmt, iterable: Value, saved: ScriptFrameSnapshot, scopeId: number, lexical: boolean,
        labels: readonly string[] | null, sequences: GeneratorFrame[] | null): ScriptStatementCompletion {
        let iterator: IteratorRecord | null = null;
        let enumerator: ForInEnumerator | null = null;
        if (stmt.kind === "for-in") {
            if (iterable.kind === "null" || iterable.kind === "undefined")
                return { type: "normal", payload: { kind: "value", value: UNDEFINED } };
            const boxed = toObject(iterable, this.context, stmt.loc);
            if (boxed.type === "throw") return boxed;
            enumerator = new ForInEnumerator(boxed.value);
        } else {
            const acquired = stmt.awaited ? getAsyncIterator(iterable, this.context, stmt.loc) : getIterator(iterable, this.context, stmt.loc);
            if (acquired.type === "throw") return acquired;
            iterator = acquired.value;
        }
        const target: Expr | null = stmt.head.kind === "lexical" || stmt.head.kind === "pattern" || stmt.head.kind === "assignment-pattern" ? null : stmt.head.kind === "var"
            ? { kind: "identifier", loc: stmt.head.loc, name: stmt.head.declarations[0].name } : stmt.head;
        if (sequences !== null) {
            const depth = sequences[sequences.length - 1].depth + 1;
            if (iterator !== null) sequences.push({ kind: "iterator", frame: saved, statement: stmt, iterator, target, lexical, scopeId, depth, labels });
            else if (enumerator !== null) sequences.push({ kind: "enumerator", frame: saved, statement: stmt, enumerator, target, lexical, scopeId, depth, labels });
            else throw new Error("missing generator loop iterator");
            return { type: "normal", payload: { kind: "empty" } };
        }
        if (stmt.awaited) throw new Error("async loop requires continuation");
        let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
        while (true) {
            if (enumerator === null && iterator === null) throw new Error("missing loop iterator");
            const next = iterator !== null ? iteratorStepValue(iterator, this.context, stmt.loc) : enumerator!.next(this.context, stmt.loc);
            if (next.type === "throw") return next;
            if (next.done) return { type: "normal", payload: value };
            let result: ScriptStatementCompletion;
            try {
                const initialized = this.#initializeForEach(stmt, saved, scopeId, lexical, target, next.value);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; result = abrupt; }
                else result = this.#statement(stmt.body);
            } finally { this.#frame = saved; }
            if (result.type === "throw") {
                const abrupt: ThrowCompletion = result;
                return iterator === null ? abrupt : iteratorCloseOnThrow(iterator, abrupt, this.context, stmt.loc);
            }
            if (result.type === "break" || result.type === "return" ||
                (result.type === "continue" && !this.#continueTarget(result.target, labels))) {
                if (iterator !== null) {
                    const closed = iteratorCloseNormally(iterator, this.context, stmt.loc);
                    if (closed.type === "throw") { const abrupt: ThrowCompletion = closed; return abrupt; }
                }
                if (result.type === "break" && result.target === undefined)
                    return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
                return updateScriptEmpty(result, value);
            }
            if (result.type === "yield" || result.type === "delegate" || result.type === "generator-expression") throw new Error("yield escaped a supported generator sequence");
            if (result.payload.kind !== "empty") value = result.payload;
        }
    }
    #scriptStatement(stmt: Stmt, labels: readonly string[] | null, sequences: GeneratorFrame[] | null): ScriptStatementCompletion {
        switch (stmt.kind) {
            case "class-declaration": {
                if (stmt.value.name === null) throw new Error("class declaration name missing");
                if (sequences !== null && isSuspendingGeneratorExpression(stmt.value))
                    return this.#suspendingExpression(stmt.value, { kind: "initialization", environment: this.#active().lexical, name: stmt.value.name.name, loc: stmt.loc });
                const result = this.#value(stmt.value);
                if (result.type === "throw") { const abrupt: ThrowCompletion = result; return abrupt; }
                const env = this.#active().lexical, name = stmt.value.name.name;
                const initialized = env.kind === "global" ? env.record.initializeBinding(name, result.value, this.context, stmt.loc)
                    : env.initializeBinding(name, result.value, this.context, stmt.loc);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "labelled": {
                const current = labels === null ? [stmt.name] : [...labels, stmt.name];
                if (sequences !== null) {
                    const depth = sequences[sequences.length - 1].depth + 1;
                    sequences.push({ kind: "label", frame: this.#active(), name: stmt.name, depth });
                    sequences.push({ kind: "sequence", frame: this.#active(), body: [stmt.body], nextStatement: 0, depth, labels: current });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                const result = this.#statement(stmt.body, current);
                if (result.type === "break" && result.target === stmt.name) return { type: "normal", payload: result.payload };
                return result;
            }
            case "switch": {
                if (sequences !== null && isSuspendingGeneratorExpression(stmt.discriminant))
                    return this.#suspendingExpression(stmt.discriminant, { kind: "switch-test", statement: stmt });
                const discriminant = this.#value(stmt.discriminant);
                if (discriminant.type === "throw") { const abrupt: ThrowCompletion = discriminant; return abrupt; }
                return this.#switchBody(stmt, discriminant.value, sequences);
            }
            case "try-finally": {
                if (sequences !== null) {
                    const depth = sequences[sequences.length - 1].depth + 1;
                    sequences.push({ kind: "finally", frame: this.#active(), statement: stmt, depth });
                    sequences.push({ kind: "sequence", frame: this.#active(), body: [stmt.body], nextStatement: 0, depth });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                const result = this.#statement(stmt.body);
                if (result.type === "throw" && result.origin.kind !== "guest" && result.origin.kind !== "engine-diagnostic") return result;
                const savedAbrupt = this.#abrupt, savedSource = this.#lastAbrupt;
                this.#abrupt = null;
                const final = this.#statement(stmt.finalizer);
                if (final.type !== "normal") return updateScriptEmpty(final, { kind: "value", value: UNDEFINED });
                if (result.type === "throw") {
                    this.#abrupt = savedAbrupt;
                    this.#lastAbrupt = savedSource;
                }
                return updateScriptEmpty(result, { kind: "value", value: UNDEFINED });
            }
            case "try-catch": {
                if (sequences !== null) {
                    const depth = sequences[sequences.length - 1].depth + 1;
                    sequences.push({ kind: "catch", frame: this.#active(), statement: stmt, depth });
                    sequences.push({ kind: "sequence", frame: this.#active(), body: [stmt.block], nextStatement: 0, depth });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                const result = this.#statement(stmt.block);
                if (result.type !== "throw" || (result.origin.kind !== "guest" && result.origin.kind !== "engine-diagnostic"))
                    return updateScriptEmpty(result, { kind: "value", value: UNDEFINED });
                // Consumption ends propagation identity, but diagnostic history survives.
                this.#abrupt = null;
                const saved = this.#active();
                try {
                    const created = ExecutableScript.activateCatch(saved.record, stmt, saved.lexical, result.value, this.context, executionKey);
                    if (created.type === "throw") { this.#capture(created); return created; }
                    const scopeId = ExecutableScript.scopeOfNode(saved.record, stmt, executionKey);
                    this.#frame = { ...saved, scopeId, lexical: created.environment };
                    return updateScriptEmpty(this.#statement(stmt.handler), { kind: "value", value: UNDEFINED });
                } finally { this.#frame = saved; }
            }
            case "empty": return { type: "normal", payload: { kind: "empty" } };
            case "function": {
                const copied = this.#copyLegacyFunction(stmt);
                if (copied.type === "throw") { const abrupt: ThrowCompletion = copied; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "expression": {
                const expression = stmt.expression;
                if (sequences !== null) {
                    if (isSuspendingGeneratorExpression(expression)) return this.#suspendingExpression(expression, null);
                    if (expression.kind === "destructure" && isSuspendingGeneratorExpression(expression.value))
                        return this.#suspendingExpression(expression.value, { kind: "pattern", pattern: expression.pattern, environment: null });
                    if ((expression.kind === "assign" || expression.kind === "compound") && isSuspendingGeneratorExpression(expression.value)) {
                        const reference = this.#reference(expression.target, null, this.#active().thisValue);
                        if (reference.type === "abrupt") {
                            if (reference.completion.type === "throw") { const abrupt: ThrowCompletion = reference.completion; return abrupt; }
                            throw new Error("invalid suspended assignment reference");
                        }
                        if (expression.kind === "assign")
                            return this.#suspendingExpression(expression.value, { kind: "assignment", reference: reference.reference, loc: expression.loc });
                        const left = getReferenceValue(this.context, reference.reference, expression.loc);
                        if (left.type === "throw") { const abrupt: ThrowCompletion = left; return abrupt; }
                        if (left.type !== "normal") throw new Error("invalid suspended compound operand");
                        return this.#suspendingExpression(expression.value, { kind: "compound", reference: reference.reference, left: left.value, operator: expression.op, loc: expression.loc });
                    }
                }
                return scriptExpressionCompletion(this.#value(expression));
            }
            case "pattern-declaration": {
                if (isSuspendingGeneratorExpression(stmt.init) && sequences !== null)
                    return this.#suspendingExpression(stmt.init, { kind: "pattern", pattern: stmt.pattern, environment: stmt.declarationKind === "var" ? null : this.#active().lexical });
                const input = this.#value(stmt.init);
                if (input.type === "throw") { const abrupt: ThrowCompletion = input; return abrupt; }
                const initialized = this.#initializePattern(stmt.pattern, null, input.value, stmt.declarationKind === "var" ? null : this.#active().lexical, null);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "let": case "const": {
                if (stmt.init !== null && isSuspendingGeneratorExpression(stmt.init) && sequences !== null)
                    return this.#suspendingExpression(stmt.init, { kind: "initialization", environment: this.#active().lexical, name: stmt.name, loc: stmt.loc }, stmt.name);
                const result = stmt.init === null ? normal() : this.#value(stmt.init, stmt.name);
                if (result.type === "throw") { const abrupt: ThrowCompletion = result; return abrupt; }
                const env = this.#active().lexical;
                const initialized = env.kind === "global" ? env.record.initializeBinding(stmt.name, result.value, this.context, stmt.loc)
                    : env.initializeBinding(stmt.name, result.value, this.context, stmt.loc);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "var": {
                if (sequences !== null && stmt.declarations.length > 1 && stmt.declarations.some(declaration => isSuspendingGeneratorExpression(declaration.init))) {
                    const body: Stmt[] = [];
                    for (const declaration of stmt.declarations) body.push({ kind: "var", loc: stmt.loc, declarations: [declaration] });
                    sequences.push({ kind: "sequence", frame: this.#active(), body, nextStatement: 0, depth: sequences[sequences.length - 1].depth + 1 });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                for (const declaration of stmt.declarations) {
                    if (declaration.init === null) continue;
                    const ref = resolveScriptBinding(this.#active().lexical, declaration.name, stmt.loc, this.#active().strict);
                    if (ref.type === "throw") return ref;
                    if (isSuspendingGeneratorExpression(declaration.init) && sequences !== null) {
                        if (stmt.declarations.length !== 1) throw new Error("unsupported suspended declaration list");
                        return this.#suspendingExpression(declaration.init, { kind: "binding", reference: ref.reference }, declaration.name);
                    }
                    const value = this.#value(declaration.init, declaration.name);
                    if (value.type === "throw") { const abrupt: ThrowCompletion = value; return abrupt; }
                    const written = putScriptBinding(ref.reference, value.value, this.context);
                    if (written.type === "throw") { const abrupt: ThrowCompletion = written; return abrupt; }
                }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "block": {
                const saved = this.#active();
                const scopeId = ExecutableScript.scopeOfNode(saved.record, stmt, executionKey);
                const created = saved.record.createBlockEnvironment(scopeId, saved.lexical, this.context);
                if (created.type === "throw") return created;
                this.#frame = { ...saved, scopeId, lexical: created.environment };
                try {
                    const setup = saved.record.instantiateBlock(scopeId, created.environment, this.context);
                    if (setup.type === "throw") { this.#capture(setup); const abrupt: ThrowCompletion = setup; return abrupt; }
                    if (sequences !== null) {
                        sequences.push({ kind: "sequence", frame: this.#active(), body: stmt.body, nextStatement: 0, depth: sequences[sequences.length - 1].depth + 1 });
                        return { type: "normal", payload: { kind: "empty" } };
                    }
                    return this.#list(stmt.body);
                } finally { this.#frame = saved; }
            }
            case "if": {
                if (sequences !== null && isSuspendingGeneratorExpression(stmt.test))
                    return this.#suspendingExpression(stmt.test, { kind: "branch", consequent: stmt.consequent, alternate: stmt.alternate });
                const test = this.#value(stmt.test);
                if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
                const branch = truthy(test.value) ? stmt.consequent : stmt.alternate;
                if (sequences !== null) {
                    if (branch !== null) sequences.push({ kind: "sequence", frame: this.#active(), body: [branch], nextStatement: 0, depth: sequences[sequences.length - 1].depth + 1 });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                const result: ScriptStatementCompletion = branch === null ? { type: "normal", payload: { kind: "empty" } } : this.#statement(branch);
                return updateScriptEmpty(result, { kind: "value", value: UNDEFINED });
            }
            case "for-of": case "for-in": {
                const saved = this.#active();
                const lexical = lexicalLoopBindings(stmt) !== null;
                const scopeId = lexical ? ExecutableScript.scopeOfNode(saved.record, stmt, executionKey) : saved.scopeId;
                let sourceFrame = saved;
                if (lexical) {
                    const created = ExecutableScript.activateLoop(saved.record, stmt, saved.lexical, null, this.context, executionKey);
                    if (created.type === "throw") return created;
                    sourceFrame = { ...saved, scopeId, lexical: created.environment };
                }
                if (sequences !== null && isSuspendingGeneratorExpression(stmt.iterable)) {
                    sequences.push({ kind: "for-source", frame: sourceFrame, outer: saved, statement: stmt,
                        lexical, scopeId, depth: sequences[sequences.length - 1].depth + 1, labels });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                let iterable: ValueCompletion;
                this.#frame = sourceFrame;
                try { iterable = this.#value(stmt.iterable); }
                finally { this.#frame = saved; }
                if (iterable.type === "throw") { const abrupt: ThrowCompletion = iterable; return abrupt; }
                return this.#forEachBody(stmt, iterable.value, saved, scopeId, lexical, labels, sequences);
            }
            case "for": {
                if (sequences !== null && stmt.initializer !== null && stmt.initializer.kind === "var" &&
                    stmt.initializer.declarations.some(declaration => isSuspendingGeneratorExpression(declaration.init))) {
                    const frame = this.#active(), depth = sequences[sequences.length - 1].depth + 1;
                    sequences.push({ kind: "for", frame, statement: stmt, outer: null, first: true, phase: "prepare", depth, labels });
                    sequences.push({ kind: "sequence", frame, body: [stmt.initializer], nextStatement: 0, depth });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                if (sequences !== null && stmt.initializer !== null && stmt.initializer.kind !== "var" && isSuspendingGeneratorExpression(stmt.initializer))
                    return this.#suspendingExpression(stmt.initializer, { kind: "for-initializer", statement: stmt, labels });
                if (stmt.initializer !== null) {
                    if (stmt.initializer.kind === "var") {
                        const initialized = this.#statement(stmt.initializer);
                        if (initialized.type !== "normal") return initialized;
                    } else {
                        const initialized = this.#value(stmt.initializer);
                        if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                    }
                }
                if (sequences !== null) {
                    sequences.push({ kind: "for", frame: this.#active(), statement: stmt, outer: null, first: true, phase: "prepare", depth: sequences[sequences.length - 1].depth + 1, labels });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                return this.#forBody(stmt, null, labels);
            }
            case "for-lexical": {
                const saved = this.#active();
                const created = ExecutableScript.activateLoop(saved.record, stmt, saved.lexical, null, this.context, executionKey);
                if (created.type === "throw") { const abrupt: ThrowCompletion = created; return abrupt; }
                this.#frame = { ...saved, lexical: created.environment };
                try {
                    const binding = stmt.binding;
                    if (sequences !== null && binding.init !== null && isSuspendingGeneratorExpression(binding.init)) {
                        const frame = this.#active(), depth = sequences[sequences.length - 1].depth + 1;
                        const initialization: Stmt = { kind: stmt.declarationKind, name: binding.site.name, init: binding.init, loc: binding.site.loc };
                        sequences.push({ kind: "for", frame, statement: stmt, outer: saved.lexical, first: true, phase: "prepare", depth, labels });
                        sequences.push({ kind: "sequence", frame, body: [initialization], nextStatement: 0, depth });
                        return { type: "normal", payload: { kind: "empty" } };
                    }
                    const value = binding.init === null ? normal() : this.#value(binding.init, binding.site.name);
                    if (value.type === "throw") { const abrupt: ThrowCompletion = value; return abrupt; }
                    const initialized = created.environment.initializeBinding(binding.site.name, value.value, this.context, binding.site.loc);
                    if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                    if (sequences !== null) {
                        sequences.push({ kind: "for", frame: this.#active(), statement: stmt, outer: saved.lexical, first: true, phase: "prepare", depth: sequences[sequences.length - 1].depth + 1, labels });
                        return { type: "normal", payload: { kind: "empty" } };
                    }
                    return this.#forBody(stmt, saved.lexical, labels);
                } finally { this.#frame = saved; }
            }
            case "while": case "do-while": {
                if (sequences !== null) {
                    sequences.push({ kind: "loop", frame: this.#active(), test: stmt.test, body: stmt.body,
                        testFirst: stmt.kind === "while", first: true, depth: sequences[sequences.length - 1].depth + 1, labels });
                    return { type: "normal", payload: { kind: "empty" } };
                }
                let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
                let first = true;
                while (true) {
                    if (stmt.kind === "while" || !first) {
                        const test = this.#value(stmt.test);
                        if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
                        if (!truthy(test.value)) return { type: "normal", payload: value };
                    }
                    first = false;
                    const result = this.#statement(stmt.body);
                    if (result.type === "break" && result.target === undefined) {
                        return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
                    }
                    if (result.type !== "normal" && (result.type !== "continue" || !this.#continueTarget(result.target, labels))) return updateScriptEmpty(result, value);
                    if (result.payload.kind !== "empty") value = result.payload;
                }
            }
            case "yield": return this.#generatorYield(stmt, null);
            case "return": case "throw": {
                if (stmt.value !== null && isSuspendingGeneratorExpression(stmt.value) && sequences !== null)
                    return this.#suspendingExpression(stmt.value, stmt.kind === "return" ? { kind: "return" } : { kind: "throw", loc: stmt.loc });
                const result = stmt.value === null ? normal() : this.#value(stmt.value);
                if (result.type === "throw") { const abrupt: ThrowCompletion = result; return abrupt; }
                if (stmt.kind === "return") return { type: "return", value: result.value };
                return { type: "throw", origin: { kind: "guest" }, value: result.value,
                    diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: stmt.loc } };
            }
            case "break": case "continue": return stmt.target === undefined ? { type: stmt.kind, payload: { kind: "empty" } }
                : { type: stmt.kind, payload: { kind: "empty" }, target: stmt.target };
        }
    }
    #construct(callee: Value, args: Value[], loc: Location, newTarget: Value = callee): ValueCompletion {
        const saved = this.#active();
        if (callee.kind !== "object" || callee.object.constructorSlot === null) return languageFailure(this.context.realm, "TypeError", "value is not a constructor", loc);
        if (newTarget.kind !== "object" || newTarget.object.constructorSlot === null) return languageFailure(this.context.realm, "TypeError", "newTarget is not a constructor", loc);
        const fn = callee.object.constructorSlot;
        if (fn.kind === "bound") {
            if (fn !== callee.object.callable || fn.realm.profile !== saved.realm.profile || fn.target.constructorSlot === null)
                throw new Error("invalid bound constructor metadata");
            if (this.calls >= this.maxCalls) {
                const result = resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
                this.#capture(result);
                return result;
            }
            this.calls++;
            try {
                const combined = this.#boundArguments(fn, args, loc);
                if (combined.type === "throw") return combined;
                const target: Value = { kind: "object", object: fn.target };
                return this.#construct(target, combined.args, loc, newTarget.object === callee.object ? target : newTarget);
            } finally { this.calls--; }
        }
        if (fn.kind === "builtin-constructor") return this.#constructBuiltin(callee.object, fn, args, loc, newTarget.object);
        if (fn.kind !== "script-guest" || fn !== callee.object.callable || fn.realm.profile !== saved.realm.profile)
            throw new Error("invalid Script constructor metadata");
        if (fn.isClassConstructor) ExecutableScript.validateClassConstructor(fn.record, fn, executionKey);
        else ExecutableScript.readFunction(fn.record, fn, executionKey);
        if (this.calls >= this.maxCalls) {
            const result = resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
            this.#capture(result);
            return result;
        }
        const savedRealm = this.activeContext.realm, savedCalls = this.calls;
        this.calls++;
        try {
            if (fn.isDerivedClassConstructor) {
                this.activeContext.realm = fn.realm;
                if (!fn.isDefaultClassConstructor) return this.#executeScriptFunction(callee.object, fn, UNDEFINED, args, newTarget, loc);
                const parent = callee.object.getPrototypeOf();
                if (parent === null || parent.constructorSlot === null)
                    return languageFailure(fn.realm, "TypeError", "superclass is not a constructor", loc);
                return this.#construct({ kind: "object", object: parent }, args, loc, newTarget);
            }
            // Reserve constructor depth before getters; prototype/allocation
            // failures still belong to the caller frame and Realm.
            const prototype = getPrototypeFromConstructor(newTarget.object, "Object", this.context, loc);
            if (prototype.type === "throw") { this.#capture(prototype); return prototype; }
            const proto = prototype.value;
            const budget = this.tick(loc);
            if (budget.type === "throw") { this.#capture(budget); return budget; }
            const receiver: Value = { kind: "object", object: new GuestObject(proto) };
            this.activeContext.realm = fn.realm;
            if (fn.isDefaultClassConstructor) return normal(receiver);
            const result = this.#executeScriptFunction(callee.object, fn, receiver, args, newTarget);
            if (result.type === "throw") return result;
            return result.value.kind === "object" ? result : normal(receiver);
        } finally {
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
        }
    }
    #constructBuiltin(callee: GuestObject, fn: BuiltinConstructor, args: Value[], loc: Location, newTarget: GuestObject): ValueCompletion {
        const saved = this.#active();
        if (fn.realm.profile !== saved.realm.profile) throw new Error("cross-profile callable invocation");
        const callable = callee.callable;
        if (callable === null || callable.kind !== "builtin" || callable !== fn.callable || callable.realm !== fn.realm)
            throw new Error("invalid builtin constructor metadata");
        if (this.calls >= this.maxCalls) {
            const result = resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
            this.#capture(result);
            return result;
        }
        const savedRealm = this.activeContext.realm, savedCalls = this.calls, previous = pendingBuiltin;
        this.calls++;
        this.activeContext.realm = fn.realm;
        this.#frame = { ...saved, realm: fn.realm };
        pendingBuiltin = { kind: "construct", context: this.context, realm: fn.realm, invoke: fn.invoke, callee, newTarget, args, loc, used: false };
        try {
            const result = fn.invoke(callee, newTarget, args, this.context, loc);
            if (result.type === "throw") { this.#capture(result); return result; }
            if (result.type !== "normal" || result.value.kind !== "object") throw new Error("invalid builtin constructor completion");
            return result;
        } finally {
            pendingBuiltin = previous;
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
        }
    }
    #prepareScriptFunction(callee: GuestObject, fn: ScriptGuestCallable, receiver: Value, args: Value[], newTarget: Value): FunctionPreparation {
        const caller = this.#active(), callerRealm = this.activeContext.realm;
        this.activeContext.realm = fn.realm;
        try {
            const record = fn.record;
            const source = ExecutableScript.readFunction(record, fn, executionKey);
            // Setup failures retain the callee's source and instantiation phase.
            this.#frame = { realm: fn.realm, record, scopeId: source.scopeId, lexical: fn.environment,
                variable: fn.environment, strict: fn.strict, thisValue: receiver, function: fn,
                privateEnvironment: null, phase: "instantiation" };
            const created = record.createFunctionEnvironment(fn, receiver, this.context, newTarget, callee);
            if (created.type === "throw") { this.#capture(created); return created; }
            this.#frame = { ...this.#active(), lexical: created.environment, variable: created.environment, thisValue: created.environment.thisValue };
            const setup = source.needsParameterExecution || source.needsArguments
                ? ExecutableScript.instantiateFunctionForExecution(record, created.environment, args, this.context, {
                    callee,
                    enter: (environment: ScriptEnvironment): void => { this.#frame = { ...this.#active(), lexical: environment, variable: environment }; },
                    evaluate: (initializer: Expr, name: string | null): ValueCompletion => this.#value(initializer, name),
                    initializePattern: (pattern: DestructuringPattern, value: Value, environment: ScriptEnvironment): ValueCompletion => this.#initializePattern(pattern, null, value, environment, null),
                }, executionKey)
                : record.instantiateFunction(created.environment, args, this.context);
            if (setup.type === "throw") { this.#capture(setup); return setup; }
            const frame: ScriptFrameSnapshot = { ...this.#active(), lexical: record.functionBodyEnvironment(created.environment),
                variable: record.functionVariableEnvironment(created.environment), phase: "body" };
            return { type: "normal", activation: { frame, body: source.body, environment: created.environment } };
        } finally {
            this.#frame = caller;
            this.activeContext.realm = callerRealm;
        }
    }
    #executeAsyncFunction(callee: GuestObject, fn: ScriptGuestCallable, receiver: Value, args: Value[], loc: Location): ValueCompletion {
        const capability = intrinsicPromiseCapability(fn.realm);
        const prepared = this.#prepareScriptFunction(callee, fn, receiver, args, UNDEFINED);
        if (prepared.type === "throw") {
            if (fatalPromiseCompletion(prepared)) return prepared;
            const rejected = this.call(capability.reject, UNDEFINED, [prepared.value], loc);
            return rejected.type === "throw" ? rejected : normal(capability.promise);
        }
        const activation = new AsyncActivation(executionKey, fn.realm, capability, prepared.activation);
        const started = this.#resumeAsync(activation, "next", UNDEFINED, loc);
        return started.type === "throw" ? started : normal(capability.promise);
    }
    #resumeAsync(activation: AsyncActivation, mode: "next" | "throw", value: Value, loc: Location): ValueCompletion {
        const continuation = activation.start(executionKey);
        let suspended = false;
        try {
            while (true) {
                const result = this.#runContinuation(continuation, mode, value);
                if (result.type === "yield" || result.type === "async-delegate-yield") throw new Error("yield in async activation");
                if (result.type === "await") {
                    const reacted = this.#awaitPromise(activation, continuation, result.value, result.loc, result.depth);
                    if (reacted.type === "throw") {
                        if (fatalPromiseCompletion(reacted)) return reacted;
                        mode = "throw";
                        value = reacted.value;
                        continue;
                    }
                    activation.suspend(executionKey, continuation);
                    suspended = true;
                    return normal();
                }
                if (result.type === "throw" && fatalPromiseCompletion(result)) return result;
                const settled = this.call(result.type === "throw" ? activation.capability.reject : activation.capability.resolve, UNDEFINED, [result.value], loc);
                return settled.type === "throw" ? settled : normal();
            }
        } finally {
            if (!suspended) activation.complete(executionKey);
        }
    }
    #awaitPromise(activation: AsyncActivation, continuation: ExecutionContinuation, value: Value, loc: Location, depth: number): ValueCompletion {
        const caller = this.#active(), callerRealm = this.activeContext.realm, callerDepth = this.depth, inspection = this.#inspectionSource;
        const frame = continuation.sequences[continuation.sequences.length - 1].frame;
        this.#frame = frame;
        this.activeContext.realm = frame.realm;
        this.depth = callerDepth + depth;
        this.#inspectionSource = null;
        try {
            const constructor = activation.realm.promiseConstructor;
            if (constructor === null) throw new Error("missing Promise intrinsic");
            const promise = promiseResolve({ kind: "object", object: constructor }, value, this.context, loc);
            if (promise.type === "throw") { this.#capture(promise); return promise; }
            if (promise.value.kind !== "object" || !(promise.value.object instanceof GuestPromise)) throw new Error("invalid awaited Promise");
            const reacted = promise.value.object.then(null, asyncResumeHandler(activation, "next"), asyncResumeHandler(activation, "throw"), this.context, loc);
            if (reacted.type === "throw") this.#capture(reacted);
            return reacted;
        } finally {
            this.#frame = caller;
            this.activeContext.realm = callerRealm;
            this.depth = callerDepth;
            this.#inspectionSource = inspection;
        }
    }
    #executeScriptFunction(callee: GuestObject, fn: ScriptGuestCallable, receiver: Value, args: Value[], newTarget: Value = UNDEFINED, constructorLoc: Location | null = null): ValueCompletion {
        const caller = this.#active(), callerRealm = this.activeContext.realm;
        const savedInspectionSource = this.#inspectionSource;
        this.#inspectionSource = null;
        try {
            const prepared = this.#prepareScriptFunction(callee, fn, receiver, args, newTarget);
            if (prepared.type === "throw") return prepared;
            const activation = prepared.activation;
            if (fn.isGenerator) {
                if (constructorLoc === null) throw new Error("generator call location missing");
                const prototype = getPrototypeFromConstructor(callee, fn.isAsync ? "AsyncGenerator" : "Generator", this.context, constructorLoc);
                if (prototype.type === "throw") return prototype;
                return normal({ kind: "object", object: fn.isAsync ? new GuestAsyncGenerator(executionKey, prototype.value, activation) : new GuestGenerator(executionKey, prototype.value, activation) });
            }
            this.#frame = activation.frame;
            this.activeContext.realm = activation.frame.realm;
            const result = this.#list(activation.body);
            if (result.type === "throw") { this.#capture(result); return result; }
            if (fn.isDerivedClassConstructor) {
                if (!(activation.environment instanceof FunctionActivation) || constructorLoc === null) throw new Error("invalid derived activation");
                this.#frame = caller;
                this.activeContext.realm = caller.realm;
                if (result.type === "return" && result.value.kind === "object") return normal(result.value);
                const completion = result.type === "return" && result.value.kind !== "undefined"
                    ? languageFailure(caller.realm, "TypeError", "derived constructor must return an object or undefined", constructorLoc)
                    : activation.environment.getThisBinding(caller.realm, constructorLoc);
                if (completion.type === "throw") this.#capture(completion);
                return completion;
            }
            if (result.type === "return") return normal(result.value);
            if (result.type === "normal") return normal();
            throw new Error("invalid Script function completion");
        } finally {
            this.#frame = caller;
            this.activeContext.realm = callerRealm;
            this.#inspectionSource = savedInspectionSource;
        }
    }
    #thisEnvironment(environment: ScriptEnvironment): ScriptFunctionEnvironment | null {
        let current = environment;
        while (current.kind !== "global") {
            if (current.kind === "function" && current.callable.thisMode !== "lexical") return current;
            current = current.outer;
        }
        return null;
    }
    #performEval(input: Value, direct: boolean, loc: Location): ValueCompletion {
        if (input.kind !== "string") return normal(input);
        if (input.value.length > 100000) return resourceFailure("source-units", input.value.length, 100000, "eval source exceeds 100000 UTF-16 units", loc);
        for (let i = 0; i < input.value.length; i++) {
            const tick = this.tick(loc);
            if (tick.type === "throw") return tick;
        }
        const saved = this.#active(), realm = this.context.realm;
        const functionEnvironment = direct ? this.#thisEnvironment(saved.lexical) : null;
        const prepared = ExecutableScript.prepare({ id: "<eval>", text: input.value }, realm, true, direct && saved.strict,
            functionEnvironment !== null, functionEnvironment?.callable.isDerivedClassConstructor === true ? "derived"
                : functionEnvironment !== null && functionEnvironment.callable.homeObject !== null ? "method" : "none");
        if (prepared.kind === "profile-rejected") throw new Error("invalid eval Realm");
        if (prepared.kind === "conflict") return languageFailure(realm, "SyntaxError", prepared.diagnostic.message, loc);
        if (prepared.kind === "blocked") {
            const rejection = prepared.rejection;
            if (rejection.kind === "resource-limit") return resourceFailure(rejection.guardCode, rejection.count, rejection.limit, prepared.diagnostic.message, loc);
            if (rejection.kind === "syntax-error") return languageFailure(realm, "SyntaxError", prepared.diagnostic.message, loc);
            return unsupportedFailure("runtime.eval-source", "SyntaxError", prepared.diagnostic.message, loc);
        }
        const record = prepared.record, state = ExecutableScript.state(record, executionKey);
        const global: ScriptEnvironment = { kind: "global", record: realm.globalEnvironment };
        const lexical = new ScriptDeclarativeEnvironment(direct ? saved.lexical : global);
        const variable = state.plan.strictness.strict ? lexical : direct ? saved.variable : global;
        const savedLegacy = this.#legacyGlobalFunctions, savedInspection = this.#inspectionSource;
        this.#legacyGlobalFunctions = new Set();
        this.#inspectionSource = null;
        this.#frame = { realm, record, scopeId: 0, lexical, variable, strict: state.plan.strictness.strict,
            thisValue: direct ? saved.thisValue : realm.globalThisValue, function: null, privateEnvironment: null, phase: "instantiation" };
        try {
            const setup = ExecutableScript.instantiateEval(record, lexical, variable, this.context, this.#legacyGlobalFunctions, executionKey);
            if (setup.type === "throw") { this.#capture(setup); return setup; }
            this.#frame = { ...this.#active(), phase: "body" };
            const result = this.#list(ExecutableScript.readRoot(record, executionKey));
            if (result.type === "throw") { this.#capture(result); return result; }
            if (result.type !== "normal") throw new Error("invalid eval root completion");
            return normal(result.payload.kind === "empty" ? UNDEFINED : result.payload.value);
        } finally {
            this.#frame = saved;
            this.#legacyGlobalFunctions = savedLegacy;
            this.#inspectionSource = savedInspection;
        }
    }
    #callScript(callee: Value, receiver: Value, args: Value[], loc: Location, directEval = false): ValueCompletion {
        const saved = this.#active();
        if (callee.kind !== "object" || callee.object.callable === null) throw new Error("invalid private dispatch");
        const fn = callee.object.callable;
        if (fn.kind === "guest") throw new Error("cross-profile callable invocation");
        if (this.calls >= this.maxCalls) {
            const result = resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
            this.#capture(result);
            return result;
        }
        const savedRealm = this.activeContext.realm, savedCalls = this.calls;
        this.calls++;
        this.activeContext.realm = fn.realm;
        this.#frame = { ...saved, realm: fn.realm };
        try {
            if (fn.kind === "async-generator") {
                const generator = AsyncGeneratorCallable.generator(fn, executionKey);
                try {
                    return generator === null ? this.#enqueueAsyncGenerator(receiver, fn.mode, args[0] ?? UNDEFINED, loc)
                        : this.#reactAsyncGenerator(generator, fn.mode, args[0] ?? UNDEFINED, loc);
                } catch (error) {
                    const target = generator ?? (receiver.kind === "object" && GuestAsyncGenerator.is(receiver.object) ? receiver.object : null);
                    if (target !== null) abortAsyncGenerator(GuestAsyncGenerator.data(target, executionKey));
                    throw error;
                }
            }
            if (fn.kind === "async-resume") return this.#resumeAsync(AsyncResumeCallable.activation(fn, executionKey), fn.mode, args[0] ?? UNDEFINED, loc);
            if (fn.kind === "generator-resume") {
                GeneratorResumeCallable.check(fn);
                const result = this.#resumeGenerator(receiver, fn.mode, args[0] ?? UNDEFINED, loc);
                if (result.type === "throw") this.#capture(result);
                return result;
            }
            if (fn.kind === "eval") {
                EvalCallable.check(fn);
                const result = this.#performEval(args[0] ?? UNDEFINED, directEval, loc);
                if (result.type === "throw") this.#capture(result);
                return result;
            }
            if (fn.kind === "bound") {
                const combined = this.#boundArguments(fn, args, loc);
                if (combined.type === "throw") return combined;
                return this.call({ kind: "object", object: fn.target }, fn.receiver, combined.args, loc);
            }
            if (fn.kind === "builtin") {
                const previous = pendingBuiltin;
                pendingBuiltin = { kind: "call", context: this.context, realm: fn.realm, invoke: fn.invoke, receiver, args, loc, used: false };
                try {
                    const result = fn.invoke(receiver, args, this.context, loc);
                    if (result.type === "throw") this.#capture(result);
                    if (result.type === "throw") return result;
                    if (result.type === "normal") return normal(result.value);
                    throw new Error("invalid completion escaped call boundary: " + result.type);
                } finally { pendingBuiltin = previous; }
            }
            if (fn.isClassConstructor) {
                ExecutableScript.validateClassConstructor(fn.record, fn, executionKey);
                return languageFailure(fn.realm, "TypeError", "class constructor requires new", loc);
            }
            if (fn.isAsync && !fn.isGenerator) return this.#executeAsyncFunction(callee.object, fn, receiver, args, loc);
            return this.#executeScriptFunction(callee.object, fn, receiver, args, UNDEFINED, loc);
        } finally {
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
        }
    }

    #enqueueAsyncGenerator(receiver: Value, mode: GeneratorResumeMode, value: Value, loc: Location): ValueCompletion {
        const capability = intrinsicPromiseCapability(this.context.realm);
        if (receiver.kind !== "object" || !GuestAsyncGenerator.is(receiver.object)) {
            const failure = languageFailure(this.context.realm, "TypeError", "incompatible async generator receiver", loc);
            const rejected = this.context.call(capability.reject, UNDEFINED, [failure.value], loc);
            return rejected.type === "throw" ? rejected : normal(capability.promise);
        }
        const generator = receiver.object, data = GuestAsyncGenerator.data(generator, executionKey);
        data.queue.push({ mode, value, capability, loc });
        const driven = this.#drainAsyncGenerator(generator);
        if (driven.type === "throw" && fatalPromiseCompletion(driven)) abortAsyncGenerator(data);
        return driven.type === "throw" ? driven : normal(capability.promise);
    }
    #completeAsyncGeneratorStep(generator: GuestAsyncGenerator, result: ValueCompletion, done: boolean, loc: Location): ValueCompletion {
        const data = GuestAsyncGenerator.data(generator, executionKey), request = data.queue[data.head++];
        if (data.head === data.queue.length) { data.head = 0; data.queue.length = 0; }
        else if (data.head >= 1024 && data.head * 2 >= data.queue.length) { data.queue = data.queue.slice(data.head); data.head = 0; }
        if (request === undefined) throw new Error("empty async generator queue");
        if (result.type === "throw") return this.context.call(request.capability.reject, UNDEFINED, [result.value], loc);
        const object = iteratorResult(result.value, done, this.context, loc);
        return object.type === "throw" ? object : this.context.call(request.capability.resolve, UNDEFINED, [object.value], loc);
    }
    #drainAsyncGenerator(generator: GuestAsyncGenerator): ValueCompletion {
        const data = GuestAsyncGenerator.data(generator, executionKey);
        while (data.head < data.queue.length && (data.immediateFailure !== null || (data.waiting === null && data.state !== "executing"))) {
            if (data.immediateFailure !== null) {
                const failure = data.immediateFailure; data.immediateFailure = null;
                const reacted = this.#reactAsyncGenerator(generator, "throw", failure.value, failure.loc, false);
                if (reacted.type === "throw") return reacted;
                continue;
            }
            const request = data.queue[data.head];
            if (data.state === "suspended-start" && request.mode !== "next") { data.state = "completed"; data.continuation = null; }
            if (data.state === "completed") {
                if (request.mode === "return") {
                    const awaited = this.#awaitAsyncGenerator(generator, request.value, "completed-return", request.loc, 0);
                    if (awaited.type === "throw" || data.immediateFailure === null) return awaited;
                    continue;
                }
                const result: ValueCompletion = request.mode === "throw" ? { type: "throw", origin: { kind: "guest" }, value: request.value,
                    diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: request.loc } } : normal();
                data.state = "executing";
                const completed = this.#completeAsyncGeneratorStep(generator, result, true, request.loc);
                data.state = "completed";
                if (completed.type === "throw") return completed;
                continue;
            }
            const first = data.state === "suspended-start";
            data.state = "executing";
            if (!first && request.mode === "return") {
                const continuation = data.continuation;
                if (continuation === null) throw new Error("missing return continuation");
                const top = continuation.sequences[continuation.sequences.length - 1];
                const awaited = this.#awaitAsyncGenerator(generator, request.value, "resume-return", continuation.yieldLoc ?? request.loc, top.depth);
                if (awaited.type === "throw" || data.immediateFailure === null) return awaited;
                continue;
            }
            const result = this.#runAsyncGenerator(generator, request.mode, first ? UNDEFINED : request.value, request.loc);
            if (result.type === "throw") return result;
        }
        return normal();
    }
    #runAsyncGenerator(generator: GuestAsyncGenerator, mode: GeneratorResumeMode, value: Value, loc: Location): ValueCompletion {
        const data = GuestAsyncGenerator.data(generator, executionKey), continuation = data.continuation;
        if (continuation === null) throw new Error("missing async generator continuation");
        data.state = "executing";
        const result = this.#runContinuation(continuation, mode, value);
        if (result.type === "await") return this.#awaitAsyncGenerator(generator, result.value, "await", result.loc, result.depth);
        if (result.type === "async-delegate-yield") {
            const completed = this.#completeAsyncGeneratorStep(generator, normal(result.value), false, loc);
            data.state = "suspended-yield";
            return completed;
        }
        if (result.type === "yield") {
            if (result.result.kind !== "object") throw new Error("invalid async yield result");
            const yielded = result.result.object.getOwnProperty("value");
            if (yielded === undefined || yielded.kind !== "data") throw new Error("invalid async yield value");
            const top = continuation.sequences[continuation.sequences.length - 1];
            return this.#awaitAsyncGenerator(generator, yielded.value, "yield", continuation.yieldLoc ?? loc, top.depth);
        }
        data.state = "completed";
        data.continuation = null;
        if (result.type === "throw" && fatalPromiseCompletion(result)) { data.queue.length = 0; data.head = 0; return result; }
        data.state = "executing";
        const completed = this.#completeAsyncGeneratorStep(generator, result, true, loc);
        data.state = "completed";
        return completed;
    }
    #reactAsyncGenerator(generator: GuestAsyncGenerator, mode: GeneratorResumeMode, value: Value, loc: Location, drain = true): ValueCompletion {
        const data = GuestAsyncGenerator.data(generator, executionKey), waiting = data.waiting;
        if (waiting === null) throw new Error("async generator reaction without await");
        data.waiting = null;
        let result: ValueCompletion;
        if (waiting === "completed-return") {
            const completion: ValueCompletion = mode === "throw" ? { type: "throw", origin: { kind: "guest" }, value,
                diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc } } : normal(value);
            data.state = "executing";
            result = this.#completeAsyncGeneratorStep(generator, completion, true, loc);
            data.state = "completed";
        } else if (waiting === "yield" && mode === "next") {
            data.state = "executing";
            result = this.#completeAsyncGeneratorStep(generator, normal(value), false, loc);
            data.state = "suspended-yield";
        } else result = this.#runAsyncGenerator(generator, waiting === "resume-return" && mode === "next" ? "return" : mode, value, loc);
        const completed = result.type === "throw" || !drain ? result : this.#drainAsyncGenerator(generator);
        if (completed.type === "throw" && fatalPromiseCompletion(completed)) abortAsyncGenerator(data);
        return completed;
    }
    #awaitAsyncGenerator(generator: GuestAsyncGenerator, value: Value, waiting: AsyncGeneratorWait, loc: Location, depth: number): ValueCompletion {
        const data = GuestAsyncGenerator.data(generator, executionKey);
        data.waiting = waiting;
        const caller = this.#active(), callerRealm = this.activeContext.realm, callerDepth = this.depth, inspection = this.#inspectionSource;
        const continuation = data.continuation;
        if (waiting !== "completed-return") {
            if (continuation === null) throw new Error("missing async generator await frame");
            const frame = continuation.sequences[continuation.sequences.length - 1].frame;
            this.#frame = frame; this.activeContext.realm = frame.realm; this.depth = callerDepth + depth; this.#inspectionSource = null;
        }
        try {
            const realm = this.context.realm, constructor = realm.promiseConstructor;
            if (constructor === null) throw new Error("missing Promise intrinsic");
            const promise = promiseResolve({ kind: "object", object: constructor }, value, this.context, loc);
            if (promise.type === "throw") {
                if (fatalPromiseCompletion(promise)) { data.state = "completed"; data.waiting = null; data.continuation = null; data.queue.length = 0; return promise; }
                data.immediateFailure = { value: promise.value, loc };
                return normal();
            }
            if (promise.value.kind !== "object" || !(promise.value.object instanceof GuestPromise)) throw new Error("invalid async generator Promise");
            return promise.value.object.then(null, { kind: "object", object: asyncGeneratorHandler(realm, "next", generator) },
                { kind: "object", object: asyncGeneratorHandler(realm, "throw", generator) }, this.context, loc);
        } finally { this.#frame = caller; this.activeContext.realm = callerRealm; this.depth = callerDepth; this.#inspectionSource = inspection; }
    }
    #awaitAsyncGeneratorReturn(continuation: ExecutionContinuation, value: Value, loc: Location, callerDepth: number): ContinuationResult {
        continuation.receiver = { kind: "async-return" };
        continuation.yieldLoc = loc;
        return { type: "await", value, loc, depth: this.depth - callerDepth };
    }
    #resumeGenerator(receiver: Value, mode: GeneratorResumeMode, value: Value, loc: Location): ValueCompletion {
        if (receiver.kind !== "object" || !GuestGenerator.is(receiver.object))
            return languageFailure(this.context.realm, "TypeError", "incompatible generator receiver", loc);
        const generator = receiver.object;
        if (generator.state === "executing") return languageFailure(this.context.realm, "TypeError", "generator is already executing", loc);
        if (mode !== "next" && generator.state !== "suspended-yield") {
            generator.complete(executionKey);
            if (mode === "throw") return { type: "throw", origin: { kind: "guest" }, value,
                diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc } };
            return iteratorResult(value, true, this.context, loc);
        }
        if (generator.state === "completed") return iteratorResult(UNDEFINED, true, this.context, loc);
        const continuation = generator.start(executionKey);
        let result: ContinuationResult;
        let suspended = false;
        try {
            result = this.#runContinuation(continuation, mode, value);
            if (result.type === "await" || result.type === "async-delegate-yield") throw new Error("async suspension in generator activation");
            if (result.type === "yield") {
                generator.suspend(executionKey, continuation);
                suspended = true;
                return normal(result.result);
            }
        } finally {
            if (!suspended) generator.complete(executionKey);
        }
        return result.type === "throw" ? result : iteratorResult(result.value, true, this.context, loc);
    }
    #suspendingExpression(expression: Expr, receiver: GeneratorYieldReceiver | null, name: string | null = null): ScriptStatementCompletion {
        if (expression.kind === "yield") return this.#generatorYield(expression, receiver);
        if (!isSuspendingGeneratorExpression(expression)) throw new Error("invalid suspended expression");
        return { type: "generator-expression", expression, receiver, name };
    }
    #beginDelegate(continuation: ExecutionContinuation, value: Value, loc: Location, depth: number): ThrowCompletion | null {
        const acquired = continuation.asyncGenerator ? getAsyncIterator(value, this.context, loc) : getIterator(value, this.context, loc);
        if (acquired.type === "throw") return acquired;
        const asynchronous: AsyncDelegate | null = continuation.asyncGenerator ? { iterator: acquired.value, mode: "next", pending: null } : null;
        continuation.delegate = { iterator: acquired.value, asynchronous, loc, depth };
        return null;
    }
    #generatorYield(expression: GeneratorYieldStmt, receiver: GeneratorYieldReceiver | null): ScriptStatementCompletion {
        if (isSuspendingGeneratorExpression(expression.value)) return { type: "generator-expression", expression, receiver };
        const value = expression.value === null ? normal() : this.#value(expression.value);
        if (value.type === "throw") { const abrupt: ThrowCompletion = value; return abrupt; }
        if (expression.delegate === true) return { type: "delegate", value: value.value, loc: expression.loc, receiver };
        return { type: "yield", value: value.value, loc: expression.loc, receiver };
    }
    #evaluateSuspendingExpression(continuation: ExecutionContinuation, expression: Expr | null, value: Value, callerDepth: number, inferredName: string | null = null): ExpressionContinuationResult {
        const frames = continuation.expressionFrames;
        const sequence = continuation.sequences[continuation.sequences.length - 1];
        const baseDepth = callerDepth + sequence.depth + 1;
        while (true) {
            this.depth = baseDepth + frames.length;
            if (this.depth > 256) {
                const loc = expression !== null ? expression.loc : frames.length !== 0 ? frames[frames.length - 1].expression.loc : continuation.yieldLoc;
                if (loc === null) throw new Error("expression continuation without source");
                return resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", loc);
            }
            if (expression !== null) {
                const name = inferredName;
                inferredName = null;
                if (expression.kind === "yield" || expression.kind === "await" || ((expression.kind === "class" || expression.kind === "chain" || expression.kind === "destructure" || expression.kind === "super-call" || expression.kind === "super-member" || expression.kind === "update" || expression.kind === "compound" || expression.kind === "assign" || expression.kind === "object" || expression.kind === "template" || expression.kind === "new" || expression.kind === "array" || expression.kind === "call" || expression.kind === "member" || expression.kind === "binary" || expression.kind === "conditional" || expression.kind === "unary") && expression.suspends === true)) {
                    const budget = this.tick(expression.loc);
                    if (budget.type === "throw") return budget;
                    if (++this.depth > 256)
                        return resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", expression.loc);
                    if (expression.kind === "await") {
                        frames.push({ kind: "await-operand", expression });
                        expression = expression.value;
                        continue;
                    }
                    if (expression.kind === "super-member") {
                        const superContext = this.#superContext(expression.loc);
                        if (superContext.type === "throw") return superContext;
                        frames.push({ kind: "super-key", expression, operation: { kind: "read" }, homeObject: superContext.homeObject, receiver: superContext.receiver });
                        expression = expression.key;
                        continue;
                    }
                    if (expression.kind === "update") {
                        if (expression.target.kind === "super-member") {
                            const superContext = this.#superContext(expression.target.loc);
                            if (superContext.type === "throw") return superContext;
                            frames.push({ kind: "super-key", expression: expression.target, operation: { kind: "update", expression },
                                homeObject: superContext.homeObject, receiver: superContext.receiver });
                            expression = expression.target.key;
                            continue;
                        }
                        if (expression.target.kind !== "member") throw new Error("suspended update without member");
                        frames.push({ kind: "update-base", expression });
                        expression = expression.target.base;
                        continue;
                    }
                    if (expression.kind === "assign" || expression.kind === "compound") {
                        if (expression.target.kind === "super-member" && isSuspendingGeneratorExpression(expression.target)) {
                            const superContext = this.#superContext(expression.target.loc);
                            if (superContext.type === "throw") return superContext;
                            frames.push({ kind: "super-key", expression: expression.target, operation: expression.kind === "assign" ? { kind: "assignment", expression } : { kind: "compound", expression },
                                homeObject: superContext.homeObject, receiver: superContext.receiver });
                            expression = expression.target.key;
                            continue;
                        }
                        if (expression.target.kind === "member" && isSuspendingGeneratorExpression(expression.target)) {
                            frames.push({ kind: "assignment-base", expression });
                            expression = expression.target.base;
                            continue;
                        }
                        const reference = this.#reference(expression.target, null, this.#active().thisValue);
                        if (reference.type === "abrupt") {
                            if (reference.completion.type === "throw") return reference.completion;
                            throw new Error("invalid assignment reference completion");
                        }
                        if (expression.kind === "compound") {
                            const left = getReferenceValue(this.context, reference.reference, expression.loc);
                            if (left.type === "throw") return left;
                            if (left.type !== "normal") throw new Error("invalid compound read completion");
                            if (skipsRightOperand(expression.op, left.value)) {
                                value = left.value;
                                expression = null;
                                continue;
                            }
                            frames.push({ kind: "compound-value", expression, reference: reference.reference, left: left.value });
                        } else frames.push({ kind: "assignment-value", expression, reference: reference.reference });
                        if ((expression.kind === "assign" || expression.op === "&&" || expression.op === "||" || expression.op === "??") &&
                            expression.target.kind === "identifier" && ExecutableScript.assignmentMayName(this.#active().record, expression, executionKey))
                            inferredName = expression.target.name;
                        expression = expression.value;
                        continue;
                    }
                    if (expression.kind === "object") {
                        frames.push({ kind: "object-property", expression, object: this.context.realm.createObject(), index: 0, stage: "next", key: null });
                        expression = null;
                        continue;
                    }
                    if (expression.kind === "template") {
                        frames.push({ kind: "template-substitution", expression, index: 0, text: expression.strings[0] });
                        expression = expression.expressions[0];
                        continue;
                    }
                    if (expression.kind === "array") {
                        frames.push({ kind: "array-element", expression, object: this.context.realm.createArray(), index: -1, nextIndex: 0 });
                        expression = null;
                        continue;
                    }
                    if (expression.kind === "call" && isSuspendingGeneratorExpression(expression.callee)) {
                        if (expression.callee.kind === "chain") {
                            frames.push({ kind: "chain-evaluate", expression: expression.callee, consumer: { kind: "call", expression } });
                            expression = null;
                        } else if (expression.callee.kind === "super-member") {
                            const superContext = this.#superContext(expression.callee.loc);
                            if (superContext.type === "throw") return superContext;
                            frames.push({ kind: "super-key", expression: expression.callee, operation: { kind: "call", expression },
                                homeObject: superContext.homeObject, receiver: superContext.receiver });
                            expression = expression.callee.key;
                        } else if (expression.callee.kind === "member") {
                            frames.push({ kind: "call-base", expression });
                            expression = expression.callee.base;
                        } else {
                            frames.push({ kind: "call-target", expression, receiver: UNDEFINED });
                            expression = expression.callee;
                        }
                        continue;
                    }
                    if (expression.kind === "new" && isSuspendingGeneratorExpression(expression.callee)) {
                        frames.push({ kind: "constructor", expression });
                        expression = expression.callee;
                        continue;
                    }
                    if (expression.kind === "class") {
                        const outer = this.#active(), scopeId = ExecutableScript.scopeOfNode(outer.record, expression, executionKey);
                        const environment = new ScriptDeclarativeEnvironment(outer.lexical);
                        if (expression.name !== null) {
                            const created = environment.createImmutableBinding(expression.name.name, expression.name.loc);
                            if (created.type === "throw") return created;
                        }
                        const frame: ScriptFrameSnapshot = { ...outer, scopeId, lexical: environment, strict: true };
                        frames.push({ kind: "class-scope", expression, outer, frame });
                        frames.push({ kind: "class-constructor", expression, environment, scopeId, name });
                        this.#frame = frame;
                        expression = expression.heritage;
                        continue;
                    }
                    if (expression.kind === "chain") {
                        frames.push({ kind: "chain-evaluate", expression, consumer: { kind: "value" } });
                        expression = null;
                        continue;
                    }
                    if (expression.kind === "destructure") {
                        frames.push({ kind: "destructure-value", expression });
                        expression = expression.value;
                        continue;
                    }
                    if (expression.kind === "super-call") {
                        const environment = this.#superCallEnvironment();
                        frames.push({ kind: "super-argument", expression, environment, parent: environment.callee!.getPrototypeOf(), values: [], index: 0 });
                        const arg = expression.args[0];
                        expression = arg.kind === "spread" ? arg.expression : arg;
                        continue;
                    }
                    if (expression.kind === "call" || expression.kind === "new") {
                        const reference = this.#expressionReference(expression.callee, null, this.#active().thisValue);
                        const callee = this.#expressionValue(reference, expression.loc);
                        if (callee.type === "throw") return callee;
                        if (callee.type !== "normal") throw new Error("invalid callee completion");
                        const directEval = expression.kind === "call" && !expression.tagged && expression.callee.kind === "identifier" && expression.callee.name === "eval" &&
                            callee.value.kind === "object" && callee.value.object === this.#active().realm.evalIntrinsic;
                        frames.push({ kind: "call-argument", expression, callee: callee.value,
                            receiver: referenceCallReceiver(reference), directEval, values: [], index: 0 });
                        const arg = expression.args[0];
                        expression = arg.kind === "spread" ? arg.expression : arg;
                        continue;
                    }
                    if (expression.kind === "member") {
                        frames.push({ kind: "member-base", expression });
                        expression = expression.base;
                        continue;
                    }
                    if (expression.kind === "binary") {
                        frames.push({ kind: "left", expression });
                        expression = expression.left;
                        continue;
                    }
                    if (expression.kind === "conditional") {
                        frames.push({ kind: "conditional", expression });
                        expression = expression.test;
                        continue;
                    }
                    if (expression.kind === "unary" && expression.op === "delete" && expression.operand.kind === "chain") {
                        frames.push({ kind: "chain-evaluate", expression: expression.operand, consumer: { kind: "delete", expression } });
                        expression = null;
                        continue;
                    }
                    if (expression.kind === "unary" && expression.op === "delete" && expression.operand.kind === "super-member") {
                        const superContext = this.#superContext(expression.operand.loc);
                        if (superContext.type === "throw") return superContext;
                        frames.push({ kind: "super-key", expression: expression.operand, operation: { kind: "delete", expression },
                            homeObject: superContext.homeObject, receiver: superContext.receiver });
                        expression = expression.operand.key;
                        continue;
                    }
                    if (expression.kind === "unary" && expression.op === "delete" && expression.operand.kind === "member") {
                        frames.push({ kind: "delete-base", expression });
                        expression = expression.operand.base;
                        continue;
                    }
                    if (expression.kind === "unary") {
                        frames.push({ kind: "unary", expression });
                        expression = expression.operand;
                        continue;
                    }
                    if (isSuspendingGeneratorExpression(expression.value)) {
                        frames.push({ kind: "yield-operand", expression });
                        expression = expression.value;
                        continue;
                    }
                    const yielded = this.#generatorYield(expression, null);
                    if (yielded.type === "throw") return yielded;
                    continuation.yieldLoc = expression.loc;
                    if (yielded.type === "delegate") {
                        const acquired = this.#beginDelegate(continuation, yielded.value, yielded.loc, sequence.depth + frames.length + 2);
                        if (acquired !== null) return acquired;
                        return { type: "suspended-delegate" };
                    }
                    if (yielded.type !== "yield") throw new Error("invalid expression yield completion");
                    const result = iteratorResult(yielded.value, false, this.context, yielded.loc);
                    if (result.type === "throw") return result;
                    return { type: "yield", result: result.value };
                }
                const evaluated = this.#value(expression, name);
                if (evaluated.type === "throw") return evaluated;
                value = evaluated.value;
                expression = null;
            }
            if (frames.length === 0) return normal(value);
            const frame = frames.pop()!;
            this.depth = baseDepth + frames.length + 1;
            if (frame.kind === "class-scope") {
                this.#frame = frame.outer;
                continue;
            }
            if (frame.kind === "class-constructor") {
                const created = this.#createClassConstructor(frame.expression, frame.scopeId, frame.environment, frame.name,
                    frame.expression.heritage === null ? null : value);
                if (created.type === "throw") return created;
                frames.push({ kind: "class-element", expression: frame.expression, environment: frame.environment,
                    constructor: created.constructor, prototype: created.prototype, index: 0, stage: "next" });
                continue;
            }
            if (frame.kind === "class-element") {
                if (frame.stage === "key") {
                    const element = frame.expression.elements[frame.index];
                    const key = toPropertyKey(value, this.context, element.key.loc);
                    if (key.type === "throw") return key;
                    const defined = this.#defineClassMethod(element, key.value, frame.constructor, frame.prototype);
                    if (defined !== null) return defined;
                    frame.index++;
                    frame.stage = "next";
                }
                while (frame.index < frame.expression.elements.length) {
                    const element = frame.expression.elements[frame.index];
                    if (element.value === frame.expression.constructorMethod) { frame.index++; continue; }
                    if (isSuspendingGeneratorExpression(element.key)) {
                        frame.stage = "key";
                        frames.push(frame);
                        expression = element.key;
                        break;
                    }
                    const keyValue = this.#value(element.key);
                    if (keyValue.type === "throw") return keyValue;
                    const key = toPropertyKey(keyValue.value, this.context, element.key.loc);
                    if (key.type === "throw") return key;
                    const defined = this.#defineClassMethod(element, key.value, frame.constructor, frame.prototype);
                    if (defined !== null) return defined;
                    frame.index++;
                }
                if (expression !== null) continue;
                value = { kind: "object", object: frame.constructor };
                if (frame.expression.name !== null) {
                    const initialized = frame.environment.initializeBinding(frame.expression.name.name, value, this.context, frame.expression.name.loc);
                    if (initialized.type === "throw") return initialized;
                }
                continue;
            }
            if (frame.kind === "chain-evaluate") {
                const base = frame.expression.base;
                if (isSuspendingGeneratorExpression(base)) {
                    if (base.kind === "chain") {
                        frames.push({ kind: "chain-evaluate", expression: base,
                            consumer: { kind: "chain", expression: frame.expression, consumer: frame.consumer } });
                    } else if (base.kind === "member") {
                        frames.push({ kind: "chain-reference-base", expression: frame.expression, consumer: frame.consumer });
                        expression = base.base;
                    } else if (base.kind === "super-member") {
                        const context = this.#superContext(base.loc);
                        if (context.type === "throw") return context;
                        frames.push({ kind: "super-key", expression: base, homeObject: context.homeObject, receiver: context.receiver,
                            operation: { kind: "chain", expression: frame.expression, consumer: frame.consumer } });
                        expression = base.key;
                    } else {
                        frames.push({ kind: "chain-base-value", expression: frame.expression, consumer: frame.consumer });
                        expression = base;
                    }
                } else {
                    const result = this.#expressionReference(base, null, this.#active().thisValue);
                    if (result.type === "abrupt") {
                        if (result.completion.type === "throw") return result.completion;
                        throw new Error("invalid chain base completion");
                    }
                    frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer, index: 0, result });
                }
                continue;
            }
            if (frame.kind === "chain-base-value" || frame.kind === "chain-called") {
                frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer,
                    index: frame.kind === "chain-called" ? frame.index : 0, result: { type: "value", value } });
                continue;
            }
            if (frame.kind === "chain-reference-base") {
                if (frame.expression.base.kind !== "member") throw new Error("invalid chain member base");
                frames.push({ kind: "chain-reference-key", expression: frame.expression, consumer: frame.consumer, base: value });
                expression = frame.expression.base.key;
                continue;
            }
            if (frame.kind === "chain-reference-key") {
                const reference: EvaluationReference = { kind: "script-property", strict: this.#active().strict,
                    reference: { kind: "property", base: frame.base, key: value, loc: frame.expression.base.loc } };
                frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer,
                    index: 0, result: { type: "reference", reference } });
                continue;
            }
            if (frame.kind === "chain-key") {
                const reference: EvaluationReference = { kind: "script-property", strict: this.#active().strict,
                    reference: { kind: "property", base: frame.base, key: value, loc: frame.expression.links[frame.index - 1].loc } };
                frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer,
                    index: frame.index, result: { type: "reference", reference } });
                continue;
            }
            if (frame.kind === "chain-step") {
                if (frame.index === frame.expression.links.length) {
                    const consumer = frame.consumer;
                    if (consumer.kind === "chain") {
                        frames.push({ kind: "chain-step", expression: consumer.expression, consumer: consumer.consumer, index: 0, result: frame.result });
                        continue;
                    }
                    if (consumer.kind === "delete") {
                        const result = frame.result.type === "reference" ? deleteReferenceValue(this.context, frame.result.reference, consumer.expression.loc)
                            : normal({ kind: "boolean", value: true });
                        if (result.type === "throw") return result;
                        if (result.type !== "normal") throw new Error("invalid chain deletion completion");
                        value = result.value;
                        continue;
                    }
                    const result = this.#expressionValue(frame.result, frame.expression.loc);
                    if (result.type === "throw") return result;
                    if (result.type !== "normal") throw new Error("invalid chain result completion");
                    if (consumer.kind === "call") frames.push({ kind: "call-target", expression: consumer.expression, receiver: referenceCallReceiver(frame.result) });
                    value = result.value;
                    continue;
                }
                const link = frame.expression.links[frame.index];
                const budget = this.tick(link.loc);
                if (budget.type === "throw") return budget;
                const base = this.#expressionValue(frame.result, link.loc);
                if (base.type === "throw") return base;
                if (base.type !== "normal") throw new Error("invalid chain link completion");
                if (link.optional && (base.value.kind === "null" || base.value.kind === "undefined")) {
                    frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer,
                        index: frame.expression.links.length, result: { type: "value", value: UNDEFINED } });
                    continue;
                }
                if (link.kind === "member") {
                    frames.push({ kind: "chain-key", expression: frame.expression, consumer: frame.consumer, index: frame.index + 1, base: base.value });
                    expression = link.key;
                    continue;
                }
                const receiver = referenceCallReceiver(frame.result);
                if (link.args.length === 0) {
                    const called = this.call(base.value, receiver, [], link.loc);
                    if (called.type === "throw") return called;
                    frames.push({ kind: "chain-step", expression: frame.expression, consumer: frame.consumer,
                        index: frame.index + 1, result: { type: "value", value: called.value } });
                    continue;
                }
                frames.push({ kind: "chain-called", expression: frame.expression, consumer: frame.consumer, index: frame.index + 1 });
                frames.push({ kind: "call-argument", expression: link, callee: base.value, receiver, directEval: false, values: [], index: 0 });
                const arg = link.args[0];
                expression = arg.kind === "spread" ? arg.expression : arg;
                continue;
            }
            if (frame.kind === "compound-value") {
                const op = frame.expression.op;
                const computed = op === "&&" || op === "||" || op === "??" ? normal(value)
                    : applyBinaryOperator(op, frame.left, value, this.context, frame.expression.loc);
                if (computed.type === "throw") return computed;
                const written = putReferenceValue(this.context, frame.reference, computed.value, frame.expression.loc);
                if (written.type === "throw") return written;
                if (written.type !== "normal") throw new Error("invalid compound write completion");
                value = written.value;
                continue;
            }
            if (frame.kind === "destructure-value") {
                const assigned = this.#initializePattern(frame.expression.pattern, null, value, null, null);
                if (assigned.type === "throw") return assigned;
                continue;
            }
            if (frame.kind === "super-key") {
                const reference = this.#superReference(frame.homeObject, frame.receiver, value, frame.expression.loc);
                if (frame.operation.kind === "chain") {
                    frames.push({ kind: "chain-step", expression: frame.operation.expression, consumer: frame.operation.consumer,
                        index: 0, result: { type: "reference", reference } });
                    continue;
                }
                if (frame.operation.kind === "delete") {
                    const result = deleteReferenceValue(this.context, reference, frame.operation.expression.loc);
                    if (result.type === "throw") return result;
                    throw new Error("super deletion did not throw");
                }
                if (frame.operation.kind === "update") {
                    const result = this.#updateReference(reference, frame.operation.expression.op, frame.operation.expression.prefix, frame.operation.expression.loc);
                    if (result.type === "throw") return result;
                    if (result.type !== "normal") throw new Error("invalid super update completion");
                    value = result.value;
                    continue;
                }
                if (frame.operation.kind === "assignment") {
                    frames.push({ kind: "assignment-value", expression: frame.operation.expression, reference });
                    expression = frame.operation.expression.value;
                    continue;
                }
                const result = getReferenceValue(this.context, reference, frame.expression.loc);
                if (result.type === "throw") return result;
                if (result.type !== "normal") throw new Error("invalid super read completion");
                if (frame.operation.kind === "compound") {
                    if (skipsRightOperand(frame.operation.expression.op, result.value)) {
                        value = result.value;
                        continue;
                    }
                    frames.push({ kind: "compound-value", expression: frame.operation.expression, reference, left: result.value });
                    expression = frame.operation.expression.value;
                    continue;
                }
                if (frame.operation.kind === "call") frames.push({ kind: "call-target", expression: frame.operation.expression, receiver: frame.receiver });
                value = result.value;
                continue;
            }
            if (frame.kind === "update-base") {
                if (frame.expression.target.kind !== "member") throw new Error("update base without member");
                frames.push({ kind: "update-key", expression: frame.expression, base: value });
                expression = frame.expression.target.key;
                continue;
            }
            if (frame.kind === "update-key") {
                const reference: EvaluationReference = { kind: "script-property", strict: this.#active().strict,
                    reference: { kind: "property", base: frame.base, key: value, loc: frame.expression.target.loc } };
                const result = this.#updateReference(reference, frame.expression.op, frame.expression.prefix, frame.expression.loc);
                if (result.type === "throw") return result;
                value = result.value;
                continue;
            }
            if (frame.kind === "assignment-base") {
                if (frame.expression.target.kind !== "member") throw new Error("assignment base without member");
                frames.push({ kind: "assignment-key", expression: frame.expression, base: value });
                expression = frame.expression.target.key;
                continue;
            }
            if (frame.kind === "assignment-key") {
                const reference: EvaluationReference = { kind: "script-property", strict: this.#active().strict,
                    reference: { kind: "property", base: frame.base, key: value, loc: frame.expression.target.loc } };
                if (frame.expression.kind === "compound") {
                    const left = getReferenceValue(this.context, reference, frame.expression.loc);
                    if (left.type === "throw") return left;
                    if (left.type !== "normal") throw new Error("invalid compound target read");
                    if (skipsRightOperand(frame.expression.op, left.value)) {
                        value = left.value;
                        continue;
                    }
                    frames.push({ kind: "compound-value", expression: frame.expression, reference, left: left.value });
                } else frames.push({ kind: "assignment-value", expression: frame.expression, reference });
                expression = frame.expression.value;
                continue;
            }
            if (frame.kind === "assignment-value") {
                const written = putReferenceValue(this.context, frame.reference, value, frame.expression.loc);
                if (written.type === "throw") return written;
                if (written.type !== "normal") throw new Error("invalid assignment completion");
                value = written.value;
                continue;
            }
            if (frame.kind === "object-property") {
                if (frame.stage === "key") {
                    const property = frame.expression.properties[frame.index];
                    if (property.kind === "spread" || typeof property.key === "string") throw new Error("invalid suspended property key");
                    const converted = toPropertyKey(value, this.context, property.key.loc);
                    if (converted.type === "throw") return converted;
                    frame.key = converted.value;
                    frame.stage = "ready";
                } else if (frame.stage === "value") {
                    const defined = this.#defineObjectLiteralProperty(frame.object, frame.expression.properties[frame.index], frame.key, value, frame.expression.loc);
                    if (defined !== null) return defined;
                    frame.index++;
                    frame.stage = "next";
                }
                while (frame.index < frame.expression.properties.length) {
                    const property = frame.expression.properties[frame.index];
                    if (frame.stage === "next") {
                        frame.key = null;
                        if (property.kind !== "spread") {
                            if (typeof property.key === "string") frame.key = property.key;
                            else {
                                frame.stage = "key";
                                frames.push(frame);
                                expression = property.key;
                                break;
                            }
                        }
                        frame.stage = "ready";
                    }
                    if (isSuspendingGeneratorExpression(property.value)) {
                        frame.stage = "value";
                        frames.push(frame);
                        expression = property.value;
                        inferredName = this.#objectPropertyName(property, frame.key);
                        break;
                    }
                    const evaluated = this.#value(property.value, this.#objectPropertyName(property, frame.key));
                    if (evaluated.type === "throw") return evaluated;
                    const defined = this.#defineObjectLiteralProperty(frame.object, property, frame.key, evaluated.value, frame.expression.loc);
                    if (defined !== null) return defined;
                    frame.index++;
                    frame.stage = "next";
                }
                if (expression !== null) continue;
                value = { kind: "object", object: frame.object };
                continue;
            }
            if (frame.kind === "template-substitution") {
                const converted = this.#templateString(value, frame.expression.expressions[frame.index].loc);
                if (converted.type === "throw") return converted;
                frame.text = stringConcat(stringConcat(frame.text, converted.value), frame.expression.strings[++frame.index]);
                if (frame.index < frame.expression.expressions.length) {
                    frames.push(frame);
                    expression = frame.expression.expressions[frame.index];
                    continue;
                }
                value = { kind: "string", value: frame.text };
                continue;
            }
            if (frame.kind === "array-element") {
                if (frame.index >= 0) {
                    const element = frame.expression.elements[frame.index];
                    if (element === null) throw new Error("suspended array hole");
                    const appended = appendArrayElement(frame.object, frame.nextIndex, value, element.kind === "spread", this.context,
                        element.kind === "spread" ? element.loc : frame.expression.loc);
                    if (appended.type === "throw") return appended;
                    frame.nextIndex = appended.index;
                }
                while (++frame.index < frame.expression.elements.length) {
                    const budget = this.tick(frame.expression.loc);
                    if (budget.type === "throw") return budget;
                    const element = frame.expression.elements[frame.index];
                    if (element === null) { frame.nextIndex++; continue; }
                    frames.push(frame);
                    expression = element.kind === "spread" ? element.expression : element;
                    break;
                }
                if (expression !== null) continue;
                const finished = finishArrayLiteral(frame.object, frame.nextIndex, this.context, frame.expression.loc);
                if (finished.type === "throw") return finished;
                value = finished.value;
                continue;
            }
            if (frame.kind === "delete-base") {
                if (frame.expression.operand.kind !== "member") throw new Error("delete base without member");
                frames.push({ kind: "delete-key", expression: frame.expression, base: value });
                expression = frame.expression.operand.key;
                continue;
            }
            if (frame.kind === "delete-key") {
                const loc = frame.expression.operand.loc;
                const result = deleteReferenceValue(this.context, { kind: "script-property",
                    reference: { kind: "property", base: frame.base, key: value, loc }, strict: this.#active().strict }, frame.expression.loc);
                if (result.type === "throw") return result;
                if (result.type !== "normal") throw new Error("invalid property deletion completion");
                value = result.value;
                continue;
            }
            if (frame.kind === "call-base") {
                if (frame.expression.callee.kind !== "member") throw new Error("call base without member");
                frames.push({ kind: "call-key", expression: frame.expression, base: value });
                expression = frame.expression.callee.key;
                continue;
            }
            if (frame.kind === "call-key") {
                const loc = frame.expression.callee.loc;
                const result = getReferenceValue(this.context, { kind: "property", base: frame.base, key: value, loc }, loc);
                if (result.type === "throw") return result;
                if (result.type !== "normal") throw new Error("invalid method read completion");
                frames.push({ kind: "call-target", expression: frame.expression, receiver: frame.base });
                value = result.value;
                continue;
            }
            if (frame.kind === "call-target") {
                if (frame.expression.args.length === 0) {
                    const called = this.call(value, frame.receiver, [], frame.expression.loc);
                    if (called.type === "throw") return called;
                    value = called.value;
                    continue;
                }
                frames.push({ kind: "call-argument", expression: frame.expression, callee: value,
                    receiver: frame.receiver, directEval: false, values: [], index: 0 });
                const arg = frame.expression.args[0];
                expression = arg.kind === "spread" ? arg.expression : arg;
                continue;
            }
            if (frame.kind === "constructor") {
                if (frame.expression.args.length === 0) {
                    const constructed = this.#construct(value, [], frame.expression.loc);
                    if (constructed.type === "throw") return constructed;
                    value = constructed.value;
                    continue;
                }
                frames.push({ kind: "call-argument", expression: frame.expression, callee: value,
                    receiver: UNDEFINED, directEval: false, values: [], index: 0 });
                const arg = frame.expression.args[0];
                expression = arg.kind === "spread" ? arg.expression : arg;
                continue;
            }
            if (frame.kind === "call-argument" || frame.kind === "super-argument") {
                const arg = frame.expression.args[frame.index];
                if (arg.kind === "spread") {
                    const spread = this.#spreadArguments(value, frame.values, arg.loc);
                    if (spread !== null) return spread;
                } else frame.values.push(value);
                if (frame.kind === "call-argument") frame.index++;
                else if (frame.kind === "super-argument") frame.index++;
                if (frame.index < frame.expression.args.length) {
                    frames.push(frame);
                    const next = frame.expression.args[frame.index];
                    expression = next.kind === "spread" ? next.expression : next;
                    continue;
                }
                const called = frame.kind === "super-argument" ? this.#finishSuperCall(frame.environment, frame.parent, frame.values, frame.expression.loc)
                    : frame.expression.kind === "new" ? this.#construct(frame.callee, frame.values, frame.expression.loc)
                    : frame.directEval ? this.#callScript(frame.callee, UNDEFINED, frame.values, frame.expression.loc, true)
                    : this.call(frame.callee, frame.receiver, frame.values, frame.expression.loc);
                if (called.type === "throw") return called;
                value = called.value;
                continue;
            }
            if (frame.kind === "member-base") {
                frames.push({ kind: "member-key", expression: frame.expression, base: value });
                expression = frame.expression.key;
                continue;
            }
            if (frame.kind === "member-key") {
                const result = getReferenceValue(this.context, { kind: "property", base: frame.base, key: value, loc: frame.expression.loc }, frame.expression.loc);
                if (result.type === "throw") return result;
                if (result.type !== "normal") throw new Error("invalid property read completion");
                value = result.value;
                continue;
            }
            if (frame.kind === "conditional") {
                frames.push({ kind: "branch", expression: frame.expression });
                expression = truthy(value) ? frame.expression.consequent : frame.expression.alternate;
                continue;
            }
            if (frame.kind === "branch") continue;
            if (frame.kind === "await-operand") {
                continuation.yieldLoc = frame.expression.loc;
                return { type: "await", value, loc: frame.expression.loc, depth: this.depth - callerDepth };
            }
            if (frame.kind === "yield-operand") {
                continuation.yieldLoc = frame.expression.loc;
                if (frame.expression.delegate === true) {
                    const acquired = this.#beginDelegate(continuation, value, frame.expression.loc, sequence.depth + frames.length + 2);
                    if (acquired !== null) return acquired;
                    return { type: "suspended-delegate" };
                }
                const result = iteratorResult(value, false, this.context, frame.expression.loc);
                if (result.type === "throw") return result;
                return { type: "yield", result: result.value };
            }
            if (frame.kind === "unary") {
                const computed = applyUnaryValueOperator(frame.expression.op, value, this.context, frame.expression.loc);
                if (computed.type === "throw") return computed;
                value = computed.value;
                continue;
            }
            const node = frame.expression;
            if (frame.kind === "left") {
                if (skipsRightOperand(node.op, value)) continue;
                frames.push({ kind: "right", expression: node, left: value });
                expression = node.right;
                continue;
            }
            if (node.op === "??" || node.op === "&&" || node.op === "||" || node.op === ",") continue;
            const computed = node.op === "instanceof" ? instanceofOperator(frame.left, value, this.context, node.loc)
                : applyBinaryOperator(node.op, frame.left, value, this.context, node.loc);
            if (computed.type === "throw") return computed;
            value = computed.value;
        }
    }
    #startSuspendingExpression(continuation: ExecutionContinuation, expression: Expr, receiver: GeneratorYieldReceiver | null, callerDepth: number, name: string | null = null): ContinuationResult | null {
        continuation.receiver = receiver;
        const evaluated = this.#evaluateSuspendingExpression(continuation, expression, UNDEFINED, callerDepth, name);
        if (evaluated.type === "yield" || evaluated.type === "await" || evaluated.type === "async-delegate-yield") return evaluated;
        if (evaluated.type === "suspended-delegate") return null;
        if (evaluated.type === "throw") {
            this.#capture(evaluated);
            return this.#unwindContinuation(continuation, evaluated, callerDepth);
        }
        return this.#receiveSuspension(continuation, evaluated.value, callerDepth);
    }
    #receiveSuspension(continuation: ExecutionContinuation, value: Value, callerDepth: number): ContinuationResult | null {
        if (continuation.expressionFrames.length !== 0) {
            const computed = this.#evaluateSuspendingExpression(continuation, null, value, callerDepth);
            if (computed.type === "yield" || computed.type === "await" || computed.type === "async-delegate-yield") return computed;
            if (computed.type === "suspended-delegate") return null;
            if (computed.type === "throw") {
                this.#capture(computed);
                return this.#unwindContinuation(continuation, computed, callerDepth);
            }
            value = computed.value;
        }
        const receiver = continuation.receiver;
        continuation.receiver = null;
        if (receiver === null) return null;
        const frame = continuation.sequences[continuation.sequences.length - 1];
        this.depth = callerDepth + frame.depth + 1;
        if (this.depth > 256) {
            if (continuation.yieldLoc === null) throw new Error("yield receiver without source");
            const failure = resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", continuation.yieldLoc);
            this.#capture(failure);
            return failure;
        }
        if (receiver.kind === "switch-selector") {
            if (frame.kind !== "switch" || frame.selection === null) throw new Error("selector without switch frame");
            if (equal(frame.selection.discriminant, value)) this.#enterSwitchClauses(frame, continuation.sequences, frame.selection.nextClause - 1);
            return null;
        }
        if (receiver.kind === "switch-test") {
            const result = this.#switchBody(receiver.statement, value, continuation.sequences);
            if (result.type === "throw") {
                this.#capture(result);
                return this.#unwindContinuation(continuation, result, callerDepth);
            }
            if (result.type !== "normal") throw new Error("invalid resumed switch setup");
            return null;
        }
        if (receiver.kind === "for-source") {
            if (frame.kind !== "for-source") throw new Error("iterable without source frame");
            continuation.sequences.pop();
            this.#frame = frame.outer;
            const result = this.#forEachBody(frame.statement, value, frame.outer, frame.scopeId, frame.lexical, frame.labels, continuation.sequences);
            if (result.type === "throw") {
                this.#capture(result);
                return this.#unwindContinuation(continuation, result, callerDepth);
            }
            if (result.type !== "normal") throw new Error("invalid resumed iteration setup");
            return null;
        }
        if (receiver.kind === "for-initializer") {
            continuation.sequences.push({ kind: "for", frame: this.#active(), statement: receiver.statement,
                outer: null, first: true, phase: "prepare", depth: frame.depth + 1, labels: receiver.labels });
            return null;
        }
        if (receiver.kind === "for-update") {
            if (frame.kind !== "for" || frame.phase !== "test") throw new Error("for update without test phase");
            return null;
        }
        if (receiver.kind === "loop-test") {
            if (frame.kind !== "loop" && frame.kind !== "for") throw new Error("loop test without loop frame");
            if (!truthy(value)) continuation.sequences.pop();
            else {
                frame.first = false;
                continuation.sequences.push({ kind: "sequence", frame: frame.frame, body: [frame.kind === "for" ? frame.statement.body : frame.body], nextStatement: 0, depth: frame.depth });
            }
            return null;
        }
        if (receiver.kind === "branch") {
            const branch = truthy(value) ? receiver.consequent : receiver.alternate;
            if (branch !== null) continuation.sequences.push({ kind: "sequence", frame: frame.frame, body: [branch], nextStatement: 0, depth: frame.depth + 1 });
            return null;
        }
        if (receiver.kind === "async-return") return this.#unwindContinuation(continuation, { type: "return", value }, callerDepth);
        if (receiver.kind === "return") return continuation.asyncGenerator
            ? this.#awaitAsyncGeneratorReturn(continuation, value, continuation.yieldLoc!, callerDepth)
            : this.#unwindContinuation(continuation, { type: "return", value }, callerDepth);
        if (receiver.kind === "throw") {
            const abrupt: ThrowCompletion = { type: "throw", origin: { kind: "guest" }, value,
                diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: receiver.loc } };
            this.#capture(abrupt);
            return this.#unwindContinuation(continuation, abrupt, callerDepth);
        }
        if (receiver.kind === "pattern") {
            const initialized = this.#initializePattern(receiver.pattern, null, value, receiver.environment, null);
            if (initialized.type === "throw") {
                this.#capture(initialized);
                return this.#unwindContinuation(continuation, initialized, callerDepth);
            }
            return null;
        }
        if (receiver.kind === "assignment" || receiver.kind === "compound") {
            if (receiver.kind === "compound") {
                const computed = applyBinaryOperator(receiver.operator, receiver.left, value, this.context, receiver.loc);
                if (computed.type === "throw") {
                    this.#capture(computed);
                    return this.#unwindContinuation(continuation, computed, callerDepth);
                }
                value = computed.value;
            }
            const written = putReferenceValue(this.context, receiver.reference, value, receiver.loc);
            if (written.type === "throw") {
                this.#capture(written);
                return this.#unwindContinuation(continuation, written, callerDepth);
            }
            if (written.type !== "normal") throw new Error("invalid resumed assignment completion");
            return null;
        }
        const written = receiver.kind === "binding" ? putScriptBinding(receiver.reference, value, this.context)
            : receiver.environment.kind === "global" ? receiver.environment.record.initializeBinding(receiver.name, value, this.context, receiver.loc)
            : receiver.environment.initializeBinding(receiver.name, value, this.context, receiver.loc);
        if (written.type === "throw") {
            this.#capture(written);
            return this.#unwindContinuation(continuation, written, callerDepth);
        }
        return null;
    }
    #scheduleFinally(continuation: ExecutionContinuation, boundary: GeneratorFinally, pending: GeneratorPending): void {
        continuation.sequences.push({ kind: "cleanup", frame: boundary.frame, pending,
            abrupt: this.#abrupt, source: this.#lastAbrupt, depth: boundary.depth });
        continuation.sequences.push({ kind: "sequence", frame: boundary.frame,
            body: [boundary.statement.finalizer], nextStatement: 0, depth: boundary.depth });
        this.#abrupt = null;
    }
    #unwindContinuation(continuation: ExecutionContinuation, completion: GeneratorAbrupt, callerDepth: number): ContinuationResult | null {
        continuation.delegate = null;
        continuation.receiver = null;
        for (let i = continuation.expressionFrames.length - 1; i >= 0; i--) {
            const scope = continuation.expressionFrames[i];
            if (scope.kind === "class-scope") this.#frame = scope.outer;
        }
        continuation.expressionFrames.length = 0;
        if (completion.type === "throw" && completion.origin.kind !== "guest" && completion.origin.kind !== "engine-diagnostic") return completion;
        const sequences = continuation.sequences;
        while (sequences.length !== 0) {
            const boundary = sequences.pop()!;
            if (boundary.kind === "iterator") {
                this.#frame = boundary.frame;
                this.depth = callerDepth + boundary.depth;
                if (completion.type === "continue" && this.#continueTarget(completion.target, boundary.labels ?? null)) { sequences.push(boundary); return null; }
                if (boundary.statement.awaited) {
                    const close: AsyncIteratorCloseFrame = { kind: "async-close", frame: boundary.frame, loc: boundary.statement.loc,
                        depth: boundary.depth, pending: completion, abrupt: this.#abrupt, source: this.#lastAbrupt };
                    const receiver: Value = { kind: "object", object: boundary.iterator.iterator };
                    const method = boundary.iterator.iterator.internalGet("return", receiver, this.context, close.loc);
                    if (method.type === "throw") return this.#finishAsyncIteratorClose(continuation, close, method, callerDepth);
                    if (method.value.kind === "undefined" || method.value.kind === "null") {
                        if (completion.type === "break" && completion.target === undefined) return null;
                        continue;
                    }
                    const called = this.context.call(method.value, receiver, [], close.loc);
                    if (called.type === "throw") return this.#finishAsyncIteratorClose(continuation, close, called, callerDepth);
                    sequences.push(close);
                    continuation.yieldLoc = close.loc;
                    return { type: "await", value: called.value, loc: close.loc, depth: close.depth };
                }
                if (completion.type === "throw") {
                    const pending = completion, abrupt = this.#abrupt, source = this.#lastAbrupt;
                    completion = iteratorCloseOnThrow(boundary.iterator, pending, this.context, boundary.statement.loc);
                    if (completion === pending) { this.#abrupt = abrupt; this.#lastAbrupt = source; }
                    else this.#capture(completion);
                } else {
                    const closed = iteratorCloseNormally(boundary.iterator, this.context, boundary.statement.loc);
                    if (closed.type === "throw") { this.#capture(closed); completion = closed; }
                    else if (completion.type === "break" && completion.target === undefined) return null;
                }
                if (completion.type === "throw" && completion.origin.kind !== "guest" && completion.origin.kind !== "engine-diagnostic") return completion;
                continue;
            }
            if (boundary.kind === "finally") {
                this.#scheduleFinally(continuation, boundary, completion);
                return null;
            }
            if (boundary.kind === "switch" && completion.type === "break" && completion.target === undefined) return null;
            if (boundary.kind === "label" && completion.type === "break" && completion.target === boundary.name) return null;
            if (boundary.kind === "loop" || boundary.kind === "for" || boundary.kind === "enumerator") {
                if (completion.type === "break" && completion.target === undefined) return null;
                if (completion.type === "continue" && this.#continueTarget(completion.target, boundary.labels ?? null)) {
                    sequences.push(boundary);
                    return null;
                }
            }
            if (boundary.kind !== "catch" || completion.type !== "throw") continue;
            this.#abrupt = null;
            this.#frame = boundary.frame;
            this.depth = callerDepth + boundary.depth;
            const created = ExecutableScript.activateCatch(boundary.frame.record, boundary.statement, boundary.frame.lexical, completion.value, this.context, executionKey);
            if (created.type === "throw") {
                this.#capture(created);
                if (created.origin.kind !== "guest" && created.origin.kind !== "engine-diagnostic") return created;
                completion = created;
                continue;
            }
            const scopeId = ExecutableScript.scopeOfNode(boundary.frame.record, boundary.statement, executionKey);
            const frame = { ...boundary.frame, scopeId, lexical: created.environment };
            sequences.push({ kind: "sequence", frame, body: [boundary.statement.handler], nextStatement: 0, depth: boundary.depth });
            return null;
        }
        if (completion.type === "throw") return completion;
        if (completion.type === "return") return normal(completion.value);
        throw new Error("generator loop control without loop");
    }
    #finishAsyncIteratorClose(continuation: ExecutionContinuation, close: AsyncIteratorCloseFrame, result: ValueCompletion, callerDepth: number): ContinuationResult | null {
        let completion = close.pending;
        if (result.type === "throw" && fatalPromiseCompletion(result)) { this.#capture(result); return result; }
        if (completion.type === "throw") { this.#abrupt = close.abrupt; this.#lastAbrupt = close.source; }
        else if (result.type === "throw") { completion = result; this.#capture(result); }
        else if (result.value.kind !== "object") {
            completion = languageFailure(this.context.realm, "TypeError", "async iterator return result must be an object", close.loc);
            this.#capture(completion);
        } else if (completion.type === "break" && completion.target === undefined) return null;
        return this.#unwindContinuation(continuation, completion, callerDepth);
    }
    #receiveAsyncIteratorStep(continuation: ExecutionContinuation, loop: GeneratorForOf, result: ValueCompletion, callerDepth: number): ContinuationResult | null {
        const sequences = continuation.sequences;
        loop.awaiting = false;
        let next: ValueCompletion = result;
        if (next.type === "normal") {
            if (next.value.kind !== "object") next = languageFailure(this.context.realm, "TypeError", "async iterator result must be an object", loop.statement.loc);
            else {
                const object = next.value;
                const done = object.object.internalGet("done", object, this.context, loop.statement.loc);
                if (done.type === "throw") next = done;
                else if (truthy(done.value)) { sequences.pop(); return null; }
                else next = object.object.internalGet("value", object, this.context, loop.statement.loc);
            }
        }
        if (next.type === "throw") {
            sequences.pop();
            this.#capture(next);
            return this.#unwindContinuation(continuation, next, callerDepth);
        }
        const initialized = this.#initializeForEach(loop.statement, loop.frame, loop.scopeId, loop.lexical, loop.target, next.value);
        if (initialized.type === "throw") { this.#capture(initialized); return this.#unwindContinuation(continuation, initialized, callerDepth); }
        sequences.push({ kind: "sequence", frame: this.#active(), body: [loop.statement.body], nextStatement: 0, depth: loop.depth });
        return null;
    }
    #expressionContext(continuation: ExecutionContinuation, fallback: ScriptFrameSnapshot): ScriptFrameSnapshot {
        for (let i = continuation.expressionFrames.length - 1; i >= 0; i--) {
            const scope = continuation.expressionFrames[i];
            if (scope.kind === "class-scope") return scope.frame;
        }
        return fallback;
    }
    #runContinuation(continuation: ExecutionContinuation, mode: GeneratorResumeMode, value: Value): ContinuationResult {
        const sequences = continuation.sequences;
        const caller = this.#active(), callerRealm = this.activeContext.realm, inspection = this.#inspectionSource, callerDepth = this.depth;
        const active = sequences[sequences.length - 1];
        this.#frame = this.#expressionContext(continuation, active.frame);
        this.activeContext.realm = active.frame.realm;
        this.#inspectionSource = null;
        try {
            if (active.kind === "async-close" || (active.kind === "iterator" && active.awaiting)) {
                this.depth = callerDepth + active.depth;
                const input: ValueCompletion = mode === "throw" ? { type: "throw", origin: { kind: "guest" }, value,
                    diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: active.kind === "async-close" ? active.loc : active.statement.loc } } : normal(value);
                let received: ContinuationResult | null;
                if (active.kind === "async-close") { sequences.pop(); received = this.#finishAsyncIteratorClose(continuation, active, input, callerDepth); }
                else received = this.#receiveAsyncIteratorStep(continuation, active, input, callerDepth);
                if (received !== null) return received;
                mode = "next";
                value = UNDEFINED;
            }
            if (mode === "next" && continuation.delegate === null && (continuation.receiver !== null || continuation.expressionFrames.length !== 0)) {
                const result = this.#receiveSuspension(continuation, value, callerDepth);
                if (result !== null) return result;
                value = UNDEFINED;
            }
            if (mode === "return" && continuation.delegate === null) {
                const result = this.#unwindContinuation(continuation, { type: "return", value }, callerDepth);
                if (result !== null) return result;
            }
            if (mode === "throw" && continuation.delegate === null) {
                if (continuation.yieldLoc === null) throw new Error("abrupt generator resume without yield");
                const result: ThrowCompletion = { type: "throw", origin: { kind: "guest" }, value,
                    diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc: continuation.yieldLoc } };
                this.#capture(result);
                const uncaught = this.#unwindContinuation(continuation, result, callerDepth);
                if (uncaught !== null) return uncaught;
            }
            while (sequences.length !== 0) {
                if (continuation.delegate !== null) {
                    const frame = sequences[sequences.length - 1];
                    this.#frame = this.#expressionContext(continuation, frame.frame);
                    this.depth = callerDepth + continuation.delegate.depth;
                    if (this.depth > 256) {
                        const failure = resourceFailure("evaluation-depth", this.depth, 256, "evaluation nesting limit exceeded", continuation.delegate.loc);
                        this.#capture(failure);
                        return failure;
                    }
                    const delegate = continuation.delegate;
                    const delegated = delegate.asynchronous === null ? resumeGeneratorDelegate(delegate.iterator, mode, value, this.context, delegate.loc)
                        : resumeAsyncDelegate(delegate.asynchronous, mode, value, this.context, delegate.loc);
                    if (delegated.type === "await") return { type: "await", value: delegated.value, loc: delegate.loc, depth: delegate.depth };
                    if (delegated.type === "async-delegate-yield") return { type: "async-delegate-yield", value: delegated.value };
                    mode = "next";
                    value = UNDEFINED;
                    if (delegated.type === "throw") {
                        this.#capture(delegated);
                        const uncaught = this.#unwindContinuation(continuation, delegated, callerDepth);
                        if (uncaught !== null) return uncaught;
                        continue;
                    }
                    if (delegated.type === "yield") { const yielded: { type: "yield"; result: Value } = delegated; return yielded; }
                    continuation.delegate = null;
                    if (delegated.type === "return") {
                        const result = this.#unwindContinuation(continuation, { type: "return", value: delegated.value }, callerDepth);
                        if (result !== null) return result;
                        continue;
                    }
                    const result = this.#receiveSuspension(continuation, delegated.value, callerDepth);
                    if (result !== null) return result;
                    if (sequences.length === 0) return normal();
                    if (continuation.delegate !== null) continue;
                }
                const sequence = sequences[sequences.length - 1];
                this.#frame = sequence.frame;
                this.depth = callerDepth + sequence.depth;
                if (sequence.kind === "switch") {
                    const selection = sequence.selection;
                    if (selection === null) { sequences.pop(); continue; }
                    const clauses = selection.statement.caseBlock.clauses;
                    if (selection.nextClause === clauses.length) {
                        this.#enterSwitchClauses(sequence, sequences, selection.fallback);
                        continue;
                    }
                    const index = selection.nextClause++, test = clauses[index].test;
                    if (test === null) { selection.fallback = index; continue; }
                    if (isSuspendingGeneratorExpression(test)) {
                        mode = "next";
                        value = UNDEFINED;
                        const result = this.#startSuspendingExpression(continuation, test, { kind: "switch-selector" }, callerDepth);
                        if (result !== null) return result;
                        continue;
                    }
                    const selector = this.#value(test);
                    if (selector.type === "throw") {
                        this.#capture(selector);
                        const failed = this.#unwindContinuation(continuation, selector, callerDepth);
                        if (failed !== null) return failed;
                        continue;
                    }
                    if (equal(selection.discriminant, selector.value)) this.#enterSwitchClauses(sequence, sequences, index);
                    continue;
                }
                if (sequence.kind === "catch" || sequence.kind === "label") { sequences.pop(); continue; }
                if (sequence.kind === "finally") {
                    sequences.pop();
                    this.#scheduleFinally(continuation, sequence, { type: "normal" });
                    continue;
                }
                if (sequence.kind === "cleanup") {
                    sequences.pop();
                    if (sequence.pending.type === "normal") continue;
                    if (sequence.pending.type === "throw") {
                        this.#abrupt = sequence.abrupt;
                        this.#lastAbrupt = sequence.source;
                    }
                    const result = this.#unwindContinuation(continuation, sequence.pending, callerDepth);
                    if (result !== null) return result;
                    continue;
                }
                if (sequence.kind === "async-close") throw new Error("async close resumed without result");
                if (sequence.kind === "iterator" && sequence.statement.awaited) {
                    const tick = this.context.tick(sequence.statement.loc);
                    const next = tick.type === "throw" ? tick : this.context.call(sequence.iterator.nextMethod, { kind: "object", object: sequence.iterator.iterator }, [], sequence.statement.loc);
                    if (next.type === "throw") {
                        sequences.pop();
                        this.#capture(next);
                        const failed = this.#unwindContinuation(continuation, next, callerDepth);
                        if (failed !== null) return failed;
                        continue;
                    }
                    sequence.awaiting = true;
                    continuation.yieldLoc = sequence.statement.loc;
                    return { type: "await", value: next.value, loc: sequence.statement.loc, depth: sequence.depth };
                }
                if (sequence.kind === "iterator" || sequence.kind === "enumerator") {
                    const next = sequence.kind === "iterator" ? iteratorStepValue(sequence.iterator, this.context, sequence.statement.loc)
                        : sequence.enumerator.next(this.context, sequence.statement.loc);
                    if (next.type === "throw") {
                        sequences.pop();
                        this.#capture(next);
                        const result = this.#unwindContinuation(continuation, next, callerDepth);
                        if (result !== null) return result;
                        continue;
                    }
                    if (next.done) { sequences.pop(); continue; }
                    const initialized = this.#initializeForEach(sequence.statement, sequence.frame, sequence.scopeId, sequence.lexical, sequence.target, next.value);
                    if (initialized.type === "throw") {
                        this.#capture(initialized);
                        const result = this.#unwindContinuation(continuation, initialized, callerDepth);
                        if (result !== null) return result;
                        continue;
                    }
                    sequences.push({ kind: "sequence", frame: this.#active(), body: [sequence.statement.body], nextStatement: 0, depth: sequence.depth });
                    continue;
                }
                if (sequence.kind === "for") {
                    if (sequence.phase === "prepare") {
                        const prepared = this.#prepareForIteration(sequence.statement, sequence.outer);
                        if (prepared.type === "throw") {
                            this.#capture(prepared);
                            const uncaught = this.#unwindContinuation(continuation, prepared, callerDepth);
                            if (uncaught !== null) return uncaught;
                            continue;
                        }
                        const update = sequence.first ? null : sequence.statement.update;
                        sequence.first = false;
                        sequence.frame = this.#active();
                        sequence.phase = "test";
                        if (update !== null && isSuspendingGeneratorExpression(update)) {
                            mode = "next";
                            value = UNDEFINED;
                            const result = this.#startSuspendingExpression(continuation, update, { kind: "for-update" }, callerDepth);
                            if (result !== null) return result;
                            continue;
                        }
                        if (update !== null) {
                            const updated = this.#value(update);
                            if (updated.type === "throw") {
                                this.#capture(updated);
                                const uncaught = this.#unwindContinuation(continuation, updated, callerDepth);
                                if (uncaught !== null) return uncaught;
                                continue;
                            }
                        }
                    }
                    sequence.phase = "prepare";
                    const expression = sequence.statement.test;
                    if (expression !== null && isSuspendingGeneratorExpression(expression)) {
                        mode = "next";
                        value = UNDEFINED;
                        const result = this.#startSuspendingExpression(continuation, expression, { kind: "loop-test" }, callerDepth);
                        if (result !== null) return result;
                        continue;
                    }
                    const test = expression === null ? normal({ kind: "boolean", value: true }) : this.#value(expression);
                    if (test.type === "throw") {
                        this.#capture(test);
                        const uncaught = this.#unwindContinuation(continuation, test, callerDepth);
                        if (uncaught !== null) return uncaught;
                        continue;
                    }
                    if (!truthy(test.value)) { sequences.pop(); continue; }
                    sequences.push({ kind: "sequence", frame: sequence.frame, body: [sequence.statement.body], nextStatement: 0, depth: sequence.depth });
                    continue;
                }
                if (sequence.kind === "for-source") {
                    mode = "next";
                    value = UNDEFINED;
                    const result = this.#startSuspendingExpression(continuation, sequence.statement.iterable, { kind: "for-source" }, callerDepth);
                    if (result !== null) return result;
                    continue;
                }
                if (sequence.kind === "loop") {
                    if (sequence.testFirst || !sequence.first) {
                        if (isSuspendingGeneratorExpression(sequence.test)) {
                            mode = "next";
                            value = UNDEFINED;
                            const result = this.#startSuspendingExpression(continuation, sequence.test, { kind: "loop-test" }, callerDepth);
                            if (result !== null) return result;
                            continue;
                        }
                        const test = this.#value(sequence.test);
                        if (test.type === "throw") {
                            this.#capture(test);
                            const uncaught = this.#unwindContinuation(continuation, test, callerDepth);
                            if (uncaught !== null) return uncaught;
                            continue;
                        }
                        if (!truthy(test.value)) { sequences.pop(); continue; }
                    }
                    sequence.first = false;
                    sequences.push({ kind: "sequence", frame: sequence.frame, body: [sequence.body], nextStatement: 0, depth: sequence.depth });
                    continue;
                }
                if (sequence.nextStatement === sequence.body.length) { sequences.pop(); continue; }
                const statement = sequence.body[sequence.nextStatement++];
                const result = this.#statement(statement, sequence.labels ?? null, sequences);
                if (result.type === "throw") {
                    this.#capture(result);
                    const uncaught = this.#unwindContinuation(continuation, result, callerDepth);
                    if (uncaught !== null) return uncaught;
                    continue;
                }
                if (result.type === "return") {
                    if (continuation.asyncGenerator && statement.kind === "return" && statement.value !== null)
                        return this.#awaitAsyncGeneratorReturn(continuation, result.value, statement.loc, callerDepth);
                    const terminal = this.#unwindContinuation(continuation, result, callerDepth);
                    if (terminal !== null) return terminal;
                    continue;
                }
                if (result.type === "generator-expression") {
                    mode = "next";
                    value = UNDEFINED;
                    const received = this.#startSuspendingExpression(continuation, result.expression, result.receiver, callerDepth, result.name ?? null);
                    if (received !== null) return received;
                    continue;
                }
                if (result.type === "delegate") {
                    continuation.receiver = result.receiver;
                    this.depth++;
                    const acquired = this.#beginDelegate(continuation, result.value, result.loc, sequence.depth + 1);
                    this.depth--;
                    if (acquired !== null) {
                        this.#capture(acquired);
                        const failed = this.#unwindContinuation(continuation, acquired, callerDepth);
                        if (failed !== null) return failed;
                        continue;
                    }
                    continuation.yieldLoc = result.loc;
                    mode = "next";
                    value = UNDEFINED;
                    continue;
                }
                if (result.type === "yield") {
                    continuation.receiver = result.receiver;
                    sequence.frame = this.#active();
                    continuation.yieldLoc = result.loc;
                    const output = iteratorResult(result.value, false, this.context, result.loc);
                    if (output.type === "throw") { this.#capture(output); return output; }
                    return { type: "yield", result: output.value };
                }
                if (result.type === "break" || result.type === "continue") {
                    const terminal = this.#unwindContinuation(continuation, { type: result.type, target: result.target }, callerDepth);
                    if (terminal !== null) return terminal;
                    continue;
                }
                if (result.type !== "normal") throw new Error("invalid generator body completion");
            }
            return normal();
        } finally {
            this.depth = callerDepth;
            this.#frame = caller;
            this.activeContext.realm = callerRealm;
            this.#inspectionSource = inspection;
        }
    }
    #boundArguments(fn: BoundCallable, args: Value[], loc: Location): { type: "normal"; args: Value[] } | ThrowCompletion {
        const combined: Value[] = [];
        for (const source of [fn.args, args]) {
            for (const value of source) {
                const tick = this.tick(loc);
                if (tick.type === "throw") { this.#capture(tick); return tick; }
                combined.push(value);
            }
        }
        return { type: "normal", args: combined };
    }

}

// The public legacy surface cannot select Script mode, even via constructor recovery.
export class Evaluator extends ExecutionEngine {
    constructor(realm: Realm, maxSteps = 100000, maxCalls = 64) {
        if (realm.profile !== "legacy") throw new Error("legacy Realm required");
        super(realm, maxSteps, maxCalls, null);
    }
}
