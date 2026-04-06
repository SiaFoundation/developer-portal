---
title: Delete and Prune
description: Delete objects from the indexer and prune unreferenced slabs to free storage.
---

# Delete an Object and Prune Slabs

Delete an object from the indexer, then prune any slabs that are no longer referenced by other objects.

=== "JavaScript"
    *Coming soon*
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
