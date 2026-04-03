# Overview

Welcome to the Sia Developer Quickstart. This guide walks you through the fastest path to building with Sia’s decentralized, privacy-preserving storage network. By the end, you will be able to:

* Create an app key
* Connect your app to an indexer
* Upload, download, and share encrypted data
* Use simple metadata

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

The Sia SDK is available in multiple language-specific implementations. Follow the setup instructions for your language below.

=== "Python"
    === "Windows"
        ```bat
        python -m venv .venv
        .venv\Scripts\activate
        python -m pip install sia-storage
        ```
    === "Linux"
        ```shell
        python -m venv .venv
        source .venv/bin/activate
        python -m pip install sia-storage
        ```
    === "MacOS"
        ```shell
        python -m venv .venv
        source .venv/bin/activate
        python -m pip install sia-storage
        ```
=== "Rust"
    ```shell
    # Create a new project
    cargo new sia-storage-example
    cd sia-storage-example/

    # Add the `sia_storage` crate to your project
    cargo add sia_storage

    # Add supporting crates used across the Quickstart examples.
    # Not every example uses every crate listed below.
    cargo add chrono hex
    cargo add tokio --features macros,rt-multi-thread,io-util,fs
    ```
=== "Go"
    ```shell
    # Create a new Go project
    mkdir example-app
    cd example-app
    go mod init sia.storage/example-app

    # Add the Sia Indexd SDK
    go get go.sia.tech/indexd/sdk@latest

    # Resolve and tidy dependencies
    go mod tidy
    ```

## Next Step
[Connect to an Indexer →](./quickstart/connect-to-an-indexer.md){ .md-button }