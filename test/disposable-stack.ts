import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { unsupportedFailure } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "disposable-stack", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text + " expected " + expected,
    );
}
const cases: { source: string; expected: string }[] = [
    {
        source: `var s=new DisposableStack();
            DisposableStack.name+':'+DisposableStack.length+':'+s.disposed+':'+
            Object.prototype.toString.call(s)+':'+Reflect.ownKeys(s).length+':'+
            Object.isExtensible(s)+':'+(Object.getPrototypeOf(s)===DisposableStack.prototype)`,
        expected: "DisposableStack:0:false:[object DisposableStack]:0:true:true",
    },
    {
        source: `var p=DisposableStack.prototype;
            var d=Object.getOwnPropertyDescriptor(DisposableStack,'prototype');
            var g=Object.getOwnPropertyDescriptor(globalThis,'DisposableStack');
            String(!d.writable&&!d.enumerable&&!d.configurable&&g.writable&&!g.enumerable&&g.configurable&&
            Object.getPrototypeOf(DisposableStack)===Function.prototype&&Object.getPrototypeOf(p)===Object.prototype&&
            p.constructor===DisposableStack&&p[Symbol.dispose]===p.dispose)`,
        expected: "true",
    },
    {
        source: `var p=DisposableStack.prototype, out='';
            for(var name of ['use','adopt','defer','move','dispose']){
                var d=Object.getOwnPropertyDescriptor(p,name),f=d.value;
                out+=name+':'+f.length+':'+(f.name===name&&d.writable&&!d.enumerable&&d.configurable)+':';
                try{new f()}catch(e){out+=(e instanceof TypeError)+';'}
            }out`,
        expected:
            "use:1:true:true;adopt:2:true:true;defer:1:true:true;move:0:true:true;dispose:0:true:true;",
    },
    {
        source: `var p=DisposableStack.prototype,d=Object.getOwnPropertyDescriptor(p,'disposed');
            var t=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag),a=Object.getOwnPropertyDescriptor(p,Symbol.dispose);
            String(d.get.name==='get disposed'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable&&
            !t.writable&&!t.enumerable&&t.configurable&&a.writable&&!a.enumerable&&a.configurable)`,
        expected: "true",
    },
    {
        source: `class S extends DisposableStack{}var s=new S();Object.freeze(s);
            var out='';s.defer(()=>out+='d');s.dispose();
            out+':'+s.disposed+':'+(s instanceof S)+':'+(s instanceof DisposableStack)`,
        expected: "d:true:true:true",
    },
    {
        source: `var s=new DisposableStack(),out='',a={};a[Symbol.dispose]=function(){'use strict';out+='u'+(this===a)+arguments.length;};
            var token={};s.use(a);s.adopt(token,function(v){'use strict';out+='a'+(this===undefined)+(v===token)+arguments.length;});
            s.defer(function(){'use strict';out+='d'+(this===undefined)+arguments.length;});
            var result=s.dispose();out+':'+result+':'+s.dispose()+':'+s.disposed`,
        expected: "dtrue0atruetrue1utrue0:undefined:undefined:true",
    },
    {
        source: `var s=new DisposableStack(),v={},out='';
            Object.defineProperty(v,Symbol.dispose,{get(){out+='g';return function(){out+='d'}} ,configurable:true});
            var same=s.use(v)===v;Object.defineProperty(v,Symbol.dispose,{get(){throw 8}});
            s.dispose();out+':'+same`,
        expected: "gd:true",
    },
    {
        source: `var s=new DisposableStack(),out='';
            out+=(s.use(null)===null)+':'+(s.use()===undefined)+':'+(s.adopt(4,()=>{})===4)+':'+(s.defer(()=>{})===undefined);
            s.dispose();out`,
        expected: "true:true:true:true",
    },
    {
        source: `var s=new DisposableStack(),out='';s.defer(()=>out+='a');
            var marker={};try{s.use({get [Symbol.dispose](){throw marker}})}catch(e){out+=e===marker;}
            s.defer(()=>out+='b');s.dispose();out`,
        expected: "trueba",
    },
    {
        source: `var s=new DisposableStack(),out='';
            for(var v of [0,false,'x',Symbol(),1n,{}, {[Symbol.dispose]:null}, {[Symbol.dispose]:1}, {[Symbol.asyncDispose](){}}]){
                try{s.use(v)}catch(e){out+=e instanceof TypeError?'t':'x';}
            }out+':'+s.disposed`,
        expected: "ttttttttt:false",
    },
    {
        source: `var s=new DisposableStack(),out='';
            for(var v of [undefined,null,1,{}]){try{s.adopt(0,v)}catch(e){out+=e instanceof TypeError;}try{s.defer(v)}catch(e){out+=e instanceof TypeError;}}
            out`,
        expected: "truetruetruetruetruetruetruetrue",
    },
    {
        source: `var s=new DisposableStack(),out='';s.dispose();
            var v={get [Symbol.dispose](){out+='bad'}};
            for(var name of ['use','adopt','defer','move']){try{s[name](v,0)}catch(e){out+=e instanceof ReferenceError?'r':'x';}}out`,
        expected: "rrrr",
    },
    {
        source: `var p=DisposableStack.prototype,read=Object.getOwnPropertyDescriptor(p,'disposed').get,out='';
            for(var f of [p.use,p.adopt,p.defer,p.move,p.dispose,read]){
                for(var receiver of [undefined,null,0,{},p,Object.create(p)]){
                    try{f.call(receiver)}catch(e){out+=e instanceof TypeError?'t':'x';}
                }
            }String(out==='t'.repeat(36))`,
        expected: "true",
    },
    {
        source: `var s=new DisposableStack(),out='';s.defer(()=>out+='a');
            s.defer(()=>{out+=s.disposed;out+=':'+s.dispose();try{s.defer(()=>out+='bad')}catch(e){out+=':'+(e instanceof ReferenceError)}});
            s.dispose();out`,
        expected: "true:undefined:truea",
    },
    {
        source: `var s=new DisposableStack(),a={},b={},c={},out='';
            s.defer(()=>{out+='a';throw a});s.defer(()=>{out+='b';throw b});s.defer(()=>{out+='c';throw c});
            try{s.dispose()}catch(e){out+=':'+(e instanceof SuppressedError)+':'+(e.error===a)+':'+(e.suppressed.error===b)+':'+(e.suppressed.suppressed===c)+':'+Error.isError(e)}
            out+':'+s.dispose()+':'+s.disposed`,
        expected: "cba:true:true:true:true:true:undefined:true",
    },
    {
        source: `var s=new DisposableStack(),token={},out='';s.defer(()=>out+='a');s.defer(()=>{throw token});
            try{s.dispose()}catch(e){out+=':'+(e===token)}out`,
        expected: "a:true",
    },
    {
        source: `var s=new DisposableStack(),P=SuppressedError.prototype;
            Object.defineProperty(P,'error',{set(){throw 5}});Object.defineProperty(P,'suppressed',{set(){throw 6}});
            SuppressedError=function(){throw 7};s.defer(()=>{throw undefined});s.defer(()=>{throw null});
            var out='';try{s.dispose()}catch(e){var d=Object.getOwnPropertyDescriptor(e,'error');var q=Object.getOwnPropertyDescriptor(e,'suppressed');
            out=String(Object.getPrototypeOf(e)===P&&e.error===undefined&&e.suppressed===null&&d.writable&&!d.enumerable&&d.configurable&&q.writable&&!q.enumerable&&q.configurable)}out`,
        expected: "true",
    },
    {
        source: `var s=new DisposableStack(),out='';s.defer(()=>({get then(){out+='bad';throw 4}}));
            s.dispose();out+':'+s.disposed`,
        expected: ":true",
    },
    {
        source: `class S extends DisposableStack{}var s=new S(),out='',P=DisposableStack.prototype;
            Object.defineProperty(s,'constructor',{get(){throw 4}});s.defer(()=>out+='a');
            DisposableStack=function(){throw 5};var t=s.move();s.dispose();out+=s.disposed+':'+t.disposed+':'+(Object.getPrototypeOf(t)===P)+':'+(t instanceof S)+':';
            t.defer(()=>out+='b');var u=t.move();t.dispose();u.dispose();out+':'+t.disposed+':'+u.disposed`,
        expected: "true:false:true:false:ba:true:true",
    },
    {
        source: `var s=new DisposableStack(),t,out='';s.defer(()=>out+='a');
            s.use({get [Symbol.dispose](){t=s.move();return ()=>out+='b'}});
            s.dispose();t.dispose();out+':'+s.disposed+':'+t.disposed`,
        expected: "ba:true:true",
    },
    {
        source: `var s=new DisposableStack(),out='';s.defer(()=>out+='a');
            var v={get [Symbol.dispose](){s.dispose();return ()=>out+='bad'}};
            var same=s.use(v)===v;s.dispose();out+':'+same+':'+s.disposed`,
        expected: "a:true:true",
    },
    {
        source: `var s=new DisposableStack(),out='';
            s.use({get [Symbol.dispose](){s.defer(()=>out+='a');return ()=>out+='b'}});s.dispose();out`,
        expected: "ba",
    },
    {
        source: `function C(){}var s=Reflect.construct(DisposableStack,[],C);
            var p=DisposableStack.prototype;var out=String(Object.getPrototypeOf(s)===C.prototype);
            p.defer.call(s,()=>out+='d');p.dispose.call(s);out`,
        expected: "trued",
    },
    {
        source: `var out='',token={};function C(){}var target=C.bind(null);
            Object.defineProperty(target,'prototype',{get(){out+='p';throw token}});
            try{Reflect.construct(DisposableStack,[],target)}catch(e){out+=e===token}out`,
        expected: "ptrue",
    },
    {
        source: `var out='';try{DisposableStack()}catch(e){out+=e instanceof TypeError;}
            try{DisposableStack.call({})}catch(e){out+=':'+(e instanceof TypeError)}out`,
        expected: "true:true",
    },
];
for (const test of cases) {
    string(test.source, test.expected);
}
{
    const realm = fresh(),
        foreign = fresh();
    const constructor = foreign.globalObject.getOwnProperty("DisposableStack");
    if (constructor === undefined || constructor.kind !== "data") {
        throw new Error("foreign DisposableStack");
    }
    realm.defineScriptGlobal("ForeignStack", { value: constructor.value });
    realm.defineScriptGlobal("foreignSuppressedPrototype", {
        value: { kind: "object", object: foreign.getErrorPrototype("SuppressedError") },
    });
    realm.defineScriptGlobal("foreignTypePrototype", {
        value: { kind: "object", object: foreign.getErrorPrototype("TypeError") },
    });
    string(
        `var s=new DisposableStack(),out='';
        var t=ForeignStack.prototype.move.call(s);out+=Object.getPrototypeOf(t)===ForeignStack.prototype;
        t.defer(()=>{throw 1});t.defer(()=>{throw 2});
        try{t.dispose()}catch(e){out+=':'+(Object.getPrototypeOf(e)===foreignSuppressedPrototype)}
        try{ForeignStack.prototype.use.call({})}catch(e){out+=':'+(Object.getPrototypeOf(e)===foreignTypePrototype)}out`,
        "true:true:true",
        realm,
    );
    string(
        `var target=ForeignStack.bind(null);target.prototype=0;
        String(Object.getPrototypeOf(Reflect.construct(DisposableStack,[],target))===ForeignStack.prototype)`,
        "true",
        realm,
    );
}
for (const fatal of ["budget", "unsupported"]) {
    const realm = fresh();
    const stop = realm.createBuiltin("stop", 0, (_receiver, _args, _context, loc) =>
        unsupportedFailure("runtime.weak-symbol-key", "TypeError", "test stop", loc),
    );
    realm.defineScriptGlobal("stop", { value: { kind: "object", object: stop } });
    const source = `var s=new DisposableStack(),out='';s.defer(()=>out+='bad');
        s.defer(()=>{${fatal === "budget" ? "while(true){}" : "stop()"}});
        s.defer(()=>{throw 1});try{s.dispose()}catch(e){out+='caught'}`;
    const prepared = prepareBoundedScript({ id: "disposal-stop", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("stop prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 300, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" &&
            result.origin.kind ===
                (fatal === "budget" ? "resource-limit" : "unsupported-operation"),
        "disposal engine stop",
    );
    string("out+':'+s.disposed+':'+s.dispose()", ":true:undefined", realm);
}
console.log("DisposableStack passed");
