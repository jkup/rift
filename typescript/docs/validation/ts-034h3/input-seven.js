"use strict";
var total=0;
for(var i=0;i<4;i++){
  if(i===2)continue;
  total+=i;
}
out(total+3);
