#!/usr/bin/env bash
# Download NOAA ERSST v5 monthly sea-surface temperature (~160 MB; too large for GitHub).
# Only needed to rebuild data/processed/sst_fields.json; the processed file is already in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
curl -L --fail -o data/raw/ersst/sst.mnmean.nc https://downloads.psl.noaa.gov/Datasets/noaa.ersst.v5/sst.mnmean.nc
echo "Saved data/raw/ersst/sst.mnmean.nc"
