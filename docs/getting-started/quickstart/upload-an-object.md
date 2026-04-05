# Upload an Object

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is made secure by design:

  * All data is encrypted client-side by the user before it leaves the device.
  * Data is erasure-coded into multiple redundant shards.
  * Each shard is uploaded to independent storage providers located [across the globe](https://siascan.com/map).
  * The indexer stores ***only*** encrypted metadata and helps coordinate uploads, downloads, and object management.

This means that even if some hosts go offline—or a malicious actor attempts to intercept user data—all data will remain private and recoverable.

## Prerequisites

Before continuing, make sure you have:

  * An [App Key](./connect-to-an-indexer.md) returned from a successful connection to an indexer.

Once you have established a successful connection, you’re ready to upload your first object.

## Example

=== "Python"
    ```python
    import asyncio
    import json
    from io import BytesIO

    from sia_storage import (
        Builder,
        AppMeta,
        AppKey,
        UploadOptions,
        UploadProgressCallback,
    )

    # Progress callback is optional and can be used to monitor the progress of the upload
    class PrintProgress(UploadProgressCallback):
        def progress(self, uploaded: int, encoded_size: int) -> None:
            if encoded_size == 0:
                print("Starting upload…")
                return
            percent = (uploaded / encoded_size) * 100
            print(f"Upload progress: {percent:.1f}% ({uploaded}/{encoded_size} bytes)")

    async def main():
        # Configure your app identity details
        meta = AppMeta(
            id=b"your-32-byte-app-id.............",
            name="My App",
            description="Demo application",
            service_url="https://example.com",
            logo_url=None,
            callback_url=None
        )

        # Create a builder to manage the connection flow
        builder = Builder("https://app.sia.storage", meta)

        # Ask the user for their App Key
        app_key_hex = input("\nEnter your App Key (hex): ").strip()
        app_key = AppKey(bytes.fromhex(app_key_hex))

        # Connect using the existing App Key
        sdk = await builder.connected(app_key)
        if sdk is None:
            raise Exception(
                "\nApp Key is not connected to this app on this indexer."
                "\nRun connect-to-an-indexer.py first to approve and register the app."
            )

        print("\nApp Connected!")

        #-------------------------------------------------------
        # UPLOAD AN OBJECT
        #-------------------------------------------------------

        # Configure Upload Options
        upload_options = UploadOptions(
            # Progress callback is optional and can be used to monitor the progress of the upload
            progress_callback=PrintProgress()
        )

        # Upload the "Hello world!" data
        print("\nStarting upload...")
        reader = BytesIO(b"Hello world!")
        obj = await sdk.upload(reader, upload_options)

        # Attach optional application metadata (encrypted before the indexer sees it).
        # This updates the local object before pinning persists it to the indexer.
        obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

        # IMPORTANT: upload returns an object whose slabs are not yet pinned in the indexer.
        # Pinning persists the sealed object + pins its slabs (including the metadata set above).
        await sdk.pin_object(obj)

        print("\nUpload complete:")
        print(" - Size:", obj.size(), "bytes")
        print(" - Object ID:", obj.id())

    asyncio.run(main())
    ```
=== "Rust"
    ```rust
    use sia_storage::{app_id, AppMetadata, Builder, PrivateKey, UploadOptions};
    use std::io::{self, Write};

    const INDEXER_URL: &str = "https://app.sia.storage";

    const APP_META: AppMetadata = AppMetadata {
        // Replace `app_id` with your real 32-byte App ID (hex-encoded, 64 chars).
        // Generate this ONCE and keep it stable forever for your app.
        id: app_id!("0000000000000000000000000000000000000000000000000000000000000000"),
        name: "My App",
        description: "Demo application",
        service_url: "https://example.com",
        logo_url: None,
        callback_url: None,
    };

    #[tokio::main(flavor = "multi_thread")]
    async fn main() -> Result<(), Box<dyn std::error::Error>> {
        // Create a builder that can reconnect using an existing App Key
        let builder = Builder::new(INDEXER_URL, APP_META)?;

        // Ask the user for their App Key
        print!("Enter your App Key (hex): ");
        io::stdout().flush()?;
        let mut app_key_hex = String::new();
        io::stdin().read_line(&mut app_key_hex)?;
        let app_key_hex = app_key_hex.trim();

        let mut seed = [0u8; 32];
        hex::decode_to_slice(app_key_hex, &mut seed)?;
        let app_key = PrivateKey::from_seed(&seed);

        // Reconnect using the App Key
        let sdk = match builder.connected(&app_key).await? {
            Some(sdk) => sdk,
            None => {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "invalid App Key",
                )
                .into())
            }
        };

        println!("\nApp Connected!");

        //-------------------------------------------------------
        // UPLOAD AN OBJECT
        //-------------------------------------------------------

        let options = UploadOptions::default();

        // Upload "Hello world!" from an in-memory reader
        let reader = std::io::Cursor::new(b"Hello world!".to_vec());
        println!("\nStarting upload...");
        let mut obj = sdk.upload(reader, options).await?;

        // Attach optional metadata (encrypted with the object's master key)
        obj.metadata = br#"{"File Name":"example.txt"}"#.to_vec();

        // Pin the object to the indexer (stores encrypted metadata + layout)
        sdk.pin_object(&obj).await?;

        println!("\nUpload complete:");
        println!(" - Size: {} bytes", obj.size());
        println!(" - Object ID: {}", obj.id());

        Ok(())
    }
    ```
=== "Go"
    ```go
    package main

    import (
        "bufio"
        "context"
        "encoding/hex"
        "fmt"
        "os"
        "strings"

        "go.sia.tech/core/types"
        "go.sia.tech/indexd/sdk"
    )

    const indexerURL = "https://app.sia.storage"

    // Replace this with your real 32-byte App ID (hex-encoded, 64 chars).
    // Generate this ONCE and keep it stable forever for your app.
    // Example: openssl rand -hex 32
    const appIDHex = "0000000000000000000000000000000000000000000000000000000000000000"

    // Parse the App ID once at startup.
    var appID = func() (id types.Hash256) {
        if err := id.UnmarshalText([]byte(appIDHex)); err != nil {
            panic(err)
        }
        return
    }()

    func main() {
        ctx := context.Background()

        // Create a builder to manage SDK access.
        builder := sdk.NewBuilder(indexerURL, sdk.AppMetadata{
            ID:          appID,
            Name:        "My App",
            Description: "Demo application",
            ServiceURL:  "https://example.com",
        })

        // Ask the user for the App Key printed by connect-to-an-indexer.
        fmt.Print("Enter your App Key (hex): ")
        appKeyHex, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        appKeyHex = strings.TrimSpace(appKeyHex)

        appKeySeed, err := hex.DecodeString(appKeyHex)
        if err != nil {
            panic(err)
        }
        if len(appKeySeed) != 32 {
            panic("app key must be 32 bytes (64 hex chars)")
        }

        // Create an SDK instance with the stored App Key.
        client, err := builder.SDK(types.NewPrivateKeyFromSeed(appKeySeed))
        if err != nil {
            panic(err)
        }
        defer client.Close()

        fmt.Println("\nApp Connected!")

        //-------------------------------------------------------
        // UPLOAD AN OBJECT
        //-------------------------------------------------------

        // Upload "Hello world!" from an in-memory reader.
        fmt.Println("\nStarting upload...")

        obj := sdk.NewEmptyObject()
        if err := client.Upload(ctx, &obj, strings.NewReader("Hello world!")); err != nil {
            panic(err)
        }

        // Attach optional metadata (encrypted with the object's master key).
        obj.UpdateMetadata([]byte(`{"File Name":"example.txt"}`))

        // Pin the object to the indexer (stores encrypted metadata + layout).
        if err := client.PinObject(ctx, obj); err != nil {
            panic(err)
        }

        fmt.Println("\nUpload complete:")
        fmt.Println(" - Size:", obj.Size(), "bytes")
        fmt.Println(" - Object ID:", obj.ID())
    }
    ```

## Deep Dive
#### Objects & Metadata

Uploading returns an object handle you can work with immediately (for example, to seal it, share it, or download it later).

In this quickstart flow, **upload and pin are separate steps**:

* **Upload** sends shards to storage providers and builds the object’s layout.
* **Pinning** (`await sdk.pin_object(obj)`) persists the sealed object record in the indexer and pins the underlying slabs so the object becomes listable/syncable and eligible for repair.

The Object ID comes from the object’s slab layout, so you can read it directly with obj.id() after upload. Sealing is only needed when you want a sealed object for offline storage or manual transport; `sdk.pin_object(...)` handles sealing internally.

Metadata is **application-defined** and **encrypted**. In this guide, metadata is attached to the object before the pin step so the pinned record includes it.

#### Upload Packing

`await sdk.upload_packed(...)` creates a **packing session** for many small uploads. Instead of uploading each small object as its own standalone layout, the SDK groups them into a packed upload so they can share underlying storage more efficiently.

Each call to `await packed.add(reader)` adds one logical object to the packing session and returns the number of bytes read from that `Reader`. `await packed.remaining()` shows how much unused capacity remains in the current packed upload, which is useful for understanding how the SDK is filling available space.

When you call `await packed.finalize()`, the SDK completes the packed upload and returns a list of object handles—one for each item you added. Even though the data may be stored more efficiently under the hood, each returned object can still be managed individually.

Just like a normal upload, these returned objects can have encrypted application metadata attached and can then be pinned with `await sdk.pin_object(obj)`. Pinning makes each object persist in the indexer so it becomes listable, syncable, and eligible for repair.

Upload packing is most useful when your app needs to store **many small files**, where uploading each item separately would introduce unnecessary overhead.

=== "Python"
    ```python    
    from datetime import datetime, timezone

    #-------------------------------------------------------
    # PACKED UPLOADS
    #-------------------------------------------------------

    # Packed uploads are useful when your app needs to store
    # many small objects efficiently.
    start = datetime.now(timezone.utc)

    # Create a packing session.
    packed = await sdk.upload_packed(
        UploadOptions(
            # Progress callback is optional and can be used to monitor the upload.
            progress_callback=PrintProgress()
        )
    )

    # Add several small objects to the packing session.
    for i in range(10):
        data = f"Contents of object {i + 1}."
        reader = BytesIO(data.encode())

        # add() reads from the file-like object and queues one logical object.
        size = await packed.add(reader)

        # remaining() returns the unused capacity left in the current pack.
        # In the high-level Python SDK, this is a normal method, not an async one.
        rem = packed.remaining()
        print(f"Object {i + 1} added: {size} bytes ({rem} remaining)")

    # Finalize the packed upload and get back one object handle per item added.
    objects = await packed.finalize()

    # Each returned object still needs to be pinned to persist it in the indexer.
    for i, obj in enumerate(objects, start=1):
        # Attach optional metadata before pinning.
        obj.update_metadata(json.dumps({"File Name": f"packed-{i}.txt"}).encode())

        # Pin the object to the indexer (stores encrypted metadata + layout).
        await sdk.pin_object(obj)

    elapsed = datetime.now(timezone.utc) - start
    print(f"\nPacked upload finished {len(objects)} objects in {elapsed}")

    # Print the Object ID for each uploaded object.
    for i, obj in enumerate(objects, start=1):
        print(f" - Object {i} ID: {obj.id()}")
    ```
=== "Rust"
    ```rust
    use std::io::{Cursor};
    use std::time::Instant;

    // -------------------------------------------------------
    // PACKED UPLOADS
    // -------------------------------------------------------

    // Packed uploads are useful when your app needs to store
    // many small objects efficiently.
    let start = Instant::now();

    // Create a packing session.
    let mut packed = sdk.upload_packed(UploadOptions::default());

    // Add several small objects to the packing session.
    for i in 0..10 {
        let data = format!("Contents of object {}.", i + 1);
        let reader = Cursor::new(data.into_bytes());

        // add() reads from the reader and queues one logical object.
        let size = packed.add(reader).await?;

        // remaining() returns the unused capacity left in the current pack.
        // In the Rust SDK, this is a normal method, not an async one.
        let rem = packed.remaining();
        println!("Object {} added: {} bytes ({} remaining)", i + 1, size, rem);
    }

    // Finalize the packed upload and get back one object handle per item added.
    let mut objects = packed.finalize().await?;

    // Each returned object still needs to be pinned to persist it in the indexer.
    for (i, obj) in objects.iter_mut().enumerate() {
        // Attach optional metadata before pinning.
        obj.metadata = format!(r#"{{"File Name":"packed-{}.txt"}}"#, i + 1).into_bytes();

        // Pin the object to the indexer (stores encrypted metadata + layout).
        sdk.pin_object(obj).await?;
    }

    let elapsed = start.elapsed();
    println!(
        "\nPacked upload finished {} objects in {:.2?}",
        objects.len(),
        elapsed
    );

    // Print the Object ID for each uploaded object.
    for (i, obj) in objects.iter().enumerate() {
        println!(" - Object {} ID: {}", i + 1, obj.id());
    }
    ```
=== "Go"
    ```go
    import (
        "bytes"
        "time"
    )

	// -------------------------------------------------------
	// PACKED UPLOADS
	// -------------------------------------------------------

	start := time.Now()

	// Create a packing session.
	packed, err := client.UploadPacked()
	if err != nil {
		panic(err)
	}
	defer packed.Close()

	// Add several small objects to the packing session.
	for i := 0; i < 10; i++ {
		data := fmt.Sprintf("Contents of object %d.", i+1)
		reader := bytes.NewReader([]byte(data))

		// Add reads from the reader and queues one logical object.
		size, err := packed.Add(ctx, reader)
		if err != nil {
			panic(err)
		}

		// Remaining returns the unused capacity left in the current pack.
		rem := packed.Remaining()
		fmt.Printf("Object %d added: %d bytes (%d remaining)\n", i+1, size, rem)
	}

	// Finalize the packed upload and get back one object handle per item added.
	objects, err := packed.Finalize(ctx)
	if err != nil {
		panic(err)
	}

	// Each returned object still needs to be pinned to persist it in the indexer.
	for i := range objects {
		// Attach optional metadata (encrypted with the object's master key).
		objects[i].UpdateMetadata([]byte(fmt.Sprintf(`{"File Name":"packed-%d.txt"}`, i+1)))

		// Pin the object to the indexer (stores encrypted metadata + layout).
		if err := client.PinObject(ctx, objects[i]); err != nil {
			panic(err)
		}
	}

	elapsed := time.Since(start)
	fmt.Printf("\nPacked upload finished %d objects in %s\n", len(objects), elapsed)

	// Print the Object ID for each uploaded object.
	for i, obj := range objects {
		fmt.Printf(" - Object %d ID: %s\n", i+1, obj.ID())
	}
    ```

    # Each returned object can still be managed individually.
    # Here we attach encrypted metadata and pin each object so it is
    # persisted in the indexer and becomes listable/syncable.
    for i, obj in enumerate(objects):
        obj.update_metadata(json.dumps({
            "File Name": f"example-{i}.txt"
        }).encode())

        await sdk.pin_object(obj)

        print(f"\nPinned object {i + 1}:")
        print(" - ID:", obj.id())
        print(" - Size:", obj.size(), "bytes")
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    *🚧 Coming soon*
=== "Go"
    *🚧 Coming soon*
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*
    
#### Streaming vs Single-Write

Uploads are stream-based. The SDK reads bytes from the source you provide until it reaches the end of the stream.

In the quickstart examples, we upload an in-memory string such as `"Hello world!"`. In a real application, you will often stream from a file, an HTTP request body, or another in-memory buffer.

#### Progress Reporting

Some language bindings expose upload progress callbacks or options that let you monitor:

* Bytes uploaded
* Total encoded size
* Percentage complete

Use those hooks to update progress bars, log status, or drive UI updates when they are available in your chosen SDK.

## Common Practices

#### Upload from a file

Stream directly from disk instead of loading the entire object into memory first:

=== "Python"
    ```python
    #-------------------------------------------------------
    # UPLOAD AN OBJECT FROM A FILE
    #-------------------------------------------------------

    # Upload the contents of a file from disk
    print("\nStarting upload...")
    with open("example.txt", "rb") as reader:
        obj = await sdk.upload(reader, upload_options)

    # Attach optional application metadata (encrypted before the indexer sees it).
    # This updates the local object before pinning persists it to the indexer.
    obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

    # Persist the object to the indexer.
    # This stores the sealed object record and pins its slabs, including the metadata set above.
    await sdk.pin_object(obj)
    ```
=== "Rust"
    ```rust
    use sia_storage::UploadOptions;

    // -------------------------------------------------------
    // UPLOAD AN OBJECT FROM A FILE
    // -------------------------------------------------------
    
    let options = UploadOptions::default();

    // Stream the file directly from disk
    let file = tokio::fs::File::open("example.txt").await?;
    let mut obj = sdk.upload(file, options).await?;

    // Attach optional metadata before pinning
    obj.metadata = br#"{"File Name":"example.txt"}"#.to_vec();

    // Pin the object to the indexer
    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
	// -------------------------------------------------------
	// UPLOAD AN OBJECT FROM A FILE
	// -------------------------------------------------------

	// Stream the contents of a file directly from disk.
	fmt.Println("\nStarting upload...")

	file, err := os.Open("example.txt")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	obj := sdk.NewEmptyObject()
	if err := client.Upload(ctx, &obj, file); err != nil {
		panic(err)
	}

	// Attach optional metadata (encrypted with the object's master key).
	obj.UpdateMetadata([]byte(`{"File Name":"example.txt"}`))

	// Pin the object to the indexer (stores encrypted metadata + layout).
	if err := client.PinObject(ctx, obj); err != nil {
		panic(err)
	}

	fmt.Println("\nUpload complete:")
	fmt.Println(" - Size:", obj.Size(), "bytes")
	fmt.Println(" - Object ID:", obj.ID())
    ```

For GUI apps or high-throughput workloads, you may prefer async file IO or reading in a background thread — but the same pattern applies: stream chunks from disk, attach metadata if needed, then pin the object.

#### Custom metadata

If you want the pinned object record to include metadata such as the original filename, MIME type, user ID, or application-specific tags, attach that metadata before calling the pin step.

#### Real progress bars

Instead of printing percentages, integrate `progress_callback` with a CLI or GUI progress bar.

## Next Step
[Share an Object →](./share-an-object.md){ .md-button }