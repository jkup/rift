import { evaluateScriptObserved } from "../src/script-throw-inspection.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    source: string,
    realm: Realm,
    session: ScriptSession = createScriptSession(),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "bigint-values", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind + ": " + source);
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases = [
    'typeof BigInt("9007199254740993")==="bigint"&&String(BigInt("9007199254740993"))==="9007199254740993"',
    'BigInt(7)===BigInt("7")&&BigInt(true)===BigInt(1)&&BigInt(false)===BigInt(0)&&BigInt("")===BigInt(0)',
    'BigInt("0xff")===BigInt(255)&&BigInt("0o17")===BigInt(15)&&BigInt("0b101")===BigInt(5)&&BigInt(" -0012 ")===BigInt(-12)',
    "!BigInt(0)&&!!BigInt(-1)&&BigInt(0)!==0&&Object.is(BigInt(0),BigInt(-0))",
    'String(BigInt("18446744073709551616")+BigInt(1))==="18446744073709551617"',
    'String(BigInt(2)**BigInt(128))==="340282366920938463463374607431768211456"',
    "BigInt(-7)/BigInt(3)===BigInt(-2)&&BigInt(-7)%BigInt(3)===BigInt(-1)",
    "BigInt(-7)>>BigInt(1)===BigInt(-4)&&BigInt(8)<<BigInt(-1)===BigInt(4)",
    "(BigInt(-1)&BigInt(7))===BigInt(7)&&(BigInt(-1)^BigInt(7))===BigInt(-8)",
    "~BigInt(7)===BigInt(-8)&&-BigInt(7)===BigInt(-7)&&void BigInt(1)===undefined",
    'BigInt(7)+"x"==="7x"&&"x"+BigInt(7)==="x7"',
    "var x=BigInt(7),old=x++;old===BigInt(7)&&x===BigInt(8)&&--x===BigInt(7)",
    "var x=BigInt(2);x**=BigInt(3);x+=BigInt(1);x===BigInt(9)",
    'var o={x:BigInt(7)},key={toString(){return "x"}};o[key]++===BigInt(7)&&o.x===BigInt(8)',
    'BigInt("9007199254740993")>9007199254740992&&BigInt("9007199254740993")<9007199254740994&&!(BigInt("9007199254740993")==9007199254740992)',
    "BigInt(1)<1.5&&BigInt(-1)>-1.5&&BigInt(0)>-0.5&&BigInt(0)<0.5&&1.5>BigInt(1)&&-1.5<BigInt(-1)",
    "BigInt(0)<Infinity&&BigInt(0)>-Infinity&&!(BigInt(0)<NaN)&&!(BigInt(0)>=NaN)",
    'BigInt(7)=="7"&&"0x7"==BigInt(7)&&BigInt(0)==""&&!(BigInt(7)=="7.0")&&!(BigInt(1)==1.5)',
    "BigInt(1)==true&&false==BigInt(0)&&BigInt(1)!=null&&undefined!=BigInt(0)",
    'BigInt(7)<"8"&&"6"<BigInt(7)&&!(BigInt(7)>="7.5")&&!("7.5"<=BigInt(7))',
    "var n=0,o={valueOf(){n++;return BigInt(7)}};o==BigInt(7)&&BigInt(7)==o&&n===2",
    'Number(BigInt("9007199254740993"))===9007199254740992&&new Number(BigInt(7)).valueOf()===7',
    'var b=Object(BigInt(7));typeof b==="object"&&b.valueOf()===BigInt(7)&&b.toString()==="7"&&Object.getPrototypeOf(b)===BigInt.prototype&&Object.prototype.toString.call(b)==="[object BigInt]"',
    'BigInt(255).toString(16)==="ff"&&BigInt(-255).toString(16)==="-ff"&&BigInt(0).toString(2)==="0"',
    'var n=0,r={valueOf(){n++;return 16}};BigInt(255).toString(r)==="ff"&&n===1',
    'BigInt.name==="BigInt"&&BigInt.length===1&&BigInt.prototype.constructor===BigInt&&BigInt.prototype.valueOf.length===0&&BigInt.prototype.toString.length===0',
    'var d=Object.getOwnPropertyDescriptor(BigInt.prototype.toString,"length");d.value===0&&!d.writable&&!d.enumerable&&d.configurable',
    "Object.getPrototypeOf(Reflect.construct(function(){},[],BigInt))===BigInt.prototype",
    "var touched=false,ok=false;try{new BigInt({valueOf(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "class B extends BigInt{}var ok=false;try{new B(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Reflect.construct(BigInt,[],function(){})}catch(e){ok=e instanceof TypeError}ok",
    'var m=new Map();m.set(BigInt("18446744073709551617"),7);m.set(1,8);m.set("1",9);m.get(BigInt("18446744073709551616")+BigInt(1))===7&&m.size===3',
    'var s=new Set([BigInt(1),BigInt("1"),1,"1"]);s.size===3&&s.has(BigInt(1))',
    'var o={[BigInt(7)]:8};o["7"]===8&&BigInt(7) in o',
    'JSON.stringify(BigInt(7),function(k,v){return typeof v==="bigint"?String(v):v})===\'"7"\'',
    'BigInt.prototype.toJSON=function(){return String(this)};JSON.stringify({x:BigInt(7),y:Object(BigInt(8))})===\'{"x":"7","y":"8"}\'',
    'var n=0;BigInt.prototype.toJSON=function(){n++;return 7};JSON.stringify(BigInt(2))==="7"&&n===1',
    'var trace="",a={valueOf(){trace+="L";return BigInt(2)}},b={valueOf(){trace+="R";return 3}};try{a*b}catch(e){trace+=e instanceof TypeError?"T":"?"}trace==="LRT"',
    'var trace="",a={valueOf(){trace+="L";return Symbol()}},b={valueOf(){trace+="R";return BigInt(3)}};try{a*b}catch(e){trace+=e instanceof TypeError?"T":"?"}trace==="LT"',
    'var trace="",a={valueOf(){trace+="L";return BigInt(2)}},b={valueOf(){trace+="R";throw 7}};try{a*b}catch(e){trace+=e}trace==="LR7"',
    "var b=Object(BigInt(7));b.valueOf=function(){throw 8};try{JSON.stringify(b)}catch(e){e instanceof TypeError}",
    "function* f(){var x=BigInt(2);return x+(yield 1)}var g=f();g.next();g.next(BigInt(3)).value===BigInt(5)",
    'var o={x:BigInt(2)};function* f(){return o[yield 1]++}var g=f();g.next();g.next("x").value===BigInt(2)&&o.x===BigInt(3)',
    'class A{get x(){return BigInt(7)}set x(v){this.saved=v}}class B extends A{*f(){return super[yield 1]++}}var b=new B(),g=b.f();g.next();g.next("x").value===BigInt(7)&&b.saved===BigInt(8)',
    "var ok=false;try{BigInt()}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(undefined)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(Symbol())}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new BigInt(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{+BigInt(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(1)+1}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(1)-1}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(1)>>>BigInt(0)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Math.abs(BigInt(1))}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{isFinite(BigInt(1))}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.prototype.valueOf.call({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.prototype.valueOf.call(BigInt.prototype)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{JSON.stringify(BigInt(1))}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{JSON.stringify([BigInt(1)])}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{JSON.stringify(Object(BigInt(1)))}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt(1.5)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(NaN)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(Infinity)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(1)/BigInt(0)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(1)%BigInt(0)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(2)**BigInt(-1)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(1).toString(1)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(1).toString(37)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{BigInt(1).toString(Infinity)}catch(e){ok=e instanceof RangeError}ok",
    'var ok=false;try{BigInt("1.5")}catch(e){ok=e instanceof SyntaxError}ok',
    'var ok=false;try{BigInt("1e3")}catch(e){ok=e instanceof SyntaxError}ok',
    'var ok=false;try{BigInt("1n")}catch(e){ok=e instanceof SyntaxError}ok',
    'var ok=false;try{BigInt("1_0")}catch(e){ok=e instanceof SyntaxError}ok',
    'var ok=false;try{BigInt("+0xff")}catch(e){ok=e instanceof SyntaxError}ok',
];

for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "BigInt value case " + i,
    );
}

const defining = new Realm((_line: string) => {}, "script");
const calling = new Realm((_line: string) => {}, "script");
const creator = createScriptSession();
run(
    "function fail(){return BigInt(1)+1}function box(){return Object(BigInt(7))}function* f(){return BigInt(2)**(yield 1)}var g=f();g.next();",
    defining,
    creator,
);
for (const name of ["fail", "box", "g"]) {
    define(calling, name, own(defining, name));
}
const steps = creator.inspect().steps;
const result = run("fail()", calling);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "BigInt error Realm",
);
const boxed = run("box()", calling);
check(
    boxed.type === "normal" &&
        boxed.value.kind === "object" &&
        boxed.value.object.getPrototypeOf() === defining.bigintPrototype,
    "BigInt box Realm",
);
const stopped = run(
    'g.next(BigInt("100000000000000000000000000000"))',
    calling,
    createScriptSession({ maxSteps: 200, maxCalls: 64 }),
);
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "resumed BigInt uses current budget",
);
check(creator.inspect().steps === steps, "creator untouched");

{
    const realm = new Realm((_line: string) => {}, "script"),
        session = createScriptSession();
    run(
        "var out;async function f(){return BigInt(2)+(await BigInt(3))}f().then(v=>out=v)",
        realm,
        session,
    );
    const jobs = drainScriptJobs(session);
    check(!jobs.fatal && jobs.failures.length === 0, "BigInt async jobs");
    const result = run("out===BigInt(5)", realm, session);
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "BigInt async arithmetic",
    );
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript(
        { id: "bigint-throw", text: 'throw BigInt("9007199254740993")' },
        realm,
    );
    if (prepared.kind !== "ready") {
        throw new Error("BigInt throw preparation");
    }
    const observed = evaluateScriptObserved(createScriptSession(), prepared.record);
    const completion = observed.evaluation.completion;
    check(
        completion.type === "throw" &&
            completion.value.kind === "bigint" &&
            completion.value.value === 9007199254740993n,
        "exact primitive throw",
    );
    check(observed.inspection?.kind === "absent", "primitive has no inspected constructor");
}
console.log("bigint values passed");
