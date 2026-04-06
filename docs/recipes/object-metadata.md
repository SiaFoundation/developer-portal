---
title: Object Metadata
description: Attach or update encrypted application-defined metadata on Sia objects.
---

# Object Metadata

Object metadata is application-defined and encrypted — the indexer never sees the plaintext. Attach metadata before pinning a new object, or update it on an already-pinned object.

## Attach metadata before pinning

=== "JavaScript"
    *Coming soon*
=== "Rust"
    ```rust
    let mut obj = sdk.upload(reader, UploadOptions::default()).await?;

    obj.metadata = br#"{"File Name":"photo.jpg","mime":"image/jpeg"}"#.to_vec();

    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
    obj := sdk.NewEmptyObject()
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
    obj = await sdk.upload(reader, UploadOptions())

    obj.update_metadata(json.dumps({"File Name": "photo.jpg", "mime": "image/jpeg"}).encode())

    await sdk.pin_object(obj)
    ```

## Update metadata on a pinned object

=== "JavaScript"
    *Coming soon*
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

    if err := client.UpdateObjectMetadata(ctx, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    obj = await sdk.object(object_id)

    obj.update_metadata(json.dumps({"File Name": "renamed.jpg", "mime": "image/jpeg"}).encode())

    await sdk.update_object_metadata(obj)
    ```
