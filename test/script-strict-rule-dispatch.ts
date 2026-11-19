import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import {
    parse,
    auditScriptReturns,
    parseDeclarationPlan,
    parseBoundedScriptDeclarationPlan,
    parseBoundedScriptPreparation,
    auditBoundedScriptBlockFunctions,
} from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import { prepareBoundedScript, prepareStrictScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { observeScripts, type ObservationUnit } from "../src/host/script-observation.js";
import { scriptObservationJSONRecord } from "../src/host/script-observation-json.js";
import type { ChildV2 } from "../src/host/script-observation-types.js";
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
if (process.argv[4] === "wire") {
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
            fixture.rejection.ruleCode === "duplicate-block-lexical-function" &&
                fixture.unit.text === fixtureText,
            "runtime fixture source identity",
        );
    }
    const unit = { id, text };
    const legacy = parse(text);
    const ordinary = {
        legacy: { error: legacy.error, rejection: legacy.rejection },
        returns: auditScriptReturns(text),
        declaration: parseDeclarationPlan(unit),
        bounded: parseBoundedScriptDeclarationPlan(unit),
    };
    const nodes: DeclarationNodes = {
        source: { text: "" },
        body: [],
        scopes: new Map(),
        declarations: new Map(),
        assignmentNameEligible: new Map(),
    };
    const preparation = parseBoundedScriptPreparation(unit, nodes);
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
    console.log(
        JSON.stringify({
            preparation,
            ordinary,
            audit: auditBoundedScriptBlockFunctions(text),
            contexts,
        }),
    );
}
