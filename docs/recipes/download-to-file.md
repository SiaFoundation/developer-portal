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
    sdk.download(&mut file, &obj, DownloadOptions::default()).await?;
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
        await sdk.download(file, obj, DownloadOptions())
    ```
