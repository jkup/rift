#!/bin/bash

# JavaScript Runtime Benchmark
# Compares Rift against Node, Deno, and Bun using hyperfine.
# Requires: hyperfine (brew install hyperfine)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BENCHMARK_FILE="$SCRIPT_DIR/index.js"
RIFT_RUNTIME="$PROJECT_ROOT/build/rift"

# ── Pre-flight checks ──────────────────────────────────────────────────────

if [ ! -f "$BENCHMARK_FILE" ]; then
    echo -e "${RED}Benchmark file not found: $BENCHMARK_FILE${NC}"
    exit 1
fi

if ! command -v hyperfine &> /dev/null; then
    echo -e "${RED}hyperfine not found. Install with: brew install hyperfine${NC}"
    exit 1
fi

# ── Build Rift (incremental) ───────────────────────────────────────────────

echo -e "${YELLOW}Building Rift (incremental)...${NC}"
if [ -d "$PROJECT_ROOT/build" ]; then
    make -C "$PROJECT_ROOT/build" -j$(sysctl -n hw.ncpu 2>/dev/null || nproc) > /dev/null 2>&1
else
    (cd "$PROJECT_ROOT" && ./build.sh > /dev/null 2>&1)
fi

if [ ! -f "$RIFT_RUNTIME" ]; then
    echo -e "${RED}Build failed — $RIFT_RUNTIME not found${NC}"
    exit 1
fi

# ── Detect available runtimes ──────────────────────────────────────────────

echo ""
echo -e "${GREEN}JavaScript Runtime Benchmark${NC}"
echo -e "${GREEN}============================${NC}"
echo ""

NAMES=("Rift")
COMMANDS=("$RIFT_RUNTIME $BENCHMARK_FILE")
echo -e "  Rift:    $($RIFT_RUNTIME -e 'console.log("ok")' 2>/dev/null && echo "ready" || echo "ready")"

if command -v node &> /dev/null; then
    NAMES+=("Node.js")
    COMMANDS+=("node $BENCHMARK_FILE")
    echo -e "  Node.js: $(node --version)"
fi

if command -v deno &> /dev/null; then
    NAMES+=("Deno")
    COMMANDS+=("deno run $BENCHMARK_FILE")
    echo -e "  Deno:    $(deno --version 2>/dev/null | head -n1)"
fi

if command -v bun &> /dev/null; then
    NAMES+=("Bun")
    COMMANDS+=("bun $BENCHMARK_FILE")
    echo -e "  Bun:     $(bun --version)"
fi

echo ""

# ── Quick sanity run ───────────────────────────────────────────────────────
# Make sure the benchmark actually completes on Rift before doing timed runs.

echo -e "${YELLOW}Verifying Rift can run the benchmark...${NC}"
if ! "$RIFT_RUNTIME" "$BENCHMARK_FILE" > /dev/null 2>&1; then
    echo -e "${RED}Rift failed to run the benchmark. Output:${NC}"
    "$RIFT_RUNTIME" "$BENCHMARK_FILE" 2>&1 | tail -20
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# ── Run with hyperfine ─────────────────────────────────────────────────────

ARGS=()
for i in "${!NAMES[@]}"; do
    ARGS+=("--command-name" "${NAMES[$i]}" "${COMMANDS[$i]}")
done

hyperfine --warmup 1 --runs 5 "${ARGS[@]}"
