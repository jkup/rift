// Test async generators (async function*)

// Test 1: Basic async generator declaration
async function* basicGen() {
  yield 1;
  yield 2;
  yield 3;
}

async function testBasic() {
  const g = basicGen();
  const r1 = await g.next();
  assert(r1.value === 1, "basic gen first value is 1");
  assert(r1.done === false, "basic gen first not done");

  const r2 = await g.next();
  assert(r2.value === 2, "basic gen second value is 2");

  const r3 = await g.next();
  assert(r3.value === 3, "basic gen third value is 3");

  const r4 = await g.next();
  assert(r4.value === undefined, "basic gen exhausted value is undefined");
  assert(r4.done === true, "basic gen exhausted is done");
}

// Test 2: Async generator expression
const exprGen = async function*() {
  yield 10;
  yield 20;
};

async function testExpression() {
  const g = exprGen();
  const r1 = await g.next();
  assert(r1.value === 10, "expr gen first value is 10");
  const r2 = await g.next();
  assert(r2.value === 20, "expr gen second value is 20");
  const r3 = await g.next();
  assert(r3.done === true, "expr gen exhausted");
}

// Test 3: Await inside async generator
async function* awaitGen() {
  const x = await Promise.resolve(42);
  yield x;
  const y = await Promise.resolve(100);
  yield y;
}

async function testAwaitInside() {
  const g = awaitGen();
  const r1 = await g.next();
  assert(r1.value === 42, "await gen yields awaited value 42");
  const r2 = await g.next();
  assert(r2.value === 100, "await gen yields awaited value 100");
  const r3 = await g.next();
  assert(r3.done === true, "await gen done");
}

// Test 4: For-await-of consuming async generator
async function* countTo(n) {
  for (let i = 1; i <= n; i++) {
    yield i;
  }
}

async function testForAwaitOf() {
  const results = [];
  for await (const x of countTo(5)) {
    results.push(x);
  }
  assert(results.length === 5, "for-await-of collects 5 items");
  assert(results[0] === 1, "for-await-of first is 1");
  assert(results[4] === 5, "for-await-of last is 5");
}

// Test 5: .return() on async generator
async function* returnGen() {
  yield 1;
  yield 2;
  yield 3;
}

async function testReturn() {
  const g = returnGen();
  const r1 = await g.next();
  assert(r1.value === 1, "return test first value");

  const r2 = await g.return(99);
  assert(r2.value === 99, "return gives back the value");
  assert(r2.done === true, "return marks as done");

  const r3 = await g.next();
  assert(r3.done === true, "after return, next is done");
}

// Test 6: .throw() on async generator
async function* throwGen() {
  yield 1;
  yield 2;
}

async function testThrow() {
  const g = throwGen();
  await g.next();

  let caught = false;
  try {
    await g.throw(new Error("test error"));
  } catch (e) {
    caught = true;
    assert(e.message === "test error", "throw propagates the error");
  }
  assert(caught === true, "throw causes rejection");
}

// Test 7: Class with async generator method
class AsyncCollection {
  constructor(items) {
    this.items = items;
  }

  async *[Symbol.asyncIterator]() {
    for (const item of this.items) {
      yield item;
    }
  }
}

async function testClassMethod() {
  const coll = new AsyncCollection([10, 20, 30]);
  const results = [];
  for await (const x of coll) {
    results.push(x);
  }
  assert(results.length === 3, "class async gen yields 3 items");
  assert(results[0] === 10, "class async gen first item");
  assert(results[2] === 30, "class async gen last item");
}

// Test 8: Combined yield and await
async function* combinedGen() {
  yield 'start';
  const val = await Promise.resolve('middle');
  yield val;
  yield 'end';
}

async function testCombined() {
  const results = [];
  for await (const x of combinedGen()) {
    results.push(x);
  }
  assert(results.length === 3, "combined gen yields 3 values");
  assert(results[0] === 'start', "combined first is start");
  assert(results[1] === 'middle', "combined second is middle (from await)");
  assert(results[2] === 'end', "combined third is end");
}

// Test 9: .throw() caught by try/catch inside generator
async function* throwCatchGen() {
  try {
    yield 1;
  } catch (e) {
    yield 'caught: ' + e;
  }
}

async function testThrowCaught() {
  const g = throwCatchGen();
  const r1 = await g.next();
  assert(r1.value === 1, "throw-catch first yield");

  const r2 = await g.throw('oops');
  assert(r2.value === 'caught: oops', "throw-catch yields caught value");
  assert(r2.done === false, "throw-catch not done after catch yield");

  const r3 = await g.next();
  assert(r3.done === true, "throw-catch done after catch block ends");
}

// Test 10: .return() executes finally blocks
async function testReturnFinally() {
  var log = [];
  async function* gen() {
    try {
      yield 1;
      yield 2;
    } finally {
      log.push('cleanup');
    }
  }

  const g = gen();
  const r1 = await g.next();
  assert(r1.value === 1, "return-finally first yield");

  const r2 = await g.return(99);
  assert(r2.value === 99, "return-finally resolves with return value");
  assert(r2.done === true, "return-finally is done");
  assert(log.length === 1, "return-finally ran cleanup");
  assert(log[0] === 'cleanup', "return-finally cleanup value");
}

// Run all tests
async function runAll() {
  await testBasic();
  await testExpression();
  await testAwaitInside();
  await testForAwaitOf();
  await testReturn();
  await testThrow();
  await testClassMethod();
  await testCombined();
  await testThrowCaught();
  await testReturnFinally();
}

runAll();
