// Test class getter/setter support

function assert(condition, msg) {
    if (condition) {
        console.log("PASS - " + msg);
    } else {
        console.log("FAIL - " + msg);
    }
}

// Test 1: Instance getter
class WithGetter {
    get x() {
        return 42;
    }
}
var wg = new WithGetter();
assert(wg.x === 42, "instance getter");

// Test 2: Instance setter
class WithSetter {
    set x(val) {
        this._x = val;
    }
}
var ws = new WithSetter();
ws.x = 99;
assert(ws._x === 99, "instance setter");

// Test 3: Getter + setter pair
class GetSet {
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = v * 2;
    }
}
var gs = new GetSet();
gs.value = 5;
assert(gs.value === 10, "getter/setter pair");

// Test 4: Static getter
class WithStaticGetter {
    static get myName() {
        return "MyClass";
    }
}
assert(WithStaticGetter.myName === "MyClass", "static getter");

// Test 5: Static setter + getter pair
class WithStaticSetter {
    static set count(v) {
        WithStaticSetter._count = v;
    }
    static get count() {
        return WithStaticSetter._count;
    }
}
WithStaticSetter.count = 7;
assert(WithStaticSetter.count === 7, "static getter/setter pair");

// Test 6: Method named "get" (disambiguation)
class MethodNamedGet {
    get() {
        return "method-named-get";
    }
}
var mng = new MethodNamedGet();
assert(mng.get() === "method-named-get", "method named 'get' (disambiguation)");

// Test 7: Method named "set" (disambiguation)
class MethodNamedSet {
    set(val) {
        this._val = val;
    }
}
var mns = new MethodNamedSet();
mns.set(42);
assert(mns._val === 42, "method named 'set' (disambiguation)");

// Test 8: Getter inherited by instances
class Base {
    get info() {
        return "base-info";
    }
}
class Child extends Base {}
var child = new Child();
assert(child.info === "base-info", "getter inherited by child class");

// Test 9: Getter with constructor
class WithConstructorAndGetter {
    constructor(val) {
        this._val = val;
    }
    get doubled() {
        return this._val * 2;
    }
}
var wcg = new WithConstructorAndGetter(21);
assert(wcg.doubled === 42, "getter with constructor");

// Test 10: Getter on prototype, not own property
class ProtoGetter {
    get x() { return 1; }
}
var pg = new ProtoGetter();
var desc = Object.getOwnPropertyDescriptor(pg, "x");
assert(desc === undefined, "getter lives on prototype, not instance");
