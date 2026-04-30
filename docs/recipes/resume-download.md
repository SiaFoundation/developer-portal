---
title: Resume a Download
description: Continue a partial download using byte offsets and append mode.
---

# Resume a Download

Measure how many bytes you already have, reopen the destination in append mode, and request only the remaining byte range.

=== "Rust"
    ```rust
    use std::io;
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
        ..Default::default()
    };

    let mut reader = sdk.download(&obj, opts)?;
    tokio::io::copy(&mut reader, &mut out).await?;

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
    if err := client.Download(ctx, file, obj, siastorage.WithDownloadRange(resumeAt, remaining)); err != nil {
        panic(err)
    }

    fmt.Println("Resumed from byte:", resumeAt)
    ```
=== "Python"
    ```python
    import os

    output_path = "output.bin"
    resume_at = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    if resume_at >= obj.size():
        print("Download already complete.")
        return

    async with sdk.download(obj, DownloadOptions(offset=resume_at)) as d:
        with open(output_path, "ab") as file:
            await d.write_to(file)

    print("Resumed from byte:", resume_at)
    ```
=== "JavaScript"
    ```javascript
    import { stat, open } from 'node:fs/promises'
    import { Writable } from 'node:stream'

    const outputPath = 'output.bin'

    let resumeAt = 0
    try {
      resumeAt = (await stat(outputPath)).size
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }

    if (BigInt(resumeAt) >= obj.size()) {
      console.log('Download already complete.')
    } else {
      const file = await open(outputPath, 'a')
      const stream = sdk.download(obj, { offset: BigInt(resumeAt) })
      await stream.pipeTo(Writable.toWeb(file.createWriteStream()))
      await file.close()

      console.log('Resumed from byte:', resumeAt)
    }
    ```