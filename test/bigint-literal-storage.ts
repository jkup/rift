import { parseBoundedScriptPreparation } from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
const nodes: DeclarationNodes = {
    assignmentNameEligible: new Map(),
    source: { text: "" },
    body: [],
    scopes: new Map(),
    declarations: new Map(),
};
const parsed = parseBoundedScriptPreparation(
    { id: "bigint-storage", text: "[0xF_Fn,9007199254740993n,42];" },
    nodes,
);
check(parsed.kind === "complete", "literal preparation");
const snapshot = JSON.stringify(nodes.body);
check(
    snapshot.includes('"kind":"bigint"') &&
        snapshot.includes('"value":"0xFF"') &&
        snapshot.includes('"value":"9007199254740993"'),
    "exact serializable digits",
);
check(
    snapshot.includes('"kind":"literal"') && snapshot.includes('"value":42'),
    "ordinary literal shape",
);
const realm = new Realm((_line: string) => {}, "script");
const prepared = prepareBoundedScript(
    {
        id: "bigint-storage-runtime",
        text: "var a=[0xF_Fn,9007199254740993n];a[0]===255n&&a[1]===9007199254740993n",
    },
    realm,
);
if (prepared.kind !== "ready") {
    throw new Error("runtime preparation");
}
const completed = evaluateScript(createScriptSession(), prepared.record).completion;
check(
    completed.type === "normal" && completed.value.kind === "boolean" && completed.value.value,
    "exact runtime values",
);
const large = prepareBoundedScript(
    { id: "bigint-storage-budget", text: "try{" + "9".repeat(1000) + "n}catch(e){true}" },
    realm,
);
if (large.kind !== "ready") {
    throw new Error("large literal preparation");
}
const session = createScriptSession({ maxSteps: 100, maxCalls: 64 });
const stopped = evaluateScript(session, large.record).completion;
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "allocation charged before conversion",
);
check(
    session.inspect().active === null &&
        session.inspect().calls === 0 &&
        session.inspect().depth === 0,
    "resource cleanup",
);
console.log("bigint literal storage passed");
