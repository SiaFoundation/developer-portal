# Upload Data

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is made secure by design:

  * All data is encrypted client-side by the user before it leaves the device.
  * Data is erasure-coded into multiple redundant shards.
  * Each shards is uploaded to an independent Sia storage provider distributing the data around the world.
  * The indexer stores ***only*** encrypted metadata and helps coordinate uploads, downloads, and object management.

This means that even if some hosts go offline—or a malicious actor attempts to intercept user data—all data will remain private and recoverable.

## Prerequisites

Before continuing, make sure you have [connected to an indexer and initialized the SDK](./connecting-to-an-indexer.md).

Once you have established a successful connection, you’re ready to upload your first object.

## Authentication Requirements

Uploading data to the indexer will require the the use of the same App Key created when connecting to an indexer.

The App Key serves two critical roles during an upload:

* **Authenticating requests**  
:   Every upload and pin operation must be signed with the App Key’s private key.  
    The indexer verifies these signatures using the public key registered during onboarding.  
    This ensures your app is authorized to create or modify the user’s objects.

* **Protecting the user’s data**  
:   Keys derived from the App Key are used to seal objects before they are sent.  
    This ensures the indexer cannot read, tamper with, or alter the contents of the user's upload.

### Code Example

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

## Next Step
[← Connecting to an Indexer](./connecting-to-an-indexer.md){ .md-button }
[Download Data →](./download-data.md){ .md-button }