import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { completed, probeVerdict } from "./probe-verdict.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const scriptc = join(root, "node_modules/scriptc/bin/scriptc.exe");
const suffix = process.platform === "win32" ? ".exe" : "";
mkdirSync(join(root, "build/native"), { recursive: true });
function run(args) {
    const r = spawnSync(scriptc, args, { cwd: root, encoding: "utf8", timeout: 600000 });
    return { status: r.status, signal: r.signal, error: r.error ? { code: r.error.code, message: r.error.message } : null, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
const results = [];
for (const [entry, name] of [["src/cli.ts", "rift"], ["test/realms.ts", "realms"], ["test/object-descriptors.ts", "object-descriptors"], ["test/object-prototypes.ts", "object-prototypes"], ["test/object-keys.ts", "object-keys"], ["test/conversion.ts", "conversion"], ["test/definition-dispatch.ts", "definition-dispatch"], ["test/array-storage.ts", "array-storage"], ["test/array-like.ts", "array-like"], ["test/operation-context.ts", "operation-context"], ["test/array-map.ts", "array-map"], ["test/array-literals.ts", "array-literals"], ["test/property-key-conversion.ts", "property-key-conversion"], ["test/numeric-operators.ts", "numeric-operators"], ["test/addition.ts", "addition"], ["test/relational.ts", "relational"], ["test/primitive-conversion.ts", "primitive-conversion"], ["test/operator-coercion.ts", "operator-coercion"], ["test/key-coercion.ts", "key-coercion"], ["test/length-coercion.ts", "length-coercion"], ["test/array-length-coercion.ts", "array-length-coercion"], ["test/function-call.ts", "function-call"], ["test/object-valueof.ts", "object-valueof"], ["test/array-string-conversion.ts", "array-string-conversion"], ["test/function-string-conversion.ts", "function-string-conversion"], ["test/abstract-equality.ts", "abstract-equality"], ["test/delete-operator.ts", "delete-operator"], ["test/typeof-void.ts", "typeof-void"], ["test/in-operator.ts", "in-operator"], ["test/primitive-reads.ts", "primitive-reads"], ["test/property-assignment.ts", "property-assignment"], ["test/compound-assignment.ts", "compound-assignment"], ["test/structured-outcomes.ts", "structured-outcomes"], ["src/observation-driver.ts", "observation-driver"], ["test/observation-serialization.ts", "observation-serialization"], ["test/return-audit.ts", "return-audit"], ["test/number-radix.ts", "number-radix"], ["test/script-metadata.ts", "script-metadata"], ["test/global-environment.ts", "global-environment"], ["test/script-realm-bootstrap.ts", "script-realm-bootstrap"], ["test/script-declarations.ts", "script-declarations"], ["test/script-global-declarations.ts", "script-global-declarations"], ["test/script-record.ts", "script-record"]]) {
    const build = run(["build", entry, "--tier", "static-only", "-o", join(root, "build/native", name + suffix)]);
    const coverage = run(["coverage", entry]);
    // Reuse the fail-closed pinned coverage parser. Execution has its own suite.
    const success = { status: 0, signal: null, error: null, stdout: "" };
    const verdict = probeVerdict({ build, coverage, node: success, native: success });
    results.push({ entry, build, coverage, verdict });
    console.log(`${verdict} ${entry}`);
    if (!completed(build)) console.error(build.stderr);
    if (verdict !== "PASS") console.error(coverage.stdout, coverage.stderr);
}
writeFileSync(join(root, "build/native-build-results.json"), JSON.stringify(results, null, 2));
process.exitCode = results.every(r => r.verdict === "PASS") ? 0 : 1;
