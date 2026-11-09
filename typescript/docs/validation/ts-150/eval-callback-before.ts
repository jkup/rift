type Callback = (a: number,b: number,c: number,d: number)=>number;
function invoke(callback: Callback): number { return callback(1,2,3,4); }
const fault=new Error("fault");
console.log(invoke((): number => { throw fault; }));
