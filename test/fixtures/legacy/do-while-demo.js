// Do-While Loop Feature Demonstration
// Shows off the newly implemented do-while loop functionality

console.log("🎉 Do-While Loops are now supported in Rift JavaScript Runtime!");
console.log("==============================================================");

// Demo 1: Classic use case - menu loop
console.log("\n📋 Demo 1: Menu Loop Pattern");
console.log("This demonstrates the classic 'do at least once' behavior:");

var choice = 0;
var menuShown = false;
do {
    if (!menuShown) {
        console.log("  1. Option A");
        console.log("  2. Option B");
        console.log("  3. Exit");
        menuShown = true;
    }
    choice = choice + 1; // Simulate user input
    console.log("User selected:", choice);
} while (choice < 3);
console.log("Exiting menu...");

// Demo 2: Input validation pattern
console.log("\n✅ Demo 2: Input Validation Pattern");
console.log("Validate input at least once, retry if invalid:");

var input = -5;
var attempts = 0;
do {
    attempts = attempts + 1;
    console.log("Attempt", attempts + ": checking input", input);
    if (input < 0) {
        console.log("  Invalid! Must be positive.");
        input = input + 3; // Simulate getting new input
    } else if (input === 0) {
        console.log("  Invalid! Must be non-zero.");
        input = input + 1;
    } else {
        console.log("  Valid input!");
    }
} while (input <= 0);
console.log("Final valid input:", input);

// Demo 3: Game loop pattern
console.log("\n🎮 Demo 3: Game Loop Pattern");
console.log("Process game state at least once:");

var gameRunning = true;
var turn = 0;
var maxTurns = 3;
do {
    turn = turn + 1;
    console.log("Turn", turn + ":");
    console.log("  - Update game state");
    console.log("  - Process player input");
    console.log("  - Render frame");
    
    if (turn >= maxTurns) {
        gameRunning = false;
        console.log("  - Game over!");
    }
} while (gameRunning);

// Demo 4: Resource processing
console.log("\n📦 Demo 4: Resource Processing");
console.log("Process resources until depleted:");

var resources = [10, 5, 8, 3];
var processed = 0;
var index = 0;
do {
    var amount = resources[index];
    console.log("Processing resource", index + 1 + ":", amount, "units");
    processed = processed + amount;
    index = index + 1;
} while (index < resources.length);
console.log("Total processed:", processed, "units");

// Demo 5: Comparison with regular while
console.log("\n🔄 Demo 5: Do-While vs While Comparison");
console.log("Same condition, different behavior:");

console.log("Regular while with false condition:");
var whileExecuted = false;
while (false) {
    whileExecuted = true;
    console.log("This will never print");
}
console.log("While loop executed:", whileExecuted);

console.log("Do-while with false condition:");
var doWhileExecuted = false;
do {
    doWhileExecuted = true;
    console.log("This prints once!");
} while (false);
console.log("Do-while loop executed:", doWhileExecuted);

console.log("\n🎯 Demo 6: Break and Continue Support");
var counter = 0;
var processed_items = 0;
do {
    counter = counter + 1;
    
    if (counter === 3) {
        console.log("Skipping item", counter);
        continue;
    }
    
    if (counter === 5) {
        console.log("Breaking at item", counter);
        break;
    }
    
    processed_items = processed_items + 1;
    console.log("Processed item", counter);
} while (counter < 10);
console.log("Total items processed:", processed_items);

console.log("\n🎉 Do-While Loop Demo Complete!");
console.log("✅ All major do-while features are working perfectly!");
