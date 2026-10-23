---
title: List & Sync Objects
description: Keep a local index of your app's pinned objects in sync with the indexer, and list objects from it.
---

# List & Sync Objects

The indexer doesn't have a "list my files" query. It has a **change feed**: `objectEvents()` returns one event for each [pinned](../core-concepts/pinning.md) [object](../core-concepts/objects.md), ordered by when it last changed. Your app keeps its own index of objects, uses the feed to bring that index up to date, and lists objects from the index.

> [!IMPORTANT]
> Don't call `objectEvents()` every time you need to show a list of objects. Keep an index locally, sync it with the feed periodically, and replay the feed from the start only when you need to rebuild your local state.

> [!NOTE]
> The Dart examples need `sia_storage` 0.4.0 or later. Earlier Dart releases are built on an older version of the SDK core that doesn't support slab versions, so `objectEvents()` fails with `sealed object: invalid signature` as soon as your account holds an object uploaded by a current SDK.

## How the event feed works

* **One event per object.** Each event holds an object's latest state. Replaying the feed from the beginning gives you every live object, plus a deletion event for each object that was deleted.
* **Ordered and resumable.** Events are sorted by their feed position, then by object ID. Pass the position and ID of the last event you processed as a cursor, and the next call starts right after it.
* **Paginated.** Each call returns at most `limit` events, and `limit` can be at most 500. A page shorter than `limit` means you've caught up.
* **Deletions carry no object.** When `deleted` is true, `object` is empty. Remove the object from your index.
* **Repeats are possible.** If an object changes while you're paging, it shows up again later in the feed with its newer state. Treat every event as an upsert or a delete and repeats are harmless.
* **The event's timestamp is a feed position, not an edit time.** The indexer assigns it when it publishes the event, usually within a second or two of the change. Use it only to build the cursor, and use the object's own `createdAt` and `updatedAt` for display.

## Choose what to keep for each object

Keep a small record for each object with only the fields your app shows, not the object itself. An object holds the key that decrypts its data, so it shouldn't be written to disk as it is, but a record is safe to store. When you need to download or share an object, fetch it by ID with `object(id)`. (If you'd rather keep whole objects, [seal](../core-concepts/objects.md#sealed-objects-indexd-view) them with your App Key before you store them.)

This record keeps the size and the `File Name` and `mime` fields from [Object Metadata](./object-metadata.md). Metadata is whatever the app that pinned the object attached, so decode it defensively:

=== "Rust"
    ```rust
    use serde::{Deserialize, Serialize};
    use sia_storage::Object;

    /// What the app keeps for each object: only the fields it shows.
    #[derive(Clone, Serialize, Deserialize)]
    struct Record {
        name: String,
        mime: String,
        size: u64,
    }

    /// Builds a record from an object's metadata. Metadata that isn't a JSON
    /// object falls back to the defaults below.
    fn to_record(object: &Object) -> Record {
        // Requires the serde (with the derive feature) and serde_json crates.
        let meta: serde_json::Value = serde_json::from_slice(&object.metadata).unwrap_or_default();
        Record {
            name: meta["File Name"].as_str().unwrap_or("(unnamed)").to_owned(),
            mime: meta["mime"].as_str().unwrap_or("application/octet-stream").to_owned(),
            size: object.size(),
        }
    }
    ```
=== "Go"
    ```go
    // A record is what the app keeps for each object: only the fields it shows.
    type record struct {
        Name string `json:"name"`
        MIME string `json:"mime"`
        Size uint64 `json:"size"`
    }

    // toRecord builds a record from an object's metadata. Metadata that isn't a
    // JSON object leaves the name and MIME type empty.
    func toRecord(obj siastorage.Object) record {
        var meta map[string]string
        _ = json.Unmarshal(obj.Metadata(), &meta)
        return record{Name: meta["File Name"], MIME: meta["mime"], Size: obj.Size()}
    }
    ```
=== "Python"
    ```python
    import json

    def to_record(obj):
        """Builds a record from an object's metadata. Metadata that isn't a
        JSON object falls back to the defaults below."""
        try:
            meta = json.loads(obj.metadata())
        except ValueError:
            meta = None
        if not isinstance(meta, dict):
            meta = {}
        return {
            "name": meta.get("File Name", "(unnamed)"),
            "mime": meta.get("mime", "application/octet-stream"),
            "size": obj.size(),
        }
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'package:sia_storage/sia_storage.dart';

    /// Builds a record from an object's metadata. Metadata that isn't a JSON
    /// object falls back to the defaults below.
    Map<String, Object?> toRecord(PinnedObject object) {
      var meta = <String, dynamic>{};
      try {
        final decoded = jsonDecode(utf8.decode(object.metadata()));
        if (decoded is Map<String, dynamic>) meta = decoded;
      } on FormatException {
        // Not JSON; keep the defaults.
      }
      return {
        'name': meta['File Name'] ?? '(unnamed)',
        'mime': meta['mime'] ?? 'application/octet-stream',
        'size': object.size().toInt(),
      };
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // Builds a record from an object's metadata. Metadata that isn't a JSON
    // object falls back to the defaults below.
    function toRecord(obj) {
      let meta = {}
      try {
        meta = JSON.parse(new TextDecoder().decode(obj.metadata())) ?? {}
      } catch {
        // Not JSON; keep the defaults.
      }
      return {
        name: meta['File Name'] ?? '(unnamed)',
        mime: meta.mime ?? 'application/octet-stream',
        size: Number(obj.size()),
      }
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Builds a record from an object's metadata. Metadata that isn't a JSON
    // object falls back to the defaults below.
    function toRecord(obj) {
      let meta = {}
      try {
        meta = JSON.parse(new TextDecoder().decode(obj.metadata())) ?? {}
      } catch {
        // Not JSON; keep the defaults.
      }
      return {
        name: meta['File Name'] ?? '(unnamed)',
        mime: meta.mime ?? 'application/octet-stream',
        size: Number(obj.size()),
      }
    }
    ```

## Sync your local index

This function reads every event after `cursor`, applies each one to `index`, and returns the cursor to resume from. The same function covers both cases: on first run, pass no cursor to build the index from scratch, and after that, pass the saved cursor to fetch only what changed.

=== "Rust"
    ```rust
    use std::collections::HashMap;

    use sia_storage::{DateTime, Error, Hash256, ObjectsCursor, Sdk, Utc};

    /// The indexer returns at most 500 events per call.
    const PAGE_SIZE: usize = 500;

    /// The feed position and ID of the last event applied to the index.
    type Position = (DateTime<Utc>, Hash256);

    /// Applies every event after `position` to `index` and returns the
    /// position to resume from next time.
    async fn sync_index(
        sdk: &Sdk,
        index: &mut HashMap<Hash256, Record>,
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
                    index.insert(event.id, to_record(&object));
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
    func syncIndex(ctx context.Context, client *siastorage.SDK, index map[types.Hash256]record, cursor slabs.Cursor) (slabs.Cursor, error) {
        for {
            events, err := client.ObjectEvents(ctx, cursor, pageSize)
            if err != nil {
                return cursor, err
            }

            for _, event := range events {
                if event.Deleted {
                    delete(index, event.Key)
                } else if event.Object != nil {
                    index[event.Key] = toRecord(*event.Object)
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
                    index[event.id] = to_record(event.object)
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
      Map<String, Map<String, Object?>> index,
      ObjectsCursor? cursor,
    ) async {
      while (true) {
        final events = await sdk.objectEvents(cursor: cursor, limit: pageSize);

        for (final event in events) {
          final object = event.object;
          if (event.deleted) {
            index.remove(event.id);
          } else if (object != null) {
            index[event.id] = toRecord(object);
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
            index.set(event.id, toRecord(object))
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
            index.set(event.id, toRecord(object))
          }
          cursor = { id: event.id, after: event.updatedAt }
        }

        if (events.length < PAGE_SIZE) return cursor
      }
    }
    ```

If a sync fails partway through, retry from the last cursor you saved. Events you already applied will be applied again, which is safe.

## List objects from your index

Listing objects means reading your own records, with no network call:

=== "Rust"
    ```rust
    for (id, record) in &index {
        println!("{id}  {}  {}  {} bytes", record.name, record.mime, record.size);
    }
    ```
=== "Go"
    ```go
    for id, r := range index {
        fmt.Printf("%s  %s  %s  %d bytes\n", id, r.Name, r.MIME, r.Size)
    }
    ```
=== "Python"
    ```python
    for object_id, record in index.items():
        print(f"{object_id}  {record['name']}  {record['mime']}  {record['size']} bytes")
    ```
=== "Dart"
    ```dart
    index.forEach((id, record) {
      print('$id  ${record['name']}  ${record['mime']}  ${record['size']} bytes');
    });
    ```
=== "JavaScript (Node)"
    ```javascript
    for (const [id, record] of index) {
      console.log(`${id}  ${record.name}  ${record.mime}  ${record.size} bytes`)
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    for (const [id, record] of index) {
      console.log(`${id}  ${record.name}  ${record.mime}  ${record.size} bytes`)
    }
    ```

## Save and load your index

Save the index and the cursor after every sync, and load them when your app starts, so a restart picks up where it left off instead of replaying the whole feed. These functions keep both in one JSON file and replace it in one step (they write a temporary file, then rename it), so the saved index and cursor always match. In a browser, they keep both under one `localStorage` key.

The saved state belongs to one indexer and one App Key, so it records the indexer URL and the App Key's public key. Loading returns an empty index and no cursor when nothing is saved, when the saved state can't be read, or when it belongs to a different indexer or App Key, and the next sync then rebuilds from scratch. Only the public key is written. Never store the App Key itself next to your index.

=== "Rust"
    ```rust
    /// The index and cursor as written to disk, tagged with the indexer and
    /// App Key they belong to.
    #[derive(Deserialize)]
    struct SavedIndex {
        indexer: String,
        app_key: String,
        position: Option<Position>,
        records: HashMap<Hash256, Record>,
    }

    /// Writes the index and cursor to `path` in one step, so they always match.
    fn save_index(
        path: &str,
        indexer: &str,
        app_key: &str,
        index: &HashMap<Hash256, Record>,
        position: Option<Position>,
    ) -> std::io::Result<()> {
        let saved = serde_json::json!({
            "indexer": indexer,
            "app_key": app_key,
            "position": position,
            "records": index,
        });
        let tmp = format!("{path}.tmp");
        std::fs::write(&tmp, serde_json::to_vec(&saved)?)?;
        std::fs::rename(&tmp, path) // replaces the old file in one step
    }

    /// Reads the index and cursor saved for this indexer and App Key. Returns
    /// an empty index and no cursor if there's no saved state, or if it
    /// belongs to a different indexer or App Key, so the next sync rebuilds.
    fn load_index(
        path: &str,
        indexer: &str,
        app_key: &str,
    ) -> (HashMap<Hash256, Record>, Option<Position>) {
        let saved = std::fs::read(path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<SavedIndex>(&bytes).ok());
        match saved {
            Some(saved) if saved.indexer == indexer && saved.app_key == app_key => {
                (saved.records, saved.position)
            }
            _ => (HashMap::new(), None),
        }
    }
    ```
=== "Go"
    ```go
    // savedIndex is the index and cursor as written to disk, tagged with the
    // indexer and App Key they belong to.
    type savedIndex struct {
        Indexer string                   `json:"indexer"`
        AppKey  string                   `json:"appKey"`
        Cursor  slabs.Cursor             `json:"cursor"`
        Records map[types.Hash256]record `json:"records"`
    }

    // saveIndex writes the index and cursor to path in one step, so they
    // always match.
    func saveIndex(path, indexer, appKey string, index map[types.Hash256]record, cursor slabs.Cursor) error {
        buf, err := json.Marshal(savedIndex{Indexer: indexer, AppKey: appKey, Cursor: cursor, Records: index})
        if err != nil {
            return err
        }
        if err := os.WriteFile(path+".tmp", buf, 0o600); err != nil {
            return err
        }
        return os.Rename(path+".tmp", path) // replaces the old file in one step
    }

    // loadIndex reads the index and cursor saved for this indexer and App Key.
    // It returns an empty index and cursor if there's no saved state, or if it
    // belongs to a different indexer or App Key, so the next sync rebuilds.
    func loadIndex(path, indexer, appKey string) (map[types.Hash256]record, slabs.Cursor) {
        var saved savedIndex
        buf, err := os.ReadFile(path)
        if err == nil && json.Unmarshal(buf, &saved) == nil &&
            saved.Indexer == indexer && saved.AppKey == appKey && saved.Records != nil {
            return saved.Records, saved.Cursor
        }
        return make(map[types.Hash256]record), slabs.Cursor{}
    }
    ```
=== "Python"
    ```python
    import json
    import os
    from datetime import datetime

    from sia_storage import ObjectsCursor

    def save_index(path, indexer, app_key, index, cursor):
        """Writes the index and cursor to `path` in one step, so they always match."""
        saved = {
            "indexer": indexer,
            "appKey": app_key,
            "cursor": cursor and {"id": cursor.id, "after": cursor.after.isoformat()},
            "records": index,
        }
        with open(path + ".tmp", "w") as f:
            json.dump(saved, f)
        os.replace(path + ".tmp", path)  # replaces the old file in one step

    def load_index(path, indexer, app_key):
        """Reads the index and cursor saved for this indexer and App Key. Returns
        an empty index and no cursor if there's no saved state, or if it belongs
        to a different indexer or App Key, so the next sync rebuilds."""
        try:
            with open(path) as f:
                saved = json.load(f)
            if saved["indexer"] == indexer and saved["appKey"] == app_key:
                c = saved["cursor"]
                cursor = c and ObjectsCursor(id=c["id"], after=datetime.fromisoformat(c["after"]))
                return saved["records"], cursor
        except Exception:
            pass  # Missing or unreadable: start fresh.
        return {}, None
    ```
=== "Dart"
    ```dart
    import 'dart:convert';
    import 'dart:io';
    import 'package:sia_storage/sia_storage.dart';

    /// Writes the index and cursor to [path] in one step, so they always match.
    Future<void> saveIndex(
      String path,
      String indexer,
      String appKey,
      Map<String, Map<String, Object?>> index,
      ObjectsCursor? cursor,
    ) async {
      final saved = {
        'indexer': indexer,
        'appKey': appKey,
        'cursor': cursor == null
            ? null
            : {'id': cursor.id, 'after': cursor.after.toIso8601String()},
        'records': index,
      };
      final tmp = File('$path.tmp');
      await tmp.writeAsString(jsonEncode(saved));
      await tmp.rename(path); // replaces the old file in one step
    }

    /// Reads the index and cursor saved for this indexer and App Key. Returns
    /// an empty index and no cursor if there's no saved state, or if it
    /// belongs to a different indexer or App Key, so the next sync rebuilds.
    Future<(Map<String, Map<String, Object?>>, ObjectsCursor?)> loadIndex(
      String path,
      String indexer,
      String appKey,
    ) async {
      try {
        final saved = jsonDecode(await File(path).readAsString());
        if (saved['indexer'] == indexer && saved['appKey'] == appKey) {
          final records = <String, Map<String, Object?>>{
            for (final entry in (saved['records'] as Map).entries)
              entry.key as String: Map<String, Object?>.from(entry.value as Map),
          };
          final c = saved['cursor'];
          final cursor = c == null
              ? null
              : ObjectsCursor(
                  id: c['id'] as String,
                  after: DateTime.parse(c['after'] as String),
                );
          return (records, cursor);
        }
      } catch (_) {
        // Missing or unreadable: start fresh.
      }
      return (<String, Map<String, Object?>>{}, null);
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    import { readFile, rename, writeFile } from 'node:fs/promises'

    // Writes the index and cursor to `path` in one step, so they always match.
    async function saveIndex(path, indexer, appKey, index, cursor) {
      const saved = { indexer, appKey, cursor, records: Object.fromEntries(index) }
      await writeFile(`${path}.tmp`, JSON.stringify(saved))
      await rename(`${path}.tmp`, path) // replaces the old file in one step
    }

    // Reads the index and cursor saved for this indexer and App Key. Returns an
    // empty index and no cursor if there's no saved state, or if it belongs to
    // a different indexer or App Key, so the next sync rebuilds from scratch.
    async function loadIndex(path, indexer, appKey) {
      try {
        const saved = JSON.parse(await readFile(path, 'utf8'))
        if (saved.indexer === indexer && saved.appKey === appKey) {
          const cursor = saved.cursor && { id: saved.cursor.id, after: new Date(saved.cursor.after) }
          return { index: new Map(Object.entries(saved.records)), cursor }
        }
      } catch {
        // Missing or unreadable: start fresh.
      }
      return { index: new Map(), cursor: undefined }
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Saves the index and cursor under one localStorage key, so they always match.
    function saveIndex(key, indexer, appKey, index, cursor) {
      const saved = { indexer, appKey, cursor, records: Object.fromEntries(index) }
      localStorage.setItem(key, JSON.stringify(saved))
    }

    // Reads the index and cursor saved for this indexer and App Key. Returns an
    // empty index and no cursor if there's no saved state, or if it belongs to
    // a different indexer or App Key, so the next sync rebuilds from scratch.
    function loadIndex(key, indexer, appKey) {
      try {
        const saved = JSON.parse(localStorage.getItem(key))
        if (saved.indexer === indexer && saved.appKey === appKey) {
          const cursor = saved.cursor && { id: saved.cursor.id, after: new Date(saved.cursor.after) }
          return { index: new Map(Object.entries(saved.records)), cursor }
        }
      } catch {
        // Missing or unreadable: start fresh.
      }
      return { index: new Map(), cursor: undefined }
    }
    ```

A JSON file is fine for a few thousand objects, but it's rewritten in full on every save. For larger indexes, keep the records in a database such as SQLite, or IndexedDB in a browser, and write each sync's changes and the new cursor in one transaction. If you can't use a transaction, write the records first and the cursor second: a cursor that lags behind the records only means some events get applied twice, but a cursor that runs ahead of them skips events for good.

## Keep the index up to date

Load the saved index when your app starts, then sync on a timer to pick up changes from other devices and apps that share the same App Key, saving after each successful sync. This loop syncs every 30 seconds and keeps the old cursor when a sync fails:

=== "Rust"
    ```rust
    const STATE_FILE: &str = "sia-index.json";

    let app_key = sdk.app_key().public_key().to_string();
    let (mut index, mut position) = load_index(STATE_FILE, INDEXER_URL, &app_key);

    let mut ticker = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        ticker.tick().await;
        match sync_index(&sdk, &mut index, position).await {
            Ok(next) => {
                position = next;
                if let Err(e) = save_index(STATE_FILE, INDEXER_URL, &app_key, &index, position) {
                    eprintln!("save failed, retrying next tick: {e}");
                }
            }
            Err(e) => eprintln!("sync failed, retrying next tick: {e}"),
        }
    }
    ```
=== "Go"
    ```go
    const stateFile = "sia-index.json"

    appKey := client.AppKey().PublicKey().String()
    index, cursor := loadIndex(stateFile, indexerURL, appKey)

    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    for {
        next, err := syncIndex(ctx, client, index, cursor)
        if err != nil {
            log.Printf("sync failed, retrying next tick: %v", err)
        } else {
            cursor = next
            if err := saveIndex(stateFile, indexerURL, appKey, index, cursor); err != nil {
                log.Printf("save failed, retrying next tick: %v", err)
            }
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

    INDEXER_URL = "https://sia.storage"
    STATE_FILE = "sia-index.json"

    app_key = sdk.app_key().public_key()
    index, cursor = load_index(STATE_FILE, INDEXER_URL, app_key)

    while True:
        try:
            cursor = await sync_index(sdk, index, cursor)
            save_index(STATE_FILE, INDEXER_URL, app_key, index, cursor)
        except Exception as e:
            print(f"sync failed, retrying next tick: {e}")
        await asyncio.sleep(30)
    ```
=== "Dart"
    ```dart
    const indexerUrl = 'https://sia.storage';
    const stateFile = 'sia-index.json';

    final appKey = sdk.appKey().publicKey();
    var (index, cursor) = await loadIndex(stateFile, indexerUrl, appKey);

    while (true) {
      try {
        cursor = await syncIndex(sdk, index, cursor);
        await saveIndex(stateFile, indexerUrl, appKey, index, cursor);
      } catch (e) {
        print('sync failed, retrying next tick: $e');
      }
      await Future.delayed(const Duration(seconds: 30));
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    const INDEXER_URL = 'https://sia.storage'
    const STATE_FILE = 'sia-index.json'

    const appKey = sdk.appKey().publicKey()
    let { index, cursor } = await loadIndex(STATE_FILE, INDEXER_URL, appKey)

    async function poll() {
      try {
        cursor = await syncIndex(sdk, index, cursor)
        await saveIndex(STATE_FILE, INDEXER_URL, appKey, index, cursor)
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
    const INDEXER_URL = 'https://sia.storage'
    const STATE_KEY = 'sia-index'

    const appKey = sdk.appKey().publicKey()
    let { index, cursor } = loadIndex(STATE_KEY, INDEXER_URL, appKey)

    async function poll() {
      try {
        cursor = await syncIndex(sdk, index, cursor)
        saveIndex(STATE_KEY, INDEXER_URL, appKey, index, cursor)
      } catch (err) {
        console.error('sync failed, retrying next tick:', err)
      }
      // Schedule the next run only after this one finishes, so syncs never overlap.
      setTimeout(poll, 30_000)
    }

    poll()
    ```

An object your app has just pinned takes a second or two to appear in the feed. Add its record to the index yourself as soon as `pinObject()` returns. When its event arrives, the event simply overwrites that entry. Do the same for deletes.

## Rebuild from scratch

To rebuild, delete the saved index, then sync with an empty index and no cursor. Loading already does this for you when the saved state is missing, can't be read, or belongs to a different indexer or App Key. Rebuild when local state can't be trusted: after storage was cleared or corrupted, or after you change what a record holds. A rebuild also drops any objects the indexer operator has blocked, since blocked objects leave the feed without a deletion event.
