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
    ["coercion", "console.log(1 + '2');", 0, "", "12\n"],
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
// Write actual line terminators into runtime files, rather than guest escapes.
// All five forms must agree on comment boundaries and source coordinates.
function lineCase(name, source, expected) {
    const file = "build/guest-fixtures/" + name + ".js";
    writeFileSync(join(root, file), source);
    cases.push({ file, ...expected });
}
lineCase("numeric-key", "let o={}; o[1]=2; console.log(o[1], o['1']);", { stdout: "2 2\n" });
// Array literal parser boundaries retain exact phases and located diagnostics.
for (const [name, source, expected] of [
    ["eof", "let a = [", { status: 2, error: "1:10: parse SyntaxError: unsupported or unexpected syntax: <eof>" }],
    ["separator", "let a = [1 2];", { status: 2, error: "1:12: parse SyntaxError: expected ']', found '2'" }],
    ["delimiter", "let a = [1);", { status: 2, error: "1:11: parse SyntaxError: expected ']', found ')'" }],
    ["spread", "let a = [...x];", { status: 2, error: "1:10: parse SyntaxError: array spread is unsupported" }],
    ["binding-pattern", "let [x] = [1];", { status: 2, error: "1:5: parse SyntaxError: expected binding identifier" }],
    ["assignment-pattern", "[x] = [1];", { status: 2, error: "1:1: parse SyntaxError: invalid assignment target" }],
    ["comma-operator", "let a = [(1, 2)];", { status: 2, error: "1:12: parse SyntaxError: expected ')', found ','" }],
    ["numeric-key", "let a = [1]; console.log(a[0]);", { stdout: "1\n" }],
    ["deep", "[".repeat(200) + "0" + "]".repeat(200) + ";", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["nested-success", "console.log(" + "[".repeat(30) + "1" + "]".repeat(30) + ".length);", { stdout: "1\n" }],
    ["throw", "function stop() {\n    throw 'stop';\n}\nlet a = [console.log('first'), stop(), console.log('later')];", { status: 1, stdout: "first\n", error: "2:5: runtime Uncaught: stop" }],
    ["missing", "let a = [console.log('first'), missing, console.log('later')];", { status: 1, stdout: "first\n", error: "1:32: runtime ReferenceError: missing is not defined" }],
    ["holes-loop-budget", "while (true) { [" + ",".repeat(1000) + "]; }", { status: 1, errorPattern: "1:\\d+: runtime RangeError: execution step limit exceeded" }],
]) {
    lineCase("array-literal-" + name, source, expected);
}
// Conditional failures assert the phase, diagnostic and effects before completion.
for (const key of ["NaN", "POSITIVE_INFINITY", "NEGATIVE_INFINITY", "MAX_VALUE", "MIN_VALUE", "EPSILON", "MAX_SAFE_INTEGER", "MIN_SAFE_INTEGER"]) {
    lineCase("number-readonly-" + key, "Number." + key + " = console.log('rhs'); console.log('after');", {
        status: 1, stdout: "rhs\n", error: "1:1: runtime TypeError: property is not writable: " + key,
    });
}
for (const predicate of ["isNaN", "isFinite"]) {
    lineCase("number-abrupt-extra-" + predicate, "Number." + predicate + "(0, missing, console.log('after'));", {
        status: 1, errorPattern: "1:\\d+: runtime ReferenceError: missing is not defined",
    });
    for (const key of ["name", "length"]) {
        lineCase("number-metadata-" + predicate + "-" + key, "Number." + predicate + "." + key + " = 2;", {
            status: 1, error: "1:1: runtime TypeError: property is not writable: " + key,
        });
    }
}
lineCase("number-noncallable", "Number(console.log('arg'));", {
    status: 1, stdout: "arg\n", error: "1:1: runtime TypeError: value is not callable",
});
for (const [name, source, expected] of [
    ["missing-colon", "true ? 1;", { status: 2, error: "1:9: parse SyntaxError: expected ':', found ';'" }],
    ["missing-consequent", "true ? : 1;", { status: 2, error: "1:8: parse SyntaxError: unsupported or unexpected syntax: :" }],
    ["missing-alternate", "true ? 1 :;", { status: 2, error: "1:11: parse SyntaxError: unsupported or unexpected syntax: ;" }],
    ["alternate-eof", "true ? 1 :", { status: 2, error: "1:11: parse SyntaxError: unsupported or unexpected syntax: <eof>" }],
    ["assignment-target", "(true ? a : b) = 1;", { status: 2, error: "1:1: parse SyntaxError: invalid assignment target" }],
    ["unchosen-syntax", "console.log('no'); true ? 1 :;", { status: 2, error: "1:30: parse SyntaxError: unsupported or unexpected syntax: ;" }],
    ["optional-chain", "true?.x;", { status: 2, error: "1:5: parse SyntaxError: unsupported operator: ?." }],
    ["nullish", "true ?? 1;", { status: 2, error: "1:7: parse SyntaxError: unsupported or unexpected syntax: ?" }],
    ["comma", "true ? 1, 2 : 3;", { status: 2, error: "1:9: parse SyntaxError: expected ':', found ','" }],
    ["abrupt-test", "missing ? console.log('no') : console.log('no');", { status: 1, error: "1:1: runtime ReferenceError: missing is not defined" }],
    ["abrupt-consequent", "true ? missing : console.log('no'); console.log('after');", { status: 1, error: "1:8: runtime ReferenceError: missing is not defined" }],
    ["abrupt-alternate", "false ? console.log('no') : missing; console.log('after');", { status: 1, error: "1:29: runtime ReferenceError: missing is not defined" }],
    ["throw-test", "function stop() { throw 'stop'; } stop() ? console.log('no') : console.log('no');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["throw-consequent", "function stop() { throw 'stop'; } true ? stop() : console.log('no'); console.log('after');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["throw-alternate", "function stop() { throw 'stop'; } false ? console.log('no') : stop(); console.log('after');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["effects-before-throw", "function stop() { console.log('chosen'); throw 'stop'; } false ? console.log('no') : stop();", { status: 1, stdout: "chosen\n", error: "1:42: runtime Uncaught: stop" }],
    ["nested-success", "console.log(" + "false ? 0 : ".repeat(30) + "42);", { stdout: "42\n" }],
    ["consequent-depth", "true ? ".repeat(200) + "1" + " : 0".repeat(200) + ";", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["alternate-depth", "false ? 0 : ".repeat(200) + "1;", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["unchosen-depth", "true ? 1 : " + "false ? 0 : ".repeat(200) + "1;", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["evaluation-depth", "1" + "+(true ? 1 : 0)".repeat(300) + ";", { status: 1, errorPattern: "1:\\d+: runtime RangeError: evaluation nesting limit exceeded" }],
]) {
    lineCase("conditional-" + name, source, expected);
}
for (const [name, separator] of [["lf", "\n"], ["cr", "\r"], ["crlf", "\r\n"], ["ls", "\u2028"], ["ps", "\u2029"]]) {
    lineCase(name + "-line-comment", "console.log(1); // comment" + separator + "console.log(2);", { stdout: "1\n2\n" });
    lineCase(name + "-whitespace", "console.log(1);" + separator + "console.log(2);", { stdout: "1\n2\n" });
    lineCase(name + "-line-location", "// comment" + separator + "missing;", {
        status: 1, error: "2:1: runtime ReferenceError: missing is not defined",
    });
    lineCase(name + "-block-location", "/* comment" + separator + "*/missing;", {
        status: 1, error: "2:3: runtime ReferenceError: missing is not defined",
    });
    for (const [prefix, suffix] of [["return", "function f() { return"], ["throw", "throw"]]) {
        const tail = prefix === "return" ? "1; }" : "1;";
        const error = "1:" + (prefix === "return" ? "16" : "1") + ": parse SyntaxError: newline after return/throw is unsupported";
        lineCase(name + "-" + prefix, suffix + separator + tail, { status: 2, error });
        lineCase(name + "-block-" + prefix, suffix + " /* comment" + separator + "*/" + tail, { status: 2, error });
    }
}
for (const [name, separator] of [["ls", "\u2028"], ["ps", "\u2029"]]) {
    lineCase(name + "-string", 'console.log("a' + separator + 'b");', { stdout: "a" + separator + "b\n" });
}
lineCase("mixed-line-positions", "/*\r\n\u2028\u2029*/missing;", {
    status: 1, error: "4:3: runtime ReferenceError: missing is not defined",
});
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
const descriptorCommand = lane === "node" ? process.execPath : join(root, "build/native/object-descriptors" + suffix);
const descriptorArgs = lane === "node" ? [join(root, "build/node/test/object-descriptors.js")] : [];
execute("object-descriptors", descriptorCommand, descriptorArgs, { stdout: "object descriptors passed\n" });
const prototypeCommand = lane === "node" ? process.execPath : join(root, "build/native/object-prototypes" + suffix);
const prototypeArgs = lane === "node" ? [join(root, "build/node/test/object-prototypes.js")] : [];
execute("object-prototypes", prototypeCommand, [...prototypeArgs, "test/fixtures/prototypes.js"], { stdout: "object prototypes passed\n" });
const keysCommand = lane === "node" ? process.execPath : join(root, "build/native/object-keys" + suffix);
const keysArgs = lane === "node" ? [join(root, "build/node/test/object-keys.js")] : [];
execute("object-keys", keysCommand, keysArgs, { stdout: "object keys passed\n" });
const conversionCommand = lane === "node" ? process.execPath : join(root, "build/native/conversion" + suffix);
const conversionArgs = lane === "node" ? [join(root, "build/node/test/conversion.js")] : [];
execute("conversion", conversionCommand, conversionArgs, { stdout: "primitive conversion passed\n" });
const definitionCommand = lane === "node" ? process.execPath : join(root, "build/native/definition-dispatch" + suffix);
const definitionArgs = lane === "node" ? [join(root, "build/node/test/definition-dispatch.js")] : [];
execute("definition-dispatch", definitionCommand, definitionArgs, { stdout: "definition dispatch passed\n" });
const arrayCommand = lane === "node" ? process.execPath : join(root, "build/native/array-storage" + suffix);
const arrayArgs = lane === "node" ? [join(root, "build/node/test/array-storage.js")] : [];
execute("array-storage", arrayCommand, arrayArgs, { stdout: "array storage passed\n" });
const arrayLikeCommand = lane === "node" ? process.execPath : join(root, "build/native/array-like" + suffix);
const arrayLikeArgs = lane === "node" ? [join(root, "build/node/test/array-like.js")] : [];
execute("array-like", arrayLikeCommand, arrayLikeArgs, { stdout: "array-like prerequisites passed\n" });
const contextCommand = lane === "node" ? process.execPath : join(root, "build/native/operation-context" + suffix);
const contextArgs = lane === "node" ? [join(root, "build/node/test/operation-context.js")] : [];
execute("operation-context", contextCommand, contextArgs, { stdout: "operation context passed\n" });
const mapCommand = lane === "node" ? process.execPath : join(root, "build/native/array-map" + suffix);
const mapArgs = lane === "node" ? [join(root, "build/node/test/array-map.js")] : [];
execute("array-map", mapCommand, mapArgs, { stdout: "array map passed\n" });
const literalsCommand = lane === "node" ? process.execPath : join(root, "build/native/array-literals" + suffix);
const literalsArgs = lane === "node" ? [join(root, "build/node/test/array-literals.js")] : [];
execute("array-literals", literalsCommand, literalsArgs, { stdout: "array literals passed\n" });
const propertyCommand = lane === "node" ? process.execPath : join(root, "build/native/property-key-conversion" + suffix);
const propertyArgs = lane === "node" ? [join(root, "build/node/test/property-key-conversion.js")] : [];
execute("property-key-conversion", propertyCommand, propertyArgs, { stdout: "property key conversion passed\n" });
const numericCommand = lane === "node" ? process.execPath : join(root, "build/native/numeric-operators" + suffix);
const numericArgs = lane === "node" ? [join(root, "build/node/test/numeric-operators.js")] : [];
execute("numeric-operators", numericCommand, numericArgs, { stdout: "4 12 3 0\n3 -3\nLRLRLRLRUU\nnumeric operators passed\n" });
const additionCommand = lane === "node" ? process.execPath : join(root, "build/native/addition" + suffix);
const additionArgs = lane === "node" ? [join(root, "build/node/test/addition.js")] : [];
execute("addition", additionCommand, additionArgs, { stdout: "addition passed\n" });
const relationalCommand = lane === "node" ? process.execPath : join(root, "build/native/relational" + suffix);
const relationalArgs = lane === "node" ? [join(root, "build/node/test/relational.js")] : [];
execute("relational", relationalCommand, relationalArgs, { stdout: "relational passed\n" });
const primitiveCommand = lane === "node" ? process.execPath : join(root, "build/native/primitive-conversion" + suffix);
const primitiveArgs = lane === "node" ? [join(root, "build/node/test/primitive-conversion.js")] : [];
execute("primitive-conversion", primitiveCommand, primitiveArgs, { stdout: "primitive conversion passed\n" });
const operatorCommand = lane === "node" ? process.execPath : join(root, "build/native/operator-coercion" + suffix);
const operatorArgs = lane === "node" ? [join(root, "build/node/test/operator-coercion.js")] : [];
execute("operator-coercion", operatorCommand, operatorArgs, { stdout: "operator coercion passed\n" });
const keyCommand = lane === "node" ? process.execPath : join(root, "build/native/key-coercion" + suffix);
const keyArgs = lane === "node" ? [join(root, "build/node/test/key-coercion.js")] : [];
execute("key-coercion", keyCommand, keyArgs, { stdout: "key coercion passed\n" });
const lengthCommand = lane === "node" ? process.execPath : join(root, "build/native/length-coercion" + suffix);
const lengthArgs = lane === "node" ? [join(root, "build/node/test/length-coercion.js")] : [];
execute("length-coercion", lengthCommand, lengthArgs, { stdout: "length coercion passed\n" });
writeFileSync(join(root, `build/guest-${lane}-results.json`), JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.verdict === "PASS").length}/${results.length} passed; no skips`);
process.exitCode = results.every(r => r.verdict === "PASS") ? 0 : 1;
