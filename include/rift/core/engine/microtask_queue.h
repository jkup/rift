#pragma once

#include <queue>
#include <vector>

#include "../../runtime/values/value.h"

namespace rift::runtime {
class JSFunction;
}

namespace rift::core {

// A microtask represents a pending JS function call with captured arguments.
// Used for Promise reactions and other async operations that need to run
// after the current synchronous code completes.
struct Microtask {
    rift::runtime::JSFunction* callback;
    std::vector<rift::runtime::Value> args;
    rift::runtime::Value this_value;

    Microtask(rift::runtime::JSFunction* cb, std::vector<rift::runtime::Value> arguments,
              rift::runtime::Value this_val)
        : callback(cb), args(std::move(arguments)), this_value(std::move(this_val)) {
    }
};

// MicrotaskQueue manages the FIFO queue of pending microtasks.
// Microtasks are enqueued by Promise reactions and other async operations,
// then drained after each top-level script execution.
class MicrotaskQueue {
  private:
    std::queue<Microtask> queue_;

  public:
    MicrotaskQueue() = default;

    // Enqueue a microtask to be executed later
    void enqueue(rift::runtime::JSFunction* callback, std::vector<rift::runtime::Value> args,
                 rift::runtime::Value this_value);

    // Check if the queue is empty
    [[nodiscard]] bool isEmpty() const;

    // Get the number of pending microtasks
    [[nodiscard]] size_t size() const;

    // Dequeue and return the next microtask
    // Precondition: !isEmpty()
    Microtask dequeue();

    // Clear all pending microtasks
    void clear();
};

}  // namespace rift::core
