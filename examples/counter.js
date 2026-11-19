function makeCounter(start) {
    let count = start;
    return function() {
        count = count + 1;
        return count;
    };
}
let meter = {
    next: makeCounter(10),
    total: 0,
    add: function(value) {
        this.total = this.total + value;
    }
};
let alias = meter;
let i = 0;
while (i < 3) {
    alias.add(meter.next());
    i = i + 1;
}
console.log("total", meter.total);
console.log("next", meter.next());
console.log("same object", alias === meter);
