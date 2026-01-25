// Test ES6 Classes

// Test 1: Basic class declaration with constructor and methods
class Animal {
    constructor(name) {
        this.name = name;
    }

    speak() {
        return this.name + " makes a sound";
    }

    getName() {
        return this.name;
    }
}

var a = new Animal("Dog");
console.log(a.name === "Dog");  // true
console.log(a.speak() === "Dog makes a sound");  // true
console.log(a.getName() === "Dog");  // true

// Test 2: Class inheritance with extends
class Dog extends Animal {
    constructor(name, breed) {
        super(name);
        this.breed = breed;
    }

    speak() {
        return this.name + " barks";
    }

    getBreed() {
        return this.breed;
    }
}

var d = new Dog("Rex", "German Shepherd");
console.log(d.name === "Rex");  // true
console.log(d.breed === "German Shepherd");  // true
console.log(d.speak() === "Rex barks");  // true
console.log(d.getBreed() === "German Shepherd");  // true
console.log(d.getName() === "Rex");  // true (inherited method)

// Test 3: Static methods
class MathHelper {
    static add(a, b) {
        return a + b;
    }

    static multiply(a, b) {
        return a * b;
    }

    static PI() {
        return 3.14159;
    }
}

console.log(MathHelper.add(2, 3) === 5);  // true
console.log(MathHelper.multiply(2, 3) === 6);  // true
console.log(MathHelper.PI() === 3.14159);  // true

// Test 4: Class expression
var Counter = class {
    constructor() {
        this.count = 0;
    }

    increment() {
        this.count = this.count + 1;
        return this.count;
    }

    decrement() {
        this.count = this.count - 1;
        return this.count;
    }

    getCount() {
        return this.count;
    }
};

var c = new Counter();
console.log(c.getCount() === 0);  // true
console.log(c.increment() === 1);  // true
console.log(c.increment() === 2);  // true
console.log(c.decrement() === 1);  // true

// Test 5: super.method() calls
class Parent {
    greet() {
        return "Hello";
    }

    farewell() {
        return "Goodbye";
    }
}

class Child extends Parent {
    greet() {
        return super.greet() + " World";
    }

    // Inherit farewell() without override
}

var ch = new Child();
console.log(ch.greet() === "Hello World");  // true
console.log(ch.farewell() === "Goodbye");  // true (inherited)

// Test 6: Multiple levels of inheritance
class GrandParent {
    constructor(family) {
        this.family = family;
    }

    getFamilyName() {
        return this.family;
    }
}

class ParentPerson extends GrandParent {
    constructor(family, name) {
        super(family);
        this.name = name;
    }

    getName() {
        return this.name;
    }
}

class ChildPerson extends ParentPerson {
    constructor(family, name, age) {
        super(family, name);
        this.age = age;
    }

    getAge() {
        return this.age;
    }
}

var person = new ChildPerson("Smith", "John", 25);
console.log(person.getFamilyName() === "Smith");  // true
console.log(person.getName() === "John");  // true
console.log(person.getAge() === 25);  // true

// Test 7: Class with default parameters
class Rectangle {
    constructor(width = 10, height = 5) {
        this.width = width;
        this.height = height;
    }

    area() {
        return this.width * this.height;
    }
}

var r1 = new Rectangle();
console.log(r1.area() === 50);  // true (10 * 5)

var r2 = new Rectangle(20, 10);
console.log(r2.area() === 200);  // true

// Test 8: Class with rest parameters
class NumberCollection {
    constructor(...numbers) {
        this.numbers = numbers;
    }

    sum() {
        var total = 0;
        for (var i = 0; i < this.numbers.length; i++) {
            total = total + this.numbers[i];
        }
        return total;
    }
}

var nc = new NumberCollection(1, 2, 3, 4, 5);
console.log(nc.sum() === 15);  // true

// Test 9: Class cannot be called without new
var errorThrown = false;
try {
    Animal("Test");  // Should throw TypeError
} catch (e) {
    errorThrown = true;
}
console.log(errorThrown === true);  // true

// Test 10: Instanceof check
console.log(d instanceof Dog);  // true
console.log(d instanceof Animal);  // true (inheritance)

console.log("All class tests passed!");
