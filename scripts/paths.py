"""Repository paths and a gzip-aware open(). Every script imports from here, so the repo runs from any location."""
from pathlib import Path
import gzip

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'raw'
GEO = ROOT / 'data' / 'geo'
PROC = ROOT / 'data' / 'processed'
SRC = ROOT / 'src'
NODE = ROOT / 'node_modules'

F = {
    'oni': RAW / 'noaa' / 'oni.csv',
    'ersst': RAW / 'ersst' / 'sst.mnmean.nc',
    'nass': RAW / 'usda_nass',                                   # nass_cotton_upland_*_county_*.csv.gz
    'ibge_area': RAW / 'ibge' / 'pam_5457_area_colhida_2000_2025.csv.gz',
    'ibge_prod': RAW / 'ibge' / 'pam_5457_quantidade_produzida_2000_2025.csv.gz',
    'ibge_hist': RAW / 'ibge' / 'pam_1612_algodao_1974_1999.csv.gz',
    'icrisat_old': RAW / 'icrisat' / 'icrisat_dld_1966_2017.csv.gz',
    'icrisat_new': RAW / 'icrisat' / 'icrisat_dld_1990_2019.csv.gz',
    'magyp': RAW / 'magyp' / 'estimaciones_agricolas_algodon.csv.gz',
    'br_mun': RAW / 'boundaries' / 'brazil_municipalities.geojson.gz',
    'br_uf': RAW / 'boundaries' / 'brazil_states.geojson.gz',
    'in_dist': RAW / 'boundaries' / 'india_districts.geojson.gz',
    'ar_dept': RAW / 'boundaries' / 'argentina_departments.geojson.gz',
}

def opn(p, mode='rt', **kw):
    p = str(p)
    if p.endswith('.gz'):
        return gzip.open(p, mode, **kw)
    return open(p, mode, **kw)
