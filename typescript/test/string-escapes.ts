import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh()): ValueCompletion {
    const prepared=prepareBoundedScript({id:'string-escapes',text},realm);
    if(prepared.kind!=='ready')throw new Error('prepare '+text);
    const session=createScriptSession();
    const result=evaluateScript(session,prepared.record).completion;
    check(session.inspect().active===null,'restored session');return result;
}
const cases: {source:string;expected:string}[] = [
    {source:"'\\b\\f\\v\\0';",expected:'\b\f\v\0'},
    {source:"'\\x00\\x41\\xFf';",expected:'\0Aÿ'},
    {source:"'\\u0041\\u25a8\\uFFFF';",expected:'A▨\uffff'},
    {source:"'\\uD800x\\uDC00';",expected:'\ud800x\udc00'},
    {source:"'\\uD83D\\uDE00';",expected:'😀'},
    {source:"'\\u{1F600}\\u{10ffff}';",expected:'😀\udbff\udfff'},
    {source:"'\\u{D800}\\u{00000000000041}';",expected:'\ud800A'},
    {source:"'\\z\\$\\/\\{\\}\\`';",expected:'z$/{}`'},
    {source:"'\\x22\\u0027\\x5c';",expected:'"\'\\'},
    {source:"'\\0a\\0_';",expected:'\0a\0_'},
    {source:'"\\x41\\u{42}";',expected:'AB'},
];
for(const newline of ['\n','\r','\r\n','\u2028','\u2029'])cases.push({source:"'a\\"+newline+"b';",expected:'ab'});
for(const row of cases){
    const tokens=lex(row.source,true);
    check(tokens.error===null&&tokens.tokens[0].text===row.expected&&tokens.tokens[0].start===0&&tokens.tokens[0].end===row.source.length-1,'token '+row.source);
    for(const prefix of ['',"'use strict';"]){const result=run(prefix+row.source);check(result.type==='normal'&&sameValue(result.value,{kind:'string',value:row.expected}),'value '+row.source);}
}
for(const source of [
    "function f(){'use\\x20strict';return this;}f()===this;",
    "function f(){'use\\u0020strict';return this;}f()===this;",
    "function f(){'use\\\n strict';return this;}f()===this;",
    "'use strict';function f(){'use\\x20strict';return this;}f()===undefined;",
    "function f(){'use\\x20strict';'use strict';return this;}f()===undefined;",
    "var o={'\\u0061':function(){return 7;}};o.a.name==='a'&&o.a()===7;",
    "var o={'\\u006d'(){return 7;}};o.m.name==='m'&&o.m()===7;",
    "`\\x41\\u{1f600}`==='\\x41\\u{1f600}';",
]){const r=run(source);check(r.type==='normal'&&sameValue(r.value,{kind:'boolean',value:true}),source);}
const functionText="function f(){return '\\x41\\u{1f600}';}";
const sourceResult=run(functionText+'f.toString();');
check(sourceResult.type==='normal'&&sameValue(sourceResult.value,{kind:'string',value:functionText}),'raw function source');
const located=run("'a\\\r\nb';\nmissing;");
check(located.type==='throw'&&located.diagnostic.loc.line===3&&located.diagnostic.loc.column===1,'continuation location');
for(const source of ["'\\x';","'\\x0';","'\\xGG';","'\\u';","'\\u123';","'\\u12z4';","'\\u{}';","'\\u{110000}';","'\\u{1f600';","'\\u{-1}';","'\\u{1_0}';","'\\01';","'\\08';","'\\1';","'\\8';","'\\9';","'unterminated\\","'raw\nline';"]){
    const realm=fresh(),prepared=prepareBoundedScript({id:'invalid',text:'var touched=1;'+source},realm);
    check(prepared.kind!=='ready','reject '+source);
    check(realm.globalObject.getOwnProperty('touched')===undefined,'inert rejection');
}
for(const source of ["'\\x41';","'\\u0041';","'\\z';","'a\\\nb';"])check(parse(source).error!==null,'legacy boundary');
const tooLong=lex("'\\u{"+'0'.repeat(100000)+"41}';",true);
check(tooLong.rejection?.kind==='resource-limit','bounded source');
console.log('String escapes passed');
