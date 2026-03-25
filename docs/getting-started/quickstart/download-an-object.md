# Download an Object

Once your application has uploaded an object to Sia (or you’ve received a Share URL), downloading is straightforward. The SDK handles all network coordination: locating slabs, downloading encrypted shards, verifying them, and decrypting your data locally.

Downloads stream decrypted bytes into a writable destination. Depending on the SDK, that destination might be a custom `Writer`, an in-memory buffer, or a file handle. This makes it easy to download small objects into memory or stream large objects directly to disk.

## Prerequisites

Before proceeding, ensure you have:

  * An [App key](./connect-to-an-indexer.md) returned from successful connection to an Indexer.
  * A share URL returned from a [shared object](./share-an-object.md).

Once ready, you can download the object into memory, into a file, or into another writable destination supported by your SDK.

## Example

=== "Python"
    ```python
    import asyncio
    from io import BytesIO

    from sia_storage_ffi import (
        uniffi_set_event_loop,
        Builder,
        AppMeta,
        AppKey,
        DownloadOptions,
        Writer,
    )

    # Writer helper
    class BytesWriter(Writer):
        def __init__(self):
            self.buffer = BytesIO()

        async def write(self, data: bytes) -> None:
            if len(data) > 0:
                self.buffer.write(data)

        def get_data(self) -> bytes:
            return self.buffer.getvalue()


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
            callback_url=None,
        )

        # Create a builder to manage the connection flow
        builder = Builder("https://app.sia.storage", meta)

        # Ask the user for their App Key, exported from connect-to-an-indexer.py
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

        # -------------------------------------------------------
        # DOWNLOAD AN OBJECT
        # -------------------------------------------------------

        share_url = input("\nEnter an indexer share URL to download: ").strip()

        shared_obj = await sdk.shared_object(share_url)

        writer = BytesWriter()
        await sdk.download(writer, shared_obj, DownloadOptions())

        print("\nObject downloaded!")
        print(" - Contents:", writer.get_data().decode())

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use sia_storage::{app_id, AppMetadata, Builder, DownloadOptions, PrivateKey};
    use std::io::{self, Write};
    use tokio::io::AsyncReadExt;

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
        rustls::crypto::aws_lc_rs::default_provider()
            .install_default()
            .expect("failed to install rustls crypto provider");

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
        // DOWNLOAD AN OBJECT
        //-------------------------------------------------------

        // Ask the user for the share URL to download
        print!("Enter a share URL to download: ");
        io::stdout().flush()?;
        let mut share_url = String::new();
        io::stdin().read_line(&mut share_url)?;
        let share_url = share_url.trim().to_string();

        // Look up the shared object from the share URL
        let shared_obj = sdk.shared_object(share_url).await?;

        // Download the shared object into memory
        let (mut writer, mut reader) = tokio::io::duplex(64 * 1024);

        let download_fut = async {
            sdk.download(&mut writer, &shared_obj, DownloadOptions::default())
                .await?;
            drop(writer);
            Ok::<(), Box<dyn std::error::Error>>(())
        };

        let read_fut = async {
            let mut bytes = Vec::new();
            reader.read_to_end(&mut bytes).await?;
            Ok::<Vec<u8>, Box<dyn std::error::Error>>(bytes)
        };

        let (_, bytes) = tokio::try_join!(download_fut, read_fut)?;

        // Print the downloaded contents directly to the console
        println!("\nObject downloaded!");
        println!(" - Contents: {}", String::from_utf8_lossy(&bytes));

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
        // DOWNLOAD AN OBJECT
        //-------------------------------------------------------

        // Ask the user for the share URL generated by share-an-object.
        fmt.Print("Enter the share URL to download: ")
        shareURL, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        shareURL = strings.TrimSpace(shareURL)

        // Download the shared object into an in-memory buffer.
        var buf bytes.Buffer
        if err := client.DownloadSharedObject(ctx, &buf, shareURL); err != nil {
            panic(err)
        }

        fmt.Println("\nObject downloaded!")
        fmt.Println(" - Contents:", buf.String())
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

Handle these errors by surfacing a clear retry path to the user and, when appropriate, resuming from the last successfuly written byte range.

## Common Practices

#### Resuming a download

If you already have an object handle, resume by starting at the number of bytes you already have and appending into the same file:

=== "Python"
    ```python
    import os
    from sia_storage_ffi import Writer, DownloadOptions

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
    use sia_storage::DownloadOptions;

    let resume_at = tokio::fs::metadata("output.bin").await?.len();
    let mut out = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("output.bin")
        .await?;

    let opts = DownloadOptions {
        offset: resume_at,
        length: None,
        ..Default::default()
    };

    sdk.download(&mut out, &obj, opts).await?;
    ```

This pattern is especially useful for large files or unstable network connections. Measure how many bytes you already have, reopen the destination in append mode, and request only the remaining byte range.

#### Download to a file

Stream the decrypted bytes directly to disk:

=== "Python"
    ```python
    from sia_storage_ffi import Writer, DownloadOptions

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
    use sia_storage::DownloadOptions;
    use tokio::fs::File;

    // Stream the object directly to disk
    let mut file = File::create("output.bin").await?;
    sdk.download(&mut file, &obj, DownloadOptions::default()).await?;

    // If you are downloading from a share URL instead, use the same file handle:
    //
    // let shared_obj = sdk.shared_object(share_url).await?;
    // let mut file = File::create("output.bin").await?;
    // sdk.download(&mut file, &shared_obj, DownloadOptions::default()).await?;
    ```

This pattern is ideal for larger objects, since it avoids buffering the entire file in memory before writing it to disk.

## Next Step

Congratulations! This marks the end of our Sia Developer Quickstart guide. You now have the tools needed to start building your next decentralized application on Sia!