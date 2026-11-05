import {mkdtemp,writeFile,link,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const run=await mkdtemp(resolve('docs/validation/ts-035e2c/link-reduction-'));
await writeFile(join(run,'source'),'complete\n',{flag:'wx'});
let result;try{await link(join(run,'source'),join(run,'destination'));result={ok:true,bytes:await readFile(join(run,'destination'),'utf8')};}catch(e){result={ok:false,code:e.code,syscall:e.syscall,message:e.message};}
await writeFile(join(run,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({run,...result}));
