---
title: "CUDA Orderbook"
description: "A GPU pipeline that reconstructs a live limit order book from raw NASDAQ ITCH data and backtests 10,000 trading strategies against it in parallel."
tags: ["CUDA", "C++"]
github: "https://github.com/MadhavMenon10/CUDA-Orderbook"
image: "/projects/cuda-orderbook.png"
imageAlt: "Nsight Systems CUDA GPU kernel summary profiling output"
imageFit: "contain"
order: 0
draft: false
---

A GPU pipeline that parses raw NASDAQ TotalView ITCH 5.0 market data, reconstructs
a live limit order book for every traded symbol, and sweeps 10,000 trading
strategy configurations against the reconstructed book in parallel on the GPU.

## Results

Tested against the 2019-08-30 NASDAQ TotalView-ITCH 5.0 file from the
[NASDAQ Public Archive](https://emi.nasdaq.com/ITCH/Nasdaq%20ITCH/), run on an
NVIDIA H100 SXM cloud instance:

- **305,105,310 messages** reconstructed in **69.5s** (~4.4M msgs/sec)
- **10,000 strategy configs** backtested in **83.8s**

## Pipeline

**Parsing.** ITCH files can be 10+ GB, so a custom `ItchReader`/`ItchDecoder`
streams fixed-size chunks from disk instead of loading the whole file, decoding
messages into a struct-of-arrays layout so data stays contiguous for the GPU.

**GPU hash table.** Reconstruction needs to look up, insert, and delete order
state hundreds of millions of times from inside a kernel running thousands of
warps at once, so the hash table lives entirely on the GPU (avoiding host
round-trips) and uses atomics so concurrent warps agree on its state. It's sized
for a ~50% load factor with two sentinel values — empty vs. tombstoned — since a
lookup has to keep scanning past a tombstone but an insert can claim either.

**Compacting by symbol.** The raw ITCH stream interleaves every symbol in
timestamp order. `SymbolCompactor` uses `cub::DeviceRadixSort` plus a
`thrust::gather` pass to regroup it into contiguous per-symbol blocks in device
memory, so each warp can read a sequential slice instead of scanning past every
other symbol's messages.

**Reconstruction.** One warp per symbol, one warp per block. A symbol's messages
are causally ordered (a `Cancel` can't run before its `Add`), so a symbol has to
process sequentially — but symbols are independent of each other, so the
parallelism comes from running thousands of symbols' warps concurrently, not
from splitting one message across threads. All 32 threads in a warp collaborate
on the book itself: each thread owns a slice of price levels via a hash
function, and after every message a 5-round warp shuffle finds the top 5 bid/ask
levels.

**Backtesting.** 10,000 strategy configs, one per block, each walking the tick
stream on a single thread since a strategy's decision at tick `N` depends on its
decision at tick `N-1`. The parallelism is entirely across the 10,000
independent walks. Ticks come out of reconstruction claimed via a global atomic
counter (so write order isn't chronological), so `TickCompactor` re-sorts them
by symbol using the same sort/gather/run-length-encode approach as
`SymbolCompactor` before backtesting runs.

## Challenges

The main constraint was shared memory. The per-thread price-level array started
at 16 entries, which failed on heavily-traded symbols against real data; raising
it to 64 still wasn't enough, and pushing further hit the GPU's 49,152
bytes/block shared memory ceiling outright — the kernel failed to link at 96.
The real ceiling on this hardware works out to around 94 price levels per
thread.

## Limitations

One symbol out of ~9,000 in the test file still produces a small number of
reconstruction failures (99 out of 305,105,310 messages) even at the shared
memory ceiling. There's also some deliberate over-allocation: `SymbolCompactor`'s
offset tables are sized to the full message count because the true unique-symbol
count isn't known until after the run-length-encode pass, and `ticks_` is
similarly over-allocated since the exact number of ticks written isn't known
until after reconstruction finishes.

Full write-up, code, and more profiling detail in the
[repository](https://github.com/MadhavMenon10/CUDA-Orderbook).
