import { observeScripts, type ObservationUnit } from "../src/script-observation.js";
import { scriptObservationJSONRecord } from "../src/script-observation-json.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const cases: { source: string; rule: "regexp-literal" | "numeric-separator" }[] = [
    { source: "/(/;", rule: "regexp-literal" },
    { source: "var r=/[z-a]/;", rule: "regexp-literal" },
    { source: "var r=/a/gg;", rule: "regexp-literal" },
    { source: "1__0;", rule: "numeric-separator" },
    { source: "var n=0x_1;", rule: "numeric-separator" },
    { source: "var n=1_n;", rule: "numeric-separator" },
];
for (const entry of cases) {
    for (const action of ["parse-only", "execute"] as const) {
        for (const harness of [false, true]) {
            const units: ObservationUnit[] = harness
                ? [
                      { id: "u0", role: "harness", text: "var before=1;" },
                      { id: "u1", role: "harness", text: entry.source },
                      { id: "u2", role: "test", text: "throw 99;" },
                  ]
                : [{ id: "u0", role: "test", text: entry.source + "throw 99;" }];
            const child = observeScripts({
                nonce: "certified-rule",
                requestSha256: "a".repeat(64),
                action,
                preflightId: null,
                steps: 10000,
                calls: 64,
                units,
            });
            check(
                child.result.kind === "syntax-error" &&
                    child.result.ruleCode === entry.rule &&
                    child.result.phase === "parse" &&
                    child.result.constructorName === "SyntaxError",
                "certified producer result",
            );
            check(
                child.operation.phase === "parse" &&
                    child.operation.stage === (harness ? "harness" : "test") &&
                    child.operation.unitId === (harness ? "u1" : "u0"),
                "source phase and unit",
            );
            check(
                child.source?.unitId === child.operation.unitId &&
                    child.source.realmId === child.operation.realmId,
                "source association",
            );
            check(
                !child.testBodyEvaluated && child.inspection === null,
                "no body or runtime inspection",
            );
            check(child.completedUnits.join(",") === (harness ? "u0" : ""), "completed prefix");
            const json = scriptObservationJSONRecord(child);
            check(
                json.includes('"ruleCode":"' + entry.rule + '"') &&
                    json.includes('"phase":"parse"'),
                "serialized provenance",
            );
        }
    }
}
for (const source of ["/[/;", "var x = ; 1__0;", "1__0; @", "/a/v;"]) {
    const child = observeScripts({
        nonce: "blocked",
        requestSha256: "b".repeat(64),
        action: "parse-only",
        preflightId: null,
        steps: 10000,
        calls: 64,
        units: [{ id: "u0", role: "test", text: source }],
    });
    check(
        child.result.kind === "unsupported-syntax",
        "unsupported and incomplete grammar stay distinct: " + source,
    );
}
const cutoff = observeScripts({
    nonce: "cutoff",
    requestSha256: "c".repeat(64),
    action: "execute",
    preflightId: null,
    steps: 0,
    calls: 64,
    units: [
        { id: "u0", role: "harness", text: "var x=1;" },
        { id: "u1", role: "test", text: "/(/;" },
    ],
});
check(
    cutoff.result.kind === "resource-limit" &&
        cutoff.operation.stage === "harness" &&
        !cutoff.testBodyEvaluated,
    "earlier harness cutoff wins",
);
console.log("certified rule producer passed");
