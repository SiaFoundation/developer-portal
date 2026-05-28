---
title: Track Progress
description: Stream upload and download progress as shards complete using a per-shard callback.
---

# Track Progress

Both `UploadOptions` and `DownloadOptions` accept a per-shard callback. Each invocation receives a `ShardProgress`; sum `shard_size` across invocations for the running byte total.

## Upload

The upload callback fires for every shard the SDK pushes — **data shards plus parity shards**. With the default [erasure coding](../core-concepts/erasure-coding.md) that's roughly 3× the raw input, so use `encoded_size(raw_size, data_shards, parity_shards)` as the denominator, not the raw size.

=== "Rust"
    ```rust
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU64, Ordering};
    use sia_storage::{Object, ShardProgress, UploadOptions, encoded_size};

    let file = tokio::fs::File::open("example.bin").await?;
    let raw_size = file.metadata().await?.len();

    let opts = UploadOptions::default();
    let total = encoded_size(raw_size, opts.data_shards, opts.parity_shards);

    let uploaded = Arc::new(AtomicU64::new(0));
    let cb = uploaded.clone();
    let opts = opts.on_shard_uploaded(move |p: ShardProgress| {
        let n = cb.fetch_add(p.shard_size as u64, Ordering::Relaxed) + p.shard_size as u64;
        println!("uploaded {n} / {total} bytes ({:.1}%)", 100.0 * n as f64 / total as f64);
    });

    let obj = sdk.upload(Object::default(), file, opts).await?;
    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
    import (
        "fmt"
        "os"
        "sync/atomic"

        proto4 "go.sia.tech/core/rhp/v4"
        "go.sia.tech/siastorage"
    )

    const (
        dataShards   = 10 // SDK defaults
        parityShards = 20
    )

    file, err := os.Open("example.bin")
    if err != nil {
        panic(err)
    }
    defer file.Close()

    info, err := file.Stat()
    if err != nil {
        panic(err)
    }
    rawSize := uint64(info.Size())

    // The Go SDK has no encodedSize helper, so compute the encoded total the
    // way the SDK does: round the data up to whole slabs, then add parity.
    dataPerSlab := uint64(dataShards) * uint64(proto4.SectorSize)
    numSlabs := (rawSize + dataPerSlab - 1) / dataPerSlab
    total := numSlabs * uint64(dataShards+parityShards) * uint64(proto4.SectorSize)

    // The callback may be invoked concurrently, so accumulate atomically.
    var uploaded atomic.Uint64

    obj := siastorage.NewEmptyObject()
    err = client.Upload(ctx, &obj, file,
        siastorage.WithRedundancy(dataShards, parityShards),
        siastorage.WithUploadProgress(func(p siastorage.ShardProgress) {
            n := uploaded.Add(p.ShardSize)
            fmt.Printf("uploaded %d / %d bytes (%.1f%%)\n",
                n, total, 100*float64(n)/float64(total))
        }),
    )
    if err != nil {
        panic(err)
    }

    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    import os
    from sia_storage import PinnedObject, UploadOptions, encoded_size

    DATA_SHARDS, PARITY_SHARDS = 10, 20  # SDK defaults

    raw_size = os.path.getsize("example.bin")
    total = encoded_size(raw_size, DATA_SHARDS, PARITY_SHARDS)

    uploaded = 0
    def on_shard(p):
        nonlocal uploaded
        uploaded += p.shard_size
        print(f"uploaded {uploaded} / {total} bytes ({100 * uploaded / total:.1f}%)")

    opts = UploadOptions(
        data_shards=DATA_SHARDS,
        parity_shards=PARITY_SHARDS,
        shard_uploaded=on_shard,
    )

    with open("example.bin", "rb") as reader:
        obj = await sdk.upload(PinnedObject(), reader, opts)

    await sdk.pin_object(obj)
    ```
=== "JavaScript (Node)"
    ```javascript
        import { encodedSize, PinnedObject } from '@siafoundation/sia-storage'
        import { openAsBlob } from 'node:fs'
        import { stat } from 'node:fs/promises'

        const DATA_SHARDS = 10
        const PARITY_SHARDS = 20

        const rawSize = BigInt((await stat('example.bin')).size)
        const total = encodedSize(rawSize, DATA_SHARDS, PARITY_SHARDS)

        let uploaded = 0n
        const blob = await openAsBlob('example.bin')

        const obj = await sdk.upload(new PinnedObject(), blob.stream(), {
        dataShards: DATA_SHARDS,
        parityShards: PARITY_SHARDS,
        onShardUploaded: (p) => {
            uploaded += p.shardSize
            const pct = ((Number(uploaded) / Number(total)) * 100).toFixed(1)
            console.log(`uploaded ${uploaded} / ${total} bytes (${pct}%)`)
        },
        })

        await sdk.pinObject(obj)
    ```
=== "JavaScript (Browser)"
    ```javascript
        import { encodedSize, PinnedObject } from '@siafoundation/sia-storage'

        const DATA_SHARDS = 10
        const PARITY_SHARDS = 20

        // Get a File from an  element
        const input = document.querySelector('input[type=file]')
        const file = input.files[0]

        const total = encodedSize(file.size, DATA_SHARDS, PARITY_SHARDS)

        let uploaded = 0
        const obj = await sdk.upload(new PinnedObject(), file.stream(), {
        dataShards: DATA_SHARDS,
        parityShards: PARITY_SHARDS,
        onShardUploaded: (p) => {
            uploaded += p.shardSize
            const pct = ((uploaded / total) * 100).toFixed(1)
            console.log(`uploaded ${uploaded} / ${total} bytes (${pct}%)`)
        },
        })

        await sdk.pinObject(obj)
    ```

## Download

The download callback fires per recovered shard. Parity is only fetched if a data shard fails, so the byte total tracks the object's raw size. Use `obj.size()` for the denominator.

=== "Rust"
    ```rust
    use std::sync::Arc;
    use std::sync::atomic::{AtomicU64, Ordering};
    use sia_storage::{DownloadOptions, ShardProgress};

    let total = obj.size();

    let downloaded = Arc::new(AtomicU64::new(0));
    let cb = downloaded.clone();
    let opts = DownloadOptions::default().on_shard_downloaded(move |p: ShardProgress| {
        let n = cb.fetch_add(p.shard_size as u64, Ordering::Relaxed) + p.shard_size as u64;
        println!("downloaded {n} / {total} bytes ({:.1}%)", 100.0 * n as f64 / total as f64);
    });

    let mut reader = sdk.download(&obj, opts)?;
    let mut bytes = Vec::new();
    tokio::io::copy(&mut reader, &mut bytes).await?;
    ```
=== "Go"
    ```go
    import (
        "fmt"
        "io"
        "sync/atomic"

        "go.sia.tech/siastorage"
    )

    total := obj.Size()

    // The callback may be invoked concurrently, so accumulate atomically.
    var downloaded atomic.Uint64

    rc, err := client.Download(obj,
        siastorage.WithDownloadProgress(func(p siastorage.ShardProgress) {
            n := downloaded.Add(p.ShardSize)
            fmt.Printf("downloaded %d / %d bytes (%.1f%%)\n",
                n, total, 100*float64(n)/float64(total))
        }),
    )
    if err != nil {
        panic(err)
    }
    defer rc.Close()

    // Drain the reader so the callbacks fire. Replace io.Discard with your
    // real destination (a file, buffer, etc.).
    if _, err := io.Copy(io.Discard, rc); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    from sia_storage import DownloadOptions

    total = obj.size()

    downloaded = 0
    def on_shard(p):
        nonlocal downloaded
        downloaded += p.shard_size
        print(f"downloaded {downloaded} / {total} bytes ({100 * downloaded / total:.1f}%)")

    opts = DownloadOptions(shard_downloaded=on_shard)

    async with sdk.download(obj, opts) as d:
        data = await d.read_all()
    ```
=== "JavaScript (Node)"
    ```javascript
        const total = obj.size()

        let downloaded = 0n
        const stream = sdk.download(obj, {
        onShardDownloaded: (p) => {
            downloaded += p.shardSize
            const pct = ((Number(downloaded) / Number(total)) * 100).toFixed(1)
            console.log(`downloaded ${downloaded} / ${total} bytes (${pct}%)`)
        },
        })

        // Drain the stream so the callbacks actually fire.
        // Replace this with whatever destination you need (file, buffer, etc.).
        await new Response(stream).arrayBuffer()
    ```
=== "JavaScript (Browser)"
    ```javascript
        const total = obj.size()

        let downloaded = 0
        const stream = sdk.download(obj, {
        onShardDownloaded: (p) => {
            downloaded += p.shardSize
            const pct = ((downloaded / total) * 100).toFixed(1)
            console.log(`downloaded ${downloaded} / ${total} bytes (${pct}%)`)
        },
        })

        // Drain the stream so the callbacks actually fire.
        // Replace this with whatever destination you need (Blob, file, etc.).
        await new Response(stream).arrayBuffer()
    ```