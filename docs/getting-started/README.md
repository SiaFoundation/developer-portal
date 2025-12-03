# Overview

Welcome to the Sia Developer Quickstart. This guide walks you through the fastest path to building with Sia’s decentralized, privacy-preserving storage network. By the end, you will be able to:

* Create an app key.
* Connect your app to an indexer.
* Upload, download, and share encrypted data.
* Use simple metadata.

## Prerequisites

Before starting, you’ll need:

#### Indexer URL

The SDK can connect to any Sia indexer, whether it be your own or a third-party.

For examples in this guide, we’ll use `https://app.sia.storage`, but you may substitute any indexer URL you operate or trust.

#### App ID

A unique 32-byte identifier that has been randomly generated for your app.

* Generate it once per app, not per user or per device
* Hardcode it into the app so it remains unchanged across updates and installations

!!! danger
    
    **Changing the App ID changes your users' derived App Key. This would result in the loss of their data.**

#### Sia SDK

The Sia SDK is currently distributed via source builds from the [`sia-sdk-rs`](https://github.com/SiaFoundation/sia-sdk-rs) repository.

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
=== "JavaScript"
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
[Connect to an Indexer →](./quickstart/connect-to-an-indexer.md){ .md-button }