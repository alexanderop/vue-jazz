#!/usr/bin/env bash
set -euo pipefail

echo "Running Lighthouse CI..."
pnpm exec lhci autorun
