---
title: Delete Objects
description: Delete objects and prune their slabs to free storage.
---

# Delete Objects

Delete is a **soft delete**: the [object](../core-concepts/objects.md) disappears from your app's listings, and any slab it referenced is unpinned immediately if no other object still points to it. Slabs can be shared between objects, so a slab only gets freed once every object referencing it has been deleted.

`prune_slabs()` is a **reconciliation sweep**, not the primary cleanup path — deletion already releases unreferenced slabs on its own. Use it to catch slabs orphaned by interrupted uploads or other edge cases. It only considers slabs pinned more than 72 hours ago, so a slab orphaned moments ago is deliberately left alone — pruning too eagerly risks destroying data for an upload that's still in flight.

Unpinning a slab that's still referenced by another object fails outright — the indexer rejects the request rather than silently freeing storage out from under the object still using it.

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
=== "Dart"
    ```dart
    import 'package:sia_storage/sia_storage.dart';

    await sdk.deleteObject(key: objectId);
    print('Object deleted.');

    // Remove slabs that are no longer referenced by any pinned object.
    await sdk.pruneSlabs();
    print('Unused slabs pruned.');
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

## Overriding the prune cutoff

Only the Go SDK exposes the prune cutoff directly:

```go
import (
    "time"

    "go.sia.tech/indexd/api"
)

// Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
if err := client.PruneSlabs(ctx, api.WithBefore(time.Now().Add(-30*time.Minute))); err != nil {
    panic(err)
}
```

Rust and Python `prune_slabs()`, and Dart and JavaScript `pruneSlabs()`, take no arguments and always use the indexer's default 72-hour cutoff.