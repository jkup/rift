import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, input = "") {
    const realm = new Realm((_line: string) => {}, "script");
    realm.defineScriptGlobal("input", { value: { kind: "string", value: input } });
    const prepared = prepareBoundedScript({ id: "caller", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("caller preparation: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const literal of [
    "1_",
    "10__0",
    "10._1",
    "10.0_e1",
    "0b0_",
    "0b0__0",
    "0o0_",
    "0x1_",
    "00_0",
    "0_0",
    "08_0",
]) {
    for (const call of ["eval", "(0,eval)", "Function"]) {
        const text =
            "var caught=false;try{" +
            call +
            "(" +
            JSON.stringify(literal) +
            ")}catch(e){caught=e instanceof SyntaxError}caught";
        const result = run(text);
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            call + ": " + literal,
        );
    }
}
for (const text of [
    "function f(){'use strict';try{eval('1_')}catch(e){return e instanceof SyntaxError}}f()",
    "var called=false;try{eval('called=true;1_')}catch(e){}!called",
    "try{eval('1_;`a ${2__3}`')}catch(e){e instanceof SyntaxError}",
    "eval('10.._1')===undefined && eval('1_000')===1000",
    "function f(){return eval('var arguments;1_')}try{f()}catch(e){e instanceof SyntaxError}",
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const source of ["1_;class C{}", "1_0n", "/1_/", "1_;let x;let x;", "1_;42=1;"]) {
    for (const call of ["eval", "Function"]) {
        const result = run("try{" + call + "(" + JSON.stringify(source) + ")}catch(e){true}");
        if (source === "1_0n") {
            check(
                result.type === "normal" &&
                    (call === "eval"
                        ? result.value.kind === "bigint" && result.value.value === 10n
                        : result.value.kind === "object"),
                "original BigInt admitted in dynamic sources",
            );
        } else if (source === "1_;class C{}") {
            check(
                result.type === "normal" && result.value.kind === "boolean" && result.value.value,
                "original class source permits numeric certification",
            );
            const typed = run(
                "try{" +
                    call +
                    "(" +
                    JSON.stringify(source) +
                    ")}catch(e){e instanceof SyntaxError}",
            );
            check(
                typed.type === "normal" && typed.value.kind === "boolean" && typed.value.value,
                "class numeric error is SyntaxError",
            );
        } else if (source === "/1_/") {
            check(
                result.type === "normal" && result.value.kind === "object",
                "original regex source is now admitted",
            );
        } else {
            check(
                result.type === "throw" && result.origin.kind === "unsupported-operation",
                "uncertified input stays fatal: " + source,
            );
        }
    }
}
const regex = run("eval('/1_/').test('1_') && Function('return /1_/')().source==='1_'");
check(
    regex.type === "normal" && regex.value.kind === "boolean" && regex.value.value,
    "regex underscores are pattern text in both dynamic sources",
);
const strict = run("function f(){'use strict';try{eval('var arguments;1_')}catch(e){true}}f()");
check(
    strict.type === "throw" && strict.origin.kind === "unsupported-operation",
    "inherited scope veto stays fatal",
);
const large = run("try{eval(input)}catch(e){true}", "1_;" + " ".repeat(100001));
check(
    large.type === "throw" && large.origin.kind === "resource-limit",
    "resource guard bypasses catch",
);
console.log("Numeric separator errors passed");
