---
title: Delete Objects
description: Delete objects and prune their slabs to free storage.
---

# Delete Objects

Delete is a **soft delete**: the [object](../core-concepts/objects.md) disappears from your app's listings, and any slab it referenced is unpinned immediately if no other object still points to it. Slabs can be shared between objects, so a slab only becomes eligible for host cleanup once every object referencing it has been deleted.

`prune_slabs()` is a **reconciliation sweep**, not the primary cleanup path — deletion already releases unreferenced slabs on its own. Use it to catch slabs orphaned by interrupted uploads or other edge cases. By default it only considers slabs pinned more than 72 hours ago, so a slab orphaned moments ago is deliberately left alone — pruning too eagerly risks destroying data for an upload that's still in flight.

=== "Rust"
    ```rust
    use sia_storage::Hash256;
    use std::str::FromStr;

    let object_id = Hash256::from_str("your-object-id-here")?;

    sdk.delete_object(&object_id).await?;
    println!("Object deleted.");
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
    ```
=== "Python"
    ```python
    await sdk.delete_object(object_id)
    print("Object deleted.")
    ```
=== "Dart"
    ```dart
    import 'package:sia_storage/sia_storage.dart';

    await sdk.deleteObject(key: objectId);
    print('Object deleted.');
    ```
=== "JavaScript (Node)"
    ```javascript
    await sdk.deleteObject(objectId)
    console.log('Object deleted.')
    ```
=== "JavaScript (Browser)"
    ```javascript
    await sdk.deleteObject(objectId)
    console.log('Object deleted.')
    ```

## Running the reconciliation sweep

Most apps never need to call this — deletion already frees a slab once nothing references it. Run `prune_slabs()` periodically, or after a batch of deletes, to catch slabs orphaned by interrupted uploads or other edge cases:

=== "Rust"
    ```rust
    sdk.prune_slabs(None).await?;
    println!("Unused slabs pruned.");
    ```
=== "Go"
    ```go
    if err := client.PruneSlabs(ctx); err != nil {
        panic(err)
    }
    fmt.Println("Unused slabs pruned.")
    ```
=== "Python"
    ```python
    await sdk.prune_slabs()
    print("Unused slabs pruned.")
    ```
=== "Dart"
    ```dart
    await sdk.pruneSlabs();
    print('Unused slabs pruned.');
    ```
=== "JavaScript (Node)"
    ```javascript
    await sdk.pruneSlabs()
    console.log('Unused slabs pruned.')
    ```
=== "JavaScript (Browser)"
    ```javascript
    await sdk.pruneSlabs()
    console.log('Unused slabs pruned.')
    ```

## Overriding the prune cutoff

Every SDK takes an optional cutoff. Pass a time to prune only slabs pinned before it. Leave it out (pass `None` in Rust) to use the indexer's default of 72 hours.

> [!WARNING]
> Lowering the cutoff below the default 72 hours increases the risk of pruning a slab whose upload hasn't finished yet. Only use a window this short if every upload is guaranteed to complete well within it — the 30-minute value below is illustrative, not a recommendation.

=== "Rust"
    ```rust
    use sia_storage::Utc;
    use std::time::Duration;

    // Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
    sdk.prune_slabs(Some(Utc::now() - Duration::from_secs(30 * 60))).await?;
    ```
=== "Go"
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
=== "Python"
    ```python
    from datetime import datetime, timedelta, timezone

    # Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
    await sdk.prune_slabs(datetime.now(timezone.utc) - timedelta(minutes=30))
    ```
=== "Dart"
    ```dart
    // Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
    await sdk.pruneSlabs(
      before: DateTime.now().subtract(const Duration(minutes: 30)),
    );
    ```
=== "JavaScript (Node)"
    ```javascript
    // Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
    await sdk.pruneSlabs(new Date(Date.now() - 30 * 60 * 1000))
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Only prune slabs pinned more than 30 minutes ago instead of the default 72 hours.
    await sdk.pruneSlabs(new Date(Date.now() - 30 * 60 * 1000))
    ```
