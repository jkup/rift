import test from "node:test";
import assert from "node:assert/strict";
import {
    measureStructure,
    structuralViolations,
    compareStructure,
} from "./readability-structure.mjs";

test("structure measures nesting independently of callbacks and flat else-if chains", () => {
    const metrics = measureStructure(
        "src/example.ts",
        `
function inspect() {
  if (a) { if (b) { if (c) { if (d) { if (e) { use(); } } } } }
  else if (other) { use(); }
  register(() => { if (ready) { use(); } });
}`,
    );
    assert.equal(metrics.find((entry) => entry.name === "inspect").depth, 5);
    assert.equal(metrics.find((entry) => entry.name.includes("callback")).depth, 1);
    assert.equal(structuralViolations(metrics)[0].rule, "depth");
});

test("size excludes blank and comment-only lines and exempts test matrices", () => {
    const source = "// header\n\nfunction check() {\n/* comment */\n  use();\n}\n";
    const metrics = measureStructure("src/example.ts", source);
    assert.equal(metrics[0].fileLines, 3);
    assert.equal(metrics[1].functionLines, 3);
    const testMetrics = measureStructure("test/example.ts", source);
    assert.equal(testMetrics[0].fileLines, 0);
    assert.equal(testMetrics[1].functionLines, 0);
});

test("baseline fails for growth, new violations, stale allowances and invalid records", () => {
    const entry = { filename: "src/example.ts", name: "inspect", rule: "depth", value: 5 };
    assert.deepEqual(compareStructure([entry], [entry]), []);
    assert.match(compareStructure([{ ...entry, value: 6 }], [entry])[0], /Increased/);
    assert.match(compareStructure([entry], [])[0], /New/);
    assert.match(compareStructure([], [entry])[0], /Remove resolved/);
    assert.match(compareStructure([entry], [{ ...entry, value: 6 }])[0], /Reduce baseline/);
    assert.match(compareStructure([], [{ ...entry, value: 3 }])[0], /Invalid/);
    assert.match(compareStructure([entry], [entry, entry])[0], /duplicate/);
});
