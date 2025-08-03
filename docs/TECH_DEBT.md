# Technical Debt Analysis - Rift JavaScript Engine

This document identifies technical debt and code quality issues in the C++ engine implementation, prioritized by impact and effort to fix.

### 2. **Raw Pointer Proliferation Despite GC**
**Location**: Throughout engine, especially `src/core/engine/expression_evaluator.cpp`  
**Issue**: Heavy use of raw pointers even with garbage collector
```cpp
auto* func = dynamic_cast<JSFunction*>(callee.getObject());
auto* obj = object.getObject();
```
**Problems**:
- Dangling pointer risks
- Unclear ownership semantics
- GC complexity to track references

**Recommended Fix**: Use RAII wrappers or reference-counted handles

## 🟡 High Priority - Medium Impact

### 3. **Repetitive Argument Validation Everywhere**  
**Location**: All builtin function implementations  
**Issue**: Manual argument checking repeated hundreds of times
```cpp
// Pattern repeated in every function:
if(args.empty()) return Value::undefined();
if(args.size() < 2) return Value::undefined();
if(args.size() >= 3 && !args[2].isUndefined()) {
```
**Problems**:
- Verbose and error-prone
- Inconsistent validation logic
- Hard to maintain parameter requirements

**Recommended Fix**: Create argument validation helper/macro system

### 4. **Excessive static_cast Usage**
**Location**: Primarily `src/builtins/string/string.cpp`, `src/builtins/array/array.cpp`  
**Issue**: 40+ static_cast operations for numeric conversions
```cpp
size_t currentLength = static_cast<size_t>(lengthVal.toNumber());
obj->setProperty("length", Value(static_cast<double>(index + 1)));
```
**Problems**:
- Potential data loss in conversions
- Verbose and cluttered code
- No overflow checking

**Recommended Fix**: Create safe conversion utilities with bounds checking

### 5. **Complex Exception/GC Interaction System**
**Location**: `src/core/engine/engine.cpp`, `src/memory/mark_sweep_gc.cpp`  
**Issue**: Intricate deferred GC collection during exception handling
```cpp
// Complex state tracking just for GC timing:
void Rift::collectGarbage() {
    if(isInExceptionHandling()) {
        deferred_collection_needed_.store(true);
        return;
    }
```
**Problems**:
- Over-engineered for uncertain benefit
- Adds complexity to every exception path
- Potential memory pressure during exceptions

**Recommended Fix**: Simplify or remove deferred collection entirely

## 🟠 Medium Priority - Quality of Life

### 6. **Giant Switch Statement Dispatchers**
**Location**: `src/core/engine/engine.cpp`, evaluators  
**Issue**: Massive switch statements for AST node type dispatch (80+ lines)
```cpp
switch(node->type) {
    case ASTNodeType::Identifier:
    case ASTNodeType::Literal:
    // ... 20+ more cases
}
```
**Problems**:
- Hard to maintain and extend
- Violates open/closed principle
- Scattered logic

**Recommended Fix**: Visitor pattern or function pointer table

### 7. **Hardcoded Magic Numbers**
**Location**: `src/core/engine/evaluation_utils.h`, string operations  
**Issue**: Magic numbers throughout, especially for array index validation
```cpp
if(property.length() > 10) return false;
if(property > "4294967294") return false;
if(ull >= 4294967295ULL) return false;
```
**Problems**:
- Unclear intent
- Hard to maintain if limits change
- Scattered constants

**Recommended Fix**: Named constants with clear documentation

### 8. **Inconsistent Error Handling Patterns**
**Location**: Throughout codebase  
**Issue**: Mix of exceptions, undefined returns, and error values
```cpp
// Sometimes throws:
throw std::runtime_error("Value is not a number");
// Sometimes returns undefined:
return Value::undefined();
// Sometimes returns error strings:
return "Error: " + std::string(e.what());
```
**Problems**:
- Unpredictable API behavior
- Hard to handle errors consistently
- Mixed error semantics

**Recommended Fix**: Standardize on Result<T>/Expected<T> pattern

## 🟢 Lower Priority - Technical Improvements

### 9. **String Concatenation Performance**
**Location**: Error messages, debugging output  
**Issue**: Inefficient string building with operator+
```cpp
throw std::runtime_error("Cannot open file: " + filename);
```
**Problems**:
- Temporary object creation
- Performance in error paths

**Recommended Fix**: Use string streams or fmt library

### 10. **Debugging Code in Production Paths**
**Location**: `src/memory/mark_sweep_gc.cpp`, `src/core/engine/engine.cpp`  
**Issue**: Debug output scattered through normal execution
```cpp
#ifdef DEBUG_GC
    std::cout << "[GC] Collection #" << total_collections_ << std::endl;
#endif
```
**Problems**:
- Clutters production code
- Performance overhead when enabled

**Recommended Fix**: Proper logging framework with levels

### 11. **Value Type Conversion Inconsistencies**
**Location**: `src/runtime/values/value.cpp`  
**Issue**: Inconsistent handling of edge cases in type conversions
```cpp
// Some throw exceptions, others return NaN/defaults
if(type_ != ValueType::Number) {
    throw std::runtime_error("Value is not a number");
}
```
**Problems**:
- Unpredictable behavior
- Hard to debug conversion issues

**Recommended Fix**: Consistent conversion policy with clear documentation

## Summary

**Total Issues**: 10 major categories (2 completed)  
**Estimated Technical Debt**: ~20% of engine codebase  
**Biggest Wins**: 
1. ✅ ~~Fix constructor call system~~ **COMPLETED** - Implemented CallContext with CallType enum
2. ✅ ~~Eliminate builtin duplication~~ **COMPLETED** - Implemented BuiltinBase<T> CRTP template
3. Standardize argument validation (#1 remaining critical issue)

**Recommended Approach**: Address critical issues first (especially #2) before adding new features, as they affect every builtin and core operation.