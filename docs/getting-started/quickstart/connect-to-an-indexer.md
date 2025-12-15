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
    * Your application should store `AppKey.export()` securely for future sessions.

## Example

=== "Python"
    ```python
    import asyncio

    from indexd_ffi import (
        generate_recovery_phrase,
        Builder,
        AppMeta,
        Sdk
    )

    async def main():
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
        await builder.request_connection(meta)
        print("Open this URL to approve the app:", builder.response_url())

        # Wait for the user to approve the request
        approved = await builder.wait_for_approval()
        if not approved:
            raise Exception("\nUser rejected the app or request timed out")

        # Ask the user for their recovery phrase
        recovery_phrase = input("\nEnter your recovery phrase (type `seed` to generate a new one): ").strip()

        if recovery_phrase == "seed":
            recovery_phrase = generate_recovery_phrase()
            print("\nRecovery phrase:", recovery_phrase)

        # Register an SDK instance with your recovery phrase.
        sdk: Sdk = await builder.register(recovery_phrase)

        # Export the App Key and store it securely for future launches
        app_key = sdk.app_key()
        print("\nStore this App Key in your app's secure storage:", app_key.export())

        print("\nApp Connected!")

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    *🚧 Coming soon*
=== "Go"
    *🚧 Coming soon*
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

* The user explicitly rejects your app
* The request times out
* There is a network issue

## Next Step
[Upload an Object →](./upload-an-object.md){ .md-button }