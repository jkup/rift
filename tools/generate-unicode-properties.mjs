import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const data=path.resolve(process.argv[2] ?? 'build/unicode-properties-source')+path.sep;
const read=name=>fs.readFileSync(data+name,'utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const {manifest,inventory}=JSON.parse(fs.readFileSync(new URL('./unicode-properties-inputs.json',import.meta.url),'utf8'));
assert.equal(manifest.version,'17.0.0');
for(const row of manifest.files)assert.equal(hash(fs.readFileSync(data+row.path)),row.sha256,row.path);
const rows=name=>read(name).split(/\r?\n/).map(line=>line.split('#')[0].trim()).filter(Boolean).map(line=>line.split(';').map(field=>field.trim()));
const limits=value=>{const pair=value.split('..').map(s=>parseInt(s,16));return [pair[0],pair[1]??pair[0]];};
const size=0x110000;
const categoryNames=inventory.categories.filter(row=>row.short.length===2&&row.short!=='LC').map(row=>row.short);
const categories=new Uint8Array(size).fill(categoryNames.indexOf('Cn'));
const mirrored=new Uint8Array(size);
let first=null;
for(const fields of rows('UnicodeData.txt')){
 const code=parseInt(fields[0],16),category=categoryNames.indexOf(fields[2]);assert(category>=0);
 if(fields[1].endsWith(', First>')){assert.equal(first,null);first={code,category};}
 else if(fields[1].endsWith(', Last>')){assert(first);assert.equal(first.category,category);categories.fill(category,first.code,code+1);first=null;}
 else {assert.equal(first,null);categories[code]=category;}
 if(fields[9]==='Y')mirrored[code]=1;
}
assert.equal(first,null);
const binary=new Map(inventory.binarySources.map(row=>[row.name,[]]));
for(const path of ['PropList.txt','DerivedCoreProperties.txt','DerivedNormalizationProps.txt','emoji-emoji-data.txt']){
 for(const fields of rows(path)){if(binary.has(fields[1]))binary.get(fields[1]).push(limits(fields[0]));}
}
const tables=[],aliases=new Map();
function add(name,bitmap,spellings){
 const ranges=[];let count=0,sum=0;
 for(let start=0;start<size;){if(bitmap[start]===0){start++;continue;}let end=start;while(end+1<size&&bitmap[end+1]!==0)end++;
  ranges.push(start,end);count+=end-start+1;sum+=(start+end)*(end-start+1)/2;start=end+1;}
 const index=tables.length;tables.push({name,ranges,count,sum});
 for(const alias of new Set(spellings)){assert(!aliases.has(alias),alias);aliases.set(alias,index);}
}
for(const row of inventory.binarySources){
 const bitmap=new Uint8Array(size);
 for(const [from,to]of binary.get(row.name))bitmap.fill(1,from,to+1);
 if(row.name==='ASCII')bitmap.fill(1,0,128);
 if(row.name==='Any')bitmap.fill(1);
 if(row.name==='Assigned')for(let code=0;code<size;code++)bitmap[code]=categories[code]!==categoryNames.indexOf('Cn')?1:0;
 if(row.name==='Bidi_Mirrored')bitmap.set(mirrored);
 add(row.name,bitmap,inventory.binaryAliases.filter(alias=>alias.canonical===row.name).map(alias=>alias.alias));
}
for(const row of inventory.categories){
 const bitmap=new Uint8Array(size),members=categoryNames.map(name=>row.short==='LC'?['Lu','Ll','Lt'].includes(name):row.short.length===1?name.startsWith(row.short):name===row.short);
 for(let code=0;code<size;code++)bitmap[code]=members[categories[code]]?1:0;
 add('General_Category='+row.short,bitmap,row.aliases.flatMap(alias=>[alias,'gc='+alias,'General_Category='+alias]));
}
const scriptNames=inventory.scripts.map(row=>row.long),scriptCodes=inventory.scripts.map(row=>row.short);
const scripts=new Uint16Array(size).fill(scriptNames.indexOf('Unknown'));
for(const fields of rows('Scripts.txt')){const index=scriptNames.indexOf(fields[1]);assert(index>=0);const [from,to]=limits(fields[0]);scripts.fill(index,from,to+1);}
const extensions=rows('ScriptExtensions.txt').map(fields=>({range:limits(fields[0]),indices:fields[1].split(' ').map(code=>{const index=scriptCodes.indexOf(code);assert(index>=0);return index;})}));
for(let index=0;index<inventory.scripts.length;index++){
 const row=inventory.scripts[index],bitmap=new Uint8Array(size);
 for(let code=0;code<size;code++)bitmap[code]=scripts[code]===index?1:0;
 add('Script='+row.long,bitmap,row.aliases.flatMap(alias=>['sc='+alias,'Script='+alias]));
 for(const extension of extensions)bitmap.fill(extension.indices.includes(index)?1:0,extension.range[0],extension.range[1]+1);
 add('Script_Extensions='+row.long,bitmap,row.aliases.flatMap(alias=>['scx='+alias,'Script_Extensions='+alias]));
}
assert.equal(tables.length,443);
const folds=new Map();
for(const fields of rows('CaseFolding.txt'))if(fields[1]==='C'||fields[1]==='S')folds.set(parseInt(fields[0],16),parseInt(fields[2],16));
const groups=new Map();
for(const [from,to]of folds){assert(!folds.has(to));const group=groups.get(to)??[to];group.push(from);groups.set(to,group);}
const foldKeys=[...groups.keys()].sort((a,b)=>a-b),foldOffsets=[0],foldValues=[];
for(const key of foldKeys){foldValues.push(...groups.get(key));foldOffsets.push(foldValues.length);}
const aliasEntries=[...aliases].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
const source=`// Generated from Unicode 17.0.0 by tools/generate-unicode-properties.mjs.
// Source hashes and license: docs/unicode-properties-provenance.json and unicode-properties-license.txt.
const tables: number[][] = ${JSON.stringify(tables.map(row=>row.ranges))};
const aliasNames: string[] = ${JSON.stringify(aliasEntries.map(row=>row[0]))};
const aliasIndices: number[] = ${JSON.stringify(aliasEntries.map(row=>row[1]))};
const foldKeys: number[] = ${JSON.stringify(foldKeys)};
const foldOffsets: number[] = ${JSON.stringify(foldOffsets)};
const foldValues: number[] = ${JSON.stringify(foldValues)};
function compareAlias(name: string, candidate: string): number {
    // Direct string ordering uses the pinned compiler's dynamic tier.
    const length = Math.min(name.length, candidate.length);
    for (let i = 0; i < length; i++) {
        const difference = name.charCodeAt(i) - candidate.charCodeAt(i);
        if (difference !== 0) return difference;
    }
    return name.length - candidate.length;
}

export function propertyIndex(name: string): number {
    let low = 0, high = aliasNames.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2), order = compareAlias(name, aliasNames[mid]);
        if (order < 0) high = mid - 1;
        else if (order > 0) low = mid + 1;
        else return aliasIndices[mid];
    }
    return -1;
}

export function propertyContains(index: number, code: number): boolean {
    const ranges = tables[index];
    let low = 0, high = ranges.length / 2 - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2), at = mid * 2;
        if (code < ranges[at]) high = mid - 1;
        else if (code > ranges[at + 1]) low = mid + 1;
        else return true;
    }
    return false;
}

export function foldedRangeContains(from: number, to: number, canonical: number): boolean {
    let low = 0, high = foldKeys.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (canonical < foldKeys[mid]) high = mid - 1;
        else if (canonical > foldKeys[mid]) low = mid + 1;
        else {
            for (let i = foldOffsets[mid]; i < foldOffsets[mid + 1]; i++) {
                if (foldValues[i] >= from && foldValues[i] <= to) return true;
            }
            return false;
        }
    }
    return canonical >= from && canonical <= to;
}

export function foldedPropertyContains(index: number, canonical: number, negative: boolean): boolean {
    let low = 0, high = foldKeys.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (canonical < foldKeys[mid]) high = mid - 1;
        else if (canonical > foldKeys[mid]) low = mid + 1;
        else {
            for (let i = foldOffsets[mid]; i < foldOffsets[mid + 1]; i++) {
                if (propertyContains(index, foldValues[i]) !== negative) return true;
            }
            return false;
        }
    }
    return propertyContains(index, canonical) !== negative;
}
`;
const provenance = {
 version: manifest.version,
 sources: manifest.files.map(({path, url, sha256}) => ({path, url, sha256})),
 outputSha256: hash(source),
 properties: tables.length,
 aliases: aliases.size,
 ranges: tables.reduce((sum, row) => sum + row.ranges.length / 2, 0),
 reference: 'https://tc39.es/ecma262/multipage/text-processing.html#sec-runtime-semantics-unicodematchpropertyvalue-p-v'
};
for (const [name, text] of [
 ['src/unicode-properties.ts', source],
 ['docs/unicode-properties-provenance.json', JSON.stringify(provenance, null, 2) + '\n'],
 ['docs/unicode-properties-license.txt', read('license.txt')]
]) {
 const destination = path.join(root, name);
 if (process.argv.includes('--check')) assert.equal(fs.readFileSync(destination, 'utf8'), text, name);
 else fs.writeFileSync(destination, text);
}
console.log('Unicode 17 properties: 443 sets, 1722 aliases; ' + (process.argv.includes('--check') ? 'verified' : 'generated'));
