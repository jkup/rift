import { instanceofOperator } from "./builtins/function.js";
import type { ConstructBuiltin, BuiltinConstructor } from "./runtime.js";
import { parseDeclarationPlan, parseBoundedScriptPreparation } from "./parser.js";
import type { Realm } from "./realm.js";
import type { Declaration, DeclarationNodes, DeclarationPlanResult, ScriptDeclarationPlan, DeclarationSite } from "./script-declarations.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Expr, Stmt, FunctionSource, Location, TryCatchStmt } from "./syntax.js";
import { GuestObject, UNDEFINED, normal, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext, type Builtin, type Completion, type Reference, type ReferenceResult, Environment, equal, languageFailure, failure, resourceFailure, getValue, putValue, truthy } from "./runtime.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment, type ScriptEnvironment, resolveScriptBinding, getScriptBinding, putScriptBinding, deleteScriptBinding, type ScriptBindingReference } from "./script-environment.js";
import type { GlobalEnvironment } from "./global-environment.js";
import { instantiateBoundedGlobalDeclarations, type DeclarationMaterializer } from "./script-global-declarations.js";

class ActivationKey {}
type CallableState = { strict: boolean; key: ActivationKey; record: ExecutableScript; realm: Realm; scopeId: number;
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
    get kind(): "script-guest" { return "script-guest"; }
    get realm(): Realm { return this.#state.realm; }
    get record(): ExecutableScript { return this.#state.record; }
    get scopeId(): number { return this.#state.scopeId; }
    get environment(): ScriptEnvironment { return this.#state.environment; }
    get strict(): boolean { return this.#state.strict; }
    get thisMode(): "strict" | "global" { return this.#state.strict ? "strict" : "global"; }
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
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scopeId: number, outer: ScriptEnvironment, callable: ScriptGuestCallable, receiver: Value) {
        super(outer, receiver, callable);
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
    complete(key: ActivationKey, scopeId: number, bodyEnvironment: ScriptEnvironment): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "started")
            throw new Error("invalid started Script activation");
        this.#bodyEnvironment = bodyEnvironment;
        this.#phase = "complete";
    }
    bodyEnvironment(key: ActivationKey): ScriptEnvironment {
        if (key !== this.#ownerKey || this.#phase !== "complete" || this.#bodyEnvironment === null)
            throw new Error("incomplete Script function activation");
        return this.#bodyEnvironment;
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
    static prepare(unit: ScriptSourceUnit, realm: Realm, bounded: boolean): ScriptPreparation {
        if (realm.profile !== "script") return { kind: "profile-rejected", reason: "realm" };
        const nodes: DeclarationNodes = { source: { text: "" }, body: [], scopes: new Map(), declarations: new Map(), assignmentNameEligible: new Map() };
        const plan = bounded ? parseBoundedScriptPreparation(unit, nodes) : parseDeclarationPlan(unit, nodes);
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
                        (scope.kind !== "function" && scope.strict !== parent.strict))
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
    static readFunction(record: ExecutableScript, callable: ScriptGuestCallable, key: ExecutionKey): { scopeId: number; body: Stmt[] } {
        ExecutableScript.state(record, key);
        const metadata = ScriptGuestCallable.check(callable, record.#activationKey, record);
        const entry = record.#function(metadata.scopeId);
        return { scopeId: metadata.scopeId, body: entry.node.body };
    }
    static scopeOfNode(record: ExecutableScript, node: Expr | Stmt, key: ExecutionKey): number {
        const scope = ExecutableScript.state(record, key).scopes.get(node);
        if (scope === undefined) throw new Error("foreign Script node");
        return scope;
    }
    static assignmentMayName(record: ExecutableScript, node: Expr, key: ExecutionKey): boolean {
        return ExecutableScript.state(record, key).nodes.assignmentNameEligible.get(node) === true;
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
    materializeFunction(scopeId: number, environment: ScriptEnvironment, inferredName: string | null, context: OperationContext): ValueCompletion {
        this.#validateEnvironment(environment, context);
        const state = this.#readState();
        const entry = this.#function(scopeId);
        if ((entry.fn.declaration !== null && inferredName !== null) || (inferredName !== null && typeof inferredName !== "string"))
            throw new Error("invalid Script inferred name");
        const name = entry.fn.declaration === null ? (inferredName === null ? "" : inferredName)
            : state.plan.declarations[entry.fn.declaration].site.name;
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") return budget;
        const callable = ScriptGuestCallable.create({ key: this.#activationKey, record: this, realm: state.realm,
            scopeId, environment, strict: entry.scope.strict, unit: state.plan.unit, start: entry.source.start, end: entry.source.end,
            text: entry.source.source.text.slice(entry.source.start, entry.source.end), formals: entry.node.params.slice() });
        const object = new GuestObject(state.realm.functionPrototype, false, callable, callable);
        const prototypeObject = new GuestObject(state.realm.objectPrototype);
        const value: Value = { kind: "object", object };
        prototypeObject.bootstrapDefine("constructor", { value, writable: true, enumerable: false, configurable: true });
        object.bootstrapDefine("length", { value: { kind: "number", value: entry.node.params.length }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
        object.bootstrapDefine("prototype", { value: { kind: "object", object: prototypeObject }, writable: true, enumerable: false, configurable: false });
        this.#completedMaterializations++;
        return normal(value);
    }
    createFunctionEnvironment(callable: ScriptGuestCallable, receiver: Value, context: OperationContext): ScriptFunctionEnvironmentCompletion {
        const metadata = ScriptGuestCallable.check(callable, this.#activationKey, this);
        this.#validateEnvironment(metadata.environment, context);
        const state = this.#readState();
        const entry = this.#function(metadata.scopeId);
        if (metadata.unit !== state.plan.unit || metadata.start !== entry.source.start || metadata.end !== entry.source.end ||
            callable.record !== this || callable.realm !== state.realm || callable.scopeId !== metadata.scopeId || callable.environment !== metadata.environment ||
            callable.kind !== "script-guest" || metadata.strict !== entry.scope.strict || callable.strict !== metadata.strict ||
            callable.thisMode !== (metadata.strict ? "strict" : "global") || callable.privateEnvironment !== null)
            throw new Error("invalid Script callable metadata");
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") { const abrupt: ThrowCompletion = budget; return abrupt; }
        let boundThis = receiver;
        if (!metadata.strict) {
            if (receiver.kind === "null" || receiver.kind === "undefined") boundThis = state.realm.globalThisValue;
            else if (receiver.kind !== "object") {
                const boxed = toObject(receiver, context, entry.node.loc);
                if (boxed.type === "throw") { const abrupt: ThrowCompletion = boxed; return abrupt; }
                boundThis = { kind: "object", object: boxed.value };
            }
        }
        return { type: "normal", environment: new FunctionActivation(this.#activationKey, metadata.scopeId, metadata.environment, callable, boundThis) };
    }
    instantiateFunction(environment: ScriptFunctionEnvironment, args: Value[], context: OperationContext): ValueCompletion {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid Script function activation");
        const metadata = ScriptGuestCallable.check(environment.callable, this.#activationKey, this);
        this.#validateEnvironment(environment, context);
        const state = this.#readState();
        const entry = this.#function(metadata.scopeId);
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
        for (const formal of entry.scope.formals) {
            const tick = this.#setupTick(context, formal.loc);
            if (tick.type === "throw") return tick;
            const created = environment.createMutableBinding(formal.name, formal.loc);
            if (created.type === "throw") return created;
        }
        for (let i = 0; i < entry.scope.formals.length; i++) {
            const formal = entry.scope.formals[i];
            const tick = this.#setupTick(context, formal.loc);
            if (tick.type === "throw") return tick;
            const initialized = environment.initializeBinding(formal.name, i < argumentsList.length ? argumentsList[i] : UNDEFINED, context, formal.loc);
            if (initialized.type === "throw") return initialized;
        }
        for (const id of entry.scope.varDeclarations) {
            const site = state.plan.declarations[id].site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const present = environment.hasBinding(site.name, site.loc);
            if (present.type === "throw") return present;
            if (present.value) continue;
            const createTick = this.#setupTick(context, site.loc);
            if (createTick.type === "throw") return createTick;
            const created = environment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
            const initializeTick = this.#setupTick(context, site.loc);
            if (initializeTick.type === "throw") return initializeTick;
            const initialized = environment.initializeBinding(site.name, UNDEFINED, context, site.loc);
            if (initialized.type === "throw") return initialized;
        }
        // Sloppy functions separate body lexicals from parameter/var bindings,
        // even when empty. Hoisted functions capture this body environment.
        let lexicalEnvironment: ScriptEnvironment = environment;
        if (!metadata.strict) {
            const tick = this.#setupTick(context, entry.node.loc);
            if (tick.type === "throw") return tick;
            lexicalEnvironment = new ScriptDeclarativeEnvironment(environment);
        }
        for (const id of entry.scope.lexicalDeclarations) {
            const site = state.plan.declarations[id].site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const created = lexicalEnvironment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
        }
        for (const declaration of winners) {
            if (declaration.functionScope === null) throw new Error("missing Script function scope");
            const value = this.materializeFunction(declaration.functionScope, lexicalEnvironment, null, context);
            if (value.type === "throw") return value;
            const tick = this.#setupTick(context, declaration.site.loc);
            if (tick.type === "throw") return tick;
            const written = environment.setMutableBinding(declaration.site.name, value.value, context, declaration.site.loc);
            if (written.type === "throw") return written;
        }
        environment.complete(this.#activationKey, metadata.scopeId, lexicalEnvironment);
        return normal();
    }
    // Publish only a completed activation's original body environment.
    functionBodyEnvironment(environment: ScriptFunctionEnvironment): ScriptEnvironment {
        if (!(environment instanceof FunctionActivation)) throw new Error("invalid Script function activation");
        return environment.bodyEnvironment(this.#activationKey);
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
            const created = environment.createMutableBinding(declaration.site.name, declaration.site.loc);
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
    instantiateGlobals(environment: GlobalEnvironment, context: OperationContext): ValueCompletion {
        const materialize = this.createGlobalMaterializer(environment, context);
        return instantiateBoundedGlobalDeclarations(this.#readState().plan, environment, context, materialize);
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
        return { kind: "complete", goal: "Script", unit: { id: plan.unit.id, text: plan.unit.text },
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
    { kind: "construct"; context: OperationContext; realm: Realm; invoke: ConstructBuiltin; callee: GuestObject;
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
    callee: GuestObject, args: Value[], loc: Location): boolean {
    const permit = pendingBuiltin;
    if (permit === null || permit.kind !== "construct" || permit.used || permit.context !== context || permit.realm !== realm ||
        permit.invoke !== invoke || permit.callee !== callee || permit.args !== args || permit.loc !== loc) return false;
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
};

class ExecutionEngine {
    #frame: ScriptFrameSnapshot | null = null;
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
            case "for": case "do-while": throw new Error("Script loop AST requires Script execution");
            case "var": throw new Error("Script var AST requires Script execution");
            case "switch": throw new Error("Script switch AST requires Script execution");
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
    #expression(expr: Expr, env: Environment | null, receiver: Value, name: string | null): Completion {
        switch (expr.kind) {
            case "literal": {
                const value = expr.value;
                if (value === null) return normal({ kind: "null" });
                if (typeof value === "number") return normal({ kind: "number", value });
                if (typeof value === "boolean") return normal({ kind: "boolean", value });
                return normal({ kind: "string", value });
            }
            case "this": return normal(receiver);
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
            case "identifier": case "member": {
                const ref = this.#reference(expr, env, receiver);
                return ref.type === "abrupt" ? ref.completion : this.#get(ref.reference, expr.loc);
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
                for (let i = 0; i < expr.elements.length; i++) {
                    // Holes cost a slot tick too; nested elements share this budget.
                    const budget = this.tick(expr.loc);
                    if (budget.type !== "normal") return budget;
                    const element = expr.elements[i];
                    if (element === null) continue;
                    const value = this.#eval(element, env, receiver);
                    if (value.type !== "normal") return value;
                    const defined = object.defineOwnProperty(String(i), {
                        value: value.value, writable: true, enumerable: true, configurable: true,
                    }, this.context, expr.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh array literal element invariant");
                }
                // Index definitions grow length, but trailing holes do not define keys.
                const length = object.defineOwnProperty("length", {
                    value: { kind: "number", value: expr.elements.length },
                }, this.context, expr.loc);
                if (length.type === "throw") return length;
                if (!length.value) throw new Error("fresh array literal length invariant");
                return normal({ kind: "object", object });
            }
            case "object": {
                const object = this.context.realm.createObject();
                for (let i = 0; i < expr.keys.length; i++) {
                    const value = this.#eval(expr.values[i], env, receiver, false, expr.keys[i]);
                    if (value.type !== "normal") return value;
                    const defined = object.defineOwnProperty(expr.keys[i], { value: value.value, writable: true, enumerable: true, configurable: true }, this.context, expr.loc);
                    if (defined.type === "throw") return defined;
                    if (!defined.value) throw new Error("fresh object property definition failed");
                }
                return normal({ kind: "object", object });
            }
            case "new": {
                if (!this.#script) throw new Error("Script construction unavailable");
                const callee = this.#eval(expr.callee, env, receiver);
                if (callee.type !== "normal") return callee;
                const args: Value[] = [];
                for (const arg of expr.args) {
                    const value = this.#eval(arg, env, receiver);
                    if (value.type !== "normal") return value;
                    args.push(value.value);
                }
                return this.#construct(callee.value, args, expr.loc);
            }
            case "call": {
                let thisValue = UNDEFINED;
                let callee: Completion;
                if (expr.callee.kind === "identifier" || expr.callee.kind === "member") {
                    const ref = this.#reference(expr.callee, env, receiver);
                    if (ref.type === "abrupt") return ref.completion;
                    callee = this.#get(ref.reference, expr.loc);
                    if (ref.reference.kind === "property") thisValue = ref.reference.base;
                    if (ref.reference.kind === "script-property" && ref.reference.reference.kind === "property") thisValue = ref.reference.reference.base;
                } else callee = this.#eval(expr.callee, env, receiver);
                if (callee.type !== "normal") return callee;
                const args: Value[] = [];
                for (const arg of expr.args) {
                    const value = this.#eval(arg, env, receiver);
                    if (value.type !== "normal") return value;
                    args.push(value.value);
                }
                return this.call(callee.value, thisValue, args, expr.loc);
            }
            case "unary": {
                if (expr.op === "delete") {
                    if (expr.operand.kind === "identifier" && (env !== null || this.#active().strict)) throw new Error("delete requires a property reference");
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
                return normal({ kind: "number", value: expr.op === "-" ? -number.value : number.value });
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
                if (expr.op === "&&" || expr.op === "||") return right;
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
        if (fn.kind === "script-guest") throw new Error("Script execution unavailable");
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
        if (op === "-" || op === "*" || op === "/" || op === "%") {
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
            const setup = record.instantiateGlobals(realm.globalEnvironment, this.context);
            if (setup.type === "throw") { this.#capture(setup); return this.#observeEvaluation({ phase: "instantiation", completion: setup }, observed); }
            const f = this.#active();
            this.#frame = { ...f, phase: "body" };
            const result = this.#list(ExecutableScript.readRoot(record, key));
            if (result.type === "throw") { this.#capture(result); return this.#observeEvaluation({ phase: "body", completion: result }, observed); }
            if (result.type !== "normal") throw new Error("invalid Script root completion");
            return this.#observeEvaluation({ phase: "body", completion: normal(result.payload.kind === "empty" ? UNDEFINED : result.payload.value) }, observed);
        } finally {
            this.#frame = null;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
            this.depth = savedDepth;
        }
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
    #statement(stmt: Stmt): ScriptStatementCompletion {
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
            const result = this.#scriptStatement(stmt);
            if (result.type === "throw") this.#capture(result);
            return result;
        } finally { this.depth = savedDepth; }
    }
    #scriptStatement(stmt: Stmt): ScriptStatementCompletion {
        switch (stmt.kind) {
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
                        if (result.type === "break") return { type: "normal", payload: result.payload };
                        if (result.type !== "normal") return result;
                        if (result.payload.kind !== "empty") value = result.payload;
                    }
                    return { type: "normal", payload: value };
                } finally { this.#frame = saved; }
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
            case "empty": case "function": return { type: "normal", payload: { kind: "empty" } };
            case "expression": return scriptExpressionCompletion(this.#value(stmt.expression));
            case "let": {
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
                let value: ScriptStatementPayload = { kind: "value", value: UNDEFINED };
                while (true) {
                    if (stmt.test !== null) {
                        const test = this.#value(stmt.test);
                        if (test.type === "throw") { const abrupt: ThrowCompletion = test; return abrupt; }
                        if (!truthy(test.value)) return { type: "normal", payload: value };
                    }
                    const result = this.#statement(stmt.body);
                    if (result.type === "break") return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
                    if (result.type !== "normal" && result.type !== "continue") return updateScriptEmpty(result, value);
                    if (result.payload.kind !== "empty") value = result.payload;
                    if (stmt.update !== null) {
                        const updated = this.#value(stmt.update);
                        if (updated.type === "throw") { const abrupt: ThrowCompletion = updated; return abrupt; }
                    }
                }
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
                    if (result.type === "break") {
                        return { type: "normal", payload: result.payload.kind === "empty" ? value : result.payload };
                    }
                    if (result.type !== "normal" && result.type !== "continue") return updateScriptEmpty(result, value);
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
            case "break": case "continue": return { type: stmt.kind, payload: { kind: "empty" } };
        }
    }
    #construct(callee: Value, args: Value[], loc: Location): ValueCompletion {
        const saved = this.#active();
        if (callee.kind !== "object" || callee.object.constructorSlot === null) return languageFailure(this.context.realm, "TypeError", "value is not a constructor", loc);
        const fn = callee.object.constructorSlot;
        if (fn.kind === "builtin-constructor") return this.#constructBuiltin(callee.object, fn, args, loc);
        if (fn.kind !== "script-guest" || fn !== callee.object.callable || fn.realm.profile !== saved.realm.profile)
            throw new Error("invalid Script constructor metadata");
        ExecutableScript.readFunction(fn.record, fn, executionKey);
        if (this.calls >= this.maxCalls) {
            const result = resourceFailure("calls", this.calls, this.maxCalls, "call depth limit exceeded", loc);
            this.#capture(result);
            return result;
        }
        const savedRealm = this.activeContext.realm, savedCalls = this.calls;
        this.calls++;
        try {
            // Reserve constructor depth before getters; prototype/allocation
            // failures still belong to the caller frame and Realm.
            const prototype = callee.object.internalGet("prototype", callee, this.context, loc);
            if (prototype.type === "throw") { this.#capture(prototype); return prototype; }
            const proto = prototype.value.kind === "object" ? prototype.value.object : fn.realm.objectPrototype;
            const budget = this.tick(loc);
            if (budget.type === "throw") { this.#capture(budget); return budget; }
            const receiver: Value = { kind: "object", object: new GuestObject(proto) };
            this.activeContext.realm = fn.realm;
            const result = this.#executeScriptFunction(fn, receiver, args);
            if (result.type === "throw") return result;
            return result.value.kind === "object" ? result : normal(receiver);
        } finally {
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
        }
    }
    #constructBuiltin(callee: GuestObject, fn: BuiltinConstructor, args: Value[], loc: Location): ValueCompletion {
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
        pendingBuiltin = { kind: "construct", context: this.context, realm: fn.realm, invoke: fn.invoke, callee, args, loc, used: false };
        try {
            const result = fn.invoke(callee, args, this.context, loc);
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
    #executeScriptFunction(fn: ScriptGuestCallable, receiver: Value, args: Value[]): ValueCompletion {
        const savedInspectionSource = this.#inspectionSource;
        this.#inspectionSource = null;
        try {
            const record = fn.record;
            const source = ExecutableScript.readFunction(record, fn, executionKey);
            // Allocation failures already belong to the callee code/Realm.
            this.#frame = { realm: fn.realm, record, scopeId: source.scopeId, lexical: fn.environment,
                variable: fn.environment, strict: fn.strict, thisValue: receiver, function: fn,
                privateEnvironment: null, phase: "instantiation" };
            const created = record.createFunctionEnvironment(fn, receiver, this.context);
            if (created.type === "throw") { this.#capture(created); return created; }
            this.#frame = { ...this.#active(), lexical: created.environment, variable: created.environment, thisValue: created.environment.thisValue };
            const setup = record.instantiateFunction(created.environment, args, this.context);
            if (setup.type === "throw") { this.#capture(setup); return setup; }
            this.#frame = { ...this.#active(), lexical: record.functionBodyEnvironment(created.environment), phase: "body" };
            const result = this.#list(source.body);
            if (result.type === "throw") { this.#capture(result); return result; }
            if (result.type === "return") return normal(result.value);
            if (result.type === "normal") return normal();
            throw new Error("invalid Script function completion");
        } finally {
            this.#inspectionSource = savedInspectionSource;
        }
    }
    #callScript(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion {
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
            return this.#executeScriptFunction(fn, receiver, args);
        } finally {
            this.#frame = saved;
            this.activeContext.realm = savedRealm;
            this.calls = savedCalls;
        }
    }

}

// The public legacy surface cannot select Script mode, even via constructor recovery.
export class Evaluator extends ExecutionEngine {
    constructor(realm: Realm, maxSteps = 100000, maxCalls = 64) {
        if (realm.profile !== "legacy") throw new Error("legacy Realm required");
        super(realm, maxSteps, maxCalls, null);
    }
}
