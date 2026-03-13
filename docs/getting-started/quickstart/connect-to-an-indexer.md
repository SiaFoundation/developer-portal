# Connect to an Indexer

Before your app can upload, download, or share data with Sia, it must first connect to an indexer. An indexer acts as your application’s gateway to the Sia network. It handles:

  * Verifying your app’s identity.
  * One-time approval flow.
  * Tracking your pinned objects and their metadata.
  * Coordination with storage providers on the network.

## Prerequisites

In order for your app to establish a connection to an indexer, you will need:

* [**A valid indexer URL**](../README.md#indexer-url)
* [**A 32-byte App ID**](../README.md#app-id)
* [**The Sia SDK**](../README.md#sia-sdk)

## Authentication Requirements

Each new instance of your app will require a unique App Key, which is deterministically derived from:

* **A BIP-39 recovery phrase**
* **Your 32-byte App ID**

The resulting App Key is a public/private key pair. The public key is registered with the indexer during onboarding, while the private key should be stored securely by the app.

!!! warning "**The BIP-39 recovery phrase should be treated as the user's master key.**"
    
    * The recovery phrase must **never** be stored by your application, but instead stored securely by the user.
    * It should be used only once during onboarding to derive the App Key. 
    * Your application should export and store the App Key securely for future sessions.

## Example

=== "Python"
    ```python
    import asyncio

    from indexd_ffi import (
        generate_recovery_phrase,
        uniffi_set_event_loop,
        Builder,
        AppMeta,
    )

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

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    ```rust
    use indexd::{app_client::RegisterAppRequest, Builder};
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
#### Why approval is required

The indexer enforces a one-time authorization step, so the user must explicitly grant your app access to their account.

After approval, the SDK can connect without user interaction using the stored app key.

#### App Metadata

During `request_connection`, you supply metadata that will be displayed during app approval:

* `id` — Your 32-byte App ID
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