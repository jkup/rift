# Rift REPL

An interactive Read-Eval-Print Loop for the Rift JavaScript engine.

## Features

- **Multi-line input support** - Automatically detects incomplete statements
- **Command history** - Navigate through previous commands
- **Built-in commands** - Special dot commands for REPL control
- **Smart output** - Suppresses undefined results for statements
- **Error handling** - Graceful error reporting
- **Pretty welcome screen** - Nice startup experience

## Building

```bash
# From the repl directory
./build.sh

# Or manually:
mkdir -p build && cd build
cmake ..
make
```

## Usage

```bash
# Run the REPL
./rift-repl

# Or from the project root
npm run repl
```

## REPL Commands

- `.help` - Show help message
- `.exit` / `.quit` - Exit the REPL
- `.clear` - Clear the screen
- `.history` - Show command history

## Examples

```javascript
> let x = 42
> x * 2
84

> console.log("Hello, World!")
Hello, World!

> let arr = [1, 2, 3]
> arr.length
3

> Math.max(10, 20, 5)
20

> if (x > 40) {
...   console.log("x is large")
... }
x is large
```

## Multi-line Input

The REPL automatically detects incomplete statements and allows multi-line input:

```javascript
> function greet(name) {
...   return "Hello, " + name + "!"
... }
> greet("World")
Hello, World!
```

Just press Enter on an empty line to execute multi-line statements.
