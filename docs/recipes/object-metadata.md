---
title: Object Metadata
description: Attach or update encrypted application-defined metadata on Sia objects.
---

# Object Metadata

[Object](../core-concepts/objects.md) metadata is application-defined and encrypted client-side. Attach it before [pinning](../core-concepts/pinning.md) a new object, or update it on an already-pinned one.

## Attach metadata before pinning

=== "Rust"
    ```rust
    let obj = Object::default();
    let mut obj = sdk.upload(obj, reader, UploadOptions::default()).await?;

    obj.metadata = br#"{"File Name":"photo.jpg","mime":"image/jpeg"}"#.to_vec();

    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
    obj := siastorage.NewEmptyObject()
    if err := client.Upload(ctx, &obj, reader); err != nil {
        panic(err)
    }

    obj.UpdateMetadata([]byte(`{"File Name":"photo.jpg","mime":"image/jpeg"}`))

    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    obj = await sdk.upload(PinnedObject(), reader, UploadOptions())

    obj.update_metadata(json.dumps({"File Name": "photo.jpg", "mime": "image/jpeg"}).encode())

    await sdk.pin_object(obj)
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'package:sia_storage/sia_storage.dart';

    final upload = sdk.upload(object: PinnedObject(), source: reader);
    final obj = await upload.result;

    obj.updateMetadata(
      metadata: utf8.encode('{"File Name":"photo.jpg","mime":"image/jpeg"}'),
    );

    await sdk.pinObject(object: obj);
    ```
=== "JavaScript (Node)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    const obj = await sdk.upload(new PinnedObject(), reader)

    obj.updateMetadata(
      new TextEncoder().encode(
        JSON.stringify({ 'File Name': 'photo.jpg', mime: 'image/jpeg' }),
      ),
    )

    await sdk.pinObject(obj)
    ```
=== "JavaScript (Browser)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    const obj = await sdk.upload(new PinnedObject(), reader)

    obj.updateMetadata(
      new TextEncoder().encode(
        JSON.stringify({ 'File Name': 'photo.jpg', mime: 'image/jpeg' }),
      ),
    )

    await sdk.pinObject(obj)
    ```

## Update metadata on a pinned object

=== "Rust"
    ```rust
    let mut obj = sdk.object(&object_id).await?;

    obj.metadata = br#"{"File Name":"renamed.jpg","mime":"image/jpeg"}"#.to_vec();

    sdk.update_object_metadata(&obj).await?;
    ```
=== "Go"
    ```go
    obj, err := client.Object(ctx, objectID)
    if err != nil {
        panic(err)
    }

    obj.UpdateMetadata([]byte(`{"File Name":"renamed.jpg","mime":"image/jpeg"}`))

    // Re-pin to persist the updated metadata to the indexer.
    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    obj = await sdk.object(object_id)

    obj.update_metadata(json.dumps({"File Name": "renamed.jpg", "mime": "image/jpeg"}).encode())

    await sdk.update_object_metadata(obj)
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'package:sia_storage/sia_storage.dart';

    final obj = await sdk.object(key: objectId);

    obj.updateMetadata(
      metadata: utf8.encode('{"File Name":"renamed.jpg","mime":"image/jpeg"}'),
    );

    await sdk.updateObjectMetadata(object: obj);
    ```
=== "JavaScript (Node)"
    ```javascript
    const obj = await sdk.object(objectId)

    obj.updateMetadata(
      new TextEncoder().encode(
        JSON.stringify({ 'File Name': 'renamed.jpg', mime: 'image/jpeg' }),
      ),
    )

    await sdk.updateObjectMetadata(obj)
    ```
=== "JavaScript (Browser)"
    ```javascript
    const obj = await sdk.object(objectId)

    obj.updateMetadata(
      new TextEncoder().encode(
        JSON.stringify({ 'File Name': 'renamed.jpg', mime: 'image/jpeg' }),
      ),
    )

    await sdk.updateObjectMetadata(obj)
    ```