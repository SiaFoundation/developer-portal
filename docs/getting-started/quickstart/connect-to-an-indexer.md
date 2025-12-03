# Connect to an Indexer

Before your app can upload, download, or share data with Sia, it must first connect to an indexer. An indexer acts as your application’s gateway to the Sia network. It handles:

  * **Authentication** - Verifying your app key.
  * **Authorization** - Ensuring the user approves your app.
  * **Metadata tracking** - Storing references to pinned objects.
  * **Host coordination** - Telling the SDK which storage providers to use.

## Prerequisites

In order for your app to establish a connection to an indexer, you will need:

* [**A valid indexer URL**](../README.md#indexer-url)
* [**A 32-byte App ID**](../README.md#app-id)
* [**The Sia SDK**](../README.md#sia-sdk)

## Authentication Requirements

Each new instance of your app will require a unique App Key which is deterministically derived from:

* **A BIP-39 recovery phrase**
* **Your 32-byte App ID**

The resulting App Key is a public/private key pair. The public key is registered with the indexer during onboarding, while the private key should be stored securely by the app.

!!! warning
    **The BIP-39 recovery phrase should be treated as the user's master key.**

    * It should be randomly generated and stored securely by the user, not by the application.
    * It is never sent to the server and should only be used once during onboarding to derive the user's App Key.

## Example

=== "Python"
    ```python
    import asyncio
    from indexd_ffi import (
        generate_recovery_phrase,
        AppKey,
        AppMeta,
        Sdk,
    )

    async def main():
        # 1. Create an app key
        seed_phrase = generate_recovery_phrase()
        app_id = b"your-32-byte-app-id............."
        app_key = AppKey(seed_phrase, app_id)

        # 2. Initialize the SDK
        sdk = Sdk("https://app.sia.storage", app_key)

        # 3. Connect / request approval
        if not await sdk.connected():
            meta = AppMeta(
                name="My App",
                description="Demo application",
                service_url="https://example.com",
                logo_url=None,
                callback_url=None
            )
            resp = await sdk.request_app_connection(meta)

            print("Open this URL to approve the app:", resp.response_url)

            approved = await sdk.wait_for_connect(resp)
            if not approved:
                raise Exception("User rejected the app")

        print("Connected!")

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

The indexer enforces a one-time authorization step so users must explicitly approve any app requesting access to their account.

After approval:

* The SDK reconnects silently on future launches

* No additional interaction is required

* The App Key becomes the app’s persistent identity

#### App Metadata

During `request_app_connection`, you provide:

* `name` — shown to users during approval

* `description` — what your app does

* `service_url` — the URL representing your app

* `logo_url` *(optional)* — shown in the UI

* `callback_url` *(optional)* — if your app needs web-based approval handling

#### Connection checks

`sdk.connected()` returns:

* `True` → already approved

* `False` → must request approval

#### Approval failures

Approval can fail if:

* The user explicitly rejects your app

* The request times out

* There is a network issue

## Next Step
[Upload an Object →](./upload-an-object.md){ .md-button }