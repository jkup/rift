// Child request data, never admission, preflight verification, or a receipt.
                              
                                                                          
                                                                 
  
                                                                                  
                                     
                                                                  
                                                                           
                                                                              
  
function need(ok         , code        )       { if (!ok) throw new Error("script-producer/" + code); }
function keys(value        , expected          )          {
    const actual = Object.keys(value);
    return actual.length === expected.length && expected.every(key => actual.includes(key));
}
function id(value        )          {
    if (typeof value !== "string" || value.length === 0) return false;
    for (let n = 0; n < value.length; n++) if (value.charCodeAt(n) < 33 || value.charCodeAt(n) > 126) return false;
    return true;
}
function hash(value        )          {
    if (typeof value !== "string" || value.length !== 64) return false;
    for (let n = 0; n < value.length; n++) {
        const c = value.charCodeAt(n);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    }
    return true;
}
function decimal(text        )         {
    need(text.length > 0, "limit");
    for (let n = 0; n < text.length; n++) need(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    need(Number.isSafeInteger(value), "limit");
    return value;
}
// Typed ordinary host data only. No getter/Proxy/symbol hostility guarantee.
// The driver creates this object from positional strings, never JSON.parse.
export function validateScriptProducerRequest(request                       )       {
    need(keys(request, ["mode", "variant", "action", "nonce", "requestSha256", "preflightId", "limits", "units"]), "fields");
    need(request.mode === "conformance", "mode");
    need(request.variant === "raw" || request.variant === "non-strict" || request.variant === "strict", "variant");
    need(request.action === "execute" || request.action === "parse-only", "action");
    need(id(request.nonce), "nonce");
    need(hash(request.requestSha256), "request-hash");
    need(request.preflightId === null || (id(request.preflightId) && request.preflightId !== "-"), "preflight");
    const limits = request.limits;
    need(keys(limits, ["sourceUnits", "parseDepth", "steps", "calls", "evaluationDepth", "wallMs", "outputBytes"]), "limit-fields");
    for (const value of [limits.sourceUnits, limits.parseDepth, limits.steps, limits.calls, limits.evaluationDepth, limits.wallMs, limits.outputBytes])
        need(Number.isSafeInteger(value) && value >= 0, "limit");
    need(limits.sourceUnits === 100000 && limits.parseDepth === 128 && limits.evaluationDepth === 256, "fixed-limit");
    need(limits.wallMs <= 2147483647, "wall-limit");
    need(request.units.length > 0, "units");
    for (let n = 0; n < request.units.length; n++) {
        const unit = request.units[n];
        need(keys(unit, ["id", "role", "text"]), "unit-fields");
        need(unit.id === "u" + n && unit.role === (n === request.units.length - 1 ? "test" : "harness") && typeof unit.text === "string", "unit");
    }
    need(request.variant === "raw" ? request.units.length === 1 && request.preflightId === null : request.preflightId !== null, "variant-preflight");
}
                                                                                                                    
export function parseScriptProducerArguments(args          )                          {
    need(args.length >= 17 && (args.length - 14) % 3 === 0, "argc");
    need(args[0] === "conformance", "mode");
    need(args[1] === "raw" || args[1] === "non-strict" || args[1] === "strict", "variant");
    need(args[2] === "execute" || args[2] === "parse-only", "action");
    need(id(args[3]), "nonce");
    need(hash(args[4]), "request-hash");
    need(id(args[5]), "preflight");
    need(args[6].length > 0, "result-path");
    const limits                 = { sourceUnits: decimal(args[7]), parseDepth: decimal(args[8]), steps: decimal(args[9]),
        calls: decimal(args[10]), evaluationDepth: decimal(args[11]), wallMs: decimal(args[12]), outputBytes: decimal(args[13]) };
    const request                        = { mode: "conformance", variant: args[1]                                    ,
        action: args[2]                                   , nonce: args[3], requestSha256: args[4],
        preflightId: args[5] === "-" ? null : args[5], limits, units: [] };
    const sourcePaths           = [];
    for (let n = 14; n < args.length; n += 3) {
        need(args[n] === "u" + ((n - 14) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        request.units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
        sourcePaths.push(args[n + 2]);
    }
    validateScriptProducerRequest(request);
    return { request, resultPath: args[6], sourcePaths };
}
