import json,pathlib
p=pathlib.Path(__file__).resolve().parents[1];cat={}
for f in p.glob('data/library-*.json'):
 for r in json.loads(f.read_text()):
  cat[r[0]]={'id':r[0],'title':r[1],'author':r[2],'cover':r[12] or '', 'href':'https://www.xiaohongshu.com/explore/'+r[0],'group':'unknown'}
features={}
for f in p.glob('data/cases/*.json'):
 for id,r in json.loads(f.read_text()).items():features[id]=r.get('features',{})
for r in json.loads((p/'data/core.json').read_text())['core']:
 f=features.get(r['id'],{});q='unknown'
 if isinstance(f.get('c_native'),bool) and 'c_person' in f:
  q=('t' if f.get('c_face') or f.get('c_person') not in ('none',None,'') else 'b')+('r' if f['c_native'] else 'l')
 cat[r['id']]={'id':r['id'],'title':r['t'],'author':r['a'],'cover':'covers/'+r['id']+'.webp' if r.get('cv') else '', 'href':'#/case/'+r['id'],'group':q}
for r in json.loads((p/'data/ss.json').read_text())['items']:
 q=('t' if r['g'].get('audio')=='voice' or r['g'].get('face') else 'b')+('l' if r['kind']=='brand' else 'r')
 cat[r['id']]={'id':r['id'],'title':r['zh'],'author':r['name'],'cover':'covers-ss/'+r['id']+'.webp','href':r['url'],'group':'ss-'+q}
for r in json.loads((p/'data/ref.json').read_text())['items']:
 if r['id'] not in cat:cat[r['id']]={'id':r['id'],'title':r['title'],'author':'是Cayson','cover':'','href':'https://www.xiaohongshu.com/explore/'+r['id'],'group':'unknown'}
(p/'data/favorite-catalog.json').write_text(json.dumps(cat,ensure_ascii=False,separators=(',',':')))
