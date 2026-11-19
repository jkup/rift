// Test: Generator methods in classes
// This test verifies that generator method syntax is parsed correctly

class MyIterableClass {
    // Generator method
    *values() {
        yield 1;
        yield 2;
        yield 3;
    }

    // Static generator method
    static *range(n) {
        for (let i = 0; i < n; i++) {
            yield i;
        }
    }

    // Generator method with computed name
    *[Symbol.iterator]() {
        yield* this.values();
    }
}

console.log("Generator method parsing test passed!");
