# Share Objects

Sharing allows you to grant others secure, time-limited access to an object you’ve uploaded. Instead of exposing keys or credentials, the SDK generates a cryptographically signed URL that:

  * Identifies the object you want to share
  * Embeds an expiration timestamp
  * Ensures the link cannot be forged or extended
  * Allows the recipient to download the object without needing your app key
  * Can optionally be “pinned” by the recipient to save it to their own indexer

This enables simple one-click sharing workflows—similar to traditional cloud storage—while preserving Sia’s decentralized, encrypted-by-default architecture.

Before you begin, you should have:

  * A [connected and approved](./connecting-to-an-indexer.md) sdk instance
  * A `PinnedObject` returned from a [successful upload](./upload-data.md).

Once you have the object, you can generate a share URL and let another app or device resolve and download it.

## Code Example

=== "Python"
    ```python
    import time

    expires = time.time() + 3600
    url = await sdk.share_object(pinned, expires)

    shared = await sdk.shared_object(url)
    download = await sdk.download_shared(shared, DownloadOptions())
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