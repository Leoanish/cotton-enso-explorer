# Cotton × ENSO Explorer — The Complete Guide

*A plain-language guide to everything in the dashboard: what El Niño and La Niña are, where every number comes from, exactly how each figure is calculated, and what every chart, button and colour means. Written so that someone with no background in climate science or statistics can follow it. The dashboard's AI assistant reads this guide to answer questions, so every section ends with a list of keywords.*

**Live dashboard:** https://leoanish.github.io/cotton-enso-explorer/
**Code and data:** https://github.com/Leoanish/cotton-enso-explorer
**Author:** Anish Bhattarai · **Licence:** MIT · **Data built:** 7 November 2026

> **About the numbers in this guide.** Unless a sentence says otherwise, figures quoted here use the dashboard's default settings: *All years · All events · per year*. Changing the settings (⚙ button) changes the numbers on screen. The AI assistant can always compute the live figure for any setting with its data tools — when this guide and a tool disagree, the tool reflects the current settings and wins.

---

## Part 1 · The big picture

### 1.1 What this dashboard does, in one paragraph

The dashboard asks a simple question: **when El Niño or La Niña happens, does cotton yield go up or down — and by how much, and where?** It answers it for four of the world's biggest cotton producers — the **United States, Brazil, India and Argentina** — not just for each country as a whole, but for every state (province) and every county, municipality, district or department that grows enough cotton to analyse. For every place it compares the harvests that grew during El Niño, the harvests that grew during La Niña, and the "normal" (neutral) harvests, after removing the long-term upward trend in yields. It also shows the years before and after each event, how often events happen, how long they last, how strong they were, and how confident we can be in each result.

Keywords: purpose, overview, what is this, summary, goal, research question, cotton yield, El Niño, La Niña, ENSO, countries covered, subnational, county level

### 1.2 Who it is for

Anyone curious about how a Pacific Ocean climate pattern reaches a cotton field: farmers and agronomists, crop insurers and traders, students, researchers and journalists. You do not need to know statistics. Start in **Overview**, which writes the main findings as short sentences, then click any card to see the evidence.

Keywords: audience, users, beginners, farmers, students, researchers, how to start

### 1.3 Countries covered — and why China and Australia are missing

| Country | Smallest unit mapped | Number of areas | States/provinces | Crop years | Average national yield |
|---|---|---|---|---|---|
| 🇺🇸 United States | County | 622 | 16 states | 1950–2025 | 705 kg lint/ha |
| 🇧🇷 Brazil | Municipality (município) | 147 | 13 states | 1974–2025 | 1,759 kg lint/ha |
| 🇮🇳 India | District | 144 | 13 states | 1966–2019 | 251 kg lint/ha |
| 🇦🇷 Argentina | Department (departamento) | 72 | 12 provinces | 1970–2025 | 479 kg lint/ha |

There are also two extra US views — **US · irrigated** (135 counties, 1972–2018) and **US · non-irrigated** (233 counties, 1972–2018) — built from USDA counties that report cotton yield separately by irrigation practice.

**China and Australia** were in the original plan because they are major producers, but neither publishes free, long, consistent yield records at the county/district level that could be downloaded and checked. Rather than mix in national-only numbers or unreliable sources, they were left out. (India's district data also stops in 2019 because that is where the public ICRISAT database ends.)

Keywords: countries, US, USA, United States, Brazil, India, Argentina, China, Australia, missing countries, why not China, coverage, number of counties, districts, municipalities, departments, years covered, irrigated, non-irrigated, dryland

### 1.4 The three-step way to read any number

1. **Pick a place** — the whole country, a state, or a county.
2. **Read the effect** — a percentage such as **−12.5%**. It means: *in El Niño (or La Niña) years, this place's cotton yield landed, on average, 12.5% further below its own normal level than it did in neutral years.* Negative = worse than a normal year, positive = better.
3. **Check the confidence** — each effect comes with a *90% confidence range*. If the whole range is on one side of zero (for example −18.2% to −6.1%) the result is labelled **confident**. If the range crosses zero (for example −4.9% to +6.4%) it is **uncertain**: the data cannot tell the effect apart from no effect.

Keywords: how to read, interpretation, percentage meaning, negative positive, effect, confident, uncertain, quick start, three steps

---

## Part 2 · ENSO basics (the climate side)

### 2.1 What is ENSO?

**ENSO** stands for **El Niño–Southern Oscillation**. It is a natural see-saw in the tropical Pacific Ocean and the air above it. Every few years the surface of the central and eastern equatorial Pacific becomes unusually **warm** (El Niño) or unusually **cool** (La Niña). Because the tropical Pacific is huge, these temperature swings shift where thunderstorms form, which bends the jet streams and changes rainfall and temperature in many places thousands of kilometres away — including cotton regions in the Americas and South Asia. These remote effects are called **teleconnections**.

- **El Niño** ("the boy child", named by Peruvian fishermen for warm water near Christmas): warmer-than-normal central/eastern equatorial Pacific.
- **La Niña** ("the girl"): cooler-than-normal water there — the opposite phase.
- **Neutral**: neither; the ocean is near normal.

ENSO is the single most important source of year-to-year climate variation on Earth, which is why it is worth studying for crops.

Keywords: ENSO, El Niño, La Niña, what is El Niño, what is La Niña, Southern Oscillation, neutral, Pacific Ocean, sea surface temperature, teleconnection, climate pattern, warm phase, cold phase

### 2.2 The Oceanic Niño Index (ONI) and the Niño 3.4 box

Scientists track ENSO with a single number, the **Oceanic Niño Index (ONI)**, published by NOAA's Climate Prediction Center (CPC).

- It measures the sea-surface temperature **anomaly** (difference from normal, in °C) inside a rectangle of ocean called **Niño 3.4**: 5°N–5°S latitude and 170°W–120°W longitude, in the central equatorial Pacific.
- It is a **3-month running mean**: each value averages three consecutive months, so it is labelled by the initials of those months — **DJF** = December–January–February, **JFM** = January–February–March, … **NDJ** = November–December–January. There are 12 overlapping "seasons" per year.
- The temperatures come from NOAA's **ERSST v5** dataset (Extended Reconstructed Sea Surface Temperature, version 5), which stitches together ship, buoy and satellite measurements back to the 1800s.

**Thresholds:** ONI ≥ **+0.5 °C** = El Niño conditions. ONI ≤ **−0.5 °C** = La Niña conditions. In between = neutral.

**Example:** if the average sea temperature in the Niño 3.4 box over November, December and January is 1.8 °C warmer than normal, the NDJ ONI is +1.8 — strong El Niño conditions.

The dashboard's ONI series runs from DJF 1950 to **JJA 2026** (June–July–August 2026, the latest value when the data were built). The most recent values were rising quickly (MAM 2026 +0.46, AMJ +0.95, MJJ +1.39, JJA +1.80 °C), meaning **El Niño conditions were developing in 2026**, but this had not yet lasted the five seasons needed to count as a completed event in the dashboard, and there is no 2026 cotton harvest data yet.

Keywords: ONI, Oceanic Niño Index, Niño 3.4, Nino34, index, sea surface temperature anomaly, SST, 3-month running mean, DJF, JFM, NDJ, JAS, season codes, threshold 0.5, ERSST, NOAA CPC, latest ONI, current conditions, 2026 El Niño

### 2.3 ONI version 5 vs the newer "v6" and RONI

The dashboard uses the classic **ONI computed from ERSST v5**, the version most papers have used and which NOAA still updates monthly. In 2025–26 NOAA introduced newer products: an ONI based on ERSST v6 and the **Relative ONI (RONI)**, which subtracts the warming of the whole tropics so that global warming does not slowly push the index toward "El Niño". NOAA's operational ENSO status now refers to RONI. For the historical events in this dashboard, the classic ONI and RONI agree on almost all events; small differences can appear for weak, borderline events in recent decades. A RONI switch is a possible future update.

Keywords: ONI v5, ONI v6, RONI, relative ONI, version, NOAA change, global warming, index version, ERSST v6

### 2.4 How an "event" is defined

A run of warm or cool seasons only counts as an **event** if it lasts long enough:

- **El Niño event:** at least **5 consecutive overlapping seasons** with ONI ≥ +0.5 °C.
- **La Niña event:** at least **5 consecutive overlapping seasons** with ONI ≤ −0.5 °C.

This is NOAA's standard rule. A brief warm blip of three seasons is not an event.

Each event has: a start season, an end season, a **duration** (number of seasons), a **peak** (the most extreme ONI value) and a **strength** (see 2.5). Events get an ID like **EN1997** (El Niño that started in 1997) or **LN2010** (La Niña that started in 2010) and a label like "1997–98".

One technical note: the dashboard uses ONI values to two decimals (hundredths). Because of this, a few back-to-back events that NOAA's published table shows as separate can merge, and vice versa — for example the long **2014–16 El Niño** appears as one 20-season event.

Keywords: event definition, five seasons, consecutive, how events are counted, start, end, duration, peak, event ID, EN1997, LN2010, label

### 2.5 Event strength: weak, moderate, strong, very strong

Strength uses the event's peak, but the peak level must be **held for at least 3 consecutive seasons**:

| Strength | Peak |ONI| held ≥ 3 seasons |
|---|---|
| Weak | 0.5 – 0.9 °C |
| Moderate | 1.0 – 1.4 °C |
| Strong | 1.5 – 1.9 °C |
| Very strong | ≥ 2.0 °C |

**Example of the 3-season rule:** the 2002–03 El Niño peaked at +1.19 °C, which sounds "moderate", but it stayed at or above 1.0 °C for fewer than three seasons, so it is classed **weak**. The 1986–88 El Niño peaked at +1.49 °C and is **moderate**. The 2014–16 El Niño peaked at +2.59 °C and is **very strong**.

In the dashboard, "Strong+" means strong *and* very strong together.

Keywords: strength, intensity, weak, moderate, strong, very strong, strong+, category, peak held three seasons, classification

### 2.6 All 42 events, 1950–2024

**22 El Niño events** (11 weak, 4 moderate, 4 strong, 3 very strong) and **20 La Niña events** (10 weak, 7 moderate, 3 strong, none very strong). Typical gap between the starts of two El Niños ≈ **3.4 years**; between two La Niñas ≈ **3.8 years**.

| ID | Type | Label | Start → End | Seasons | Peak (°C, when) | Strength |
|---|---|---|---|---|---|---|
| LN1950 | La Niña | 1950–51 | DJF 1950 → DJF 1951 | 13 | −1.32 (DJF 1950) | moderate |
| EN1951 | El Niño | 1951–52 | MJJ 1951 → DJF 1952 | 8 | +1.03 (SON 1951) | weak |
| EN1953 | El Niño | 1953 | MAM 1953 → NDJ 1953 | 9 | +0.78 (SON 1953) | weak |
| LN1955 | La Niña | 1955–56 | FMA 1955 → MAM 1956 | 14 | −1.59 (OND 1955) | moderate |
| EN1957 | El Niño | 1957–58 | MAM 1957 → AMJ 1958 | 14 | +1.69 (DJF 1958) | strong |
| EN1963 | El Niño | 1963–64 | JJA 1963 → JFM 1964 | 8 | +1.19 (OND 1963) | moderate |
| LN1964 | La Niña | 1964–65 | AMJ 1964 → DJF 1965 | 9 | −0.80 (SON 1964) | weak |
| EN1965 | El Niño | 1965–66 | MJJ 1965 → FMA 1966 | 10 | +1.82 (OND 1965) | strong |
| EN1968 | El Niño | 1968–69 | SON 1968 → AMJ 1969 | 8 | +0.98 (DJF 1969) | weak |
| LN1970 | La Niña | 1970–72 | JJA 1970 → DJF 1972 | 19 | −1.36 (JFM 1971) | moderate |
| EN1972 | El Niño | 1972–73 | MJJ 1972 → FMA 1973 | 10 | +1.84 (OND 1972) | strong |
| LN1973 | La Niña | 1973–74 | AMJ 1973 → MJJ 1974 | 14 | −2.04 (NDJ 1973) | strong |
| LN1974 | La Niña | 1974–76 | SON 1974 → FMA 1976 | 18 | −1.58 (NDJ 1975) | moderate |
| EN1976 | El Niño | 1976–77 | ASO 1976 → JFM 1977 | 6 | +0.84 (NDJ 1976) | weak |
| EN1977 | El Niño | 1977–78 | SON 1977 → JFM 1978 | 5 | +0.84 (OND 1977) | weak |
| EN1982 | El Niño | 1982–83 | AMJ 1982 → MJJ 1983 | 14 | +2.14 (DJF 1983) | very strong |
| LN1983 | La Niña | 1983–84 | SON 1983 → JFM 1984 | 5 | −0.96 (OND 1983) | weak |
| LN1984 | La Niña | 1984–85 | SON 1984 → MJJ 1985 | 9 | −1.06 (NDJ 1984) | weak |
| EN1986 | El Niño | 1986–88 | ASO 1986 → DJF 1988 | 17 | +1.49 (ASO 1987) | moderate |
| LN1988 | La Niña | 1988–89 | AMJ 1988 → AMJ 1989 | 13 | −1.85 (NDJ 1988) | strong |
| EN1991 | El Niño | 1991–92 | MJJ 1991 → MJJ 1992 | 13 | +1.54 (DJF 1992) | moderate |
| EN1994 | El Niño | 1994–95 | SON 1994 → JFM 1995 | 5 | +0.97 (NDJ 1994) | weak |
| LN1995 | La Niña | 1995–96 | JAS 1995 → FMA 1996 | 8 | −1.05 (OND 1995) | weak |
| EN1997 | El Niño | 1997–98 | AMJ 1997 → MAM 1998 | 12 | +2.37 (NDJ 1997) | very strong |
| LN1998 | La Niña | 1998–00 | JJA 1998 → MJJ 2000 | 24 | −1.53 (NDJ 1999) | moderate |
| LN2000 | La Niña | 2000–01 | SON 2000 → JFM 2001 | 5 | −0.78 (NDJ 2000) | weak |
| EN2002 | El Niño | 2002–03 | JJA 2002 → JFM 2003 | 8 | +1.19 (OND 2002) | weak |
| EN2004 | El Niño | 2004–05 | JAS 2004 → JFM 2005 | 7 | +0.71 (NDJ 2004) | weak |
| LN2005 | La Niña | 2005–06 | OND 2005 → FMA 2006 | 5 | −0.86 (DJF 2006) | weak |
| EN2006 | El Niño | 2006–07 | ASO 2006 → DJF 2007 | 5 | +0.88 (OND 2006) | weak |
| LN2007 | La Niña | 2007–08 | JAS 2007 → MJJ 2008 | 11 | −1.76 (DJF 2008) | strong |
| LN2008 | La Niña | 2008–09 | OND 2008 → FMA 2009 | 5 | −0.89 (DJF 2009) | weak |
| EN2009 | El Niño | 2009–10 | JJA 2009 → FMA 2010 | 9 | +1.50 (NDJ 2009) | moderate |
| LN2010 | La Niña | 2010–11 | MJJ 2010 → AMJ 2011 | 12 | −1.57 (OND 2010) | moderate |
| LN2011 | La Niña | 2011–12 | JAS 2011 → JFM 2012 | 7 | −1.02 (OND 2011) | weak |
| EN2014 | El Niño | 2014–16 | SON 2014 → AMJ 2016 | 20 | +2.59 (NDJ 2015) | very strong |
| LN2017 | La Niña | 2017–18 | OND 2017 → FMA 2018 | 5 | −0.76 (NDJ 2017) | weak |
| EN2018 | El Niño | 2018–19 | ASO 2018 → MJJ 2019 | 10 | +1.05 (NDJ 2018) | weak |
| EN2019 | El Niño | 2019–20 | SON 2019 → FMA 2020 | 6 | +0.75 (NDJ 2019) | weak |
| LN2020 | La Niña | 2020–21 | ASO 2020 → MAM 2021 | 8 | −1.11 (OND 2020) | moderate |
| LN2021 | La Niña | 2021–23 | ASO 2021 → DJF 2023 | 17 | −0.91 (OND 2021) | weak |
| EN2023 | El Niño | 2023–24 | MJJ 2023 → MAM 2024 | 11 | +1.99 (NDJ 2023) | strong |

Notes: some La Niñas came in back-to-back runs ("double-dip" or "triple-dip"), e.g. 1998–2001, 2020–23. The 2021–23 La Niña is classed weak because its strongest stretch was −0.91 °C. The strongest event in the record is the 2014–16 El Niño (+2.59 °C), then 1997–98 (+2.37 °C) and 1982–83 (+2.14 °C).

Keywords: list of events, all events, event table, history, 1997-98, 2015-16, 1982-83, 2023-24, 2010-11, double dip, triple dip, strongest El Niño, strongest La Niña, how many events, 42 events, 22 El Niño, 20 La Niña, gap between events, frequency

### 2.7 How ENSO usually affects weather in the cotton regions

These are the textbook (NOAA/IRI) tendencies. They are *tendencies*, not guarantees — every event is different.

- **Southern United States (Texas to the Carolinas):** El Niño tends to bring a **wetter, cooler** winter and spring (November–March) along the Gulf Coast and Southeast; La Niña tends to bring a **drier, warmer** winter–spring, which can leave soils dry at planting (e.g. the 2011 Texas drought during the 2010–11 La Niña). The US summer growing season itself has a weaker ENSO signal.
- **India:** El Niño tends to **weaken the summer (June–September) monsoon**, bringing below-normal rain — bad for rain-fed cotton in Maharashtra, Gujarat and Telangana. La Niña often brings a normal or stronger monsoon, though too much rain at boll opening can also hurt.
- **Southern Brazil, Uruguay, northeast Argentina ("southeastern South America"):** El Niño tends to be **wetter** (November–February); La Niña **drier**.
- **Northeast Brazil and the Amazon:** El Niño tends to be **drier**. Brazil's main cotton belt today (Mato Grosso, Bahia, Goiás) is in the centre-west, where the ENSO signal is weaker and mixed.
- **Elsewhere (for context):** El Niño dries Indonesia, northern Australia and southern Africa and wets the Peru–Ecuador coast.

The globe in the **Events** tab draws these as dashed circles ("typical impact zones") during an event.

Keywords: teleconnections, rainfall, drought, monsoon, wetter, drier, Texas drought, Indian monsoon, southern US winter, southeastern South America, northeast Brazil, impact zones, why El Niño affects cotton, weather effects, mechanism

### 2.8 Why timing matters: northern vs southern cotton

ENSO events usually **start in the northern spring–summer, peak around November–January, and fade by the next autumn**. Cotton in the two hemispheres meets the event at different moments:

- **US and India (northern hemisphere):** cotton is sown in April–July and grows during the event's **build-up** (the event is usually not at its peak yet).
- **Brazil and Argentina (southern hemisphere):** cotton is sown around October–January and grows through the event's **peak and decay**.

So the *same* event (say the 1997–98 El Niño) hits the US and Indian **1997** crops, but the Brazilian and Argentine **1998** harvests. The dashboard handles this automatically with country-specific growing windows (see 4.1).

Keywords: timing, hemisphere, northern hemisphere, southern hemisphere, growing season, build-up, peak, decay, which harvest, crop year, same event different years

---

## Part 3 · The data (where every number comes from)

### 3.1 Data sources at a glance

| What | Publisher | Used for |
|---|---|---|
| Oceanic Niño Index (ONI v5) | NOAA Climate Prediction Center (copied via the `ahuang11/oni` GitHub mirror) | Events, phases, strength |
| ERSST v5 monthly sea-surface temperature | NOAA NCEI / PSL | The animated globe |
| Cotton yield & harvested area by county (US) | USDA NASS Quick Stats | US counties, states, nation; irrigated / non-irrigated |
| Produção Agrícola Municipal (PAM), tables 1612 & 5457 | IBGE (Brazil) | Brazilian municipalities |
| District Level Database | ICRISAT (India) | Indian districts |
| Estimaciones agrícolas — algodón by departamento | Ministerio de Economía / MAGyP (Argentina) | Argentine departments |
| Boundaries (maps) | US counties & states: us-atlas (US Census); world: world-atlas (Natural Earth); Brazil municipalities & states: IBGE via the `rschapo/pam-dashboard` repo; India districts: `udit-001/india-maps-data`; Argentina departments: `mgaitan/departamentos_argentina` | Map shapes |

All sources are public. The **Sources** tab links each to the publisher, the exact file or query used, and the copy stored in the GitHub repository (`data/raw/…`).

Keywords: data sources, where does data come from, provenance, NOAA, USDA, NASS, Quick Stats, IBGE, PAM, SIDRA, ICRISAT, MAGyP, Argentina ministry, boundaries, shapefiles, maps, Sources tab, citations, links

### 3.2 United States data (USDA NASS)

- **What:** upland cotton **yield (lb lint per harvested acre)** and **acres harvested**, by county, from USDA's National Agricultural Statistics Service (NASS) **Quick Stats** database, survey program, 1950–2025.
- **Irrigation splits:** for 1972–2018 many counties also report yield separately for **irrigated** and **non-irrigated** fields. These form the "US · irrigated" and "US · non-irrigated" views (pick them under ⚙ → *US practice*).
- **Conversion:** lb/acre × **1.12085** = kg/ha; acres × 0.404686 = hectares. US yields are already **lint** (the fibre after ginning), so no ginning factor is needed.
- **Inclusion:** a county needs **≥ 25 seasons** of data and an average of **≥ 400 ha** harvested (≥ 15 seasons for the irrigation splits).
- 16 states qualify: Texas, Mississippi, Arkansas, Georgia, California, Alabama, Louisiana, Tennessee, Oklahoma, North Carolina, Missouri, Arizona, South Carolina, New Mexico, Florida, Virginia.

Keywords: US data, USDA, NASS, Quick Stats, county yield, lb per acre, pounds per acre, conversion, upland cotton, irrigated, non-irrigated, practice, US states list, inclusion rule

### 3.3 Brazil data (IBGE PAM)

- **What:** *algodão herbáceo em caroço* (herbaceous **seed cotton**) — **área colhida** (harvested area, ha) and **quantidade produzida** (tonnes) by municipality, from IBGE's *Produção Agrícola Municipal* survey, SIDRA tables **1612** (1974–2017 series) and **5457** (current series), 1974–2025.
- **Seed cotton → lint:** Brazil reports **seed cotton** (fibre still attached to seeds). We multiply by a fixed **ginning turnout of 0.40** (40% of seed-cotton weight is lint) to make it comparable. Real turnout varies (≈ 38–42%), so Brazilian *levels* are approximate, but **% deviations from trend are unaffected** by the factor (it cancels out).
- **Inclusion:** ≥ 15 seasons and ≥ 300 ha average harvested area.
- Biggest states: Mato Grosso, Bahia, Goiás, Mato Grosso do Sul, São Paulo, Minas Gerais.
- Brazil's cotton moved dramatically from the south/northeast to the centre-west *cerrado* in the late 1990s with high-tech, mostly rain-fed farming; yields more than doubled. The trend line absorbs this shift.

Keywords: Brazil data, IBGE, PAM, Produção Agrícola Municipal, SIDRA 1612, 5457, municipality, seed cotton, em caroço, ginning turnout, 0.40, lint conversion, Mato Grosso, Bahia, cerrado

### 3.4 India data (ICRISAT District Level Database)

- **What:** cotton **area (1000 ha)** and **production** by district from ICRISAT's District Level Database (DLD), 1966–2019. Production is in bales of 170 kg lint, converted to tonnes, so Indian yields are **lint**.
- **District boundaries change** over time (districts split). ICRISAT keeps districts at their **1966 boundaries** ("apportioned"), which makes long series consistent. Some district names are therefore historical, e.g. *North Arcot Vellore* (Tamil Nadu), *Mahabubnagar* and *Rangareddy* (now in Telangana).
- **Inclusion:** ≥ 20 seasons and ≥ 5,000 ha average area; yields ≥ 3,000 kg/ha were dropped as implausible.
- India's yields are low by world standards (national average 251 kg lint/ha over 1966–2019) because most cotton is rain-fed and smallholder; Bt cotton after 2002 lifted yields sharply — again absorbed by the trend.
- Main states: Maharashtra, Gujarat, Telangana, Karnataka, Punjab, Madhya Pradesh, Haryana, Rajasthan, Andhra Pradesh, Tamil Nadu.

Keywords: India data, ICRISAT, District Level Database, DLD, district, bales, 170 kg, apportioned, 1966 boundaries, Bt cotton, rain-fed, Maharashtra, Gujarat, why India ends 2019

### 3.5 Argentina data (Ministerio de Economía / MAGyP)

- **What:** *algodón* (seed cotton, *algodón en bruto*) **sown area, harvested area and production** by departamento, from the Dirección de Estimaciones Agrícolas, campaigns **1969/70 to 2024/25** (the harvest year is the second year, so crop years 1970–2025).
- **Seed cotton → lint:** multiplied by a fixed **ginning turnout of 0.33**. Levels are approximate; % deviations are exact.
- **Inclusion:** ≥ 15 seasons and ≥ 500 ha average harvested area.
- Main provinces: Chaco, Santiago del Estero, Santa Fe, Formosa, Corrientes, Salta.

Keywords: Argentina data, MAGyP, Ministerio de Economía, estimaciones agrícolas, departamento, campaña, seed cotton, algodón en bruto, 0.33 turnout, Chaco, Santiago del Estero

### 3.6 Units: everything is kg of lint per hectare

To compare countries fairly, every yield is shown as **kilograms of lint per hectare (kg lint/ha)**.

| Country | Reported as | Conversion |
|---|---|---|
| US | lb lint / acre | × 1.12085 |
| Brazil | kg seed cotton / ha | × 0.40 |
| India | lint (bales of 170 kg → tonnes) / ha | none needed |
| Argentina | kg seed cotton / ha | × 0.33 |

**Worked example:** a Texas county reporting 600 lb/acre → 600 × 1.12085 = **672 kg lint/ha**. A Brazilian municipality reporting 4,000 kg seed cotton/ha → 4,000 × 0.40 = **1,600 kg lint/ha**.

**Why % effects are not affected by the conversion:** a percentage deviation compares a year with that same place's trend, and both are multiplied by the same factor, which cancels. 1,600/1,500 = 4,000/3,750.

*Lint* = the white fibre sold to spinning mills. *Seed cotton* = lint plus seeds, as picked from the field. Typically one-third to two-fifths of seed cotton is lint.

Keywords: units, kg/ha, kilograms per hectare, lint, seed cotton, lb/acre, conversion factor, 1.12085, 0.40, 0.33, ginning, turnout, why Brazil yields high, compare countries

### 3.7 Cleaning: how bad records are removed

Agricultural statistics contain occasional typing errors (e.g. a municipality reporting 60 tonnes from 3 ha). The pipeline removes a yield when:

1. it is **above 3,500 kg lint/ha** (beyond anything realistic for field cotton), or
2. it is **more than 5 times** or **less than 5%** of that place's own median yield.

Then a place must pass the minimum-years and minimum-area rules for its country (3.2–3.5). States and national series are built **from all reporting areas** (sum of production ÷ sum of harvested area), not only the mapped ones.

Keywords: cleaning, outliers, errors, filter, 3500 cap, median rule, data quality, reporting errors, removed records, inclusion criteria, minimum years, minimum area

### 3.8 How state and national numbers are built

- **State (admin-1) yield** for a year = total production of all its reporting areas ÷ total harvested area. This is called **production-weighted** (or area-weighted): big-cotton counties count more than small ones, exactly like the official state yield.
- **National yield** = the same over the whole country.
- So national results describe the **typical kilogram of cotton**, dominated by the biggest producing regions (e.g. Texas for the US, Mato Grosso for Brazil, Maharashtra and Gujarat for India, Chaco for Argentina).

Keywords: aggregation, state yield, national yield, production weighted, area weighted, how national is computed, admin1, sum of production, harvested area

---

## Part 4 · The method (how every number is calculated)

### 4.1 Step 1 — Deciding which crop year an event hits (growing windows)

Each country's **crop year** gets one ENSO phase, decided by the ONI averaged over that country's **growing window**:

| Country | Growing window used | Crop calendar |
|---|---|---|
| US | **May–Oct** of the crop year | planted Apr–May, picked Sep–Nov |
| Brazil | **Dec (previous year)–May** of the harvest year | sown Dec–Jan, picked Jun–Aug |
| India | **Jun–Nov** of the crop year (kharif) | sown Jun–Jul, picked Oct–Jan |
| Argentina | **Nov (previous year)–Apr** of the harvest year | sown Oct–Dec, picked Mar–Jun |

The rule:
- window-mean ONI **≥ +0.5 °C** *and* the window overlaps an official El Niño event → **El Niño year**;
- window-mean ONI **≤ −0.5 °C** *and* it overlaps an official La Niña event → **La Niña year**;
- otherwise → **neutral year**.

Requiring an overlapping official event stops a brief warm wobble from being called El Niño. The year inherits that event's ID and strength.

**Worked example — the 1997–98 El Niño:** it ran from AMJ 1997 to MAM 1998. The US 1997 crop (May–Oct 1997) and India's 1997 crop (Jun–Nov 1997) are El Niño years. Brazil's and Argentina's **1998** harvests (grown Dec 1997–May 1998 / Nov 1997–Apr 1998) are El Niño years. Same event, different labelled years.

**Worked example — a long event:** the 1998–2000 La Niña covers US crop years 1998, 1999 and 2000 — three La Niña years from one event.

Keywords: growing window, crop year, phase assignment, which year counts, El Niño year, La Niña year, neutral year, window mean ONI, crop calendar, planting, harvest, season-aware, 1997 example

### 4.2 Step 2 — Removing the technology trend (LOWESS detrending)

**The problem:** yields climb for decades because of better seed, fertiliser, irrigation, pest control (e.g. Bt cotton). If we simply compared raw yields, every recent year would look "good" and every early year "bad", regardless of the weather.

**The fix:** for every single place (each county, each state, each country), we fit a smooth **trend line** through its own yield history using **LOWESS** (locally weighted scatter-plot smoothing). Think of it as a flexible ruler that follows the slow rise and plateaus of yields but ignores single-year bumps.

Details:
- The smoothing window covers about **14 years**, or **35% of the record** if that is longer (at most 90%). For a 76-year US series that is ~27 years; for a 50-year series ~17–18 years.
- It is **robust** (2 robustness iterations): unusually bad or good years get down-weighted so a single disaster does not drag the trend.
- The trend is never allowed below **25% of the place's median yield** (avoids division by tiny numbers).

**Yield deviation** for a year:

> **deviation (%) = (actual yield ÷ trend yield − 1) × 100**

clipped to the range −95% … +250% to tame extreme outliers.

**Worked example (India, 2002):** actual national yield 195 kg/ha; the trend for 2002 is 300 kg/ha. Deviation = (195 ÷ 300 − 1) × 100 = **−34.9%** (rounded from unrounded values). So India's 2002 crop landed 35% below what a normal year would have produced at that time.

**Worked example (US, 2012):** actual 984 kg/ha, trend 913 → (984/913 − 1) × 100 = **+7.8%**.

On the **Trends** tab, the gold line is the trend; each bar is the year's yield; the label on each bar is its deviation.

Keywords: detrending, trend line, LOWESS, LOESS, smoothing, technology trend, deviation, percent from trend, anomaly, how deviation is calculated, formula, gold line, robust, span, yield growth

### 4.3 Step 3 — The phase effect (the main number)

For a place, put each year's deviation into a bucket: El Niño, La Niña or neutral. Then:

> **El Niño effect = (average deviation in El Niño years) − (average deviation in neutral years)**
> **La Niña effect = (average deviation in La Niña years) − (average deviation in neutral years)**

Why subtract neutral years? Because even after detrending, neutral years do not average exactly 0%; subtracting the neutral mean gives a clean "compared with a normal year" number.

**Worked example (India, El Niño, default settings):** India has 11 El Niño crop years (from 10 events), averaging about −10.9% from trend; its 29 neutral years average +1.6%. Effect = −10.9 − (+1.6) = **−12.5%**. Read: *India's cotton yield in El Niño years runs about 12.5% below a normal year.*

**Worked example (US, La Niña):** 15 La Niña years; effect **−1.2%**: on average slightly lower, but small.

Keywords: effect, phase effect, El Niño effect, La Niña effect, vs neutral, compared with neutral, difference, how the main number is calculated, average deviation, impact size, percent change

### 4.4 Step 4 — Confidence ranges (bootstrap)

Averages from a few years can be lucky or unlucky. A **90% confidence range** shows how much the effect could plausibly change if history had dealt slightly different years.

How it is computed — the **bootstrap**:
1. Take the list of phase-year deviations (e.g. India's 11 El Niño years) and the list of neutral-year deviations (29 years).
2. Draw a **random sample with replacement** of the same size from each list (some years appear twice, some not at all) and compute the effect for that pretend history.
3. Repeat **400 times** → 400 plausible effects.
4. Sort them; the 5th percentile and the 95th percentile are the ends of the **90% range**.

A fixed random seed is used, so the same settings always give the same range.

- If the range lies **entirely below or above zero** → **confident**. India El Niño: **−18.2% to −6.1%** → confident.
- If it **crosses zero** → **uncertain**. US La Niña: **−6.6% to +4.6%** → uncertain.

Ranges need at least 3 phase observations and 3 neutral years. Few years (typical of counties with only 6–8 event years) → wide ranges → rarely confident. States and countries usually have narrower ranges.

A **Welch t-test p-value** is also computed internally and appears in the CSV export, but the dashboard's "confident" label uses the bootstrap range.

Plain-language meaning: "confident" does **not** prove ENSO caused the change; it means the difference is too consistent to be explained by random year-to-year noise alone.

Keywords: confidence, confidence interval, 90% range, bootstrap, resampling, 400 resamples, significant, significance, confident, uncertain, p-value, Welch t-test, statistics, how sure, error bars, uncertainty

### 4.5 Per year vs per event weighting

A long event can cover several crop years (e.g. the 1998–2000 La Niña gave the US three La Niña years). Settings → *Count a multi-year event as*:

- **per year** (default): every crop year is one observation, so a 3-year event counts 3 times.
- **per event**: the crop years of one event are averaged into **one** observation, so every event counts once.

Per event is fairer when one long event would otherwise dominate; per year uses more data. If the two settings give very different answers, a single long event is driving the result.

Keywords: per year, per event, weighting, multi-year event, long La Niña, count events, settings, observations, units

### 4.6 The strength threshold ("Which events count")

Settings → *Which events count*: **All** (default), **Moderate+**, **Strong+**.

- With **Moderate+**, crop years tied to **weak** events are removed from every group — they are not counted as El Niño/La Niña, and *not* moved into neutral either (so they cannot contaminate the baseline). On charts they appear faded as "Weak event — left out".
- **Strong+** keeps only strong and very-strong events.

Stronger thresholds give a cleaner signal but fewer years, so confidence ranges get wider.

Keywords: strength threshold, which events count, moderate+, strong+, all events, weak events excluded, filter events, settings, faded bars

### 4.7 The year range setting

Settings → *Years*: **All**, **1980→**, **2000→**. Restricts every calculation to crop years from that year on. Useful for asking "does ENSO still matter with modern varieties and irrigation?" Fewer years → wider ranges. (The trend lines themselves are always fitted on the full record.)

Keywords: year range, since 1980, since 2000, recent years, time window, settings, modern era

### 4.8 Before → during → after (lags)

For each event, the dashboard looks at the place's deviation:
- **2 years before** and **1 year before** the event's first affected crop year,
- **during** (average over the event's affected crop years),
- **1 year after** and **2 years after** its last affected crop year.

These are then **averaged across events**. Values are raw deviations from trend (not minus neutral).

**Example (India, El Niño):** during −10.8%, 1 year after +0.8%, 2 years after +4.5% → India's cotton typically **bounces back** right after an El Niño.

**Example (US, La Niña):** during +1.1%, 1 year after +1.3%, 2 years after −1.4%.

Caution: the year after one event is often part of the next event (ENSO events cluster), so "after" values are **indicative only**.

Keywords: before during after, lag, year after, recovery, bounce back, two years after, lagged effect, legacy, pre-event, post-event

### 4.9 Effect by event strength

The **strength panel** (Trends tab) splits each phase into weak, moderate and strong+ events and shows each group's effect vs neutral with its 90% range. It deliberately **ignores** the strength threshold setting so you can see every group at once (it still respects the year range and weighting).

**Example (India, El Niño):** weak −15.1% (3 years, uncertain), moderate −9.0% (4, confident), strong+ −13.9% (4, confident). All negative — El Niño of any strength tends to hurt Indian cotton.

**Example (US, La Niña):** weak +15.9% (only 2 years, no range), moderate −6.4% (9 years, confident), strong+ +2.0% (4, uncertain). The damage does **not** simply grow with strength.

Small groups (2–4 years) are fragile — one unusual harvest can flip them.

Keywords: strength panel, effect by strength, weak vs strong, does stronger hurt more, dose response, intensity effect, strength breakdown

### 4.10 Phase trends (straight lines through each phase)

On Trends, *Phase trends* fits an ordinary least-squares straight line through the El Niño years, the La Niña years and the neutral years separately (either raw yield or % from trend). The **slope** tells how fast yields improved within that phase (kg/ha per year), with a standard error. Each phase's card lists the **slope ± standard error** (kg/ha per year, or %/yr in the % view), the **R²** (how well a straight line fits, 0–1) and the phase's mean yield. Steeper = faster improvement; wide scatter = volatile. In the **% from trend** view a sloping line means the phase's penalty or bonus is changing over the decades (for example, irrigation shrinking La Niña losses). If two slopes' standard errors overlap, they cannot be told apart.

Keywords: phase trends, slope, linear trend, regression, OLS, standard error, yield improvement, kg per year, trend per phase

### 4.11 Quadrants of the globe

The Compare tab splits the world by the **equator** and the **prime meridian** into four quadrants: **NW** (north-west), **NE**, **SW**, **SE**. Each mapped cotton area falls into one by its coordinates: US → NW, India → NE, Brazil and Argentina → SW (no areas in SE because Australia is not included).

Each quadrant's number is the **harvested-area-weighted average** of its areas' effects (areas need ≥ 3 phase observations and ≥ 5 neutral years), with a 90% range from **300 bootstrap resamples of the areas**.

**Default results, El Niño:** NW **+2.5%** (622 US counties, range +1.8 to +3.2), NE **−14.5%** (144 Indian districts, −16.4 to −12.4), SW **−1.1%** (202 Brazilian+Argentine areas, −2.0 to −0.1).
**La Niña:** NW −0.9% (−1.5 to −0.2), NE −0.4% (−2.5 to +2.1), SW −0.3% (−1.0 to +0.5).

Note: quadrant ranges are narrow because they resample *areas*, not years, and many neighbouring areas share the same weather — so treat "confident" here more loosely. The hemisphere *timing* (4.1, 2.8) matters more than east/west.

Keywords: quadrants, NW, NE, SW, SE, hemisphere, north south, east west, globe split, area weighted average, Compare tab, regional pattern

### 4.12 How the "Overview" cards are chosen

Overview shows about nine cards for the selected country, all computed live from the settings:
1. **La Niña · national** and 2. **El Niño · national** — the national effect, with its range, number of years, how many fell below trend, worst and best year.
3. **Most sensitive state** for each phase — among states with ≥ 5 phase observations and ≥ 8 neutral years, confident effects first, then the most negative.
4. **Hardest-hit area** — the most negative *confident* county/municipality/district/department (≥ 5 observations).
5. **Worst event** — the event whose affected crop years had the lowest national deviation.
6. **La Niña by strength** — weak / moderate / strong+.
7. **After a La Niña** — event-year → 1-year-after deviation.
8. **Irrigation** (US only) — non-irrigated vs irrigated La Niña effect.
9. **Quadrant teaser** — the country's quadrant vs the others.

Clicking a card opens the tab that holds its evidence.

Note on the "most sensitive state" card: it can show a *positive* number — "sensitive" means the biggest confident response in either direction.

Keywords: Overview cards, findings, how cards are chosen, most sensitive state, hardest hit, worst event, irrigation card, what the data says

---

## Part 5 · Key results (default settings: all years, all events, per year)

### 5.1 Headline: the four countries side by side

| Country | El Niño effect (90% range) | La Niña effect (90% range) |
|---|---|---|
| 🇮🇳 India | **−12.5%** (−18.2 to −6.1) **confident** · 11 years, 10 events | −1.6% (−9.1 to +5.2) uncertain · 14 years |
| 🇧🇷 Brazil | −1.7% (−8.1 to +4.5) uncertain · 12 years | −2.8% (−7.8 to +1.9) uncertain · 17 years |
| 🇺🇸 United States | +0.9% (−4.9 to +6.4) uncertain · 15 years | −1.2% (−6.6 to +4.6) uncertain · 15 years |
| 🇦🇷 Argentina | +2.5% (−5.9 to +10.6) uncertain · 16 years | +1.3% (−5.4 to +9.1) uncertain · 19 years |

**The clearest, most robust finding:** **El Niño hurts Indian cotton** — about 12% below a normal year nationally, confident, and consistent across weak, moderate and strong events. This matches El Niño's known tendency to weaken the Indian summer monsoon. 113 of 144 Indian districts have a negative El Niño effect and 39 are confidently negative.

For the US, Brazil and Argentina, **national** effects are small and uncertain — positive and negative regional effects cancel out. The signal lives at the **state and county** level (5.2–5.5).

Keywords: main results, key findings, headline, summary of results, which country is most affected, India El Niño, national effects, comparison table, conclusion

### 5.2 United States results

- National: El Niño +0.9% (uncertain), La Niña −1.2% (uncertain). Neutral years average 0.3% from trend; national mean yield 705 kg/ha.
- **Worst ENSO harvest:** La Niña 1950–51 (crop year 1950, −16.9%). Others: El Niño 1968–69 (1969, −14.4%), El Niño 1951 (−11.8%), La Niña 1970–72 (1971, −12.0%), La Niña 1998–2000 (−10.6%), El Niño 2014–16 (2015, −10.3%). **Best:** El Niño 1963 (+24.7%), La Niña 1964 (+21.4%).
- **States:** Florida is the most La Niña-sensitive (−9.2%, confident); Tennessee shows a confident El Niño gain (+9.5%); Arizona a confident La Niña gain (+3.9%). Texas: El Niño −1.9%, La Niña +0.3% (both uncertain).
- **Counties:** 314 of 622 counties are below zero in La Niña years; 50 are confidently negative and 43 confidently positive — a patchwork. Hardest-hit confident La Niña counties: **Colorado County, TX −29.1%**, Onslow, NC −27.6%, Grant, OK −26.4%. For El Niño only 7 counties are confidently negative (worst Medina, TX −17.5%) and 99 confidently positive.
- **By strength (La Niña):** moderate −6.4% (confident), weak +15.9% (2 yrs), strong+ +2.0%. **El Niño:** weak −11.2% (confident), moderate +10.1% (confident), strong+ +2.6%.
- **Irrigation (1972–2018, La Niña):** non-irrigated **+7.6%** vs irrigated **−3.7%**, both uncertain. Caution: yields are per *harvested* acre; in drought years many dryland fields are abandoned and not harvested, so the surviving fields look better than the whole crop really was.
- **Example year:** 2011 (La Niña 2010–11, Texas drought): Texas yield 666 kg/ha vs trend 739 → −9.8%; national −3.4%.

Keywords: United States results, US findings, Texas, Florida, Tennessee, Georgia, Mississippi, Colorado County, US worst year, US La Niña, US El Niño, irrigation result, dryland, 2011 drought

### 5.3 India results

- National: **El Niño −12.5% (confident)**; La Niña −1.6% (uncertain). Neutral mean +1.6%; national mean yield 251 kg/ha.
- **Worst ENSO harvest:** El Niño 2002–03 (crop year 2002, **−34.9%**), then El Niño 2014–16 (2015, −24.6%), La Niña 1998–2000 (−18.9%), El Niño 1997 (−14.2%). Best: La Niña 2007–08 (2007, +25.9%).
- **States, El Niño:** Gujarat **−21.6%**, Maharashtra **−18.6%**, Telangana **−15.1%** (all confident); Andhra Pradesh −12.0%, Rajasthan −10.3%, Punjab −9.0% (uncertain).
- **States, La Niña:** Rajasthan +16.9% and Karnataka +15.6% (confident gains); Orissa −13.2%, Telangana −9.0% (uncertain).
- **Districts:** worst confident El Niño: **Latur, Maharashtra −55.0%**, North Arcot Vellore, Tamil Nadu −41.2%, Nasik, Maharashtra −40.2%. Worst confident La Niña: North Arcot Vellore −37.6%, Mahabubnagar (Telangana) −36.1%, Rangareddy −34.4%.
- **After El Niño:** during −10.8% → 1 yr after +0.8% → 2 yrs after +4.5% (recovers).
- **By strength (El Niño):** weak −15.1%, moderate −9.0% (confident), strong+ −13.9% (confident).

Keywords: India results, Indian cotton, monsoon, Gujarat, Maharashtra, Telangana, Latur, 2002 drought, El Niño India, worst year India, Indian districts, Rajasthan, Karnataka

### 5.4 Brazil results

- National: El Niño −1.7%, La Niña −2.8% (both uncertain). National mean yield 1,759 kg lint/ha.
- **Worst ENSO harvest:** El Niño 1986–88 (harvest 1987, **−25.0%**); then La Niña 1995–96 (1996, −20.1%), El Niño 1997–98 (1998, −18.0%), La Niña 1998–2000 (−11.9%). Best: El Niño 1991–92 (1992, +15.1%).
- **States:** Tocantins shows a confident La Niña gain (+12.8%); Minas Gerais a confident El Niño gain (+6.2%). Mato Grosso, the biggest producer: El Niño −1.0%, La Niña −4.7% (uncertain).
- **Municipalities:** worst confident La Niña: Uberlândia (MG) −18.8%, Buritizeiro (MG) −15.2%, Comodoro (MT) −13.0%. Worst confident El Niño: Dianópolis (TO) −78.3% (only 4 years — fragile), Iguatu (CE) −20.3%, Juscimeira (MT) −19.8%.
- **By strength (La Niña):** weak −4.3%, moderate −4.8%, strong+ +5.3% (confident).
- Interpretation: Brazil's modern cerrado cotton (centre-west) sits outside the strongest ENSO rainfall zones, and the industry's rapid geographic shift makes older years less comparable.

Keywords: Brazil results, Brazilian cotton, Mato Grosso, Bahia, Minas Gerais, Tocantins, Uberlândia, 1987, worst year Brazil, cerrado, Brazil El Niño, Brazil La Niña

### 5.5 Argentina results

- National: El Niño +2.5%, La Niña +1.3% (both uncertain). National mean yield 479 kg lint/ha.
- **Worst ENSO harvest:** La Niña 2011–12 (harvest 2012, **−20.5%**); then La Niña 1998–2000 (−14.1%), El Niño 1997–98 (1998, −13.9%), El Niño 2004–05 (2005, −13.8%). Best: El Niño 1977–78 (1978, +27.2%), El Niño 2018–19 (2019, +24.7%).
- **Provinces:** Córdoba (+14.3%) and San Luis (+12.4%) show confident La Niña gains (each is a single department); Misiones El Niño −9.7% (uncertain). Chaco, the biggest: El Niño +0.1%, La Niña +1.9%.
- **Departments:** worst confident La Niña: Pilcomayo (Formosa) −15.3%, Pilagás (Formosa) −12.4%. Worst confident El Niño: Garay (Santa Fe) −18.2%, General Paz (Corrientes) −10.4%, 2 de Abril (Chaco) −9.3%.
- **By strength (El Niño):** weak **+13.2%** (confident), moderate −2.5%, strong+ **−7.5%** (confident) — weak El Niños bring helpful rain, strong ones too much (flooding, disease, harvest problems).

Keywords: Argentina results, Argentine cotton, Chaco, Formosa, Santiago del Estero, Córdoba, 2012 drought, worst year Argentina, strong El Niño flooding, Argentina El Niño, Argentina La Niña

### 5.6 The same event across countries (examples)

National % from trend in the crop year(s) each event hit:

| Event | US | Brazil | India | Argentina |
|---|---|---|---|---|
| El Niño 1997–98 (very strong) | 1997: −0.4% | 1998: −18.0% | 1997: −14.2% | 1998: −13.9% |
| El Niño 2014–16 (very strong) | 2015: −10.3% | 2015–16: −5.4% | 2015: −24.6% | 2015–16: −11.4% |
| El Niño 2023–24 (strong) | 2023: +4.2% | 2024: −2.8% | (no data) | 2024: −10.0% |
| La Niña 1998–2000 (moderate) | 1998–2000: −10.6% | 1999–2000: −11.9% | 1998–2000: −18.9% | 1999–2000: −14.1% |
| La Niña 2010–11 (moderate) | 2010–11: −1.6% | 2011: −0.4% | 2010: +11.3% | 2011: +2.8% |
| La Niña 2021–23 (weak) | 2022: +11.0% | 2022: −10.4% | (no data) | 2022: +4.9% |

The 1998–2000 La Niña is the one event that hurt all four countries. In the dashboard, pick an event in **Events** → "Same event, every country".

Keywords: same event, across countries, compare countries, 1997-98 impact, 2015 impact, 2023 impact, 1998-2000 La Niña, event comparison, global impact

### 5.7 Is this publishable? Strengths and limitations

**Strengths:** four countries, ~1,000 subnational areas, up to 76 years; season-aware event assignment; consistent units; robust detrending; uncertainty shown everywhere; fully reproducible from public data.

**Limitations to keep in mind:**
- **Correlation, not causation.** ENSO is not the only thing happening in a year (pests like boll weevil or pink bollworm, prices, policy, other climate modes such as the Indian Ocean Dipole).
- **Small samples.** 10–20 events per phase; county-level results are noisy.
- **Many places tested.** With ~1,000 areas, some will look "confident" by chance (about 10% at a 90% range if there were no real effect). Focus on consistent patterns, not single counties.
- **Yield per harvested area** hides abandoned fields (important for US dryland).
- **Seed-cotton conversion** in Brazil/Argentina uses a fixed turnout.
- **Year after events** overlaps other events.
- **India ends in 2019**; China and Australia are absent.
- **ONI v5** rather than RONI (2.3).

For a paper, one would add: field-significance tests (false discovery rate), controls for other climate indices, rainfall/temperature mechanisms, and possibly area abandonment.

Keywords: limitations, caveats, publishable, research quality, causation, correlation, multiple testing, false positives, small sample, weaknesses, strengths, future work, peer review

---

## Part 6 · Every tab and on-screen element

### 6.1 Header, country picker and settings

- **Title bar:** "Cotton × ENSO Explorer". The **flag buttons** (🇺🇸 🇧🇷 🇮🇳 🇦🇷) choose the country for the *By country* tabs. **☾ / ☀** toggles dark/light theme.
- **Tabs, two groups:**
  - *By country* (follow the chosen flag): **Overview**, **Explore**, **Trends**, **Data**.
  - *All countries* (flag picker hides): **Events**, **Compare**, **Sources**.
- **⚙ Settings** button (shows a summary like "All years · all events"): *Years* (All / 1980→ / 2000→), *Which events count* (All / Moderate+ / Strong+), *Count a multi-year event as* (per year / per event), *US practice* (all / irrigated / non-irrigated). Every number on every tab updates instantly.
- **Breadcrumbs** (e.g. United States › Texas › Lubbock) show where you are; click a level to go back up.
- **Search box:** type a county/state/district name to jump to it.
- **The URL** remembers the country, tab, place, event and settings, so you can copy the address bar to share an exact view.
- **⤓ buttons** download a chart as PNG.
- **✦ Ask** (bottom-right): opens the AI assistant (Part 7).

Keywords: header, tabs, navigation, settings, gear, flags, country picker, theme, dark mode, breadcrumbs, search, share link, URL, download PNG, layout

### 6.2 Overview tab

The starting page for a country. A short three-step intro (Pick a place · Read the effect · Trust it the right amount) can be dismissed with "Got it". The **country card** shows the number of areas and states, crop years, how many El Niño and La Niña events (by strength) touched the country's harvests, and the average yield. Below, **"What the data says"** cards (see 4.12): each has a short label, a big number (red = loss, green = gain), a one-line headline and a detail line. Click a card → evidence.

Keywords: Overview tab, findings tab, country card, what the data says, cards, headline, start page, intro

### 6.3 Explore tab — the map

- **Metric toggle:** **Mean yield** (average kg/ha, the default), **La Niña** (La Niña effect vs neutral), **El Niño**.
- **Counties / States toggle:** colour individual areas or whole states. (The word changes by country: municipalities, districts, departments.)
- **Fill / Bubbles:** *Fill* colours the shapes; *Bubbles* draws a circle per area, sized by harvested area.
- **Colours:** for effects, **red = below neutral (loss)**, **green/teal = above (gain)**, scale shown in the legend (e.g. −15% … +15%). For mean yield, darker = higher yield.
- **Faded areas** = the effect is **not confident** (its 90% range crosses zero). **Grey** = fewer than 3 years of that phase — not enough to compute.
- **Navigation hierarchy:** the map opens on the whole country → click a state to zoom into it and see its counties → click a county to select it → click it again to deselect. **↩** returns to the whole country; **＋ / － / ⌂** zoom in, out and reset. The map fits each country to the frame.
- **Hover** any area for a tooltip with its name, yield, effects and number of years.
- **Selection panel (right/below):** the place's name and size; a **coverage line** (years, seasons, number of El Niño/La Niña events and years, neutral years, typical recurrence); a **story sentence**; three **phase cards** — *Neutral years* (baseline yield), *El Niño years*, *La Niña years* — each with effect, 90% range, confident/uncertain, how many years below trend, average yield, worst and best year; an **after** grid (event year, 1 yr after, 2 yrs after); and a **ranked list** of states or counties inside, most hurt by La Niña first (columns: El Niño, La Niña, ✓ = confident).
- **Buttons:** "Trends for this place →" and "📌 Pin to compare" (up to four places, across countries, shown in Compare).

Keywords: Explore tab, map, choropleth, fill, bubbles, metric, mean yield, colours, red green, faded, grey areas, legend, zoom, click county, deselect, back to country, tooltip, selection panel, phase cards, pin, ranked list, counties toggle, states toggle

### 6.4 Trends tab

For the selected place:
1. **Why everything is measured against the trend line** — a short explainer with a mini-sketch (bars = distance from trend).
2. **Yield history** — one bar per crop year, coloured by phase (orange = El Niño, blue = La Niña, grey = neutral, faded = weak event left out), gold line = LOWESS trend, label = % from trend.
3. **Phase trends** — straight-line fits per phase; toggle **Yield** / **% from trend**; slopes and standard errors.
4. **Effect by event strength** — bars for weak, moderate, strong+ in each phase with 90% ranges (ignores the threshold setting).
5. **One event in this place** — pick an event from the strip of chips; see the crop years it hit here and their deviations.
6. **Before → during → after** — thick lines = average across events, thin lines = individual events, from 2 years before to 2 years after.

Keywords: Trends tab, area tab, yield history, bar chart, gold line, phase trends, strength chart, one event, event picker, before during after chart, lag chart, thick thin lines

### 6.5 Data tab

A sortable **year-by-year table** for the selected place: **Year**, **Phase** (with the event's strength, and "excluded" when your settings leave a weak event out), **Window ONI** (the mean ONI over that country's growing window, °C), **Yield** (kg lint/ha), **Trend** (the LOWESS trend for that year), **% from trend**, and **Harvested ha**. El Niño rows are tinted orange, La Niña rows blue. Click a column header to sort. Downloads: **⤓ This place (CSV)** and **⤓ All places × phases (CSV)** (every area in every country with its effects, p-values and after-year values for the current settings). Below, the **Method** box summarises the method and sources.

Keywords: Data tab, table, year by year, download, CSV, export, spreadsheet, method box, raw numbers

### 6.6 Events tab

Global (not country-specific):
- **KPI tiles:** record length (1950–2026), number of El Niño and La Niña events by strength, typical gap (≈3.4 / 3.8 years), **latest ONI** and current state (e.g. "+1.80 °C · El Niño conditions · JJA 2026").
- **Event chips** to pick an event.
- **Oceanic Niño Index chart 1950 → today:** orange area above +0.5 °C, blue below −0.5 °C; events outlined; a **gold playhead** marks the season the globe shows. Click anywhere to jump the globe.
- **ENSO on the globe:** an animated globe of the **observed sea-surface temperature anomaly** (ERSST v5 vs the 1991–2020 average, 4° grid) — a red tongue along the equator = El Niño, blue = La Niña. The **Niño 3.4 box** is outlined. **Dots** are cotton areas coloured by that crop year's deviation (green above trend, red below). A **badge** names the event and season. **Ocean in Nov–Jan / Jul–Sep** chooses the season (Nov–Jan = event peak, best for Brazil/Argentina; Jul–Sep = US/India growing season). **Play: All years / Weak / Moderate / Strong+** animates through years with those events; **▶ Play** starts/stops. **Typical impact zones** toggles dashed circles marking usual wetter/drier regions for the event type, with a list of the zones.
- **How often, how long, how strong:** a histogram of *years between same-type events* and a scatter of *duration vs peak*.
- **Which crop years count, by country:** four stacked strips (US, Brazil, India, Argentina), one square per crop year coloured by the window-mean ONI — line up a column to see one event landing on different harvests.
- **Same event, every country:** after picking an event, the national % from trend in each country's affected crop year(s).

Keywords: Events tab, KPI, latest ONI, ONI chart, timeline, playhead, globe, animation, sea surface temperature map, SST anomaly, red tongue, Niño 3.4 box, badge, play button, Nov–Jan, Jul–Sep, impact zones, histogram, duration vs peak, phase strip, which crop years count, same event every country

### 6.7 Compare tab

- **Four quadrants of the globe:** a world map with NW/NE/SW/SE figures for La Niña or El Niño (toggle) — see 4.11.
- **Pinned places:** cards and a line chart of % from trend over time for up to four pinned places (shading = event years of the current country). **Clear** removes pins.
- **Most sensitive places · all countries:** two ranked lists, **Biggest losses** and **Biggest gains**, of areas with a confident effect (≥ 5 phase and ≥ 5 neutral observations), for La Niña or El Niño. Click to open on the map.
- **Countries side by side:** national El Niño and La Niña cards and a chart of the four national % from trend series.

Keywords: Compare tab, quadrants, pinned places, pins, most sensitive places, ranking, biggest losses, biggest gains, countries side by side, national chart, cross-country

### 6.8 Sources tab

"Where every number comes from": one card per dataset with the publisher, what was used, the exact file/query link, and a link to the copy in the GitHub repo. Every dataset is public, so anyone can re-check or rebuild the dashboard.

Keywords: Sources tab, data links, provenance, citation, download original data, GitHub raw data

### 6.9 Colours and symbols cheat-sheet

| Symbol | Meaning |
|---|---|
| Orange | El Niño |
| Blue | La Niña |
| Grey | Neutral, or not enough data on the map |
| Faded bar | Weak event left out by your settings |
| Faded map area | Effect not confident |
| Red number / area | Loss (below neutral or below trend) |
| Green number / area | Gain |
| Gold line | Trend (Trends tab) or playhead (Events tab) |
| ✓ | Confident effect |
| 📌 | Pin to compare |
| ⤓ | Download |
| ↩ | Back to the whole country |

Keywords: colours, colors, legend, symbols, orange, blue, red, green, grey, faded, gold line, check mark, icons, meaning of colours

---

## Part 7 · The AI assistant

### 7.1 What the assistant can do

The **✦ Ask** button opens a chat panel. The assistant is an open-weight language model (OpenAI's **gpt-oss-120b**, served by Groq) that has **tools**: it can search this guide, look up any place's statistics under the current settings, list events, check a single year, rank places, compute quadrant figures, change the settings and **open views in the dashboard for you** (e.g. "show me Gujarat in El Niño years" opens the map there). It is instructed to answer only from these tools and to say so when something is not in the data.

Good questions: "Why is India hurt by El Niño?", "How did the 2015 El Niño affect Texas?", "Which Brazilian municipalities lose most in La Niña?", "What does the confidence range mean?", "Does the result hold since 2000?", "Compare irrigated and dryland cotton."

Limits: free-tier rate limits (a busy minute can return "try again shortly"); it may still make mistakes — check numbers against the dashboard, which it links to. Conversations are not stored by the dashboard.

Keywords: AI assistant, chat, ask, chatbot, Groq, gpt-oss, open-weight model, what can the assistant do, tools, limits, privacy

### 7.2 How the assistant is wired (for the curious)

The browser sends your question, plus a short description of what you are looking at, to a small **Cloudflare Worker** (a proxy) that holds the Groq API key secretly and forwards the request to Groq. The model replies either with an answer or with a request to run a tool. Tools run **in your browser** on the dashboard's own data (the same functions that draw the charts), and the results go back to the model, up to six rounds. So every number the assistant quotes is computed by the dashboard itself. The API key never reaches the browser. Optionally, a visitor can paste their own Groq key in the chat settings; it is stored only in that browser.

Keywords: architecture, how it works, proxy, Cloudflare Worker, API key, security, tool calling, function calling, agent loop, bring your own key

---

## Part 8 · Glossary

- **Anomaly** — difference from normal. SST anomaly = temperature minus the long-term average for that place and season.
- **Area-weighted / production-weighted** — big areas count more in an average.
- **Bootstrap** — repeatedly resampling the data with replacement to see how much a result could vary.
- **Bt cotton** — genetically modified cotton resistant to bollworms; spread in India after 2002.
- **Confidence range (90%)** — the span covering the middle 90% of bootstrap results.
- **Confident / uncertain** — whether that range excludes zero.
- **Crop year** — the year a crop is harvested (US, India: the planting year; Brazil, Argentina: the harvest year of a season that started the previous calendar year).
- **Detrending** — removing the slow long-term change to isolate year-to-year swings.
- **Deviation (% from trend)** — (yield ÷ trend − 1) × 100.
- **Effect (vs neutral)** — average phase-year deviation minus average neutral-year deviation.
- **ENSO** — El Niño–Southern Oscillation.
- **ERSST v5** — NOAA's Extended Reconstructed Sea Surface Temperature dataset, version 5.
- **Event** — ≥ 5 consecutive seasons beyond ±0.5 °C ONI.
- **Ginning turnout** — fraction of seed-cotton weight that is lint.
- **Growing window** — months whose ONI decides a crop year's phase.
- **Harvested area** — area actually harvested (excludes abandoned fields).
- **Kharif** — India's monsoon cropping season (June–November).
- **Lag** — years before or after an event.
- **Lint** — cotton fibre after ginning.
- **LOWESS** — locally weighted smoothing used for trend lines.
- **Neutral year** — a crop year with no qualifying El Niño or La Niña.
- **Niño 3.4** — Pacific box 5°N–5°S, 170°W–120°W.
- **ONI** — Oceanic Niño Index, the 3-month mean Niño 3.4 SST anomaly.
- **p-value** — probability of a difference this large if there were no real effect (from a Welch t-test; in CSV only).
- **Phase** — El Niño, La Niña or neutral.
- **Quadrant** — NW/NE/SW/SE quarter of the globe.
- **RONI** — Relative Oceanic Niño Index (newer NOAA index).
- **Seed cotton** — lint plus seed, as picked.
- **Teleconnection** — a remote climate link (Pacific → cotton region).
- **Yield** — kg of lint per harvested hectare.

Keywords: glossary, definitions, terms, dictionary, jargon, what does it mean

---

## Part 9 · Frequently asked questions

### 9.1 FAQ — reading results

**Q: The national effect is tiny but some counties show −25%. Which is right?** Both. National numbers average many areas; strong local losses and gains cancel. Look at state and county maps.

**Q: Why is a county faded on the map?** Its 90% range crosses zero — the data cannot tell its effect from no effect.

**Q: Why is a county grey?** It has fewer than three El Niño (or La Niña) years in the current settings.

**Q: The effect changed when I changed settings — which one is "true"?** None is uniquely true; each answers a slightly different question. If the sign and size hold across settings (e.g. India El Niño), trust it more.

**Q: What is a "neutral year" yield?** The average actual yield in neutral years, shown as the baseline card.

**Q: Why does −12.5% not equal the average El Niño-year deviation?** Because the neutral-year average (+1.6% for India) is subtracted.

**Q: Why are Brazil's yields much higher than India's?** Brazil's centre-west cotton is high-input and well-managed; India's is mostly rain-fed smallholder cotton. Brazil's figures are also converted from seed cotton with a fixed factor.

Keywords: FAQ, questions, national vs county, faded, grey, changing settings, neutral yield, why numbers differ, Brazil vs India yields

### 9.2 FAQ — data and method

**Q: Why not just compare yield in El Niño years with the average yield?** Because yields roughly doubled or tripled over the decades; old years would always look bad. Detrending fixes that.

**Q: Why does the US 1997 crop count for the 1997–98 El Niño but Brazil's 1998 crop?** Growing windows: the US crop grew May–Oct 1997, Brazil's Dec 1997–May 1998.

**Q: Why are there no 2026 results?** Harvest data for 2026 are not available yet, and the 2026 warming had not yet become a completed event in the data.

**Q: Can I get the raw data?** Yes — Data tab CSVs, or the GitHub repo (`data/raw` for originals, `data/processed/dashboard_data.json` for the processed data).

**Q: How do I rebuild it?** Clone the repo, `make install`, then `make` (and `make sst` for the globe). See the README.

**Q: Is ENSO predictable enough to use this for planning?** NOAA issues ENSO outlooks months ahead; this dashboard shows how cotton historically responded, which is one input, not a forecast.

Keywords: FAQ, method questions, detrending why, raw data, rebuild, reproduce, forecast, planning, 2026, GitHub

---

## Part 10 · Reproducibility and the repository

### 10.1 Repository layout and pipeline

```
cotton-enso-explorer/
├── index.html                 ← the whole dashboard, one self-contained file
├── src/template.html, app.js  ← page layout and all interactive code (d3 v7)
├── scripts/                   ← Python build pipeline
│   ├── paths.py               ← where every file lives
│   ├── build_core.py          ← ONI → events → phases; detrending; aggregation
│   ├── build_data.py          ← loads US/BR/IN/AR data, cleans, writes dashboard_data.json
│   ├── build_geo.py           ← simplifies boundaries (mapshaper)
│   ├── build_sst.py           ← ERSST v5 → seasonal SST anomaly fields for the globe
│   └── build_page.py          ← stitches template + d3 + data + guide + app → index.html
├── data/raw/                  ← original downloads (NOAA, USDA, IBGE, ICRISAT, MAGyP, boundaries)
├── data/geo/                  ← simplified map shapes
├── data/processed/            ← dashboard_data.json, sst_fields.json
├── docs/knowledge_base.md     ← this guide (also embedded for the AI assistant)
└── chat-proxy/                ← Cloudflare Worker that keeps the Groq key secret
```

`make` runs geo → data → page. Python 3 with pandas, numpy, statsmodels (LOWESS); Node for d3, mapshaper, topojson. The dashboard is hosted for free on **GitHub Pages**.

Keywords: repository, GitHub, code, pipeline, scripts, build, Makefile, reproduce, folder structure, files, hosting, GitHub Pages, d3, Python
