---
title: Share an Object
description: Generate public, time-limited download URLs for Sia objects and download shared objects.
---

# Share an Object

Generate a time-limited URL that anyone can use to download an [object](../core-concepts/objects.md).

> [!WARNING]
> **Share URLs are public links.** A share URL grants access to **anyone who has it**. There is no way to restrict it to specific users or revoke it once shared. Even after the URL expires, anyone who accessed it could have [pinned](../core-concepts/pinning.md) the object into their own account.
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
=== "JavaScript"
    ```javascript
    const obj = await sdk.object(objectId)

    const expires = new Date(Date.now() + 60 * 60 * 1000)
    const shareUrl = sdk.shareObject(obj, expires)

    console.log('Share URL:', shareUrl)
    ```

## Download from a share URL

=== "Rust"
    ```rust
    use sia_storage::DownloadOptions;

    let shared_obj = sdk.shared_object(share_url).await?;

    let mut reader = sdk.download(&shared_obj, DownloadOptions::default())?;
    let mut bytes = Vec::new();
    tokio::io::copy(&mut reader, &mut bytes).await?;
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
    shared_obj = await sdk.shared_object(share_url)

    async with sdk.download(shared_obj) as d:
        buffer = await d.read_all()

    print("Downloaded:", buffer.decode())
    ```
=== "JavaScript"
    ```javascript
    const sharedObj = await sdk.sharedObject(shareUrl)

    const stream = sdk.download(sharedObj)
    const text = await new Response(stream).text()
    console.log('Downloaded:', text)
    ```