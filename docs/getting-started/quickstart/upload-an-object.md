# Upload an Object

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is made secure by design:

  * All data is encrypted client-side by the user before it leaves the device.
  * Data is erasure-coded into multiple redundant shards.
  * Each shard is uploaded to independent storage providers located [across the globe](https://siascan.com/map).
  * The indexer stores ***only*** encrypted metadata and helps coordinate uploads, downloads, and object management.

This means that even if some hosts go offline—or a malicious actor attempts to intercept user data—all data will remain private and recoverable.

## Prerequisites

Before continuing, make sure you have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance

Once you have established a successful connection, you’re ready to upload your first object.

## Example

=== "Python"
    ```python
    import asyncio
    import json
    from io import BytesIO

    from indexd_ffi import (
        generate_recovery_phrase,
        uniffi_set_event_loop,
        Builder,
        AppMeta,
        UploadOptions,
        Reader,
        UploadProgressCallback,
    )

    # Reader helper
    class BytesReader(Reader):
        def __init__(self, data: bytes, chunk_size: int = 65536):
            self.buffer = BytesIO(data)
            self.chunk_size = chunk_size

        async def read(self) -> bytes:
            # When the buffer is exhausted, this returns b"" (EOF).
            return self.buffer.read(self.chunk_size)

    # Progress callback is optional and can be used to monitor the progress of the upload
    class PrintProgress(UploadProgressCallback):
        def progress(self, uploaded: int, encoded_size: int) -> None:
            if encoded_size == 0:
                print("Starting upload…")
                return
            percent = (uploaded / encoded_size) * 100
            print(f"Upload progress: {percent:.1f}% ({uploaded}/{encoded_size} bytes)")

    async def main():
        # IMPORTANT: required for UniFFI async trait callbacks (Reader/Writer/etc.)
        uniffi_set_event_loop(asyncio.get_running_loop())

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

        # Request app connection and get the approval URL
        await builder.request_connection()
        print("Open this URL to approve the app:", builder.response_url())

        # Wait for the user to approve the request
        try:
            await builder.wait_for_approval()
        except Exception as e:
            raise Exception("\nApp was not approved (rejected or request expired)") from e

        # Ask the user for their recovery phrase
        recovery_phrase = input("\nEnter your recovery phrase (type `seed` to generate a new one): ").strip()

        if recovery_phrase == "seed":
            recovery_phrase = generate_recovery_phrase()
            print("\nRecovery phrase:", recovery_phrase)

        # Register an SDK instance with your recovery phrase.
        sdk = await builder.register(recovery_phrase)

        # The App Key should be exported and stored securely for future launches, but we don't demonstrate storage here.
        app_key = sdk.app_key()
        print("\nStore this App Key in your app's secure storage:", app_key.export())

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
        reader = BytesReader(b"Hello world!")
        obj = await sdk.upload(reader, upload_options)

        # Attach optional application metadata (encrypted before the indexer sees it).
        # NOTE: update_object_metadata() requires a pinned object, so we set metadata before pinning.
        obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

        # IMPORTANT: upload returns an object whose slabs are not yet pinned in the indexer.
        # Pinning persists the sealed object + pins its slabs (including the metadata set above).
        await sdk.pin_object(obj)

        sealed = obj.seal(app_key)
        print("\nObject Sealed:")
        print(" - Object ID:", sealed.id)

        print("\nUpload complete:")
        print(" - Size:", obj.size(), "bytes")

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use indexd::{app_client::RegisterAppRequest, Builder, UploadOptions};
    use sia::seed::Seed;
    use sia::types::Hash256;
    use std::io::{self, Write};
    use std::str::FromStr;

    const INDEXER_URL: &str = "https://app.sia.storage";

    // Replace this with your real 32-byte App ID (hex-encoded, 64 chars).
    // Generate once per app and keep it stable forever.

    const APP_ID_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000000";

    fn read_line(prompt: &str) -> io::Result<String> {
        print!("{prompt}");
        io::stdout().flush()?;
        let mut s = String::new();
        io::stdin().read_line(&mut s)?;
        Ok(s.trim().to_string())
    }

    fn generate_recovery_phrase() -> String {
        let seed: [u8; 16] = rand::random();
        Seed::from_seed(seed).to_string()
    }

    #[cfg(target_os = "android")]
    fn tls_config() -> rustls::ClientConfig {
        use rustls::RootCertStore;
        let roots = RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.to_vec());
        rustls::ClientConfig::builder()
            .with_root_certificates(roots)
            .with_no_client_auth()
    }

    #[cfg(not(target_os = "android"))]
    fn tls_config() -> rustls::ClientConfig {
        use rustls_platform_verifier::ConfigVerifierExt; // adds with_platform_verifier()
        rustls::ClientConfig::with_platform_verifier().expect("failed to create tls config")
    }

    #[tokio::main(flavor = "multi_thread")]
    async fn main() -> Result<(), Box<dyn std::error::Error>> {
        rustls::crypto::ring::default_provider().install_default().expect("failed to install rustls crypto provider");

        // Create a builder to manage the connection flow
        let builder = Builder::new(INDEXER_URL)?;

        // Configure your app identity details
        let app_id = Hash256::from_str(APP_ID_HEX)?;
        let meta = RegisterAppRequest {
            app_id,
            name: "My App".to_string(),
            description: "Demo application".to_string(),
            service_url: indexd::Url::parse("https://example.com")?,
            logo_url: None,
            callback_url: None,
        };

        // Request app connection and get the approval URL
        let builder = builder.request_connection(&meta).await?;
        println!("Open this URL to approve the app: {}", builder.response_url());

        // Wait for the user to approve the request
        let builder = builder.wait_for_approval().await?;

        // Ask the user for their recovery phrase
        let mut recovery_phrase = read_line("Enter your recovery phrase (type `seed` to generate a new one): ")?;
        if recovery_phrase == "seed" {
            recovery_phrase = generate_recovery_phrase();
            println!("\nRecovery phrase:\n{recovery_phrase}\n");
        }

        // Register an SDK instance with your recovery phrase
        let sdk = builder.register(&recovery_phrase, tls_config()).await?;

        // Export the App Key seed (32 bytes) and store it securely for future launches
        let app_key_seed = &sdk.app_key().as_ref()[..32];
        println!(
            "Store this App Key seed in your app's secure storage (hex): {}",
            hex::encode(app_key_seed)
        );

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

        let sealed = obj.seal(sdk.app_key());
        println!("\nObject Sealed:");
        println!(" - Object ID: {}", sealed.id());
        println!(" - Data signature: {}", sealed.data_signature);

        println!("\nUpload complete:");
        println!(" - Object ID: {}", obj.id());
        println!(" - Size: {} bytes", obj.size());

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
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*

## Deep Dive
#### Objects & Metadata

Uploading returns an object handle you can work with immediately (for example, to seal it, share it, or download it later).

In this quickstart flow, **upload and pin are separate steps**:

* **Upload** sends shards to storage providers and builds the object’s layout.
* **Pinning** (`await sdk.pin_object(obj)`) persists the sealed object record in the indexer and pins the underlying slabs so the object becomes listable/syncable and eligible for repair.

Metadata is **application-defined** and **encrypted**. In this guide, metadata is attached to the object before the pin step so the pinned record includes it.

#### Upload Packing

`await sdk.upload_packed(...)` creates a **packing session** for many small uploads. Instead of uploading each small object as its own standalone layout, the SDK groups them into a packed upload so they can share underlying storage more efficiently.

Each call to `await packed.add(reader)` adds one logical object to the packing session and returns the number of bytes read from that `Reader`. `await packed.remaining()` shows how much unused capacity remains in the current packed upload, which is useful for understanding how the SDK is filling available space.

When you call `await packed.finalize()`, the SDK completes the packed upload and returns a list of object handles—one for each item you added. Even though the data may be stored more efficiently under the hood, each returned object can still be managed individually.

Just like a normal upload, these returned objects can have encrypted application metadata attached and can then be pinned with `await sdk.pin_object(obj)`. Pinning makes each object persist in the indexer so it becomes listable, syncable, and eligible for repair.

Upload packing is most useful when your app needs to store **many small files**, where uploading each item separately would introduce unnecessary overhead.

=== "Python"
    ```python    
    #-------------------------------------------------------
    # PACKED UPLOADS
    #-------------------------------------------------------

    from indexd_ffi import Writer
    from datetime import datetime, timezone, timedelta

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
        reader = BytesReader(data.encode())

        # add() reads from the Reader and queues one logical object.
        size = await packed.add(reader)

        # remaining() shows how much capacity is left in the current pack.
        rem = await packed.remaining()
        print(f"Object {i + 1} added: {size} bytes ({rem} remaining)")

    # Finalize the packed upload and get back one object handle per item added.
    objects = await packed.finalize()
    elapsed = datetime.now(timezone.utc) - start

    print(f"\nPacked upload finished {len(objects)} objects in {elapsed}")

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
    import json
    from indexd_ffi import Reader

    class BytesReader(Reader):
        def __init__(self, path: str, chunk_size: int = 65536):
            self.f = open(path, "rb")
            self.chunk_size = chunk_size

        async def read(self) -> bytes:
            chunk = self.f.read(self.chunk_size)
            if chunk == b"":
                self.f.close()
            return chunk

    reader = BytesReader("example.txt")
    obj = await sdk.upload(reader, upload_options)
    obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())
    await sdk.pin_object(obj)
    ```

=== "Rust"
    ```rust
    use indexd::UploadOptions;

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
    file, err := os.Open("example.txt")
    if err != nil {
        return fmt.Errorf("open file: %w", err)
    }
    defer file.Close()

    obj := sdk.NewEmptyObject()

    // Stream the file directly from disk
    if err := client.Upload(ctx, &obj, file); err != nil {
        return fmt.Errorf("upload object: %w", err)
    }

    // Attach optional metadata before pinning
    obj.UpdateMetadata([]byte(`{"File Name":"example.txt"}`))

    // Pin the object to the indexer
    if err := client.PinObject(ctx, obj); err != nil {
        return fmt.Errorf("pin object: %w", err)
    }
    ```

For GUI apps or high-throughput workloads, you may prefer async file IO or reading in a background thread — but the same pattern applies: stream chunks from disk, attach metadata if needed, then pin the object.

#### Custom metadata

If you want the pinned object record to include metadata such as the original filename, MIME type, user ID, or application-specific tags, attach that metadata before calling the pin step.

#### Real progress bars

Instead of printing percentages, integrate `progress_callback` with a CLI or GUI progress bar.

## Next Step
[Share an Object →](./share-an-object.md){ .md-button }