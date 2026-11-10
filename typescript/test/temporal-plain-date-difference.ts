import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-difference", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'new Temporal.PlainDate(2024,2,28).until("2024-03-01").toString()==="P2D"',
    'new Temporal.PlainDate(2024,2,28).since("2024-03-01").toString()==="-P2D"',
    'new Temporal.PlainDate(2020,2,29).until("2021-02-28",{largestUnit:"year"}).toString()==="P11M30D"',
    'new Temporal.PlainDate(2021,2,28).until("2020-02-29",{largestUnit:"year"}).toString()==="-P11M28D"',
    'new Temporal.PlainDate(2020,2,29).since("2021-02-28",{largestUnit:"year"}).toString()==="-P11M30D"',
    'new Temporal.PlainDate(2023,1,31).until("2023-02-28",{largestUnit:"month"}).toString()==="P28D"',
    'new Temporal.PlainDate(2023,1,31).until("2023-02-28",{smallestUnit:"month"}).toString()==="P1M"',
    'new Temporal.PlainDate(2023,1,31).until("2023-02-28",{largestUnit:"month",roundingIncrement:10,roundingMode:"ceil"}).toString()==="P1M"',
    'new Temporal.PlainDate(2024,1,1).until("2024-01-17",{largestUnit:"week"}).toString()==="P2W2D"',
    'new Temporal.PlainDate(2024,1,1).until({year:2024,month:2,day:99}).toString()==="P59D"',
    'var log="";new Temporal.PlainDate(2024,1,1).until({get calendar(){log+="c"},get day(){log+="d";return 2},get month(){log+="m";return 1},get monthCode(){log+="C"},get year(){log+="y";return 2024}},{get largestUnit(){log+="l";return "year"},get roundingIncrement(){log+="i";return 1},get roundingMode(){log+="r";return "trunc"},get smallestUnit(){log+="s";return "day"}});log==="cdmCylirs"',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).until("bad",{get largestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{Temporal.PlainDate.prototype.until.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'new Temporal.PlainDate(-271821,4,19).until("+275760-09-13").days===200000001',
    'new Temporal.PlainDate(275760,9,13).until("-271821-04-19").days===-200000001',
    'new Temporal.PlainDate(275760,9,12).until("+275760-09-13",{roundingIncrement:2,roundingMode:"ceil"}).days===2',
    'new Temporal.PlainDate(275760,9,13).since("+275760-09-13",{smallestUnit:"year",roundingIncrement:1000000000}).blank',
    'var d=new Temporal.PlainDate(2024,1,1).since("2024-01-01");Object.is(d.years,0)&&Object.is(d.months,0)&&Object.is(d.weeks,0)&&Object.is(d.days,0)',
    'var date=new Temporal.PlainDate(2024,1,1);date.until("2024-01-02")!==date.until("2024-01-02")',
    'var d=new Temporal.PlainDate(2024,1,1);Object.defineProperty(d,"year",{get(){throw 1}});d.until("2024-01-02").days===1',
    'new Temporal.PlainDate(2023,4,1).since("2023-04-16",{smallestUnit:"month",roundingMode:"ceil"}).blank',
    'new Temporal.PlainDate(2023,4,1).since("2023-04-16",{smallestUnit:"month",roundingMode:"floor"}).months===-1',
    'new Temporal.PlainDate(2023,5,1).since("2023-04-16",{smallestUnit:"month",roundingMode:"ceil"}).months===1',
    'new Temporal.PlainDate(2023,5,1).since("2023-04-16",{smallestUnit:"month",roundingMode:"floor"}).blank',
]) passes(text);
for (const method of ["until", "since"]) {
    for (const options of ['{largestUnit:"hour"}','{smallestUnit:"hour"}','{largestUnit:"day",smallestUnit:"month"}','{roundingIncrement:0}','{roundingMode:"bad"}'])
        passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).'+method+'("2024-01-01",'+options+')}catch(e){ok=e instanceof RangeError}ok');
    passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).'+method+'("2024-01-02",null)}catch(e){ok=e instanceof TypeError}ok');
    passes('var ok=false;try{new Temporal.PlainDate(275760,9,12).'+method+'("+275760-09-13",{smallestUnit:"month"})}catch(e){ok=e instanceof RangeError}ok');
    passes('Temporal.PlainDate.prototype.'+method+'.length===1');
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"'+method+'");d.writable&&!d.enumerable&&d.configurable');
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const lookup = run('Temporal.PlainDate.prototype.'+method, defining);
    if (lookup.type !== "normal") throw new Error("method lookup");
    calling.defineScriptGlobal("dateDifference", { value: lookup.value });
    const result = run('dateDifference.call(new Temporal.PlainDate(2024,1,1),"2024-01-02")', calling);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === defining.temporalDurationPrototype, "defining Realm duration");
    const failed = run('dateDifference.call(new Temporal.PlainDate(2024,1,1),"bad")', calling);
    check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
}
const modes = ["ceil","floor","expand","trunc","halfCeil","halfFloor","halfExpand","halfTrunc","halfEven"];
const untilMonths = [1,0,1,0,1,0,1,0,0], sinceMonths = [0,-1,-1,0,0,-1,-1,0,0];
for (let i = 0; i < modes.length; i++)
    passes('var d=new Temporal.PlainDate(2023,4,1);var options={smallestUnit:"month",roundingMode:"'+modes[i]+'"};d.until("2023-04-16",options).months==='+untilMonths[i]+'&&d.since("2023-04-16",options).months==='+sinceMonths[i]);
console.log("temporal plain date difference passed");
