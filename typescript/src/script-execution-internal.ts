import { getPrototypeFromConstructor } from "./constructor-prototype.js";
import type { ClassExpr } from "./syntax.js";
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
import type { Expr, ChainExpr, Argument, Stmt, FunctionSource, FormalParameter, Location, TryCatchStmt, ForEachStmt, ForStmt, ForLexicalStmt } from "./syntax.js";
import { GuestObject, UNDEFINED, normal, type Value, type PropertyKey, type ValueCompletion, type ThrowCompletion, type OperationContext, type Builtin, type Completion, type Reference, type ReferenceResult, Environment, equal, languageFailure, failure, resourceFailure, unsupportedFailure, getValue, putValue, truthy } from "./runtime.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment, type ScriptEnvironment, resolveScriptBinding, getScriptBinding, putScriptBinding, deleteScriptBinding, type ScriptBindingReference } from "./script-environment.js";
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
function hasParameterInitializers(parameters: readonly FormalParameter[] | undefined): boolean {
    if (parameters === undefined) return false;
    for (const parameter of parameters) if (parameter.initializer !== null) return true;
    return false;
}
type FunctionExecution = {
    callee: GuestObject;
    enter: (environment: ScriptEnvironment) => void;
    evaluate: (initializer: Expr, name: string) => ValueCompletion;
};
type CallableState = { classConstructor: { scope: number; bodyScope: number | null; derived: boolean } | null; strict: boolean; lexicalThis: boolean; key: ActivationKey; record: ExecutableScript; realm: Realm; scopeId: number;
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
    #bodyEnvironment: ScriptEnvironment | null = null;
    #variableEnvironment: ScriptEnvironment | null = null;
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scopeId: number, outer: ScriptEnvironment, callable: ScriptGuestCallable, receiver: Value, newTarget: Value) {
        super(outer, receiver, callable, newTarget);
        this.#ownerKey = key;
        this.#scopeId = scopeId;
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
    static prepare(unit: ScriptSourceUnit, realm: Realm, bounded: boolean, inheritedStrict = false, newTargetAllowed = false): ScriptPreparation {
        if (realm.profile !== "script") return { kind: "profile-rejected", reason: "realm" };
        const nodes: DeclarationNodes = { source: { text: "" }, body: [], scopes: new Map(), declarations: new Map(), assignmentNameEligible: new Map(), argumentsScopes: new Set() };
        const plan = bounded ? parseBoundedScriptPreparation(unit, nodes, inheritedStrict, newTargetAllowed) : parseDeclarationPlan(unit, nodes);
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
    static readFunction(record: ExecutableScript, callable: ScriptGuestCallable, key: ExecutionKey): { scopeId: number; body: Stmt[]; hasInitializers: boolean; needsArguments: boolean } {
        ExecutableScript.state(record, key);
        const metadata = ScriptGuestCallable.check(callable, record.#activationKey, record);
        const entry = record.#function(metadata.scopeId);
        return { scopeId: metadata.scopeId, body: entry.node.body,
            hasInitializers: hasParameterInitializers(entry.node.parameters), needsArguments: record.#needsArguments(metadata.scopeId) };
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
        if (!hasParameterInitializers(entry.node.parameters)) {
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
        const callable = ScriptGuestCallable.create({ key: record.#activationKey, record, realm: state.realm,
            scopeId: bodyScope ?? scopeId, environment, strict: true, lexicalThis: false,
            classConstructor: { scope: scopeId, bodyScope, derived: node.heritage !== null }, unit: state.plan.unit,
            start: entry === null ? node.start : entry.source.start, end: entry === null ? node.end : entry.source.end,
            text: node.source.text.slice(node.start, node.end), formals: entry === null ? [] : entry.node.params.slice() });
        const object = new GuestObject(constructorParent, false, callable, callable);
        const value: Value = { kind: "object", object };
        let length = entry === null ? 0 : entry.node.params.length - (entry.source.rest === true ? 1 : 0);
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
    materializeFunction(scopeId: number, environment: ScriptEnvironment, inferredName: string | null, context: OperationContext, prototype: GuestObject | null = null): ValueCompletion {
        this.#validateEnvironment(environment, context);
        const state = this.#readState();
        const entry = this.#function(scopeId);
        if ((entry.fn.declaration !== null && inferredName !== null) || (inferredName !== null && typeof inferredName !== "string"))
            throw new Error("invalid Script inferred name");
        const name = entry.fn.declaration === null ? (inferredName === null ? "" : inferredName)
            : state.plan.declarations[entry.fn.declaration].site.name;
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") return budget;
        const callable = ScriptGuestCallable.create({ classConstructor: null, key: this.#activationKey, record: this, realm: state.realm,
            scopeId, environment, strict: entry.scope.strict, lexicalThis: entry.source.arrow === true,
            unit: state.plan.unit, start: entry.source.start, end: entry.source.end,
            text: entry.source.source.text.slice(entry.source.start, entry.source.end), formals: entry.node.params.slice() });
        const constructable = entry.source.method !== true && entry.source.arrow !== true;
        const object = new GuestObject(prototype === null ? state.realm.functionPrototype : prototype, false, callable, constructable ? callable : null);
        const value: Value = { kind: "object", object };
        let length = entry.node.params.length - (entry.source.rest === true ? 1 : 0);
        if (entry.node.parameters !== undefined) {
            for (let i = 0; i < entry.node.parameters.length; i++) {
                if (entry.node.parameters[i].initializer !== null) { length = i; break; }
            }
        }
        object.bootstrapDefine("length", { value: { kind: "number", value: length }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
        if (constructable) {
            const prototypeObject = new GuestObject(state.realm.objectPrototype);
            prototypeObject.bootstrapDefine("constructor", { value, writable: true, enumerable: false, configurable: true });
            object.bootstrapDefine("prototype", { value: { kind: "object", object: prototypeObject }, writable: true, enumerable: false, configurable: false });
        }
        this.#completedMaterializations++;
        return normal(value);
    }
    createFunctionEnvironment(callable: ScriptGuestCallable, receiver: Value, context: OperationContext, newTarget: Value = UNDEFINED): ScriptFunctionEnvironmentCompletion {
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
        return { type: "normal", environment: new FunctionActivation(this.#activationKey, metadata.scopeId, metadata.environment, callable, boundThis, newTarget) };
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
        const hasInitializers = hasParameterInitializers(parameters);
        if (hasInitializers && execution === null) throw new Error("default parameter initialization requires Script execution");
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
        if (hasInitializers && !metadata.strict) {
            const tick = this.#setupTick(context, entry.node.loc);
            if (tick.type === "throw") return tick;
            parameterEnvironment = new ScriptDeclarativeEnvironment(environment);
        }
        if (hasInitializers && execution !== null) execution.enter(parameterEnvironment);
        const parameterNames = new Set(entry.scope.formals.map(formal => formal.name));
        const hasDuplicates = parameterNames.size !== entry.scope.formals.length;
        if (hasDuplicates && (metadata.strict || hasInitializers || entry.source.rest === true))
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
            const mapped = !metadata.strict && !hasInitializers && entry.source.rest !== true;
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
        for (let i = 0; i < entry.scope.formals.length; i++) {
            const formal = entry.scope.formals[i];
            const tick = this.#setupTick(context, formal.loc);
            if (tick.type === "throw") return tick;
            let value = i < argumentsList.length ? argumentsList[i] : UNDEFINED;
            const initializer = parameters === undefined ? null : parameters[i].initializer;
            if (value.kind === "undefined" && initializer !== null) {
                if (execution === null) throw new Error("missing parameter execution");
                const evaluated = execution.evaluate(initializer, formal.name);
                if (evaluated.type === "throw") return evaluated;
                value = evaluated.value;
            }
            if (entry.source.rest === true && i === entry.scope.formals.length - 1) {
                const array = state.realm.createArray();
                for (let j = i; j < argumentsList.length; j++) {
                    const copyTick = this.#setupTick(context, formal.loc);
                    if (copyTick.type === "throw") return copyTick;
                    const defined = array.defineOwnProperty(String(j - i), {
                        value: argumentsList[j], writable: true, enumerable: true, configurable: true,
                    }, context, formal.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh rest array element invariant");
                }
                value = { kind: "object", object: array };
            }
            const initialized = hasDuplicates
                ? parameterEnvironment.setMutableBinding(formal.name, value, context, formal.loc, false)
                : parameterEnvironment.initializeBinding(formal.name, value, context, formal.loc);
            if (initialized.type === "throw") return initialized;
        }
        let variableEnvironment: ScriptFunctionEnvironment | ScriptDeclarativeEnvironment = parameterEnvironment;
        if (hasInitializers) {
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
            if (hasInitializers && !selected.has(site.name)) {
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
function dynamicFunctionRecord(source: string, parametersOnly: boolean, context: OperationContext, loc: Location):
    { type: "normal"; record: ExecutableScript; scope: number } | ThrowCompletion {
    for (let i = 0; i < source.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
    }
    const prepared = prepareBoundedScript({ id: "<Function>", text: source }, context.realm);
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
export function createDynamicFunction(parameters: string[], body: string, context: OperationContext, loc: Location, newTarget: GuestObject): ValueCompletion {
    const prefix = "function anonymous(", middle = "\n) {\n", suffix = "\n}";
    let length = prefix.length + middle.length + body.length + suffix.length + Math.max(parameters.length - 1, 0);
    for (const parameter of parameters) length += parameter.length;
    if (length > 100000) return resourceFailure("source-units", length, 100000, "dynamic function source exceeds 100000 UTF-16 units", loc);
    const params = parameters.join(",");
    const parameterRecord = dynamicFunctionRecord(prefix + params + middle + suffix, true, context, loc);
    if (parameterRecord.type === "throw") return parameterRecord;
    const bodyRecord = dynamicFunctionRecord(prefix + middle + body + suffix, false, context, loc);
    if (bodyRecord.type === "throw") return bodyRecord;
    const complete = dynamicFunctionRecord(prefix + params + middle + body + suffix, false, context, loc);
    if (complete.type === "throw") return complete;
    const prototype = getPrototypeFromConstructor(newTarget, "Function", context, loc);
    if (prototype.type === "throw") return prototype;
    // Materialize the declaration without instantiating an anonymous global binding.
    return complete.record.materializeFunction(complete.scope, { kind: "global", record: context.realm.globalEnvironment }, null, context, prototype.value);
}
function copyStrictness(strictness: StrictnessMetadata): StrictnessMetadata {
    return { ownStrict: strictness.ownStrict, inheritedStrict: strictness.inheritedStrict, strict: strictness.strict,
        directives: strictness.directives.map(d => ({ start: d.start, end: d.end, statementEnd: d.statementEnd,
            loc: { line: d.loc.line, column: d.loc.column }, raw: d.raw, useStrict: d.useStrict })) };
}

import { stringConcat, stringCompare } from "./strings.js";
import { GuestArray } from "./array-object.js";
import { isLooselyEqual } from "./abstract-equality.js";
import { toObject } from "./object-conversion.js";
import { deleteReference } from "./delete-reference.js";
import { typeOfValue } from "./typeof.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, toString, toPropertyKey } from "./conversion.js";

import { updateScriptEmpty, scriptExpressionCompletion, type ScriptStatementCompletion, type ScriptStatementPayload } from "./script-completion.js";
class ExecutionKey {}
const executionKey = new ExecutionKey();
// Keep the shared mutable Reference shape unchanged. Script mode belongs to
// this private wrapper; all operations reuse its one original key cache.
type EngineReference = Reference | { kind: "script"; binding: ScriptBindingReference }
    | { kind: "script-property"; reference: Reference; strict: boolean };
type EngineReferenceResult = { type: "reference"; reference: EngineReference } | { type: "abrupt"; completion: Completion };
type EngineExpressionResult = EngineReferenceResult | { type: "value"; value: Value };
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
    construct?: (callee: Value, args: Value[], newTarget: Value, loc: Location) => ValueCompletion;
};

class ExecutionEngine {
    #frame: ScriptFrameSnapshot | null = null;
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
            construct: (callee, args, newTarget, loc) => this.#construct(callee, args, loc, newTarget),
        };
        this.context = this.activeContext;
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
                return this.#get(ref.reference, expr.loc);
            }
            const result = env === null ? this.#expression(expr, null, receiver, name) : this.expression(expr, env, receiver);
            if (result.type === "throw") this.#capture(result);
            return result;
        } finally {
            this.depth--;
        }
    }
    #arguments(argumentsList: Argument[], env: Environment | null, receiver: Value): { type: "normal"; values: Value[] } | ThrowCompletion {
        const values: Value[] = [];
        for (const arg of argumentsList) {
            if (arg.kind === "spread") {
                if (env !== null) throw new Error("Script argument spread AST requires Script execution");
                const input = this.#value(arg.expression);
                if (input.type === "throw") return input;
                const acquired = getIterator(input.value, this.context, arg.loc);
                if (acquired.type === "throw") return acquired;
                while (true) {
                    const next = iteratorStepValue(acquired.value, this.context, arg.loc);
                    if (next.type === "throw") return next;
                    if (next.done) break;
                    values.push(next.value);
                }
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
            case "class": {
                if (env !== null) throw new Error("class requires Script execution");
                return this.#classExpression(expr, name);
            }
            case "literal": {
                const value = expr.value;
                if (value === null) return normal({ kind: "null" });
                if (typeof value === "number") return normal({ kind: "number", value });
                if (typeof value === "boolean") return normal({ kind: "boolean", value });
                return normal({ kind: "string", value });
            }
            case "this": return normal(receiver);
            case "new-target": {
                if (env !== null) throw new Error("Script new.target AST requires Script execution");
                const environment = this.#newTargetEnvironment(this.#active().lexical);
                if (environment === null) throw new Error("missing new.target function environment");
                return normal(environment.newTarget);
            }
            case "template": {
                let text = expr.strings[0];
                for (let i = 0; i < expr.expressions.length; i++) {
                    const value = this.#eval(expr.expressions[i], env, receiver);
                    if (value.type !== "normal") return value;
                    const primitive = toPrimitive(value.value, "string", this.context, expr.expressions[i].loc);
                    if (primitive.type === "throw") return primitive;
                    const converted = toString(primitive.value, expr.expressions[i].loc, this.context.realm);
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
            case "identifier": case "member": {
                const ref = this.#reference(expr, env, receiver);
                return ref.type === "abrupt" ? ref.completion : this.#get(ref.reference, expr.loc);
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
                return this.#put(ref.reference, value.value, expr.loc);
            }
            case "update": {
                if (env !== null) throw new Error("Script update AST requires Script execution");
                const ref = this.#reference(expr.target, null, receiver);
                if (ref.type === "abrupt") return ref.completion;
                const oldValue = this.#get(ref.reference, expr.loc);
                if (oldValue.type === "throw") return oldValue;
                const primitive = toPrimitive(oldValue.value, "number", this.context, expr.loc);
                if (primitive.type === "throw") return primitive;
                const numeric = toNumber(primitive.value, expr.loc, this.context.realm);
                if (numeric.type === "throw") return numeric;
                // The Reference caches the converted key, never a descriptor or setter.
                const newValue = expr.op === "++" ? numeric.value + 1 : numeric.value - 1;
                const written = this.#put(ref.reference, { kind: "number", value: newValue }, expr.loc);
                if (written.type === "throw") return written;
                return normal({ kind: "number", value: expr.prefix ? newValue : numeric.value });
            }
            case "compound": {
                const ref = this.#reference(expr.target, env, receiver);
                if (ref.type === "abrupt") return ref.completion;
                const oldValue = this.#get(ref.reference, expr.loc);
                if (oldValue.type !== "normal") return oldValue;
                const right = this.#eval(expr.value, env, receiver);
                if (right.type !== "normal") return right;
                const result = this.binary(expr.op, oldValue.value, right.value, expr.loc);
                if (result.type !== "normal") return result;
                return this.#put(ref.reference, result.value, expr.loc);
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
                    if (element.kind === "spread") {
                        if (env !== null) throw new Error("Script array spread AST requires Script execution");
                        const input = this.#value(element.expression);
                        if (input.type === "throw") { const abrupt: ThrowCompletion = input; return abrupt; }
                        const acquired = getIterator(input.value, this.context, element.loc);
                        if (acquired.type === "throw") return acquired;
                        while (true) {
                            const next = iteratorStepValue(acquired.value, this.context, element.loc);
                            if (next.type === "throw") return next;
                            if (next.done) break;
                            const defined = object.defineOwnProperty(String(index++), {
                                value: next.value, writable: true, enumerable: true, configurable: true,
                            }, this.context, element.loc);
                            if (defined.type === "throw") return defined;
                            if (!defined.value) throw new Error("fresh array spread element invariant");
                        }
                        continue;
                    }
                    const value = this.#eval(element, env, receiver);
                    if (value.type !== "normal") return value;
                    const defined = object.defineOwnProperty(String(index++), {
                        value: value.value, writable: true, enumerable: true, configurable: true,
                    }, this.context, expr.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh array literal element invariant");
                }
                // Index definitions grow length, but trailing holes do not define keys.
                const length = object.defineOwnProperty("length", {
                    value: { kind: "number", value: index },
                }, this.context, expr.loc);
                if (length.type === "throw") return length;
                if (!length.value) throw new Error("fresh array literal length invariant");
                return normal({ kind: "object", object });
            }
            case "object": {
                const object = this.context.realm.createObject();
                for (const property of expr.properties) {
                    const name = property.kind === "data" ? property.key : property.kind + " " + property.key;
                    const value = this.#eval(property.value, env, receiver, false, name);
                    if (value.type !== "normal") return value;
                    const descriptor = property.kind === "get" ? { get: value.value, enumerable: true, configurable: true }
                        : property.kind === "set" ? { set: value.value, enumerable: true, configurable: true }
                        : { value: value.value, writable: true, enumerable: true, configurable: true };
                    const defined = object.defineOwnProperty(property.key, descriptor, this.context, expr.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh object property definition failed");
                }
                return normal({ kind: "object", object });
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
                if (this.#script && expr.callee.kind === "identifier" && expr.callee.name === "eval" &&
                    callee.value.kind === "object" && callee.value.object === this.#active().realm.evalIntrinsic)
                    return this.#callScript(callee.value, UNDEFINED, args.values, expr.loc, true);
                return this.call(callee.value, this.#callReceiver(result), args.values, expr.loc);
            }
            case "unary": {
                if (expr.op === "delete") {
                    if (expr.operand.kind === "identifier" && (env !== null || this.#active().strict)) throw new Error("delete requires a property reference");
                    if (expr.operand.kind === "chain") {
                        if (env !== null) throw new Error("Script optional chain requires Script execution");
                        const result = this.#chain(expr.operand, receiver);
                        if (result.type === "abrupt") return result.completion;
                        return result.type === "reference" ? this.#delete(result.reference, expr.loc) : normal({ kind: "boolean", value: true });
                    }
                    if (expr.operand.kind === "member" || expr.operand.kind === "identifier") {
                        // Capture once, without reading the final property.
                        const ref = this.#reference(expr.operand, env, receiver);
                        return ref.type === "abrupt" ? ref.completion : this.#delete(ref.reference, expr.loc);
                    }
                    const value = this.#eval(expr.operand, env, receiver);
                    return value.type === "normal" ? normal({ kind: "boolean", value: true }) : value;
                }
                const result = this.#eval(expr.operand, env, receiver, expr.op === "typeof");
                if (result.type !== "normal") return result;
                if (expr.op === "typeof") {
                    return normal({ kind: "string", value: typeOfValue(result.value) });
                }
                if (expr.op === "void") {
                    return normal();
                }
                if (expr.op === "!") return normal({ kind: "boolean", value: !truthy(result.value) });
                const primitive = toPrimitive(result.value, "number", this.context, expr.loc);
                if (primitive.type === "throw") return primitive;
                const number = toNumber(primitive.value, expr.loc, this.context.realm);
                if (number.type === "throw") return number;
                return normal({ kind: "number", value: expr.op === "~" ? ~number.value : expr.op === "-" ? -number.value : number.value });
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
                if (expr.op === "&&" && !truthy(left.value)) return left;
                if (expr.op === "||" && truthy(left.value)) return left;
                const right = this.#eval(expr.right, env, receiver);
                if (right.type !== "normal") return right;
                if (expr.op === "&&" || expr.op === "||" || expr.op === ",") return right;
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
        if (fn.kind === "script-guest" || fn.kind === "bound" || fn.kind === "eval") throw new Error("Script execution unavailable");
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
    binary(op: string, left: Value, right: Value, loc: Location): Completion {
        if (op === "in") {
            // Both operands are captured; reject a primitive RHS before key hooks.
            if (right.kind !== "object") {
                return languageFailure(this.context.realm, "TypeError", "right operand of in must be an object", loc);
            }
            const key = toPropertyKey(left, this.context, loc);
            if (key.type === "throw") {
                return key;
            }
            const present = right.object.internalHasProperty(key.value, loc);
            if (present.type === "throw") {
                return present;
            }
            return normal({ kind: "boolean", value: present.value });
        }
        if (op === "+") {
            // Convert both captured Values before selecting concatenation.
            const leftPrimitive = toPrimitive(left, "default", this.context, loc);
            if (leftPrimitive.type === "throw") return leftPrimitive;
            const rightPrimitive = toPrimitive(right, "default", this.context, loc);
            if (rightPrimitive.type === "throw") return rightPrimitive;
            left = leftPrimitive.value;
            right = rightPrimitive.value;
            if (left.kind === "string" || right.kind === "string") {
                const a = toString(left, loc, this.context.realm);
                if (a.type === "throw") return a;
                const b = toString(right, loc, this.context.realm);
                if (b.type === "throw") return b;
                return normal({ kind: "string", value: stringConcat(a.value, b.value) });
            }
            const a = toNumber(left, loc, this.context.realm);
            if (a.type === "throw") return a;
            const b = toNumber(right, loc, this.context.realm);
            if (b.type === "throw") return b;
            return normal({ kind: "number", value: a.value + b.value });
        }
        if (op === "-" || op === "*" || op === "/" || op === "%" || op === "**" ||
            op === "&" || op === "|" || op === "^" || op === "<<" || op === ">>" || op === ">>>") {
            // Both operand evaluations/GetValue have finished. Conversion is
            // left-to-right, so an abrupt RHS evaluation precedes either conversion.
            const leftPrimitive = toPrimitive(left, "number", this.context, loc);
            if (leftPrimitive.type === "throw") return leftPrimitive;
            const a = toNumber(leftPrimitive.value, loc, this.context.realm);
            if (a.type === "throw") return a;
            const rightPrimitive = toPrimitive(right, "number", this.context, loc);
            if (rightPrimitive.type === "throw") return rightPrimitive;
            const b = toNumber(rightPrimitive.value, loc, this.context.realm);
            if (b.type === "throw") return b;
            switch (op) {
                case "-": return normal({ kind: "number", value: a.value - b.value });
                case "*": return normal({ kind: "number", value: a.value * b.value });
                case "/": return normal({ kind: "number", value: a.value / b.value });
                case "%": return normal({ kind: "number", value: a.value % b.value });
                case "**": return normal({ kind: "number", value: Math.pow(a.value, b.value) });
                case "&": return normal({ kind: "number", value: a.value & b.value });
                case "|": return normal({ kind: "number", value: a.value | b.value });
                case "^": return normal({ kind: "number", value: a.value ^ b.value });
                case "<<": return normal({ kind: "number", value: a.value << b.value });
                case ">>": return normal({ kind: "number", value: a.value >> b.value });
                case ">>>": return normal({ kind: "number", value: a.value >>> b.value });
            }
        }
        if (op === "==" || op === "!=") {
            // Values were captured in source order; fixed 2025 13.11.1 reverses
            // helper arguments, without reevaluating either operand.
            const result = isLooselyEqual(right, left, this.context, loc);
            if (result.type === "throw") return result;
            return normal({ kind: "boolean", value: op === "!=" ? !result.value : result.value });
        }
        if (op === "===" || op === "!==") return normal({ kind: "boolean", value: op === "===" ? equal(left, right) : !equal(left, right) });
        if (op === "<" || op === ">" || op === "<=" || op === ">=") {
            const leftPrimitive = toPrimitive(left, "number", this.context, loc);
            if (leftPrimitive.type === "throw") return leftPrimitive;
            const rightPrimitive = toPrimitive(right, "number", this.context, loc);
            if (rightPrimitive.type === "throw") return rightPrimitive;
            left = leftPrimitive.value;
            right = rightPrimitive.value;
            // Keep source order even for > and <=. Once both values are primitive,
            // numeric conversion has no guest effects; reverse only the relation.
            let order: number | null;
            if (left.kind === "string" && right.kind === "string") {
                order = stringCompare(left.value, right.value);
            } else {
                const a = toNumber(left, loc, this.context.realm);
                if (a.type === "throw") return a;
                const b = toNumber(right, loc, this.context.realm);
                if (b.type === "throw") return b;
                if (Number.isNaN(a.value) || Number.isNaN(b.value)) order = null;
                else if (a.value < b.value) order = -1;
                else if (a.value > b.value) order = 1;
                else order = 0;
            }
            // Unordered is distinct from equal: every NaN comparison is false.
            if (order === null) return normal({ kind: "boolean", value: false });
            switch (op) {
                case "<": return normal({ kind: "boolean", value: order < 0 });
                case ">": return normal({ kind: "boolean", value: order > 0 });
                case "<=": return normal({ kind: "boolean", value: order <= 0 });
                case ">=": return normal({ kind: "boolean", value: order >= 0 });
            }
        }
        throw new Error("unknown binary operator: " + op);
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
        return { steps: this.steps, calls: this.calls, depth: this.depth,
            active: f === null ? null : { realm: f.realm, record: f.record, scopeId: f.scopeId,
                lexical: f.lexical, variable: f.variable, strict: f.strict, thisValue: f.thisValue,
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
        } finally {
            this.#frame = null;
            this.#legacyGlobalFunctions.clear();
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
            this.depth = savedDepth;
        }
    }
    #expressionReference(expr: Expr, env: Environment | null, receiver: Value): EngineExpressionResult {
        if (expr.kind === "identifier" || expr.kind === "member") return this.#reference(expr, env, receiver);
        if (expr.kind === "chain") {
            if (env !== null) throw new Error("Script optional chain requires Script execution");
            return this.#chain(expr, receiver);
        }
        const result = this.#eval(expr, env, receiver);
        return result.type === "normal" ? { type: "value", value: result.value } : { type: "abrupt", completion: result };
    }
    #expressionValue(result: EngineExpressionResult, loc: Location): Completion {
        if (result.type === "abrupt") return result.completion;
        return result.type === "value" ? normal(result.value) : this.#get(result.reference, loc);
    }
    #callReceiver(result: EngineExpressionResult): Value {
        if (result.type !== "reference") return UNDEFINED;
        const ref = result.reference;
        if (ref.kind === "property") return ref.base;
        if (ref.kind === "script-property" && ref.reference.kind === "property") return ref.reference.base;
        return UNDEFINED;
    }
    #chain(expr: ChainExpr, receiver: Value): EngineExpressionResult {
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
                const called = this.call(base.value, this.#callReceiver(result), args.values, link.loc);
                if (called.type !== "normal") return { type: "abrupt", completion: called };
                result = { type: "value", value: called.value };
            }
        }
        return result;
    }
    #reference(expr: Expr, env: Environment | null, receiver: Value): EngineReferenceResult {
        if (env !== null) return this.reference(expr, env, receiver);
        if (expr.kind === "identifier") {
            const result = resolveScriptBinding(this.#active().lexical, expr.name, expr.loc, this.#active().strict);
            if (result.type === "throw") return { type: "abrupt", completion: result };
            return { type: "reference", reference: { kind: "script", binding: result.reference } };
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
    #get(ref: EngineReference, loc: Location): Completion {
        if (ref.kind === "script") return getScriptBinding(ref.binding, this.context);
        return getValue(ref.kind === "script-property" ? ref.reference : ref, this.context, loc);
    }
    #put(ref: EngineReference, value: Value, loc: Location): Completion {
        if (ref.kind === "script-property") return putValue(ref.reference, value, this.context, loc, ref.strict);
        if (ref.kind !== "script") return putValue(ref, value, this.context, loc);
        const result = putScriptBinding(ref.binding, value, this.context);
        return result.type === "throw" ? result : normal(value);
    }
    #delete(ref: EngineReference, loc: Location): Completion {
        if (ref.kind === "script") return deleteScriptBinding(ref.binding, this.context);
        if (ref.kind === "script-property") return deleteReference(ref.reference, this.context, loc, ref.strict);
        return deleteReference(ref, this.context, loc);
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
    #patternReference(pattern: DestructuringPattern, environment: ScriptEnvironment | null): EngineReferenceResult | null {
        if (pattern.kind === "target") return this.#reference(pattern.target, null, this.#active().thisValue);
        if (pattern.kind === "binding" && environment === null) {
            const target = resolveScriptBinding(this.#active().lexical, pattern.site.name, pattern.loc, this.#active().strict);
            if (target.type === "throw") return { type: "abrupt", completion: target };
            return { type: "reference", reference: { kind: "script", binding: target.reference } };
        }
        return null;
    }
    #initializePattern(pattern: DestructuringPattern, initializer: Expr | null, value: Value, environment: ScriptEnvironment | null, reference: EngineReference | null): ValueCompletion {
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
        const assigned = this.#put(reference, value, pattern.loc);
        if (assigned.type === "throw") return assigned;
        if (assigned.type !== "normal") throw new Error("invalid pattern assignment completion");
        return normal();
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
            let prototypeParent: GuestObject | null = saved.realm.objectPrototype;
            let constructorParent = saved.realm.functionPrototype;
            if (expr.heritage !== null) {
                const superclass = this.#value(expr.heritage);
                if (superclass.type === "throw") return superclass;
                if (superclass.value.kind === "null") prototypeParent = null;
                else {
                    if (superclass.value.kind !== "object" || superclass.value.object.constructorSlot === null)
                        return languageFailure(saved.realm, "TypeError", "class heritage is not a constructor", expr.heritage.loc);
                    const parent = superclass.value.object.internalGet("prototype", superclass.value, this.context, expr.heritage.loc);
                    if (parent.type === "throw") return parent;
                    if (parent.value.kind !== "object" && parent.value.kind !== "null")
                        return languageFailure(saved.realm, "TypeError", "superclass prototype is not an object or null", expr.heritage.loc);
                    prototypeParent = parent.value.kind === "object" ? parent.value.object : null;
                    constructorParent = superclass.value.object;
                }
            }
            const prototype = new GuestObject(prototypeParent);
            const constructor = ExecutableScript.materializeClassConstructor(saved.record, scopeId, environment,
                expr.name === null ? (inferredName ?? "") : expr.name.name, prototype, constructorParent, this.context, executionKey);
            if (constructor.type === "throw") return constructor;
            if (constructor.value.kind !== "object") throw new Error("class constructor result invariant");
            for (const element of expr.elements) {
                if (element.value === expr.constructorMethod) continue;
                const keyValue = this.#value(element.key);
                if (keyValue.type === "throw") return keyValue;
                const key = toPropertyKey(keyValue.value, this.context, element.key.loc);
                if (key.type === "throw") return key;
                const propertyName = typeof key.value === "string" ? key.value : key.value.description === undefined ? "" : "[" + key.value.description + "]";
                const name = element.kind === "method" ? propertyName : element.kind + " " + propertyName;
                const method = this.#value(element.value, name);
                if (method.type === "throw") return method;
                const object = element.isStatic ? constructor.value.object : prototype;
                const descriptor = element.kind === "get" ? { get: method.value, enumerable: false, configurable: true }
                    : element.kind === "set" ? { set: method.value, enumerable: false, configurable: true }
                    : { value: method.value, writable: true, enumerable: false, configurable: true };
                const defined = object.defineOwnProperty(key.value, descriptor, this.context, element.value.loc);
                if (defined.type === "throw") return defined;
                if (!defined.value) return languageFailure(saved.realm, "TypeError", "cannot define class method", element.value.loc);
            }
            if (expr.name !== null) {
                const initialized = environment.initializeBinding(expr.name.name, constructor.value, this.context, expr.name.loc);
                if (initialized.type === "throw") return initialized;
            }
            return constructor;
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
            const receiver: Value = { kind: "object", object: boxed.value };
            for (const key of boxed.value.ownPropertyKeys()) {
                const tick = this.context.tick(pattern.rest.loc);
                if (tick.type === "throw") return tick;
                if (excluded.has(key)) continue;
                const descriptor = boxed.value.getOwnProperty(key);
                if (descriptor === undefined || !descriptor.enumerable) continue;
                const value = boxed.value.internalGet(key, receiver, this.context, pattern.rest.loc);
                if (value.type === "throw") return value;
                const defined = rest.defineOwnProperty(key, { value: value.value, writable: true, enumerable: true, configurable: true }, this.context, pattern.rest.loc);
                if (defined.type === "throw") return defined;
                if (!defined.value) throw new Error("fresh rest object invariant");
            }
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
    #statement(stmt: Stmt, labels: readonly string[] | null = null): ScriptStatementCompletion {
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
            const result = this.#scriptStatement(stmt, labels);
            if (result.type === "throw") this.#capture(result);
            return result;
        } finally { this.depth = savedDepth; }
    }
    #forBody(stmt: ForStmt | ForLexicalStmt, outer: ScriptEnvironment | null, labels: readonly string[] | null): ScriptStatementCompletion {
        let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
        let first = true;
        while (true) {
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
            if (!first && stmt.update !== null) {
                const updated = this.#value(stmt.update);
                if (updated.type === "throw") { const abrupt: ThrowCompletion = updated; return abrupt; }
            }
            first = false;
            if (stmt.test !== null) {
                const test = this.#value(stmt.test);
                if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
                if (!truthy(test.value)) return { type: "normal", payload: value };
            }
            const result = this.#statement(stmt.body);
            if (result.type === "break" && result.target === undefined) return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
            if (result.type !== "normal" && (result.type !== "continue" || !this.#continueTarget(result.target, labels))) return updateScriptEmpty(result, value);
            if (result.payload.kind !== "empty") value = result.payload;
        }
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
    #scriptStatement(stmt: Stmt, labels: readonly string[] | null): ScriptStatementCompletion {
        switch (stmt.kind) {
            case "class-declaration": {
                if (stmt.value.name === null) throw new Error("class declaration name missing");
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
                const result = this.#statement(stmt.body, current);
                if (result.type === "break" && result.target === stmt.name) return { type: "normal", payload: result.payload };
                return result;
            }
            case "switch": {
                // The discriminant belongs to the surrounding environment; all
                // selectors and clause bodies share one initialized CaseBlock.
                const discriminant = this.#value(stmt.discriminant);
                if (discriminant.type === "throw") { const abrupt: ThrowCompletion = discriminant; return abrupt; }
                const saved = this.#active();
                const scopeId = ExecutableScript.scopeOfNode(saved.record, stmt, executionKey);
                const created = saved.record.createBlockEnvironment(scopeId, saved.lexical, this.context);
                if (created.type === "throw") return created;
                this.#frame = { ...saved, scopeId, lexical: created.environment };
                try {
                    const setup = saved.record.instantiateBlock(scopeId, created.environment, this.context);
                    if (setup.type === "throw") { this.#capture(setup); const abrupt: ThrowCompletion = setup; return abrupt; }
                    const clauses = stmt.caseBlock.clauses;
                    let selected = -1, fallback = -1;
                    for (let i = 0; i < clauses.length; i++) {
                        const test = clauses[i].test;
                        if (test === null) { fallback = i; continue; }
                        const selector = this.#value(test);
                        if (selector.type === "throw") { const abrupt: ThrowCompletion = selector; return abrupt; }
                        if (equal(discriminant.value, selector.value)) { selected = i; break; }
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
            case "try-finally": {
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
            case "expression": return scriptExpressionCompletion(this.#value(stmt.expression));
            case "pattern-declaration": {
                const input = this.#value(stmt.init);
                if (input.type === "throw") { const abrupt: ThrowCompletion = input; return abrupt; }
                const initialized = this.#initializePattern(stmt.pattern, null, input.value, stmt.declarationKind === "var" ? null : this.#active().lexical, null);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "let": case "const": {
                const result = stmt.init === null ? normal() : this.#value(stmt.init, stmt.name);
                if (result.type === "throw") { const abrupt: ThrowCompletion = result; return abrupt; }
                const env = this.#active().lexical;
                const initialized = env.kind === "global" ? env.record.initializeBinding(stmt.name, result.value, this.context, stmt.loc)
                    : env.initializeBinding(stmt.name, result.value, this.context, stmt.loc);
                if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                return { type: "normal", payload: { kind: "empty" } };
            }
            case "var": {
                for (const declaration of stmt.declarations) {
                    if (declaration.init === null) continue;
                    const ref = resolveScriptBinding(this.#active().lexical, declaration.name, stmt.loc, this.#active().strict);
                    if (ref.type === "throw") return ref;
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
                    return this.#list(stmt.body);
                } finally { this.#frame = saved; }
            }
            case "if": {
                const test = this.#value(stmt.test);
                if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
                const branch = truthy(test.value) ? stmt.consequent : stmt.alternate;
                const result: ScriptStatementCompletion = branch === null ? { type: "normal", payload: { kind: "empty" } } : this.#statement(branch);
                return updateScriptEmpty(result, { kind: "value", value: UNDEFINED });
            }
            case "for-of": case "for-in": {
                const saved = this.#active();
                const lexical = lexicalLoopBindings(stmt) !== null;
                const scopeId = lexical ? ExecutableScript.scopeOfNode(saved.record, stmt, executionKey) : saved.scopeId;
                let iterable: ValueCompletion;
                if (lexical) {
                    const created = ExecutableScript.activateLoop(saved.record, stmt, saved.lexical, null, this.context, executionKey);
                    if (created.type === "throw") return created;
                    this.#frame = { ...saved, scopeId, lexical: created.environment };
                    try { iterable = this.#value(stmt.iterable); }
                    finally { this.#frame = saved; }
                } else iterable = this.#value(stmt.iterable);
                if (iterable.type === "throw") { const abrupt: ThrowCompletion = iterable; return abrupt; }
                let iterator: IteratorRecord | null = null;
                let enumerator: ForInEnumerator | null = null;
                if (stmt.kind === "for-in") {
                    if (iterable.value.kind === "null" || iterable.value.kind === "undefined")
                        return { type: "normal", payload: { kind: "value", value: UNDEFINED } };
                    const boxed = toObject(iterable.value, this.context, stmt.loc);
                    if (boxed.type === "throw") return boxed;
                    enumerator = new ForInEnumerator(boxed.value);
                } else {
                    const acquired = getIterator(iterable.value, this.context, stmt.loc);
                    if (acquired.type === "throw") return acquired;
                    iterator = acquired.value;
                }
                const target: Expr | null = stmt.head.kind === "lexical" || stmt.head.kind === "pattern" || stmt.head.kind === "assignment-pattern" ? null : stmt.head.kind === "var"
                    ? { kind: "identifier", loc: stmt.head.loc, name: stmt.head.declarations[0].name } : stmt.head;
                let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
                while (true) {
                    if (enumerator === null && iterator === null) throw new Error("missing loop iterator");
                    const next = iterator !== null ? iteratorStepValue(iterator, this.context, stmt.loc) : enumerator!.next(this.context, stmt.loc);
                    if (next.type === "throw") return next;
                    if (next.done) return { type: "normal", payload: value };
                    let result: ScriptStatementCompletion;
                    if (lexical) {
                        const created = ExecutableScript.activateLoop(saved.record, stmt, saved.lexical, next.value, this.context, executionKey);
                        if (created.type === "throw") {
                            const abrupt: ThrowCompletion = created;
                            return iterator === null ? abrupt : iteratorCloseOnThrow(iterator, abrupt, this.context, stmt.loc);
                        }
                        this.#frame = { ...saved, scopeId, lexical: created.environment };
                        try {
                            const initialized = stmt.head.kind === "pattern" ? this.#initializePattern(stmt.head.pattern, null, next.value, created.environment, null) : normal();
                            if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; result = abrupt; }
                            else result = this.#statement(stmt.body);
                        } finally { this.#frame = saved; }
                    } else if (stmt.head.kind === "pattern" || stmt.head.kind === "assignment-pattern") {
                        const initialized = this.#initializePattern(stmt.head.pattern, null, next.value, null, null);
                        if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; result = abrupt; }
                        else result = this.#statement(stmt.body);
                    } else {
                        if (target === null) throw new Error("missing loop assignment target");
                        const reference = this.#reference(target, null, saved.thisValue);
                        const assigned = reference.type === "abrupt" ? reference.completion : this.#put(reference.reference, next.value, target.loc);
                        if (assigned.type === "throw") {
                            const abrupt: ThrowCompletion = assigned;
                            return iterator === null ? abrupt : iteratorCloseOnThrow(iterator, abrupt, this.context, stmt.loc);
                        }
                        if (assigned.type !== "normal") throw new Error("invalid loop assignment completion");
                        result = this.#statement(stmt.body);
                    }
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
                    if (result.payload.kind !== "empty") value = result.payload;
                }
            }
            case "for": {
                if (stmt.initializer !== null) {
                    if (stmt.initializer.kind === "var") {
                        const initialized = this.#statement(stmt.initializer);
                        if (initialized.type !== "normal") return initialized;
                    } else {
                        const initialized = this.#value(stmt.initializer);
                        if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                    }
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
                    const value = binding.init === null ? normal() : this.#value(binding.init, binding.site.name);
                    if (value.type === "throw") { const abrupt: ThrowCompletion = value; return abrupt; }
                    const initialized = created.environment.initializeBinding(binding.site.name, value.value, this.context, binding.site.loc);
                    if (initialized.type === "throw") { const abrupt: ThrowCompletion = initialized; return abrupt; }
                    return this.#forBody(stmt, saved.lexical, labels);
                } finally { this.#frame = saved; }
            }
            case "while": case "do-while": {
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
            case "return": case "throw": {
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
                if (!fn.isDefaultClassConstructor) throw new Error("explicit derived constructor is unsupported");
                this.activeContext.realm = fn.realm;
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
    #executeScriptFunction(callee: GuestObject, fn: ScriptGuestCallable, receiver: Value, args: Value[], newTarget: Value = UNDEFINED): ValueCompletion {
        const savedInspectionSource = this.#inspectionSource;
        this.#inspectionSource = null;
        try {
            const record = fn.record;
            const source = ExecutableScript.readFunction(record, fn, executionKey);
            // Allocation failures already belong to the callee code/Realm.
            this.#frame = { realm: fn.realm, record, scopeId: source.scopeId, lexical: fn.environment,
                variable: fn.environment, strict: fn.strict, thisValue: receiver, function: fn,
                privateEnvironment: null, phase: "instantiation" };
            const created = record.createFunctionEnvironment(fn, receiver, this.context, newTarget);
            if (created.type === "throw") { this.#capture(created); return created; }
            this.#frame = { ...this.#active(), lexical: created.environment, variable: created.environment, thisValue: created.environment.thisValue };
            const setup = source.hasInitializers || source.needsArguments
                ? ExecutableScript.instantiateFunctionForExecution(record, created.environment, args, this.context, {
                    callee,
                    enter: (environment: ScriptEnvironment): void => { this.#frame = { ...this.#active(), lexical: environment, variable: environment }; },
                    evaluate: (initializer: Expr, name: string): ValueCompletion => this.#value(initializer, name),
                }, executionKey)
                : record.instantiateFunction(created.environment, args, this.context);
            if (setup.type === "throw") { this.#capture(setup); return setup; }
            this.#frame = { ...this.#active(), lexical: record.functionBodyEnvironment(created.environment),
                variable: record.functionVariableEnvironment(created.environment), phase: "body" };
            const result = this.#list(source.body);
            if (result.type === "throw") { this.#capture(result); return result; }
            if (result.type === "return") return normal(result.value);
            if (result.type === "normal") return normal();
            throw new Error("invalid Script function completion");
        } finally {
            this.#inspectionSource = savedInspectionSource;
        }
    }
    #newTargetEnvironment(environment: ScriptEnvironment): ScriptFunctionEnvironment | null {
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
        const prepared = ExecutableScript.prepare({ id: "<eval>", text: input.value }, realm, true, direct && saved.strict, direct && this.#newTargetEnvironment(saved.lexical) !== null);
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
            return this.#executeScriptFunction(callee.object, fn, receiver, args);
        } finally {
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
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
