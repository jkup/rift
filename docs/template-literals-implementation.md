# Template Literals Implementation Plan for Rift JavaScript Engine

## Executive Summary

Template literals (`` `string ${expr}` ``) are a critical ES6 feature required for test262 compatibility. This document provides a complete implementation roadmap for adding template literal support to the Rift JavaScript runtime.

## 🎯 **Goal: Enable test262 Harness Compatibility**

Template literals are blocking test262 execution because:
- ✅ **Core language features** implemented (variables, functions, objects, etc.)
- ✅ **Exception handling** working (try/catch/throw)  
- ✅ **Built-in objects** comprehensive (Array, String, Object, etc.)
- ❌ **Template literals** missing - required by test262 harness code
- ❌ **For loops** missing - also needed by test262

**Priority**: High - Template literals are likely the final blocker for test262 compatibility.

## Template Literal Overview

### Syntax Examples
```javascript
// Basic interpolation
const name = "World";
const greeting = `Hello ${name}!`;  // "Hello World!"

// Multi-line support
const multiline = `Line 1
Line 2
Line 3`;

// Expression interpolation
const x = 5, y = 10;
const result = `Sum: ${x + y}, Product: ${x * y}`;  // "Sum: 15, Product: 50"

// Nested template literals (advanced)
const nested = `Outer ${`inner ${42}`} end`;  // "Outer inner 42 end"

// Escape sequences
const escaped = `Tab: \t Quote: \" Backslash: \\`;
```

### Key Differences from Regular Strings
1. **Backtick delimiters**: `` ` `` instead of `"` or `'`
2. **Expression interpolation**: `${expression}` evaluates and inserts result
3. **Multi-line preserves whitespace**: No need for `\n` escape sequences
4. **Different escape rules**: Backticks must be escaped as `` \` ``

## Implementation Plan

### Phase 1: Lexer Changes ⚡ **HIGH PRIORITY**

#### 1.1: Add Template Literal Token Types
**File**: `include/rift/frontend/lexer/token.h`

```cpp
enum class TokenType {
    // ... existing tokens ...
    
    // Template literal tokens
    TemplateString,        // Template literal without expressions: `hello`
    TemplateStart,         // Start of template: `hello ${
    TemplateMiddle,        // Middle of template: } world ${  
    TemplateEnd,           // End of template: } goodbye`
    TemplateDollar,        // The ${ token
    
    // ... rest of tokens ...
};
```

#### 1.2: Implement Template Literal Lexing
**File**: `src/frontend/lexer/lexer.cpp`

```cpp
class Lexer {
private:
    std::stack<LexerState> state_stack_;  // Track lexer state for nested expressions
    
    enum class LexerState {
        Normal,
        TemplateString,     // Inside template literal
        TemplateExpression  // Inside ${} expression
    };
    
    Token read_template_literal();
    Token read_template_part();
    bool is_template_end();
    
public:
    // ... existing methods ...
};

Token Lexer::read_template_literal() {
    advance();  // Skip opening backtick
    
    std::string value;
    std::vector<Token> parts;
    
    while (current_char() != '`' && current_char() != '\0') {
        if (current_char() == '$' && peek_char() == '{') {
            // Found expression interpolation
            if (!value.empty()) {
                // Emit string part before expression
                parts.push_back(Token(TokenType::TemplateStart, value, line, column));
                value.clear();
            }
            
            advance(); advance();  // Skip ${
            return Token(TokenType::TemplateDollar, "${", line, column);
        }
        
        // Handle escape sequences
        if (current_char() == '\\') {
            advance();
            switch (current_char()) {
                case 'n': value += '\n'; break;
                case 't': value += '\t'; break;
                case 'r': value += '\r'; break;
                case '\\': value += '\\'; break;
                case '`': value += '`'; break;
                case '$': value += '$'; break;
                default: value += current_char(); break;
            }
        } else {
            value += current_char();
        }
        advance();
    }
    
    if (current_char() == '`') {
        advance();  // Skip closing backtick
    }
    
    return Token(TokenType::TemplateString, value, line, column);
}
```

### Phase 2: AST Changes ⚡ **HIGH PRIORITY**

#### 2.1: Add Template Literal AST Node
**File**: `include/rift/frontend/ast/ast_node.h`

```cpp
enum class ASTNodeType {
    // ... existing types ...
    TemplateLiteral,        // Complete template literal
    TemplateElement,        // String part of template
    TemplateExpression,     // ${expression} part
    // ... rest of types ...
};
```

#### 2.2: AST Factory Support
**File**: `include/rift/frontend/ast/ast_factory.h`

```cpp
class ASTFactory {
public:
    // ... existing methods ...
    
    static std::shared_ptr<ASTNode> makeTemplateLiteral() {
        return std::make_shared<ASTNode>(ASTNodeType::TemplateLiteral);
    }
    
    static std::shared_ptr<ASTNode> makeTemplateElement(const std::string& value) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::TemplateElement, value);
        return node;
    }
    
    static std::shared_ptr<ASTNode> makeTemplateExpression(std::shared_ptr<ASTNode> expression) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::TemplateExpression);
        node->children.push_back(expression);
        return node;
    }
    
    static void addTemplateElement(std::shared_ptr<ASTNode> templateLiteral, 
                                  std::shared_ptr<ASTNode> element) {
        templateLiteral->children.push_back(element);
    }
};
```

### Phase 3: Parser Changes ⚡ **HIGH PRIORITY**

#### 3.1: Add Template Literal Parsing
**File**: `src/frontend/parser/parser.cpp`

```cpp
class Parser {
private:
    std::shared_ptr<ASTNode> parse_template_literal();
    
public:
    // ... existing methods ...
};

std::shared_ptr<ASTNode> Parser::parse_primary() {
    // ... existing primary expression parsing ...
    
    if (current_token().type == TokenType::TemplateString) {
        return parse_template_literal();
    }
    
    // ... rest of primary parsing ...
}

std::shared_ptr<ASTNode> Parser::parse_template_literal() {
    auto templateLiteral = ASTFactory::makeTemplateLiteral();
    
    while (current_token().type != TokenType::EndOfFile) {
        if (current_token().type == TokenType::TemplateString) {
            // Simple template without expressions: `hello`
            auto element = ASTFactory::makeTemplateElement(current_token().value);
            ASTFactory::addTemplateElement(templateLiteral, element);
            advance();
            break;
        }
        else if (current_token().type == TokenType::TemplateStart ||
                 current_token().type == TokenType::TemplateMiddle) {
            // String part before expression
            auto element = ASTFactory::makeTemplateElement(current_token().value);
            ASTFactory::addTemplateElement(templateLiteral, element);
            advance();
        }
        else if (current_token().type == TokenType::TemplateDollar) {
            // Parse expression inside ${}
            advance(); // Skip ${
            
            auto expression = parse_expression();
            auto templateExpr = ASTFactory::makeTemplateExpression(expression);
            ASTFactory::addTemplateElement(templateLiteral, templateExpr);
            
            // Expect closing }
            if (current_token().type == TokenType::RightBrace) {
                advance();
            } else {
                throw std::runtime_error("Expected '}' after template expression");
            }
        }
        else if (current_token().type == TokenType::TemplateEnd) {
            // Final string part after last expression
            auto element = ASTFactory::makeTemplateElement(current_token().value);
            ASTFactory::addTemplateElement(templateLiteral, element);
            advance();
            break;
        }
        else {
            break;
        }
    }
    
    return templateLiteral;
}
```

### Phase 4: Evaluation ⚡ **HIGH PRIORITY**

#### 4.1: Add Template Literal Evaluation
**File**: `src/core/engine/expression_evaluator.cpp`

```cpp
class ExpressionEvaluator {
public:
    static Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
        // ... existing evaluation ...
        
        case ASTNodeType::TemplateLiteral:
            return evaluateTemplateLiteral(node, env, engine);
            
        // ... rest of evaluation ...
    }
    
private:
    static Value evaluateTemplateLiteral(std::shared_ptr<ASTNode> node, 
                                       std::shared_ptr<Environment> env, 
                                       Rift* engine);
};

Value ExpressionEvaluator::evaluateTemplateLiteral(std::shared_ptr<ASTNode> node, 
                                                  std::shared_ptr<Environment> env, 
                                                  Rift* engine) {
    std::string result;
    
    for (const auto& child : node->children) {
        if (child->type == ASTNodeType::TemplateElement) {
            // String literal part - add directly
            result += child->value;
        }
        else if (child->type == ASTNodeType::TemplateExpression) {
            // Expression part - evaluate and convert to string
            if (!child->children.empty()) {
                Value expressionValue = engine->evaluate(child->children[0], env);
                result += expressionValue.toString();
            }
        }
    }
    
    return Value(result);
}
```

### Phase 5: Integration & Testing 🧪

#### 5.1: Basic Functionality Tests
**File**: `test/template-literals-basic-test.js`

```javascript
// Test 1: Simple template without expressions
var simple = `Hello World`;
console.log("Simple template:", simple);

// Test 2: Single expression interpolation
var name = "Alice";
var greeting = `Hello ${name}!`;
console.log("Single interpolation:", greeting);

// Test 3: Multiple expressions
var x = 5, y = 10;
var math = `${x} + ${y} = ${x + y}`;
console.log("Multiple expressions:", math);

// Test 4: Multi-line template
var multiline = `Line 1
Line 2
Line 3`;
console.log("Multi-line:", multiline);

// Test 5: Escape sequences
var escaped = `Quote: \" Backslash: \\ Backtick: \``;
console.log("Escaped:", escaped);
```

#### 5.2: Advanced Tests
**File**: `test/template-literals-advanced-test.js`

```javascript
// Test 1: Complex expressions
var obj = { x: 10, y: 20 };
var complex = `Object: ${obj.x}, Array: ${[1,2,3].length}`;
console.log("Complex expressions:", complex);

// Test 2: Function calls in expressions
function double(n) { return n * 2; }
var funcCall = `Double of 5 is ${double(5)}`;
console.log("Function call:", funcCall);

// Test 3: Nested object access
var person = { 
    name: "Bob", 
    address: { city: "New York" } 
};
var nested = `${person.name} lives in ${person.address.city}`;
console.log("Nested access:", nested);

// Test 4: Edge cases
var empty = ``;
var onlyExpression = `${42}`;
var emptyExpression = `${""}`;
console.log("Edge cases:", empty, onlyExpression, emptyExpression);
```

#### 5.3: Error Handling Tests
**File**: `test/template-literals-errors-test.js`

```javascript
// Test error conditions and recovery

// Test 1: Unclosed template (should be caught by parser)
try {
    // This should cause a parsing error
    // var unclosed = `hello ${world
} catch (e) {
    console.log("Unclosed template error:", e);
}

// Test 2: Invalid expression in interpolation
try {
    var invalid = `Hello ${undefined.property}`;
    console.log("Should not reach here");
} catch (e) {
    console.log("Invalid expression error:", e);
}

// Test 3: Nested templates (if supported)
var outer = `Outer ${`inner`} template`;
console.log("Nested template:", outer);
```

### Phase 6: Lexer State Management (Advanced) 🚀

For robust template literal support, implement proper lexer state management:

```cpp
class Lexer {
private:
    enum class LexerMode {
        Normal,
        TemplateString,
        TemplateExpression
    };
    
    std::stack<LexerMode> mode_stack_;
    LexerMode current_mode_ = LexerMode::Normal;
    
public:
    void enter_template_mode() {
        mode_stack_.push(current_mode_);
        current_mode_ = LexerMode::TemplateString;
    }
    
    void enter_expression_mode() {
        mode_stack_.push(current_mode_);
        current_mode_ = LexerMode::TemplateExpression;
    }
    
    void exit_mode() {
        if (!mode_stack_.empty()) {
            current_mode_ = mode_stack_.top();
            mode_stack_.pop();
        }
    }
};
```

## Implementation Priority

### ⚡ **IMMEDIATE (Phase 1-4): Core Implementation**
These changes are required for basic template literal functionality:

1. **Lexer tokens** - Add TemplateString, TemplateDollar tokens
2. **AST nodes** - Add TemplateLiteral, TemplateElement, TemplateExpression
3. **Parser integration** - Handle backtick tokens in parse_primary()
4. **Basic evaluation** - String concatenation with expression interpolation

### 🎯 **SHORT TERM (Phase 5): Testing & Integration**
Ensure compatibility with existing codebase:

1. **Basic test cases** - Verify core functionality works
2. **Integration testing** - Template literals work with existing features
3. **Error handling** - Graceful parsing and runtime error handling

### 🚀 **MEDIUM TERM (Phase 6): Advanced Features**
These can be implemented after core functionality is working:

1. **Proper lexer state management** - Handle nested expressions correctly
2. **Complete escape sequence support** - All standard JavaScript escapes
3. **Performance optimization** - Efficient string building for large templates

## Estimated Implementation Time

- **Core functionality (Phases 1-4)**: 1-2 days
- **Basic testing (Phase 5)**: 0.5 days  
- **Advanced features (Phase 6)**: 1-2 days
- **Total**: 2.5-4.5 days

## Success Criteria

✅ **Minimum viable implementation**:
- `` `Hello ${name}!` `` works correctly
- Multi-line templates preserve whitespace
- Basic escape sequences work
- Expressions in ${} are evaluated properly

✅ **test262 compatibility**:
- Template literals in test262 harness code work
- No parsing errors on template literal syntax
- Correct string interpolation behavior

✅ **Integration success**:
- Existing tests continue to pass
- Template literals work with all current language features
- Memory management handles template literals correctly

## Risk Mitigation

### **Lexer Complexity**
Template literals require stateful lexing (tracking whether we're inside a template, inside an expression, etc.). 

**Mitigation**: Start with simple state tracking, add complexity incrementally.

### **Parser Integration**
Template literals blur the line between expressions and strings.

**Mitigation**: Treat templates as a special case of primary expressions, similar to object/array literals.

### **Memory Management** 
String concatenation could create many temporary objects.

**Mitigation**: Leverage existing string handling and GC system. Consider string builder pattern for large templates.

### **test262 Compatibility**
The test262 harness might use advanced template literal features.

**Mitigation**: Implement core features first, then add advanced features as needed based on test262 failures.

## Conclusion

Template literals are a well-defined feature with clear implementation requirements. The phased approach ensures:

1. **Quick initial progress** with basic functionality
2. **Incremental enhancement** without breaking existing code  
3. **Clear testing strategy** to verify correctness
4. **Path to test262 compatibility** as the primary goal

Once implemented, this should remove the final blocker for running the test262 harness! 🎉 