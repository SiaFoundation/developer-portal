# Connect to an Indexer

Before your app can upload, download, or share data with Sia, it must first connect to an indexer. An indexer acts as your application’s gateway to the Sia network. It handles:

  * Verifying your app’s identity.
  * One-time approval flow.
  * Tracking your pinned objects and their metadata.
  * Coordination with storage providers on the network.

## Prerequisites

In order for your app to establish a connection to an indexer, you will need:

* [**A valid indexer URL**](../README.md#indexer-url)
* [**A unique 32-byte App ID (Generated once and persists forever)**](../README.md#app-id)
* [**The Sia SDK**](../README.md#sia-sdk)

## Authentication Requirements

Each new instance of your app will require a unique App Key, which is deterministically derived from:

* **A BIP-39 recovery phrase**
* [**A unique 32-byte App ID (Generated once and persists forever)**](../README.md#app-id)

The resulting App Key is a public/private key pair. The public key is registered with the indexer during onboarding, while the private key should be stored securely by the app.

!!! warning "**The BIP-39 recovery phrase should be treated as the user's master key.**"
    
    * The recovery phrase must **never** be stored by your application, but instead stored securely by the user.
    * It should be used only once during onboarding to derive the App Key. 
    * Your application should export and store the App Key securely for future sessions.

## Example

=== "Python"
    ```python
    import asyncio

    from sia_storage import (
        generate_recovery_phrase,
        Builder,
        AppMeta,
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
        print("\nStore this App Key in your app's secure storage:", app_key.export().hex())

        print("\nApp Connected!")

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use sia_storage::{app_id, generate_recovery_phrase, AppMetadata, Builder};
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
        // Create a builder to manage the connection flow
        let builder = Builder::new(INDEXER_URL, APP_META)?;

        // Request app connection and get the approval URL
        let builder = builder.request_connection().await?;
        println!("Open this URL to approve the app: {}", builder.response_url());

        // Wait for the user to approve the request
        let builder = builder.wait_for_approval().await?;

        // Ask the user for their recovery phrase
        print!("Enter your recovery phrase (type `seed` to generate a new one): ");
        io::stdout().flush()?;
        let mut recovery_phrase = String::new();
        io::stdin().read_line(&mut recovery_phrase)?;
        let mut recovery_phrase = recovery_phrase.trim().to_string();

        if recovery_phrase == "seed" {
            recovery_phrase = generate_recovery_phrase();
            println!("\nRecovery phrase:\n{recovery_phrase}\n");
        }

        // Register an SDK instance with your recovery phrase
        let sdk = builder.register(&recovery_phrase).await?;

        // Export the App Key seed (32 bytes) and store it securely for future launches
        let mut app_key_seed = [0u8; 32];
        app_key_seed.copy_from_slice(&sdk.app_key().as_ref()[..32]);

        println!("\nApp Connected!");
        println!("App Key (hex): {}", hex::encode(app_key_seed));

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

        // Create a builder to manage the connection flow.
        builder := sdk.NewBuilder(indexerURL, sdk.AppMetadata{
            ID:          appID,
            Name:        "My App",
            Description: "Demo application",
            ServiceURL:  "https://example.com",
        })

        // Request app connection and get the approval URL.
        responseURL, err := builder.RequestConnection(ctx)
        if err != nil {
            panic(err)
        }
        fmt.Println("Open this URL to approve the app:", responseURL)

        // Wait for the user to approve the request.
        approved, err := builder.WaitForApproval(ctx)
        if err != nil {
            panic(err)
        }
        if !approved {
            panic("app connection was rejected")
        }

        // Ask the user for their recovery phrase.
        fmt.Print("Enter your recovery phrase (type `seed` to generate a new one): ")
        recoveryPhrase, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        recoveryPhrase = strings.TrimSpace(recoveryPhrase)

        if recoveryPhrase == "seed" {
            recoveryPhrase = sdk.NewSeedPhrase()
            fmt.Printf("\nRecovery phrase:\n%s\n\n", recoveryPhrase)
        }

        // Register an SDK instance with your recovery phrase.
        client, err := builder.Register(ctx, recoveryPhrase)
        if err != nil {
            panic(err)
        }
        defer client.Close()

        // The App Key should be stored securely for future launches,
        // but we do not demonstrate app key storage here.
        appKeyHex := hex.EncodeToString(client.AppKey()[:32])

        fmt.Println("\nApp Connected!")
        fmt.Println("AppKey (save this securely):", appKeyHex)
    }
    ```
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*

## Deep Dive
#### Why approval is required

The indexer enforces a one-time authorization step, so the user must explicitly grant your app access to their account.

After approval, the SDK can connect without user interaction using the stored app key.

#### App Metadata

During `request_connection`, you supply metadata that will be displayed during app approval:

* `id` — A 32-byte App ID (Generated once and persists forever)
* `name` — Name of your application
* `description` — Explains the purpose of your app
* `service_url` — The URL representing your app
* `logo_url` *(optional)* — An icon shown to the user
* `callback_url` *(optional)* — Used if your approval flow involves redirects

#### Approval failures

Approval can fail if:

* The request expires before the user approves it
* The user declines the request (the indexer will not approve it)
* There is a network or connectivity issue while polling

## Next Step
[Upload an Object →](./upload-an-object.md){ .md-button }