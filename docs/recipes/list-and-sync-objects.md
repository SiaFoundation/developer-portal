---
title: List & Sync Objects
description: Keep a local index of your app's pinned objects in sync with the indexer, and list objects from it.
---

# List & Sync Objects

The indexer doesn't have a "list my files" query. It has a **change feed**: `objectEvents()` returns one event for each [pinned](../core-concepts/pinning.md) [object](../core-concepts/objects.md), ordered by when it last changed. Your app keeps its own index of objects, uses the feed to bring that index up to date, and lists objects from the index.

> [!IMPORTANT]
> Don't call `objectEvents()` every time you need to show a list of objects. Store objects locally, sync with the feed periodically, and replay the feed from the start only when you need to rebuild your local state.

## How the event feed works

* **One event per object.** Each event holds an object's latest state. Replaying the feed from the beginning gives you every live object, plus a deletion event for each object that was deleted.
* **Ordered and resumable.** Events are sorted by their feed position, then by object ID. Pass the position and ID of the last event you processed as a cursor, and the next call starts right after it.
* **Paginated.** Each call returns at most `limit` events, and `limit` can be at most 500. A page shorter than `limit` means you've caught up.
* **Deletions carry no object.** When `deleted` is true, `object` is empty. Remove the object from your index.
* **Repeats are possible.** If an object changes while you're paging, it shows up again later in the feed with its newer state. Treat every event as an upsert or a delete and repeats are harmless.
* **The event's timestamp is a feed position, not an edit time.** The indexer assigns it when it publishes the event, usually within a second or two of the change. Use it only to build the cursor, and use the object's own `createdAt` and `updatedAt` for display.

## Sync your local index

This function reads every event after `cursor`, applies each one to `index`, and returns the cursor to resume from. The same function covers both cases: on first run, pass no cursor to build the index from scratch, and after that, pass the saved cursor to fetch only what changed.

=== "Rust"
    ```rust
    use std::collections::HashMap;

    use sia_storage::{DateTime, Error, Hash256, Object, ObjectsCursor, Sdk, Utc};

    /// The indexer returns at most 500 events per call.
    const PAGE_SIZE: usize = 500;

    /// The feed position and ID of the last event applied to the index.
    type Position = (DateTime<Utc>, Hash256);

    /// Applies every event after `position` to `index` and returns the
    /// position to resume from next time.
    async fn sync_index(
        sdk: &Sdk,
        index: &mut HashMap<Hash256, Object>,
        mut position: Option<Position>,
    ) -> Result<Option<Position>, Error> {
        loop {
            let cursor = position.map(|(after, id)| ObjectsCursor { after, id });
            let events = sdk.object_events(cursor, Some(PAGE_SIZE)).await?;
            let caught_up = events.len() < PAGE_SIZE;

            for event in events {
                if event.deleted {
                    index.remove(&event.id);
                } else if let Some(object) = event.object {
                    index.insert(event.id, object);
                }
                position = Some((event.updated_at, event.id));
            }

            if caught_up {
                return Ok(position);
            }
        }
    }
    ```
=== "Go"
    ```go
    import (
        "context"

        "go.sia.tech/core/types"
        "go.sia.tech/indexd/slabs"
        "go.sia.tech/siastorage"
    )

    // The indexer returns at most 500 events per call.
    const pageSize = 500

    // syncIndex applies every event after cursor to index and returns the
    // cursor to resume from next time. Pass slabs.Cursor{} to start from
    // the beginning.
    func syncIndex(ctx context.Context, client *siastorage.SDK, index map[types.Hash256]siastorage.Object, cursor slabs.Cursor) (slabs.Cursor, error) {
        for {
            events, err := client.ObjectEvents(ctx, cursor, pageSize)
            if err != nil {
                return cursor, err
            }

            for _, event := range events {
                if event.Deleted {
                    delete(index, event.Key)
                } else if event.Object != nil {
                    index[event.Key] = *event.Object
                }
                cursor = slabs.Cursor{After: event.UpdatedAt, Key: event.Key}
            }

            if len(events) < pageSize {
                return cursor, nil
            }
        }
    }
    ```
=== "Python"
    ```python
    from sia_storage import ObjectsCursor

    # The indexer returns at most 500 events per call.
    PAGE_SIZE = 500

    async def sync_index(sdk, index, cursor=None):
        """Applies every event after `cursor` to `index` and returns the
        cursor to resume from next time."""
        while True:
            events = await sdk.object_events(cursor, PAGE_SIZE)

            for event in events:
                if event.deleted:
                    index.pop(event.id, None)
                elif event.object is not None:
                    index[event.id] = event.object
                cursor = ObjectsCursor(id=event.id, after=event.updated_at)

            if len(events) < PAGE_SIZE:
                return cursor
    ```
=== "Dart"
    ```dart
    import 'package:sia_storage/sia_storage.dart';

    /// The indexer returns at most 500 events per call.
    const pageSize = 500;

    /// Applies every event after [cursor] to [index] and returns the cursor
    /// to resume from next time.
    Future<ObjectsCursor?> syncIndex(
      Sdk sdk,
      Map<String, PinnedObject> index,
      ObjectsCursor? cursor,
    ) async {
      while (true) {
        final events = await sdk.objectEvents(cursor: cursor, limit: pageSize);

        for (final event in events) {
          final object = event.object;
          if (event.deleted) {
            index.remove(event.id);
          } else if (object != null) {
            index[event.id] = object;
          }
          cursor = ObjectsCursor(id: event.id, after: event.updatedAt);
        }

        if (events.length < pageSize) return cursor;
      }
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // The indexer returns at most 500 events per call.
    const PAGE_SIZE = 500

    // Applies every event after `cursor` to `index` (a Map) and returns the
    // cursor to resume from next time.
    async function syncIndex(sdk, index, cursor) {
      while (true) {
        const events = await sdk.objectEvents(cursor, PAGE_SIZE)

        for (const event of events) {
          const object = event.object
          if (event.deleted) {
            index.delete(event.id)
          } else if (object) {
            index.set(event.id, object)
          }
          cursor = { id: event.id, after: event.updatedAt }
        }

        if (events.length < PAGE_SIZE) return cursor
      }
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // The indexer returns at most 500 events per call.
    const PAGE_SIZE = 500

    // Applies every event after `cursor` to `index` (a Map) and returns the
    // cursor to resume from next time.
    async function syncIndex(sdk, index, cursor) {
      while (true) {
        const events = await sdk.objectEvents(cursor, PAGE_SIZE)

        for (const event of events) {
          const object = event.object
          if (event.deleted) {
            index.delete(event.id)
          } else if (object) {
            index.set(event.id, object)
          }
          cursor = { id: event.id, after: event.updatedAt }
        }

        if (events.length < PAGE_SIZE) return cursor
      }
    }
    ```

If a sync fails partway through, retry from the last cursor you saved. Events you already applied will be applied again, which is safe.

## List objects from your index

Listing objects means reading your own index, with no network call. Metadata is whatever your app attached when it pinned the object. This example decodes the `File Name` and `mime` fields from [Object Metadata](./object-metadata.md):

=== "Rust"
    ```rust
    // Requires the serde_json crate.
    for (id, object) in &index {
        // Objects pinned without JSON metadata fall back to the defaults below.
        let meta: serde_json::Value = serde_json::from_slice(&object.metadata).unwrap_or_default();
        let name = meta["File Name"].as_str().unwrap_or("(unnamed)");
        let mime = meta["mime"].as_str().unwrap_or("application/octet-stream");
        println!("{id}  {name}  {mime}  {} bytes", object.size());
    }
    ```
=== "Go"
    ```go
    for id, obj := range index {
        // Objects pinned without JSON metadata leave meta empty.
        var meta map[string]string
        _ = json.Unmarshal(obj.Metadata(), &meta)
        fmt.Printf("%s  %s  %s  %d bytes\n", id, meta["File Name"], meta["mime"], obj.Size())
    }
    ```
=== "Python"
    ```python
    import json

    for object_id, obj in index.items():
        # Objects pinned without JSON metadata fall back to the defaults below.
        try:
            meta = json.loads(obj.metadata())
        except ValueError:
            meta = {}
        name = meta.get("File Name", "(unnamed)")
        mime = meta.get("mime", "application/octet-stream")
        print(f"{object_id}  {name}  {mime}  {obj.size()} bytes")
    ```
=== "Dart"
    ```dart
    import 'dart:convert';

    index.forEach((id, object) {
      // Objects pinned without JSON metadata fall back to the defaults below.
      var meta = <String, dynamic>{};
      try {
        meta = jsonDecode(utf8.decode(object.metadata())) as Map<String, dynamic>;
      } on FormatException {
        // Not JSON; keep the defaults.
      }
      final name = meta['File Name'] ?? '(unnamed)';
      final mime = meta['mime'] ?? 'application/octet-stream';
      print('$id  $name  $mime  ${object.size()} bytes');
    });
    ```
=== "JavaScript (Node)"
    ```javascript
    const decoder = new TextDecoder()

    for (const [id, obj] of index) {
      // Objects pinned without JSON metadata fall back to the defaults below.
      let meta = {}
      try {
        meta = JSON.parse(decoder.decode(obj.metadata()))
      } catch {
        // Not JSON; keep the defaults.
      }
      const name = meta['File Name'] ?? '(unnamed)'
      const mime = meta.mime ?? 'application/octet-stream'
      console.log(`${id}  ${name}  ${mime}  ${obj.size()} bytes`)
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    const decoder = new TextDecoder()

    for (const [id, obj] of index) {
      // Objects pinned without JSON metadata fall back to the defaults below.
      let meta = {}
      try {
        meta = JSON.parse(decoder.decode(obj.metadata()))
      } catch {
        // Not JSON; keep the defaults.
      }
      const name = meta['File Name'] ?? '(unnamed)'
      const mime = meta.mime ?? 'application/octet-stream'
      console.log(`${id}  ${name}  ${mime}  ${obj.size()} bytes`)
    }
    ```

## Save the cursor with your index

The examples keep the index in memory. A real app stores it somewhere that survives a restart, such as a SQLite database, IndexedDB, or a file, and stores the cursor next to it. Load both on startup and pass the cursor to the next sync.

Write the index and the cursor together, in one transaction if you can. If you can't, save the index first and the cursor second. A cursor that lags behind the index only means some events get applied twice, but a cursor that runs ahead of the index skips events for good.

Each object holds the key that decrypts its data. If you persist objects, either seal them with your App Key first (see [Sealed objects](../core-concepts/objects.md#sealed-objects-indexd-view)), or store only the fields you display along with the object ID, and fetch the full object with `object(id)` when you need to download or share it.

The cursor is two values, a timestamp and an object ID. To store it:

| Language | Save | Restore |
|---|---|---|
| Rust | `after.to_rfc3339()` and `id.to_string()` | `DateTime::parse_from_rfc3339(s)?.with_timezone(&Utc)` and `Hash256::from_str(s)?` |
| Go | `json.Marshal(cursor)` | `json.Unmarshal(data, &cursor)` |
| Python | `cursor.after.isoformat()` and `cursor.id` | `ObjectsCursor(id=id, after=datetime.fromisoformat(s))`. Keep the timezone, because `after` must be timezone-aware. |
| Dart | `cursor.after.toIso8601String()` and `cursor.id` | `ObjectsCursor(id: id, after: DateTime.parse(s))` |
| JavaScript | `JSON.stringify(cursor)` (turns `after` into an ISO string) | `{ id: saved.id, after: new Date(saved.after) }`. `after` must be a `Date`. |

## Keep the index up to date

Run the sync on a timer to pick up changes from other devices and apps that share the same App Key. This loop syncs every 30 seconds and keeps the old cursor when a sync fails:

=== "Rust"
    ```rust
    // Load these from storage on startup.
    let mut index = HashMap::new();
    let mut position = None;

    let mut ticker = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        ticker.tick().await;
        match sync_index(&sdk, &mut index, position).await {
            Ok(next) => {
                position = next;
                // Save `index` and `position` here.
            }
            Err(e) => eprintln!("sync failed, retrying next tick: {e}"),
        }
    }
    ```
=== "Go"
    ```go
    // Load these from storage on startup.
    index := make(map[types.Hash256]siastorage.Object)
    var cursor slabs.Cursor

    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    for {
        next, err := syncIndex(ctx, client, index, cursor)
        if err != nil {
            log.Printf("sync failed, retrying next tick: %v", err)
        } else {
            cursor = next
            // Save index and cursor here.
        }

        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
        }
    }
    ```
=== "Python"
    ```python
    import asyncio

    # Load these from storage on startup.
    index = {}
    cursor = None

    while True:
        try:
            cursor = await sync_index(sdk, index, cursor)
            # Save index and cursor here.
        except Exception as e:
            print(f"sync failed, retrying next tick: {e}")
        await asyncio.sleep(30)
    ```
=== "Dart"
    ```dart
    // Load these from storage on startup.
    final index = <String, PinnedObject>{};
    ObjectsCursor? cursor;

    while (true) {
      try {
        cursor = await syncIndex(sdk, index, cursor);
        // Save index and cursor here.
      } catch (e) {
        print('sync failed, retrying next tick: $e');
      }
      await Future.delayed(const Duration(seconds: 30));
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // Load these from storage on startup.
    const index = new Map()
    let cursor

    async function poll() {
      try {
        cursor = await syncIndex(sdk, index, cursor)
        // Save index and cursor here.
      } catch (err) {
        console.error('sync failed, retrying next tick:', err)
      }
      // Schedule the next run only after this one finishes, so syncs never overlap.
      setTimeout(poll, 30_000)
    }

    poll()
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Load these from storage on startup.
    const index = new Map()
    let cursor

    async function poll() {
      try {
        cursor = await syncIndex(sdk, index, cursor)
        // Save index and cursor here.
      } catch (err) {
        console.error('sync failed, retrying next tick:', err)
      }
      // Schedule the next run only after this one finishes, so syncs never overlap.
      setTimeout(poll, 30_000)
    }

    poll()
    ```

An object your app has just pinned takes a second or two to appear in the feed. Add it to the index yourself as soon as `pinObject()` returns. When its event arrives, the event simply overwrites that entry. Do the same for deletes.

## Rebuild from scratch

To rebuild, clear the index, throw away the saved cursor, and sync with no cursor. Rebuild when local state is missing or can't be trusted: on a new device, after storage was cleared, after a corrupted database, or after you change how your app stores objects. A rebuild also drops any objects the indexer operator has blocked, since blocked objects leave the feed without a deletion event.
