import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const here=resolve(import.meta.dirname,'alternatives'),root=resolve(import.meta.dirname,'../../..');
const base=readFileSync(resolve(import.meta.dirname,'reduction-decimal.ts'),'utf8');
const variants={
 'decimal-inline-final':base.replace('need(Number.isSafeInteger(value), "limit");','if (!Number.isSafeInteger(value)) throw new Error("script-producer/limit");'),
 'decimal-inline-prior':base.replace('need(text.length > 0, "limit");','if (text.length === 0) throw new Error("script-producer/limit");').replace('need(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");','if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("script-producer/limit");'),
 'keys-ownnames-typed':`function keys(value: object, expected: string[]): boolean {
    const actual: string[] = Object.getOwnPropertyNames(value);
    let count = 0;
    for (let n = 0; n < actual.length; n++) {
        const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, actual[n]);
        if (descriptor !== undefined && descriptor.enumerable) {
            if (!expected.includes(actual[n])) return false;
            count++;
        }
    }
    return count === expected.length;
}\nconsole.log(keys({ mode: process.argv[2] }, ["mode"]));`,
 'keys-reflect':`function keys(value: object, expected: string[]): boolean {
    const actual: (string | symbol)[] = Reflect.ownKeys(value);
    let count = 0;
    for (const key of actual) if (typeof key === "string") {
        const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && descriptor.enumerable) {
            if (!expected.includes(key)) return false;
            count++;
        }
    }
    return count === expected.length;
}\nconsole.log(keys({ mode: process.argv[2] }, ["mode"]));`,
};
const rows=[];
for(const [name,source] of Object.entries(variants)){
 const path=resolve(here,name+'.ts');writeFileSync(path,source+'\n',{flag:'wx'});
 const args=['coverage',path,'--explain-dynamic'],p=spawnSync(resolve(root,'node_modules/scriptc/bin/scriptc.exe'),args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 rows.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});
 console.log(name+' '+p.stdout);
}
writeFileSync(resolve(here,'refined-coverage.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
