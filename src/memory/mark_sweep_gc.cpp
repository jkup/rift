#include "rift/memory/gc.h"

#include <iostream>
#include <chrono>

namespace rift::memory {

class MarkSweepGC : public GarbageCollector {
private:
    std::unordered_set<GCObject*> all_objects_;
    std::unordered_set<GCObject*> roots_;
    size_t collection_threshold_ = 1000;
    size_t last_collection_count_ = 0;
    size_t total_collections_ = 0;

public:
    void addObject(GCObject* obj) override {
        if (obj) {
            all_objects_.insert(obj);
            
            // Trigger collection if threshold reached
            if (shouldCollect()) {
                collect();
            }
        }
    }
    
    void removeObject(GCObject* obj) override {
        if (obj) {
            all_objects_.erase(obj);
            roots_.erase(obj);  // Also remove from roots if it was a root
        }
    }
    
    void addRoot(GCObject* root) override {
        if (root) {
            roots_.insert(root);
            // Ensure root is also tracked as an object
            all_objects_.insert(root);
        }
    }
    
    void removeRoot(GCObject* root) override {
        if (root) {
            roots_.erase(root);
        }
    }
    
    void collect() override {
        auto start_time = std::chrono::high_resolution_clock::now();
        
        // Clear all marks first
        for (auto* obj : all_objects_) {
            obj->clearMark();
        }
        
        // Mark phase: start from roots
        for (auto* root : roots_) {
            markObject(root);
        }
        
        // Sweep phase: delete unmarked objects
        auto it = all_objects_.begin();
        size_t collected = 0;
        
        while (it != all_objects_.end()) {
            if (!(*it)->isMarked()) {
                GCObject* obj = *it;
                it = all_objects_.erase(it);
                delete obj;
                ++collected;
            } else {
                ++it;
            }
        }
        
        last_collection_count_ = collected;
        ++total_collections_;
        
        auto end_time = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time);
        
        #ifdef DEBUG_GC
        std::cout << "[GC] Collection #" << total_collections_ 
                  << " completed in " << duration.count() << "μs"
                  << " - Collected " << collected << " objects"
                  << " (" << all_objects_.size() << " remaining)" << std::endl;
        #endif
    }
    
    size_t getObjectCount() const override {
        return all_objects_.size();
    }
    
    size_t getLastCollectionCount() const override {
        return last_collection_count_;
    }
    
    void setCollectionThreshold(size_t threshold) override {
        collection_threshold_ = threshold;
    }
    
    bool shouldCollect() const override {
        return all_objects_.size() >= collection_threshold_;
    }
    
    void printStats() const override {
        std::cout << "[GC Stats]" << std::endl;
        std::cout << "  Total objects: " << all_objects_.size() << std::endl;
        std::cout << "  Root objects: " << roots_.size() << std::endl;
        std::cout << "  Collection threshold: " << collection_threshold_ << std::endl;
        std::cout << "  Total collections: " << total_collections_ << std::endl;
        std::cout << "  Last collection freed: " << last_collection_count_ << " objects" << std::endl;
    }

private:
    void markObject(GCObject* obj) {
        if (!obj || obj->isMarked()) {
            return;
        }
        
        obj->markReachable();
        
        // Recursively mark referenced objects
        try {
            auto references = obj->getReferences();
            for (auto* ref : references) {
                markObject(ref);
            }
        } catch (const std::exception& e) {
            // Handle errors gracefully during marking
            #ifdef DEBUG_GC
            std::cerr << "[GC] Error marking object: " << e.what() << std::endl;
            #endif
        }
    }
};

// Factory function implementation
std::unique_ptr<GarbageCollector> createMarkSweepGC() {
    return std::make_unique<MarkSweepGC>();
}

}  // namespace rift::memory 