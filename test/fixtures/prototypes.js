console.log(child.x, child.missing);
console.log(child.x = 31, parent.x);
parent.method = function() { return this.x; };
console.log(child.method());
parent.bump = function() { this.x = this.x + 1; return this.x; };
console.log(child.bump(), parent.x);
