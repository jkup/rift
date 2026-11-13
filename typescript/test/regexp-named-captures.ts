import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const cases = [
 String.raw`/\k<x>/.exec('k<x>')[0]==='k<x>'&&/\k<>/.exec('k<>')[0]==='k<>'&&/\k<1>/.exec('k<1>')[0]==='k<1>'&&/\k</.exec('k<')[0]==='k<'&&/\k/.exec('k')[0]==='k'&&/[\k<>]/.exec('k')[0]==='k'`,

 String.raw`var m=/(?<x>a)(b)/d.exec('ab');m[1]==='a'&&m[2]==='b'&&m.groups.x==='a'&&m.indices.groups.x===m.indices[1]`,
 String.raw`var m=/(?<x>a)?b/d.exec('b');Object.hasOwn(m.groups,'x')&&m.groups.x===undefined&&Object.hasOwn(m.indices.groups,'x')&&m.indices.groups.x===undefined`,
 String.raw`var m=/(?<x>a)/d.exec('a');Object.getPrototypeOf(m.groups)===null&&Object.getPrototypeOf(m.indices.groups)===null`,
 String.raw`var m=/(?<__proto__>a)(?<constructor>b)(?<toString>c)/.exec('abc');Object.keys(m.groups).join(',')==='__proto__,constructor,toString'&&m.groups.__proto__==='a'&&m.groups.constructor==='b'&&m.groups.toString==='c'`,
 String.raw`/\k<x>(?<x>a)/.exec('a')[0]==='a'&&/(?<x>a)?b\k<x>/.exec('b')[0]==='b'`,
 String.raw`/(?<x>a)\1\k<x>/.test('aaa')&&!/(?<x>a)\k<x>/.test('ab')`,
 String.raw`/\2(?<x>a)(b)/.exec('ab')[0]==='ab'&&/(?<x>a)(b)\2\1/.test('abba')`,
 String.raw`/(?:(?<x>a)|b)+/.exec('ab').groups.x===undefined&&/(?=(?<x>a))\k<x>/.exec('a').groups.x==='a'`,
 String.raw`/(?<x>a|ab)\k<x>c/.exec('ababc').groups.x==='ab'&&/(?<x>a)\k<x>/i.test('aA')`,
 String.raw`'b'.replace(/(?<x>a)?b/,'[$<x>][$<missing>]')==='[][]'`,
 String.raw`var args;var result='a'.replace(/(?<x>a)/,function(){args=arguments;return 'b'});result==='b'&&args.length===5&&args[4].x==='a'`,
 String.raw`var m=[...'aba'.matchAll(/(?<x>a)/gd)];m.length===2&&m[1].groups.x==='a'&&m[1].indices.groups.x===m[1].indices[1]&&m[1].index===2`,
 String.raw`'a-b'.split(/(?<sep>-)/).join('|')==='a|-|b'`,
 String.raw`var a=/(?<x>a)/.exec('a'),b=/(?<x>a)/.exec('a');a.groups!==b.groups&&Object.getOwnPropertyDescriptor(a.groups,'x').enumerable&&Object.getOwnPropertyDescriptor(a,'groups').writable`,
 String.raw`/a/.exec('a').groups===undefined&&/a/d.exec('a').indices.groups===undefined`,
 String.raw`new RegExp('(?<x>a)\\k<x>').test('aa')`,
 String.raw`var ok=false;try{new RegExp('(?<x>a)\\k<missing>')}catch(e){ok=e instanceof SyntaxError}ok`,
];
for (const text of cases) {
 const realm=new Realm((_line:string)=>{},'script');
 const prepared=prepareBoundedScript({id:'named-captures',text},realm);
 if(prepared.kind!=='ready')throw new Error('prepare: '+text);
 const session=createScriptSession(),result=evaluateScript(session,prepared.record).completion;
 check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,text);
 check(session.inspect().active===null&&session.inspect().calls===0,'caller restored');
}
for(const source of ['(?<π>a)','(?<\\u0078>a)','(?<x>a)|(?<x>b)','(?<x>a)(?<x>b)','(?<=a)','\\k<x>'])
 check(parseRegExpSyntax(source,()=>true).kind===(source==='(?<x>a)(?<x>b)'?'syntax-error':source==='(?<=a)'?'unsupported':'ready'),'retained boundary '+source);
for(const source of ['(?<>a)','(?<1x>a)','(?<x-a>a)','(?<x>a)\\k<missing>'])
 check(parseRegExpSyntax(source,()=>true).kind==='syntax-error','invalid name '+source);
for (const source of [String.raw`\k<>`,String.raw`\k<1>`,String.raw`\k<`,String.raw`\k`,String.raw`[\k<>]`])
 check(parseRegExpSyntax(source,()=>true).kind==='ready','legacy k identity '+source);
const numbered=parseRegExpSyntax('(?<x>a)(b)\\2',()=>true);
check(numbered.kind==='ready'&&numbered.pattern.captures===2&&numbered.pattern.names[0].index===1,'capture numbering');
let ticks=0;
check(parseRegExpSyntax('(?<'+ 'a'.repeat(1000)+'>x)',()=>++ticks<30).kind==='stopped','name scanning budget');

{
 const realm=new Realm((_line:string)=>{},'script'),foreign=new Realm((_line:string)=>{},'script');
 const ctor=foreign.globalObject.getOwnProperty('RegExp');
 if(ctor===undefined||ctor.kind!=='data')throw new Error('foreign constructor');
 realm.defineScriptGlobal('ForeignRegExp',{value:ctor.value});
 realm.defineScriptGlobal('foreignArrayPrototype',{value:{kind:'object',object:foreign.arrayPrototype}});
 const prepared=prepareBoundedScript({id:'foreign-named-captures',text:"var r=/(?<x>a)/d,m=ForeignRegExp.prototype.exec.call(r,'a');Object.getPrototypeOf(m)===foreignArrayPrototype&&Object.getPrototypeOf(m.indices.groups.x)===foreignArrayPrototype&&m.indices.groups.x===m.indices[1]&&Object.getPrototypeOf(m.groups)===null"},realm);
 if(prepared.kind!=='ready')throw new Error('foreign preparation');
 const result=evaluateScript(createScriptSession(),prepared.record).completion;
 check(result.type==='normal'&&result.value.kind==='boolean'&&result.value.value,'foreign builtin result allocation');
}
console.log('regexp named captures passed');
