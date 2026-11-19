import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['src/parser.ts','src/script-observation.ts','src/script-observation-types.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs'],manifest=[];
for(const path of paths){
 const original=readFileSync(new URL('typescript/'+path,root),'utf8');let result=original;
 function replace(from,to){assert.equal(result.split(from).length,2,path);result=result.replace(from,to);}
 if(path==='src/parser.ts')replace('export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {',`export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {
    const original = parseBoundedScriptPreparationBeforeNumericAudit(unit, nodes);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.assignment-target") return original;
    const audit = auditBoundedScriptNumericAssignments(original.unit.text);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible numeric audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "assignment-target" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "invalid numeric assignment target",
            loc: { line: first.target.loc.line, column: first.target.loc.column } } };
}
// Preserve D4 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeNumericAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {`);
 else if(path==='src/script-observation.ts')replace('rejection.ruleCode !== "duplicate-strict-parameter")','rejection.ruleCode !== "duplicate-strict-parameter" && rejection.ruleCode !== "assignment-target")');
 else if(path==='src/script-observation-types.ts')replace('ruleCode: "return-outside-function" | "duplicate-block-lexical-function" | "duplicate-strict-parameter";','ruleCode: "return-outside-function" | "duplicate-block-lexical-function" | "duplicate-strict-parameter" | "assignment-target";');
 else replace("ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter'])","ruleCode:one(['return-outside-function','duplicate-block-lexical-function','duplicate-strict-parameter','assignment-target'])");
 const dest=new URL('production-proposal/'+path,here);mkdirSync(new URL('./',dest),{recursive:true});writeFileSync(dest,result);
 manifest.push({path,originalSha256:hash(original),resultSha256:hash(result),originalBytes:Buffer.byteLength(original),resultBytes:Buffer.byteLength(result),claim:'Editorial complete source proposal only; never imported, compiled or applied'});
}
writeFileSync(new URL('production-manifest.json',here),JSON.stringify(manifest,null,2)+'\n');
