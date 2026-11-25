PY ?= python3

.PHONY: all geo data page sst install sources video climate

all: geo data page

install:
	$(PY) -m pip install -r requirements.txt
	npm install

geo:
	$(PY) scripts/build_geo.py

data:
	$(PY) scripts/build_data.py

page:
	$(PY) scripts/build_page.py

sst:
	@test -f data/raw/ersst/sst.mnmean.nc || scripts/fetch_ersst.sh
	$(PY) scripts/build_sst.py

sources:   # re-parse the raw China / Pakistan / India-extension files (only needed if data/raw changes)
	$(PY) scripts/parse_china.py
	$(PY) scripts/parse_pakistan_pbs.py data/raw/pakistan/pbs_districts_1981_2008.pdf data/raw/pakistan/pakistan_district_cotton_1981_2008.csv
	$(PY) scripts/parse_pakistan_punjab.py
	$(PY) scripts/parse_pakistan_sindh.py
	$(PY) scripts/parse_pakistan_mnfsr.py
	$(PY) scripts/extend_india.py
	$(PY) scripts/parse_australia.py

video:
	$(PY) scripts/build_video.py

climate:   # weather + outlook (downloads ~830 MB of gridded climate on first run)
	@test -f data/raw/climate/air.nc || scripts/fetch_climate.sh
	$(PY) scripts/build_climate.py
	$(PY) scripts/build_outlook.py
