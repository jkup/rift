import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-helpers", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text +
            " expected " +
            expected +
            " actual " +
            (result.type +
                " " +
                result.value.kind +
                (result.value.kind === "string" ? ": " + result.value.value : "")),
    );
}
const cases: { source: string; before: string; after: string }[] = [
    {
        source: "async function* g(){yield* [1,Promise.resolve(2)];return 3}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
        before: "",
        after: "123",
    },
    {
        source: "async function* a(){yield 7;return 8}async function* g(){return yield* a()}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
        before: "",
        after: "78",
    },
    {
        source: "var p=Promise.resolve(7);var o={[Symbol.asyncIterator](){return this},next(){return {value:p,done:false}}};async function* g(){yield* o}g().next().then(r=>out+=r.value===p)",
        before: "",
        after: "true",
    },
    {
        source: "var p=Promise.resolve(7);var o={[Symbol.asyncIterator](){return this},next(){return {value:p,done:true}}};async function* g(){var x=yield* o;out+=x===p}g().next().then(r=>out+=r.done)",
        before: "",
        after: "truetrue",
    },
    {
        source: "var p=Promise.resolve(7);var o={[Symbol.asyncIterator](){return this},next(){return {value:p,done:true}}};async function* g(){return yield* o}g().next().then(r=>out+=r.value)",
        before: "",
        after: "7",
    },
    {
        source: 'var n=0,o={[Symbol.asyncIterator](){out+="a";return this},next(x){out+=":"+arguments.length+":"+x;return {value:++n,done:n>1}},get [Symbol.iterator](){throw 9}};async function* g(){yield* o}var i=g();i.next(99).then(r=>out+=":"+r.value);i.next(7).then(r=>out+=":"+r.done)',
        before: "a:1:undefined",
        after: "a:1:undefined:1:7:1:true",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},throw(x){out+="t"+x;return {value:8,done:true}}};async function* g(){var x=yield* o;return x+1}var i=g();i.next().then(r=>out+=r.value);i.throw(7).then(r=>out+=r.value)',
        before: "",
        after: "t719",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},throw(x){return {value:x,done:false}}};async function* g(){yield* o}var i=g();i.next().then(r=>out+=r.value);i.throw(7).then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
        before: "",
        after: "171",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},return(){out+="c";return {then(r){out+="a";r({})}}}};async function* g(){try{yield* o}catch(e){yield e instanceof TypeError}}var i=g();i.next().then(r=>out+=r.value);i.throw(7).then(r=>out+=r.value)',
        before: "",
        after: "c1atrue",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},return(){return Promise.reject(8)}};async function* g(){try{yield* o}catch(e){yield e}}var i=g();i.next().then(r=>out+=r.value);i.throw(7).then(r=>out+=r.value)",
        before: "",
        after: "18",
    },
    {
        source: 'var p=Promise.resolve(8),o={[Symbol.asyncIterator](){return this},next(){return {value:1}},return(x){out+="r"+x;return {value:p,done:true}}};async function* g(){yield* o;out+="bad"}var i=g();i.next().then(r=>out+=r.value);i.return(Promise.resolve(7)).then(r=>out+=r.value===p)',
        before: "",
        after: "1r7true",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {value:1}}};async function* g(){yield* o;out+="bad"}var i=g();i.next().then(r=>out+=r.value);i.return(7).then(r=>out+=r.value+":"+r.done)',
        before: "",
        after: "17:true",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},return(x){return {value:x,done:false}}};async function* g(){yield* o}var i=g();i.next().then(r=>out+=r.value);i.return(7).then(r=>out+=r.value);i.next().then(r=>out+=r.value)",
        before: "",
        after: "171",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return Promise.reject(7)},return(){out+="bad"}};async function* g(){try{yield* o}catch(e){yield e}}g().next().then(r=>out+=r.value)',
        before: "",
        after: "7",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return 7}};async function* g(){try{yield* o}catch(e){yield e instanceof TypeError}}g().next().then(r=>out+=r.value)",
        before: "",
        after: "true",
    },
    {
        source: 'var o={[Symbol.asyncIterator](){return this},next(){return {get done(){throw 7},get value(){out+="bad"}}}};async function* g(){try{yield* o}catch(e){yield e}}g().next().then(r=>out+=r.value)',
        before: "",
        after: "7",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {get value(){throw 7}}}};async function* g(){try{yield* o}catch(e){yield e}}g().next().then(r=>out+=r.value)",
        before: "",
        after: "7",
    },
    {
        source: 'var n=0,o={[Symbol.asyncIterator](){return this},get next(){out+="g";return function(){return {value:++n,done:n>1}}}};async function* g(){yield* o}var i=g();i.next().then(r=>out+=r.value);i.next().then(r=>out+=r.done)',
        before: "g",
        after: "g1true",
    },
    {
        source: "async function* g(){yield* (await Promise.resolve([7]));}g().next().then(r=>out+=r.value)",
        before: "",
        after: "7",
    },
    {
        source: "var o={[Symbol.asyncIterator](){return this},next(){return {value:1}},throw(x){return {value:x,done:false}}};async function* g(){yield* o}var i=g();i.next().then(r=>out+=r.value);i.return(Promise.reject(7)).then(r=>out+=r.value)",
        before: "",
        after: "17",
    },
];
for (const test of cases) {
    const realm = fresh(),
        session = createScriptSession();
    check(
        run("var out='';" + test.source, realm, session).type === "normal",
        "setup " + test.source,
    );
    string("out", test.before, realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "jobs " + test.source);
    string("out", test.after, realm, session);
}
{
    const owner = fresh(),
        caller = fresh(),
        creator = createScriptSession();
    check(
        run(
            'var c=Promise.withResolvers(),out="";var n=0,o={[Symbol.asyncIterator](){return this},next(){if(n++===0)return c.promise;return {value:8,done:false}}};async function* g(){yield* o}var i=g(),p=i.next();',
            owner,
            creator,
        ).type === "normal",
        "pending generator",
    );
    for (const name of ["c", "i", "p"]) {
        const property = owner.globalObject.getOwnProperty(name);
        if (property === undefined || property.kind !== "data") {
            throw new Error(name);
        }
        caller.defineScriptGlobal(name, { value: property.value });
    }
    caller.defineScriptGlobal("ownerPrototype", {
        value: { kind: "object", object: owner.objectPrototype },
    });
    const session = createScriptSession();
    check(
        run(
            'var out="";p.then(r=>out+=r.value+":"+(Object.getPrototypeOf(r)===ownerPrototype));i.next().then(r=>out+=":"+r.value);c.resolve({value:7,done:false});',
            caller,
            session,
        ).type === "normal",
        "foreign resolution",
    );
    const steps = creator.inspect().steps,
        drained = drainScriptJobs(session);
    check(
        !drained.fatal && drained.failures.length === 0 && creator.inspect().steps === steps,
        "generator current session",
    );
    string("out", "7:true:8", caller, session);
    check(
        run(
            'var next=(async function*(){})().return;next.call(i).then(r=>out+=":"+(Object.getPrototypeOf(r)===ownerPrototype));',
            caller,
            session,
        ).type === "normal",
        "foreign completion",
    );
    check(!drainScriptJobs(session).fatal, "completion checkpoint");
    string("out", "7:true:8:true", caller, session);
    check(
        run(
            'next=(async function*(){})().next;next.call(i).then(r=>out+=":"+(Object.getPrototypeOf(r)===Object.prototype));',
            caller,
            session,
        ).type === "normal",
        "completed foreign next",
    );
    check(!drainScriptJobs(session).fatal, "completed checkpoint");
    string("out", "7:true:8:true:true", caller, session);
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller restored");
}
{
    const realm = fresh(),
        session = createScriptSession({ maxSteps: 200, maxCalls: 16 });
    check(
        run(
            'var out="";async function* g(){try{yield* [1];while(true){}}finally{out+="bad"}}var i=g();i.next();i.next().catch(()=>out+="bad");',
            realm,
            session,
        ).type === "normal",
        "fatal setup",
    );
    const drained = drainScriptJobs(session);
    check(
        drained.fatal &&
            drained.failures.length === 1 &&
            drained.failures[0].completion.origin.kind === "resource-limit",
        "generator fatal budget",
    );
    string("out", "", realm, createScriptSession());
}
console.log("async generator delegate passed");
