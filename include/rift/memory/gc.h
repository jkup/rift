#pragma once

#include <memory>
#include <unordered_set>
#include <vector>

namespace rift::memory {

class GCObject {
public:
    virtual ~GCObject() = default;
    
    // Get all objects this object references (for mark phase)
    virtual std::vector<GCObject*> getReferences() const = 0;
    
    // Mark this object as reachable during GC
    virtual void markReachable() = 0;
    
    // Check if object is marked as reachable
    virtual bool isMarked() const = 0;
    
    // Clear the mark bit (for next collection cycle)
    virtual void clearMark() = 0;
    
    // Get object type name for debugging
    virtual std::string getGCTypeName() const = 0;
};

class GarbageCollector {
public:
    virtual ~GarbageCollector() = default;
    
    // Core GC interface
    virtual void addObject(GCObject* obj) = 0;
    virtual void removeObject(GCObject* obj) = 0;
    virtual void collect() = 0;
    virtual void addRoot(GCObject* root) = 0;
    virtual void removeRoot(GCObject* root) = 0;
    
    // Statistics and control
    virtual size_t getObjectCount() const = 0;
    virtual size_t getLastCollectionCount() const = 0;
    virtual void setCollectionThreshold(size_t threshold) = 0;
    virtual bool shouldCollect() const = 0;
    
    // GC state control for exception handling
    virtual void setGCEnabled(bool enabled) = 0;
    virtual bool isGCEnabled() const = 0;
    
    // Debugging support
    virtual void printStats() const = 0;
};

// Factory functions for different GC implementations
std::unique_ptr<GarbageCollector> createMarkSweepGC();

// Future GC implementations
// std::unique_ptr<GarbageCollector> createGenerationalGC();
// std::unique_ptr<GarbageCollector> createIncrementalGC();

}  // namespace rift::memory 