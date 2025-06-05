#!/bin/bash

# Run test262 subset
echo "🧪 Running Test262 subset (first 20 tests)..."
echo "This will show how our runtime performs against the official ECMAScript test suite."
echo

node /tmp/test262-runner-demo.js

echo
echo "✅ Demo complete!"
echo
echo "To run the full test suite: npm test"
echo "To run more tests: node test262-runner.js"
echo "To build manually: ./build.sh" 