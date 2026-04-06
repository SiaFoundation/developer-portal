---
title: Share an Object
description: Generate public, time-limited download URLs for Sia objects and download shared objects.
---

# Share an Object

Generate a time-limited URL that anyone can use to download an object.

> [!WARNING]
> **Share URLs are public links.** A share URL grants access to **anyone who has it**. There is no way to restrict it to specific users or revoke it once shared. Even after the URL expires, anyone who accessed it could have pinned the object into their own account.
>
> If you need permissioned sharing, build your own access layer on top of pinned objects.

## Generate a share URL

=== "Rust"
    ```rust
    use chrono::{Duration, Utc};

    let obj = sdk.object(&object_id).await?;

    let expires = Utc::now() + Duration::hours(1);
    let share_url = sdk.share_object(&obj, expires)?;

    println!("Share URL: {share_url}");
    ```
=== "Go"
    ```go
    expires := time.Now().Add(time.Hour)
    shareURL, err := client.CreateSharedObjectURL(ctx, objectID, expires)
    if err != nil {
        panic(err)
    }

    fmt.Println("Share URL:", shareURL)
    ```
=== "Python"
    ```python
    from datetime import datetime, timedelta, timezone

    obj = await sdk.object(object_id)

    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    share_url = sdk.share_object(obj, expires)

    print("Share URL:", share_url)
    ```

## Download from a share URL

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;
    use tokio::io::AsyncReadExt;

    let shared_obj = sdk.shared_object(share_url).await?;

    let (mut writer, mut reader) = tokio::io::duplex(64 * 1024);

    let download_fut = async {
        sdk.download(&mut writer, &shared_obj, DownloadOptions::default()).await?;
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
    if err := client.DownloadSharedObject(ctx, &buf, shareURL); err != nil {
        panic(err)
    }

    fmt.Println("Downloaded:", buf.String())
    ```
=== "Python"
    ```python
    from io import BytesIO

    shared_obj = await sdk.shared_object(share_url)

    buffer = BytesIO()
    await sdk.download(buffer, shared_obj, DownloadOptions())

    print("Downloaded:", buffer.getvalue().decode())
    ```
