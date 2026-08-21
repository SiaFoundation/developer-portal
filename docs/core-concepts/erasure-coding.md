---
title: Erasure Coding
description: How Sia splits data across many storage providers so it survives massive host failures with modest overhead.
---

# Erasure Coding

Erasure coding is what makes data on Sia durable. Instead of storing one copy of your data on one host, the SDK splits each slab into **N data shards** and adds **M parity shards** computed from the data. The original slab can be reconstructed from **any N of the N+M shards** — the rest can disappear and the data is still intact.

Sia's default is **10 data + 20 parity = 30 total shards** per slab. Each shard goes to a different [storage provider](./storage-providers.md), so for a slab to become unrecoverable, more than 20 of the 30 hosts holding it would have to be unreachable simultaneously.

## Why this matters

A naive way to make data durable is replication: store three copies, lose any two hosts and you still have one. That costs 3× the raw size and tolerates 2 host failures.

Sia's 10-of-30 erasure coding costs the same 3× — but tolerates **20 host failures** instead of 2. The probability of losing data isn't just better; it's many orders of magnitude better.

| Scheme              | Storage overhead | Hosts that can fail |
|---------------------|------------------|---------------------|
| 3× replication      | 3×               | 2                   |
| 10-of-30 erasure    | 3×               | 20                  |

For independent host failures at any reasonable rate, this is the difference between "data eventually disappears" and "data effectively never disappears."

## Cost on the wire

Erasure coding isn't free on upload. Pushing a slab to the network transfers `(N+M)/N` × the raw size (3× by default). Downloads, on the other hand, only fetch the N data shards under normal conditions; parity is requested only if a data shard is unreachable, so download bandwidth tracks the raw size.

This is why progress for [uploads vs. downloads](../recipes/track-progress.md) uses different denominators.

## Tunable durability

`UploadOptions` exposes `data_shards` and `parity_shards`. Higher parity gives more durability and more upload bandwidth; lower parity is cheaper and leaves a thinner margin. The SDK validates the combination, rejecting configurations whose recovery probability falls below a safe threshold or whose redundancy ratio is outside `[1.5×, 4×]`, so you can't accidentally choose a setting that compromises durability.

The defaults are tuned for the typical case -- they do not need to be changed.

## Upload resilience

A shard upload doesn't hang forever if a storage provider stalls: the SDK retries a failed shard against a different host up to three times before giving up, with a default 1.5-minute timeout per attempt. Racing and host prioritization still favor faster providers once the upload has warmed up, so a slow host doesn't get retried at the expense of overall throughput.
