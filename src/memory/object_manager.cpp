#include "rift/memory/object_manager.h"

#include <iostream>

#include "rift/runtime/values/object.h"

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
    rift::runtime::JSObject* obj = new rift::runtime::JSObject(prototype);
    gc_->addObject(obj);  // GC now owns this object
    return obj;
}

rift::runtime::JSFunction* ObjectManager::createJSFunction(
    std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func) {
    rift::runtime::JSFunction* obj = new rift::runtime::JSFunction(func);
    gc_->addObject(obj);  // GC now owns this object
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