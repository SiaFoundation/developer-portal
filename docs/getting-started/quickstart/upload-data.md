# Upload Data

Uploading data is the core action your app will perform on the Sia network. When you upload a file through the SDK, the process is secure by design:

  * Your data is encrypted client-side before leaving the device.
  * It is then erasure-coded into multiple redundant shards.
  * Those shards are distributed across independent Sia storage providers around the world.
  * The indexer stores encrypted metadata and helps coordinate uploads, downloads, and object management.

This means that even if some hosts go offline—or malicious parties intercept your data—your content remains private, durable, and recoverable.

Before continuing, make sure you have [connected to an indexer and initialized the SDK](./connecting-to-an-indexer.md).

Once the connection process is complete, you’re ready to upload your first object.

### Code Example

=== "Python"
    ```python
    options = UploadOptions(
        metadata=b'{"name":"hello.txt"}'
    )

    upload = await sdk.upload(options)
    await upload.write(b"hello world")
    pinned = await upload.finalize()

    print("Uploaded object:", pinned.key)
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

### Upload Options

`UploadOptions` fields:

* `data_shards`
* `parity_shards`
* `metadata` (bytes; JSON recommended)
* `max_inflight`
* `progress_callback` (optional)

### Progress Callback

You can track:

* Bytes encoded so far
* Total expected bytes

## Next Step
[Download Data →](download-data.md){ .md-button }