#!/bin/bash

# Requires the following to be installed: hyperfine, node, deno, bun

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 JavaScript Runtime Benchmark${NC}"
echo -e "${GREEN}================================${NC}"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BENCHMARK_FILE="$SCRIPT_DIR/index.js"

# Check if benchmark file exists
if [ ! -f "$BENCHMARK_FILE" ]; then
    echo -e "${RED}❌ Benchmark file not found: $BENCHMARK_FILE${NC}"
    exit 1
fi

# Build the runtime first
echo -e "${YELLOW}🔨 Building Rift runtime...${NC}"
cd "$PROJECT_ROOT"
if ! ./build.sh > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to build runtime${NC}"
    exit 1
fi

# Check if runtime executable exists
RIFT_RUNTIME="$PROJECT_ROOT/build/rift"
if [ ! -f "$RIFT_RUNTIME" ]; then
    echo -e "${RED}❌ Runtime executable not found: $RIFT_RUNTIME${NC}"
    exit 1
fi

# Check if other runtimes are available
echo -e "${YELLOW}🔍 Checking available runtimes...${NC}"

RUNTIMES=()
RUNTIME_COMMANDS=()

# Check Rift (our runtime)
RUNTIMES+=("Rift")
RUNTIME_COMMANDS+=("$RIFT_RUNTIME $BENCHMARK_FILE")

# Check Node.js
if command -v node &> /dev/null; then
    RUNTIMES+=("Node.js")
    RUNTIME_COMMANDS+=("node $BENCHMARK_FILE")
    echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js not found${NC}"
fi

# Check Deno
if command -v deno &> /dev/null; then
    RUNTIMES+=("Deno")
    RUNTIME_COMMANDS+=("deno run $BENCHMARK_FILE")
    echo -e "${GREEN}✅ Deno found: $(deno --version | head -n1)${NC}"
else
    echo -e "${YELLOW}⚠️  Deno not found${NC}"
fi

# Check Bun
if command -v bun &> /dev/null; then
    RUNTIMES+=("Bun")
    RUNTIME_COMMANDS+=("bun $BENCHMARK_FILE")
    echo -e "${GREEN}✅ Bun found: $(bun --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Bun not found${NC}"
fi

# Check if hyperfine is available
if ! command -v hyperfine &> /dev/null; then
    echo -e "${RED}❌ hyperfine not found. Please install it first:${NC}"
    echo -e "${YELLOW}  brew install hyperfine${NC}"
    echo -e "${YELLOW}  # or visit: https://github.com/sharkdp/hyperfine${NC}"
    exit 1
fi

echo -e "${GREEN}✅ hyperfine found: $(hyperfine --version)${NC}"

# No need to create results directory since we're just displaying results

echo ""
echo -e "${GREEN}🏁 Starting benchmark...${NC}"
echo -e "${GREEN}Benchmark file: $BENCHMARK_FILE${NC}"
echo -e "${GREEN}Runtimes: ${#RUNTIMES[@]}${NC}"
echo ""

# Run hyperfine benchmark
cd "$SCRIPT_DIR"

# Prepare hyperfine command
HYPERFINE_CMD="hyperfine"
HYPERFINE_CMD="$HYPERFINE_CMD --warmup 3"
HYPERFINE_CMD="$HYPERFINE_CMD --runs 10"

# Add command names and commands
for i in "${!RUNTIMES[@]}"; do
    HYPERFINE_CMD="$HYPERFINE_CMD --command-name '${RUNTIMES[$i]}'"
    HYPERFINE_CMD="$HYPERFINE_CMD '${RUNTIME_COMMANDS[$i]}'"
done

# Execute the benchmark
echo -e "${YELLOW}Running hyperfine with ${#RUNTIMES[@]} runtimes...${NC}"
eval $HYPERFINE_CMD

echo ""
echo -e "${GREEN}🎉 Benchmark completed! Results displayed above.${NC}" 