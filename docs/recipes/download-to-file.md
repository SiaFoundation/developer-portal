---
title: Download to a File
description: Stream decrypted object data directly to a file on disk.
---

# Download to a File

Stream decrypted bytes directly to disk instead of buffering in memory.

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;

    let mut file = tokio::fs::File::create("output.bin").await?;
    let mut reader = sdk.download(&obj, DownloadOptions::default())?;
    tokio::io::copy(&mut reader, &mut file).await?;
    ```
=== "Go"
    ```go
    file, err := os.Create("output.bin")
    if err != nil {
        panic(err)
    }
    defer file.Close()

    // Download returns an io.ReadCloser; always close it to release resources.
    rc, err := client.Download(obj)
    if err != nil {
        panic(err)
    }
    defer rc.Close()

    // Stream the decrypted bytes straight to disk.
    if _, err := io.Copy(file, rc); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    with open("output.bin", "wb") as file:
        async with sdk.download(obj, DownloadOptions()) as d:
            await d.write_to(file)
    ```
=== "Dart"
    ```dart
    import 'dart:io';
    import 'package:sia_storage/sia_storage.dart';

    final sink = File('output.bin').openWrite();
    final dl = sdk.download(object: obj);
    await sink.addStream(dl.data);
    await sink.close();
    ```
=== "JavaScript (Node)"
    ```javascript
    import { open } from 'node:fs/promises'
    import { Writable } from 'node:stream'

    const file = await open('output.bin', 'w')
    const stream = sdk.download(obj)
    await stream.pipeTo(Writable.toWeb(file.createWriteStream()))
    await file.close()
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Collect the stream into a Blob, then trigger a browser download.
    const stream = sdk.download(obj)
    const blob = await new Response(stream).blob()
 
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'output.bin',
    })
    a.click()
    URL.revokeObjectURL(url)
    ```