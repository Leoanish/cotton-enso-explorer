"""Derived boundary files in data/geo/: simplified state outlines for each country, US county and
Argentine department centroids, and a world outline. Needs `npm install` (mapshaper, us-atlas, world-atlas)."""
import json, os, re, sys, subprocess, tempfile, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import F, GEO, ROOT, opn
import pandas as pd

GEO.mkdir(parents=True, exist_ok=True)

def flip(geojson_path, rename=None):
    """mapshaper writes rings in the opposite order to d3's spherical convention; reverse them."""
    g = json.load(open(geojson_path))
    for ft in g['features']:
        ge = ft['geometry']
        if not ge: continue
        if ge['type'] == 'Polygon': ge['coordinates'] = [r[::-1] for r in ge['coordinates']]
        else: ge['coordinates'] = [[r[::-1] for r in poly] for poly in ge['coordinates']]
        if rename: ft['properties'] = rename(ft['properties'])
    json.dump(g, open(geojson_path, 'w'), separators=(',', ':'))

def mapshaper(src, *args):
    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, 'in.json')
        with opn(src) as f, open(tmp, 'w') as o: o.write(f.read())
        subprocess.run(['npx', '--no-install', 'mapshaper', tmp, *args], check=True, cwd=str(ROOT), capture_output=True)

def node(js):
    subprocess.run(['node', '-e', js], check=True, cwd=str(ROOT))

# United States: county centroids + state outlines (lower 48)
node("""
const tc=require('topojson-client'),fs=require('fs'),d3=require('d3');
const us=JSON.parse(fs.readFileSync('node_modules/us-atlas/counties-10m.json'));
const counties=tc.feature(us,us.objects.counties), states=tc.feature(us,us.objects.states);
const cent={}; for(const f of counties.features){ const c=d3.geoCentroid(f); cent[f.id]=[+c[1].toFixed(3),+c[0].toFixed(3)]; }
fs.writeFileSync('data/geo/us_county_centroids.json',JSON.stringify(cent));
fs.writeFileSync('data/geo/_us_states_full.json',JSON.stringify({type:'FeatureCollection',features:states.features
  .filter(f=>!['02','15','72','60','66','69','78'].includes(f.id)).map(f=>({type:'Feature',id:f.id,properties:{name:f.properties.name},geometry:f.geometry}))}));
""")
subprocess.run(['npx', '--no-install', 'mapshaper', 'data/geo/_us_states_full.json', '-simplify', '12%', 'keep-shapes',
                '-o', 'data/geo/us_states.json', 'format=geojson', 'precision=0.001', 'force'], check=True, cwd=str(ROOT), capture_output=True)
os.remove(GEO / '_us_states_full.json'); flip(GEO / 'us_states.json')

# India states, Brazil states, Argentina provinces
mapshaper(F['in_dist'], '-dissolve', 'st_nm', '-simplify', '8%', 'keep-shapes', '-o', str(GEO / 'in_states.json'), 'format=geojson', 'precision=0.001', 'force')
flip(GEO / 'in_states.json')
mapshaper(F['br_uf'], '-simplify', '15%', 'keep-shapes', '-o', str(GEO / 'br_states.json'), 'format=geojson', 'precision=0.001', 'force')
flip(GEO / 'br_states.json')
mapshaper(F['ar_dept'], '-dissolve', 'provincia', '-clip', 'bbox=-74,-56,-53,-21', '-simplify', '1%', 'keep-shapes',
          '-o', str(GEO / 'ar_provinces.json'), 'format=geojson', 'precision=0.001', 'force')
flip(GEO / 'ar_provinces.json', rename=lambda p: {'name': p['provincia'].title()})

# Argentina department centroids, matched to MAGyP department ids by province + name
def norm(s): s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower(); return re.sub(r'[^a-z0-9]', '', s)
g = json.load(opn(F['ar_dept']))
def coords(ge):
    if ge['type'] == 'Polygon': return [p for r in ge['coordinates'] for p in r]
    return [p for poly in ge['coordinates'] for r in poly for p in r]
cent = {}
for f in g['features']:
    p = f['properties']; pts = coords(f['geometry'])
    cent[(norm(p['provincia']), norm(p['departamento']))] = (round(sum(q[1] for q in pts) / len(pts), 3), round(sum(q[0] for q in pts) / len(pts), 3))
a = pd.read_csv(F['magyp'])
out = {}
for _, r in a[['provincia', 'departamento', 'departamento_id']].drop_duplicates().iterrows():
    k = (norm(r.provincia), norm(r.departamento))
    if k in cent: out[str(r.departamento_id)] = cent[k]
json.dump(out, open(GEO / 'ar_dept_centroids.json', 'w'))

# World outline (Natural Earth 110m via world-atlas), four study countries tagged
node("""
const tc=require('topojson-client'),fs=require('fs');
const w=JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json')); const land=tc.feature(w,w.objects.countries);
const keep={'840':'US','076':'BR','356':'IN','032':'AR'}; const r=x=>Math.round(x*100)/100;
const feats=land.features.filter(f=>f.properties.name!=='Antarctica').map(f=>({type:'Feature',id:keep[f.id]||null,properties:{name:f.properties.name},
  geometry:{type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?f.geometry.coordinates.map(rg=>rg.map(p=>[r(p[0]),r(p[1])])):f.geometry.coordinates.map(pg=>pg.map(rg=>rg.map(p=>[r(p[0]),r(p[1])])))}}));
fs.writeFileSync('data/geo/world.json',JSON.stringify({type:'FeatureCollection',features:feats}));
""")
print('geo files:', sorted(p.name for p in GEO.glob('*.json')))
