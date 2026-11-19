import {parseBoundedScriptDeclarationPlan,parseBoundedScriptPreparation} from '../src/parser.js';
import type {DeclarationNodes} from '../src/script-declarations.js';
import {prepareBoundedScript} from '../src/script-record.js';
import {Realm} from '../src/realm.js';
function nodes():DeclarationNodes{return {assignmentNameEligible:new Map(),source:{text:''},body:[],scopes:new Map(),declarations:new Map()};}
function check(ok:boolean,message:string):void{if(!ok)throw new Error(message);}
const certified=[
 'return; /(?<=x)/;',
 'return;', 'return', 'return\n1;', '{return 1;}', 'if(true)return 1;',
 'while(false){return;}', 'for(;;){return;}', 'label:{return;}',
 'switch(1){case 1:return;}', 'try{throw 1}catch(e){return;}',
 'try{}finally{return;}', 'function f(){return 1}return f();',
 '(()=>1)();return 2n;', 'var o={m(){return 1}};return o.m();',
 'class C{m(){return 1}}return new C().m();',
 'class C{static{return;}}', 'function f(){class C{static{return;}}}',
 'var [x]=[1];return x;', 'var {x=1}={};return x;',
 'var o={};return o?.x;', 'return `x${1}`;',
 'class C{#x=1;m(){return this.#x}}return;',
 'console.log("SHOULD_NOT_RUN");return;', 'globalThis.marker=1;return;',
 '"use strict";return;', 'return /*\n*/ 1;'
];
for(const text of certified){
 const unit={id:'return-control',text},plan=parseBoundedScriptDeclarationPlan(unit),result=parseBoundedScriptPreparation(unit,nodes());
 check(plan.kind==='blocked'&&plan.rejection.kind==='unsupported-syntax'&&plan.rejection.capabilityCode==='parse.return-context','planner stays non-certifying: '+text);
 check(result.kind==='blocked'&&result.rejection.kind==='syntax-error'&&result.rejection.ruleCode==='return-outside-function','certification: '+text);
 if(plan.kind==='blocked'&&result.kind==='blocked')check(JSON.stringify(plan.diagnostic)===JSON.stringify(result.diagnostic),'first diagnostic preserved');
 let effects=0;const realm=new Realm((_line)=>{effects++;},'script');
 realm.defineScriptGlobal('marker',{value:{kind:'number',value:0}});
 const prepared=prepareBoundedScript(unit,realm);
 check(prepared.kind==='blocked'&&prepared.rejection.kind==='syntax-error','public preparation: '+text);
 const marker=realm.globalObject.getOwnProperty('marker');
 check(effects===0&&marker?.kind==='data'&&marker.value.kind==='number'&&marker.value.value===0,'preparation effects');
}
const valid=[
 'function f(){return 1}', '(()=>{return 1})()', '({m(){return 1}}).m()',
 'class C{m(){return 1}static m(){return 2}}',
 'function* f(){return 1}', 'async function f(){return 1}',
 'class C{static{(()=>{return 1})()}}',
 'var returnValue="return";', 'var o={return:1};o.return;'
];
for(const text of valid)check(prepareBoundedScript({id:'valid-return',text},new Realm((_line)=>{},'script')).kind==='ready','valid neighbor: '+text);
const blocked=[
 'return; import x from "x";', 'return; with({}){}',
 'return; var x=;', 'return; class C{#x;#x;}',
 'return; @', 'return;'+ '('.repeat(300)+'0'+')'.repeat(300)+';'
];
for(const text of blocked){
 const unit={id:'blocked-return',text};
 const original=parseBoundedScriptDeclarationPlan(unit),result=parseBoundedScriptPreparation(unit,nodes());
 check(original.kind==='blocked'&&result.kind==='blocked','blocked control');
 if(original.kind==='blocked'&&result.kind==='blocked'){
  check(JSON.stringify(original.rejection)===JSON.stringify(result.rejection),'unsupported/guard precedence: '+text);
  check(JSON.stringify(original.diagnostic)===JSON.stringify(result.diagnostic),'blocked diagnostic');
 }
}
console.log('script return certification passed');
