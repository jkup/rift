import { parseDeclarationPlan } from "./parser.js";
import type { Realm } from "./realm.js";
import type { Declaration, DeclarationNodes, DeclarationPlanResult, ScriptDeclarationPlan, DeclarationSite } from "./script-declarations.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Location } from "./syntax.js";
import { GuestObject, UNDEFINED, normal, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "./runtime.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment, type ScriptEnvironment } from "./script-environment.js";
import type { GlobalEnvironment } from "./global-environment.js";
import { instantiateGlobalDeclarations, type DeclarationMaterializer } from "./script-global-declarations.js";

class ActivationKey {}
type CallableState = { key: ActivationKey; record: ExecutableScript; realm: Realm; scopeId: number;
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
    get strict(): true { return true; }
    get thisMode(): "strict" { return "strict"; }
    get privateEnvironment(): null { return null; }
    sourceText(): string { return this.#state.text; }
    inspectFormals(): string[] { return this.#state.formals.slice(); }
}
// The record owns only a key. Each transient activation owns its phase and key;
// no registry on the record keeps completed or abandoned activations alive.
class FunctionActivation extends ScriptFunctionEnvironment {
    #ownerKey: ActivationKey;
    #scopeId: number;
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
    complete(key: ActivationKey, scopeId: number): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "started")
            throw new Error("invalid started Script activation");
        this.#phase = "complete";
    }
}
export type ScriptFunctionEnvironmentCompletion = { type: "normal"; environment: ScriptFunctionEnvironment } | ThrowCompletion;
class BlockActivation extends ScriptDeclarativeEnvironment {
    #ownerKey: ActivationKey;
    #scopeId: number;
    #phase: "fresh" | "started" | "complete" = "fresh";
    constructor(key: ActivationKey, scopeId: number, outer: ScriptEnvironment) {
        super(outer);
        this.#ownerKey = key;
        this.#scopeId = scopeId;
    }
    checkFresh(key: ActivationKey, scopeId: number): void {
        if (key !== this.#ownerKey || scopeId !== this.#scopeId || this.#phase !== "fresh")
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

export type ScriptPreparation =
    | { readonly kind: "ready"; readonly record: ExecutableScript }
    | { readonly kind: "profile-rejected"; readonly reason: "realm" | "strict" }
    | Exclude<DeclarationPlanResult, ScriptDeclarationPlan>;
export type ScriptNodeInspection = {
    scopes: { id: number; kind: string; loc: Location | null; bodyLength: number;
        parameters: string[]; start: number | null; end: number | null; text: string | null }[];
    declarations: { id: number; kind: string; loc: Location; initializerKind: string | null }[];
};
type ScriptState = { realm: Realm; plan: ScriptDeclarationPlan; nodes: DeclarationNodes };

// No exported path accepts an AST or plan. Even a JavaScript caller bypassing
// TypeScript's private constructor can only create an unusable empty shell.
export type { ExecutableScript };
class ExecutableScript {
    #state: ScriptState | null = null;
    #activationKey = new ActivationKey();
    #completedMaterializations = 0;
    private constructor() {}
    static prepare(unit: ScriptSourceUnit, realm: Realm): ScriptPreparation {
        if (realm.profile !== "script") return { kind: "profile-rejected", reason: "realm" };
        const nodes: DeclarationNodes = { source: { text: "" }, body: [], scopes: new Map(), declarations: new Map(), assignmentNameEligible: new Map() };
        const plan = parseDeclarationPlan(unit, nodes);
        if (plan.kind !== "complete") return plan;
        if (!plan.strictness.strict) return { kind: "profile-rejected", reason: "strict" };
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
        record.#state = { realm, plan, nodes };
        return { kind: "ready", record };
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
        if (scope.kind !== "function" || !scope.strict || fn === undefined || !fn.strictness.strict ||
            entry === undefined || entry.node === null || entry.node.kind !== "function")
            throw new Error("invalid Script function association");
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
            scopeId, environment, unit: state.plan.unit, start: entry.source.start, end: entry.source.end,
            text: entry.source.source.text.slice(entry.source.start, entry.source.end), formals: entry.node.params.slice() });
        const object = new GuestObject(state.realm.functionPrototype, false, callable);
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
            callable.kind !== "script-guest" || !callable.strict || callable.thisMode !== "strict" || callable.privateEnvironment !== null)
            throw new Error("invalid Script callable metadata");
        const budget = context.tick({ line: entry.node.loc.line, column: entry.node.loc.column });
        if (budget.type === "throw") { const abrupt: ThrowCompletion = budget; return abrupt; }
        return { type: "normal", environment: new FunctionActivation(this.#activationKey, metadata.scopeId, metadata.environment, callable, receiver) };
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
        for (const id of entry.scope.lexicalDeclarations) {
            const site = state.plan.declarations[id].site;
            const tick = this.#setupTick(context, site.loc);
            if (tick.type === "throw") return tick;
            const created = environment.createMutableBinding(site.name, site.loc);
            if (created.type === "throw") return created;
        }
        for (const declaration of winners) {
            if (declaration.functionScope === null) throw new Error("missing Script function scope");
            const value = this.materializeFunction(declaration.functionScope, environment, null, context);
            if (value.type === "throw") return value;
            const tick = this.#setupTick(context, declaration.site.loc);
            if (tick.type === "throw") return tick;
            const written = environment.setMutableBinding(declaration.site.name, value.value, context, declaration.site.loc);
            if (written.type === "throw") return written;
        }
        environment.complete(this.#activationKey, metadata.scopeId);
        return normal();
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
        if (scope.kind !== "block" || !scope.strict || entry === undefined || entry.node === null || entry.node.kind !== "block" || entry.body !== entry.node.body)
            throw new Error("invalid Script block association");
        return { scope, node: entry.node };
    }
    createBlockEnvironment(scopeId: number, outer: ScriptEnvironment, context: OperationContext): ScriptBlockEnvironmentCompletion {
        this.#validateEnvironment(outer, context);
        const entry = this.#block(scopeId);
        const tick = this.#setupTick(context, entry.node.loc);
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
        return instantiateGlobalDeclarations(this.#readState().plan, environment, context, materialize);
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
    return ExecutableScript.prepare(unit, realm);
}
function copySite(site: DeclarationSite): DeclarationSite {
    return { name: site.name, start: site.start, end: site.end, loc: { line: site.loc.line, column: site.loc.column } };
}
function copyStrictness(strictness: StrictnessMetadata): StrictnessMetadata {
    return { ownStrict: strictness.ownStrict, inheritedStrict: strictness.inheritedStrict, strict: strictness.strict,
        directives: strictness.directives.map(d => ({ start: d.start, end: d.end, statementEnd: d.statementEnd,
            loc: { line: d.loc.line, column: d.loc.column }, raw: d.raw, useStrict: d.useStrict })) };
}
