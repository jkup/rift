import { parseTemporalPlainTime } from "../src/temporal-plain-time-parse.js";
import { formatTemporalTime } from "../src/temporal-time-format.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function parses(text: string, expected: string): void {
    const time=parseTemporalPlainTime(text);
    check(time!==null&&formatTemporalTime(time)===expected,text+' => '+expected);
}
for(const text of ['12','T12','t12','12:00','T1200','1970-01-01T12','19700101t12','19700101 12','+999999-01-01T12','-999999-12-31T12'])parses(text,'12:00:00');
for(const text of ['1234','12:34','T1234','12:34+01','12:34-01:30','12:34+013045.123456789','12:34-01:30:45,123456789','12:34[UTC]','12:34[Unknown/Zone]','12:34[!UTC][u-ca=unknown]','12:34[!u-ca=iso8601]','12:34[u-ca=one][u-ca=two]','12:34[x=Y]'])parses(text,'12:34:00');
parses('12:34:56.123456789','12:34:56.123456789');
parses('123456,123456789','12:34:56.123456789');
parses('12:34:60.5','12:34:59.5');
parses('23:59:59.999999999+23:59:59.999999999','23:59:59.999999999');
parses('00:00:00-23:59','00:00:00');
for(const text of ['0101','0229','1130','1231','01-01','11-12','2021-12','010203','123412'])check(parseTemporalPlainTime(text)===null,'ambiguous '+text);
parses('T0101','01:01:00');
parses('t0229','02:29:00');
parses('T11-12','11:00:00');
parses('T2021-12','20:21:00');
parses('T010203','01:02:03');
parses('0230','02:30:00');
parses('0431','04:31:00');
parses('1301','13:01:00');
parses('23-03','23:00:00');
parses('202113','20:21:13');
for(const suffix of ['[UTC]','[u-ca=iso8601]'])check(parseTemporalPlainTime('1231'+suffix)===null,'annotations do not disambiguate '+suffix);
for(const text of ['', 'T', ' 12', '12 ', '12Z', '12z', 'T12Z', '1970-01-01T12Z','1970-01-01','19700101','1970-01-01T','-000000-01-01T12','2023-02-29T12','2000-04-31T12','1970-0101T12','197001-01T12','24:00','12:60','12:34:61','12.5','12:34.5','12:34:56.','12:34:56.1234567890','12:3456','1234:56','12+24','12+01:00:60','12+01:00.5','12+01:00:00.1234567890','12[UTC][UTC]','12[!x=y]','12[u-ca=one][!u-ca=two]','12[UTC]junk'])check(parseTemporalPlainTime(text)===null,'invalid '+text);
for(let hour=0;hour<24;hour++)for(let minute=0;minute<60;minute++){
    const text=(hour<10?'0':'')+hour+':'+(minute<10?'0':'')+minute+':59.123456789';
    parses(text,text);
}
console.log('temporal plain time parse passed');
