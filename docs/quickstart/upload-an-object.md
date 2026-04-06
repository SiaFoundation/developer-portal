---
title: Upload an Object
description: Upload and pin an object to the Sia network using the SDK.
---

# Upload an Object

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is made secure by design:

  * All data is encrypted client-side before it leaves the device.
  * Data is erasure-coded into multiple redundant shards.
  * Each shard is uploaded to independent storage providers located [across the globe](https://siascan.com/map).
  * The indexer stores encrypted object records and coordinates uploads, downloads, and object management. It never sees plaintext data.

Encryption keeps data private even if intercepted. Erasure coding keeps it recoverable even if some hosts go offline.

## Prerequisites

Before continuing, make sure you have:

  * An [App Key](./connect-to-an-indexer.md) returned from a successful connection to an indexer.

Once you have established a successful connection, you’re ready to upload your first object.

## Example

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::{app_id, AppKey, AppMetadata, Builder, Object, UploadOptions};
    use std::io::{self, Write};

    const INDEXER_URL: &str = "https://sia.storage";

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
        let app_key = AppKey::import(seed);

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

        // Upload "Hello world!" from an in-memory reader
        let reader = std::io::Cursor::new(b"Hello world!");
        println!("\nStarting upload...");
        let obj = Object::default();
        let obj = sdk.upload(obj, reader, UploadOptions::default()).await?;

        // Pin the object — without this, the upload is not persisted
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

    const indexerURL = "https://sia.storage"

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

        // Upload "Hello world!" from an in-memory reader.
        fmt.Println("\nStarting upload...")

        obj := sdk.NewEmptyObject()
        if err := client.Upload(ctx, &obj, strings.NewReader("Hello world!")); err != nil {
            panic(err)
        }

        // Pin the object — without this, the upload is not persisted.
        if err := client.PinObject(ctx, obj); err != nil {
            panic(err)
        }

        fmt.Println("\nUpload complete:")
        fmt.Println(" - Size:", obj.Size(), "bytes")
        fmt.Println(" - Object ID:", obj.ID())
    }
    ```
=== "Python"
    ```python
    import asyncio
    from io import BytesIO

    from sia_storage import (
        Builder,
        AppMeta,
        AppKey,
        UploadOptions,
    )

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
        builder = Builder("https://sia.storage", meta)

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

        # Upload "Hello world!"
        print("\nStarting upload...")
        reader = BytesIO(b"Hello world!")
        obj = await sdk.upload(reader, UploadOptions())

        # Pin the object — without this, the upload is not persisted
        await sdk.pin_object(obj)

        print("\nUpload complete:")
        print(" - Size:", obj.size(), "bytes")
        print(" - Object ID:", obj.id())

    asyncio.run(main())
    ```

## Deep Dive
#### Objects & Metadata

Uploading returns an object handle you can work with immediately (for example, to pin it, share it, or download it later).

In this quickstart flow, **upload and pin are separate steps**:

* **Upload** sends shards to storage providers and builds the object’s layout.
* **Pinning** persists the sealed object record in the indexer and pins the underlying slabs so the object becomes listable, syncable, and eligible for repair.

The Object ID comes from the object’s slab layout, so you can read it directly after upload. Pinning encrypts and signs the object (a process called *sealing*) before sending it to the indexer — you don’t need to seal manually. See [Pinning](../core-concepts/pinning.md) and [Objects](../core-concepts/objects.md) for more.

Metadata is **application-defined** and **encrypted**. See the [Object Metadata](../recipes/object-metadata.md) recipe for details.

## Next Step
[Download an Object →](./download-an-object.md)