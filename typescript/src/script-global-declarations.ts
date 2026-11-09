import type { Declaration, PlannedFunction, ScriptDeclarationPlan } from "./script-declarations.js";
import type { ScriptSourceUnit } from "./script-metadata.js";
import type { GlobalEnvironment } from "./global-environment.js";
import { languageFailure, normal, type OperationContext, type ValueCompletion } from "./runtime.js";

export type DeclarationMaterializer = (
    declaration: Declaration, fn: PlannedFunction,
    environment: GlobalEnvironment, unit: ScriptSourceUnit,
    context: OperationContext
) => ValueCompletion;

// Trusted internal plans, not a decoder for hostile data. Validate indices before
// the first observable operation so a malformed plan cannot partially instantiate.
function validatePlan(plan: ScriptDeclarationPlan): Map<number, PlannedFunction> {
    const invalid = (): never => { throw new Error("invalid declaration plan"); };
    const root = plan.scopes[0];
    if (root === undefined || root.kind !== "script" || root.id !== 0 || root.parent !== null) invalid();
    for (let i = 0; i < plan.scopes.length; i++) if (plan.scopes[i].id !== i) invalid();
    for (let i = 0; i < plan.declarations.length; i++) {
        const d = plan.declarations[i];
        if (d.id !== i || plan.scopes[d.scope] === undefined || plan.scopes[d.variableScope] === undefined) invalid();
    }
    const functions = new Map<number, PlannedFunction>();
    for (const fn of plan.functions) {
        const scope = plan.scopes[fn.scope];
        if (scope === undefined || scope.kind !== "function") invalid();
        if (fn.declaration !== null) {
            const d = plan.declarations[fn.declaration];
            if (d === undefined || d.kind !== "function" || d.functionScope !== fn.scope || functions.has(fn.declaration)) invalid();
            functions.set(fn.declaration, fn);
        }
    }
    if (root.lexicalNames.length !== root.lexicalDeclarations.length || root.varNames.length !== root.varDeclarations.length) invalid();
    for (let i = 0; i < root.lexicalDeclarations.length; i++) {
        const d = plan.declarations[root.lexicalDeclarations[i]];
        if (d === undefined || (d.kind !== "let" && d.kind !== "const") || d.scope !== 0 || d.variableScope !== 0 || d.site.name !== root.lexicalNames[i]) invalid();
    }
    for (let i = 0; i < root.varDeclarations.length; i++) {
        const d = plan.declarations[root.varDeclarations[i]];
        if (d === undefined || d.kind === "let" || d.kind === "const" || d.variableScope !== 0 || d.site.name !== root.varNames[i]) invalid();
        if (d.kind === "function" && (d.scope !== 0 || !functions.has(d.id))) invalid();
    }
    return functions;
}

// ECMA-262 2025 §16.1.7, bounded host-only seam. Admission is deliberately
// separate from creation; interruption during creation preserves its prefix.
export function instantiateGlobalDeclarations(
    plan: ScriptDeclarationPlan, environment: GlobalEnvironment,
    context: OperationContext, materialize: DeclarationMaterializer
): ValueCompletion {
    if (context.realm.profile !== "script") throw new Error("Script Realm required");
    if (!plan.strictness.strict) throw new Error("strict declaration plan required");
    return instantiateBoundedGlobalDeclarations(plan, environment, context, materialize);
}
export function instantiateBoundedGlobalDeclarations(
    plan: ScriptDeclarationPlan, environment: GlobalEnvironment,
    context: OperationContext, materialize: DeclarationMaterializer
): ValueCompletion {
    if (context.realm.profile !== "script") throw new Error("Script Realm required");
    return instantiateDeclarations(plan, environment, context, materialize);
}
function instantiateDeclarations(
    plan: ScriptDeclarationPlan, environment: GlobalEnvironment,
    context: OperationContext, materialize: DeclarationMaterializer
): ValueCompletion {
    const functions = validatePlan(plan);
    const root = plan.scopes[0];
    for (const id of root.lexicalDeclarations) {
        const site = plan.declarations[id].site;
        const tick = context.tick(site.loc);
        if (tick.type !== "normal") return tick;
        if (environment.hasLexicalDeclaration(site.name)) return languageFailure(context.realm, "SyntaxError", "lexical declaration already exists: " + site.name, site.loc);
        const restricted = environment.hasRestrictedGlobalProperty(site.name);
        if (restricted.type !== "normal") return restricted;
        if (restricted.value) return languageFailure(context.realm, "SyntaxError", "restricted global property: " + site.name, site.loc);
    }
    for (const id of root.varDeclarations) {
        const site = plan.declarations[id].site;
        const tick = context.tick(site.loc);
        if (tick.type !== "normal") return tick;
        if (environment.hasLexicalDeclaration(site.name)) return languageFailure(context.realm, "SyntaxError", "lexical declaration already exists: " + site.name, site.loc);
    }
    const selected = new Map<string, boolean>();
    const winners: Declaration[] = [];
    for (let i = root.varDeclarations.length - 1; i >= 0; i--) {
        const d = plan.declarations[root.varDeclarations[i]];
        const tick = context.tick(d.site.loc);
        if (tick.type !== "normal") return tick;
        if (d.kind !== "function" || selected.has(d.site.name)) continue;
        const allowed = environment.canDeclareGlobalFunction(d.site.name);
        if (allowed.type !== "normal") return allowed;
        if (!allowed.value) return languageFailure(context.realm, "TypeError", "cannot declare global function: " + d.site.name, d.site.loc);
        selected.set(d.site.name, true);
        winners.push(d);
    }
    winners.reverse();
    const varNames = new Map<string, boolean>();
    const vars: Declaration[] = [];
    for (const id of root.varDeclarations) {
        const d = plan.declarations[id];
        const tick = context.tick(d.site.loc);
        if (tick.type !== "normal") return tick;
        if (d.kind !== "var" || selected.has(d.site.name)) continue;
        const allowed = environment.canDeclareGlobalVar(d.site.name);
        if (allowed.type !== "normal") return allowed;
        if (!allowed.value) return languageFailure(context.realm, "TypeError", "cannot declare global var: " + d.site.name, d.site.loc);
        if (!varNames.has(d.site.name)) { varNames.set(d.site.name, true); vars.push(d); }
    }
    for (const id of root.lexicalDeclarations) {
        const declaration = plan.declarations[id];
        const site = declaration.site;
        const tick = context.tick(site.loc);
        if (tick.type !== "normal") return tick;
        const created = declaration.kind === "const" ? environment.createImmutableBinding(site.name, site.loc, context.realm)
            : environment.createMutableBinding(site.name, site.loc, context.realm);
        if (created.type !== "normal") return created;
    }
    for (const d of winners) {
        const tick = context.tick(d.site.loc);
        if (tick.type !== "normal") return tick;
        const fn = functions.get(d.id);
        if (fn === undefined) throw new Error("invalid declaration plan");
        const value = materialize(d, fn, environment, plan.unit, context);
        if (value.type !== "normal") return value;
        if (value.value.kind !== "object") throw new Error("declaration materializer requires object");
        const creationTick = context.tick(d.site.loc);
        if (creationTick.type !== "normal") return creationTick;
        const created = environment.createGlobalFunctionBinding(d.site.name, value.value, context, d.site.loc);
        if (created.type !== "normal") return created;
    }
    for (const d of vars) {
        const tick = context.tick(d.site.loc);
        if (tick.type !== "normal") return tick;
        const created = environment.createGlobalVarBinding(d.site.name, context, d.site.loc);
        if (created.type !== "normal") return created;
    }
    return normal();
}
