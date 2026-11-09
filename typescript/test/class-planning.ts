import { parseBoundedScriptDeclarationPlan, parse } from "../src/parser.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const text="class C { constructor(x){this.x=x} get value(){return this.x} static read(){return C} }";
const plan=parseBoundedScriptDeclarationPlan({id:"class-plan",text});
if(plan.kind!=="complete")throw new Error(JSON.stringify(plan));
check(plan.declarations[0].kind==="class"&&plan.declarations[0].site.name==="C","outer class declaration");
check(plan.scopes[1].kind==="class"&&plan.scopes[1].strict&&plan.scopes[1].lexicalNames[0]==="C","strict inner scope");
check(plan.functions.length===3&&plan.functions.every(fn=>fn.strictness.strict&&fn.strictness.inheritedStrict),"strict methods");
for(const source of ["class C{};let C;","class C{constructor(){} constructor(){}}","class C{get constructor(){}}","class C{static prototype(){}}","class C{m(a,a){}}","class eval{}","if(true)class C{}","class C extends B{}","class C{x=1}","class C{static{}}"])
    check(parseBoundedScriptDeclarationPlan({id:"invalid-class",text:source}).kind!=="complete","reject "+source);
check(parse(text).error!==null,"legacy class boundary");
console.log("Class planning passed");
