import {
    createScriptRealm,
    prepareBoundedScript,
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
} from "../src/script.js";

function check(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

export function checkScriptAPI(): void {
    const output: string[] = [];
    const realm = createScriptRealm((line: string) => {
        output.push(line);
    });
    const session = createScriptSession();
    const prepared = prepareBoundedScript(
        {
            id: "first.js",
            text: "var answer = 42; Promise.resolve(answer).then(value => console.log(value));",
        },
        realm,
    );
    check(realm.profile === "script", "current profile");
    if (prepared.kind !== "ready") {
        throw new Error("first script rejected");
    }
    check(evaluateScript(session, prepared.record).completion.type === "normal", "first script");
    check(output.length === 0, "jobs wait for a checkpoint");
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "job completion");
    check(output.join("|") === "42", "promise output");

    const next = prepareBoundedScript({ id: "next.js", text: "answer + 1;" }, realm);
    if (next.kind !== "ready") {
        throw new Error("second script rejected");
    }
    const result = evaluateScript(session, next.record).completion;
    check(
        result.type === "normal" && result.value.kind === "number" && result.value.value === 43,
        "successive scripts share globals",
    );
    const other = createScriptRealm((_line: string) => {});
    const isolated = prepareBoundedScript({ id: "isolated.js", text: "answer;" }, other);
    if (isolated.kind !== "ready") {
        throw new Error("isolated script rejected");
    }
    const missing = evaluateScript(createScriptSession(), isolated.record).completion;
    check(
        missing.type === "throw" && missing.diagnostic.name === "ReferenceError",
        "isolated globals",
    );
}
