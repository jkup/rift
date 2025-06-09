// JavaScript Runtime Benchmark
// This file tests basic JavaScript operations across different runtimes

// Fibonacci calculation (recursive) - tests function calls and recursion
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Prime number calculation - tests loops and arithmetic
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;

  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

// Array operations - tests array manipulation
function arrayOperations() {
  const arr = [];

  // Fill array
  for (let i = 0; i < 1000; i++) {
    arr.push(i * 2);
  }

  // Filter even numbers
  const evens = arr.filter((x) => x % 2 === 0);

  // Map to squares
  const squares = evens.map((x) => x * x);

  // Reduce to sum
  const sum = squares.reduce((acc, val) => acc + val, 0);

  return sum;
}

// String operations - tests string manipulation
function stringOperations() {
  let str = "Hello World";
  let result = "";

  for (let i = 0; i < 100; i++) {
    result += str.toUpperCase().toLowerCase().repeat(2);
  }

  return result.length;
}

// Object operations - tests object creation and property access
function objectOperations() {
  const objects = [];

  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      name: "Object " + i,
      value: i * i,
      active: i % 2 === 0,
    });
  }

  // Filter and transform
  const activeObjects = objects
    .filter((obj) => obj.active)
    .map((obj) => ({ ...obj, doubled: obj.value * 2 }));

  return activeObjects.length;
}

// Main benchmark execution
function runBenchmark() {
  console.log("Starting JavaScript Runtime Benchmark...");

  // Fibonacci (smaller number to avoid too much recursion)
  const fibResult = fibonacci(20);
  console.log(`Fibonacci(20): ${fibResult}`);

  // Prime checking
  let primeCount = 0;
  for (let i = 2; i < 100; i++) {
    if (isPrime(i)) primeCount++;
  }
  console.log(`Primes up to 100: ${primeCount}`);

  // Array operations
  const arrayResult = arrayOperations();
  console.log(`Array operations result: ${arrayResult}`);

  // String operations
  const stringResult = stringOperations();
  console.log(`String operations result: ${stringResult}`);

  // Object operations
  const objectResult = objectOperations();
  console.log(`Object operations result: ${objectResult}`);

  console.log("Benchmark completed!");
}

// Run the benchmark
runBenchmark();
