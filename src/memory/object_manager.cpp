#include "rift/memory/object_manager.h"

#include <iostream>

#include "rift/runtime/values/object.h"
#include "rift/memory/gc_disabler.h"

namespace rift::memory {

ObjectManager::ObjectManager() {
    gc_ = createMarkSweepGC();
    // Start with a reasonable collection threshold
    gc_->setCollectionThreshold(100);  // Lower threshold for initial testing
}

ObjectManager::~ObjectManager() {
    // Clean shutdown - disable GC during destruction to prevent collection
    // while objects are being destroyed
    if(gc_) {
        gc_->setGCEnabled(false);
    }
}

rift::runtime::JSObject* ObjectManager::createJSObject(rift::runtime::JSObject* prototype) {
    // Disable GC during object creation - automatically re-enabled when disabler goes out of scope
    // This prevents collection if an exception is thrown during object creation
    GCDisabler disabler(gc_.get());
    
    rift::runtime::JSObject* obj = new rift::runtime::JSObject(prototype);
    gc_->addObject(obj);  // GC owns object (won't trigger collection - GC disabled)
    
    return obj;
}

rift::runtime::JSFunction* ObjectManager::createJSFunction(
    std::function<rift::runtime::Value(const rift::core::CallContext&, const std::vector<rift::runtime::Value>&)> func) {
    // Disable GC during object creation - automatically re-enabled when disabler goes out of scope
    GCDisabler disabler(gc_.get());
    
    rift::runtime::JSFunction* obj = new rift::runtime::JSFunction(func);
    gc_->addObject(obj);  // Track the object (GC disabled, won't collect)
    
    return obj;
}

rift::runtime::JSFunction* ObjectManager::createJSFunction(
    std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func) {
    // Disable GC during object creation - automatically re-enabled when disabler goes out of scope
    GCDisabler disabler(gc_.get());
    
    // Wrap legacy function into CallContext-aware function.
    // If a valid thisValue is present in call context, inject it as args[0]
    // to preserve existing builtin convention that expects receiver in args[0].
    auto wrapper = [func](const rift::core::CallContext& ctx,
                          const std::vector<rift::runtime::Value>& args) {
        if(!ctx.thisValue.isUndefined()) {
            std::vector<rift::runtime::Value> injected;
            injected.reserve(args.size() + 1);
            injected.push_back(ctx.thisValue);
            injected.insert(injected.end(), args.begin(), args.end());
            return func(injected);
        }
        return func(args);
    };
    rift::runtime::JSFunction* obj = new rift::runtime::JSFunction(wrapper);
    gc_->addObject(obj);  // Track the object (GC disabled, won't collect)
    
    return obj;
}

void ObjectManager::addRoot(GCObject* root) {
    gc_->addRoot(root);
}

void ObjectManager::removeRoot(GCObject* root) {
    gc_->removeRoot(root);
}

void ObjectManager::collect() {
    gc_->collect();
}

void ObjectManager::setCollectionThreshold(size_t threshold) {
    gc_->setCollectionThreshold(threshold);
}

bool ObjectManager::shouldCollect() const {
    return gc_->shouldCollect();
}

size_t ObjectManager::getObjectCount() const {
    return gc_->getObjectCount();
}

size_t ObjectManager::getLastCollectionCount() const {
    return gc_->getLastCollectionCount();
}

void ObjectManager::printStats() const {
    gc_->printStats();
}

void ObjectManager::setGCEnabled(bool enabled) {
    gc_->setGCEnabled(enabled);
}

bool ObjectManager::isGCEnabled() const {
    return gc_->isGCEnabled();
}

}  // namespace rift::memory