function makeCounter() {
    let count = 0;
    return { valueOf: function() {
        count = count + 1;
        return count;
    } };
}
let counter = makeCounter();
let mutating = {
    valueOf: function() {
        this.toString = function() { return 11; };
        return this;
    },
    toString: function() { return 99; }
};
let inner = { valueOf: function() { return 13; } };
let nested = { valueOf: function() { return bridge(inner); } };
let looping = { valueOf: function() { while (true) {} } };
let recursive = { valueOf: function() { return bridge(this); } };
