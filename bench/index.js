// JavaScript Runtime Benchmark
// Compares Rift against Node, Deno, and Bun on real workloads.
// Each benchmark is large enough to dominate startup time.

// ---------------------------------------------------------------------------
// 1. Fibonacci (recursive) — function call overhead, recursion
// ---------------------------------------------------------------------------
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// ---------------------------------------------------------------------------
// 2. Sieve of Eratosthenes — loops, array indexed access, conditionals
// ---------------------------------------------------------------------------
function sieve(limit) {
  var flags = [];
  for (var i = 0; i <= limit; i++) flags.push(true);
  flags[0] = false;
  flags[1] = false;
  for (var p = 2; p * p <= limit; p++) {
    if (flags[p]) {
      for (var m = p * p; m <= limit; m += p) {
        flags[m] = false;
      }
    }
  }
  var count = 0;
  for (var i = 0; i <= limit; i++) {
    if (flags[i]) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 3. Array higher-order methods — filter, map, reduce at scale
// ---------------------------------------------------------------------------
function arrayWorkload(size) {
  var arr = [];
  for (var i = 0; i < size; i++) arr.push(i);

  var evens = arr.filter(function(x) { return x % 2 === 0; });
  var squared = evens.map(function(x) { return x * x; });
  var sum = squared.reduce(function(a, b) { return a + b; }, 0);
  return sum;
}

// ---------------------------------------------------------------------------
// 4. String building — concatenation, toUpperCase/toLowerCase, indexOf
// ---------------------------------------------------------------------------
function stringWorkload(iterations) {
  var str = "";
  for (var i = 0; i < iterations; i++) {
    str += "abcdefghij";
  }
  var upper = str.toUpperCase();
  var lower = upper.toLowerCase();
  var idx = lower.indexOf("abcdefghij");
  return lower.length + idx;
}

// ---------------------------------------------------------------------------
// 5. Object property access — creation, property read/write, hasOwnProperty
// ---------------------------------------------------------------------------
function objectWorkload(size) {
  var objects = [];
  for (var i = 0; i < size; i++) {
    var obj = {};
    obj.id = i;
    obj.name = "item_" + i;
    obj.value = i * 3.14;
    obj.active = i % 2 === 0;
    objects.push(obj);
  }

  var total = 0;
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].hasOwnProperty("value") && objects[i].active) {
      total += objects[i].value;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// 6. Closure & scope chain — tests lexical capture in hot loops
// ---------------------------------------------------------------------------
function closureWorkload(iterations) {
  function makeAdder(x) {
    return function(y) { return x + y; };
  }

  var adders = [];
  for (var i = 0; i < 100; i++) {
    adders.push(makeAdder(i));
  }

  var sum = 0;
  for (var round = 0; round < iterations; round++) {
    for (var i = 0; i < adders.length; i++) {
      sum += adders[i](round);
    }
  }
  return sum;
}

// ---------------------------------------------------------------------------
// 7. Prototype chain — method dispatch through inheritance
// ---------------------------------------------------------------------------
function prototypeWorkload(iterations) {
  function Base() { this.x = 1; }
  Base.prototype.getX = function() { return this.x; };
  Base.prototype.add = function(n) { return this.x + n; };

  function Child() { Base.call(this); this.y = 2; }
  Child.prototype = Object.create(Base.prototype);
  Child.prototype.constructor = Child;
  Child.prototype.getY = function() { return this.y; };
  Child.prototype.sum = function() { return this.getX() + this.getY(); };

  var obj = new Child();
  var total = 0;
  for (var i = 0; i < iterations; i++) {
    total += obj.sum() + obj.add(i);
  }
  return total;
}

// ---------------------------------------------------------------------------
// 8. Map & Set — insertion, lookup, deletion
// ---------------------------------------------------------------------------
function mapSetWorkload(size) {
  var map = new Map();
  for (var i = 0; i < size; i++) {
    map.set("key_" + i, i * i);
  }
  var sum = 0;
  for (var i = 0; i < size; i++) {
    if (map.has("key_" + i)) {
      sum += map.get("key_" + i);
    }
  }
  for (var i = 0; i < size; i += 2) {
    map.delete("key_" + i);
  }

  var set = new Set();
  for (var i = 0; i < size; i++) {
    set.add(i);
  }
  var count = 0;
  for (var i = 0; i < size; i++) {
    if (set.has(i)) count++;
  }
  return sum + count + map.size;
}

// ---------------------------------------------------------------------------
// 9. RegExp — repeated matching on a large string
// ---------------------------------------------------------------------------
function regexpWorkload(iterations) {
  var text = "";
  for (var i = 0; i < 200; i++) {
    text += "The quick brown fox jumps over the lazy dog. ";
  }
  var pattern = /quick.*fox/g;
  var count = 0;
  for (var round = 0; round < iterations; round++) {
    pattern.lastIndex = 0;
    while (pattern.test(text)) {
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 10. Sort — array sorting with comparator
// ---------------------------------------------------------------------------
function sortWorkload(size) {
  var arr = [];
  // Simple deterministic pseudo-random sequence
  var seed = 42;
  for (var i = 0; i < size; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    arr.push(seed);
  }

  arr.sort(function(a, b) { return a - b; });

  // Verify sorted
  var sorted = true;
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) { sorted = false; break; }
  }
  return sorted ? arr.length : -1;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
function run(name, fn) {
  var start = Date.now();
  var result = fn();
  var elapsed = Date.now() - start;
  console.log("  " + name + ": " + elapsed + "ms (result: " + result + ")");
  return elapsed;
}

console.log("JavaScript Runtime Benchmark");
console.log("============================");

var total = 0;
total += run("fibonacci(35)        ", function() { return fibonacci(35); });
total += run("sieve(100000)        ", function() { return sieve(100000); });
total += run("array ops (50k)      ", function() { return arrayWorkload(50000); });
total += run("string build (5k)    ", function() { return stringWorkload(5000); });
total += run("object ops (50k)     ", function() { return objectWorkload(50000); });
total += run("closures (1k rounds) ", function() { return closureWorkload(1000); });
total += run("prototype chain (50k)", function() { return prototypeWorkload(50000); });
total += run("map & set (20k)      ", function() { return mapSetWorkload(20000); });
total += run("regexp (100 rounds)  ", function() { return regexpWorkload(100); });
total += run("sort (20k)           ", function() { return sortWorkload(20000); });

console.log("----------------------------");
console.log("  Total: " + total + "ms");
