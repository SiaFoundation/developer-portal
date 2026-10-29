---
title: Track Progress
description: Stream upload and download progress as shards complete using a per-shard callback.
---

# Track Progress

Both `UploadOptions` and `DownloadOptions` accept a per-shard callback. Each invocation receives a `ShardProgress`; sum `shard_size` across invocations for the running byte total. In the Rust, Go and Python SDKs the callback can run on several threads at once, so those examples hold a lock while they add to the total and print it. Otherwise lines can print out of order, and in Python an update can be lost.

## Upload

The upload callback fires for every shard the SDK pushes — **data shards plus parity shards**. With the default [erasure coding](../core-concepts/erasure-coding.md) that's roughly 3× the raw input, so use `encoded_size(raw_size, data_shards, parity_shards)` as the denominator, not the raw size.
In the Rust, Python, Dart and JavaScript SDKs, a shard can be reported twice: if the indexer rejects a slab because its upload took too long to pin, the SDK uploads the slab again. Without the cap in the examples below, the total can end above `encoded_size` and the percentage above 100%.

=== "Rust"
    ```rust
    use std::sync::{Arc, Mutex};
    use sia_storage::{Object, ShardProgress, UploadOptions, encoded_size};

    let file = tokio::fs::File::open("example.bin").await?;
    let raw_size = file.metadata().await?.len();

    let opts = UploadOptions::default();
    let total = encoded_size(raw_size, opts.data_shards, opts.parity_shards);

    let uploaded = Arc::new(Mutex::new(0u64));
    let cb = uploaded.clone();
    let opts = opts.on_shard_uploaded(move |p: ShardProgress| {
        // Hold the lock while printing so the lines come out in order.
        let mut n = cb.lock().unwrap();
        *n += p.shard_size as u64;
        println!("uploaded {n} / {total} bytes ({:.1}%)", (100.0 * *n as f64 / total as f64).min(100.0));
    });

    let obj = sdk.upload(Object::default(), file, opts).await?;
    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
    import (
        "fmt"
        "os"
        "sync"

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

    // The callback may be invoked concurrently. The mutex keeps the total
    // and the printed lines in order.
    var mu sync.Mutex
    var uploaded uint64

    obj := siastorage.NewEmptyObject()
    err = client.Upload(ctx, &obj, file,
        siastorage.WithRedundancy(dataShards, parityShards),
        siastorage.WithUploadProgress(func(p siastorage.ShardProgress) {
            mu.Lock()
            defer mu.Unlock()
            uploaded += p.ShardSize
            fmt.Printf("uploaded %d / %d bytes (%.1f%%)\n",
                uploaded, total, min(100, 100*float64(uploaded)/float64(total)))
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
    import threading
    from sia_storage import PinnedObject, UploadOptions, encoded_size

    DATA_SHARDS, PARITY_SHARDS = 10, 20  # SDK defaults

    raw_size = os.path.getsize("example.bin")
    total = encoded_size(raw_size, DATA_SHARDS, PARITY_SHARDS)

    # The SDK calls on_shard from its own threads, possibly several at once.
    lock = threading.Lock()
    uploaded = 0
    def on_shard(p):
        nonlocal uploaded
        with lock:
            uploaded += p.shard_size
            print(f"uploaded {uploaded} / {total} bytes ({min(100, 100 * uploaded / total):.1f}%)")

    opts = UploadOptions(
        data_shards=DATA_SHARDS,
        parity_shards=PARITY_SHARDS,
        shard_uploaded=on_shard,
    )

    with open("example.bin", "rb") as reader:
        obj = await sdk.upload(PinnedObject(), reader, opts)

    await sdk.pin_object(obj)
    ```
=== "Dart"
    ```dart
    import 'dart:io';
    import 'package:sia_storage/sia_storage.dart';

    const dataShards = 10;
    const parityShards = 20;

    final file = File('example.bin');
    final rawSize = BigInt.from(await file.length());
    final total = encodedSize(
      size: rawSize,
      dataShards: dataShards,
      parityShards: parityShards,
    );

    var uploaded = BigInt.zero;

    final upload = sdk.upload(
      object: PinnedObject(),
      source: file.openRead(),
      options: const UploadOptions(dataShards: dataShards, parityShards: parityShards),
    );

    // Subscribe before awaiting result to avoid missing early events
    upload.progress.listen((p) {
      uploaded += BigInt.from(p.shardSize);
      final pct = (uploaded.toDouble() / total.toDouble() * 100).clamp(0, 100).toStringAsFixed(1);
      print('uploaded $uploaded / $total bytes ($pct%)');
    });

    final obj = await upload.result;
    await sdk.pinObject(object: obj);
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
        uploaded += BigInt(p.shardSize)
        const pct = Math.min(100, (Number(uploaded) / Number(total)) * 100).toFixed(1)
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

    // Get a File from an <input type="file"> element
    const input = document.querySelector('input[type=file]')
    const file = input.files[0]

    const total = encodedSize(file.size, DATA_SHARDS, PARITY_SHARDS)

    let uploaded = 0
    const obj = await sdk.upload(new PinnedObject(), file.stream(), {
      dataShards: DATA_SHARDS,
      parityShards: PARITY_SHARDS,
      onShardUploaded: (p) => {
        uploaded += p.shardSize
        const pct = Math.min(100, (uploaded / total) * 100).toFixed(1)
        console.log(`uploaded ${uploaded} / ${total} bytes (${pct}%)`)
      },
    })

    await sdk.pinObject(obj)
    ```

## Download

The download callback fires for each shard the SDK uses to rebuild a chunk. The SDK requests more shards than it needs so it doesn't wait on slow hosts, but it reports only the ones it uses, so the byte total tracks the object's raw size. Use `obj.size()` for the denominator. Each shard read is rounded up, so without the cap in the examples below, the total ends slightly above `obj.size()` (264,320 bytes for a 262,144-byte object in testing) and the percentage slightly above 100%.

=== "Rust"
    ```rust
    use std::sync::{Arc, Mutex};
    use sia_storage::{DownloadOptions, ShardProgress};

    let total = obj.size();

    let downloaded = Arc::new(Mutex::new(0u64));
    let cb = downloaded.clone();
    let opts = DownloadOptions::default().on_shard_downloaded(move |p: ShardProgress| {
        // Hold the lock while printing so the lines come out in order.
        let mut n = cb.lock().unwrap();
        *n += p.shard_size as u64;
        println!("downloaded {n} / {total} bytes ({:.1}%)", (100.0 * *n as f64 / total as f64).min(100.0));
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
        "sync"

        "go.sia.tech/siastorage"
    )

    total := obj.Size()

    // The callback may be invoked concurrently. The mutex keeps the total
    // and the printed lines in order.
    var mu sync.Mutex
    var downloaded uint64

    rc, err := client.Download(obj,
        siastorage.WithDownloadProgress(func(p siastorage.ShardProgress) {
            mu.Lock()
            defer mu.Unlock()
            downloaded += p.ShardSize
            fmt.Printf("downloaded %d / %d bytes (%.1f%%)\n",
                downloaded, total, min(100, 100*float64(downloaded)/float64(total)))
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
    import threading
    from sia_storage import DownloadOptions

    total = obj.size()

    # The SDK calls on_shard from its own threads, possibly several at once.
    lock = threading.Lock()
    downloaded = 0
    def on_shard(p):
        nonlocal downloaded
        with lock:
            downloaded += p.shard_size
            print(f"downloaded {downloaded} / {total} bytes ({min(100, 100 * downloaded / total):.1f}%)")

    opts = DownloadOptions(shard_downloaded=on_shard)

    async with sdk.download(obj, opts) as d:
        data = await d.read_all()
    ```
=== "Dart"
    ```dart
    import 'package:sia_storage/sia_storage.dart';

    final total = obj.size();
    var downloaded = BigInt.zero;

    final dl = sdk.download(object: obj);

    // Subscribe before reading data to avoid missing early events
    dl.progress.listen((p) {
      downloaded += BigInt.from(p.shardSize);
      final pct = (downloaded.toDouble() / total.toDouble() * 100).clamp(0, 100).toStringAsFixed(1);
      print('downloaded $downloaded / $total bytes ($pct%)');
    });

    // Drain the stream so the callbacks actually fire.
    // Replace with your real destination (file, buffer, etc.).
    final buffer = <int>[];
    await for (final chunk in dl.data) {
      buffer.addAll(chunk);
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    const total = obj.size()

    let downloaded = 0n
    const stream = sdk.download(obj, {
      onShardDownloaded: (p) => {
        downloaded += BigInt(p.shardSize)
        const pct = Math.min(100, (Number(downloaded) / Number(total)) * 100).toFixed(1)
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
        const pct = Math.min(100, (downloaded / total) * 100).toFixed(1)
        console.log(`downloaded ${downloaded} / ${total} bytes (${pct}%)`)
      },
    })

    // Drain the stream so the callbacks actually fire.
    // Replace this with whatever destination you need (Blob, file, etc.).
    await new Response(stream).arrayBuffer()
    ```