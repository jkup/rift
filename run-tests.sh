#!/bin/bash

echo "🚀 JSRuntime - Minimal JavaScript Runtime"
echo "========================================"
echo

# Build the runtime
echo "📦 Building runtime..."
./build.sh
echo

# Test basic functionality
echo "🧪 Testing basic functionality..."
echo "Testing: 2 + 3"
./build/jsruntime -e "2 + 3"
echo

echo "Testing: \"Hello\" + \" \" + \"World\""
./build/jsruntime -e '"Hello" + " " + "World"'
echo

echo "Testing: var x = 10; var y = 5; x + y * 2"
./build/jsruntime -e "var x = 10; var y = 5; x + y * 2"
echo

echo "Testing example file:"
./build/jsruntime examples/simple.js
echo

# Run test262 subset
echo "🧪 Running Test262 subset (first 20 tests)..."
echo "This will show how our runtime performs against the official ECMAScript test suite."
echo

# Modify the test runner to run fewer tests for demo
node -e "
const fs = require('fs');
let content = fs.readFileSync('test262-runner.js', 'utf8');
content = content.replace('const MAX_TESTS = 100;', 'const MAX_TESTS = 20;');
fs.writeFileSync('/tmp/test262-runner-demo.js', content);
"

node /tmp/test262-runner-demo.js

echo
echo "✅ Demo complete!"
echo
echo "To run the full test suite: npm test"
echo "To run more tests: node test262-runner.js"
echo "To build manually: ./build.sh" 