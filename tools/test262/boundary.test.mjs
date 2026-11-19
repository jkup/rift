import test from "node:test";
import assert from "node:assert/strict";
import { synthetic, thrown, syntax, neg, contextFor, selectionFor, H, B } from "./fixtures.mjs";
import { inspectEnvelope, classify, validateRecord } from "./result.mjs";
import { newLedger, appendAttempt, report } from "./ledger.mjs";

const transport = {
    process: { exitCode: 0, signal: null, deadlineExpired: false },
    outputBytes: 0,
    outputLimit: 1024,
};
const protocol = { status: "host-fault", reasonCode: "protocol" };
function rejectedAtBoth(parent, incoming) {
    assert.deepEqual(
        inspectEnvelope(JSON.stringify(incoming), contextFor(parent), transport),
        protocol,
    );
    const ledger = newLedger(selectionFor([parent]));
    assert.throws(
        () => appendAttempt(ledger, "synthetic-0", incoming),
        /context|protocol|profile-not-admitted/,
    );
    assert.equal(ledger.attempts.length, 0);
    assert.equal(report(ledger).counts.pass, 0);
    assert.equal(report(ledger).missing, 1);
}

test("R1 O03 O05 O07 T06 expected phase/type/null must come from parent at both boundaries", () => {
    const parent = synthetic({
        observation: thrown("TypeError"),
        negative: neg("runtime", "TypeError"),
    });
    const incoming = [
        synthetic(), // Entire negative changed to null, yielding a self-consistent positive pass.
        synthetic({ observation: syntax, negative: neg("parse", "SyntaxError") }),
        synthetic({ observation: thrown("RangeError"), negative: neg("runtime", "RangeError") }),
    ];
    for (const candidate of incoming) {
        assert.equal(candidate.classification.status, "pass");
        rejectedAtBoth(parent, candidate);
    }
    const omitted = structuredClone(parent);
    delete omitted.classification.expectedNegative;
    rejectedAtBoth(parent, omitted);
    const missingPhase = structuredClone(parent);
    delete missingPhase.classification.expectedNegative.phase;
    rejectedAtBoth(parent, missingPhase);
    // Also disallow changing a known positive into a negative that happens to match.
    rejectedAtBoth(synthetic(), parent);
    const ledger = newLedger(selectionFor([parent]));
    appendAttempt(ledger, "synthetic-0", parent);
    assert.equal(report(ledger).counts.pass, 1);
    assert.deepEqual(
        inspectEnvelope(JSON.stringify(parent), contextFor(parent), transport),
        parent,
    );
});

test("R1 coordinator reproduction and missing parent policy cannot enter a ledger", () => {
    const r = synthetic();
    const s = selectionFor([r]);
    s.files[0].variants[0].metadata = { negative: neg("runtime", "TypeError") };
    const ledger = newLedger(s);
    assert.throws(() => appendAttempt(ledger, "synthetic-0", r), /context/);
    assert.equal(report(ledger).counts.pass, 0);
    for (const field of ["metadata", "blockers", "resultContext"]) {
        const selection = selectionFor([r]);
        delete selection.files[0].variants[0][field];
        assert.throws(() => appendAttempt(newLedger(selection), "synthetic-0", r), /context/);
    }
    // The old identity-only API must fail closed, not silently default a positive.
    assert.deepEqual(inspectEnvelope(JSON.stringify(r), r.identity, transport), protocol);
});

test("R1 T06 T17 every Inputs field is parent-bound, including limits and ordered harness", () => {
    const parent = synthetic();
    const changes = [
        (r) => {
            r.inputs.transformedSourceSha256 = "c".repeat(64);
        },
        (r) => {
            r.inputs.profileId = "another-profile";
        },
        (r) => {
            r.inputs.capabilityLedgerSha256 = "c".repeat(64);
        },
        (r) => {
            r.inputs.host = "another-host";
        },
        (r) => {
            r.inputs.platform = "another-platform";
        },
        (r) => {
            r.inputs.toolchain = "another-toolchain";
        },
        ...Object.keys(parent.inputs.limits).map((key) => (r) => {
            r.inputs.limits[key]++;
        }),
        (r) => {
            r.inputs.harness = [{ path: "harness/a.js", blob: B, sha256: H }];
        },
    ];
    for (const mutate of changes) {
        const incoming = structuredClone(parent);
        mutate(incoming);
        validateRecord(incoming); // Self-consistency alone is deliberately insufficient.
        rejectedAtBoth(parent, incoming);
    }
    const withHarness = structuredClone(parent);
    withHarness.inputs.harness = ["a", "b"].map((x) => ({
        path: `harness/${x}.js`,
        blob: B,
        sha256: H,
    }));
    const reversed = structuredClone(withHarness);
    reversed.inputs.harness.reverse();
    rejectedAtBoth(withHarness, reversed);
});

test("R1 blockers cannot be removed or replaced; production-blocked invariant retained", () => {
    const parent = synthetic({
        stage: "preflight",
        observation: { kind: "not-run", reasonCode: "strict-script-contract" },
        blockers: [{ status: "unsupported-profile", reasonCode: "strict-script-contract" }],
    });
    rejectedAtBoth(parent, synthetic());
    rejectedAtBoth(
        parent,
        synthetic({
            stage: "preflight",
            observation: { kind: "not-run", reasonCode: "strict-script-contract" },
        }),
    );
    rejectedAtBoth(
        parent,
        synthetic({
            stage: "preflight",
            observation: { kind: "not-run", reasonCode: "async" },
            blockers: [{ status: "unsupported-feature", reasonCode: "async" }],
        }),
    );
    const positive = synthetic();
    const selection = selectionFor([positive]);
    selection.files[0].inputError = {
        status: "harness-error",
        stage: "input",
        reasonCode: "include-missing",
    };
    const ledger = newLedger(selection);
    assert.throws(() => appendAttempt(ledger, "synthetic-0", positive), /profile-not-admitted/);
    assert.equal(report(ledger).counts.pass, 0);
});

test("R2 exported classify enforces every cross-record invariant even without Classification", () => {
    const cases = [
        [
            synthetic(),
            (r) => {
                r.identity.variant = "module";
            },
        ],
        [
            synthetic({ variant: "raw" }),
            (r) => {
                r.inputs.harness = [{ path: "harness/a.js", blob: B, sha256: H }];
            },
        ],
        [
            synthetic(),
            (r) => {
                r.evidence.stage = "harness";
            },
        ],
        [
            synthetic(),
            (r) => {
                r.evidence.harnessValidated = false;
            },
        ],
        [
            synthetic({
                stage: "preflight",
                observation: { kind: "not-run", reasonCode: "input" },
            }),
            (r) => {
                r.evidence.stage = "driver";
            },
        ],
        [
            synthetic({
                stage: "preflight",
                observation: { kind: "not-run", reasonCode: "input" },
            }),
            (r) => {
                r.evidence.bodyEvaluated = true;
            },
        ],
        [
            synthetic({ body: false }),
            (r) => {
                r.evidence.stage = "preflight";
            },
        ],
        [
            synthetic({ observation: syntax }),
            (r) => {
                r.evidence.bodyEvaluated = true;
            },
        ],
        [
            synthetic({ observation: syntax }),
            (r) => {
                r.evidence.stage = "driver";
            },
        ],
        [
            synthetic({ observation: syntax }),
            (r) => {
                r.evidence.unit = null;
            },
        ],
        [
            synthetic({ observation: syntax }),
            (r) => {
                r.evidence.location = null;
            },
        ],
        [
            synthetic({ observation: thrown() }),
            (r) => {
                r.evidence.stage = "preflight";
            },
        ],
        [
            synthetic({ mode: "parser-observation" }),
            (r) => {
                r.evidence.bodyEvaluated = true;
            },
        ],
        [
            synthetic({ variant: "module", negative: neg("resolution", "ReferenceError") }),
            (r) => {
                r.identity.variant = "strict";
                r.identity.goal = "Script";
            },
        ],
        [
            synthetic({ negative: neg("parse", "SyntaxError") }),
            (r) => {
                r.evidence.bodyEvaluated = true;
            },
        ],
        [
            synthetic({
                observation: { kind: "resource-limit", guardCode: "calls", count: 64, limit: 64 },
            }),
            (r) => {
                r.inputs.limits.calls = 65;
            },
        ],
    ];
    for (const [value, mutate] of cases) {
        const expectedNegative = value.classification?.expectedNegative ?? null;
        const blockers = value.classification?.blockers ?? [];
        mutate(value);
        assert.throws(() => validateRecord(value), /protocol/);
        assert.throws(() => classify(value, expectedNegative, blockers), /protocol/);
        const core = structuredClone(value);
        delete core.classification;
        assert.throws(() => classify(core, expectedNegative, blockers), /protocol/);
    }
});

test("R2 exported classify rejects forged classification, unknown fields and observation modes", () => {
    for (const mutate of [
        (r) => {
            r.classification.status = "fail";
        },
        (r) => {
            r.extra = true;
        },
        (r) => {
            r.observation.extra = true;
        },
        (r) => {
            r.classification.expectedNegative = neg("runtime", "TypeError");
        },
    ]) {
        const r = synthetic();
        mutate(r);
        assert.throws(() => classify(r), /protocol/);
    }
    for (const mode of ["parser-observation", "body-observation"]) {
        assert.throws(() => classify(synthetic({ mode })), /protocol/);
    }
    assert.equal(classify(synthetic()).status, "pass");
});

test("R3 O14 calls guard uses active depth at boundary: 64/64 and 0/0 remain resource limits", () => {
    for (const [count, limit] of [
        [64, 64],
        [0, 0],
        [65, 64],
    ]) {
        const r = synthetic({
            observation: { kind: "resource-limit", guardCode: "calls", count, limit },
            negative: neg("runtime", "RangeError"),
        });
        assert.equal(r.classification.status, "resource-limit");
        assert.equal(r.classification.reasonCode, "calls");
        assert.equal(r.inputs.limits.calls, limit);
        assert.equal(r.evidence.bodyEvaluated, false);
        assert.equal(classify(r, neg("runtime", "RangeError")).status, "resource-limit");
        assert.deepEqual(inspectEnvelope(JSON.stringify(r), contextFor(r), transport), r);
    }
    assert.throws(
        () =>
            synthetic({
                observation: { kind: "resource-limit", guardCode: "calls", count: 63, limit: 64 },
            }),
        /protocol/,
    );
});

test("R3 O12 O13 O14 other guards retain post-increment/size overflow semantics", () => {
    for (const [guardCode, limit] of [
        ["source-units", 100000],
        ["parse-depth", 128],
        ["steps", 100000],
        ["evaluation-depth", 256],
        ["output", 1024],
    ]) {
        const r = synthetic({
            observation: { kind: "resource-limit", guardCode, count: limit + 1, limit },
        });
        assert.equal(r.classification.status, "resource-limit");
        assert.equal(r.classification.reasonCode, guardCode);
        assert.throws(
            () =>
                synthetic({
                    observation: { kind: "resource-limit", guardCode, count: limit, limit },
                }),
            /protocol/,
        );
    }
    assert.throws(
        () =>
            synthetic({
                observation: { kind: "resource-limit", guardCode: "unknown", count: 2, limit: 1 },
            }),
        /protocol/,
    );
    assert.throws(
        () =>
            synthetic({
                observation: { kind: "resource-limit", guardCode: "calls", count: 1.5, limit: 1 },
            }),
        /protocol/,
    );
});
