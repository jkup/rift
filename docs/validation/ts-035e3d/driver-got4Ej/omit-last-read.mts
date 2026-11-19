let scenario="",trace:string[]=[],process={argv:[] as string[]};
function validateConformancePreflightArguments(_args:string[]){trace.push("validate");if(scenario==="invalid")throw Error("script-preflight/variant");}
function readFileSync(path:string,_encoding:string){trace.push("read:"+path);if(scenario==="missing"&&path==="SOURCE-3")throw Error("ENOENT");return path;}
function produceConformancePreflightControl(_args:string[],texts:string[]){trace.push("produce:"+texts.join(","));if(scenario==="source")throw Error("script-preflight/harness-source");return {child:{kind:"data-only"},report:{passed:false}};}
function scriptObservationJSONRecord(_child:any){trace.push("serialize");return "child";}
function writeFileSync(path:string,_text:string,options:any){trace.push("write:"+path+":"+options.flag);if(scenario==="child-write"&&path==="RESULT")throw Error("EEXIST");if(scenario==="report-write"&&path==="RESULT.control.json")throw Error("EEXIST");}
function main(){
    if (process.argv[2] === "conformance-preflight-v1") {
        const args = process.argv.slice(2);
        validateConformancePreflightArguments(args);
        const texts: string[] = [];
        for (let n = 17; n < args.length - 3; n += 3) texts.push(readFileSync(args[n + 2], "utf8"));
        const result = produceConformancePreflightControl(args, texts);
        writeFileSync(args[9], scriptObservationJSONRecord(result.child), { encoding: "utf8", flag: "wx" });
        writeFileSync(args[9] + ".control.json", JSON.stringify(result.report), { encoding: "utf8", flag: "wx" });
        return;
    }


throw Error("unexpected observation branch");}
export function exercise(name:string,args:string[]){scenario=name;trace=[];process.argv=["node","driver",...args];let error:string|null=null;try{main();}catch(e){if(!(e instanceof Error))throw e;error=e.message;}return {trace,error};}
