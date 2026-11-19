// FUTURE implementation test. Design work must not run this guest/driver suite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as producer from "../../build/node/src/script-observation.js";
import { parseScriptDriverResult } from "./script-driver-result.mjs";
const evidence = "docs/validation/ts-035e3d-p/correction";
const pins = {
    "future-literals.json": "c9e11ac4f8bcfec1c9aa029fe55bb0abca1182e795b7bfb8c3ddd3db938740b2",
    "argv-negatives.json": "9bfad0ab8c1165ba5671bb9c36dc2a12414f8aa717a4c080f29d73c0f3e7835a",
    "source-negatives.json": "ddbd073ffc9390fd09206dd46dfbeda20c4443d10edeaa20d2aad42db0a4268a",
};
const read = (p) => {
    const b = readFileSync(join(evidence, p));
    assert.equal(createHash("sha256").update(b).digest("hex"), pins[p], p);
    return JSON.parse(b);
};
const rows = read("future-literals.json");
const expectedIDs = [];
for (const lane of ["node", "native"]) {
    for (const input of ["alpha", "beta"]) {
        for (const layout of ["original", "repeat"]) {
            for (const control of [
                "B01",
                "B02",
                "B03",
                "B04",
                "B05",
                "B06",
                "B07",
                "B08",
                "B09",
                "B10",
                "B11",
                "B12",
                "B13",
                "B14",
                "B15",
                "B16",
                "N01",
                "N02",
                "I01",
            ]) {
                expectedIDs.push(lane + "/" + input + "/" + layout + "/" + control);
            }
        }
    }
}
for (const lane of ["node", "native"]) {
    for (const layout of ["original", "repeat"]) {
        for (const limit of ["steps", "calls"]) {
            expectedIDs.push(lane + "/alpha/" + layout + "/B01/zero-" + limit);
        }
    }
}
assert.deepEqual(
    rows.map((r) => r.id),
    expectedIDs,
);
const {
    validateConformancePreflightArguments: validate,
    produceConformancePreflightControl: produce,
} = producer;
function setup(row) {
    const directory = mkdtempSync(resolve("build", "preflight-producer-")),
        result = join(directory, "child.json");
    const paths = row.sourceTexts.map((text, n) => {
        const path = join(directory, "source-" + n + ".js");
        writeFileSync(path, text, { flag: "wx" });
        return path;
    });
    const argv = row.argv.map((x) =>
        x === "RESULT" ? result : /^SOURCE-\d+$/.test(x) ? paths[Number(x.slice(7))] : x,
    );
    return { directory, result, argv, paths };
}
function launch(row, s) {
    const node = row.lane === "node",
        entry = resolve(
            node ? "build/node/test/script-observation.js" : "build/native/script-observation.exe",
        );
    return spawnSync(node ? process.execPath : entry, node ? [entry, ...s.argv] : s.argv, {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1048576,
    });
}
test("closed API surface, exact direct parser and source errors", () => {
    assert.equal(validate.length, 1);
    assert.equal(produce.length, 2);
    for (const row of read("argv-negatives.json")) {
        assert.throws(() => validate(row.argv), { message: row.error }, row.id);
        assert.throws(() => produce(row.argv, []), { message: row.error }, row.id);
    }
    for (const row of read("source-negatives.json")) {
        assert.throws(() => produce(row.argv, row.sourceTexts), { message: row.error }, row.id);
    }
    for (const value of [null, {}, "", Array(29)]) {
        assert.throws(() => validate(value), { message: "script-preflight/arguments" });
    }
    const first = rows[0];
    for (const value of [null, {}, [], Array(4)]) {
        assert.throws(() => produce(first.argv, value), {
            message: "script-preflight/source-texts",
        });
    }
    // E3b must retain its original refusal of unvalidated nonraw requests.
    const ordinary = [
        "conformance",
        "strict",
        "execute",
        "nonce",
        "a".repeat(64),
        "-",
        "RESULT",
        "100000",
        "128",
        "100000",
        "64",
        "256",
        "10000",
        "1048576",
        "u0",
        "test",
        "SOURCE-0",
    ];
    assert.throws(() => producer.validateConformanceScriptArguments(ordinary), {
        message: "script-producer/variant-preflight",
    });
});
test("all160 complete future child+report literals and bindings, actual both hosts", () => {
    for (const row of rows) {
        const s = setup(row),
            p = launch(row, s);
        assert.equal(p.error, undefined, row.id);
        assert.equal(p.signal, row.process.signal, row.id);
        assert.equal(p.status, row.process.status, row.id);
        assert.equal(p.stdout, row.process.stdout, row.id);
        assert.equal(p.stderr, row.process.stderr, row.id);
        const bytes = readFileSync(s.result),
            child = JSON.parse(bytes),
            report = JSON.parse(readFileSync(s.result + ".control.json"));
        assert.deepEqual({ child, report }, row.expected, row.id);
        assert.deepEqual(parseScriptDriverResult(bytes, row.binding), row.expected.child, row.id);
        for (let n = 0; n < s.paths.length; n++) {
            assert.equal(readFileSync(s.paths[n], "utf8"), row.sourceTexts[n]);
        }
    }
});
test("direct host producer fresh construction and return-data isolation", () => {
    for (const row of rows.filter((r) => r.lane === "node")) {
        assert.deepEqual(produce(row.argv, row.sourceTexts), row.expected, row.id);
    }
    const row = rows[0],
        first = produce(row.argv, row.sourceTexts);
    first.child.completedUnits.length = 0;
    first.report.passed = false;
    first.report.observed.push(999);
    assert.deepEqual(produce(row.argv, row.sourceTexts), row.expected);
    const different = rows.find(
        (r) => r.lane === "node" && r.control === "I01" && r.input === "beta",
    );
    assert.deepEqual(produce(different.argv, different.sourceTexts), different.expected);
    assert.deepEqual(produce(row.argv, row.sourceTexts), row.expected);
});
test("malformed argv has fully present sources, exclusive late files and read priority", () => {
    for (const lane of ["node", "native"]) {
        for (const negative of read("argv-negatives.json")) {
            // Other prefixes retain the old observation dispatch, including its IO.
            // Direct API checks above cover all64; exactly57 select the new branch.
            if (negative.argv[0] !== "conformance-preflight-v1") {
                continue;
            }
            const row = { ...rows[0], lane, argv: negative.argv };
            const s = setup(row),
                p = launch(row, s);
            assert.equal(p.error, undefined);
            assert.equal(p.signal, null);
            assert.equal(p.status, 70);
            assert.equal(p.stdout, "");
            assert.equal(p.stderr, "Script observation driver fault\n");
            assert.equal(existsSync(s.result), false);
            assert.equal(existsSync(s.result + ".control.json"), false);
            for (let n = 0; n < s.paths.length; n++) {
                assert.equal(readFileSync(s.paths[n], "utf8"), row.sourceTexts[n]);
            }
        }
        for (const negative of read("source-negatives.json")) {
            const row = {
                ...rows[0],
                lane,
                argv: negative.argv,
                sourceTexts: negative.sourceTexts,
            };
            const s = setup(row),
                p = launch(row, s);
            assert.equal(p.error, undefined);
            assert.equal(p.signal, null);
            assert.equal(p.status, 70);
            assert.equal(p.stdout, "");
            assert.equal(p.stderr, "Script observation driver fault\n");
            assert.equal(existsSync(s.result), false);
            assert.equal(existsSync(s.result + ".control.json"), false);
            for (let n = 0; n < s.paths.length; n++) {
                assert.equal(readFileSync(s.paths[n], "utf8"), row.sourceTexts[n]);
            }
        }
        const row = { ...rows[0], lane };
        const missing = setup(row);
        missing.argv[missing.argv.length - 1] = join(missing.directory, "absent.js");
        const p = launch(row, missing);
        assert.equal(p.error, undefined);
        assert.equal(p.signal, null);
        assert.equal(p.status, 70);
        assert.equal(p.stdout, "");
        assert.equal(p.stderr, "Script observation driver fault\n");
        assert.equal(existsSync(missing.result), false);
        assert.equal(existsSync(missing.result + ".control.json"), false);
        const existing = setup(row);
        writeFileSync(existing.result, "original", { flag: "wx" });
        const e = launch(row, existing);
        assert.equal(e.error, undefined);
        assert.equal(e.signal, null);
        assert.equal(e.status, 70);
        assert.equal(e.stdout, "");
        assert.equal(e.stderr, "Script observation driver fault\n");
        assert.equal(readFileSync(existing.result, "utf8"), "original");
        assert.equal(existsSync(existing.result + ".control.json"), false);
        const reportExists = setup(row);
        writeFileSync(reportExists.result + ".control.json", "original report", { flag: "wx" });
        const r = launch(row, reportExists);
        assert.equal(r.error, undefined);
        assert.equal(r.signal, null);
        assert.equal(r.status, 70);
        assert.equal(r.stdout, "");
        assert.equal(r.stderr, "Script observation driver fault\n");
        assert.deepEqual(JSON.parse(readFileSync(reportExists.result)), row.expected.child);
        assert.equal(
            readFileSync(reportExists.result + ".control.json", "utf8"),
            "original report",
        );
    }
});
