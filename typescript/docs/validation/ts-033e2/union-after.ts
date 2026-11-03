type V = {kind:"undefined"} | {kind:"number";value:number};
type T = {type:"throw";value:V;diagnostic:{message:string}};
type VC = {type:"normal";value:V} | T;
type SC = {type:"normal"|"break"|"continue";payload:{kind:"empty"}|{kind:"value";value:V}} | {type:"return";value:V} | T;
function convert(c:VC):SC {
    if(c.type === "throw") { const thrown:T=c; return thrown; }
    return {type:"normal",payload:{kind:"value",value:c.value}};
}
const thrown:T={type:"throw",value:{kind:"undefined"},diagnostic:{message:"original"}};
console.log(convert(thrown) === thrown);
