import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const lane = process.argv[2];
if (process.argv.length !== 3 || !["node", "native"].includes(lane)) throw new Error("usage: run-guests.mjs node|native");
const suffix = process.platform === "win32" ? ".exe" : "";
const command = lane === "node" ? process.execPath : join(root, "build/native/rift" + suffix);
const prefix = lane === "node" ? [join(root, "build/node/src/cli.js")] : [];
const cases = JSON.parse(readFileSync(join(root, "test/cases.json"), "utf8"));
const generated = [
    ["duplicate", "let x; let x;", 2, "parse SyntaxError: duplicate binding: x"],
    ["duplicate-param", "function f(x,x) {}", 2, "parse SyntaxError: duplicate parameter: x"],
    ["param-let", "function f(x) { let x; }", 2, "parse SyntaxError: duplicate binding: x"],
    ["const", "const x = 1;", 2, "parse SyntaxError: unsupported or unexpected syntax: const"],
    ["increment", "let x=1; x++ + 2;", 2, "parse SyntaxError: unsupported operator: ++"],
    ["assignment-target", "1 = 2;", 2, "parse SyntaxError: invalid assignment target"],
    ["break", "break;", 2, "parse SyntaxError: break outside loop"],
    ["continue", "continue;", 2, "parse SyntaxError: continue outside loop"],
    ["return", "return 1;", 2, "parse SyntaxError: return outside function"],
    ["cross-function-break", "while(true) { function f() { break; } }", 2, "parse SyntaxError: break outside loop"],
    ["asi", "let x = 1\nconsole.log(x);", 2, "parse SyntaxError: expected ';'"],
    ["newline-return", "function f() { return\n 1; }", 2, "parse SyntaxError: newline after return/throw is unsupported"],
    ["newline-throw", "throw\n1;", 2, "parse SyntaxError: newline after return/throw is unsupported"],
    ["string", "'unterminated", 2, "parse SyntaxError: unterminated string"],
    ["comment", "/* unterminated", 2, "parse SyntaxError: unterminated comment"],
    ["number", "console.log(01);", 2, "parse SyntaxError: leading-zero numbers are unsupported"],
    ["exponent", "console.log(1e2);", 2, "parse SyntaxError: unsupported numeric literal"],
    ["proto", "let o={__proto__: null};", 2, "parse SyntaxError: prototype literal syntax is unsupported"],
    ["coercion", "console.log(1 + '2');", 1, "runtime TypeError: numeric operands required (coercion unsupported)"],
    ["numeric-key", "let o={}; o[1]=2;", 1, "runtime TypeError: only string property keys are supported"],
    ["primitive-base", "console.log(null.x);", 1, "runtime TypeError: property base must be an object"],
    ["detached", "let o={x:1, f:function(){return this.x;}}; let f=o.f; f();", 1, "runtime TypeError: property base must be an object"],
    ["assignment-missing", "missing=1;", 1, "runtime ReferenceError: missing is not defined"],
    ["self-tdz", "let x=x;", 1, "runtime ReferenceError: x is not initialized"],
    ["readonly", "undefined=1;", 1, "runtime TypeError: binding is not mutable: undefined"],
    ["not-callable", "let x=1; x(console.log('arg'));", 1, "runtime TypeError: value is not callable", "arg\n"],
    ["abrupt-args", "function f(a,b) {} f(missing,console.log('no'));", 1, "runtime ReferenceError: missing is not defined"],
    ["parse-before-execute", "console.log('no'); const x=1;", 2, "parse SyntaxError: unsupported or unexpected syntax: const"],
    ["syntax-depth", "(".repeat(200) + "1" + ")".repeat(200) + ";", 2, "parse SyntaxError: syntax nesting limit exceeded"],
    ["eval-depth", "1" + "+1".repeat(1000) + ";", 1, "runtime RangeError: evaluation nesting limit exceeded"],
    ["source-limit", " ".repeat(100001), 2, "parse SyntaxError: source exceeds 100000 UTF-16 units"],
    ["string-operator", "1 '+' 2;", 2, "parse SyntaxError: expected ';'"],
    ["nested-call-blocks", "function f() {" + "{".repeat(50) + "f();" + "}".repeat(50) + "} f();", 1, "runtime RangeError: evaluation nesting limit exceeded"],
];
mkdirSync(join(root, "build/guest-fixtures"), { recursive: true });
for (const [name, source, status, errorContains, stdout = ""] of generated) {
    const file = "build/guest-fixtures/" + name + ".js";
    writeFileSync(join(root, file), source);
    cases.push({ file, status, errorContains, stdout });
}
const results = [];
function execute(name, executable, args, expected) {
    const r = spawnSync(executable, args, { cwd: root, encoding: "utf8", timeout: 10000 });
    const stdout = (r.stdout ?? "").replaceAll("\r\n", "\n");
    const stderr = (r.stderr ?? "").replaceAll("\r\n", "\n");
    let verdict = "PASS";
    if (r.error) verdict = r.error.code === "ETIMEDOUT" ? "TIMEOUT" : "HARNESS-FAIL";
    else if (r.signal || r.status === null || r.status === 127 || r.status < 0) verdict = "CRASH";
    else if (r.status !== (expected.status ?? 0)) verdict = "STATUS-FAIL";
    else if (stdout !== (expected.stdout ?? "")) verdict = "OUTPUT-FAIL";
    else if (expected.error ? stderr !== name + ":" + expected.error + "\n"
        : expected.errorPattern ? !new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":" + expected.errorPattern + "\n$").test(stderr)
        : expected.errorContains ? !stderr.includes(expected.errorContains)
        : stderr !== (expected.stderr ?? "")) verdict = "ERROR-FAIL";
    const result = { name, verdict, status: r.status, signal: r.signal, error: r.error ? { code: r.error.code, message: r.error.message } : null, stdout, stderr, expected };
    results.push(result);
    console.log(`${verdict} ${name}`);
    if (verdict !== "PASS") console.error(result);
}
for (const c of cases) execute(c.file, command, [...prefix, c.file], c);
execute("inline", command, [...prefix, "-e", "console.log(6 * 7);"], { stdout: "42\n" });
execute("usage", command, prefix, { status: 64, stderr: "usage: rift <file.js> | -e <source>\n" });
execute("missing-inline", command, [...prefix, "-e"], { status: 64, stderr: "usage: rift <file.js> | -e <source>\n" });
execute("io", command, [...prefix, "build/nonexistent-guest.js"], { status: 66, stderr: "cannot read source: build/nonexistent-guest.js\n" });
const realmCommand = lane === "node" ? process.execPath : join(root, "build/native/realms" + suffix);
const realmPrefix = lane === "node" ? [join(root, "build/node/test/realms.js")] : [];
execute("realms", realmCommand, [...realmPrefix, "test/fixtures/realm-setup.js", "test/fixtures/realm-check.js"], { stdout: "a 41\nb 7 undefined\na 42\na 23\nrealms independent\n" });
writeFileSync(join(root, `build/guest-${lane}-results.json`), JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.verdict === "PASS").length}/${results.length} passed; no skips`);
process.exitCode = results.every(r => r.verdict === "PASS") ? 0 : 1;
