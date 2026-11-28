import assert from "node:assert/strict";
import { test } from "node:test";
import { probeVerdict } from "./probe-verdict.mjs";
import { expectedProbeOutput } from "./compiler-expectations.mjs";
import { readdirSync } from "node:fs";

const staticReport = `scriptc coverage values.ts
  statements analyzed   39
  compile statically    39  (100%)
  fully static — all analyzed statements compile to native code.`;

function success(stdout = "") {
    return { status: 0, signal: null, error: null, stdout, stderr: "" };
}

function fixture() {
    return {
        build: success(),
        coverage: success(staticReport),
        node: success("result\n"),
        native: success("result\n"),
    };
}

test("accepts expected successful execution and the intentional host exit", () => {
    assert.equal(probeVerdict(fixture()), "PASS");
    const f = fixture();
    f.expectedStatus = 3;
    f.node.status = f.native.status = 3;
    assert.equal(probeVerdict(f), "PASS");
});

test("matching unexpected exits cannot pass", () => {
    const f = fixture();
    f.node.status = f.native.status = 1;
    f.node.stdout = f.native.stdout = "";
    assert.equal(probeVerdict(f), "NODE-FAIL");
});

test("matching incorrect or empty output cannot satisfy an independent expectation", () => {
    for (const stdout of ["", "wrong\n"]) {
        const f = fixture();
        f.expectedStdout = "result\n";
        f.node.stdout = f.native.stdout = stdout;
        assert.equal(probeVerdict(f), "NODE-OUTPUT-FAIL");
    }
});

test("expected stdout is enforced in both lanes without weakening transport or coverage gates", () => {
    const f = fixture();
    f.expectedStdout = "result\n";
    assert.equal(probeVerdict(f), "PASS");
    f.native.stdout = "wrong\n";
    assert.equal(probeVerdict(f), "NATIVE-OUTPUT-FAIL");
    f.native.status = 1;
    assert.equal(probeVerdict(f), "NATIVE-FAIL");
    f.coverage.stdout = "unknown coverage";
    assert.equal(probeVerdict(f), "COVERAGE-UNKNOWN");
});

test("every compiler probe has a nonempty expectation and unknown probes fail closed", () => {
    const names = readdirSync(new URL("../test/compiler/", import.meta.url))
        .filter((file) => file.endsWith(".ts"))
        .map((file) => file.slice(0, -3));
    assert.ok(names.length > 0);
    for (const name of names) {
        const stdout = expectedProbeOutput(name);
        assert.ok(stdout.length > 1 && stdout.endsWith("\n"), name);
    }
    for (const name of ["missing-probe", "toString", "__proto__"]) {
        assert.throws(() => expectedProbeOutput(name), /Missing expected output/);
    }
});

for (const lane of ["build", "coverage", "node", "native"]) {
    for (const [kind, failure] of Object.entries({
        exit: { status: 1 },
        signal: { status: null, signal: "SIGTERM" },
        timeout: { status: null, error: { code: "ETIMEDOUT", message: "timed out" } },
        spawn: { status: null, error: { code: "ENOENT", message: "missing executable" } },
    })) {
        test(`rejects ${lane} ${kind}, even with matching stdout`, () => {
            const f = fixture();
            Object.assign(f[lane], failure);
            assert.equal(probeVerdict(f), `${lane.toUpperCase()}-FAIL`);
        });
    }
}

test("fails closed on missing, changed or incomplete coverage reports", () => {
    for (const report of [
        "",
        "new format",
        "in dynamic tier 0",
        staticReport.replace("39  (100%)", "38  (100%)"),
        staticReport.replace("fully static", "partially static"),
        staticReport.replaceAll("39", "0"),
    ]) {
        const f = fixture();
        f.coverage.stdout = report;
        assert.equal(probeVerdict(f), "COVERAGE-UNKNOWN");
    }
});

test("rejects dynamic coverage and output differences", () => {
    const f = fixture();
    f.coverage.stdout += "\n  in dynamic tier   1";
    assert.equal(probeVerdict(f), "DYNAMIC");
    f.coverage.stdout = staticReport;
    f.native.stdout = "different\n";
    assert.equal(probeVerdict(f), "OUTPUT-DIFF");
});
