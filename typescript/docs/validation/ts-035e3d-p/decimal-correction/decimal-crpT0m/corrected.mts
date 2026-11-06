function preflightNeed(ok:boolean,code:string):void {if(!ok)throw new Error("script-preflight/"+code);}
function preflightDecimal(text: string): number {
    if (text.length === 0) throw new Error("script-preflight/limit");
    for (let n = 0; n < text.length; n++) preflightNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    preflightNeed(Number.isSafeInteger(value), "limit");
    return value;
}
export {preflightDecimal};
