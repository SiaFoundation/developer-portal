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
