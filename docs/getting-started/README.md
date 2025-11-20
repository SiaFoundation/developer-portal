# Overview

Welcome to the Sia Developer Quickstart. This guide walks you through the fastest path to building with Sia’s decentralized, privacy-preserving storage network. By the end, you will be able to:

* Create an app key
* Connect your app to an indexer
* Upload, download, and share encrypted data
* Use simple metadata

## Prerequisites

Before starting, you’ll need:

#### Indexer URL

The SDK can connect to any Sia-compatible indexer.
You are free to run your own indexer, use a community indexer, or point to a hosted service.

For examples in this guide, we’ll use `https://app.sia.storage`, but you may substitute any indexer URL you operate or trust.

#### App ID

A unique 32-byte identifier for your app. You can generate this using sample code or any secure random generator.

!!! note
    Your App ID must remain consistent for your application.

    * Generate it once per app, not per user or per device.
    * Keep it stable across updates or installations.
    * Changing the App ID changes the derived app key.

#### SDK installation

The Python SDK is currently distributed via source builds from the indexd_ffi Rust crate. Prebuilt wheels are coming soon—until then, Python users must generate bindings locally as shown below.

=== "Python"
    === "Windows"
        ```powershell
        # Clone the Sia SDK repo
        git clone https://github.com/SiaFoundation/sia-sdk-rs
        cd sia-sdk-rs

        # Build the libraries and move them to your projects root folder
        cargo build --release -p indexd_ffi
        cargo run -p indexd_ffi --bin uniffi-bindgen -- generate --library .\target\release\indexd_ffi.dll --language python --out-dir ../
        mv target\release\indexd_ffi.dll ../
        ```
    === "Linux"
        ```shell
        # Clone the Sia SDK repo
        git clone https://github.com/SiaFoundation/sia-sdk-rs
        cd sia-sdk-rs

        # Build the libraries and move them to your projects root folder
        cargo build --release -p indexd_ffi
        cargo run -p indexd_ffi --bin uniffi-bindgen generate --library target/release/libindexd_ffi.so --language python --out-dir ../
        mv target/release/libindexd_ffi.so ../
        ```
    === "MacOS"
        ```shell
        # Clone the Sia SDK repo
        git clone https://github.com/SiaFoundation/sia-sdk-rs
        cd sia-sdk-rs

        # Build the libraries and move them to your projects root folder
        cargo build --release -p indexd_ffi
        cargo run -p indexd_ffi --bin uniffi-bindgen generate --library target/release/libindexd_ffi.dylib --language python --out-dir ../
        mv target/release/libindexd_ffi.dylib ../
        ```
=== "Javascript"
    *🚧 Coming soon*
=== "Rust"
    *🚧 Coming soon*
=== "Go"
    *🚧 Coming soon*
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*

## Next Step
[Connect to an Indexer →](./quickstart/connecting-to-an-indexer.md){ .md-button }