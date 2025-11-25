# Connecting to an Indexer

Before your app can upload, download, or share data on Sia, it must first establish a secure identity and connect to an indexer. An indexer acts as your application’s gateway to the Sia network. It handles:

  * Authentication (verifying your app key)
  * Authorization (ensuring the user approves your app)
  * Metadata tracking (storing references to pinned objects)
  * Host coordination (telling the SDK which storage providers to use)

All requests your app makes—uploads, downloads, listings—go through the indexer.

Connecting your app involves three steps:

  1. Create an App Key
    A deterministic keypair derived from a recovery phrase + App ID.
    This is your app’s identity.
  2. Initialize the SDK
    Bind your App Key to the indexer you want to use.
  3. Request User Approval (first run only)
    The indexer provides a URL the user must visit to approve your app.
    After approval, the SDK can connect silently on subsequent launches.

Once these steps are complete, your application is authorized and can begin interacting with the network.

## Create an App Key

Before your app can connect to an indexer, it needs an App Key—a deterministic cryptographic identity derived from:

* A BIP-39 recovery phrase
* Your app’s 32-byte App ID

The SDK provides three helpers to make this easy and reliable:

* **`generate_recovery_phrase()`**

    Creates a new human-readable BIP-39 phrase (e.g., “word1 word2 …”).
    Use this when generating a new application identity. It gives your app (or user) a portable and safe way to back up or restore its identity.

* **`validate_recovery_phrase()`**

    Checks whether a given phrase is a valid BIP-39 seed (correct words, checksum, etc.).
    Use this when restoring an app and you want to catch typos or invalid phrases before deriving a key.

* **`AppKey(phrase, app_id)`**

    Derives the actual app keypair from the provided phrase and App ID.
    Use this whenever you need to initialize the SDK or re-derive an existing identity.

Because derivation is deterministic, the same phrase + App ID always produces the same App Key. This allows identity sync across devices or reinstalls.

### When to Use Each Helper

| Scenario                       | What You Do                                         | Functions Used                                |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------- |
| **First app launch**           | Create a brand-new identity                         | `generate_recovery_phrase()`, then `AppKey()` |
| **User onboarding**            | Display or store a backup phrase                    | `generate_recovery_phrase()`                  |
| **Restore on new device**      | User enters phrase → validate → derive the same key | `validate_recovery_phrase()`, then `AppKey()` |
| **Automated / headless setup** | Load stored phrase → derive key silently            | `AppKey()`                                    |

### Code Example

=== "Python"
    ```python
    from indexd_ffi import generate_recovery_phrase, AppKey, AppMeta, Sdk, UploadOptions

    phrase = generate_recovery_phrase()
    app_id = b"your-32-byte-app-id................"

    key = AppKey(phrase, app_id)
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

## Initialize the SDK

Next, bind your app key to an indexer. This creates an authenticated SDK instance but does **not** confirm whether your app is approved yet.

### Code Example

=== "Python"
    ```python
    sdk = Sdk("https://app.sia.storage", key)
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

## Check Connection & Request Approval

The first time an app attempts to connect, the user must approve it. After approval, the SDK auto-reconnects on future runs.

### Check if the App Is Already Approved

```plaintext
await sdk.connected()
```

If `true`, skip to Uploading.

### Request User Approval

If not approved:

```plaintext
sdk.request_app_connection(AppMeta { name, description, ... })
```

`AppMeta` fields:

* `name`
* `description`
* `service_url`
* `logo_url` (optional)
* `callback_url` (optional)

The indexer returns a **response URL**, which must be opened by the user to approve the app.

### Wait for Approval

```plaintext
sdk.wait_for_connect(resp)
```

Returns:

* `true` → approved
* `false` → explicitly rejected
* Error → timeout or network failure

### Code Example

=== "Python"
    ```python
    if not await sdk.connected():
        meta = AppMeta(
            name="My App",
            description="Demo application",
            service_url="https://example.com"
        )

        resp = await sdk.request_app_connection(meta)
        print("Open this URL to approve:", resp.response_url)

        ok = await sdk.wait_for_connect(resp)
        if not ok:
            raise Exception("User rejected the app")
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

## Next Step
[Upload Data →](upload-data.md){ .md-button }