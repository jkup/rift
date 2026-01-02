import Foundation

// MARK: - JSArray

/// JavaScript Array object with special length handling and indexed access
public class JSArray: JSObject {

    // MARK: - Storage

    /// The array elements (may contain holes represented by nil)
    private var elements: [Value?] = []

    /// Cached length for performance
    private var _length: Int = 0

    // MARK: - Initialization

    public override init(prototype: JSObject? = nil) {
        super.init(prototype: prototype)
    }

    /// Create an array with the given elements
    public init(elements: [Value], prototype: JSObject? = nil) {
        super.init(prototype: prototype)
        self.elements = elements.map { $0 }
        self._length = elements.count
    }

    /// Create an array with a specific length (sparse array)
    public init(length: Int, prototype: JSObject? = nil) {
        super.init(prototype: prototype)
        self._length = length
        // Don't pre-allocate elements - keep sparse
    }

    // MARK: - Array Properties

    /// The length of the array
    public var length: Int {
        get { _length }
        set { setLength(newValue) }
    }

    /// Whether the array is empty
    public var isEmpty: Bool {
        _length == 0
    }

    // MARK: - JSObject Overrides

    public override var description: String {
        let contents = (0..<min(_length, 100)).map { index in
            if let value = getElement(at: index), !value.isUndefined {
                return value.toString()
            }
            return ""
        }.joined(separator: ",")

        if _length > 100 {
            return "[\(contents),... \(_length - 100) more]"
        }
        return "[\(contents)]"
    }

    public override func hasOwnProperty(_ key: String) -> Bool {
        if key == "length" { return true }
        if let index = parseArrayIndex(key), index < _length {
            return hasElement(at: index)
        }
        return super.hasOwnProperty(key)
    }

    public override func getProperty(_ key: String) -> Value {
        if key == "length" {
            return .number(Double(_length))
        }
        if let index = parseArrayIndex(key) {
            return getElement(at: index) ?? .undefined
        }
        return super.getProperty(key)
    }

    public override func setProperty(_ key: String, _ value: Value) throws {
        if key == "length" {
            if case .number(let n) = value {
                let newLength = Int(n)
                guard Double(newLength) == n && newLength >= 0 else {
                    throw RuntimeError.invalidArrayLength
                }
                setLength(newLength)
            }
            return
        }

        if let index = parseArrayIndex(key) {
            setElement(at: index, value: value)
            return
        }

        try super.setProperty(key, value)
    }

    public override func deleteProperty(_ key: String) throws -> Bool {
        if key == "length" {
            return false  // length is not configurable
        }
        if let index = parseArrayIndex(key) {
            deleteElement(at: index)
            return true
        }
        return try super.deleteProperty(key)
    }

    public override func ownKeys() -> [String] {
        var keys: [String] = []
        for i in 0..<_length {
            if hasElement(at: i) {
                keys.append(String(i))
            }
        }
        keys.append("length")
        keys.append(contentsOf: super.ownKeys())
        return keys
    }

    public override func enumerableKeys() -> [String] {
        var keys: [String] = []
        for i in 0..<_length {
            if hasElement(at: i) {
                keys.append(String(i))
            }
        }
        // length is not enumerable
        keys.append(contentsOf: super.enumerableKeys())
        return keys
    }

    // MARK: - Element Access

    /// Get an element at the given index
    public func getElement(at index: Int) -> Value? {
        guard index >= 0 && index < elements.count else {
            return nil
        }
        return elements[index]
    }

    /// Set an element at the given index
    public func setElement(at index: Int, value: Value) {
        guard index >= 0 else { return }

        // Extend the array if necessary
        if index >= elements.count {
            elements.append(contentsOf: repeatElement(nil, count: index - elements.count + 1))
        }

        elements[index] = value

        // Update length if we're setting past the current length
        if index >= _length {
            _length = index + 1
        }
    }

    /// Check if an element exists at the given index (not a hole)
    public func hasElement(at index: Int) -> Bool {
        guard index >= 0 && index < elements.count else {
            return false
        }
        return elements[index] != nil
    }

    /// Delete an element (creates a hole)
    public func deleteElement(at index: Int) {
        guard index >= 0 && index < elements.count else { return }
        elements[index] = nil
    }

    // MARK: - Length Management

    /// Set the length, truncating or extending the array
    private func setLength(_ newLength: Int) {
        guard newLength >= 0 else { return }

        if newLength < _length {
            // Truncate: remove elements past new length
            if newLength < elements.count {
                elements.removeSubrange(newLength..<elements.count)
            }
        }
        // Note: We don't pre-allocate when extending - keep sparse

        _length = newLength
    }

    // MARK: - Array Methods (Core Operations)

    /// Push one or more elements to the end
    public func push(_ values: [Value]) -> Int {
        for value in values {
            setElement(at: _length, value: value)
        }
        return _length
    }

    /// Pop the last element
    public func pop() -> Value {
        guard _length > 0 else { return .undefined }

        let lastIndex = _length - 1
        let value = getElement(at: lastIndex) ?? .undefined
        deleteElement(at: lastIndex)
        _length -= 1

        // Also trim elements array if possible
        while !elements.isEmpty && elements.last == nil {
            elements.removeLast()
        }

        return value
    }

    /// Shift the first element
    public func shift() -> Value {
        guard _length > 0 else { return .undefined }

        let value = getElement(at: 0) ?? .undefined

        // Shift all elements down
        if !elements.isEmpty {
            elements.removeFirst()
        }

        _length -= 1
        return value
    }

    /// Unshift: add elements to the beginning
    public func unshift(_ values: [Value]) -> Int {
        // Insert at the beginning
        elements.insert(contentsOf: values.map { Optional($0) }, at: 0)
        _length += values.count
        return _length
    }

    /// Get a slice of the array
    public func slice(start: Int, end: Int) -> JSArray {
        let result = JSArray()

        let actualStart = normalizeIndex(start, length: _length)
        let actualEnd = normalizeIndex(end, length: _length)

        for i in actualStart..<actualEnd {
            if let value = getElement(at: i) {
                result.push([value])
            } else {
                result._length += 1  // Preserve hole
            }
        }

        return result
    }

    /// Concatenate arrays
    public func concat(_ arrays: [JSArray]) -> JSArray {
        let result = JSArray()

        // Copy this array's elements
        for i in 0..<_length {
            if let value = getElement(at: i) {
                result.push([value])
            } else {
                result._length += 1
            }
        }

        // Copy elements from other arrays
        for array in arrays {
            for i in 0..<array._length {
                if let value = array.getElement(at: i) {
                    result.push([value])
                } else {
                    result._length += 1
                }
            }
        }

        return result
    }

    /// Reverse the array in place
    public func reverse() {
        var left = 0
        var right = _length - 1

        while left < right {
            let leftVal = getElement(at: left)
            let rightVal = getElement(at: right)

            if let rv = rightVal {
                setElement(at: left, value: rv)
            } else {
                deleteElement(at: left)
            }

            if let lv = leftVal {
                setElement(at: right, value: lv)
            } else {
                deleteElement(at: right)
            }

            left += 1
            right -= 1
        }
    }

    /// Join array elements into a string
    public func join(separator: String = ",") -> String {
        var parts: [String] = []
        for i in 0..<_length {
            if let value = getElement(at: i), !value.isNullish {
                parts.append(value.toString())
            } else {
                parts.append("")
            }
        }
        return parts.joined(separator: separator)
    }

    /// Find the index of an element
    public func indexOf(_ searchElement: Value, fromIndex: Int = 0) -> Int {
        let start = normalizeIndex(fromIndex, length: _length)

        for i in start..<_length {
            if let element = getElement(at: i), element.strictEquals(searchElement) {
                return i
            }
        }

        return -1
    }

    /// Find the last index of an element
    public func lastIndexOf(_ searchElement: Value, fromIndex: Int? = nil) -> Int {
        let start = fromIndex.map { normalizeIndex($0, length: _length) } ?? (_length - 1)

        for i in stride(from: min(start, _length - 1), through: 0, by: -1) {
            if let element = getElement(at: i), element.strictEquals(searchElement) {
                return i
            }
        }

        return -1
    }

    /// Check if array includes an element
    public func includes(_ searchElement: Value, fromIndex: Int = 0) -> Bool {
        let start = normalizeIndex(fromIndex, length: _length)

        for i in start..<_length {
            if let element = getElement(at: i) {
                // SameValueZero comparison
                if element.strictEquals(searchElement) {
                    return true
                }
                // NaN === NaN for includes
                if case .number(let a) = element, case .number(let b) = searchElement {
                    if a.isNaN && b.isNaN {
                        return true
                    }
                }
            }
        }

        return false
    }

    // MARK: - Conversion

    /// Convert to a Swift array of Values
    public func toArray() -> [Value] {
        (0..<_length).map { getElement(at: $0) ?? .undefined }
    }

    // MARK: - Helpers

    /// Parse a string as an array index (0 to 2^32-2)
    private func parseArrayIndex(_ key: String) -> Int? {
        guard let index = Int(key),
              index >= 0,
              index <= 4294967294,  // 2^32 - 2
              String(index) == key  // Reject "01", "+1", etc.
        else {
            return nil
        }
        return index
    }

    /// Normalize a possibly negative index
    private func normalizeIndex(_ index: Int, length: Int) -> Int {
        if index < 0 {
            return max(0, length + index)
        }
        return min(index, length)
    }

    // MARK: - Subscript

    public override subscript(index: Int) -> Value {
        get { getElement(at: index) ?? .undefined }
        set { setElement(at: index, value: newValue) }
    }
}

// MARK: - Factory

extension JSArray {
    /// Create an array from variadic values
    public static func of(_ values: Value...) -> JSArray {
        JSArray(elements: values)
    }

    /// Check if a value is an array
    public static func isArray(_ value: Value) -> Bool {
        if case .object(let obj) = value {
            return obj is JSArray
        }
        return false
    }
}
