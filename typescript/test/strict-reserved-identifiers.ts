import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse, parseBoundedScriptDeclarationPlan, parseBoundedScriptPreparation } from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";

function check(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}
function nodes(): DeclarationNodes {
    return { assignmentNameEligible: new Map(), source: { text: "" }, body: [], scopes: new Map(), declarations: new Map() };
}
function expectTrue(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "identifier-execution", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") return;
    const result = evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const names = ["implements", "interface", "package", "private", "protected", "public", "static"];
let executions = 0;
for (const name of names) {
    for (const text of [
        "var " + name + "=6;" + name + "++;" + name + "===7",
        "let " + name + "=3;" + name + "+=4;" + name + "===7",
        "const " + name + "=7;" + name + "===7",
        "function f(" + name + "){return " + name + "}f(7)===7",
        "function f(" + name + "=7){return " + name + "}f()===7",
        "((" + name + ")=>" + name + ")(7)===7",
        "var {" + name + "}={" + name + ":7};" + name + "===7",
        "var [" + name + "]=[7];" + name + "===7",
        "var out=0;try{throw 7}catch(" + name + "){out=" + name + "}out===7",
        "var out=0;" + name + ":while(true){out=7;break " + name + "}out===7",
        "var out=0;" + name + ":for(var i=0;i<3;i++){if(i<2)continue " + name + ";out=7}out===7",
        "function " + name + "(){return 7}" + name + "()===7",
        "var " + name + "=7;var o={" + name + "};o." + name + "===7",
        "var " + name + ";({x:" + name + "}={x:7});" + name + "===7",
        "class C{" + name + "(){return 7}}new C()." + name + "()===7",
        "function* f(" + name + "){yield " + name + "}f(7).next().value===7",
        "var f=" + name + "=>" + name + ";f(7)===7",
        "var out=0;for(let " + name + " of [3,4])out+=" + name + ";out===7",
    ]) {
        expectTrue(text);
        executions++;
    }
    for (const text of [
        '"use strict";var ' + name + '=1;',
        '"use strict";console.log("no effect");var ' + name + '=1;',
        'function f(' + name + '){"use strict";}',
        'function ' + name + '(){"use strict";}',
        '(function ' + name + '(){"use strict";});',
        'class ' + name + '{}',
        '(class ' + name + '{});',
        'class C extends ' + name + '{}',
        'class C{[' + name + '](){}}',
        'class C{field=' + name + '}',
        'class C{method(' + name + '){}}',
        'class C{static{var ' + name + '=1;}}',
        '"use strict";' + name + ':while(false){break ' + name + ';}',
    ]) {
        let effects = 0;
        const unit = { id: "strict-identifier", text };
        const realm = new Realm((_line: string) => { effects++; }, "script");
        const result = prepareBoundedScript(unit, realm);
        check(result.kind === "blocked" && result.rejection.kind === "syntax-error" && result.rejection.ruleCode === "strict-reserved-identifier", text);
        check(effects === 0, "no effects");
        const publicPlan = parseBoundedScriptDeclarationPlan(unit);
        check(publicPlan.kind === "blocked" && publicPlan.rejection.kind === "unsupported-syntax", "planner remains non-certifying");
    }
    const inherited = parseBoundedScriptPreparation({ id: "inherited", text: "var " + name + "=1;" }, nodes(), true);
    check(inherited.kind === "blocked" && inherited.rejection.kind === "syntax-error" && inherited.rejection.ruleCode === "strict-reserved-identifier", "inherited strictness");
    check(parse("var " + name + "=1;").rejection?.kind === "unsupported-syntax", "legacy parser unchanged");
}
for (const text of [
    '"use strict";var public=1;import x from "x";',
    '"use strict";var public=1;with({}){}',
    '"use strict";var public=1;var x=;',
    '"use strict";var public=1;' + '('.repeat(300) + '0' + ')'.repeat(300),
    'var enum=1;', 'var let=1;', 'var yield=1;',
]) {
    const result = prepareBoundedScript({ id: "unsupported", text }, new Realm((_line: string) => {}, "script"));
    check(result.kind === "blocked" && result.rejection.kind !== "syntax-error", "unsupported or resource precedence: " + text);
}
expectTrue('var public=7;eval("public")===7');
check(prepareBoundedScript({ id: "await-admission", text: "var await=1;" }, new Realm((_line: string) => {}, "script")).kind === "ready", "valid await binding admitted");
expectTrue('var ok=false;try{eval("\\\"use strict\\\";var public=1;")}catch(e){ok=e instanceof SyntaxError}ok');
expectTrue('function f(){"use strict";try{eval("var public=1")}catch(e){return e instanceof SyntaxError}}f()');
expectTrue('"use strict";var o={public:7};o.public===7');
check(executions === 126, "execution denominator");
console.log("strict reserved identifiers passed");
