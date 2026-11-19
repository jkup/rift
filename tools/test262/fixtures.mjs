// Adapter-owned synthetic records only. No upstream source or engine execution.
import { terminalRecord } from "./result.mjs";
export const H = "a".repeat(64);
export const B = "b".repeat(40);
export function synthetic({
    observation = { kind: "normal" },
    negative = null,
    stage = "test",
    body = undefined,
    blockers = [],
    lane = "node",
    variant = "strict",
    mode = "conformance",
    process = { exitCode: 0, signal: null, deadlineExpired: false },
} = {}) {
    const limits = {
        sourceUnits: 100000,
        parseDepth: 128,
        steps: 100000,
        calls: 64,
        evaluationDepth: 256,
        wallMs: 1000,
        outputBytes: 1024,
    };
    const guardLimit = {
        "source-units": "sourceUnits",
        "parse-depth": "parseDepth",
        steps: "steps",
        calls: "calls",
        "evaluation-depth": "evaluationDepth",
        output: "outputBytes",
    };
    if (observation.kind === "resource-limit" && guardLimit[observation.guardCode]) {
        limits[guardLimit[observation.guardCode]] = observation.limit;
    }
    return terminalRecord(
        {
            schemaVersion: 1,
            runId: "synthetic-only",
            mode,
            corpusRevision: B,
            manifestSha256: H,
            path: "test/synthetic.js",
            blob: B,
            sourceSha256: H,
            variant,
            goal: variant === "module" ? "Module" : "Script",
            lane,
            engineCommit: B,
            engineBuildSha256: H,
            adapterSha256: H,
            policySha256: H,
            dirtySourceSha256: null,
        },
        {
            harness: [],
            transformedSourceSha256: H,
            profileId: "synthetic-admitted",
            capabilityLedgerSha256: H,
            host: "synthetic",
            platform: "synthetic",
            toolchain: "synthetic",
            limits,
        },
        {
            stage,
            harnessValidated: stage === "test" && mode === "conformance",
            bodyEvaluated:
                body ??
                (observation.kind === "normal" &&
                    stage === "test" &&
                    negative?.phase !== "parse" &&
                    mode !== "parser-observation"),
            unit: "test/synthetic.js",
            location: { line: 1, column: 1 },
            process,
            stdoutSha256: H,
            stderrSha256: H,
            elapsedMs: 1,
        },
        observation,
        negative,
        blockers,
    );
}
export const thrown = (
    name = null,
    valueKind = "object",
    outcome = name === null ? "absent" : "available",
) => ({
    kind: "throw",
    phase: "runtime",
    valueKind,
    constructor: {
        outcome,
        name,
        realmId: outcome === "available" ? "realm-1" : null,
        secondary: outcome === "abrupt" ? "guest-sentinel" : null,
    },
});
export const syntax = {
    kind: "syntax-error",
    phase: "parse",
    constructorName: "SyntaxError",
    ruleCode: "assignment-target",
};
export const neg = (phase, type) => ({ phase, type });
export const fm = (yaml = "", body = "1;") =>
    `/*---\ndescription: synthetic\n${yaml}\n---*/\n${body}`;
// Tests construct parent context from a known fixture before mutating incoming
// records. Production constructs it from verified selection/policy in plan.mjs.
export function contextFor(record) {
    return structuredClone({
        identity: record.identity,
        inputs: record.inputs,
        expectedNegative: record.classification?.expectedNegative ?? null,
        blockers: record.classification?.blockers ?? [],
    });
}
export function selectionFor(records) {
    return {
        lane: records[0]?.identity.lane ?? "node",
        excludedFixtures: [],
        files: records.map((record, index) => ({
            path: record.identity.path,
            inputError: null,
            variants: [
                {
                    id: `synthetic-${index}`,
                    ...record.identity,
                    metadata: { negative: record.classification?.expectedNegative ?? null },
                    blockers: record.classification?.blockers ?? [],
                    resultContext: contextFor(record),
                },
            ],
        })),
    };
}
