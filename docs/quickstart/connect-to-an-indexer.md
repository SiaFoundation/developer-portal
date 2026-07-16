---
title: Connect a Storage Account
description: Connect your app to a user's storage account — get one-time approval from the user and derive the App Key your app uses from then on.
---

# Connect a Storage Account

Before your app can store or retrieve anything, it connects to the user's storage account. In Sia terms, this means connecting to an **indexer** — the service that verifies your app's identity and tracks the user's stored data.

The flow is short: your app requests a connection, the user approves it once, and the SDK derives an **App Key** — the credential your app stores and uses for every session after that.

## Prerequisites

* **An indexer URL** — The SDK can connect to any Sia indexer, whether your own or a third-party. We recommend `https://sia.storage`, a hosted indexer that requires no setup and includes a 50GB free tier to get started.
* **A unique 32-byte App ID** — Generate once per app and hardcode it. Changing it changes your users' derived keys and loses access to their data.
* **The Sia Storage SDK** — See [Install the SDK](index.md#install-the-sdk).

> [!WARNING]
> **The user's BIP-39 recovery phrase is their master key.**
>
> * The recovery phrase must **never** be stored by your application, but instead stored securely by the user.
> * It should be used only once during onboarding to derive the App Key.
> * Your application should export and store the App Key securely for future sessions.

## Example

=== "Rust"
    ```rust
    use sia_storage::{app_id, generate_recovery_phrase, AppKey, AppMetadata, Builder};
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

        // Export the App Key and store it securely for future launches
        let app_key = sdk.app_key().export();

        println!("\nApp Connected!");
        println!("App Key (hex): {}", hex::encode(app_key));

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
        "errors"
        "fmt"
        "os"
        "strings"
    
        "go.sia.tech/core/types"
        "go.sia.tech/siastorage"
    )
    
    const indexerURL = "https://sia.storage"
    
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
        builder := siastorage.NewBuilder(indexerURL, siastorage.AppMetadata{
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
        if err := builder.WaitForApproval(ctx); errors.Is(err, siastorage.ErrUserRejected) {
            panic("app connection was rejected")
        } else if err != nil {
            panic(err)
        }
    
        // Ask the user for their recovery phrase.
        fmt.Print("Enter your recovery phrase (type `seed` to generate a new one): ")
        recoveryPhrase, err := bufio.NewReader(os.Stdin).ReadString('\n')
        if err != nil {
            panic(err)
        }
        recoveryPhrase = strings.TrimSpace(recoveryPhrase)
    
        if recoveryPhrase == "seed" {
            recoveryPhrase = siastorage.NewSeedPhrase()
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
=== "Python"
    ```python
    import asyncio

    from sia_storage import (
        generate_recovery_phrase,
        Builder,
        AppMetadata,
    )

    async def main():
        # Configure your app identity details
        meta = AppMetadata(
            # Replace `appId` with your real 32-byte App ID (hex-encoded, 64 chars).
            # Generate this ONCE and keep it stable forever for your app.
            id=b"your-32-byte-app-id.............",
            name="My App",
            description="Demo application",
            service_url="https://example.com",
            logo_url=None,
            callback_url=None
        )

        # Create a builder to manage the connection flow
        builder = Builder("https://sia.storage", meta)

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
=== "Dart"
    ```dart
    import 'dart:io';
    import 'dart:typed_data';
    import 'package:convert/convert.dart';
    import 'package:sia_storage/sia_storage.dart';

    // Replace with your real 32-byte App ID (hex-encoded, 64 chars).
    // Generate this ONCE and keep it stable forever for your app.
    const appIdHex =
        '0000000000000000000000000000000000000000000000000000000000000000';

    Future<void> main() async {
      final appMeta = AppMetadata(
        id: Uint8List.fromList(hex.decode(appIdHex)),
        name: 'My App',
        description: 'Demo application',
        serviceUrl: 'https://example.com',
      );

      // Create a builder to manage the connection flow
      final builder = await Sia.builder(
        indexerUrl: 'https://sia.storage',
        appMeta: appMeta,
      );

      // Request app connection and get the approval URL
      await builder.requestConnection();
      print('Open this URL to approve the app: ${builder.responseUrl()}');

      // Wait for the user to approve the request
      await builder.waitForApproval();

      // Ask the user for their recovery phrase
      stdout.write(
        '\nEnter your recovery phrase (type `seed` to generate a new one): ',
      );
      var phrase = stdin.readLineSync()?.trim() ?? '';

      if (phrase == 'seed') {
        phrase = await Sia.generateRecoveryPhrase();
        print('\nRecovery phrase:\n$phrase\n');
      }

      // Register an SDK instance with your recovery phrase
      final sdk = await builder.register(mnemonic: phrase);

      // Export the App Key and store it securely for future launches
      final appKeyBytes = sdk.appKey().export_();
      final appKeyHex = hex.encode(appKeyBytes);

      print('\nApp Connected!');
      print('App Key (hex): $appKeyHex');

      Sia.dispose();
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    import { Builder, generateRecoveryPhrase, initSia } from '@siafoundation/sia-storage'
    import { createInterface } from 'node:readline/promises'
    import { stdin as input, stdout as output } from 'node:process'

    // Initialize the SDK (loads the WASM module in browser environments).
    await initSia()

    const appMeta = {
      // Replace `appId` with your real 32-byte App ID (hex-encoded, 64 chars).
      // Generate this ONCE and keep it stable forever for your app.
      id: Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
      name: 'My App',
      description: 'Demo application',
      serviceUrl: 'https://example.com',
    }

    const rl = createInterface({ input, output })

    // Create a builder to manage the connection flow
    const builder = new Builder('https://sia.storage', appMeta)

    // Request app connection and get the approval URL
    await builder.requestConnection()
    console.log('Open this URL to approve the app:', builder.responseUrl())

    // Wait for the user to approve the request
    await builder.waitForApproval()

    // Ask the user for their recovery phrase
    let phrase = (
      await rl.question('\nEnter your recovery phrase (type `seed` to generate a new one): ')
    ).trim()

    if (phrase === 'seed') {
      phrase = generateRecoveryPhrase()
      console.log('\nRecovery phrase:')
      console.log(phrase)
      console.log()
    }

    // Register an SDK instance with your recovery phrase
    const sdk = await builder.register(phrase)

    // Export the App Key and store it securely for future launches
    const appKeyBytes = sdk.appKey().export()
    const appKeyHex = Buffer.from(appKeyBytes).toString('hex')

    console.log('\nApp Connected!')
    console.log('App Key (hex):', appKeyHex)

    rl.close()
    ```
=== "JavaScript (Browser)"
    ```javascript
    import { Builder, generateRecoveryPhrase, initSia } from '@siafoundation/sia-storage'
 
    // Initialize the SDK (loads the WASM module).
    await initSia()
 
    const appMeta = {
      // Replace `appId` with your real 32-byte App ID (hex-encoded, 64 chars).
      // Generate this ONCE and keep it stable forever for your app.
      appId: '0000000000000000000000000000000000000000000000000000000000000000',
      name: 'My App',
      description: 'Demo application',
      serviceUrl: 'https://example.com',
    }
 
    // Create a builder to manage the connection flow
    const builder = new Builder('https://sia.storage', appMeta)
 
    // Request app connection and get the approval URL
    await builder.requestConnection()
    console.log('Open this URL to approve the app:', builder.responseUrl())
    window.open(builder.responseUrl(), '_blank')
 
    // Wait for the user to approve the request
    await builder.waitForApproval()
 
    // Ask the user for their recovery phrase
    let phrase = (
      prompt('Enter your recovery phrase (leave blank to generate a new one):') ?? ''
    ).trim()
 
    if (!phrase) {
      phrase = generateRecoveryPhrase()
      console.log('\nRecovery phrase (save this securely):')
      console.log(phrase)
    }
 
    // Register an SDK instance with your recovery phrase
    const sdk = await builder.register(phrase)
 
    // Export the App Key and store it securely for future visits
    const appKeyHex = sdk.appKey().export().toHex()
    localStorage.setItem('appKey', appKeyHex)
 
    console.log('\nApp Connected!')
    console.log('App Key (hex):', appKeyHex)
    ```

## Understand what happened

What each step of the flow did:

#### Your app's identity

Your app is identified by its App ID and the metadata you supplied during `request_connection`, which is displayed to the user during approval:

* `id` — A 32-byte App ID (Generated once and persists forever)
* `name` — Name of your application
* `description` — Explains the purpose of your app
* `service_url` — The URL representing your app
* `logo_url` *(optional)* — An icon shown to the user
* `callback_url` *(optional)* — Used if your approval flow involves redirects

See [Apps](../core-concepts/apps.md) for the full identity model.

#### Why approval is required

The indexer enforces a one-time authorization step, so the user must explicitly grant your app access to their account.

After approval, the SDK can connect without user interaction using the stored app key.

#### The recovery phrase and the App Key

The App Key is deterministically derived from two inputs: the user's **BIP-39 recovery phrase** and your app's **32-byte App ID**. It is a public/private key pair — the public key is registered with the indexer during onboarding, and the private key is what your app stores securely and signs requests with from then on.

Because the derivation is deterministic, a user who loses a device can re-derive the same App Key on a new one from their recovery phrase. And because the App ID is an input, different apps derive different keys — one app can never read another app's data, even for the same user.

#### What the indexer does

The indexer verifies your app's identity, manages the approval flow, tracks the user's pinned objects and their encrypted metadata, and coordinates with storage providers — all without ever seeing plaintext data. See [Indexers](../core-concepts/indexers.md) and the [Trust & Deployment Model](../core-concepts/trust-and-deployment.md) for what it can and cannot see.

#### Approval failures

Approval can fail if:

* The request expires before the user approves it
* The user declines the request (the indexer will not approve it)
* There is a network or connectivity issue while polling
