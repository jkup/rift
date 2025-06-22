#include "rift/memory/object_manager.h"
#include "rift/runtime/values/object.h"
#include <iostream>

namespace rift::memory {

ObjectManager::ObjectManager() {
    gc_ = createMarkSweepGC();
    // Start with a reasonable collection threshold
    gc_->setCollectionThreshold(100);  // Lower threshold for initial testing
}

ObjectManager::~ObjectManager() {
    // Don't perform final cleanup - objects may already be destroyed
    // during program shutdown, causing segfaults when GC tries to access them
    // The shared_ptr system will handle cleanup automatically
    if (gc_) {
        gc_->setGCEnabled(false);  // Disable GC to prevent any further collections
    }
}

std::shared_ptr<rift::runtime::JSObject> ObjectManager::createJSObject(std::shared_ptr<rift::runtime::JSObject> prototype) {
    auto obj = std::make_shared<rift::runtime::JSObject>(prototype);
    gc_->addObject(obj.get());
    return obj;
}

std::shared_ptr<rift::runtime::JSFunction> ObjectManager::createJSFunction(std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func) {
    auto obj = std::make_shared<rift::runtime::JSFunction>(func);
    gc_->addObject(obj.get());
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