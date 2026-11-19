import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm = fresh(), steps = 20000, calls = 64): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "bind", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: calls });
    try {
        return evaluateScript(session, prepared.record).completion;
    } finally {
        check(
            session.inspect().active === null && session.inspect().calls === 0,
            "restored session",
        );
    }
}
function expect(result: ValueCompletion, value: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, value), label);
}
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"]) {
        expect(run(prefix + text), { kind: "boolean", value: true }, text);
    }
}
function expose(realm: Realm, name: string, result: ValueCompletion): void {
    if (result.type !== "normal") {
        throw new Error("expose " + name);
    }
    realm.defineScriptGlobal(name, { value: result.value });
}

passes(
    "function f(a,b){return this.x+a+b;}var b=f.bind({x:10},2);b(3)===15&&b.call({x:99},4)===16;",
);
passes(
    "function f(a,b,c){return this.x+a+b+c;}var b=f.bind({x:10},1).bind({x:99},2);b(3)===16&&b.name==='bound bound f'&&b.length===1;",
);
passes("var b=Array.prototype.join.bind([1,2,3],'-');b()==='1-2-3';");
passes(
    "function f(){}var call=f.call;var join=call.bind(Array.prototype.join);join([1,2],':')==='1:2';",
);
passes(
    "function f(){'use strict';return this;}f.bind(null)()===null&&f.bind(7)()===7&&f.bind()()===undefined;",
);
passes("var x={};function f(a){return a;}var b=f.bind(null,x);x.v=9;b()===x&&b().v===9;");
passes("var n=0;function f(){n++;}var b=f.bind(null);n===0&&typeof b==='function';");
passes(
    "function f(a,b){}var b=f.bind(null,1);b.length===1&&b.name==='bound f'&&!b.hasOwnProperty('prototype')&&Object.getOwnPropertyNames(b).join(',')==='length,name';",
);
passes(
    "function f(){}var b=f.bind(null);var l=Object.getOwnPropertyDescriptor(b,'length');var n=Object.getOwnPropertyDescriptor(b,'name');!l.writable&&!l.enumerable&&l.configurable&&!n.writable&&!n.enumerable&&n.configurable;",
);
passes("function f(){}var b=f.bind(null);b.toString()==='function () { [native code] }';");
passes(
    "function f(){}var bind=f.bind;bind.name==='bind'&&bind.length===1&&!bind.hasOwnProperty('prototype');",
);
passes(
    "function f(){}var d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f),'bind');d.writable&&!d.enumerable&&d.configurable;",
);
passes("function f(){}var ok=false;try{new f.bind();}catch(e){ok=e instanceof TypeError;}ok;");
for (const value of ["null", "undefined", "1", "{}", "Symbol()"]) {
    passes(
        "function f(){}var ok=false;try{f.bind.call(" +
            value +
            ");}catch(e){ok=e instanceof TypeError;}ok;",
    );
}

for (const row of [
    { value: "Infinity", expected: "Infinity" },
    { value: "-Infinity", expected: "0" },
    { value: "NaN", expected: "0" },
    { value: "3.9", expected: "2" },
    { value: "-1", expected: "0" },
    { value: "'5'", expected: "0" },
    { value: "{valueOf(){throw 9;}}", expected: "0" },
]) {
    passes(
        "function f(){}Object.defineProperty(f,'length',{value:" +
            row.value +
            "});f.bind(null,1).length===" +
            row.expected +
            ";",
    );
}
passes(
    "function f(){}Object.defineProperty(f,'name',{value:{toString(){throw 9;}}});f.bind().name==='bound ';",
);
passes(
    "var trace='';function f(){}Object.defineProperty(f,'length',{get(){trace+='l';return 4;}});Object.defineProperty(f,'name',{get(){trace+='n';return 'x';}});var b=f.bind(null,1);trace==='ln'&&b.length===3&&b.name==='bound x';",
);
passes(
    "var hit=false;function f(){}Object.defineProperty(f,'length',{get(){throw 7;}});Object.defineProperty(f,'name',{get(){hit=true;return 'x';}});var ok=false;try{f.bind();}catch(e){ok=e===7;}ok&&!hit;",
);
passes(
    "function f(){}Object.defineProperty(f,'name',{get(){throw 8;}});var ok=false;try{f.bind();}catch(e){ok=e===8;}ok;",
);
passes(
    "function f(){}var bind=f.bind;var p={};Object.defineProperty(p,'length',{get(){throw 9;}});p.name='inherited';delete f.length;delete f.name;Object.setPrototypeOf(f,p);var b=bind.call(f);b.length===0&&b.name==='bound inherited'&&Object.getPrototypeOf(b)===p;",
);
passes(
    "function f(){}var p=Object.getPrototypeOf(f);Object.defineProperty(f,'length',{get(){Object.setPrototypeOf(f,null);return 0;}});var b=f.bind();Object.getPrototypeOf(b)===p;",
);

passes(
    "function C(a,b){this.sum=a+b;}var receiver={};var B=C.bind(receiver,2);var x=new B(3);x.sum===5&&receiver.sum===undefined&&Object.getPrototypeOf(x)===C.prototype&&x instanceof C&&x instanceof B;",
);
passes(
    "function C(a,b){this.sum=a+b;}var B=C.bind(null,2).bind(null,3);var x=new B();x.sum===5&&x instanceof B&&x instanceof C;",
);
passes("function C(){return {x:7};}var B=C.bind(null);new B().x===7;");
passes(
    "var A=Array.bind(null,1,2);var a=new A(3);Array.isArray(a)&&a.join(',')==='1,2,3'&&a instanceof A;",
);
passes(
    "function C(){}var B=C.bind(null);B.prototype={};var p={x:3};C.prototype=p;Object.getPrototypeOf(new B())===p;",
);
passes(
    "var f={m(){return 3;}}.m.bind(null);var ok=false;try{new f();}catch(e){ok=e instanceof TypeError;}f()===3&&ok;",
);
passes(
    "var f=Math.abs.bind(null,-3);var ok=false;try{new f();}catch(e){ok=e instanceof TypeError;}f()===3&&ok;",
);
passes(
    "function C(){}var B=C.bind();Object.defineProperty(C,Symbol.hasInstance,{value:function(x){return x===7;}});7 instanceof B;",
);
passes(
    "function C(){}var bind=C.bind;Object.setPrototypeOf(C,null);var B=bind.call(C);var x=new B();x instanceof B;",
);
passes("function f(){throw 7;}var b=f.bind();var ok=false;try{b();}catch(e){ok=e===7;}ok;");
passes("function C(){throw 8;}var B=C.bind();var ok=false;try{new B();}catch(e){ok=e===8;}ok;");
passes(
    "function f(){}var b=f.bind();var ok=false;try{b.caller;}catch(e){ok=e instanceof TypeError;}ok;",
);

{
    const owner = fresh(),
        targetRealm = fresh(),
        caller = fresh();
    expose(caller, "bind", run("Object.getPrototypeOf(function(){}).bind;", owner));
    expose(caller, "target", run("function target(){return this;}target;", targetRealm));
    expose(caller, "targetGlobal", run("this;", targetRealm));
    expect(
        run(
            "var b=bind.call(target,null);b()===targetGlobal&&Object.getPrototypeOf(b)===Object.getPrototypeOf(target);",
            caller,
        ),
        { kind: "boolean", value: true },
        "target Realm this conversion and prototype",
    );
    const invalid = run("bind.call(null);", caller);
    check(
        invalid.type === "throw" &&
            invalid.value.kind === "object" &&
            invalid.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
        "bind error Realm",
    );
    expose(caller, "C", run("function C(){}C.prototype=0;C;", targetRealm));
    expose(caller, "targetPrototype", {
        type: "normal",
        value: { kind: "object", object: targetRealm.objectPrototype },
    });
    expect(
        run("var B=bind.call(C);Object.getPrototypeOf(new B())===targetPrototype;", caller),
        { kind: "boolean", value: true },
        "constructor fallback Realm",
    );
}
{
    const realm = fresh();
    const fault = new Error("host sentinel");
    const target = realm.createBuiltin(
        "target",
        0,
        (_receiver, _args, _context, _loc): ValueCompletion => {
            throw fault;
        },
    );
    realm.defineScriptGlobal("target", { value: { kind: "object", object: target } });
    let caught = false;
    try {
        run("target.bind()();", realm);
    } catch (error) {
        caught = error instanceof Error && error === fault;
    }
    check(caught, "host fault escapes unchanged");
}
for (const tail of ["b();", "new b();", "({}) instanceof b;"]) {
    const realm = fresh();
    check(
        run("function C(){}var b=C;for(var i=0;i<80;i++){b=b.bind(null);}", realm).type ===
            "normal",
        "prepare bound chain",
    );
    const result = run(tail, realm, 20000, 16);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded bound dispatch",
    );
}
{
    const realm = fresh();
    check(
        run(
            "function f(){}var args=[];for(var i=0;i<100;i++){args.push(i);}var b=f.bind(null,...args);",
            realm,
        ).type === "normal",
        "prepare bound arguments",
    );
    const result = run("b();", realm, 50);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded argument copying",
    );
}
{
    const realm = fresh();
    check(
        run(
            "function C(){}var bind=C.bind;Object.setPrototypeOf(C,null);var b=C;for(var i=0;i<2000;i++){b=bind.call(b);}",
            realm,
            100000,
        ).type === "normal",
        "prepare null-prototype chain",
    );
    const result = run("({}) instanceof b;", realm, 100);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded null-prototype instanceof chain",
    );
}
check(
    new Realm((_line: string) => {}).functionPrototype.getOwnProperty("bind") === undefined,
    "legacy unchanged",
);
console.log("Function bind passed");
