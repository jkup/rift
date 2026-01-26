#include "rift/core/engine/microtask_queue.h"

#include <stdexcept>

namespace rift::core {

void MicrotaskQueue::enqueue(rift::runtime::JSFunction* callback,
                             std::vector<rift::runtime::Value> args,
                             rift::runtime::Value this_value) {
    queue_.emplace(callback, std::move(args), std::move(this_value));
}

bool MicrotaskQueue::isEmpty() const {
    return queue_.empty();
}

size_t MicrotaskQueue::size() const {
    return queue_.size();
}

Microtask MicrotaskQueue::dequeue() {
    if(queue_.empty()) {
        throw std::runtime_error("MicrotaskQueue::dequeue() called on empty queue");
    }
    Microtask task = std::move(queue_.front());
    queue_.pop();
    return task;
}

void MicrotaskQueue::clear() {
    while(!queue_.empty()) {
        queue_.pop();
    }
}

}  // namespace rift::core
