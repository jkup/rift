# Garbage Collection Implementation Plan for Rift JavaScript Engine

## Executive Summary

The current memory management system is architecturally broken due to mixing three incompatible ownership models: `std::shared_ptr`, custom GC tracking, and manual GC disabling. This plan provides a complete roadmap to implement a simple, correct mark-sweep garbage collector suitable for a hobby JavaScript engine.

## 🚧 CURRENT STATUS: Phase 1 In Progress

**Core infrastructure successfully updated!** See `GC_PHASE1_STATUS.md` for detailed progress.

✅ **Completed**: Value system, ObjectManager, Mark-Sweep GC, JSObject system  
🚧 **Remaining**: Update remaining builtin implementations (following established pattern)

## Recommended Approach: Simple Mark-Sweep GC

**Why Mark-Sweep for a Hobby Project:**
- ✅ Conceptually simple and well-understood
- ✅ Handles circular references naturally (essential for JavaScript)
- ✅ Existing infrastructure can be salvaged
- ✅ Performance adequate for demonstration purposes
- ✅ Can be implemented incrementally without breaking existing functionality

**Why NOT the current mixed approach:**
- ❌ `shared_ptr` cannot handle circular references (will leak)
- ❌ Mixed ownership creates confusion and bugs
- ❌ GC is currently disabled, making it useless
- ❌ Manual GC disable/enable is error-prone and unsafe

## 🚧 Phase 1: Foundation Cleanup (IN PROGRESS)

**Status: Core infrastructure complete, builtin updates remaining**

**Goal**: Establish single source of truth for object ownership

### ✅ Step 1.1: Establish Single Source of Truth for Object Ownership
- **DONE**: Remove `std::shared_ptr<JSObject>` from Value class  
- **DONE**: Replace with raw pointers to GC-managed objects
- **DONE**: Update Value constructor to use raw pointers

### ✅ Step 1.2: Fix Object Creation Pattern  
- **DONE**: Update ObjectManager::createJSObject() to return raw pointers
- **DONE**: Ensure ALL JavaScript objects are created through ObjectManager
- **DONE**: Re-enable GC tracking with `gc_->addObject(obj)`

### ✅ Step 1.3: Update Value System
- **DONE**: Fix Value constructor for objects
- **DONE**: Update getObject() to return raw pointers
- **DONE**: Update all type conversion methods

### 🚧 Step 1.4: Update All Builtin Objects (REMAINING)
- **DONE**: Boolean, Global builtins  
- **TODO**: Array, String, Math, Error, Object, Console builtins
- **Pattern established** - just systematic updates needed

### ✅ Step 1.5: Update Mark-Sweep Implementation
- **DONE**: Fix sweep phase to actually delete objects
- **DONE**: Ensure GC owns all objects it tracks
- **DONE**: Remove shared_ptr dependencies

**Expected Result**: Single ownership model where GC owns all JavaScript objects

## Phase 2: RAII Root Guards (NEXT)

**Goal**: Ensure objects are protected during native function execution

### Step 2.1: Implement GCGuard RAII Class
```cpp
class GCGuard {
    ObjectManager* manager_;
    std::vector<GCObject*> guarded_objects_;
public:
    GCGuard(ObjectManager* manager) : manager_(manager) {}
    ~GCGuard() {
        for (auto* obj : guarded_objects_) {
            manager_->removeRoot(obj);
        }
    }
    
    void protect(GCObject* obj) {
        manager_->addRoot(obj);
        guarded_objects_.push_back(obj);
    }
};
```

### Step 2.2: Update Expression Evaluator
```cpp
Value ExpressionEvaluator::evaluateCall(CallExpression* expr) {
    GCGuard guard(object_manager_);
    
    Value func = evaluate(expr->getCallee());
    guard.protect(func.getObject());  // Protect during argument evaluation
    
    std::vector<Value> args;
    for (auto* argExpr : expr->getArguments()) {
        Value arg = evaluate(argExpr);
        if (arg.isObject()) guard.protect(arg.getObject());
        args.push_back(arg);
    }
    
    return callFunction(func, args);
}
```

### Step 2.3: Update Statement Evaluator
- Add GC guards to variable assignments
- Protect objects during property access
- Guard function call results

**Expected Result**: Objects never collected while being actively used by native code

## Phase 3: Smart Collection Triggers

**Goal**: Optimize when garbage collection runs

### Step 3.1: Implement Write Barriers (Optional)
- Track object mutations
- Defer collection during object graph construction

### Step 3.2: Allocation Pressure Heuristics
```cpp
class AllocationTracker {
    size_t bytes_allocated_since_last_gc_ = 0;
    size_t allocation_rate_threshold_ = 1024 * 1024; // 1MB
    
public:
    bool shouldTriggerCollection() {
        return bytes_allocated_since_last_gc_ > allocation_rate_threshold_;
    }
};
```

### Step 3.3: Collection Timing
- Never collect during exception handling
- Prefer collection at statement boundaries
- Avoid collection during nested calls

**Expected Result**: Efficient collection with minimal impact on execution

## Implementation Notes

### Memory Safety Guidelines
1. **Never store raw pointers in locals without GCGuard protection**
2. **Always use ObjectManager for object creation**
3. **Never manually delete GC-managed objects**
4. **Disable GC during error handling/cleanup only**

### Testing Strategy
1. **Unit tests for each phase** - verify no regressions
2. **Memory leak detection** - ensure circular references are handled
3. **Performance benchmarks** - track GC overhead
4. **Stress tests** - create/destroy many objects rapidly

### Error Handling
- **Exceptions during GC**: Log and continue (don't abort)
- **Invalid object references**: Null-check before dereferencing  
- **Collection failures**: Increase threshold and retry later

## Success Criteria

✅ **Phase 1**: All objects created through ObjectManager, single ownership model  
⏳ **Phase 2**: No crashes during object manipulation, protected roots  
⏳ **Phase 3**: Reasonable performance, no memory leaks  

**Final Goal**: Reliable garbage collection that handles JavaScript object lifecycles correctly without manual memory management complexity.

## Phase 4: GC Root Management

### Step 4.1: Identify All GC Roots

**GC Roots are objects that should never be collected:**
1. Global environment variables
2. Currently executing function call stacks
3. Exception objects being thrown
4. Objects referenced by native C++ code during builtin function execution

**Implementation:**
```cpp
class RootManager {
private:
    std::unordered_set<JSObject*> roots_;
    
public:
    void addRoot(JSObject* obj) {
        if (obj) roots_.insert(obj);
    }
    
    void removeRoot(JSObject* obj) {
        if (obj) roots_.erase(obj);
    }
    
    const std::unordered_set<JSObject*>& getRoots() const {
        return roots_;
    }
};
```

### Step 4.2: Automatic Root Management

**RAII Pattern for Temporary Roots:**
```cpp
// Use this pattern when native code needs to protect JS objects
class TempRoot {
private:
    ObjectManager* manager_;
    JSObject* obj_;
    
public:
    TempRoot(ObjectManager* manager, JSObject* obj) 
        : manager_(manager), obj_(obj) {
        if (obj_) manager_->addRoot(obj_);
    }
    
    ~TempRoot() {
        if (obj_) manager_->removeRoot(obj_);
    }
    
    JSObject* get() const { return obj_; }
};
```

**Usage in Builtin Functions:**
```cpp
Value Array::push(const std::vector<Value>& args) {
    JSObject* arrayObj = getThisArrayObject(args);
    TempRoot root(object_factory_, arrayObj);  // Protect during function execution
    
    // ... rest of implementation
    // arrayObj automatically un-rooted when function exits
}
```

## Phase 5: Mark-Sweep Implementation

### Step 5.1: Marking Phase Implementation

**Current Broken Marking:**
- Mixed ownership confuses marking
- Objects may be freed while being marked
- Inconsistent reference traversal

**New Correct Marking:**
```cpp
void MarkSweepGC::markObject(JSObject* obj) {
    if (!obj || obj->isMarked()) {
        return;
    }
    
    obj->markReachable();
    
    // Get all object references and mark them recursively
    auto references = obj->getReferences();
    for (JSObject* ref : references) {
        markObject(ref);  // Recursive marking
    }
}

void MarkSweepGC::markFromRoots() {
    // Mark all root objects
    for (JSObject* root : roots_) {
        markObject(root);
    }
    
    // Mark global environment
    markEnvironmentObjects(global_environment_);
    
    // Mark call stack objects
    markCallStackObjects();
}
```

### Step 5.2: Sweep Phase Implementation

**Safe Object Deletion:**
```cpp
void MarkSweepGC::sweep() {
    auto it = all_objects_.begin();
    size_t collected = 0;
    
    while (it != all_objects_.end()) {
        JSObject* obj = *it;
        
        if (!obj->isMarked()) {
            // Object is garbage - delete it
            it = all_objects_.erase(it);
            delete obj;  // Safe because GC owns all objects
            ++collected;
        } else {
            // Object is live - clear mark for next collection
            obj->clearMark();
            ++it;
        }
    }
    
    last_collection_count_ = collected;
}
```

### Step 5.3: Collection Trigger Strategy

**Smart Collection Timing:**
```cpp
bool MarkSweepGC::shouldCollect() const {
    // Don't collect during exception handling
    if (exception_depth_ > 0) {
        return false;
    }
    
    // Don't collect during builtin function execution
    if (in_native_call_) {
        return false;
    }
    
    // Collect based on allocation pressure
    return all_objects_.size() >= collection_threshold_;
}
```

## Phase 6: Safe Integration Points

### Step 6.1: Exception Handling Integration

**Problem:** Current code disables GC during exceptions, causing memory leaks.

**Solution:** Defer collection rather than disable GC:
```cpp
void Rift::enterExceptionHandling() {
    exception_depth_.fetch_add(1);
    // Don't disable GC - just defer collection
}

void Rift::exitExceptionHandling() {
    if (exception_depth_.fetch_sub(1) == 1) {
        // Last exception handler - safe to collect now
        if (deferred_collection_needed_.load()) {
            object_manager_->collect();
            deferred_collection_needed_.store(false);
        }
    }
}
```

### Step 6.2: Builtin Function Safety

**Protect Objects During Native Calls:**
```cpp
#define NATIVE_CALL_GUARD() NativeCallGuard guard(this)

class NativeCallGuard {
private:
    ObjectManager* manager_;
    
public:
    NativeCallGuard(ObjectManager* manager) : manager_(manager) {
        manager_->enterNativeCall();
    }
    
    ~NativeCallGuard() {
        manager_->exitNativeCall();
    }
};

// Usage in every builtin function:
Value Console::log(const std::vector<Value>& args) {
    NATIVE_CALL_GUARD();  // Prevent GC during this function
    
    // ... implementation
}
```

## Phase 7: Migration Strategy

### Step 7.1: Incremental Migration Order

**Phase 7.1.1: Core Value System**
1. Update `Value` class to use raw pointers
2. Fix all compilation errors
3. Update object creation in `ObjectManager`
4. Run existing tests to ensure no regressions

**Phase 7.1.2: Root Management** 
1. Implement root management system
2. Add roots for global environment
3. Add RAII guards for builtin functions
4. Test with simple JavaScript programs

**Phase 7.1.3: GC Algorithm**
1. Re-enable GC object tracking
2. Fix marking algorithm
3. Fix sweep algorithm  
4. Test with circular reference cases

**Phase 7.1.4: Integration**
1. Add exception handling integration
2. Add native call guards
3. Performance testing and tuning
4. Stress testing with complex JavaScript

### Step 7.2: Testing Strategy

**Unit Tests for Each Phase:**
```javascript
// Test 1: Basic allocation and collection
var obj = { name: "test" };
obj = null;
gc(); // Should collect the object

// Test 2: Circular references
var a = {};
var b = {};
a.ref = b;
b.ref = a;
a = null;
b = null;
gc(); // Should collect both objects

// Test 3: Root protection
var global_obj = { data: "important" };
function test() {
    var local_obj = { temp: "data" };
    gc(); // Should collect local_obj but not global_obj
}
test();

// Test 4: Exception safety
try {
    var obj = { name: "exception_test" };
    throw new Error("test");
} catch (e) {
    // obj should still be collectible after exception
}
gc();
```

## Phase 8: Common Pitfalls and Solutions

### Pitfall 1: Dangling Pointers
**Problem:** Raw pointers become invalid after GC collection
**Solution:** Never store raw JSObject* pointers across potential GC points

### Pitfall 2: Premature Collection
**Problem:** Objects collected while still in use by native code
**Solution:** Use TempRoot RAII pattern consistently

### Pitfall 3: Root Leaks
**Problem:** Objects added as roots but never removed
**Solution:** Always use RAII for root management

### Pitfall 4: Recursive Collection
**Problem:** GC triggered during GC execution
**Solution:** Set collection-in-progress flag

### Pitfall 5: Exception Safety
**Problem:** Objects leaked when exceptions interrupt normal flow
**Solution:** Use RAII everywhere, defer collection during exception handling

## Implementation Priority

**Week 1:** Phase 1 (Foundation Cleanup)
**Week 2:** Phase 2 (Root Management) 
**Week 3:** Phase 3 (Mark-Sweep Implementation)
**Week 4:** Phase 4 (Integration Points)
**Week 5:** Phase 5 (Migration and Testing)

## Success Criteria

✅ **No memory leaks:** All allocated JavaScript objects are eventually freed
✅ **No segfaults:** No use-after-free or double-delete errors
✅ **Circular reference handling:** Objects in cycles are properly collected
✅ **Exception safety:** Memory management works correctly during exception handling
✅ **Performance:** GC overhead < 10% of total execution time for typical JavaScript programs

## Performance Expectations

For a hobby JavaScript engine with this GC design:
- **Allocation:** ~500,000 objects/second
- **Collection time:** <10ms for 10,000 objects
- **Memory overhead:** ~20% (acceptable for demonstration purposes)
- **Pause times:** <50ms (suitable for interactive demos)

This plan provides a complete, implementable path to correct memory management that will eliminate the current segfaults and memory leaks while maintaining the educational value of the project. 