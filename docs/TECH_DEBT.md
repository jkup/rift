# Technical Debt Analysis - Rift JavaScript Engine

This document identifies technical debt and code quality issues in the C++ engine implementation, prioritized by impact and effort to fix.

## 🔴 Critical - High Impact, Should Fix Soon

### 1. **Constructor Call Handling System**
**Location**: `src/core/engine/evaluation_utils.h`, builtin constructors  
**Issue**: Using magic string markers (`"__CONSTRUCTOR_CALL__"`) to distinguish constructor vs function calls
```cpp
// Hacky approach throughout codebase:
if(!args.empty() && args[0].isString() && 
   args[0].getString() == EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
```
**Problems**: 
- Brittle and error-prone
- Performance overhead (string comparisons)  
- Pollutes function argument lists
- Not semantically clear

**Recommended Fix**: Implement proper call context (e.g., `CallType` enum parameter)

### 2. **Massive Code Duplication in Builtin Creation**
**Location**: All files in `src/builtins/*/`  
**Issue**: Every builtin implements identical factory patterns with static storage
```cpp
// Repeated in every builtin class:
static rift::memory::ObjectFactory* object_factory_ = nullptr;
void setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}
```
**Problems**:
- ~50+ lines of identical code per builtin
- Maintenance nightmare when patterns change
- Static state management complexity

**Recommended Fix**: Create `BuiltinBase` template class or factory registry pattern

### 3. **Raw Pointer Proliferation Despite GC**
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

### 4. **Repetitive Argument Validation Everywhere**  
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

### 5. **Excessive static_cast Usage**
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

### 6. **Complex Exception/GC Interaction System**
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

### 7. **Giant Switch Statement Dispatchers**
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

### 8. **Hardcoded Magic Numbers**
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

### 9. **Inconsistent Error Handling Patterns**
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

### 10. **String Concatenation Performance**
**Location**: Error messages, debugging output  
**Issue**: Inefficient string building with operator+
```cpp
throw std::runtime_error("Cannot open file: " + filename);
```
**Problems**:
- Temporary object creation
- Performance in error paths

**Recommended Fix**: Use string streams or fmt library

### 11. **Debugging Code in Production Paths**
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

### 12. **Value Type Conversion Inconsistencies**
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

**Total Issues**: 12 major categories  
**Estimated Technical Debt**: ~40% of engine codebase  
**Biggest Wins**: 
1. Fix constructor call system (#1) 
2. Eliminate builtin duplication (#2)
3. Standardize argument validation (#4)

**Recommended Approach**: Address critical issues first (especially #1-3) before adding new features, as they affect every builtin and core operation.