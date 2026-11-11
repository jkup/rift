import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function passes(text: string): void {
 const realm=new Realm((_line:string)=>{},"script"),prepared=prepareBoundedScript({id:"unicode-names",text},realm);
 if(prepared.kind!=="ready")throw new Error("prepare: "+text);
 const session=createScriptSession(),result=evaluateScript(session,prepared.record).completion;
 check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,text);
 check(session.inspect().active===null&&session.inspect().calls===0,"caller restored");
}
const valid: [string,string,string][] = [
  [
    "(?<π>a)\\k<π>",
    "π",
    "aa"
  ],
  [
    "(?<\\u03c0>a)\\k<π>",
    "π",
    "aa"
  ],
  [
    "(?<𝒜>a)\\k<\\u{1D49C}>",
    "𝒜",
    "aa"
  ],
  [
    "(?<\\uD835\\uDC9C>a)\\k<𝒜>",
    "𝒜",
    "aa"
  ],
  [
    "(?<\\u{000003c0}>a)",
    "π",
    "a"
  ],
  [
    "(?<$>a)\\k<\\u0024>",
    "$",
    "aa"
  ],
  [
    "(?<_>a)",
    "_",
    "a"
  ],
  [
    "(?<a‌‍>a)",
    "a‌‍",
    "a"
  ],
  [
    "(?<á>a)",
    "á",
    "a"
  ],
  [
    "(?<℘>a)",
    "℘",
    "a"
  ],
  [
    "(?<a·>a)",
    "a·",
    "a"
  ],
  [
    "(?<if>a)",
    "if",
    "a"
  ]
];
for(const [pattern,name,input]of valid) {

 passes("var m=new RegExp("+JSON.stringify(pattern)+",'d').exec("+JSON.stringify(input)+");m[0]==="+JSON.stringify(input)+"&&m.groups["+JSON.stringify(name)+"]==='a'&&m.indices.groups["+JSON.stringify(name)+"]===m.indices[1]");
 passes("var m=/"+pattern+"/d.exec("+JSON.stringify(input)+");m[0]==="+JSON.stringify(input)+"&&m.groups["+JSON.stringify(name)+"]==='a'");
}
const invalid: string[] = [
  "(?<\\x61>a)",
  "(?<\\u{}>a)",
  "(?<\\u{110000}>a)",
  "(?<\\uD800>a)",
  "(?<\\uD835\\u{DC9C}>a)",
  "(?<\\u{D835}\\uDC9C>a)",
  "(?<\\uD835\udc9c>a)",
  "(?<\ud835\\uDC9C>a)",
  "(?<‌>a)",
  "(?<́>a)",
  "(?<😀>a)",
  "(?<\\u003e>a)"
];
for(const pattern of invalid) {
 check(parseRegExpSyntax(pattern,()=>true).kind==="syntax-error","invalid name: "+pattern);
 passes("var caught=false;try{new RegExp("+JSON.stringify(pattern)+")}catch(e){caught=e instanceof SyntaxError}caught");
}
passes(String.raw`var m=/(?<é>a)(?<e\u0301>b)\k<é>\k<e\u0301>/.exec('abab');m.groups['é']==='a'&&m.groups['e\u0301']==='b'&&Object.keys(m.groups).length===2`);
passes(String.raw`var m=/\k<π>(?<\u03c0>a)/.exec('a');m.groups['π']==='a'`);
passes(String.raw`'aa'.replace(/(?<π>a)\k<π>/,'[$<π>]')==='[a]'`);
passes(String.raw`var r=/(?<π>a)/g,m=[...'aa'.matchAll(r)];m.length===2&&m[1].groups['π']==='a'`);
for(const pattern of [String.raw`(?<π>a)|(?<\u03c0>b)`,String.raw`(?<x>a)(?<\u0078>b)`])
 check(parseRegExpSyntax(pattern,()=>true).kind===(pattern.includes('|')?'ready':'syntax-error'),'decoded duplicate boundary');
let ticks=0;
check(parseRegExpSyntax('(?<a'+String.raw`\u{000000000000000000000000000000000061}`.repeat(100)+'>x)',()=>++ticks<40).kind==='stopped','escape budget');
console.log('regexp unicode names passed');
