---
title: "GBDT Inference Engine"
description: "A from-scratch CUDA inference engine for XGBoost tree ensembles, and a benchmark suite that measures where GPU inference actually beats a well-tuned CPU baseline."
tags: ["CUDA", "C++", "Python"]
github: "https://github.com/MadhavMenon10/gbdt-inference-engine"
image: "/projects/gbdt-inference-engine.png"
imageAlt: "Latency vs batch size for TreeInfer (GPU), XGBoost (CPU), and RAPIDS FIL on a 99-tree ensemble"
imageFit: "contain"
order: 1
draft: false
---

A CUDA inference engine for XGBoost gradient-boosted decision tree ensembles,
built without using any existing tree-inference library, and a benchmark suite
that measures where GPU inference actually beats a well-tuned CPU baseline. The
engine parses XGBoost's serialised JSON model into its own in-memory
representation, flattens every tree into a complete binary array laid out for
the device, traverses the whole ensemble in one kernel, and reports
host-to-device transfer, kernel execution, and device-to-host transfer as three
separate numbers instead of one blended wall-clock figure.

The point is the measurement more than the kernel. Published GPU tree-inference
benchmarks usually compare against scikit-learn, which is not a serious CPU
baseline. Here the comparison is XGBoost's own native C API predict path, run on
the same physical machine as the GPU, plus NVIDIA's RAPIDS Forest Inference
Library (FIL) as a third reference point.

## Results

Everything was measured on one Runpod pod — an RTX 4090 (128 SMs, 72 MB L2)
alongside a 16-core Ryzen 9 7950X — so the GPU kernel and the CPU baseline share
a machine, a memory subsystem, and a thermal envelope. Timing GPU latency on a
rented instance and CPU latency on a laptop would have made the crossover claim
meaningless.

One booster is trained to 333 rounds and then sliced by boosting round into ten
ensembles of 99 to 999 trees, so every ensemble is literally a prefix of the
larger ones and tree count is the only thing that varies. All three benchmarks
sweep the same fifteen geometric batch sizes (1 to 10,000) and run 50 seeded
trials per point against the same 15,000-row sample pool.

**There is no crossover in the tested range — the GPU is already ahead at batch
size 1, against both baselines, for every one of the ten ensemble sizes.** At a
batch of a single sample, median end-to-end GPU latency sits at 0.023–0.024 ms
and barely moves from 99 trees to 999, while XGBoost's native predict path on
the same machine ranges from 0.090 ms to 0.160 ms — a 3.9x to 6.8x speedup.

The tails are the more interesting half. GPU p99 stays within about 30% of GPU
median, while CPU p99 runs two to four times CPU median and gets worse as the
ensemble grows; at 699 trees the CPU p99 is 0.545 ms against a 0.144 ms median.
Re-running the whole crossover analysis at p99 rather than median moves nothing.

## Why the GPU wins at batch 1

Every GPU stage has a fixed floor that a single sample never comes close to
touching, and that floor is smaller than what XGBoost spends per call. At 999
trees and batch 1, the 36 bytes of input take 4.6 µs to move — pure fixed cost,
since the same transfer at batch 10,000 moves ten thousand times the data in ten
times the wall clock. The kernel holds between 6.1 and 7.2 µs from batch 1 all
the way to batch 16, almost none of which is arithmetic.

The thread mapping matters here. Each thread handles one `(sample, tree)` pair,
and `tree_idx` is the fast-varying half of the global id, so 32 consecutive
threads in a warp traverse 32 different trees against the same sample. A batch of
one against a 999-tree ensemble still launches 999 threads across 4 blocks
instead of leaving a single lane doing all the work. The alternative mapping
would have put 31 of 32 lanes idle in exactly the regime the benchmark exists to
characterise.

## Where it stops winning

Running the sweep out to 10,000 samples flips the result for nine of the ten
ensembles, and the mechanism is the shape of the output rather than the
traversal. The kernel writes one float per `(sample, tree)` pair and leaves the
summation across trees to the host, so the device-to-host payload is
`batch x num_trees x 4` bytes while host-to-device is only
`batch x num_features x 4` — a 111-to-1 asymmetry at 999 trees and 9 features.
Batch 10,000 sends 360 KB to the device and drags 39.96 MB back, and that copy is
87% of everything the GPU path does.

The same limit explains the FIL comparison. At batch 1 against 999 trees this
kernel comes in at 0.024 ms against FIL's 0.197 ms; by batch 10,000 FIL is at
0.283 ms and this is at 18.66 ms. FIL reduces across trees on the device and
returns one score per class per sample, so its output payload is 333 times
smaller. Almost the entire large-batch gap is the reduction that isn't
implemented here, not a statement about traversal quality.

## Design

**Dense tree layout.** Every tree is expanded into a complete binary array of
`2^(depth+1) - 1` nodes, so the left child of node `i` is at `2i + 1` and the
right at `2i + 2`. No child pointers are stored at all, which leaves a 12-byte
`DenseNode` and eliminates pointer chasing. The cost is wasted space for
unbalanced trees; at depth 6 that's 127 nodes per tree and 1.52 MB for a 999-tree
ensemble, small enough that the upload is a one-time cost.

**Keeping the model resident.** The first version of the launch function
re-uploaded the whole ensemble every trial, so `h2d` was almost entirely the cost
of re-sending 1.52 MB of unchanged tree data and the actual new samples were lost
inside it. `DeviceModel` uploads once at construction and times that separately,
which is what makes the per-stage breakdown mean anything.

**CUDA behind a CMake option.** Development happened on an M1 Mac with no CUDA
toolchain, so `enable_language(CUDA)` lives inside `cuda/CMakeLists.txt` and that
subdirectory is only added when `BUILD_CUDA` is on. The parser, the CPU reference
traversal, the XGBoost baseline, and two thirds of the correctness gate all build
and run locally; a rented GPU is only needed for the parts with nowhere else to
run.

**Correctness before timing.** `parse_check` gates every timing number: the plain
traversal against XGBoost's own margins to 1e-4, the dense traversal against the
plain one per tree, and the GPU kernel's per-`(sample, tree)` leaf values against
the CPU traversal. NaN is deliberately injected into a held-out test set to
exercise XGBoost's `default_left` semantics — and deliberately kept out of the
benchmark pool, so an uncounted fraction of samples can't silently traverse
differently inside a measurement meant to isolate batch and ensemble size.

C++23 on the host, CUDA C++20 on the device, with `nlohmann/json`, `rapidcsv`,
and a CUDA error-checking wrapper pulled in through CMake `FetchContent`.

## Limitations

The GPU path doesn't sum across trees on the device, so it produces the per-tree
leaf values a prediction is made of rather than a finished prediction. Every
large-batch number carries the cost of that decision. Only the dense layout was
built, so there's no dense-versus-sparse comparison. All models are depth 6 with
9 features on simulated data, and the largest tree buffer is 1.52 MB against 72 MB
of L2, so every ensemble in the sweep is fully cache-resident and none of the
results say anything about what happens when one stops fitting.

Full write-up, benchmark CSVs, and Nsight Systems traces in the
[repository](https://github.com/MadhavMenon10/gbdt-inference-engine).
