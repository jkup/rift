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
    bool gc_enabled_ = true;  // Flag to temporarily disable GC
    bool collection_in_progress_ = false;  // Prevent recursive collection

public:
    ~MarkSweepGC() {
        // During program shutdown, we don't need to explicitly delete objects
        // since the OS will reclaim all memory anyway. Attempting to delete
        // can cause crashes due to destructors accessing already-freed memory.
        gc_enabled_ = false;
        
        // Just clear the containers without deleting objects
        roots_.clear();
        all_objects_.clear();
    }

    void addObject(GCObject* obj) override {
        if (obj && !collection_in_progress_) {
            all_objects_.insert(obj);
            
            // Only trigger collection if GC is enabled and threshold reached
            if (gc_enabled_ && shouldCollect()) {
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
        // Skip collection if GC is disabled or already in progress
        if (!gc_enabled_ || collection_in_progress_) {
            return;
        }
        
        collection_in_progress_ = true;
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
            GCObject* obj = *it;
            if (!obj->isMarked()) {
                // Object is garbage - delete it (GC owns all objects now)
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
        ++total_collections_;
        collection_in_progress_ = false;
        
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
        std::cout << "  GC enabled: " << (gc_enabled_ ? "true" : "false") << std::endl;
    }
    
    // Methods to control GC state during exception handling
    void setGCEnabled(bool enabled) override { gc_enabled_ = enabled; }
    bool isGCEnabled() const override { return gc_enabled_; }

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