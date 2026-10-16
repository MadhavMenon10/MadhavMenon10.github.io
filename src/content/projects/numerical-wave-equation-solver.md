---
title: "Numerical Wave Equation Solver"
description: "A C++ solver for the 1+1D scalar wave equation with second- and fourth-order finite-difference stencils and RK4 time stepping, verified against the exact solution."
tags: ["C++", "Python", "CMake"]
github: "https://github.com/MadhavMenon10/numrel-wave-evolution"
image: "/projects/numerical-wave-equation-solver.png"
imageAlt: "Numerical and exact solutions of a split Gaussian pulse under the second-order stencil at t = 5.8"
imageFit: "contain"
order: 0
draft: false
---

A solver for the scalar wave equation in one spatial dimension, written as an
introductory assignment for the Witek Gravity Group. It evolves a Gaussian pulse
on a periodic domain, which splits into two half-amplitude pulses travelling in
opposite directions, and compares the result against the exact solution.

## Method

The equation is reduced to a first-order system in time by introducing the
momentum `Π = -∂ₜΦ`, then evolved with the method of lines: second- or
fourth-order central finite-difference stencils in space and RK4 in time. The
exact solution on the periodic domain comes from d'Alembert's formula, and every
error is measured against it using the discrete L² norm.

## Results

- **Evolution.** The two pulses cross the periodic boundary, recombine at `x = 0`
  at `t = 10`, and return to the original pulse at `t = 20`.
- **Stability.** A scan over `λ = Δt/Δx` finds the largest stable values at 1.40
  (second order) and 1.20 (fourth order), matching the predicted limits of √2
  and √(3/2).
- **Convergence.** At `t = 5` the fitted orders are 2.00 and 3.98 for the two
  stencils. At `t = 20` they appear inflated (3.90 and 5.60) because the exact
  solution returns to its initial state, so only phase error enters.
- **Accuracy.** For `Δx = 0.1`, `Δt = 0.05` the relative error at `t = 20` is
  about 3.5 × 10⁻³ for the second-order stencil and 5.9 × 10⁻⁶ for the
  fourth-order one, roughly a 600× improvement.

## Using it

Builds with CMake and a C++20 compiler. The command-line driver takes the grid
spacing, time step, stencil order, final time, snapshot interval and output
path. Python scripts (NumPy, Matplotlib, Pillow) produce the figures and the
animation.

Full code, figures and write-up in the
[repository](https://github.com/MadhavMenon10/numrel-wave-evolution).
