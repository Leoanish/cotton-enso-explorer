# New country data: what exists, what is downloaded, what is missing

*Checked 16 November 2026. "Downloaded" means the file is in `data/raw/` and was opened and checked.*

## Summary (updated 17 November 2026: all of these are now in the dashboard)

| Country | Level | Years in the dashboard | Status | Checks |
|---|---|---|---|---|
| India (extension) | District (1966 boundaries) | 1966–2024 | **In dashboard** — 100 of 146 districts extended to 2024 (91% of area) | UPAg calibrated to ICRISAT on 2013–19; match report in `data/raw/india_des/` |
| India (correction) | — | Rajasthan 2012–15, 2017 | **Fixed** ICRISAT bales/tonnes slip (×1000/170) | Ministry data and neighbouring years |
| China β | Province (15) | 1961–2025, 2018 missing | **In dashboard** | Rebuilt national yield within ~1% of NBS (2001, 2010, 2013, 2019–25); provincial areas sum to national |
| Pakistan β | 27 stable district units | 1981–2008, 2010–2018, 2021–2023 | **In dashboard** | District rows sum exactly to published Punjab/Sindh totals (except 1.2 of 1,815 kha, Punjab 2016) |
| Australia β | State (NSW, Qld) | 1990–2026 | **In dashboard** (file downloaded by hand: ABARES site has a bot check) | NSW+Qld = 97–100% of national area |
| Turkey | Province | — | Not added | Low priority |
| Uzbekistan | National only | — | Not usable | — |

Still missing: Pakistan 2009 and 2019–2020 (scanned or unpublished district tables); China 2018 provincial table.

## India — extension to 2024

- **Source:** Ministry of Agriculture district Area–Production–Yield data, via the India Data Portal (CKAN dataset `area-production-yield-apy`, retrieved 16 Nov 2026).
  - `data/raw/india_des/india_des_cotton_1997_2022.csv`: DES Crop Production Statistics, crop years 1997–2022, about 474 district codes.
  - `data/raw/india_des/india_upag_cotton_2013_2024.csv`: UPAg portal, crop years 2013–2024 (2024 = 2024-25), kg lint/ha.
- **Units check:**
  - The DES file labels production "Tonnes", but the values are **bales of 170 kg**. Multiplied by 170 they reproduce our ICRISAT national yields: 1998 217 vs 225, 2005 361 vs 363, 2010 436 vs 437, 2015 306 vs 310 kg/ha.
  - UPAg production is in tonnes of lint and matches DES×170 exactly.
  - Drop rows with season = "Total" (duplicates).
- **Why it matters:** it adds 2020–2024, including the **2023–24 El Niño**, which the current analysis has never seen. That's a true out-of-sample test.
- **To do:** districts were split after 1966 (ICRISAT keeps 1966 boundaries). Map new districts to their parent with the LGD codes; the 1997–2019 overlap lets us check the join.

## Pakistan

- **1981–2008:** Federal Bureau of Statistics, *Crops Area and Production (by Districts) 1981-82 to 2008-09*, Tables 47–50 (pp. 133–146).
  - `data/raw/pakistan/pbs_districts_1981_2008.pdf` (from `pbs.gov.pk/wp-content/uploads/2020/07/…`).
  - Parsed to `pakistan_district_cotton_1981_2008.csv` by `scripts/parse_pakistan_pbs.py`: 3,409 district-years, area (000 ha), production (000 bales of 170 kg; PBS converts with 0.17009 t/bale).
  - Check: 2008-09 total 11.82 million bales; Pakistan Economic Survey: 11.8 million.
- **2020–2023:** Ministry of National Food Security & Research, *Crops Area and Production (District wise)* 2021-22, 2022-23 and 2023-24 (each holds two years).
  - Files: `mnfsr_2021_22.pdf`, `Crops_Area_AND_Production_by_2022-23.pdf`, `Cap_2024_updated_Final.pdf`.
  - Their production column says "000 Tons", but the values are **000 bales**: the same report's chart lists Sanghar 904.27 thousand bales.
- **Gap 2009–2019:**
  - Punjab Crop Reporting Service and Bureau of Statistics publish yearly district final estimates. Some years (2014-15 to 2018-19) are on `opendata.com.pk` and reachable. The Punjab Development Statistics volumes (five-year district tables) are on `bos.punjab.gov.pk`, which is blocked here and needs a browser.
  - Sindh Bureau of Statistics (`sbos.sindh.gov.pk`, reachable) publishes district Kharif reports.
  - Punjab and Sindh grow over 95% of Pakistan's cotton.
- **Note:** the CSIRO district dataset (Kirby & Ahmad, 1980–2012) has **area only**, so it doesn't replace production data.

## China

- **Source:** Mendeley Data `bms88fv7zz`, provincial crop yields compiled from *Chinese Agricultural Statistics*. File: `data/raw/china/china_provincial_crop_yield_1961_2017.xlsx`, sheet *Cotton*, 21 provinces, kg/ha, 1961–2017.
- **To add:** sown area by province (for weighting) and 2018–2025. Both are in the NBS yearly *Bulletin on the National Cotton Output*, which has a provincial table: sown area (1,000 ha), yield (kg/ha), output (10,000 t). Example 2024: Xinjiang 2,447.9 / 2,322.8 / 568.6.
- **Caveat:** Xinjiang (irrigated, far from ENSO's main teleconnections) is now most of China's area, so the national signal is likely weak. The older Yellow River and Yangtze provinces are more informative.

## Australia

- **Source:** ABARES Australian Crop Report data (state level, Excel) and ABARES commodity statistics; Cotton Australia for valley-level figures.
- **Status:** `agriculture.gov.au` is blocked from the workspace, and the old `data.daff.gov.au` warehouse links return 503. Needs a browser download.
- **Note:** about 92% of the crop is irrigated, so planted area and dryland share are better ENSO outcomes than yield.
