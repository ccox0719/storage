"""Extract dealer PDFs without modifying them. Usage: python extract-lutron.py INSTALL.pdf KEYPADS.pdf
Requires pdfplumber. Outputs deterministic JSON plus browser data; does not contact devices.
"""
import sys, re, json, hashlib
from pathlib import Path
import pdfplumber
root = Path(__file__).resolve().parents[1]
sources=[]; equipment=[]; keypads=[]
for kind, filename, expected in [('installation',sys.argv[1],80),('keypads',sys.argv[2],9)]:
    path=Path(filename)
    with pdfplumber.open(path) as pdf:
        assert len(pdf.pages)==expected
        sources.append(dict(id=kind,filename=path.name,pages=len(pdf.pages),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        for number,page in enumerate(pdf.pages,1):
            text=page.extract_text(x_tolerance=2)
            if kind=='installation':
                if number==1: continue # Cover contains personal contact information; exclude from public app.
                location=re.search(r'Location: (.*?)\s+Wallplate:',text).group(1)
                area,position=location.split('\\',1)
                words=page.extract_words()
                model_label=next(w for w in words if w['text']=='Model')
                models=[w for w in words if abs(w['top']-model_label['top'])<2 and w['x0']>130]
                # All models are a single word. Column boundaries are midway through the table borders,
                # just before each model's left edge (the same inset is used for every row).
                zone_label=next((w for w in words if w['text']=='Zone'),None)
                desc_label=next(w for w in words if w['text']=='Description')
                additional=next((w for w in words if w['text']=='Additional'),None)
                borders=sorted({e['top'] for e in page.edges if e['orientation']=='h' and 37<e['x0']<39 and 130<e['x1']<135})
                def bounds(label):
                    return (max(y for y in borders if y<label['top']),min(y for y in borders if y>label['bottom']))
                for col,model in enumerate(models):
                    x0=model['x0']-3
                    x1=models[col+1]['x0']-3 if col+1<len(models) else page.width-20
                    def segment(top,bottom):
                        return page.crop((x0,top,x1,bottom)).extract_text(x_tolerance=1,use_text_flow=True) or ''
                    zone=segment(*bounds(zone_label)) if zone_label else ''
                    description=segment(*bounds(desc_label))
                    notes=segment(*bounds(additional)) if additional else ''
                    equipment.append(dict(id=f'install-{number:02}-{col+1}',source='installation',page=number,area=area,position=position,model=model['text'],zone=zone,description=description,notes=notes,wallplate=re.search(r'Wallplate: (.*?)\s+Color:',text).group(1),color=text.split('Color:')[1].splitlines()[0].strip(),status='documented',verified=False))
            else:
                for line in text.splitlines():
                    line=line.strip()
                    m=re.match(r'^(.+ > .+ > .+) \(([^()]+)\)$',line)
                    if m:
                        keypad=dict(id=f'keypad-{len(keypads)+1:02}',path=m[1],model=m[2],source='keypads',page=number,buttons=[],save_on_hold=None,status='documented',verified=False)
                        keypads.append(keypad)
                    elif line.startswith('+ '):
                        m=re.fullmatch(r'\+ (.*?) \((.*)\)',line); assert m,line
                        button=dict(label=m[1],behavior=m[2],page=number,actions=[])
                        keypad['buttons'].append(button)
                    elif line.startswith('- '):
                        target,command=line[2:].rsplit(' - ',1)
                        action=dict(target=target,command=command,page=number)
                        level=re.search(r'Level \(([\d.]+)%\)',command)
                        fade=re.search(r'Fade \(([\d.]+)s\)',command)
                        fan=re.search(r'Fan Speed \((.*?)\)',command)
                        if level: action['level_percent']=float(level[1])
                        if fade: action['fade_seconds']=float(fade[1])
                        if fan: action['fan_speed']=fan[1]
                        button['actions'].append(action)
                    elif line.startswith('Save changes on button hold - '):
                        keypad['save_on_hold']=line.split(' - ')[1]
# Keep remote controls distinct from the loads they reference. Preserve raw spellings/truncation.
for device in equipment:
    model=device['model']
    device['kind']=('remote dimmer' if model.startswith('RD-') else 'keypad' if model.startswith(('PJ','RR-T5')) else 'sensor' if model.startswith('LRF') else 'infrastructure' if model.startswith(('RR-MAIN','RR-AUX','CONNECT')) else 'shade' if model.startswith('QSSC') else 'visor control' if model.startswith(('LR-','RR-VCRX')) else 'fan control' if '2ANF' in model else 'switch' if '8ANS' in model or model.startswith('LMJ') else 'dimmer')
    device['reported_zones']=([line.strip() for line in device['zone'].splitlines() if line.strip() and line.strip()!='N/A' and not re.match(r'^\d+ - ',line)] if not model.startswith('RD-') else [])
    device['accessories']=re.findall(r'\d+ - ([A-Z0-9-]+)',device['zone'])
zones={}
for device in equipment:
    for name in device['reported_zones']:
        key=device['area']+' > '+name
        zones.setdefault(key,dict(path=key,equipment_ids=[],button_refs=[],status='documented',verified=False))['equipment_ids'].append(device['id'])
for keypad in keypads:
    for index,button in enumerate(keypad['buttons']):
        for action in button['actions']:
            key=action['target']
            zone=zones.setdefault(key,dict(path=key,equipment_ids=[],button_refs=[],status='documented',verified=False))
            zone['button_refs'].append(dict(keypad_id=keypad['id'],button_index=index,page=action['page']))
# Candidate links for the three printed ellipses are explicit inferences, never silent renames.
for key,zone in zones.items():
    if '…' in key:
        zone['candidate_paths']=[other for other in zones if other.startswith(key.split('…')[0]) and other!=key]
data=dict(schema_version=1,project='DREYHOUSE',report_date='2026-10-19',filename_version_hint='12.10.0',version_verified=False,verification='Dealer documentation only; no physical or network verification.',sources=sources,equipment=equipment,zones=list(zones.values()),keypads=keypads)
(root/'data/lutron-radiora2.json').write_text(json.dumps(data,indent=2)+'\n')
(root/'js/lutron-data.js').write_text('// Generated by scripts/extract-lutron.py; do not hand-edit.\nconst LUTRON_DATA = '+json.dumps(data,indent=2)+';\n')
print(f'{len(equipment)} equipment records; {len(keypads)} keypads; {sum(len(k["buttons"]) for k in keypads)} buttons; {sum(len(b["actions"]) for k in keypads for b in k["buttons"])} actions')
