// Literal binding and scope spans, independent of the new audit implementation.
const pair=(scopeStart,scopeEnd,name,a,b,line=1,colA=a+1,colB=b+1)=>({ruleCode:'duplicate-block-lexical-function',scopeStart,scopeEnd,
 first:{name,start:a,end:a+name.length,loc:{line,column:colA}},second:{name,start:b,end:b+name.length,loc:{line,column:colB}}});
export const candidates={
 B01:[pair(14,45,'f',24,39)], B07:[pair(27,58,'f',37,52)], B08:[pair(28,59,'f',38,53)],
 B13:[pair(29,60,'f',39,54)], B18:[pair(14,45,'f',24,39)], B19:[pair(32,63,'f',42,57)],
 B20:[pair(14,45,'f',24,39),pair(46,77,'g',56,71)], D01:[pair(23,54,'f',33,48)],
 D07:[pair(40,71,'f',50,65)], L01:[pair(14,45,'f',24,39)], L03:[pair(14,45,'f',24,39)],
 R0:[pair(14,53,'alpha',24,43)], R1:[pair(31,68,'beta',41,59)],
 S22:[pair(624,659,'f',635,651,23,12,28)]
};
export const scopeRows=['B03','B04','B14','B15','B17','D02','D03','D04'];
export const conflictRows=['B10','B11','B12','B16','B21'];
