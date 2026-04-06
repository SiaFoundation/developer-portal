---
title: Quickstart
description: Get started building with Sia's decentralized, privacy-preserving storage network. Install the SDK, upload an object, and download it back.
---

# Quickstart

Sia is a decentralized storage network where all data is encrypted client-side, erasure-coded into redundant shards, and distributed across independent storage providers worldwide. An indexer coordinates uploads, downloads, and object management without ever seeing your data.

## Install the SDK

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```sh
    cargo add sia_storage
    ```
=== "Go"
    ```sh
    go get go.sia.tech/indexd/sdk@latest
    ```
=== "Python"
    ```sh
    pip install sia-storage
    ```

## Upload and Pin

Upload reads from any stream source, erasure-codes the data, and distributes encrypted shards across the network. Pinning persists the object record in the indexer so it becomes listable, syncable, and eligible for repair.

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::UploadOptions;

    let reader = std::io::Cursor::new(b"hello, world!");
    let obj = sdk.upload(reader, UploadOptions::default()).await?;
    sdk.pin_object(&obj).await?;
    println!("Object ID: {}", obj.id());
    ```
=== "Go"
    ```go
    obj := sdk.NewEmptyObject()
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

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;
    use tokio::io::AsyncReadExt;

    let (mut writer, mut reader) = tokio::io::duplex(64 * 1024);

    let download_fut = async {
        sdk.download(&mut writer, &obj, DownloadOptions::default()).await?;
        drop(writer);
        Ok::<(), Box<dyn std::error::Error>>(())
    };

    let read_fut = async {
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).await?;
        Ok::<Vec<u8>, Box<dyn std::error::Error>>(bytes)
    };

    let (_, bytes) = tokio::try_join!(download_fut, read_fut)?;
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

## Next Steps

[Connect to an Indexer →](connect-to-an-indexer.md)

Set up your app metadata, get an App Key, and start building.

* [Upload an Object](upload-an-object.md) — full runnable upload example
* [Download an Object](download-an-object.md) — full runnable download example
* [Recipes](../recipes/index.md) — packing, file streaming, sharing, metadata, and more
