---
title: Storage providers
---

# Storage providers

Storage providers are nodes that run Sia’s hosting software, `hostd`. They contribute disk space and bandwidth to the Sia network and earn Siacoin (SC) by storing data and proving that it remains available over time.

## Overview

A storage provider:

- runs `hostd` on a machine with stable storage, power, and connectivity
- announces available capacity, pricing, and collateral settings to the network
- accepts storage contracts from renters (such as indexers)
- stores encrypted shards of user data for the duration of those contracts
- submits storage proofs showing the data is still available

As long as the storage provider meets its contract terms, it receives payments in SC. If it fails, it risks losing expected revenue and any **collateral** it locked into those contracts.

## Who are they?

A storage provider is anyone running `hostd`: an individual with a home server or NAS, a small operator with a few machines in a data center, or a company integrating Sia storage into its product.

On the network, they all look the same: each storage provider announces its capacity and bandwidth, pricing (storage, egress, and contract fees), and builds a track record of uptime and responsiveness that renters can score.

## Why they exist

Storage providers are what make Sia’s decentralized storage layer real. Instead of trusting a single cloud vendor, the network relies on many independent nodes that turn raw disk and bandwidth into verifiable storage. They exist to:

- **Distribute control and failure domains:** data is encrypted, erasure-coded, and spread across many unrelated storage providers so no single operator or outage can take it offline.
- **Back durability with incentives:** storage providers lock collateral into contracts and must submit proofs; losing data can burn collateral, while honest uptime is rewarded in Siacoin (SC).
- **Create an open storage marketplace:** anyone with excess capacity can join, set prices, and compete for renter demand instead of relying on a single provider’s pricing and policies.

In short, storage providers ensure that Sia’s storage layer is controlled by the network, **not by a single entity**.

## How do they fit?

In an indexer-based architecture, storage providers sit at the edge of the network. They store slabs and answer read/write requests, while renters (often indexers) handle contracts and payments.

Apps talk to both:

- to the **indexer** for object metadata, account logic, and slab layout, and  
- to **storage providers** to upload and download the encrypted shards that make up those slabs.

From the storage provider’s perspective, the world is simple:

- it negotiates and maintains storage contracts and payment accounts with renters,
- it receives and serves encrypted shards, never filenames or object IDs, and
- it focuses on staying online, serving sectors, and submitting storage proofs.

``` mermaid
flowchart LR

    %% === Brand color classes ===
    classDef user fill:#76E6EB,stroke:#4bbdc2,stroke-width:2px,color:#000;        %% powder
    classDef apps fill:#FF7919,stroke:#c85f14,stroke-width:2px,color:#000;        %% zest
    classDef indexer fill:#E50AAE,stroke:#b10887,stroke-width:2px,color:#000;     %% punch
    classDef hosts fill:#36D955,stroke:#27a93e,stroke-width:2px,color:#000;       %% slime

    %% === Nodes ===
    U["User"]:::user
    A["Apps"]:::apps
    I["Indexer"]:::indexer

    %% Hosts group
    subgraph HOSTS["Hosts"]
        direction TB
        H1["Host 1"]:::hosts
        H2["Host 2"]:::hosts
        H3["Host 3"]:::hosts
    end

    %% === Flows ===
    U --> A
    A <--> I
    I --> HOSTS
    A <--> HOSTS
```

<!-- ## Who pays them in the indexer model? -->