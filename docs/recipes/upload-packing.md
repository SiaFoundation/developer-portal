# Upload Packing

Sia erasure-codes every upload into a fixed number of shards (by default, 10 data + 20 parity = 30 shards). Each shard is a fixed-size sector stored on a different storage provider. This means even a 1-byte file occupies a full slab — the same storage footprint as a file that fills the entire slab's data capacity.

For apps that store many small files (chat messages, thumbnails, config blobs, etc.), uploading each one individually wastes most of every slab. Packed uploads solve this by combining multiple small objects into a shared slab before erasure coding, so they split the overhead instead of each paying the full cost.

Each packed object still gets its own Object ID and can be pinned, downloaded, shared, or deleted independently.

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use std::io::Cursor;
    use std::time::Instant;

    let start = Instant::now();

    let mut packed = sdk.upload_packed(UploadOptions::default());

    for i in 0..10 {
        let data = format!("Contents of object {}.", i + 1);
        let reader = Cursor::new(data.into_bytes());

        let size = packed.add(reader).await?;
        let rem = packed.remaining();
        println!("Object {} added: {} bytes ({} remaining)", i + 1, size, rem);
    }

    let mut objects = packed.finalize().await?;

    for (i, obj) in objects.iter_mut().enumerate() {
        obj.metadata = format!(r#"{{"File Name":"packed-{}.txt"}}"#, i + 1).into_bytes();
        sdk.pin_object(obj).await?;
    }

    let elapsed = start.elapsed();
    println!("\nPacked upload finished {} objects in {:.2?}", objects.len(), elapsed);

    for (i, obj) in objects.iter().enumerate() {
        println!(" - Object {} ID: {}", i + 1, obj.id());
    }
    ```
=== "Go"
    ```go
    start := time.Now()

    packed, err := client.UploadPacked()
    if err != nil {
        panic(err)
    }
    defer packed.Close()

    for i := 0; i < 10; i++ {
        data := fmt.Sprintf("Contents of object %d.", i+1)
        reader := bytes.NewReader([]byte(data))

        size, err := packed.Add(ctx, reader)
        if err != nil {
            panic(err)
        }

        rem := packed.Remaining()
        fmt.Printf("Object %d added: %d bytes (%d remaining)\n", i+1, size, rem)
    }

    objects, err := packed.Finalize(ctx)
    if err != nil {
        panic(err)
    }

    for i := range objects {
        objects[i].UpdateMetadata([]byte(fmt.Sprintf(`{"File Name":"packed-%d.txt"}`, i+1)))

        if err := client.PinObject(ctx, objects[i]); err != nil {
            panic(err)
        }
    }

    elapsed := time.Since(start)
    fmt.Printf("\nPacked upload finished %d objects in %s\n", len(objects), elapsed)

    for i, obj := range objects {
        fmt.Printf(" - Object %d ID: %s\n", i+1, obj.ID())
    }
    ```
=== "Python"
    ```python
    from datetime import datetime, timezone

    start = datetime.now(timezone.utc)

    packed = await sdk.upload_packed(UploadOptions())

    for i in range(10):
        data = f"Contents of object {i + 1}."
        reader = BytesIO(data.encode())

        size = await packed.add(reader)
        rem = packed.remaining()
        print(f"Object {i + 1} added: {size} bytes ({rem} remaining)")

    objects = await packed.finalize()

    for i, obj in enumerate(objects, start=1):
        obj.update_metadata(json.dumps({"File Name": f"packed-{i}.txt"}).encode())
        await sdk.pin_object(obj)

    elapsed = datetime.now(timezone.utc) - start
    print(f"\nPacked upload finished {len(objects)} objects in {elapsed}")

    for i, obj in enumerate(objects, start=1):
        print(f" - Object {i} ID: {obj.id()}")
    ```
