PY ?= python3

.PHONY: all geo data page sst install

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
