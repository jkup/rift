// Literal future audit expectations, NOT current emission expectations.
// eligible = first block-only rule; parameter = later parameter slice; none = no candidate.
export const cases = [
 ['B01','"use strict"; {function f(){} function f(){}}','eligible'],
 ['B02','"use strict"; {function f(){} function g(){}}','none'],
 ['B03','{function f(){} function f(){}}','blocked'],
 ['B04','{"use strict"; function f(){} function f(){}}','blocked'],
 ['B05','"use strict"; function f(){} function f(){}','none'],
 ['B06','"use strict"; function o(){function f(){} function f(){}}','none'],
 ['B07','function o(){"use strict"; {function f(){} function f(){}}}','eligible'],
 ['B08','"use strict"; function o(){ {function f(){} function f(){}}}','eligible'],
 ['B09','"use strict"; {function f(){}} {function f(){}}','none'],
 ['B10','"use strict"; {let f; function f(){}}','blocked'],
 ['B11','"use strict"; {function f(){} var f;}','blocked'],
 ['B12','"use strict"; switch(0){case 0:function f(){} case 1:function f(){}}','blocked'],
 ['B13','"use strict"; try {} catch(e){function f(){} function f(){}}','eligible'],
 ['B14','"use strict"; try {} catch(f){function f(){} function f(){}}','blocked'],
 ['B15','"use strict"; {function f(){} function f(){}} try {} catch(e){let e;}','blocked'],
 ['B16','"use strict"; {function f(){} function f(){}} {let x; let x;}','blocked'],
 ['B17','"use strict"; {function f(){} function f(){}} function g(){delete x;}','blocked'],
 ['B18','"use strict"; {function f(){} function f(){}} // tail\n','eligible'],
 ['B19','"use strict"; var x=function(){ {function f(){} function f(){}} };','eligible'],
 ['B20','"use strict"; {function f(){} function f(){}} {function g(){} function g(){}}','eligible'],
 ['B21','"use strict"; {function f(){} function f(){} let f;}','blocked'],
 ['D01','"other"; \'use strict\'; {function f(){} function f(){}}','eligible'],
 ['D02','("use strict"); {function f(){} function f(){}}','blocked'],
 ['D03','0; "use strict"; {function f(){} function f(){}}','blocked'],
 ['D04','; "use strict"; {function f(){} function f(){}}','blocked'],
 ['D05','"use\\x20strict"; {function f(){} function f(){}}','blocked'],
 ['D06','"use strict"\n{function f(){} function f(){}}','blocked'],
 ['D07','"other\\n"; /* prologue */ "use strict"; {function f(){} function f(){}}','eligible'],
 ['P01','"use strict"; function f(a,a){}','parameter'],
 ['P02','function f(a,a){"use strict";}','parameter'],
 ['P03','"use strict"; function o(){function f(a,a){}}','parameter'],
 ['P04','function f(a,a){}','blocked'],
 ['P05','function f(a,b){"use strict";}','none'],
 ['P06','function f(a,a){("use strict");}','blocked'],
 ['P07','function f(a,a){0; "use strict";}','blocked'],
 ['P08','"use strict"; var f=function(a,a){};','parameter'],
 ['P09','function f(a,a){"use\\x20strict";}','blocked'],
 ['P10','"use strict"; function f(a=1,a){}','blocked'],
 ['P11','"use strict"; function f(a,...a){}','blocked'],
 ['P12','"use strict"; function f(a,a){} function g(){class C {}}','blocked'],
 ['P13','function f(a,a){"use strict";','blocked'],
 ['P14','"use strict"; function f(a,a){} function g(b,b){}','parameter'],
 ['P15','function f(a,a){} function g(b,b){"use strict";}','blocked'],
 ['X01','"use strict"; {function f(){} function f(){}} class C {}','blocked'],
 ['X02','"use strict"; {function f(){} function f(){}} `tail`;','blocked'],
 ['X03','"use strict"; {function f(){} function f(){}} function g(){/x/;}','blocked'],
 ['X04','"use strict"; {function f(){} function f(){}} let x=;','blocked'],
 ['X05','"use strict"; {function f(){} function f(){}} "unterminated','blocked'],
 ['X06','"use strict"; {function f(){} function f(){}} return 1;','blocked'],
 ['X07','"use strict"; {function f(){} function f(){}} 42=1;','blocked'],
 ['X08','"use strict"; {function f(){} function f(){}} while(false) let x;','blocked'],
 ['X09','"use strict"; {function f(){} function f(){}} function g(a,a){}','blocked'],
];
// Exact deterministic boundary inputs; store expanded strings in results for review.
const prefix='"use strict"; {function f(){} function f(){}}';
cases.push(['L01',prefix+' '.repeat(100000-prefix.length),'eligible']);
cases.push(['L02',prefix+' '.repeat(100001-prefix.length),'blocked']);
cases.push(['L03',prefix+'{'.repeat(127)+';'+ '}'.repeat(127),'eligible']);
cases.push(['L04',prefix+'{'.repeat(128)+';'+ '}'.repeat(128),'blocked']);
const parameter='function f(a,a){"use strict";}';
cases.push(['L05',parameter+' '.repeat(100001-parameter.length),'blocked']);
cases.push(['L06',parameter+'{'.repeat(128)+';'+ '}'.repeat(128),'blocked']);
export const runtimeSources = [
 '"use strict"; {function alpha(){} function alpha(){}}',
 'function outer(){"use strict"; {function beta(){} function beta(){}}}',
];
