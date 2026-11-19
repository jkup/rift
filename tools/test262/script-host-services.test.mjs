import { readFixtureFileSync as readFileSync } from "./test-support/fixture-files.mjs";
import assert from "node:assert/strict";

import { createHash } from "node:crypto";
import * as api from "./script-host-services.mjs";
const root = new URL("../../", import.meta.url);
const bytes = readFileSync(
    new URL("test/fixtures/tooling/ts-035e3e-p/descriptor-literals.json", root),
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(
    hash(bytes),
    "dd1bdd87aef2815491a2782cc06817f322f5ec5c35991a77bca8fac60ea3af0f",
    "literal fixture bytes",
);
const literals = JSON.parse(bytes);
assert.deepEqual(Object.keys(api), ["describeScriptHostServices"]);
assert.equal(api.describeScriptHostServices.length, 2);
assert.equal(literals.length, 20);
for (const row of literals) {
    const actual = api.describeScriptHostServices(...row.args);
    assert.deepEqual(actual, row.expected, "whole independent descriptor " + row.args.join("/"));
    assert.equal(JSON.stringify(actual), JSON.stringify(row.expected), "canonical order");
    assert.notEqual(actual, api.describeScriptHostServices(...row.args));
    assert.equal(actual.data.currentSourceVerified, false);
    assert.equal(actual.data.buildCertification, "unavailable");
    assert.equal(actual.data.authority, "none");
    const visit = (x) => {
        if (x && typeof x === "object") {
            assert.ok(Object.isFrozen(x));
            Object.values(x).forEach(visit);
        }
    };
    visit(actual);
    assert.throws(() => {
        actual.data.realms[0].profile = "legacy";
    }, TypeError);
}
// The whole-descriptor literals above pin the historical snapshot. Comparing it
// to today's source would incorrectly turn descriptive data into a build gate.
for (const [args, code] of [
    [[], "arguments"],
    [["main"], "arguments"],
    [["main", null, 0], "arguments"],
    [[null, null], "purpose"],
    [["script-observation", null], "purpose"],
    [["main", "B09"], "control"],
    [["conformance-preflight-v1", null], "control"],
    [["conformance-preflight-v1", "S01"], "control"],
    [["conformance-preflight-v1", "U01"], "control"],
    [["conformance-preflight-v1", {}], "control"],
]) {
    assert.throws(() => api.describeScriptHostServices(...args), {
        message: "script-host-services/" + code,
    });
}
console.log(
    "20 historical descriptor literals; no current-build authority; frozen detached data; 10 exact boundary errors",
);
