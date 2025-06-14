#!/bin/bash

# Run script for Rift REPL
set -e

# Check if REPL executable exists
if [ ! -f "./rift-repl" ]; then
    echo "REPL not found, building..."
    ./build.sh
    cd ..
fi

# Run the REPL
echo "Starting Rift REPL..."
./rift-repl 