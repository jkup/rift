#pragma once

#include "../runtime/environment/environment.h"
#include "gc.h"

namespace rift::memory {

// A GC-aware wrapper for Environment that can serve as a GC root
class GCEnvironment : public GCObject {
  private:
    std::shared_ptr<rift::runtime::Environment> env_;
    mutable bool gc_marked_ = false;

  public:
    explicit GCEnvironment(std::shared_ptr<rift::runtime::Environment> env) : env_(env) {
    }

    // Delegate to the wrapped environment
    std::shared_ptr<rift::runtime::Environment> getEnvironment() const {
        return env_;
    }

    // GC interface implementation
    std::vector<GCObject*> getReferences() const override;
    void markReachable() override {
        gc_marked_ = true;
    }
    bool isMarked() const override {
        return gc_marked_;
    }
    void clearMark() override {
        gc_marked_ = false;
    }
    std::string getGCTypeName() const override {
        return "Environment";
    }
};

}  // namespace rift::memory