# Garbage Collection Implementation Plan for Rift JavaScript Engine

## Executive Summary

The current memory management system is architecturally broken due to mixing three incompatible ownership models: `std::shared_ptr`, custom GC tracking, and manual GC disabling. This plan provides a complete roadmap to implement a simple, correct mark-sweep garbage collector suitable for a hobby JavaScript engine.

## Recommended Approach: Simple Mark-Sweep GC

**Why Mark-Sweep for a Hobby Project:**
- ✅ Conceptually simple and well-understood
- ✅ Handles circular references naturally (essential for JavaScript)
- ✅ Existing infrastructure can be salvaged
- ✅ Performance adequate for demonstration purposes
- ✅ Can be implemented incrementally without breaking existing functionality

**Why NOT the current mixed approach:**
- ❌ Reference counting alone cannot handle cycles (JavaScript objects frequently have cycles)
- ❌ Mixed ownership models lead to use-after-free bugs and double-deletion
- ❌ Disabling GC defeats the entire purpose
- ❌ shared_ptr overhead without GC benefits

## Phase 1: Foundation Cleanup

### Step 1.1: Establish Single Source of Truth for Object Ownership

**Current Problem:**
```cpp
// ObjectManager creates with shared_ptr
auto obj = std::make_shared<T>(std::forward<Args>(args)...);
gc_->addObject(obj.get());  // Also track in GC
return obj;  // But return shared_ptr
```

**Solution:**
- GC owns ALL JavaScript objects
- No shared_ptr for GC-managed objects
- Objects are allocated via GC and freed only by GC

**Implementation:**
1. Remove all `std::shared_ptr<JSObject>` from `Value` class
2. Replace with raw pointers to GC-managed objects
3. Update `Value` constructor to use raw pointers:

```cpp
// In value.h - REPLACE THIS:
std::shared_ptr<JSObject> // ❌

// WITH THIS:
JSObject* // ✅
```

### Step 1.2: Fix Object Creation Pattern

**New Object Creation Flow:**
```cpp
// ObjectManager::createJSObject() - NEW IMPLEMENTATION
JSObject* ObjectManager::createJSObject(JSObject* prototype) {
    JSObject* obj = new JSObject(prototype);
    gc_->addObject(obj);  // GC now owns this object
    return obj;           // Return raw pointer
}
```

**Critical Rules:**
- ALL JavaScript objects must be created through ObjectManager
- NO direct `new JSObject()` calls anywhere in codebase
- NO `std::make_shared` for GC-managed objects
- Raw pointers are safe because GC guarantees object lifetime

### Step 1.3: Update Value System

**Current Broken Implementation:**
```cpp
Value::Value(std::shared_ptr<JSObject> obj) : data_(obj) {
    // Mixed ownership - BAD
}
```

**New Correct Implementation:**
```cpp
Value::Value(JSObject* obj) : data_(obj) {
    if (obj) {
        type_ = (obj->getTypeName() == "Function") ? ValueType::Function : ValueType::Object;
    } else {
        type_ = ValueType::Null;
    }
}
```

## Phase 2: GC Root Management

### Step 2.1: Identify All GC Roots

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

### Step 2.2: Automatic Root Management

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

## Phase 3: Mark-Sweep Implementation

### Step 3.1: Marking Phase Implementation

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

### Step 3.2: Sweep Phase Implementation

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

### Step 3.3: Collection Trigger Strategy

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

## Phase 4: Safe Integration Points

### Step 4.1: Exception Handling Integration

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

### Step 4.2: Builtin Function Safety

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

## Phase 5: Migration Strategy

### Step 5.1: Incremental Migration Order

**Phase 5.1.1: Core Value System**
1. Update `Value` class to use raw pointers
2. Fix all compilation errors
3. Update object creation in `ObjectManager`
4. Run existing tests to ensure no regressions

**Phase 5.1.2: Root Management** 
1. Implement root management system
2. Add roots for global environment
3. Add RAII guards for builtin functions
4. Test with simple JavaScript programs

**Phase 5.1.3: GC Algorithm**
1. Re-enable GC object tracking
2. Fix marking algorithm
3. Fix sweep algorithm  
4. Test with circular reference cases

**Phase 5.1.4: Integration**
1. Add exception handling integration
2. Add native call guards
3. Performance testing and tuning
4. Stress testing with complex JavaScript

### Step 5.2: Testing Strategy

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

## Phase 6: Common Pitfalls and Solutions

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