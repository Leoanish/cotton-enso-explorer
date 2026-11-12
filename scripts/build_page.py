"""Assemble the single self-contained dashboard: src/template.html + d3 + data + geometry + app → index.html."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import ROOT, GEO, PROC, SRC, NODE

def L(name):
    p = GEO / name
    return json.load(open(p)) if p.exists() else None

tpl = open(SRC / 'template.html').read()
d3 = open(NODE / 'd3' / 'dist' / 'd3.min.js').read()
data = open(PROC / 'dashboard_data.json').read()
sst = open(PROC / 'sst_fields.json').read()
geo = json.dumps({
    'US': {'states': L('us_states.json'), 'polys': L('us_polys.json')},
    'BR': {'states': L('br_states.json'), 'polys': L('br_polys.json')},
    'IN': {'states': L('in_states.json'), 'polys': L('in_polys.json')},
    'AR': {'states': L('ar_provinces.json'), 'polys': L('ar_polys.json')},
    'WORLD': L('world.json'),
}, separators=(',', ':'))
app = open(SRC / 'app.js').read()
# AI assistant: the guide it searches, and the URL of the key-holding proxy (chat-proxy/PROXY_URL, one line; blank = off)
kb = json.dumps(open(ROOT / 'docs' / 'knowledge_base.md').read(), ensure_ascii=False)
purl_f = ROOT / 'chat-proxy' / 'PROXY_URL'
purl = open(purl_f).read().strip() if purl_f.exists() else ''
assert all(c not in purl for c in "'\"\\<> "), 'PROXY_URL must be a plain https URL'
chat = open(SRC / 'chat.js').read()
if purl: chat = chat.replace("'/*CHAT_PROXY*/'", repr(purl), 1)
for k, v in [('/*D3*/', d3), ('/*DATA*/', data.replace('</', '<\\/')), ('/*GEO*/', geo.replace('</', '<\\/')),
             ('/*SST*/', sst), ('/*APP*/', app), ('/*KB*/', kb.replace('</', '<\\/')), ('/*CHAT*/', chat)]:
    assert k in tpl, k
    tpl = tpl.replace(k, v, 1)
open(ROOT / 'index.html', 'w').write(tpl)
print('index.html', round(len(tpl) / 1e6, 2), 'MB')
