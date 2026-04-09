---
title: Quickstart
description: Get started building with Sia's decentralized, privacy-preserving storage network. Install the SDK, upload an object, and download it back.
---

# Quickstart

Sia is a decentralized storage network where all data is encrypted client-side, erasure-coded into redundant shards, and distributed across independent storage providers worldwide. An indexer coordinates uploads, downloads, and object management without ever seeing your data.

## Install the SDK

=== "Rust"
    ```sh
    cargo add sia_storage
    ```
=== "Go"
    ```sh
    go get go.sia.tech/siastorage@latest
    ```
=== "Python"
    ```sh
    pip install sia-storage
    ```

## Upload and Pin

Upload reads from any stream source, erasure-codes the data, and distributes encrypted shards across the network. Pinning persists the object record in the indexer so it becomes listable, syncable, and eligible for repair.

=== "Rust"
    ```rust
    use sia_storage::{Object, UploadOptions};

    let reader = std::io::Cursor::new(b"hello, world!");
    let obj = Object::default();
    let obj = sdk.upload(obj, reader, UploadOptions::default()).await?;
    sdk.pin_object(&obj).await?;
    println!("Object ID: {}", obj.id());
    ```
=== "Go"
    ```go
    obj := siastorage.NewEmptyObject()
    if err := client.Upload(ctx, &obj, strings.NewReader("hello, world!")); err != nil {
        panic(err)
    }
    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    fmt.Println("Object ID:", obj.ID())
    ```
=== "Python"
    ```python
    from io import BytesIO
    from sia_storage import UploadOptions

    obj = await sdk.upload(BytesIO(b"hello, world!"), UploadOptions())
    await sdk.pin_object(obj)
    print("Object ID:", obj.id())
    ```

## Download

Download locates the object's shards, retrieves them from storage providers, verifies integrity, and decrypts the data locally. The decrypted bytes stream into any writable destination.

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;

    let mut bytes = Vec::new();
    sdk.download(&mut bytes, &obj, DownloadOptions::default()).await?;
    println!("Downloaded: {}", String::from_utf8_lossy(&bytes));
    ```
=== "Go"
    ```go
    var buf bytes.Buffer
    if err := client.Download(ctx, &buf, obj); err != nil {
        panic(err)
    }
    fmt.Println("Downloaded:", buf.String())
    ```
=== "Python"
    ```python
    from io import BytesIO
    from sia_storage import DownloadOptions

    buffer = BytesIO()
    await sdk.download(buffer, obj, DownloadOptions())
    print("Downloaded:", buffer.getvalue().decode())
    ```
