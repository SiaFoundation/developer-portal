# Download an Object

Once your application has uploaded an object to Sia, or you have received a Share URL, downloading it is just as straightforward. The SDK handles all network coordination: locating slabs, downloading encrypted shards, verifying them, and decrypting your data locally. All you need to do is read chunks from the download stream.

This makes it possible to download anything—from small text files to multi-gigabyte objects—without loading the full content into memory.

## Prerequisites

Before proceeding, ensure you have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance
  * A `PinnedObject` returned from a [successful upload](./upload-an-object.md) or retrieved using a [share URL](./share-an-object.md)

Once ready, you can begin streaming the object’s contents.

## Authentication Requirements

Downloading data requires no additional authentication steps beyond the App Key created when connecting to an indexer.

The App Key plays two important roles during a download:

* **Authorizing access to encrypted objects**
:   The indexer verifies that the request is signed with the App Key’s private key.
    This confirms your app is permitted to retrieve and read the user’s objects.
    Only apps associated with the correct App Key can access the underlying object data.

* **Decrypting downloaded content**
:   Keys derived from the App Key are used to decrypt each object’s slabs and metadata after download.
    This ensures that even though storage hosts and the indexer handle encrypted shards,
    only your app can open and read the object’s contents.

## High-Level Overview

#### Streaming Downloads

Downloads are streamed in chunks. This allows your application to:

* Process data incrementally
* Download very large files
* Avoid loading the full object into memory

#### Chunk Reading

Once a download begins, you call:

```python
await download.read_chunk()
```

This yields data until an empty chunk signals the end of the stream.

#### Partial Downloads

You may download only part of an object using:

* `offset` — where to start
* `length` — how many bytes to read

This is useful for:

* Resume functionality
* Range requests
* Random-access reads

## Example

=== "Python"
    ```python
    import asyncio
    import json
    from datetime import datetime, timedelta, timezone

    from indexd_ffi import (
        generate_recovery_phrase,
        Builder,
        AppMeta,
        Sdk,
        UploadOptions,
        DownloadOptions,
    )

    # Progress callback is optional and can be used to monitor the progress of the upload
    class PrintProgress:
        def progress(self, uploaded: int, encoded_size: int) -> None:
            if encoded_size == 0:
                print("Starting upload…")
                return
            percent = (uploaded / encoded_size) * 100
            print(f"Upload progress: {percent:.1f}% ({uploaded}/{encoded_size} bytes)")

    async def main():
        #-------------------------------------------------------
        # CONNECT TO AN INDEXER
        #-------------------------------------------------------

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

        #-------------------------------------------------------
        # UPLOAD AN OBJECT
        #-------------------------------------------------------

        # Configure Upload Options
        upload_options = UploadOptions(
            # Optional metadata can be attached that will be encrypted with the object's master key
            metadata=json.dumps({"File Name": "example.txt"}).encode(),

            # Progress callback is optional and can be used to monitor the progress of the upload
            progress_callback=PrintProgress()
        )

        # Upload the "Hello world!" data
        print("\nStarting upload...")
        upload_writer = await sdk.upload(upload_options)
        await upload_writer.write(b"Hello world!")
        obj = await upload_writer.finalize()

        sealed = obj.seal(app_key)
        print("\nObject Sealed:")
        print(" - Sealed ID:", sealed.id)
        print(" - Signature:", sealed.signature)

        print("\nUpload complete:")
        print(" - Object ID:", obj.id())
        print(" - Size:", obj.size(), "bytes")

        #-------------------------------------------------------
        # SHARE AN OBJECT
        #-------------------------------------------------------

        # Share the object (valid for 1 hour)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        share_url = sdk.share_object(obj, expires)

        print("\nShare URL:", share_url)

        #-------------------------------------------------------
        # DOWNLOAD AN OBJECT
        #-------------------------------------------------------

        # Download the object
        #
        #    If you are downloading from a shared URL, you will first have to resolve
        #    the object from the share URL and download it like so.

        # shared_obj = await sdk.shared_object(share_url)
        # download = await sdk.download_shared(shared_obj, DownloadOptions())

        #    Or download the object directly like so.

        download = await sdk.download(obj, DownloadOptions())
        data = bytearray()

        while True:
            chunk = await download.read_chunk()
            if not chunk:
                break
            data.extend(chunk)

        print("\nObject downloaded!")
        print(" - Contents:", data.decode())

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

#### Download Options

`DownloadOptions` allows you to control:

| Option         | Description                                      |
| -------------- | ------------------------------------------------ |
| `offset`       | Starting byte for the download (default: `0`)    |
| `length`       | Number of bytes to read (default: entire object) |
| `max_inflight` | Number of parallel host requests                 |

#### Error Handling

Common cases include:

* Network interruptions
* Host timeouts
* Cancelled downloads (if you call `download.cancel()`)

All throw predictable `DownloadError` exceptions.

## Common Practices

#### Resuming a download

```python
options = DownloadOptions(offset=resume_at)
download = await sdk.download(pinned, options)
```

#### Download to a file

```python
with open("output.bin", "wb") as f:
    while chunk := await download.read_chunk():
        f.write(chunk)
```

## Next Step

Congratulations! This marks the end of our Sia Developer Quickstart guide. You now have the tools needed to start building your next decentralized application on Sia!