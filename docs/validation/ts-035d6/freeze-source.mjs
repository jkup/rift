import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);
const paths=[...files('src'),...files('test'),...files('tools'),...files('fixtures/script-assignment-target-dispatch'),'package.json','package-lock.json','tsconfig.json'].filter(p=>!p.includes('/node_modules/'));
writeFileSync('docs/validation/ts-035d6/source-closure.json',JSON.stringify(paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),null,2)+'\n');
console.log('Frozen '+paths.length+' source/test/tool/config files');
