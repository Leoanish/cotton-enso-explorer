#!/usr/bin/env bash
# Download the gridded climate inputs for scripts/build_climate.py (~830 MB; not committed).
set -euo pipefail
cd "$(dirname "$0")/../data/raw" && mkdir -p climate && cd climate
curl -fL -o air.nc    https://downloads.psl.noaa.gov/Datasets/ghcncams/air.mon.mean.nc
curl -fL -o precl.nc  https://downloads.psl.noaa.gov/Datasets/precl/0.5deg/precip.mon.mean.0.5x0.5.nc
curl -fL -o scpdsi.nc https://crudata.uea.ac.uk/cru/data/drought/cru-ts4.10.1903-2025.scpdsi.nc
