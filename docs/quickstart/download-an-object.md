---
title: Download an Object
description: Download a pinned object from the Sia network by Object ID.
---

# Download an Object

Once your application has uploaded an object to Sia, downloading is straightforward. The SDK handles all network coordination: locating slabs, downloading encrypted shards, verifying them, and decrypting your data locally.

Downloads return a reader that streams decrypted bytes as they arrive. Copy the reader into any destination — an in-memory buffer, a file, or another writable sink — so you can pull small objects fully into memory or stream large ones straight to disk.

## Prerequisites

Before proceeding, ensure you have:

  * An [App Key](./connect-to-an-indexer.md) returned from a successful connection to an indexer.
  * An [Object ID](./upload-an-object.md) from an object pinned to your account.

Once ready, you can download the object into memory, into a file, or into another writable destination supported by your SDK.

## Example

=== "Rust"
    ```rust
    use sia_storage::{app_id, AppKey, AppMetadata, Builder, DownloadOptions, Hash256};
    use std::io::{self, Write};
    use std::str::FromStr;

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

        // Ask the user for the Object ID to download
        print!("Enter the Object ID to download: ");
        io::stdout().flush()?;
        let mut object_id = String::new();
        io::stdin().read_line(&mut object_id)?;
        let object_id = Hash256::from_str(object_id.trim())?;

        // Look up the object from the indexer
        let obj = sdk.object(&object_id).await?;

        // Download the object into memory
        let mut reader = sdk.download(&obj, DownloadOptions::default())?;
        let mut bytes = Vec::new();
        tokio::io::copy(&mut reader, &mut bytes).await?;

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
        "go.sia.tech/siastorage"
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
        builder := siastorage.NewBuilder(indexerURL, siastorage.AppMetadata{
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

        // Ask the user for the Object ID to download.
        fmt.Print("Enter the Object ID to download: ")
        objectIDText, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        objectIDText = strings.TrimSpace(objectIDText)

        var objectID types.Hash256
        if err := objectID.UnmarshalText([]byte(objectIDText)); err != nil {
            panic(err)
        }

        // Look up the object from the indexer.
        obj, err := client.Object(ctx, objectID)
        if err != nil {
            panic(err)
        }

        // Download the object into an in-memory buffer.
        var buf bytes.Buffer
        if err := client.Download(ctx, &buf, obj); err != nil {
            panic(err)
        }

        fmt.Println("\nObject downloaded!")
        fmt.Println(" - Contents:", buf.String())
    }
    ```
=== "Python"
    ```python
    import asyncio

    from sia_storage import (
        Builder,
        AppMeta,
        AppKey,
        DownloadOptions,
    )

    async def main():
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

        object_id = input("\nEnter the Object ID to download: ").strip()

        # Look up the object from the indexer
        obj = await sdk.object(object_id)

        # Download returns an async handle; read it into memory
        async with sdk.download(obj, DownloadOptions()) as d:
            data = await d.read_all()

        print("\nObject downloaded!")
        print(" - Contents:", data.decode())

    asyncio.run(main())
    ```
