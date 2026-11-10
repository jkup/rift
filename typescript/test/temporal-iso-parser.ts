import { TemporalISOScanner, temporalISODate, temporalISOTime, temporalISOAnnotations } from "../src/temporal-iso-parser.js";
import { timeToNanoseconds } from "../src/temporal-time.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const dates = ['1970-01-01T','19700101T','+001970-01-01T','+0019700101T'];
for (const text of dates) {
    const scanner = new TemporalISOScanner(text), result = temporalISODate(scanner);
    check(result !== null && result.year === 1970 && result.month === 1 && result.day === 1 && scanner.peek() === 'T', text);
}
for (const text of ['0000-02-29','-000001-12-31','+999999-01-01','-999999-12-31']) check(temporalISODate(new TemporalISOScanner(text)) !== null, 'valid date '+text);
for (const text of ['','1970-0101','197001-01','1900-02-29','2000-02-30','2000-04-31','-000000-01-01','−000001-01-01','+1970-01-01','2000-00-01','2000-01-00']) check(temporalISODate(new TemporalISOScanner(text)) === null, 'invalid date '+text);
const times = ['12','1234','12:34','123456','12:34:56','12:34:56.123456789','123456,123456789','12:34:60.5'];
const nanos = [43200000000000n,45240000000000n,45240000000000n,45296000000000n,45296000000000n,45296123456789n,45296123456789n,45299500000000n];
for (let i=0;i<times.length;i++) {
    const scanner=new TemporalISOScanner(times[i]+'Z'),result=temporalISOTime(scanner);
    check(result!==null&&timeToNanoseconds(result)===nanos[i]&&scanner.peek()==='Z','time '+times[i]);
}
for (const text of ['','2','24','12:','12:60','12:34:61','12:34:56.','12:34:56.1234567890']) check(temporalISOTime(new TemporalISOScanner(text))===null,'invalid time '+text);
for(const text of ['12.5','12:34.5','1234:56']) {
    const scanner=new TemporalISOScanner(text),result=temporalISOTime(scanner);
    check(result!==null&&scanner.index<text.length,'caller validates trailing input '+text);
}
for(let digits=1;digits<=9;digits++) {
    const scanner=new TemporalISOScanner('00:00:00.'+'1'.repeat(digits)),result=temporalISOTime(scanner);
    check(result!==null&&timeToNanoseconds(result)===BigInt(Number('1'.repeat(digits))*Math.pow(10,9-digits)),'fraction '+digits);
}
for(const text of ['','[UTC]','[!Etc/GMT+1]','[Unknown/Zone]','[+0130]','[UTC][u-ca=iso8601]','[u-ca=one][u-ca=two]','[x=value-123]']) {
    const scanner=new TemporalISOScanner(text);check(temporalISOAnnotations(scanner)&&scanner.index===text.length,'annotation '+text);
}
for(const text of ['[]','[!]','[UTC][UTC]','[x=y][UTC]','[!x=y]','[u-ca=one][!u-ca=two]','[!u-ca=one][u-ca=two]','[x=a--b]','[A//B]','[+24]','[UTC]junk'])check(!temporalISOAnnotations(new TemporalISOScanner(text)),'invalid annotation '+text);
console.log('temporal iso parser passed');
