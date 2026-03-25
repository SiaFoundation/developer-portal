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

  * An [App key](./connect-to-an-indexer.md) returned from successfull connection to an Indexer.
  * An [Object ID](./upload-an-object.md) returned from a successful upload.

Once you have the object, you can generate a share URL and let another app or device resolve and download it.

## Example

=== "Python"
    ```python
    import asyncio
    from datetime import datetime, timedelta, timezone

    from sia_storage_ffi import (
        uniffi_set_event_loop,
        Builder,
        AppMeta,
        AppKey,
    )

    async def main():
        # IMPORTANT: required for UniFFI async trait callbacks
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
        # SHARE AN OBJECT
        # -------------------------------------------------------

        object_id = input("\nEnter a previously uploaded object ID: ").strip()

        # Load the pinned object from the indexer
        obj = await sdk.object(object_id)

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
    use sia_storage::{app_id, AppMetadata, Builder, Hash256, PrivateKey};
    use std::io::{self, Write};
    use std::str::FromStr;

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
        rustls::crypto::ring::default_provider()
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
        // SHARE AN OBJECT
        //-------------------------------------------------------

        // Ask the user for the Object ID to share
        print!("Enter the Object ID to share: ");
        io::stdout().flush()?;
        let mut object_id = String::new();
        io::stdin().read_line(&mut object_id)?;
        let object_id = Hash256::from_str(object_id.trim())?;

        // Look up the object from the indexer
        let obj = sdk.object(&object_id).await?;

        // Generate a share URL that expires in 1 hour
        let expires = Utc::now() + Duration::hours(1);
        let share_url = sdk.share_object(&obj, expires)?;

        println!("\nShare URL: {share_url}");

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
        "time"

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
        // SHARE AN OBJECT
        //-------------------------------------------------------

        // Ask the user for an object ID from the previously uploaded object.
        fmt.Print("Enter the Object ID from the previously uploaded object: ")
        objectIDText, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        objectIDText = strings.TrimSpace(objectIDText)

        var objectID types.Hash256
        if err := objectID.UnmarshalText([]byte(objectIDText)); err != nil {
            panic(err)
        }

        // Create a share URL valid for 1 hour.
        expires := time.Now().Add(time.Hour)
        shareURL, err := client.CreateSharedObjectURL(ctx, objectID, expires)
        if err != nil {
            panic(err)
        }

        fmt.Println("\nShare URL:", shareURL)
    }
    ```
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