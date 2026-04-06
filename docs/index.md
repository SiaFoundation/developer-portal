# Sia Developer Portal

Sia is a decentralized storage network where all data is encrypted client-side, erasure-coded into redundant shards, and distributed across independent storage providers worldwide. An indexer coordinates uploads, downloads, and object management without ever seeing your data.

## Install the SDK

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```sh
    cargo add sia_storage
    ```
=== "Go"
    ```sh
    go get go.sia.tech/indexd/sdk@latest
    ```
=== "Python"
    ```sh
    pip install sia-storage
    ```

## Create App Metadata

Every app needs a unique 32-byte App ID and a set of metadata fields that identify it to the indexer. Generate the App ID once and hardcode it — changing it would change your users' derived keys and lose access to their data.

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::{app_id, AppMetadata, Builder};

    const INDEXER_URL: &str = "https://sia.storage";

    const APP_META: AppMetadata = AppMetadata {
        id: app_id!("0000000000000000000000000000000000000000000000000000000000000000"),
        name: "My App",
        description: "Demo application",
        service_url: "https://example.com",
        logo_url: None,
        callback_url: None,
    };

    let builder = Builder::new(INDEXER_URL, APP_META)?;
    ```
=== "Go"
    ```go
    import (
        "go.sia.tech/core/types"
        "go.sia.tech/indexd/sdk"
    )

    const indexerURL = "https://sia.storage"
    const appIDHex = "0000000000000000000000000000000000000000000000000000000000000000"

    var appID = func() (id types.Hash256) {
        if err := id.UnmarshalText([]byte(appIDHex)); err != nil {
            panic(err)
        }
        return
    }()

    builder := sdk.NewBuilder(indexerURL, sdk.AppMetadata{
        ID:          appID,
        Name:        "My App",
        Description: "Demo application",
        ServiceURL:  "https://example.com",
    })
    ```
=== "Python"
    ```python
    from sia_storage import Builder, AppMeta

    meta = AppMeta(
        id=b"your-32-byte-app-id.............",
        name="My App",
        description="Demo application",
        service_url="https://example.com",
        logo_url=None,
        callback_url=None,
    )

    builder = Builder("https://sia.storage", meta)
    ```

## Connect

Don't have an App Key yet? See [Connect to an Indexer](quickstart/connect-to-an-indexer.md).

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::AppKey;

    let app_key = AppKey::import(seed);
    let sdk = builder.connected(&app_key).await?.expect("invalid App Key");
    ```
=== "Go"
    ```go
    client, err := builder.SDK(appKey)
    ```
=== "Python"
    ```python
    from sia_storage import AppKey

    app_key = AppKey(seed)
    sdk = await builder.connected(app_key)
    ```

## Upload and Pin

Upload reads from any stream source, erasure-codes the data, and distributes encrypted shards across the network. Pinning persists the object record in the indexer so it becomes listable, syncable, and eligible for repair.

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::UploadOptions;

    let reader = std::io::Cursor::new(b"hello, world!".to_vec());
    let obj = sdk.upload(reader, UploadOptions::default()).await?;
    sdk.pin_object(&obj).await?;
    println!("Object ID: {}", obj.id());
    ```
=== "Go"
    ```go
    obj := sdk.NewEmptyObject()
    if err := client.Upload(ctx, &obj, strings.NewReader("hello, world!")); err != nil {
        panic(err)
    }
    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    fmt.Println("Object ID:", obj.ID())
    ```
=== "Python"
    ```python
    from io import BytesIO
    from sia_storage import UploadOptions

    obj = await sdk.upload(BytesIO(b"hello, world!"), UploadOptions())
    await sdk.pin_object(obj)
    print("Object ID:", obj.id())
    ```

## Download

Download locates the object's shards, retrieves them from storage providers, verifies integrity, and decrypts the data locally. The decrypted bytes stream into any writable destination.

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;
    use tokio::io::AsyncReadExt;

    let (mut writer, mut reader) = tokio::io::duplex(64 * 1024);

    let download_fut = async {
        sdk.download(&mut writer, &obj, DownloadOptions::default()).await?;
        drop(writer);
        Ok::<(), Box<dyn std::error::Error>>(())
    };

    let read_fut = async {
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).await?;
        Ok::<Vec<u8>, Box<dyn std::error::Error>>(bytes)
    };

    let (_, bytes) = tokio::try_join!(download_fut, read_fut)?;
    println!("Downloaded: {}", String::from_utf8_lossy(&bytes));
    ```
=== "Go"
    ```go
    var buf bytes.Buffer
    if err := client.Download(ctx, &buf, obj); err != nil {
        panic(err)
    }
    fmt.Println("Downloaded:", buf.String())
    ```
=== "Python"
    ```python
    from io import BytesIO
    from sia_storage import DownloadOptions

    buffer = BytesIO()
    await sdk.download(buffer, obj, DownloadOptions())
    print("Downloaded:", buffer.getvalue().decode())
    ```

## Next Steps

Need an App Key? Start with [Connect to an Indexer →](quickstart/connect-to-an-indexer.md){ .md-button }

Or dive into the individual guides:

* [Upload an Object](quickstart/upload-an-object.md) — upload, pin, and manage objects
* [Download an Object](quickstart/download-an-object.md) — ranged downloads, resume, streaming to disk
* [Recipes](recipes/index.md) — packing, file streaming, sharing, metadata, and more
