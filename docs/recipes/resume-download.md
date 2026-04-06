---
title: Resume a Download
description: Continue a partial download using byte offsets and append mode.
---

# Resume a Download

Measure how many bytes you already have, reopen the destination in append mode, and request only the remaining byte range.

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;

    let output_path = "output.bin";

    let resume_at = match tokio::fs::metadata(output_path).await {
        Ok(metadata) => metadata.len(),
        Err(err) if err.kind() == io::ErrorKind::NotFound => 0,
        Err(err) => return Err(err.into()),
    };

    if resume_at >= obj.size() {
        println!("Download already complete.");
        return Ok(());
    }

    let mut out = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(output_path)
        .await?;

    let opts = DownloadOptions {
        offset: resume_at,
        length: Some(obj.size() - resume_at),
        ..Default::default()
    };

    sdk.download(&mut out, &obj, opts).await?;

    println!("Resumed from byte: {}", resume_at);
    ```
=== "Go"
    ```go
    outputPath := "output.bin"
    var resumeAt uint64
    if info, err := os.Stat(outputPath); err == nil {
        resumeAt = uint64(info.Size())
    } else if !os.IsNotExist(err) {
        panic(err)
    }

    if resumeAt >= obj.Size() {
        fmt.Println("Download already complete.")
        return
    }

    file, err := os.OpenFile(outputPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
    if err != nil {
        panic(err)
    }
    defer file.Close()

    remaining := obj.Size() - resumeAt
    if err := client.Download(ctx, file, obj, sdk.WithDownloadRange(resumeAt, remaining)); err != nil {
        panic(err)
    }

    fmt.Println("Resumed from byte:", resumeAt)
    ```
=== "Python"
    ```python
    import os

    output_path = "output.bin"
    resume_at = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    with open(output_path, "ab") as file:
        await sdk.download(file, obj, DownloadOptions(offset=resume_at))

    print("Resumed from byte:", resume_at)
    ```
