# Upload an Object

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is made secure by design:

  * All data is encrypted client-side by the user before it leaves the device.
  * Data is erasure-coded into multiple redundant shards.
  * Each shard is uploaded to independent storage providers located [across the globe](https://siascan.com/map).
  * The indexer stores ***only*** encrypted metadata and helps coordinate uploads, downloads, and object management.

This means that even if some hosts go offline—or a malicious actor attempts to intercept user data—all data will remain private and recoverable.

## Prerequisites

Before continuing, make sure you have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance

Once you have established a successful connection, you’re ready to upload your first object.

## Authentication Requirements

Uploading data requires the use of the same App Key created when connecting to an indexer.

The App Key serves two critical roles during an upload:

* **Authenticating requests**  
:   Every upload and pin operation must be signed with the App Key’s private key.  
    The indexer verifies these signatures using the public key registered during onboarding.  
    This ensures your app is authorized to create or modify the user’s objects.

* **Protecting the user’s data**  
:   Keys derived from the App Key are used to seal objects before they are sent.  
    This ensures the indexer cannot read, tamper with, or alter the contents of the user's upload.

## High-Level Concepts

Before we look at code, here’s what happens when you upload:

#### Object
:   Your data plus encrypted metadata. Once uploaded, it becomes a `PinnedObject` managed by the indexer.

#### Metadata
:   Small, encrypted bytes attached to each object (commonly JSON).  
    Example: file name, MIME type, or application-specific tags.

#### Streaming upload
:   You write bytes into an upload “writer,” and the SDK handles chunking, encryption, redundancy, and communication with hosts.

#### Progress callback
:   An optional callback that receives:

    * `uploaded` so far  
    * `encoded_size` expected 

    Useful for showing progress bars or logs.

## Example

=== "Python"
    ```python
    import asyncio
    import json

    from indexd_ffi import (
        generate_recovery_phrase,
        AppKey,
        AppMeta,
        Sdk,
        UploadOptions,
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
                callback_url=None
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
            progress_callback=PrintProgress()
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
#### Objects & Metadata

Each successful upload creates a `PinnedObject` in the indexer:

* The object key uniquely identifies the object.
* The metadata is encrypted alongside your data.
* The indexer stores the key, metadata, timestamps, and layout of slabs used to store the data.

#### Streaming vs Single-Write

In the example, we wrote the entire payload in one call:

```python
await upload.write(b"hello world")
```

In a real app, especially with large files, you will typically:

* Read from a file or stream in chunks.
* Call `upload.write(chunk)` repeatedly until all bytes are written.
* Finally, call `upload.finalize()` to complete the upload and get the pinned object.

#### Progress Callback

The `progress_callback` runs while data is being uploaded:

* It receives `uploaded` and `encoded_size` in bytes.
* It may be called multiple times as data is sent.
* It’s safe to:
    * Update a progress bar
    * Log percentages
    * Trigger UI updates

## Common Practices

#### Upload from a file

Open a file and `read()` chunks in a loop, writing each chunk to `upload.write(...)`.

#### Custom metadata

Store original filename, MIME type, user ID, or application-specific tags.

#### Real progress bars

Instead of printing percentages, integrate `progress_callback` with a CLI or GUI progress bar.

## Next Step
[Share an Object →](./share-an-object.md){ .md-button }