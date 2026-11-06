// Extract only the exact path guard and snapshot-read block. Never import/run the controller.
export function extract(source){
 const a=source.indexOf('function exact(p,directory=false) {'),b=source.indexOf('\nfunction tree(base)',a);
 const c=source.indexOf("      const root=exact(join(c.root,'capture')"),d=source.indexOf('\n      const snapshot=',c);
 if(a<0||b<0||c<0||d<0)throw Error('extraction anchors');
 const exact=source.slice(a,b),body=source.slice(c,d);
 return "import assert from 'node:assert/strict';\nimport {readFileSync,readdirSync,lstatSync,realpathSync} from 'node:fs';\nimport {resolve,parse,relative,sep,join} from 'node:path';\n"+exact+'\nexport function snapshot(c){\n'+body+'\nreturn files;\n}\n';
}
