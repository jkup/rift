// Authoring arithmetic only: no parser, evaluator, guest or reference execution.
// Frozen output is the acceptance oracle; never derive it from implementation.
import {writeFileSync} from 'node:fs';
const rows=[];
const head='"use strict";function f(){}';
for(const target of ['f.arguments','f.caller','f["arg"+"uments"]','f[k]']) {
 for(const op of ['read','set','compound']) {
  const variable=target==='f[k]' || op!=='read';
  const prefix=head+(variable?'let k="caller";':'');
  const source=prefix+target+(op==='read'?';':op==='set'?'=(this.effect=7);':'+=(this.effect=7);');
  const start=prefix.length+1;
  const columns=variable?[32,23,23,23,32,23,14,23,1,1,14,28,34]:[23,23,23,23,14,23,1,1,14];
  const events=variable?['GDI.lexical-check','GDI.var-check','GDI.reverse','GDI.var-scan','GDI.lexical-create','GDI.materialize','M','GDI.publish','statement.directive','expression.directive','statement.function','statement.let','expression.initializer']:['GDI.var-check','GDI.reverse','GDI.var-scan','GDI.materialize','M','GDI.publish','statement.directive','expression.directive','statement.function'];
  const push=(col,event)=>{columns.push(col);events.push(event);};
  push(start,'statement.expression');push(start,'expression.'+op);push(start,'expression.base');
  if(target.includes('+')){push(start+2,'expression.key.binary');push(start+2,'expression.key.left');push(start+8,'expression.key.right');}
  else push(start+2,'expression.key');
  if(op==='set'){
   const rhs=source.indexOf('this.effect')+1;
   push(rhs,'expression.rhs.assign');push(rhs,'expression.rhs.this');push(rhs+5,'expression.rhs.key');push(rhs+12,'expression.rhs.literal');
  }
  rows.push({id:target+':'+op,source,columns,events,ticks:columns.length,result:'body engine-diagnostic TypeError',effect:op==='set'?7:'absent',ownRestricted:'absent',callback:op==='set'?'setter args[7]':'getter args[]',prefix:variable?'k TDZ after5; F/P allocated after7; f published after8; k initialized after13':'F/P allocated after5; f published after6'});
 }
}
rows.push({id:'typeof',source:head+'typeof f.arguments;',columns:[23,23,23,23,14,23,1,1,14,28,28,35,35,37],ticks:14,result:'body engine-diagnostic TypeError',effect:'absent',ownRestricted:'absent'});
writeFileSync(new URL('restricted-traces.json',import.meta.url),JSON.stringify({status:'proposed literal oracle; arithmetic only; not runtime output',rows},null,2)+'\n');
console.log('Frozen 13 restricted source variants; no guest execution');
