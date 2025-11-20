# **Download Data**

Downloading is the natural counterpart to uploading. Once an object has been uploaded and pinned in the indexer, your app can retrieve it securely from the Sia network. The SDK handles all of the complexity behind the scenes:

  * It locates the correct storage hosts through the indexer
  * Fetches the encrypted shards
  * Reassembles and decrypts the data locally
  * Streams it to your application in manageable chunks

This design allows you to download anything from tiny text files to multi-gigabyte media without loading the entire object into memory.

Before proceeding, ensure you have:

  * A connected and approved sdk instance
  * A PinnedObject returned from a successful upload (or retrieved via listing / shared link)

Once ready, you can begin streaming the object’s contents.

### Configure Options

`DownloadOptions { offset, length, max_inflight }`

### Download Flow

```plaintext
download = sdk.download(pinned_object, options)
while chunk := download.read_chunk():
    …
```

### Partial Downloads

Use `offset` and `length` to:

* Resume downloads
* Fetch byte ranges

### Code Example

=== "Python"
    ```python
    download = await sdk.download(pinned, DownloadOptions())

    data = bytearray()
    while True:
        chunk = await download.read_chunk()
        if not chunk:
            break
        data.extend(chunk)

    print(data.decode())
    ```
=== "Javascript"
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
[Share Objects →](../quickstart/share-objects.md){ .md-button }