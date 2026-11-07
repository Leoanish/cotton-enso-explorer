# ERSST v5 (not committed)

NOAA Extended Reconstructed Sea Surface Temperature v5, monthly, 2° grid, 1854 → present
(`sst.mnmean.nc`, ~160 MB — over GitHub's 100 MB file limit).

Only needed to rebuild `data/processed/sst_fields.json`, which is already committed:

```bash
scripts/fetch_ersst.sh       # downloads to data/raw/ersst/sst.mnmean.nc
python3 scripts/build_sst.py
```

Source: NOAA PSL, https://psl.noaa.gov/data/gridded/data.noaa.ersst.v5.html
