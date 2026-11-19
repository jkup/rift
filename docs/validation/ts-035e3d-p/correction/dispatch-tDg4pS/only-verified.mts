type ChildV2 = any; type ObservedScriptEvaluation = any;
let current:any; const sentinel=new Error("host sentinel");
function check(ok:boolean,label:string){if(!ok)throw Error(label);}
function own(){throw Error("unreachable guest setup");} function object(){throw Error("unreachable guest setup");}
function createScriptSession(_limits:any){return {inspect(){current.trace.push("cleanup");return {active:null,calls:0,depth:0,steps:current.ticks,lastAbrupt:current.history};}};}
function prepareBoundedScript(unit:any,realm:any){current.trace.push("prepare:"+unit.id);if(current.preflightControl&&unit.id==="u3")throw Error("trailing test prepared");if(current.scenario==="prepare"&&unit.id==="u0")return {kind:"rejected"};return {kind:"ready",record:{unitId:unit.id,realm}};}
function evaluateScriptObserved(_session:any,record:any){current.trace.push("evaluate:"+record.unitId);current.ticks++;
 if(current.scenario==="host"&&record.unitId==="u2")throw sentinel;
 const fault=(current.scenario==="early"&&record.unitId==="u0")||(["throw","resource","unsupported"].includes(current.scenario)&&record.unitId==="u2");
 const snapshot=fault?{record,realm:record.realm,unitId:record.unitId,loc:{line:1,column:1}}:null;current.history=snapshot;
 return {source:snapshot,evaluation:{phase:"body",completion:fault?{type:"throw",origin:{kind:current.scenario==="resource"?"resource-limit":current.scenario==="unsupported"?"unsupported-operation":"guest"}}:{type:"normal"}}};}
class Harness {
 request={steps:100,calls:64,units:[{id:"u0",role:"harness",text:"a"},{id:"u1",role:"harness",text:"b"},{id:"u2",role:"harness",text:"control"},{id:"u3",role:"test",text:"poison"}],action:"execute"};
 trace:string[]=[]; ticks=0; history:any=null; records=new Map(); session:any=null; control="B01"; target=null; realm={}; completed:string[]=[]; verified=false;
 scenario="";preflightControl=true;
 realmFor(_u:any){return this.realm;}
 rejected(u:any,_p:any){this.trace.push("reject:"+u.id);return {terminal:u.id,kind:"prepare",completed:[]};}
 verifyControl(_o:any){this.trace.push("verify");this.verified=this.scenario!=="false";}
 observed(u:any,o:any){this.trace.push("project:"+u.id);if(o.evaluation.completion.type==="normal"&&u.role==="harness")this.completed.push(u.id);return {terminal:u.id,result:{kind:o.evaluation.completion.type},completed:this.completed.slice()};}
 envelope(){throw Error("unexpected parse-only");}
    run(): ChildV2 {
        const session = createScriptSession({ maxSteps: this.request.steps, maxCalls: this.request.calls });
        this.session = session;
        let steps = 0;
        for (const unit of this.request.units) {
            const prepared = prepareBoundedScript({ id: unit.id, text: unit.text }, this.realmFor(unit));
            if (prepared.kind !== "ready") return this.rejected(unit, prepared);
            this.records.set(prepared.record, unit.id);
            if (unit.role === "test" && this.request.action === "parse-only")
                return this.envelope({ stage: "test", phase: "parse", unitId: unit.id, realmId: "test" }, null, { kind: "normal" });
            let observed: ObservedScriptEvaluation;
            try { observed = evaluateScriptObserved(session, prepared.record); }
            finally {
                const state = session.inspect();
                check(state.active === null && state.calls === 0 && state.depth === 0 && state.steps >= steps, "Script cleanup/budget");
                steps = state.steps;
            }
            if (observed.source !== null) {
                const history = session.inspect().lastAbrupt;
                check(history !== null && history.record === observed.source.record && history.realm === observed.source.realm && history.unitId === observed.source.unitId &&
                    history.loc.line === observed.source.loc.line && history.loc.column === observed.source.loc.column, "original history retained");
            }
            if (this.control.startsWith("guest-") && unit.id === "u" + (this.request.units.length - 2) && observed.evaluation.completion.type === "normal") {
                const getter = own(this.realmFor(unit).globalObject, "getter");
                if (this.target === null) throw new Error("missing control target");
                if (this.control.endsWith("name")) object(own(this.realm.globalObject, "ctor")).bootstrapDefine("name", { get: getter, configurable: true });
                else this.target.bootstrapDefine("constructor", { get: getter, configurable: true });
            }
            const harnessControl = this.control.startsWith("B") || this.control.startsWith("N") || this.control === "I01";
            if (harnessControl ? unit.id === "u" + (this.request.units.length - 2) : unit.role === "test") this.verifyControl(observed);
            const answer = this.observed(unit, observed);
            // The closed preflight route stops at the actual control harness, even
            // when its oracle reports false. Never prepare the trailing test.
            if (this.preflightControl && this.verified && unit.id === "u" + (this.request.units.length - 2)) return answer;
            if (answer.result.kind !== "normal" || unit.role === "test") return answer;
        }
        throw new Error("missing test unit");
    }
}
export function exercise(scenario:string,preflight:boolean){const h=new Harness();h.scenario=scenario;h.preflightControl=preflight;current=h;let result:any=null,error:string|null=null;try{result=h.run();}catch(e){if(e!==sentinel)throw e;error="same-host-sentinel";}return {result,error,verified:h.verified,trace:h.trace};}
