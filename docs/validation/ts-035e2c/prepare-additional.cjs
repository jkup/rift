const fs=require('node:fs'),assert=require('node:assert/strict');let s=fs.readFileSync('docs/validation/ts-035e2c/resolve-faults.mjs','utf8');s=s.slice(0,s.indexOf("for(const mode of ['published'"));
function replace(a,b){assert.equal(s.split(a).length,2,a);s=s.replace(a,b);}
replace('async function operation(name,fn) {','async function operation(name,fn,destination=false) {\n const item=c.queue?.[0]; if(item?.name===name && (!item.destination || destination)){c.queue.shift();c.trace.push(name);throw Object.assign(Error(name),{code:item.code});}');
replace("operation('lstat',()=>fs.lstat(...a))","operation('lstat',()=>fs.lstat(...a),String(a[0]).endsWith('checkpoint-0.json'))");
replace('trace:[],fail:null,after:false,partial:false,context:false,ack:false,errno:null','trace:[],fail:null,after:false,partial:false,context:false,ack:false,errno:null,queue:[]');
replace("const h=await operation('open',()=>fs.open(...a));return {", "const h=await operation('open',()=>fs.open(...a));(c.handles??=[]).push(h);return {");
s+=fs.readFileSync('docs/validation/ts-035e2c/additional-controls.txt','utf8');fs.writeFileSync('docs/validation/ts-035e2c/additional.mjs',s);
