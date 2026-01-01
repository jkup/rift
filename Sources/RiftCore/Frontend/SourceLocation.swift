/// Represents a location in source code for error reporting and debugging
public struct SourceLocation: Equatable, CustomStringConvertible {
    /// Line number (1-indexed)
    public let line: Int
    /// Column number (1-indexed)
    public let column: Int
    /// Byte offset from start of source
    public let position: Int

    public init(line: Int, column: Int, position: Int) {
        self.line = line
        self.column = column
        self.position = position
    }

    public var description: String {
        "line \(line), column \(column)"
    }

    /// A zero/unknown location for synthesized nodes
    public static let unknown = SourceLocation(line: 0, column: 0, position: 0)
}
