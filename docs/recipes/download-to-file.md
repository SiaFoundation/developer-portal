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

    if err := client.Download(ctx, file, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    with open("output.bin", "wb") as file:
        async with sdk.download(obj, DownloadOptions()) as d:
            await d.write_to(file)
    ```
=== "JavaScript"
    ```javascript
    import { open } from 'node:fs/promises'
    import { Writable } from 'node:stream'

    const file = await open('output.bin', 'w')
    const stream = sdk.download(obj)
    await stream.pipeTo(Writable.toWeb(file.createWriteStream()))
    await file.close()
    ```