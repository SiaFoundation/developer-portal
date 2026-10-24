---
title: Resume an Upload
description: Save upload checkpoints and resume from the last completed part in every supported SDK language.
---

# Resume an Upload

Upload a file in bounded parts, saving a checkpoint after each completed part. On restart, reload the checkpoint object and start reading the source at `obj.size()` (`obj.Size()` in Go). Passing that object to the next upload appends the remaining data.

## Save and restore checkpoints

Each checkpoint is an Object ID saved **after** the object has been [pinned](../core-concepts/pinning.md). Reconnect with the same App Key and indexer to retrieve it. A failed upload does not provide a portable partial-object checkpoint across SDKs: resume from the last successfully saved part, not from bytes read or [shard progress](./track-progress.md).

These snippets assume a [connected SDK](../quickstart/connect-to-an-indexer.md), named `sdk` (`client` and `ctx` in Go), and a nonempty source file. Run the snippet again after an error or restart to resume. In the browser, select the same file again.

Use the exact same, unchanged source file on every attempt. Keep a separate checkpoint file or storage key for each source file and account, and run only one upload per checkpoint. The size check below catches a checkpoint beyond EOF; it does not detect changed contents. An application can store and verify a source-file hash alongside the checkpoint for that purpose.

=== "Rust"
    ```rust
    use std::io::{self, SeekFrom};
    use sia_storage::{Object, UploadOptions};
    use tokio::fs;
    use tokio::io::{AsyncReadExt, AsyncSeekExt};

    const PART_SIZE: u64 = 40 * 1024 * 1024;
    let source_path = "example.bin";
    let checkpoint_path = "example.bin.upload";
    let temporary_path = "example.bin.upload.tmp";

    let mut obj = match fs::read_to_string(checkpoint_path).await {
        Ok(id) => sdk.object(&id.trim().parse()?).await?,
        Err(err) if err.kind() == io::ErrorKind::NotFound => Object::default(),
        Err(err) => return Err(err.into()),
    };
    let source_size = fs::metadata(source_path).await?.len();
    if source_size == 0 || obj.size() > source_size {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "source is empty or checkpoint exceeds source size",
        ).into());
    }

    while obj.size() < source_size {
        let resume_at = obj.size();
        let length = PART_SIZE.min(source_size - resume_at);
        let mut file = fs::File::open(source_path).await?;
        file.seek(SeekFrom::Start(resume_at)).await?;

        obj = sdk.upload(obj, file.take(length), UploadOptions::default()).await?;
        if obj.size() != resume_at + length {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "source changed").into());
        }
        sdk.pin_object(&obj).await?;

        // Replace the checkpoint only after pinning succeeds.
        fs::write(temporary_path, obj.id().to_string()).await?;
        fs::rename(temporary_path, checkpoint_path).await?;
        println!("Checkpoint: {} / {} bytes", obj.size(), source_size);
    }

    println!("Upload complete. Object ID: {}", obj.id());
    ```
=== "Go"
    ```go
    import (
        "fmt"
        "io"
        "os"
        "strings"

        "go.sia.tech/core/types"
        "go.sia.tech/siastorage"
    )

    const partSize int64 = 40 * 1024 * 1024
    const checkpointPath = "example.bin.upload"
    const temporaryPath = "example.bin.upload.tmp"

    obj := siastorage.NewEmptyObject()
    if saved, err := os.ReadFile(checkpointPath); err == nil {
        var id types.Hash256
        if err := id.UnmarshalText([]byte(strings.TrimSpace(string(saved)))); err != nil {
            panic(err)
        }
        obj, err = client.Object(ctx, id)
        if err != nil {
            panic(err)
        }
    } else if !os.IsNotExist(err) {
        panic(err)
    }

    file, err := os.Open("example.bin")
    if err != nil {
        panic(err)
    }
    defer file.Close()
    info, err := file.Stat()
    if err != nil {
        panic(err)
    }
    sourceSize := uint64(info.Size())
    if sourceSize == 0 || obj.Size() > sourceSize {
        panic("source is empty or checkpoint exceeds source size")
    }

    for obj.Size() < sourceSize {
        resumeAt := obj.Size()
        length := min(partSize, int64(sourceSize-resumeAt))
        reader := io.NewSectionReader(file, int64(resumeAt), length)
        if err := client.Upload(ctx, &obj, reader); err != nil {
            panic(err)
        }
        if obj.Size() != resumeAt+uint64(length) {
            panic("source changed")
        }
        if err := client.PinObject(ctx, obj); err != nil {
            panic(err)
        }

        // Replace the checkpoint only after pinning succeeds.
        if err := os.WriteFile(temporaryPath, []byte(obj.ID().String()), 0600); err != nil {
            panic(err)
        }
        if err := os.Rename(temporaryPath, checkpointPath); err != nil {
            panic(err)
        }
        fmt.Printf("Checkpoint: %d / %d bytes\n", obj.Size(), sourceSize)
    }

    fmt.Println("Upload complete. Object ID:", obj.ID())
    ```
=== "Python"
    ```python
    import os
    from io import BytesIO
    from pathlib import Path
    from sia_storage import PinnedObject, UploadOptions

    part_size = 40 * 1024 * 1024
    checkpoint_path = Path("example.bin.upload")
    temporary_path = Path("example.bin.upload.tmp")

    try:
        saved_id = checkpoint_path.read_text().strip()
    except FileNotFoundError:
        saved_id = None
    obj = await sdk.object(saved_id) if saved_id is not None else PinnedObject()

    with open("example.bin", "rb") as file:
        source_size = os.fstat(file.fileno()).st_size
        if source_size == 0 or obj.size() > source_size:
            raise ValueError("source is empty or checkpoint exceeds source size")

        while obj.size() < source_size:
            resume_at = obj.size()
            length = min(part_size, source_size - resume_at)
            file.seek(resume_at)
            # Buffer only this part, not the entire file.
            data = file.read(length)
            if len(data) != length:
                raise EOFError("source changed")
            obj = await sdk.upload(obj, BytesIO(data), UploadOptions())
            await sdk.pin_object(obj)

            # Replace the checkpoint only after pinning succeeds.
            temporary_path.write_text(obj.id())
            temporary_path.replace(checkpoint_path)
            print(f"Checkpoint: {obj.size()} / {source_size} bytes")

    print("Upload complete. Object ID:", obj.id())
    ```
=== "Dart"
    ```dart
    import 'dart:io';
    import 'package:sia_storage/sia_storage.dart';

    const partSize = 40 * 1024 * 1024;
    final file = File('example.bin');
    final checkpointFile = File('example.bin.upload');
    final temporaryFile = File('example.bin.upload.tmp');

    var obj = await checkpointFile.exists()
        ? await sdk.object(key: (await checkpointFile.readAsString()).trim())
        : PinnedObject();
    final sourceSize = await file.length();
    if (sourceSize == 0 || obj.size() > BigInt.from(sourceSize)) {
      throw StateError('source is empty or checkpoint exceeds source size');
    }

    while (obj.size() < BigInt.from(sourceSize)) {
      final resumeAt = obj.size().toInt();
      final end = (resumeAt + partSize).clamp(0, sourceSize);
      final upload = sdk.upload(
        object: obj,
        source: file.openRead(resumeAt, end),
      );
      obj = await upload.result;
      if (obj.size() != BigInt.from(end)) {
        throw StateError('source changed');
      }
      await sdk.pinObject(object: obj);

      // Replace the checkpoint only after pinning succeeds.
      await temporaryFile.writeAsString(obj.id(), flush: true);
      await temporaryFile.rename(checkpointFile.path);
      print('Checkpoint: ${obj.size()} / $sourceSize bytes');
    }

    print('Upload complete. Object ID: ${obj.id()}');
    ```
=== "JavaScript (Node)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'
    import { openAsBlob } from 'node:fs'
    import { readFile, writeFile, rename } from 'node:fs/promises'

    const PART_SIZE = 40 * 1024 * 1024
    const checkpointPath = 'example.bin.upload'
    const temporaryPath = 'example.bin.upload.tmp'

    let savedId = null
    try {
      savedId = (await readFile(checkpointPath, 'utf8')).trim()
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    let obj = savedId !== null ? await sdk.object(savedId) : new PinnedObject()
    const file = await openAsBlob('example.bin')
    if (file.size === 0 || obj.size() > BigInt(file.size)) {
      throw new Error('source is empty or checkpoint exceeds source size')
    }

    while (obj.size() < BigInt(file.size)) {
      const resumeAt = Number(obj.size())
      const end = Math.min(resumeAt + PART_SIZE, file.size)
      obj = await sdk.upload(obj, file.slice(resumeAt, end).stream())
      if (obj.size() !== BigInt(end)) throw new Error('source changed')
      await sdk.pinObject(obj)

      // Replace the checkpoint only after pinning succeeds.
      await writeFile(temporaryPath, obj.id())
      await rename(temporaryPath, checkpointPath)
      console.log(`Checkpoint: ${obj.size()} / ${file.size} bytes`)
    }

    console.log('Upload complete. Object ID:', obj.id())
    ```
=== "JavaScript (Browser)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    const PART_SIZE = 40 * 1024 * 1024
    const checkpointKey = 'example.bin.upload'
    const input = document.querySelector('input[type=file]')
    const file = input.files[0]
    if (!file) throw new Error('Select the original file to upload or resume')

    const savedId = localStorage.getItem(checkpointKey)
    let obj = savedId !== null ? await sdk.object(savedId) : new PinnedObject()
    if (file.size === 0 || obj.size() > file.size) {
      throw new Error('source is empty or checkpoint exceeds source size')
    }

    while (obj.size() < file.size) {
      const resumeAt = obj.size()
      const end = Math.min(resumeAt + PART_SIZE, file.size)
      obj = await sdk.upload(obj, file.slice(resumeAt, end).stream())
      if (obj.size() !== end) throw new Error('source changed')
      await sdk.pinObject(obj)

      // Replace the checkpoint only after pinning succeeds.
      localStorage.setItem(checkpointKey, obj.id())
      console.log(`Checkpoint: ${obj.size()} / ${file.size} bytes`)
    }

    console.log('Upload complete. Object ID:', obj.id())
    ```

## Retry and finish

If upload, pinning, or checkpoint storage fails, stop and rerun from the saved checkpoint. The current part may be uploaded again, but the saved object contains only the completed prefix, so the resumed object will not duplicate those bytes. If pinning fails while you still have the uploaded object in memory, you can retry pinning it before saving the checkpoint.

Appending changes the Object ID. The last checkpoint is the final pinned object; rerunning with that checkpoint performs no further upload. Update your application's references to the final ID before removing the local checkpoint. Clearing the checkpoint starts a new upload from byte zero.

The examples retain earlier checkpoint objects. These partial objects appear in listings, so keep track of their IDs separately from completed uploads. Once a newer checkpoint is pinned and safely saved, you can [delete superseded checkpoint objects](./delete-objects.md) that are no longer needed. Keep the latest checkpoint until the upload completes.
