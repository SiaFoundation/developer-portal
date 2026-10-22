---
title: Error Handling
description: Recognize connection, upload, and download errors, and decide whether to retry, reconnect, or stop.
---

# Error Handling

Any SDK call can fail, and the right response depends on why. Some failures are temporary: a storage provider is offline, or the indexer is briefly unreachable, and the same call succeeds a little later. Others need the user to act, or mean your code passed something invalid, and retrying only repeats the failure.

This recipe sorts the errors from each phase of an app (connecting, uploading, and downloading) into four actions, then shows a retry helper that retries only the temporary ones.

| Action | Meaning |
|---|---|
| **Retry** | A temporary problem. Wait, then make the same call again. |
| **Reconnect** | The App Key isn't authorized. Run the [approval flow](../quickstart/connect-to-an-indexer.md) again. |
| **Fix input** | The input is wrong. Ask the user, or fix your code, before trying again. |
| **Give up** | Retrying won't help. Report the error. |

## How each SDK reports errors

| SDK | What you match on |
|---|---|
| Rust | Typed enums: `BuilderError`, `UploadError`, `DownloadError` and `QueueError`, with `AppApiError` inside builder and upload errors. Calls on the `Sdk` itself report indexer errors only as text. |
| Go | Sentinel errors, with `errors.Is`. Some errors have no sentinel. Indexer responses are `*app.HTTPError` from `go.sia.tech/indexd/api/app`, which has the HTTP status. |
| Python | Exception classes such as `UploadError` and `DownloadError`. The cause is only in the message, `str(err)`. |
| Dart | An exception whose message, `'$err'`, carries the cause |
| JavaScript | A plain `Error`. The cause is only in `err.message`. |

The Python, Dart, and JavaScript SDKs are built from the Rust SDK and pass its error messages through, so their samples match on message text such as `not enough shards`. The tables below list the text to look for in each case.

> [!WARNING]
> Error messages aren't a stable API. A new SDK release can reword them. Pin your SDK version, re-check these strings when you upgrade, and treat any message you don't recognize as **give up**, not **retry**.

## Connection errors

These come from the builder while your app connects to the user's account (see [Connect a Storage Account](../quickstart/connect-to-an-indexer.md)), and from later calls if the App Key stops working.

| Situation | Rust | Go | Python, Dart, JavaScript: message contains | Action |
|---|---|---|---|---|
| The user didn't approve before the request expired | `BuilderError::RequestExpired` | `ErrRequestExpired` | `request expired` | Reconnect: start a new connection request |
| The user declined the request | `BuilderError::Client(AppApiError::UserRejected)` | `ErrUserRejected` | `user rejected connection request` | Give up: don't ask again automatically |
| The indexer is unreachable or returned an error | `BuilderError::Client(..)` or `BuilderError::Transport(..)` | a network error (`net.Error`), or `*app.HTTPError` with a 5xx `StatusCode` | `client error` or `transport error` | Retry with a new builder (see below), and check the indexer URL |
| The recovery phrase is invalid | `BuilderError::Mnemonic(..)` | an error from `Register` | `failed to parse recovery phrase` | Fix input: ask the user to re-enter it |
| The stored App Key isn't recognized: never registered, or revoked | `connected()` returns `Ok(None)` | `builder.SDK()` returns `ErrUnauthorized` | — (`connected()` returns `None` in Python, `null` in Dart and JavaScript) | Reconnect |
| The App Key is revoked while the app is running | `Error::App` containing `Api(401,` from an `Sdk` call | `*app.HTTPError` with `StatusCode` 401 (use `errors.As`) | `Api(401,` (not in Dart, whose errors don't include the HTTP status) | Reconnect |

In Python, Dart, and JavaScript, `connected()` returns `None` or `null` for an App Key the indexer doesn't recognize.

**Retry with a new builder.** A builder can't be used again after one of its calls fails. In Rust, `request_connection()`, `wait_for_approval()`, and `register()` consume the builder; only `connected()` doesn't. In Python, Dart, and JavaScript, a failed call leaves the builder unusable, and calling it again fails with a builder state error such as `invalid state`. In the browser, `connected()` is the one call that can be repeated. In Go, a builder is only used up by a call that succeeds, so a failed call can be repeated on the same builder. To retry, create a new `Builder`. If the failure came after `request_connection()`, the retry is a new approval request, so show the user the new approval URL. [Reconnect with retries](#reconnect-with-retries) shows the pattern.

Calls on the `Sdk` itself, such as `object()` and `pin_object()`, report indexer errors only as text, for example `app error: Api(404, "object not found")`. That text is the SDK's debug output, which is even less stable than its error messages. In Dart, it doesn't include the HTTP status, so a revoked App Key can't be told apart from other indexer errors.

Check the recovery phrase **before** calling `register()`: use `validate_recovery_phrase` in Rust and Python, `Sia.validateRecoveryPhrase` in Dart, or `validateRecoveryPhrase` in JavaScript. In Rust, `register()` consumes the builder, so a phrase rejected there means starting the approval flow over. The Go SDK has no validation function.

=== "Rust"
    ```rust
    use sia_storage::{AppApiError, BuilderError, Error};

    /// What to do after a call fails.
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum Action {
        /// A temporary problem: wait, then try again.
        Retry,
        /// The App Key isn't authorized: run the approval flow again.
        Reconnect,
        /// The input is wrong: fix it before trying again.
        FixInput,
        /// Retrying won't help: report the error.
        GiveUp,
    }

    /// Classifies errors from `Builder` calls.
    fn connection_action(err: &BuilderError) -> Action {
        match err {
            // The user didn't approve in time: start a new connection request.
            BuilderError::RequestExpired => Action::Reconnect,
            // The user declined: don't ask again automatically.
            BuilderError::Client(AppApiError::UserRejected) => Action::GiveUp,
            // The indexer is unreachable or returned an error.
            BuilderError::Client(_) | BuilderError::Transport(_) => Action::Retry,
            // An invalid recovery phrase, indexer URL, or pre-authorized key.
            BuilderError::Mnemonic(_)
            | BuilderError::Url(_)
            | BuilderError::PreAuthorizedKeyRejected(_) => Action::FixInput,
        }
    }

    /// Classifies errors from `Sdk` calls such as `object()` and `pin_object()`.
    /// These report indexer errors only as text in `Error::App`, for example
    /// `Api(404, "object not found\n")`, so this matches on that text.
    fn sdk_action(err: &Error) -> Action {
        let Error::App(msg) = err else {
            return Action::GiveUp;
        };
        if msg.contains("Api(401,") {
            // The App Key was revoked or expired.
            Action::Reconnect
        } else if msg.contains("Reqwest(") || msg.contains("Api(5") {
            // The indexer couldn't be reached, or had a server error.
            Action::Retry
        } else {
            Action::GiveUp
        }
    }
    ```
=== "Go"
    ```go
    import (
        "bytes"
        "context"
        "errors"
        "io"
        "net"
        "net/http"
        "strings"
        "time"

        "go.sia.tech/core/types"
        "go.sia.tech/indexd/api/app"
        "go.sia.tech/siastorage"
    )

    // Action is what to do after a call fails.
    type Action int

    const (
        GiveUp    Action = iota // retrying won't help: report the error
        Retry                   // a temporary problem: wait, then try again
        Reconnect               // the App Key isn't authorized: run the approval flow again
        FixInput                // the input is wrong: fix it before trying again
    )

    // indexerAction classifies errors from the indexer's API, which the SDK
    // passes through from calls such as Upload, PinObject and Object. ok is false
    // for errors that didn't come from the indexer.
    func indexerAction(err error) (action Action, ok bool) {
        var httpErr *app.HTTPError
        var netErr net.Error
        switch {
        case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
            // Your own context ended the call. Check this first: a deadline
            // also counts as a net.Error, but retrying it won't help.
            return GiveUp, false
        case errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusUnauthorized:
            return Reconnect, true // the App Key was revoked or expired
        case errors.As(err, &httpErr) && httpErr.StatusCode >= http.StatusInternalServerError:
            return Retry, true // a temporary problem on the indexer
        case errors.As(err, &httpErr):
            return GiveUp, true // the indexer rejected the request, such as a 400 or 404
        case errors.As(err, &netErr):
            return Retry, true // the indexer couldn't be reached
        }
        return GiveUp, false
    }

    // connectionAction classifies errors from Builder methods.
    func connectionAction(err error) Action {
        switch {
        case errors.Is(err, siastorage.ErrRequestExpired):
            return Reconnect // the user didn't approve in time: start a new request
        case errors.Is(err, siastorage.ErrUnauthorized):
            return Reconnect // the App Key was never approved, or was revoked
        case errors.Is(err, siastorage.ErrUserRejected):
            return GiveUp // the user declined: don't ask again automatically
        }
        if action, ok := indexerAction(err); ok {
            return action
        }
        return GiveUp
    }
    ```
=== "Python"
    ```python
    from enum import Enum

    from sia_storage import BuilderError, SeedError


    class Action(Enum):
        RETRY = "retry"          # a temporary problem: wait, then try again
        RECONNECT = "reconnect"  # the App Key isn't authorized: run the approval flow again
        FIX_INPUT = "fix input"  # the input is wrong: fix it before trying again
        GIVE_UP = "give up"      # retrying won't help: report the error


    def connection_action(err: Exception) -> Action:
        """Classifies errors from Builder calls and validate_recovery_phrase()."""
        msg = str(err)
        if isinstance(err, SeedError) or "recovery phrase" in msg:
            return Action.FIX_INPUT  # ask the user to re-enter their recovery phrase
        if not isinstance(err, BuilderError):
            return Action.GIVE_UP
        if msg == "request expired":
            return Action.RECONNECT  # the user didn't approve in time: start a new request
        if "user rejected" in msg:
            return Action.GIVE_UP  # the user declined: don't ask again automatically
        if msg.startswith(("client error", "transport error")):
            return Action.RETRY  # the indexer is unreachable or returned an error
        return Action.GIVE_UP


    def sdk_action(err: Exception) -> Action:
        """Classifies errors from Sdk calls such as object() and pin_object()."""
        msg = str(err)  # for example 'app error: Api(404, "object not found\n")'
        if "Api(401," in msg:
            return Action.RECONNECT  # the App Key was revoked or expired
        if "Reqwest(" in msg or "Api(5" in msg:
            return Action.RETRY  # the indexer couldn't be reached, or had a server error
        return Action.GIVE_UP
    ```
=== "Dart"
    ```dart
    /// What to do after a call fails.
    enum Action {
      /// A temporary problem: wait, then try again.
      retry,

      /// The App Key isn't authorized: run the approval flow again.
      reconnect,

      /// The input is wrong: fix it before trying again.
      fixInput,

      /// Retrying won't help: report the error.
      giveUp,
    }

    /// Classifies errors from Builder calls and Sia.validateRecoveryPhrase().
    Action connectionAction(Object err) {
      final msg = '$err';
      // Ask the user to re-enter their recovery phrase.
      if (msg.contains('recovery phrase')) return Action.fixInput;
      // The user didn't approve in time: start a new request.
      if (msg.contains('request expired')) return Action.reconnect;
      // The user declined: don't ask again automatically.
      if (msg.contains('user rejected')) return Action.giveUp;
      // The indexer is unreachable or returned an error.
      if (msg.contains('client error') || msg.contains('transport error')) {
        return Action.retry;
      }
      return Action.giveUp;
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // What to do after a call fails.
    const Action = {
      Retry: 'retry', // a temporary problem: wait, then try again
      Reconnect: 'reconnect', // the App Key isn't authorized: run the approval flow again
      FixInput: 'fix input', // the input is wrong: fix it before trying again
      GiveUp: 'give up', // retrying won't help: report the error
    }

    // The SDK throws plain Errors. The message says what went wrong.
    function errorMessage(err) {
      return err instanceof Error ? err.message : String(err)
    }

    // Classifies errors from Builder calls and validateRecoveryPhrase().
    function connectionAction(err) {
      const msg = errorMessage(err)
      // Ask the user to re-enter their recovery phrase.
      if (msg.includes('recovery phrase')) return Action.FixInput
      // The user didn't approve in time: start a new request.
      if (msg.includes('request expired')) return Action.Reconnect
      // The user declined: don't ask again automatically.
      if (msg.includes('user rejected')) return Action.GiveUp
      // The indexer is unreachable or returned an error.
      if (msg.startsWith('client error') || msg.startsWith('transport error')) {
        return Action.Retry
      }
      return Action.GiveUp
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // What to do after a call fails.
    const Action = {
      Retry: 'retry', // a temporary problem: wait, then try again
      Reconnect: 'reconnect', // the App Key isn't authorized: run the approval flow again
      FixInput: 'fix input', // the input is wrong: fix it before trying again
      GiveUp: 'give up', // retrying won't help: report the error
    }

    // The SDK throws plain Errors. The message says what went wrong.
    function errorMessage(err) {
      return err instanceof Error ? err.message : String(err)
    }

    // Classifies errors from Builder calls and validateRecoveryPhrase().
    function connectionAction(err) {
      const msg = errorMessage(err)
      // Ask the user to re-enter their recovery phrase.
      if (msg.includes('recovery phrase')) return Action.FixInput
      // The user didn't approve in time: start a new request.
      if (msg.includes('request expired')) return Action.Reconnect
      // The user declined: don't ask again automatically.
      if (msg.includes('user rejected')) return Action.GiveUp
      // The indexer is unreachable or returned an error.
      if (msg.startsWith('client error') || msg.startsWith('transport error')) {
        return Action.Retry
      }
      return Action.GiveUp
    }
    ```

## Upload errors

| Situation | Rust | Go | Python, Dart, JavaScript: message contains | Action |
|---|---|---|---|---|
| Too few storage providers when the upload starts | `UploadError::QueueError(QueueError::InsufficientHosts)` | an error containing `not enough hosts available` (no sentinel) | `not enough initial hosts` | Retry: wait, then upload again from the start |
| Storage providers ran out partway through | `UploadError::QueueError(QueueError::NoMoreHosts)` | `ErrNoMoreHosts` | `no more hosts available` | Retry |
| Too few shards of a slab were stored | `UploadError::NotEnoughShards(got, need)` | — | `not enough shards` | Retry |
| The indexer kept rejecting a slab as too old to pin | `UploadError::StaleSlab(attempts)` | — | `slab stale` (not in Dart) | Retry |
| Invalid erasure-coding options | `UploadError::InvalidOptions(..)` | an error from invalid `WithRedundancy` values (no sentinel) | `invalid options` | Fix input: check the data and parity shard counts |
| `start_offset` is past the end of the object | `UploadError::OutOfRange(offset, size)` | — (no overwrite option) | `invalid range` (not in Dart, which has no `startOffset` option) | Fix input |
| Reading your source failed | `UploadError::Io(..)` | your reader's error, wrapped (use `errors.Is`) | `i/o error` (JavaScript, and Python's `upload_path`). In Python and Dart, a failing source panics instead: see the note below. | Fix input: fix the source, then upload again |
| Pinning a slab failed after the SDK's own retries | `UploadError::ApiError(..)` | `*app.HTTPError`, or a network error | `api error` | Retry on a network error or 5xx, Reconnect on 401 (Dart: network errors only), otherwise Give up |
| You cancelled the upload | `UploadError::Cancelled` | `context.Canceled` | `upload cancelled` | Give up |

There's no timeout error. When a storage provider stalls, the SDK moves its shard to another provider, and you only see an error if too many fail. That error is one of the retryable ones above.

A failed upload returns no object. Slabs stored before the failure aren't referenced by any object, and the [reconciliation sweep](./delete-objects.md#running-the-reconciliation-sweep) releases them.

> [!NOTE]
> The Dart SDK is built on an older release of the Rust SDK. It also reports `timeout error: …`, which the Dart sample treats as retryable, and it has no `slab stale` error or `startOffset` option.

> [!NOTE]
> In the Python and Dart SDKs, an exception raised while reading your upload source doesn't come back as an `i/o error`. The SDK panics internally and reports it as `task error: … panicked` in Python or as a `PanicException` in Dart, and the samples below treat both as **give up**. Check that a file or stream can be read before you upload it, and handle read errors inside your source. Python's `upload_path` isn't affected: a file it can't read is reported as `i/o error`.

=== "Rust"
    ```rust
    use sia_storage::{QueueError, UploadError};

    /// Classifies errors from `Sdk::upload`.
    fn upload_action(err: &UploadError) -> Action {
        match err {
            // Too few storage providers: upload again from the start.
            UploadError::QueueError(QueueError::InsufficientHosts | QueueError::NoMoreHosts)
            | UploadError::NotEnoughShards(..)
            | UploadError::StaleSlab(_) => Action::Retry,
            // The App Key was revoked while slabs were being pinned.
            UploadError::ApiError(AppApiError::Api(status, _)) if status.as_u16() == 401 => {
                Action::Reconnect
            }
            // The indexer couldn't be reached, or had a server error, while slabs
            // were being pinned. The SDK has already retried; upload again later.
            // Other indexer responses, such as 400 or 404, aren't worth retrying.
            UploadError::ApiError(AppApiError::Reqwest(_)) => Action::Retry,
            UploadError::ApiError(AppApiError::Api(status, _)) if status.is_server_error() => {
                Action::Retry
            }
            // Invalid options, a start_offset past the end of the object, or an
            // error reading the source.
            UploadError::InvalidOptions(_) | UploadError::OutOfRange(..) | UploadError::Io(_) => {
                Action::FixInput
            }
            _ => Action::GiveUp,
        }
    }
    ```
=== "Go"
    ```go
    // uploadAction classifies errors from SDK.Upload.
    func uploadAction(err error) Action {
        switch {
        case errors.Is(err, siastorage.ErrNoMoreHosts):
            return Retry // hosts dropped out mid-upload: upload again from the start
        case strings.Contains(err.Error(), "not enough hosts available"):
            return Retry // too few hosts at the start (this error has no sentinel)
        }
        // Pinning a slab failed. The SDK already retried a few times.
        if action, ok := indexerAction(err); ok {
            return action
        }
        // Includes context cancellation, invalid WithRedundancy values,
        // and errors from your reader (match those with errors.Is).
        return GiveUp
    }
    ```
=== "Python"
    ```python
    from sia_storage import UploadError


    def upload_action(err: Exception) -> Action:
        """Classifies errors from Sdk.upload()."""
        if not isinstance(err, UploadError):
            return Action.GIVE_UP
        msg = str(err)
        if msg.startswith((
            "not enough shards",
            "queue error: not enough initial hosts",
            "queue error: no more hosts",
            "slab stale",
        )):
            return Action.RETRY  # too few storage providers: upload again from the start
        if "responded with an error: 401" in msg:
            return Action.RECONNECT  # the App Key was revoked while slabs were being pinned
        if msg.startswith("api error: http error") or "responded with an error: 5" in msg:
            return Action.RETRY  # the indexer was unreachable or had a server error while pinning
        if msg.startswith(("invalid options", "invalid range", "i/o error")):
            return Action.FIX_INPUT  # bad options or start_offset, or upload_path couldn't read the file
        return Action.GIVE_UP
    ```
=== "Dart"
    ```dart
    /// Classifies errors from awaiting `sdk.upload(...).result`.
    Action uploadAction(Object err) {
      final msg = '$err';
      // Too few storage providers: upload again from the start.
      if (msg.contains('not enough shards') ||
          msg.contains('not enough initial hosts') ||
          msg.contains('no more hosts') ||
          msg.contains('timeout error')) {
        return Action.retry;
      }
      // The indexer couldn't be reached while slabs were being pinned. Dart's
      // errors from the indexer don't include the HTTP status, so a revoked
      // App Key or a server error can't be told apart from a rejection.
      if (msg.contains('api error: http error')) return Action.retry;
      // Invalid data or parity shard counts.
      if (msg.contains('invalid options')) return Action.fixInput;
      return Action.giveUp;
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // Messages for problems that go away if you wait and upload again.
    const RETRY_UPLOAD = ['not enough shards', 'not enough initial hosts', 'no more hosts', 'slab stale']

    // Classifies errors from sdk.upload().
    function uploadAction(err) {
      const msg = errorMessage(err)
      // Too few storage providers: upload again from the start.
      if (RETRY_UPLOAD.some((text) => msg.includes(text))) return Action.Retry
      // The App Key was revoked while slabs were being pinned.
      if (msg.includes('responded with an error: 401')) return Action.Reconnect
      // The indexer was unreachable or had a server error while pinning.
      if (msg.startsWith('api error: http error') || msg.includes('responded with an error: 5')) {
        return Action.Retry
      }
      // Bad options or startOffset, or the source stream failed.
      if (['invalid options', 'invalid range', 'i/o error'].some((text) => msg.startsWith(text))) {
        return Action.FixInput
      }
      return Action.GiveUp
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Messages for problems that go away if you wait and upload again.
    const RETRY_UPLOAD = ['not enough shards', 'not enough initial hosts', 'no more hosts', 'slab stale']

    // Classifies errors from sdk.upload().
    function uploadAction(err) {
      const msg = errorMessage(err)
      // Too few storage providers: upload again from the start.
      if (RETRY_UPLOAD.some((text) => msg.includes(text))) return Action.Retry
      // The App Key was revoked while slabs were being pinned.
      if (msg.includes('responded with an error: 401')) return Action.Reconnect
      // The indexer was unreachable or had a server error while pinning.
      if (msg.startsWith('api error: http error') || msg.includes('responded with an error: 5')) {
        return Action.Retry
      }
      // Bad options or startOffset, or the source stream failed.
      if (['invalid options', 'invalid range', 'i/o error'].some((text) => msg.startsWith(text))) {
        return Action.FixInput
      }
      return Action.GiveUp
    }
    ```

## Download errors

| Situation | Rust | Go | Python, Dart, JavaScript: message contains | Action |
|---|---|---|---|---|
| Too few storage providers returned the data | `DownloadError::NotEnoughShards(got, need)` | `ErrNotEnoughShards` | `not enough shards` | Retry after a delay: some providers may be offline for a while |
| You read from a download that already failed | `DownloadError::Errored` | — | `download errored` | Retry with a new `download()` call. The old one can't be read again. |
| The object's slab metadata is invalid | `DownloadError::InvalidSlab(..)` | — | `invalid slab` | Give up: retrying won't fix it, and the object may need to be uploaded again |
| Writing the data failed | a plain `std::io::Error` | your writer's error | your own code's error | Fix input |

In Rust, reading a `Download` returns a `std::io::Error` with the `DownloadError` inside. The sample gets it back with `get_ref()` and `downcast_ref`.

An `offset` or `length` past the end of the object isn't an error. The range is clamped to the object's size, so an `offset` past the end downloads nothing. Compare against `object.size()` first if your app needs to tell the difference.

=== "Rust"
    ```rust
    use sia_storage::DownloadError;

    /// Classifies errors from reading a `Download`. They arrive as
    /// `std::io::Error`, with the `DownloadError` inside.
    fn download_action(err: &std::io::Error) -> Action {
        match err.get_ref().and_then(|inner| inner.downcast_ref::<DownloadError>()) {
            // Too few hosts responded, or this handle failed on an earlier read:
            // start a new download after a delay.
            Some(DownloadError::NotEnoughShards(..) | DownloadError::Errored) => Action::Retry,
            // An error from your writer, not from the network.
            None => Action::FixInput,
            // For example InvalidSlab: retrying won't fix the object's metadata.
            Some(_) => Action::GiveUp,
        }
    }
    ```
=== "Go"
    ```go
    // downloadAction classifies errors from reading a Download stream.
    func downloadAction(err error) Action {
        if errors.Is(err, siastorage.ErrNotEnoughShards) {
            return Retry // too few hosts responded: retry after a delay
        }
        return GiveUp
    }
    ```
=== "Python"
    ```python
    from sia_storage import DownloadError


    def download_action(err: Exception) -> Action:
        """Classifies errors from reading a Download."""
        if not isinstance(err, DownloadError):
            return Action.GIVE_UP
        msg = str(err)
        if msg.startswith(("not enough shards", "download errored")):
            return Action.RETRY  # too few hosts responded: start a new download later
        return Action.GIVE_UP  # for example "invalid slab: ...": retrying won't help
    ```
=== "Dart"
    ```dart
    /// Classifies errors from reading `sdk.download(...).data`.
    Action downloadAction(Object err) {
      final msg = '$err';
      // Too few hosts responded: start a new download later.
      if (msg.contains('not enough shards') ||
          msg.contains('download errored') ||
          msg.contains('timeout error')) {
        return Action.retry;
      }
      // For example "invalid slab": retrying won't help.
      return Action.giveUp;
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // Classifies errors from reading a sdk.download() stream.
    function downloadAction(err) {
      const msg = errorMessage(err)
      // Too few hosts responded: start a new download later.
      if (msg.includes('not enough shards') || msg.includes('download errored')) {
        return Action.Retry
      }
      // For example "invalid slab: ...": retrying won't help.
      return Action.GiveUp
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Classifies errors from reading a sdk.download() stream.
    function downloadAction(err) {
      const msg = errorMessage(err)
      // Too few hosts responded: start a new download later.
      if (msg.includes('not enough shards') || msg.includes('download errored')) {
        return Action.Retry
      }
      // For example "invalid slab: ...": retrying won't help.
      return Action.GiveUp
    }
    ```

## Retry with backoff

Retry only when the classifier says **retry**, wait longer after each failure, and stop after a few attempts. This helper doubles the wait after each failure, up to one minute, and gives up after five attempts by default:

=== "Rust"
    ```rust
    use std::future::Future;
    use std::time::Duration;

    /// Runs `op` until it succeeds, `classify` says retrying won't help, or
    /// `max_attempts` is reached. The wait doubles after each failure, up to a minute.
    async fn with_retry<T, E, F, Fut>(
        max_attempts: u32,
        first_delay: Duration,
        classify: impl Fn(&E) -> Action,
        mut op: F,
    ) -> Result<T, E>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = Result<T, E>>,
    {
        let mut delay = first_delay;
        let mut attempt = 1;
        loop {
            match op().await {
                Err(err) if attempt < max_attempts && classify(&err) == Action::Retry => {
                    tokio::time::sleep(delay).await;
                    delay = (delay * 2).min(Duration::from_secs(60));
                    attempt += 1;
                }
                result => return result,
            }
        }
    }
    ```
=== "Go"
    ```go
    // withRetry runs op until it succeeds, classify says retrying won't help,
    // or maxAttempts is reached. The wait doubles after each failure, up to a minute.
    func withRetry[T any](ctx context.Context, maxAttempts int, firstDelay time.Duration, classify func(error) Action, op func() (T, error)) (T, error) {
        delay := firstDelay
        for attempt := 1; ; attempt++ {
            v, err := op()
            if err == nil || attempt >= maxAttempts || classify(err) != Retry {
                return v, err
            }
            select {
            case <-ctx.Done():
                return v, ctx.Err()
            case <-time.After(delay):
            }
            delay = min(delay*2, time.Minute)
        }
    }
    ```
=== "Python"
    ```python
    import asyncio


    async def with_retry(op, classify, max_attempts=5, first_delay=2.0):
        """Awaits op() until it succeeds, classify says retrying won't help, or
        max_attempts is reached. The wait doubles after each failure, up to a minute."""
        delay = first_delay
        for attempt in range(1, max_attempts + 1):
            try:
                return await op()
            except Exception as err:
                if attempt == max_attempts or classify(err) != Action.RETRY:
                    raise
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)
    ```
=== "Dart"
    ```dart
    /// Runs [op] until it succeeds, [classify] says retrying won't help, or
    /// [maxAttempts] is reached. The wait doubles after each failure, up to a minute.
    Future<T> withRetry<T>(
      Future<T> Function() op,
      Action Function(Object) classify, {
      int maxAttempts = 5,
      Duration firstDelay = const Duration(seconds: 2),
    }) async {
      const maxDelay = Duration(minutes: 1);
      var delay = firstDelay;
      for (var attempt = 1; ; attempt++) {
        try {
          return await op();
        } catch (err) {
          if (attempt >= maxAttempts || classify(err) != Action.retry) rethrow;
        }
        await Future<void>.delayed(delay);
        delay = delay * 2 > maxDelay ? maxDelay : delay * 2;
      }
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    // Runs op until it succeeds, classify says retrying won't help, or
    // maxAttempts is reached. The wait doubles after each failure, up to a minute.
    async function withRetry(op, classify, { maxAttempts = 5, firstDelayMs = 2000 } = {}) {
      let delay = firstDelayMs
      for (let attempt = 1; ; attempt++) {
        try {
          return await op()
        } catch (err) {
          if (attempt >= maxAttempts || classify(err) !== Action.Retry) throw err
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, 60_000)
      }
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    // Runs op until it succeeds, classify says retrying won't help, or
    // maxAttempts is reached. The wait doubles after each failure, up to a minute.
    async function withRetry(op, classify, { maxAttempts = 5, firstDelayMs = 2000 } = {}) {
      let delay = firstDelayMs
      for (let attempt = 1; ; attempt++) {
        try {
          return await op()
        } catch (err) {
          if (attempt >= maxAttempts || classify(err) !== Action.Retry) throw err
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, 60_000)
      }
    }
    ```

## Reconnect with retries

Reconnecting with a stored App Key is the most common place to retry a builder call, for example when the app starts while offline. Each attempt makes a new builder, because a builder can't be reused after a failed call (see [Connection errors](#connection-errors)). An App Key the indexer doesn't recognize isn't retried: it returns no SDK, and your app runs the [approval flow](../quickstart/connect-to-an-indexer.md) again.

The approval flow works the same way. If `request_connection()` or `wait_for_approval()` fails with an error worth retrying, start again from a new builder and show the user the new approval URL. The old request can't be resumed.

These samples use the indexer URL and app metadata from [Connect a Storage Account](../quickstart/connect-to-an-indexer.md).

=== "Rust"
    ```rust
    use sia_storage::{AppKey, Builder, Sdk};

    /// Connects with a stored App Key, retrying while the indexer is unreachable.
    /// Returns `None` if the key isn't recognized, so the app needs to run the
    /// approval flow again.
    async fn reconnect(app_key: &AppKey) -> Result<Option<Sdk>, BuilderError> {
        with_retry(5, Duration::from_secs(2), connection_action, move || async move {
            // A builder can't be reused after a failed call, so make a new one
            // for every attempt.
            Builder::new(INDEXER_URL, APP_META)?.connected(app_key).await
        })
        .await
    }
    ```
=== "Go"
    ```go
    // reconnect connects with a stored App Key, retrying while the indexer is
    // unreachable. It returns ErrUnauthorized if the key isn't recognized, so the
    // app needs to run the approval flow again.
    func reconnect(ctx context.Context, appKey types.PrivateKey) (*siastorage.SDK, error) {
        return withRetry(ctx, 5, 2*time.Second, connectionAction, func() (*siastorage.SDK, error) {
            // Go's builder could be reused after a failed call, but a new one for
            // every attempt works the same way in every SDK.
            return siastorage.NewBuilder(indexerURL, appMeta).SDK(appKey)
        })
    }
    ```
=== "Python"
    ```python
    from sia_storage import Builder


    async def reconnect(app_key):
        """Connects with a stored App Key, retrying while the indexer is unreachable.
        Returns None if the key isn't recognized, so the app needs to run the
        approval flow again."""
        async def connect():
            # A builder can't be reused after a failed call, so make a new one
            # for every attempt.
            return await Builder(INDEXER_URL, meta).connected(app_key)

        return await with_retry(connect, connection_action)
    ```
=== "Dart"
    ```dart
    /// Connects with a stored App Key, retrying while the indexer is unreachable.
    /// Returns null if the key isn't recognized, so the app needs to run the
    /// approval flow again.
    Future<Sdk?> reconnect(AppKey appKey) {
      return withRetry(() async {
        // A builder can't be reused after a failed call, so make a new one for
        // every attempt.
        final builder = await Sia.builder(indexerUrl: indexerUrl, appMeta: appMeta);
        return builder.connected(appKey: appKey);
      }, connectionAction);
    }
    ```
=== "JavaScript (Node)"
    ```javascript
    import { Builder } from '@siafoundation/sia-storage'

    // Connects with a stored App Key, retrying while the indexer is unreachable.
    // Resolves to no SDK (null or undefined) if the key isn't recognized, so the
    // app needs to run the approval flow again.
    async function reconnect(appKey) {
      // A builder can't be reused after a failed call, so make a new one for
      // every attempt.
      return withRetry(() => new Builder(INDEXER_URL, appMeta).connected(appKey), connectionAction)
    }
    ```
=== "JavaScript (Browser)"
    ```javascript
    import { Builder } from '@siafoundation/sia-storage'

    // Connects with a stored App Key, retrying while the indexer is unreachable.
    // Resolves to no SDK (null or undefined) if the key isn't recognized, so the
    // app needs to run the approval flow again.
    async function reconnect(appKey) {
      // A builder can't be reused after a failed call, so make a new one for
      // every attempt.
      return withRetry(() => new Builder(INDEXER_URL, appMeta).connected(appKey), connectionAction)
    }
    ```

## Upload and download with retries

These samples assume a connected `sdk` from [Connect a Storage Account](../quickstart/connect-to-an-indexer.md) (in Go, `client` and a `ctx`), plus the `Action` type, the classifiers, and the retry helper from the sections above.

Each attempt starts from scratch: a fresh source for an upload, and a new `download()` call for a download, because a failed attempt may have used up the old one. That's why the data to upload is kept in memory, where every attempt can read it again from the start. A stream or an open file can only be read once, so a retry would upload whatever was left. For a file on disk, use `upload_path()` in Python, or in Rust with the crate's `fs` feature, which opens the file again on every attempt. Pin the object once, after the upload succeeds.

=== "Rust"
    ```rust
    use sia_storage::{DownloadOptions, Object, UploadOptions};

    // Keep the data in memory, so every attempt can read it from the start.
    let data: Vec<u8> = b"Hello world!".to_vec();

    // Each attempt starts from scratch, because a failed attempt may have used
    // up its reader or download handle. The closures borrow `sdk`, `data` and `obj`.
    let (sdk, data) = (&sdk, &data);

    let obj = with_retry(5, Duration::from_secs(2), upload_action, move || {
        let reader = std::io::Cursor::new(data.clone());
        sdk.upload(Object::default(), reader, UploadOptions::default())
    })
    .await?;
    sdk.pin_object(&obj).await?;

    let obj = &obj;
    let bytes = with_retry(5, Duration::from_secs(2), download_action, move || async move {
        let mut download = sdk
            .download(obj, DownloadOptions::default())
            .map_err(std::io::Error::other)?;
        let mut bytes = Vec::new();
        tokio::io::copy(&mut download, &mut bytes).await?;
        Ok::<_, std::io::Error>(bytes)
    })
    .await?;
    ```
=== "Go"
    ```go
    // Keep the data in memory, so every attempt can read it from the start.
    data := []byte("Hello world!")

    // Each attempt starts from scratch, because a failed attempt may have
    // used up its reader or download stream.
    obj, err := withRetry(ctx, 5, 2*time.Second, uploadAction, func() (siastorage.Object, error) {
        obj := siastorage.NewEmptyObject()
        err := client.Upload(ctx, &obj, bytes.NewReader(data))
        return obj, err
    })
    if err != nil {
        panic(err)
    }
    if err := client.PinObject(ctx, obj); err != nil {
        panic(err)
    }

    downloaded, err := withRetry(ctx, 5, 2*time.Second, downloadAction, func() ([]byte, error) {
        rc, err := client.Download(obj)
        if err != nil {
            return nil, err
        }
        defer rc.Close()
        // Download doesn't take a context, so close the stream if ctx ends.
        stop := context.AfterFunc(ctx, func() { rc.Close() })
        defer stop()
        return io.ReadAll(rc)
    })
    if err != nil {
        panic(err)
    }
    ```
=== "Python"
    ```python
    from sia_storage import PinnedObject

    # Bytes, not a file: a file is used up by the first attempt, so a retry
    # would upload whatever was left.
    data = b"Hello world!"

    # Each attempt starts from scratch, because a failed attempt may have
    # used up its reader or download.
    async def upload():
        return await sdk.upload(PinnedObject(), data)

    obj = await with_retry(upload, upload_action)
    await sdk.pin_object(obj)

    async def download():
        async with sdk.download(obj) as d:
            return await d.read_all()

    downloaded = await with_retry(download, download_action)
    ```
=== "Dart"
    ```dart
    import 'dart:convert';

    import 'package:sia_storage/sia_storage.dart';

    // Keep the data in memory, so every attempt can read it from the start.
    final data = utf8.encode('Hello world!');

    // Each attempt starts from scratch, because a failed attempt may have
    // used up its source stream or download.
    final obj = await withRetry(
      () => sdk.upload(object: PinnedObject(), source: Stream.value(data)).result,
      uploadAction,
    );
    await sdk.pinObject(object: obj);

    final downloaded = await withRetry(() async {
      final bytes = <int>[];
      await for (final chunk in sdk.download(object: obj).data) {
        bytes.addAll(chunk);
      }
      return bytes;
    }, downloadAction);
    ```
=== "JavaScript (Node)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    // A Blob can be read again on every attempt; a stream can only be read once.
    const data = new Blob(['Hello world!'])

    // Each attempt starts from scratch, because a failed attempt may have
    // used up its source stream or download.
    const obj = await withRetry(
      () => sdk.upload(new PinnedObject(), data.stream()),
      uploadAction,
    )
    await sdk.pinObject(obj)

    const downloaded = await withRetry(async () => {
      const reader = sdk.download(obj).getReader()
      const chunks = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return new Blob(chunks)
        chunks.push(value)
      }
    }, downloadAction)
    ```
=== "JavaScript (Browser)"
    ```javascript
    import { PinnedObject } from '@siafoundation/sia-storage'

    // A Blob can be read again on every attempt; a stream can only be read once.
    const data = new Blob(['Hello world!'])

    // Each attempt starts from scratch, because a failed attempt may have
    // used up its source stream or download.
    const obj = await withRetry(
      () => sdk.upload(new PinnedObject(), data.stream()),
      uploadAction,
    )
    await sdk.pinObject(obj)

    const downloaded = await withRetry(async () => {
      const reader = sdk.download(obj).getReader()
      const chunks = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return new Blob(chunks)
        chunks.push(value)
      }
    }, downloadAction)
    ```
