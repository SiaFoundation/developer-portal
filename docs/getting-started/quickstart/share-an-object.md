# Share an Object

Sharing allows your application to grant others secure, time-limited access to an object you’ve uploaded. Instead of sharing credentials, the SDK generates a cryptographically protected Share URL that:

* Identifies the object being shared
* Enforces an expiration time
* Includes cryptographic material needed to decrypt the shared data (in the URL fragment)
* Prevents tampering or extending the share beyond its intended lifetime

Recipients can then:

* Download the shared object without your App Key
* Optionally pin the object into their own account (using their own App Key)
* Without exposing your account details or credentials

This enables familiar cloud-sharing workflows—while preserving Sia’s end-to-end encrypted, decentralized design.

!!! warning "Shared objects behave like public links"
    Share URLs provide access to the object’s encrypted data, and **anyone who has the link can use it**.

    * **There is no way to revoke access** once a user has the link.  
      Even after the link expires, anyone who already accessed it could have pinned the object into their own account.
    * **Share links cannot be restricted to specific users.**  
      Treat shared objects as publicly accessible to anyone who obtains the URL.

    If you need controlled, permissioned sharing, build your own access layer on top of pinned objects.

## Prerequisites

Before you begin, you should have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance
  * A `PinnedObject` returned from a [successful upload](./upload-an-object.md)

Once you have the object, you can generate a share URL and let another app or device resolve and download it.

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

        #-------------------------------------------------------
        # SHARE AN OBJECT
        #-------------------------------------------------------

        # Share the object (valid for 1 hour)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        share_url = sdk.share_object(obj, expires)
        print("\nShare URL:", share_url)

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use chrono::{Duration, Utc};
    use indexd::{app_client::RegisterAppRequest, Builder, UploadOptions};
    use sia::rhp::SECTOR_SIZE;
    use sia::seed::Seed;
    use sia::types::Hash256;
    use std::io::{self, Write};
    use std::str::FromStr;
    use tokio::sync::mpsc;

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

        // Optional progress reporting via shard notifications
        let (progress_tx, mut progress_rx) = mpsc::unbounded_channel::<()>();
        let data_shards = 10u64;
        let parity_shards = 20u64;
        let total_shards = data_shards + parity_shards;
        tokio::spawn(async move {
            let mut sectors: u64 = 0;
            while progress_rx.recv().await.is_some() {
                sectors += 1;
                let uploaded = sectors * SECTOR_SIZE as u64;
                let slab_size = total_shards * SECTOR_SIZE as u64;
                let encoded_size = sectors.div_ceil(total_shards) * slab_size;
                if encoded_size > 0 {
                    let pct = (uploaded as f64 / encoded_size as f64) * 100.0;
                    println!("Upload progress: {pct:.1}% ({uploaded}/{encoded_size} bytes)");
                }
            }
        });

        let options = UploadOptions {
            data_shards: data_shards as u8,
            parity_shards: parity_shards as u8,
            max_inflight: 16,
            shard_uploaded: Some(progress_tx),
        };

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

        //-------------------------------------------------------
        // SHARE AN OBJECT
        //-------------------------------------------------------

        let expires = Utc::now() + Duration::hours(1);
        let share_url = sdk.share_object(&obj, expires)?;
        println!("\nShare URL: {share_url}");

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

#### Why share URLs are safe

A Share URL is designed to be **read-only** and **time-limited**.

It includes:

* An object identifier
* An expiration timestamp
* A signature proving the share was authorized
* A decryption key (stored in the URL fragment) used to decrypt the object’s data

Share URLs cannot be used to modify or replace the object, and they cannot be extended past expiration without generating a new share.

#### Expiration

If a share URL is used after it expires:

* The request fails with an error
* No data is exposed
* You must generate a new URL if you want continued access

#### Read-only by design

Recipients can:

* Download the object’s data
* Pin the object into their own account

They cannot:

* Modify it
* Replace it
* Write new metadata into your account

!!! warning "Metadata is not included in share resolution by default"
    If you need to share metadata, include it in the object data or send it separately

## Next Step
[Download an Object →](./download-an-object.md){ .md-button }