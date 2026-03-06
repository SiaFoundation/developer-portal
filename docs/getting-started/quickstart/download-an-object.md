# Download an Object

Once your application has uploaded an object to Sia (or you’ve received a Share URL), downloading is straightforward. The SDK handles all network coordination: locating slabs, downloading encrypted shards, verifying them, and decrypting your data locally.

Downloads are **Writer-based**: you provide a `Writer`, and the SDK streams the decrypted bytes into it. This makes it easy to download small objects into memory or stream large objects directly to disk.

## Prerequisites

Before proceeding, ensure you have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance
  * A `PinnedObject` returned from a [successful upload](./upload-an-object.md) or retrieved using a [share URL](./share-an-object.md)

Once ready, you can download the object by providing a `Writer` implementation.

## Example

=== "Python"
    ```python
    import asyncio
    import json
    from io import BytesIO
    from datetime import datetime, timedelta, timezone

    from indexd_ffi import (
        generate_recovery_phrase,
        uniffi_set_event_loop,
        Builder,
        AppMeta,
        UploadOptions,
        DownloadOptions,
        Reader,
        Writer,
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

    # Writer helper
    class BytesWriter(Writer):
        def __init__(self):
            self.buffer = BytesIO()

        async def write(self, data: bytes) -> None:
            if len(data) > 0:
                self.buffer.write(data)

        def get_data(self) -> bytes:
            return self.buffer.getvalue()

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
        # NOTE: update_object_metadata() requires a pinned object, so we set metadata before pinning.
        obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

        # IMPORTANT: upload returns an object whose slabs are not yet pinned in the indexer.
        # Pinning persists the sealed object + pins its slabs (including the metadata set above).
        await sdk.pin_object(obj)

        sealed = obj.seal(app_key)
        print("\nObject Sealed:")
        print(" - Sealed ID:", sealed.id)

        print("\nUpload complete:")
        print(" - Size:", obj.size(), "bytes")

        #-------------------------------------------------------
        # SHARE AN OBJECT
        #-------------------------------------------------------

        # Share the object (valid for 1 hour)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        share_url = sdk.share_object(obj, expires)
        print("\nShare URL:", share_url)

        #-------------------------------------------------------
        # DOWNLOAD AN OBJECT
        #-------------------------------------------------------

        # Download the object
        #
        #    If you are downloading from a shared URL, you will first have to resolve
        #    the object from the share URL and download it like so.
        """
        shared_obj = await sdk.shared_object(share_url)
        bWriter = BytesWriter()
        await sdk.download(bWriter, shared_obj, DownloadOptions())
        print("\nDownloaded via share!")
        print(" - Contents:", bWriter.get_data().decode())
        """

        #    Or download the object directly like so.

        bWriter = BytesWriter()
        await sdk.download(bWriter, obj, DownloadOptions())

        print("\nObject downloaded!")
        print(" - Contents:", bWriter.get_data().decode())

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use indexd::{app_client::RegisterAppRequest, Builder, DownloadOptions};
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
        // DOWNLOAD AN OBJECT
        //-------------------------------------------------------

        let share_url = read_line("Enter an indexer share url to download: ")?;
        let shared_obj = sdk.shared_object(share_url).await?;

        let mut out = tokio::fs::File::create("output.txt").await?;
        sdk.download(&mut out, &shared_obj, DownloadOptions::default()).await?;

        let contents = tokio::fs::read_to_string("output.txt").await?;
        println!("\nObject downloaded!");
        println!(" - Contents: {contents}");

        Ok(())
    }
    ```
=== "Go"
    *🚧 Coming soon*
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*

## Deep Dive

#### Download Options

`DownloadOptions` allows you to control:

| Option         | Description                                      |
| -------------- | ------------------------------------------------ |
| `offset`       | Starting byte for the download (default: `0`)    |
| `length`       | Number of bytes to read (default: entire object) |
| `max_inflight` | Number of parallel host requests                 |

#### Error Handling

Common cases include:

* Network interruptions
* Host timeouts
* Cancelled downloads (if you call `download.cancel()`)

All throw predictable `DownloadError` exceptions.

## Common Practices

#### Resuming a download

To resume, start from the number of bytes you already have and append into the same file:

```python
import os
from indexd_ffi import Writer, DownloadOptions

class BytesWriter(Writer):
    def __init__(self, path: str, mode: str = "ab"):
        self.f = open(path, mode)

    async def write(self, data: bytes) -> None:
        if len(data) > 0:
            self.f.write(data)

    def close(self) -> None:
        self.f.close()

resume_at = os.path.getsize("output.bin")
writer = BytesWriter("output.bin", mode="ab")

await sdk.download(writer, obj, DownloadOptions(offset=resume_at))
writer.close()
```

#### Download to a file

Stream the decrypted bytes directly to disk:

```python
from indexd_ffi import Writer, DownloadOptions

class BytesWriter(Writer):
    def __init__(self, path: str, mode: str = "wb"):
        self.f = open(path, mode)

    async def write(self, data: bytes) -> None:
        if len(data) > 0:
            self.f.write(data)

    def close(self) -> None:
        self.f.close()

writer = BytesWriter("output.bin", mode="wb")
await sdk.download(writer, obj, DownloadOptions())
writer.close()
```

## Next Step

Congratulations! This marks the end of our Sia Developer Quickstart guide. You now have the tools needed to start building your next decentralized application on Sia!