import * as fs from 'node:fs';
import {join} from 'node:path';
let s=fs.readFileSync(join(import.meta.dirname,'author.mjs'),'utf8');
s=s.replace("fs.writeFileSync(join(here,p),s,{flag:'wx'})","(fs.existsSync(join(here,p)) ? (fs.readFileSync(join(here,p)).equals(Buffer.from(s)) ? undefined : (()=>{throw Error('existing mismatch '+p)})()) : fs.writeFileSync(join(here,p),s,{flag:'wx'}))");
s=s.replace("fs.mkdirSync(join(here,'_preserve'))","fs.mkdirSync(join(here,'_preserve'),{recursive:true})");
s=s.replace("'observation-guard.mjs',true","'runtime-observation-guard.mjs',true");
fs.writeFileSync(join(import.meta.dirname,'author-corrected.mjs'),s,{flag:'wx'});
await import('./author-corrected.mjs');
