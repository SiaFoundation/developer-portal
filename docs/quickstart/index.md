---
title: Quickstart
description: Get started building with Sia's decentralized, privacy-preserving storage network. Install the SDK, upload an object, and download it back.
---

# Quickstart

Sia is a decentralized storage network where all data is encrypted client-side, erasure-coded into redundant shards, and distributed across independent storage providers worldwide. An indexer — hosted by [sia.storage](https://sia.storage) or [self-hosted](../core-concepts/trust-and-deployment.md) — coordinates uploads, downloads, and object management without ever seeing your data.

Getting to a working app takes four steps: install an SDK, [connect a storage account](connect-to-an-indexer.md), [store an object](upload-an-object.md), and [download it back](download-an-object.md).

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
=== "Dart"
    ```sh
    dart pub add sia_storage
    ```
=== "JavaScript"
    ```sh
    npm install @siafoundation/sia-storage
    ```

> The snippets below assume a connected `sdk` instance. If you haven't connected yet, start with [Connect a Storage Account](connect-to-an-indexer.md).

## Upload and pin

Storing an object is two calls: **upload**, which encrypts the data and distributes it across the network, and **pin**, which saves the upload to the user's account so it can be listed, synced, and kept healthy. The returned Object ID is the object's permanent identifier — derived from its content, and used later to download it.

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
    from sia_storage import UploadOptions, PinnedObject

    obj = await sdk.upload(PinnedObject(), BytesIO(b"hello, world!"), UploadOptions())
    await sdk.pin_object(obj)
    print("Object ID:", obj.id())
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'package:sia_storage/sia_storage.dart';

    final upload = sdk.upload(
      object: PinnedObject(),
      source: Stream.value(utf8.encode('hello, world!')),
    );
    final obj = await upload.result;
    await sdk.pinObject(object: obj);
    print('Object ID: ${obj.id()}');
    ```
=== "JavaScript"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    const data = new Blob(['hello, world!']).stream()
    const obj = await sdk.upload(new PinnedObject(), data)
    await sdk.pinObject(obj)
    console.log('Object ID:', obj.id())
    ```

## Download it back

Download fetches the object's encrypted pieces from storage providers, verifies integrity, and decrypts the data locally. It returns a reader that streams decrypted bytes into any destination.

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;

    let mut reader = sdk.download(&obj, DownloadOptions::default())?;
    let mut bytes = Vec::new();
    tokio::io::copy(&mut reader, &mut bytes).await?;
    println!("Downloaded: {}", String::from_utf8_lossy(&bytes));
    ```
=== "Go"
    ```go
    rc, err := client.Download(obj)
    if err != nil {
        panic(err)
    }
    defer rc.Close()

    var buf bytes.Buffer
    if _, err := io.Copy(&buf, rc); err != nil {
        panic(err)
    }
    fmt.Println("Downloaded:", buf.String())
    ```
=== "Python"
    ```python
    from sia_storage import DownloadOptions

    async with sdk.download(obj, DownloadOptions()) as d:
        buffer = await d.read_all()
    print("Downloaded:", buffer.decode())
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'dart:typed_data';
    import 'package:sia_storage/sia_storage.dart';

    final dl = sdk.download(object: obj);
    final buffer = <int>[];
    await for (final chunk in dl.data) {
      buffer.addAll(chunk);
    }
    print('Downloaded: ${utf8.decode(Uint8List.fromList(buffer))}');
    ```
=== "JavaScript"
    ```javascript
    const stream = sdk.download(obj)
    const text = await new Response(stream).text()
    console.log('Downloaded:', text)
    ```
