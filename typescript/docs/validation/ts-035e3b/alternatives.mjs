import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const here=resolve(import.meta.dirname,'alternatives');mkdirSync(here);
const root=resolve(import.meta.dirname,'../../..'),exe=resolve(root,'node_modules/scriptc/bin/scriptc.exe');
const variants={
 'decimal-original':`function decimal(text: string): number {
    if (text.length === 0) throw new Error("empty limit");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("nondecimal limit");
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("unsafe limit");
    return value;
}\nconsole.log(decimal(process.argv[2]));`,
 'decimal-inline':`function decimal(text: string): number {
    if (!(text.length > 0)) throw new Error("script-producer/limit");
    for (let n = 0; n < text.length; n++) if (!(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57)) throw new Error("script-producer/limit");
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("script-producer/limit");
    return value;
}\nconsole.log(decimal(process.argv[2]));`,
 'decimal-accumulate':`function need(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
function decimal(text: string): number {
    need(text.length > 0, "limit");
    let value = 0;
    for (let n = 0; n < text.length; n++) {
        const digit = text.charCodeAt(n) - 48;
        need(digit >= 0 && digit <= 9, "limit");
        need(value < 900719925474099 || (value === 900719925474099 && digit <= 1), "limit");
        value = value * 10 + digit;
    }
    return value;
}\nconsole.log(decimal(process.argv[2]));`,
 'keys-forin-own':`function keys(value: object, expected: string[]): boolean {
    let count = 0;
    for (const key in value) if (Object.hasOwn(value, key)) {
        if (!expected.includes(key)) return false;
        count++;
    }
    return count === expected.length;
}\nconsole.log(keys({ mode: process.argv[2] }, ["mode"]));`,
 'keys-forin-descriptor':`function keys(value: object, expected: string[]): boolean {
    let count = 0;
    for (const key in value) if (Object.getOwnPropertyDescriptor(value, key) !== undefined) {
        if (!expected.includes(key)) return false;
        count++;
    }
    return count === expected.length;
}\nconsole.log(keys({ mode: process.argv[2] }, ["mode"]));`,
 'keys-ownnames':`function keys(value: object, expected: string[]): boolean {
    let count = 0;
    for (const key of Object.getOwnPropertyNames(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
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
 const args=['coverage',path,'--explain-dynamic'],p=spawnSync(exe,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8e6});
 rows.push({name,args,status:p.status,signal:p.signal,error:p.error?.message??null,stdout:p.stdout,stderr:p.stderr});
 writeFileSync(resolve(here,'coverage.json'),JSON.stringify(rows,null,2)+'\n');
 console.log(name+' '+p.status+' '+p.stdout);
}
