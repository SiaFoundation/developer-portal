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

A malformed share URL is rejected before any network call: the SDK validates that the URL's encryption-key fragment is base64url-encoded and decodes to exactly 32 bytes, so a corrupted or hand-edited link fails immediately with a clear error instead of silently downloading garbage.

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
=== "Dart"
    ```dart
    import 'package:sia_storage/sia_storage.dart';

    final obj = await sdk.object(key: objectId);

    final expires = DateTime.now().add(const Duration(hours: 1));
    final shareUrl = sdk.shareObject(object: obj, validUntil: expires);

    print('Share URL: $shareUrl');
    ```
=== "JavaScript (Node)"
    ```javascript
    const obj = await sdk.object(objectId)

    const expires = new Date(Date.now() + 60 * 60 * 1000)
    const shareUrl = sdk.shareObject(obj, expires)

    console.log('Share URL:', shareUrl)
    ```
=== "JavaScript (Browser)"
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
    rc, err := client.DownloadSharedObject(ctx, shareURL)
    if err != nil {
        panic(err)
    }
    defer rc.Close()

    var buf bytes.Buffer
    if _, err := io.Copy(&buf, rc); err != nil {
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
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'dart:typed_data';
    import 'package:sia_storage/sia_storage.dart';

    final sharedObj = await sdk.sharedObject(sharedUrl: shareUrl);

    final dl = sdk.download(object: sharedObj);
    final buffer = <int>[];
    await for (final chunk in dl.data) {
      buffer.addAll(chunk);
    }
    print('Downloaded: ${utf8.decode(Uint8List.fromList(buffer))}');
    ```
=== "JavaScript (Node)"
    ```javascript
    const sharedObj = await sdk.sharedObject(shareUrl)

    const stream = sdk.download(sharedObj)
    const text = await new Response(stream).text()
    console.log('Downloaded:', text)
    ```
=== "JavaScript (Browser)"
    ```javascript
    const sharedObj = await sdk.sharedObject(shareUrl)

    const stream = sdk.download(sharedObj)
    const text = await new Response(stream).text()
    console.log('Downloaded:', text)
    ```