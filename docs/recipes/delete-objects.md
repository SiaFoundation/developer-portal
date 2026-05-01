---
title: Delete Objects
description: Delete objects and prune their slabs to free storage.
---

# Delete Objects

Delete is a **soft delete**: the [object](../core-concepts/objects.md) disappears from your app's listings, but the slabs it referenced aren't reclaimed automatically. Slabs can be shared between objects, so they only get freed when no object still points to them.

`prune_slabs()` is the cleanup step. It releases any slab that no remaining object references. Run it after deletes, or periodically.

=== "Rust"
    ```rust
    use sia_storage::Hash256;
    use std::str::FromStr;

    let object_id = Hash256::from_str("your-object-id-here")?;

    sdk.delete_object(&object_id).await?;
    println!("Object deleted.");

    // Remove slabs that are no longer referenced by any pinned object.
    sdk.prune_slabs().await?;
    println!("Unused slabs pruned.");
    ```
=== "Go"
    ```go
    var objectID types.Hash256
    if err := objectID.UnmarshalText([]byte("your-object-id-here")); err != nil {
        panic(err)
    }

    if err := client.DeleteObject(ctx, objectID); err != nil {
        panic(err)
    }
    fmt.Println("Object deleted.")

    // Remove slabs that are no longer referenced by any pinned object.
    if err := client.PruneSlabs(ctx); err != nil {
        panic(err)
    }
    fmt.Println("Unused slabs pruned.")
    ```
=== "Python"
    ```python
    await sdk.delete_object(object_id)
    print("Object deleted.")

    # Remove slabs that are no longer referenced by any pinned object.
    await sdk.prune_slabs()
    print("Unused slabs pruned.")
    ```
=== "JavaScript (Node)"
    ```javascript
    await sdk.deleteObject(objectId)
    console.log('Object deleted.')

    await sdk.pruneSlabs()
    console.log('Unused slabs pruned.')
    ```
=== "JavaScript (Browser)"
    ```javascript
    await sdk.deleteObject(objectId)
    console.log('Object deleted.')

    await sdk.pruneSlabs()
    console.log('Unused slabs pruned.')
    ```