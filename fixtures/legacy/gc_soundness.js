// Regression test for GC soundness: objects reachable only through a local
// scope or a closure must survive a collection. Before the live-environment
// root fix, gc() could sweep these because only the global environment was a
// GC root.

var failures = 0;
function check(label, cond) {
    if (!cond) { console.log("FAIL: " + label); failures++; }
    else { console.log("ok:   " + label); }
}

// Case 1: object referenced only by a local variable, collected mid-function.
function localScope() {
    var obj = { secret: 42 };
    var arr = [1, 2, 3];
    gc(); // obj/arr are reachable only through this frame's environment
    return obj.secret + arr.length;
}
check("local-scope object survives gc()", localScope() === 45);

// Case 2: object captured in a closure (reachable only via the closure's
// environment, which is held alive by the returned function).
function makeCounter() {
    var captured = { count: 100 };
    return function () { captured.count++; return captured.count; };
}
var counter = makeCounter();
gc(); // 'captured' is reachable only through counter's closure environment
check("closure capture survives gc() (1st call)", counter() === 101);
gc();
check("closure capture survives gc() (2nd call)", counter() === 102);

// Case 3: nested closures across several scope levels.
function outer() {
    var a = { v: 1 };
    function middle() {
        var b = { v: 2 };
        return function () { return a.v + b.v; };
    }
    return middle();
}
var nested = outer();
gc();
check("nested closure chain survives gc()", nested() === 3);

// Case 4: many objects in a loop to push past the collection threshold,
// while a live local array holds references to them.
function stress() {
    var kept = [];
    for (var i = 0; i < 500; i++) {
        kept.push({ id: i });
    }
    gc();
    var sum = 0;
    for (var j = 0; j < kept.length; j++) {
        sum += kept[j].id;
    }
    return sum;
}
check("array of objects survives threshold + gc()", stress() === 124750);

if (failures === 0) {
    console.log("ALL GC SOUNDNESS TESTS PASSED");
} else {
    console.log("GC SOUNDNESS TESTS FAILED: " + failures);
}
