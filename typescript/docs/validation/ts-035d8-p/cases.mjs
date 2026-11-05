// Editorial cases, not a recognizer. Each site is explicitly assigned its grammar slot.
export const cases=[];
const add=(id,text,sites=[],neighbor=null)=>cases.push({id,text,sites,neighbor});
const letSite=(text,context,name='x',occurrence=0)=>({start:text.indexOf('let '+name,occurrence),context});
for(const [id,text,context] of [
 ['if','if(false) let x;','if-consequent'],['else','if(false); else let x=1;','if-alternate'],
 ['while','while(false) let x;','while-body'],['for','for(;false;) let x=1;','for-body'],
 ['for-var','for(var i=0;i<1;i++) let x=i;','for-body'],
 ['nested','if(true) while(false) let x;','while-body'],
 ['function','function f(){if(false) let x;}','if-consequent'],
 ['expression','let f=function(){while(false) let x=1;};','while-body'],
 ['switch','switch(0){case 0: if(false) let x; break;}','if-consequent'],
 ['catch','try{}catch(e){while(false) let x;}','while-body'],
 ['initializer-function','if(false) let x=function(){let y; return 1;};','if-consequent'],
 ['linebreak','while(false) let\nx;','while-body']]) {
 for(const prefix of ['', '"use strict";\n']) { const source=prefix+text; add(id+(prefix?'-strict':'-sloppy'),source,[{start:source.indexOf('let',source.indexOf('while')>=0?source.indexOf('while'):0),context}]); }
}
// Correct the function-expression outer binding: its inner while is authoritative.
for(const r of cases.filter(r=>r.id.startsWith('expression')))r.sites[0].start=r.text.indexOf('let x');
for(const [id,prefix] of [['single',"'use strict'; "],['paren','("use strict"); '],['late','0; "use strict"; '],['empty','; "use strict"; '],['escaped','"use\\x20strict"; '],['comment','/*use strict*/ '],['ordinary-string','"other"; ']]) {const text=prefix+'while(false) let x;';add('directive-'+id,text,[letSite(text,'while-body')]);}
for(const [id,text] of [
 ['script','let x;'],['block','if(false){let x=1;}'],['switch','switch(0){case 0: let x; break;}'],
 ['function','function f(){let x; return 1;}'],['loop-block','for(;false;){let x;}'],['var','while(false) var x;'],
 ['empty','if(false);else;'],['sloppy-delete','delete x;'],['string','"let x";'],['comment','/* while(false) let x; */ 0;'],
 ['ready','let x; x=7; x;']])add('valid-'+id,text);
for(const [id,text] of [
 ['const-branch','while(false) const x=1;'],['const-list','const x=1;'],['const-block','{const x=1;}'],
 ['let-expression','while(false) let=1;'],['let-call','if(false) let(1);'],['let-member','if(false) let.x=1;'],
 ['let-array','if(false) let [x]=a;'],['let-object','while(false) let {x}=a;'],['multiple','while(false) let x,y;'],
 ['missing-init','if(false) let x=;'],['missing-semicolon','if(false) let x'],['reserved','while(false) let let;'],
 ['function-if','if(false) function f(){}'],['function-while','while(false) function f(){}'],
 ['do','do let x; while(false);'],['label','label: let x;'],['for-let','for(let x=0;x<1;x++){}'],
 ['for-const','for(const x of a){}'],['for-in','for(let x in a){}'],['class','if(false) class C{}']]) {
 const n=text.replace(/^(while\(false\)|if\(false\)) /,m=>' '.repeat(m.length));add('excluded-'+id,text,[],n===text?null:n);
}
for(const [id,tail] of [
 ['class','class C{}'],['const','const y=1;'],['template','`x`;'],['bad-expression','let z=;'],
 ['numeric','42=7;'],['parameter','function f(a,a){}'],['strict-parameter','function f(a,a){"use strict";}'],
 ['return','return 1;'],['sloppy-block','{function f(){}}'],['strict-block','{function f(){}function f(){}}'],
 ['duplicate-let','let x;'],['lexical-var','var x;'],['catch-conflict','try{}catch(e){let e;}'],['delete','delete z;'],
 ['nested-invalid','let g=function(){class C{}};'],['late-branch','if(false) function f(){}']]) {
 for(const strict of [false,true]) for(const reverse of [false,true]) {
  const candidate='while(false) let x;', neutral='             let x;';
  const text=(strict?'"use strict"; ':'')+(reverse?tail+' '+candidate:candidate+' '+tail);
  const neighbor=text.replace(candidate,neutral);
  // Sloppy identifier delete is a supported neighbor; all others are explicit vetoes.
  add('mixed-'+id+'-'+strict+'-'+reverse,text,[letSite(text,'while-body')],neighbor);
 }
}
for(const [id,text,sites] of [
 ['R0','/*😀*/\r\nwhile(false) let alpha=1;\r\n',[{start:23,context:'while-body'}]],
 ['R1','"use strict";\r\nfunction f(){if(false);else let beta=2;}\r\n',[{start:0,context:'if-alternate'}]],
 ['two','if(false) let a; else let b;',[{start:10,context:'if-consequent'},{start:22,context:'if-alternate'}]],
 ['effects','var touched=0; function touch(){touched+=1; print(9); return 1;} while(false) let x=touch();',[{start:0,context:'while-body'}]]]) {
 for(const site of sites)if(id!=='two')site.start=text.indexOf(id==='R0'?'let alpha':id==='R1'?'let beta':'let x');
 add(id,text,sites);
}
const nested='if(false) let x=function(){while(false) let y;};';
add('nested-candidates',nested,[{start:nested.indexOf('let x'),context:'if-consequent'},{start:nested.indexOf('let y'),context:'while-body'}]);
const collision='if(false) let x; else let x;';
add('branch-name-conflict',collision,[{start:collision.indexOf('let x'),context:'if-consequent'},{start:collision.lastIndexOf('let x'),context:'if-alternate'}]);
for(const size of [100000,100001]){const text='while(false) let x;'.padEnd(size,' ');add('source-'+size,text,[letSite(text,'while-body')]);}
for(const depth of [125,126,127,128]) {const text='{'.repeat(depth)+'while(false) let x;'+'}'.repeat(depth);add('depth-'+depth,text,[letSite(text,'while-body')]);}
