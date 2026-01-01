// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Rift",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .executable(name: "rift-swift", targets: ["Rift"]),
        .library(name: "RiftCore", targets: ["RiftCore"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.2.0")
    ],
    targets: [
        .executableTarget(
            name: "Rift",
            dependencies: [
                "RiftCore",
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ]
        ),
        .target(
            name: "RiftCore",
            dependencies: []
        ),
        .testTarget(
            name: "RiftTests",
            dependencies: ["RiftCore"]
        )
    ]
)
