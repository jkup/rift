import { readFixtureFile as readFile } from "./test-support/fixture-files.mjs";
import { scratchRoot } from "./test-support/environment.mjs";
import test, { after } from "node:test";
import { acquireScriptTestLease } from "../../test/fixtures/tooling/ts-035c/test-lease.mjs";
const releaseLease = await acquireScriptTestLease();
after(releaseLease);
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { prepareScriptObservation, launchScriptObservation } from "./script-observe.mjs";
import { inspectScriptEnvelope, parseScriptEnvelope } from "./script-result.mjs";
const registry = JSON.parse(await readFile("test/fixtures/script-observation/controls.json"));
const archiveRoot = join(scratchRoot, "script-observations");
await mkdir(archiveRoot, { recursive: true });
const lanes = process.argv[2] === "node" ? ["node"] : ["node", "native"];
const results = [];
for (const lane of lanes) {
    for (const input of registry.inputs) {
        test("actual " + lane + "/" + input + " frozen registered controls", async () => {
            for (const row of registry.rows) {
                const limits =
                    row.id === "loop" ? { steps: Number.MAX_SAFE_INTEGER, wallMs: 750 } : {};
                const plan = await prepareScriptObservation({
                    mode: "script-observation",
                    control: row.id,
                    input,
                    lane,
                    variant: row.variant,
                    action: row.action,
                    archiveRoot,
                    limits,
                });
                const result = await launchScriptObservation(plan);
                results.push({
                    lane,
                    input,
                    id: row.id,
                    directory: result.directory,
                    state: result.state,
                    record: result.record ?? null,
                });
                await writeFile(
                    join(scratchRoot, "script-observation-integration.json"),
                    JSON.stringify(results, null, 2) + "\n",
                );
                const label = lane + "/" + input + "/" + row.id + " " + result.directory;
                assert.equal(result.state, row.expectedState ?? "complete", label);
                const r = result.record ?? result.failure.record,
                    e = row.expected;
                if (row.expectedState) {
                    assert.equal(r.observation.kind, e.kind, label);
                    assert.equal(r.evidence.operation.phase, e.phase, label);
                    assert.equal(r.evidence.stage, "harness", label);
                    assert.equal(r.evidence.harnessValidated, false, label);
                    assert.equal(r.evidence.preflightId, null, label);
                    assert.equal(plan.binding.preflightId, null, label);
                    continue;
                }
                assert.equal(r.observation.kind, e.kind, label);
                assert.equal(Object.hasOwn(r, "classification"), false, label);
                if (e.kind !== "host-fault" && e.kind !== "timeout") {
                    assert.equal(r.evidence.operation.phase, e.phase, label);
                    assert.equal(r.evidence.operation.stage, e.stage ?? "test", label);
                    assert.equal(
                        r.evidence.testBodyEvaluated,
                        (e.stage ?? "test") === "test" && e.phase === "body",
                        label,
                    );
                }
                if (Object.hasOwn(e, "constructor")) {
                    assert.equal(r.observation.constructor.outcome, e.constructor, label);
                    if (e.name !== undefined) {
                        assert.equal(r.observation.constructor.name, e.name, label);
                    }
                    if (e.realm !== undefined) {
                        assert.equal(r.observation.constructor.realmId, e.realm, label);
                    }
                }
                if (e.secondaryUnit) {
                    assert.equal(
                        r.observation.constructor.secondary.site.unitId,
                        e.secondaryUnit,
                        label,
                    );
                    assert.equal(
                        r.observation.constructor.secondary.site.realmId,
                        e.secondaryRealm,
                        label,
                    );
                    assert.notEqual(r.observation.original.site.unitId, e.secondaryUnit, label);
                }
                if (e.sourceUnit) {
                    assert.equal(r.evidence.source.unitId, e.sourceUnit, label);
                }
                if (e.capability) {
                    assert.equal(r.observation.capabilityCode, e.capability, label);
                }
                if (e.guard) {
                    assert.equal(r.observation.guardCode, e.guard, label);
                }
                if (e.kind === "resource-limit") {
                    assert.equal(
                        r.observation.count,
                        r.observation.limit + (r.observation.guardCode === "calls" ? 0 : 1),
                        label,
                    );
                    assert.equal(r.evidence.inspection.original.valueKind, "object", label);
                }
                if (e.rule) {
                    assert.equal(r.observation.ruleCode, e.rule, label);
                }
                if (e.effects && e.kind !== "host-fault") {
                    assert.equal(result.report.effects, e.effects, label);
                }
                if (e.values) {
                    assert.deepEqual(
                        result.report.observed,
                        e.values[input === "alpha" ? 0 : 1],
                        label,
                    );
                    assert.deepEqual(r.observation, { kind: "normal" }, label);
                }
                if (row.variant === "raw") {
                    assert.equal(r.inputs.preflightId, null, label);
                    assert.equal(r.evidence.harnessValidated, false, label);
                } else {
                    assert.ok(r.inputs.preflightId, label);
                    assert.equal(r.evidence.harnessValidated, e.kind !== "host-fault", label);
                    const p = JSON.parse(await readFile(join(plan.directory, "preflight.json")));
                    assert.equal(p.passed, true, label);
                    assert.equal(p.rows.length, 19, label);
                    assert.ok(
                        p.rows.every((x) => x.valid),
                        label,
                    );
                }
                if (row.id === "loop") {
                    const out = await readFile(join(result.directory, "stdout.bin"), "utf8");
                    assert.equal(out.split("SCRIPT_LOOP_ENTERED").length - 1, 1, label);
                    assert.equal(r.evidence.process.deadlineExpired, true, label);
                }
                if (row.id === "loop-preentry") {
                    assert.equal(
                        (await readFile(join(result.directory, "stdout.bin"), "utf8")).includes(
                            "SCRIPT_LOOP_ENTERED",
                        ),
                        false,
                        label,
                    );
                }
                const f = result.facts,
                    t = {
                        process: f.process,
                        outputBytes: f.outputBytes,
                        outputLimit: f.outputLimit,
                        capCount: f.capCount,
                        capKilled: f.capKilled,
                        crashBeforeCap: f.crashBeforeCap,
                    };
                assert.deepEqual(parseScriptEnvelope(JSON.stringify(r), plan.binding), r, label);
                assert.deepEqual(
                    inspectScriptEnvelope(JSON.stringify(r), plan.context, t, plan.binding),
                    r,
                    label,
                );
            }
        });
    }
}
