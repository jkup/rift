const values=[0,-1,951782400123,1585443600000,1603587600000,-62167219200000,253402300800000,-8640000000000000,8640000000000000];
for(const value of values){
 const date=new Date(value);
 console.log("fields",value,date.getFullYear(),date.getMonth(),date.getDate(),date.getDay(),date.getHours(),date.getMinutes(),date.getSeconds(),date.getMilliseconds(),date.getTimezoneOffset());
 console.log("utc",value,date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),date.getUTCDay(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds(),date.getUTCMilliseconds());
 console.log("iso",date.toISOString());
}
const now=Date.now();console.log("clock",Number.isFinite(now)&&now>0&&now<8640000000000000);
console.log("clip",new Date(1.9).getTime(),new Date(-1.9).getTime(),Number.isNaN(new Date(8640000000000001).getTime()));
