import type { ClassInitializer } from "../src/syntax.js";
import type { Expr, Stmt } from "../src/syntax.js";
function snapshot(n: DeclarationNodes): string {
    const scopes: { id: number; node: Stmt | Expr | ClassInitializer | null; body: Stmt[] }[] = [];
    for (const [id, value] of n.scopes) {
        scopes.push({ id, node: value.node, body: value.body });
    }
    const declarations: { id: number; node: Stmt; initializer: Expr | null }[] = [];
    for (const [id, value] of n.declarations) {
        declarations.push({ id, node: value.node, initializer: value.initializer });
    }
    const assignments: { node: Expr; eligible: boolean }[] = [];
    for (const [node, eligible] of n.assignmentNameEligible) {
        assignments.push({ node, eligible });
    }
    return JSON.stringify({ source: n.source, body: n.body, scopes, declarations, assignments });
}
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import {
    parse,
    auditScriptReturns,
    parseDeclarationPlan,
    parseBoundedScriptDeclarationPlan,
    parseBoundedScriptPreparation,
    auditBoundedScriptBlockFunctions,
    auditBoundedScriptStrictParameters,
} from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import { prepareBoundedScript, prepareStrictScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { observeScripts, type ObservationUnit } from "../src/script-observation.js";
import { scriptObservationJSONRecord } from "../src/script-observation-json.js";
import type { ChildV2 } from "../src/script-observation-types.js";
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
const text = readFileSync(process.argv[2], "utf8");
const id = process.argv[3];
function observation(
    action: "parse-only" | "execute",
    role: "test" | "harness",
    source: string,
    nonce: string,
    sha: string,
): ChildV2 {
    const units: ObservationUnit[] =
        role === "test"
            ? [{ id: "u0", role: "test", text: source }]
            : [
                  { id: "u0", role: "harness", text: "0;" },
                  { id: "u1", role: "harness", text: source },
                  { id: "u2", role: "test", text: "7;" },
              ];
    return observeScripts({
        nonce,
        requestSha256: sha,
        action,
        preflightId: role === "test" ? null : "preflight",
        steps: 10000,
        calls: 64,
        units,
    });
}
function controls(): void {
    const sources = [readFileSync(process.argv[2], "utf8"), readFileSync(process.argv[5], "utf8")];
    let checks = 0;
    for (const reverse of [false, true]) {
        for (let index = 0; index < 2; index++) {
            const source = sources[reverse ? 1 - index : index];
            for (const seeded of [false, true]) {
                for (const realmLabel of ["A", "B"]) {
                    let prints = 0;
                    const realm = new Realm((_line: string) => {
                        prints++;
                    }, "script");
                    const session = createScriptSession({ maxSteps: 10000, maxCalls: 64 });
                    const seed = prepareBoundedScript(
                        { id: "history", text: "let sentinel = 41; throw 3;" },
                        realm,
                    );
                    if (seed.kind !== "ready") {
                        throw new Error("history setup");
                    }
                    if (seeded) {
                        const result = evaluateScript(session, seed.record);
                        check(
                            result.phase === "body" &&
                                result.completion.type === "throw" &&
                                result.completion.value.kind === "number" &&
                                result.completion.value.value === 3,
                            "seed completion",
                        );
                    }
                    const before = session.inspect(),
                        keys = realm.globalObject.ownPropertyKeys();
                    const descriptors = keys.map((key) => realm.globalObject.getOwnProperty(key));
                    const lexical = realm.globalEnvironment.hasLexicalDeclaration("sentinel");
                    const unit = { id: "same", text: source };
                    const rejected = prepareBoundedScript(unit, realm);
                    check(
                        rejected.kind === "blocked" &&
                            rejected.rejection.kind === "syntax-error" &&
                            rejected.rejection.ruleCode === "duplicate-strict-parameter",
                        "runtime strict parameter",
                    );
                    if (rejected.kind !== "blocked") {
                        throw new Error("blocked required");
                    }
                    check(
                        rejected.unit.id === unit.id && rejected.unit.text === source,
                        "rejection source",
                    );
                    unit.text = "throw 19;";
                    unit.id = "changed";
                    check(
                        rejected.unit.id === "same" && rejected.unit.text === source,
                        "rejection copied unit",
                    );
                    const after = session.inspect();
                    check(
                        before.steps === after.steps &&
                            before.calls === after.calls &&
                            before.depth === after.depth &&
                            before.active === after.active,
                        "all budgets unchanged",
                    );
                    if (before.lastAbrupt === null) {
                        check(after.lastAbrupt === null, "empty history");
                    } else {
                        const a = after.lastAbrupt;
                        check(
                            a !== null &&
                                a.record === before.lastAbrupt.record &&
                                a.realm === realm &&
                                a.unitId === before.lastAbrupt.unitId &&
                                a.loc.line === before.lastAbrupt.loc.line &&
                                a.loc.column === before.lastAbrupt.loc.column,
                            "history identity and location",
                        );
                    }
                    check(
                        prints === 0 &&
                            realm.globalEnvironment.hasLexicalDeclaration("sentinel") === lexical,
                        "print and lexical state",
                    );
                    check(
                        !realm.globalEnvironment.hasLexicalDeclaration("alpha") &&
                            !realm.globalEnvironment.hasLexicalDeclaration("beta"),
                        "no new lexical binding",
                    );
                    const afterKeys = realm.globalObject.ownPropertyKeys();
                    check(afterKeys.length === keys.length, "global key count");
                    for (let k = 0; k < keys.length; k++) {
                        check(keys[k] === afterKeys[k], "global key identity");
                        const prior = descriptors[k],
                            now = realm.globalObject.getOwnProperty(keys[k]);
                        if (prior === undefined || now === undefined) {
                            throw new Error("descriptor disappeared");
                        }
                        check(
                            prior.kind === now.kind &&
                                prior.enumerable === now.enumerable &&
                                prior.configurable === now.configurable,
                            "descriptor flags",
                        );
                        if (prior.kind === "data" && now.kind === "data") {
                            check(
                                prior.value === now.value && prior.writable === now.writable,
                                "descriptor value identity",
                            );
                        }
                        if (prior.kind === "accessor" && now.kind === "accessor") {
                            check(
                                prior.get === now.get && prior.set === now.set,
                                "accessor identity",
                            );
                        }
                    }
                    for (const action of ["parse-only", "execute"] as const) {
                        for (const role of ["test", "harness"] as const) {
                            for (const count of [0, 1, 2]) {
                                // Repeated source/path text has distinct occurrence ids; failure never joins the prefix.
                                const units: ObservationUnit[] = [];
                                for (let i = 0; i < count; i++) {
                                    units.push({
                                        id: "u" + i,
                                        role: "harness",
                                        text: i === 0 ? "0;" : "1;",
                                    });
                                }
                                units.push({ id: "u" + count, role, text: source });
                                if (role === "harness") {
                                    units.push({
                                        id: "u" + (count + 1),
                                        role: "test",
                                        text: "throw 19;",
                                    });
                                }
                                const result = observeScripts({
                                    nonce: realmLabel,
                                    requestSha256: "a".repeat(64),
                                    action,
                                    preflightId: "preflight",
                                    steps: 10000,
                                    calls: 64,
                                    units,
                                });
                                check(
                                    result.result.kind === "syntax-error" &&
                                        result.result.ruleCode === "duplicate-strict-parameter" &&
                                        !result.testBodyEvaluated &&
                                        result.inspection === null,
                                    "prefix rejection",
                                );
                                check(
                                    result.completedUnits.length === count &&
                                        result.operation.unitId === "u" + count &&
                                        result.operation.stage === role &&
                                        result.operation.phase === "parse",
                                    "prefix occurrence and phase",
                                );
                                for (let i = 0; i < count; i++) {
                                    check(
                                        result.completedUnits[i] === "u" + i,
                                        "completed occurrence",
                                    );
                                }
                                checks++;
                            }
                        }
                    }
                }
            }
        }
    }
    for (const source of [sources[0], "x".repeat(100001), "@"]) {
        const result = prepareBoundedScript(
            { id: "profile", text: source },
            new Realm((_line: string) => {}, "legacy"),
        );
        check(result.kind === "profile-rejected" && result.reason === "realm", "profile first");
    }
    const sameTexts = [
        '"use strict"; function f(a,a){}',
        "function f(a,a){}",
        "function f(a,b){} 7;",
    ];
    for (const reverse of [false, true]) {
        for (let i = 0; i < 3; i++) {
            const index = reverse ? 2 - i : i,
                realm = new Realm((_line: string) => {
                    throw new Error("ready print");
                }, "script");
            const unit = { id: "same", text: sameTexts[index] },
                result = prepareBoundedScript(unit, realm);
            if (index === 0) {
                check(
                    result.kind === "blocked" &&
                        result.rejection.kind === "syntax-error" &&
                        result.rejection.ruleCode === "duplicate-strict-parameter",
                    "same id strict",
                );
            }
            if (index === 1) {
                if (result.kind !== "ready") {
                    throw new Error("sloppy duplicate parameters must be admitted");
                }
                check(
                    evaluateScript(createScriptSession(), result.record).completion.type ===
                        "normal",
                    "same id sloppy function executes",
                );
            }
            if (index === 2) {
                if (result.kind !== "ready") {
                    throw new Error("ready control");
                }
                unit.text = "throw 19;";
                unit.id = "changed";
                check(
                    result.record.belongsTo(realm) &&
                        result.record.inspect().unit.text === sameTexts[index] &&
                        result.record.inspect().unit.id === "same",
                    "ready source identity",
                );
                const run = evaluateScript(
                    createScriptSession({ maxSteps: 10000, maxCalls: 64 }),
                    result.record,
                );
                check(
                    run.phase === "body" &&
                        run.completion.type === "normal" &&
                        run.completion.value.kind === "number" &&
                        run.completion.value.value === 7,
                    "ready completion 7",
                );
            }
        }
    }
    for (const action of ["parse-only", "execute"] as const) {
        const result = observation(action, "test", "7;", "ready", "a".repeat(64));
        check(
            result.result.kind === "normal" && result.testBodyEvaluated === (action === "execute"),
            "ready action",
        );
    }
    console.log(
        JSON.stringify({
            checks,
            runtimeInputs: 2,
            orders: 2,
            seededHistories: 2,
            realms: 2,
            profiles: 3,
            sameId: 6,
            ready: 2,
        }),
    );
}
if (process.argv[4] === "controls") {
    controls();
} else if (process.argv[4] === "wire") {
    const action = process.argv[5] === "execute" ? "execute" : "parse-only";
    const role = process.argv[6] === "harness" ? "harness" : "test";
    const returnRule = process.argv[7] === "return-outside-function";
    const child = observation(action, role, returnRule ? "return 1;" : text, id, process.argv[9]);
    // Only these return rows are synthetic serializer controls, never producer authority.
    if (returnRule && (action === "execute" || role === "harness")) {
        child.result = {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: "return-outside-function",
        };
    }
    // Frozen wire envelopes are synthetic conformance-shaped codec controls only.
    child.mode = "conformance";
    const result = child.result;
    if (process.argv[8] === "diagnostic" && result.kind === "syntax-error") {
        result.diagnostic = "TypeError: diagnostic only " + id + '\0"\\\ud800';
    }
    console.log(scriptObservationJSONRecord(child));
} else {
    const runtimeInput = process.argv[4];
    if (runtimeInput !== undefined) {
        const fixtureText = readFileSync(runtimeInput, "utf8");
        const fixtureRealm = new Realm((_line: string) => {
            throw new Error("fixture body ran");
        }, "script");
        const fixture = prepareBoundedScript(
            { id: "runtime-fixture", text: fixtureText },
            fixtureRealm,
        );
        if (fixture.kind !== "blocked" || fixture.rejection.kind !== "syntax-error") {
            throw new Error("runtime fixture certification");
        }
        check(
            fixture.rejection.ruleCode === "duplicate-strict-parameter" &&
                fixture.unit.text === fixtureText,
            "runtime fixture source identity",
        );
    }
    const unit = { id, text };
    const legacy = parse(text);
    const ordinary = {
        legacy,
        returns: auditScriptReturns(text),
        declaration: parseDeclarationPlan(unit),
        bounded: parseBoundedScriptDeclarationPlan(unit),
        D1: auditBoundedScriptBlockFunctions(text),
        D3: auditBoundedScriptStrictParameters(text),
    };
    const nodes: DeclarationNodes = {
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
        assignmentNameEligible: new Map(),
    };
    const initialNodes: DeclarationNodes = {
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
        assignmentNameEligible: new Map(),
    };
    const initial = parseBoundedScriptDeclarationPlan(unit, initialNodes);
    const preparation = parseBoundedScriptPreparation(unit, nodes);
    if (
        initial.kind === "blocked" &&
        initial.rejection.kind === "unsupported-syntax" &&
        initial.rejection.capabilityCode === "parse.duplicate-parameter"
    ) {
        check(snapshot(nodes) === snapshot(initialNodes), "rejected source/body retention");
        check(
            nodes.scopes.size === initialNodes.scopes.size &&
                nodes.declarations.size === initialNodes.declarations.size &&
                nodes.assignmentNameEligible.size === initialNodes.assignmentNameEligible.size,
            "rejected map retention",
        );
    }
    const a = new Realm((_line: string) => {
        throw new Error("unexpected effect");
    }, "script");
    const b = new Realm((_line: string) => {
        throw new Error("unexpected effect");
    }, "script");
    const session = createScriptSession({ maxSteps: 10000, maxCalls: 64 });
    const seed = prepareBoundedScript({ id: "history", text: "throw 3;" }, a);
    if (seed.kind !== "ready") {
        throw new Error("history ready");
    }
    evaluateScript(session, seed.record);
    const before = session.inspect(),
        keys = a.globalObject.ownPropertyKeys();
    const prepared = prepareBoundedScript(unit, a),
        foreign = prepareBoundedScript(unit, b);
    const after = session.inspect();
    check(
        after.steps === before.steps &&
            after.calls === before.calls &&
            after.depth === before.depth &&
            after.active === before.active,
        "preparation budget",
    );
    check(
        after.lastAbrupt !== null &&
            before.lastAbrupt !== null &&
            after.lastAbrupt.record === before.lastAbrupt.record &&
            after.lastAbrupt.realm === before.lastAbrupt.realm,
        "history identity",
    );
    check(a.globalObject.ownPropertyKeys().length === keys.length, "preparation global effects");
    check(prepared.kind === foreign.kind, "distinct Realm result");
    if (prepared.kind === "ready" && foreign.kind === "ready") {
        check(
            prepared.record !== foreign.record &&
                prepared.record.belongsTo(a) &&
                !prepared.record.belongsTo(b) &&
                foreign.record.belongsTo(b),
            "Realm ownership",
        );
        check(
            preparation.kind === "complete" && nodes.scopes.get(0)?.body === nodes.body,
            "root nodes",
        );
        for (const fn of prepared.record.inspect().functions) {
            const entry = nodes.scopes.get(fn.scope);
            check(
                entry !== undefined &&
                    entry.node !== null &&
                    entry.node.kind === "function" &&
                    entry.node.source !== null &&
                    entry.node.source.source === nodes.source &&
                    entry.body === entry.node.body,
                "original function identity",
            );
            if (fn.declaration !== null) {
                const declaration = nodes.declarations.get(fn.declaration);
                if (
                    declaration === undefined ||
                    entry === undefined ||
                    entry.node === null ||
                    entry.node.kind !== "function" ||
                    declaration.node.kind !== "function"
                ) {
                    throw new Error("function associations");
                }
                check(declaration.node === entry.node, "declaration node identity");
            }
        }
        unit.text = "changed";
        unit.id = "changed";
        check(
            prepared.record.inspect().unit.text === text &&
                prepared.record.inspect().unit.id === id,
            "retained source",
        );
    } else {
        check(JSON.stringify(prepared) === JSON.stringify(preparation), "preparation projection");
    }
    const wrong = prepareBoundedScript({ id, text }, new Realm((_line: string) => {}, "legacy"));
    check(wrong.kind === "profile-rejected" && wrong.reason === "realm", "profile before parsing");
    const strict = prepareStrictScript({ id, text }, a);
    if (ordinary.declaration.kind !== "complete") {
        check(JSON.stringify(strict) === JSON.stringify(ordinary.declaration), "strict unchanged");
    }
    const contexts: ChildV2[] = [];
    for (const action of ["parse-only", "execute"] as const) {
        for (const role of ["test", "harness"] as const) {
            contexts.push(observation(action, role, text, "matrix", "a".repeat(64)));
        }
    }
    console.log(JSON.stringify({ preparation, ordinary, contexts }));
}
