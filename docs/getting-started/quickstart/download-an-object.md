# Download an Object

Once your application has uploaded an object to Sia (or you’ve received a Share URL), downloading is straightforward. The SDK handles all network coordination: locating slabs, downloading encrypted shards, verifying them, and decrypting your data locally.

Downloads stream decrypted bytes into a writable destination. Depending on the SDK, that destination might be a custom `Writer`, an in-memory buffer, or a file handle. This makes it easy to download small objects into memory or stream large objects directly to disk.

## Prerequisites

Before proceeding, ensure you have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance
  * Either a pinned object from a [successful upload](./upload-an-object.md) or a share URL from the [sharing flow](./share-an-object.md)

Once ready, you can download the object into memory, into a file, or into another writable destination supported by your SDK.

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
        recoveryPhrase, err := readLine("Enter your recovery phrase (type `seed` to generate a new one): ")
        if err != nil {
            return fmt.Errorf("read recovery phrase: %w", err)
        }

        if recoveryPhrase == "seed" {
            recoveryPhrase = generateRecoveryPhrase()
            fmt.Printf("\nRecovery phrase:\n%s\n\n", recoveryPhrase)
        }

        // Register an SDK instance with your recovery phrase
        client, err := builder.Register(ctx, recoveryPhrase)
        if err != nil {
            return fmt.Errorf("register app: %w", err)
        }
        defer client.Close()

        // The App Key should be stored securely for future launches,
        // but we do not demonstrate app key storage here.
        _ = client.AppKey()

        fmt.Println("\nApp Connected!")

        //-------------------------------------------------------
        // DOWNLOAD AN OBJECT
        //-------------------------------------------------------

        shareURL, err := readLine("Enter an indexer share URL to download: ")
        if err != nil {
            return fmt.Errorf("read share URL: %w", err)
        }

        var buf bytes.Buffer
        if err := client.DownloadSharedObject(ctx, &buf, shareURL); err != nil {
            return fmt.Errorf("download shared object: %w", err)
        }

        fmt.Println("\nObject downloaded!")
        fmt.Println(" - Contents:", buf.String())

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

#### Download Options

Some SDKs expose download options for ranged or tuned downloads, such as:

* An `offset` to start partway through an object
* A `length` to read only part of the object
* Concurrency controls such as `max_inflight`

Check your language binding for the exact option names that are available.

#### Direct object downloads vs share URL downloads

There are two common download flows:

* **Direct object download** uses an object that already belongs to the connected app account.
* **Share URL download** resolves a time-limited shared object and downloads it without needing the original app’s App Key.

This quickstart page focuses on the share URL flow so it can build directly on the previous sharing example.

#### Error Handling

Common download failures include:

* network interruptions
* host timeouts
* expired or invalid share URLs
* application-level cancellation, when supported by the SDK

Handle these errors by surfacing a clear retry path to the user and, when appropriate, resuming from the last successfully written byte range.

## Common Practices

#### Resuming a download

If you already have an object handle, resume by starting at the number of bytes you already have and appending into the same file:

=== "Python"
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

=== "Rust"
    ```rust
    use indexd::DownloadOptions;

    let resume_at = tokio::fs::metadata("output.bin").await?.len();
    let mut out = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("output.bin")
        .await?;

    let opts = DownloadOptions {
        offset: resume_at,
        length: obj.size() - resume_at,
        ..Default::default()
    };

    sdk.download(&mut out, &obj, opts).await?;
    ```

=== "Go"
    ```go
    info, err := os.Stat("output.bin")
    if err != nil {
        return fmt.Errorf("stat output file: %w", err)
    }
    resumeAt := uint64(info.Size())

    file, err := os.OpenFile("output.bin", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
    if err != nil {
        return fmt.Errorf("open output file: %w", err)
    }
    defer file.Close()

    if err := client.Download(
        ctx,
        file,
        obj,
        sdk.WithDownloadRange(resumeAt, obj.Size()-resumeAt),
    ); err != nil {
        return fmt.Errorf("resume download: %w", err)
    }
    ```

This pattern is especially useful for large files or unstable network connections. Measure how many bytes you already have, reopen the destination in append mode, and request only the remaining byte range.

#### Download to a file

Stream the decrypted bytes directly to disk:

=== "Python"
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

=== "Rust"
    ```rust
    use indexd::DownloadOptions;
    use tokio::fs::File;

    // Stream the object directly to disk
    let mut file = File::create("output.bin").await?;
    sdk.download(&mut file, &obj, DownloadOptions::default()).await?;

    // If you are downloading from a share URL instead, use the same file handle:
    //
    // let mut file = File::create("output.bin").await?;
    // sdk.download_shared_object(&mut file, &share_url, DownloadOptions::default()).await?;
    ```

=== "Go"
    ```go
    file, err := os.Create("output.bin")
    if err != nil {
        return fmt.Errorf("create output file: %w", err)
    }
    defer file.Close()

    // Stream the object directly to disk
    if err := client.Download(ctx, file, obj); err != nil {
        return fmt.Errorf("download object: %w", err)
    }

    // If you are downloading from a share URL instead, use the same file handle:
    //
    // file, err := os.Create("output.bin")
    // if err != nil {
    //     return fmt.Errorf("create output file: %w", err)
    // }
    // defer file.Close()
    //
    // if err := client.DownloadSharedObject(ctx, file, shareURL); err != nil {
    //     return fmt.Errorf("download shared object: %w", err)
    // }
    ```

This pattern is ideal for larger objects, since it avoids buffering the entire file in memory before writing it to disk.

## Next Step

Congratulations! This marks the end of our Sia Developer Quickstart guide. You now have the tools needed to start building your next decentralized application on Sia!