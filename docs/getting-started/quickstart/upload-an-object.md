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

        # Create a builder to manage the connection flow
        builder = Builder("https://app.sia.storage")

        # Configure your app identity details
        meta = AppMeta(
            id=b"your-32-byte-app-id.............",
            name="My App",
            description="Demo application",
            service_url="https://example.com",
            logo_url=None,
            callback_url=None
        )

        # Request app connection and get the approval URL
        builder = await builder.request_connection(meta)
        print("Open this URL to approve the app:", builder.response_url())

        # Wait for the user to approve the request
        try:
            builder = await builder.wait_for_approval()
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
        print("\nApp Key export (persist however your app prefers):", app_key.export())

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
        # NOTE: update_metadata() requires a pinned object, so we set metadata before pinning.
        obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

        # IMPORTANT: upload returns an object whose slabs are not yet pinned in the indexer.
        # Pinning persists the sealed object + pins its slabs (including the metadata set above).
        await sdk.pin_object(obj)

        sealed = obj.seal(app_key)
        print("\nObject Sealed:")
        print(" - Sealed ID:", sealed.id)

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
        let mut mnemonic = read_line("Enter your recovery phrase (type `seed` to generate a new one): ")?;
        if mnemonic == "seed" {
            mnemonic = generate_recovery_phrase();
            println!("\nRecovery phrase:\n{mnemonic}\n");
        }

        // Register an SDK instance with your recovery phrase
        let sdk = builder.register(&mnemonic, tls_config()).await?;

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
        "bytes"
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

    func readLine(prompt string) (string, error) {
        fmt.Print(prompt)
        in := bufio.NewReader(os.Stdin)
        s, err := in.ReadString('\n')
        if err != nil {
            return "", err
        }
        return strings.TrimSpace(s), nil
    }

    func generateRecoveryPhrase() string {
        return sdk.NewSeedPhrase()
    }

    func mustHash256(s string) types.Hash256 {
        b, err := hex.DecodeString(s)
        if err != nil {
            panic(fmt.Errorf("invalid app ID hex: %w", err))
        }
        if len(b) != 32 {
            panic(fmt.Errorf("app ID must be 32 bytes, got %d", len(b)))
        }

        var h types.Hash256
        copy(h[:], b)
        return h
    }

    func main() {
        if err := run(); err != nil {
            panic(err)
        }
    }

    func run() error {
        ctx := context.Background()

        // Create a builder to manage the connection flow
        builder := sdk.NewBuilder(indexerURL, sdk.AppMetadata{
            ID:          mustHash256(appIDHex),
            Name:        "My App",
            Description: "Demo application",
            ServiceURL:  "https://example.com",
            LogoURL:     "",
            CallbackURL: "",
        })

        // Request app connection and get the approval URL
        responseURL, err := builder.RequestConnection(ctx)
        if err != nil {
            return fmt.Errorf("request connection: %w", err)
        }
        fmt.Println("Open this URL to approve the app:", responseURL)

        // Wait for the user to approve the request
        approved, err := builder.WaitForApproval(ctx)
        if err != nil {
            return fmt.Errorf("wait for approval: %w", err)
        }
        if !approved {
            return fmt.Errorf("app connection was rejected")
        }

        // Ask the user for their recovery phrase
        recovery_phrase, err := readLine("Enter your recovery phrase (type `seed` to generate a new one): ")
        if err != nil {
            return fmt.Errorf("read recovery phrase: %w", err)
        }

        if recovery_phrase == "seed" {
            recovery_phrase = generateRecoveryPhrase()
            fmt.Printf("\nRecovery phrase:\n%s\n\n", recovery_phrase)
        }

        // Register an SDK instance with your recovery phrase
        client, err := builder.Register(ctx, recovery_phrase)
        if err != nil {
            return fmt.Errorf("register app: %w", err)
        }
        defer client.Close()

        // The App Key should be stored securely for future launches,
        // but we do not demonstrate app key storage here.
        _ = client.AppKey()

        fmt.Println("\nApp Connected!")

        //-------------------------------------------------------
        // UPLOAD AN OBJECT
        //-------------------------------------------------------

        // Upload "Hello world!" from an in-memory reader
        reader := bytes.NewReader([]byte("Hello world!"))
        fmt.Println("\nStarting upload...")

        obj := sdk.NewEmptyObject()
        if err := client.Upload(ctx, &obj, reader); err != nil {
            return fmt.Errorf("upload object: %w", err)
        }

        // Attach optional metadata (encrypted with the object's master key)
        obj.UpdateMetadata([]byte(`{"File Name":"example.txt"}`))

        // Pin the object to the indexer (stores encrypted metadata + layout)
        if err := client.PinObject(ctx, obj); err != nil {
            return fmt.Errorf("pin object: %w", err)
        }

        sealed := obj.Seal(client.AppKey())
        fmt.Println("\nObject Sealed:")
        fmt.Println(" - Data signature:", sealed.DataSignature)

        fmt.Println("\nUpload complete:")
        fmt.Println(" - Object ID:", obj.ID())
        fmt.Println(" - Size:", obj.Size(), "bytes")

        return nil
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

`await sdk.upload(reader, upload_options)` uploads your encrypted, erasure-coded data and returns an object handle you can work with immediately (e.g., seal it, share it, download it).

In this quickstart flow, **upload and pin are separate steps**:

* **Upload** sends shards to storage providers and builds the object’s layout.
* **Pinning** (`await sdk.pin_object(obj)`) persists the sealed object record in the indexer and pins the underlying slabs so the object becomes listable/syncable and eligible for repair.

Metadata is **application-defined** and **encrypted**. In this guide we set metadata on the object (`obj.update_metadata(...)`) *before pinning* so the pinned record includes it.

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

Uploads are **Reader-based**. The SDK repeatedly calls your `Reader.read()` method until it returns `b""` (EOF).

In the example, `BytesReader` wraps an in-memory buffer:

```python
reader = BytesReader(b"Hello world!")
obj = await sdk.upload(reader, upload_options)
```

In a real app (especially for large files), you typically implement a `Reader` helper that reads from a file in chunks. The core idea is the same: return the next chunk each call, and return `b""` when finished.

#### Progress Callback

The `progress_callback` runs while data is being uploaded:

* It receives `uploaded` and `encoded_size` in bytes.
* It may be called multiple times as data is sent.
* It’s safe to:
    * Update a progress bar
    * Log percentages
    * Trigger UI updates

## Common Practices

#### Upload from a file

Implement a `Reader` that reads from a file in chunks:

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

For GUI apps or high-throughput workloads, you may prefer async file IO or reading in a background thread — but the Reader contract stays the same.

#### Custom metadata

Store original filename, MIME type, user ID, or application-specific tags.

#### Real progress bars

Instead of printing percentages, integrate `progress_callback` with a CLI or GUI progress bar.

## Next Step
[Share an Object →](./share-an-object.md){ .md-button }