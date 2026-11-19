import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const dir = "docs/validation/ts-033e3a/";
mkdirSync("build/ts-033e3a", { recursive: true });
function run(command, args) {
    const r = spawnSync(command, args, { encoding: "utf8", timeout: 60000 });
    return { status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr };
}
const compiler = "node_modules/scriptc/bin/scriptc.exe";
const results = {
    node: run(process.execPath, [dir + "expr-map.ts", "seed"]),
    build: run(compiler, ["build", dir + "expr-map.ts", "--tier", "static-only", "-o", "build/ts-033e3a/expr-map.exe"]),
    coverage: run(compiler, ["coverage", dir + "expr-map.ts"]),
};
if (results.build.status === 0) results.native = run("build/ts-033e3a/expr-map.exe", ["seed"]);
writeFileSync(dir + "expr-map-results.json", JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
