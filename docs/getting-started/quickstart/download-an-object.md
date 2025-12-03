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
        AppKey,
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
                callback_url=None,
            )
            resp = await sdk.request_app_connection(meta)

            print("Open this URL to approve the app:", resp.response_url)

            approved = await sdk.wait_for_connect(resp)
            if not approved:
                raise Exception("User rejected the app")

        print("Connected!")

        upload_options = UploadOptions(
            # Optional metadata can be attached that will be encrypted with the object's master key
            metadata=json.dumps({"File Name": "example.txt"}).encode(),

            # Progress callback is optional and can be used to monitor the progress of the upload
            progress_callback=PrintProgress(),
        )

        # 4. Upload the "Hello world!" data
        upload_writer = await sdk.upload(upload_options)
        await upload_writer.write(b"Hello world!")
        obj = await upload_writer.finalize()

        sealed = obj.seal(app_key)
        print("sealed:", sealed.id, sealed.signature)

        print("\nUpload complete!")
        print("Object ID:", obj.id())
        print("Size:", obj.size(), "bytes")

        # 5. Share the object (valid for 1 hour)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        share_url = sdk.share_object(obj, expires)

        print("\nShare URL:", share_url)

        # 6. Download the object
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
        print("Object Contents:", data.decode())

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