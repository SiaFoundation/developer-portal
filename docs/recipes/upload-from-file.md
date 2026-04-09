---
title: Upload from a File
description: Stream a file directly from disk to the Sia network instead of loading it into memory.
---

# Upload from a File

Stream directly from disk instead of loading the entire object into memory.

=== "Rust"
    ```rust
    use sia_storage::{Object, UploadOptions};

    let file = tokio::fs::File::open("example.txt").await?;
    let obj = Object::default();
    let mut obj = sdk.upload(obj, file, UploadOptions::default()).await?;

    obj.metadata = br#"{"File Name":"example.txt"}"#.to_vec();

    sdk.pin_object(&obj).await?;
    ```
=== "Go"
    ```go
    file, err := os.Open("example.txt")
    if err != nil {
        panic(err)
    }
    defer file.Close()

    obj := siastorage.NewEmptyObject()
    if err := client.Upload(ctx, &obj, file); err != nil {
        panic(err)
    }

    obj.UpdateMetadata([]byte(`{"File Name":"example.txt"}`))

    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    with open("example.txt", "rb") as reader:
        obj = await sdk.upload(reader, UploadOptions())

    obj.update_metadata(json.dumps({"File Name": "example.txt"}).encode())

    await sdk.pin_object(obj)
    ```
