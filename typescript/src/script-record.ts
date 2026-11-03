import { parseDeclarationPlan } from "./parser.js";
import type { Realm } from "./realm.js";
import type { DeclarationNodes, DeclarationPlanResult, ScriptDeclarationPlan, DeclarationSite } from "./script-declarations.js";
import type { ScriptSourceUnit, StrictnessMetadata } from "./script-metadata.js";
import type { Location } from "./syntax.js";

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
    private constructor() {}
    static prepare(unit: ScriptSourceUnit, realm: Realm): ScriptPreparation {
        if (realm.profile !== "script") return { kind: "profile-rejected", reason: "realm" };
        const nodes: DeclarationNodes = { source: { text: "" }, body: [], scopes: new Map(), declarations: new Map() };
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
