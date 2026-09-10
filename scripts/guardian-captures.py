"""Package actual input-driven Guardian recordings, after browser/performance jobs finish.
Usage: python scripts/guardian-captures.py artifacts/guardian-0.1/raw/recorded-final
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, sys
root=Path(sys.argv[1]);out=Path('public/guardian');out.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGB',(1920,454),'#293f4a');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
labels={'reaction':('Gather and transform','Divided stream / Undertow / Shared vapour'),'field':('Move the battlefield','Double inscription / Crosswise / Migrating inscriptions'),'structure':('Prepare and release','Stone remembers / Walking fault / Break the seal')}
cards=[];builds=set()
for i,(name,(title,subtitle)) in enumerate(labels.items()):
    report=json.loads((root/f'{name}.json').read_text());builds.add(report['reports'][0]['build'])
    candidate=root/f'{name}-1-march-commit.png'
    if not candidate.exists():candidate=next(root.glob(f'{name}-*-commit.png'))
    picture=Image.open(candidate).convert('RGB');picture.save(out/f'{name}-warden.jpg',quality=92)
    sheet.paste(picture.resize((640,400)),(i*640,0));draw.text((i*640+14,410),title,font=font,fill='#f2e7c9');draw.text((i*640+14,435),subtitle,font=small,fill='#c9d7cf')
    video=next(root.glob(f'*real-input-{name}-build*.webm'))
    subprocess.run(['ffmpeg','-y','-ss','4','-i',str(video),'-t','10','-vf','scale=960:-2','-an','-c:v','libx264','-preset','medium','-crf','24','-movflags','+faststart',str(out/f'{name}-warden.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    cards.append(f'<article><h2>{title}</h2><p>{subtitle}</p><img src="{name}-warden.jpg" alt="Actual {name} build fighting the Warden"><video controls muted playsinline preload="metadata" src="{name}-warden.mp4" poster="{name}-warden.jpg"></video></article>')
sheet.save(out/'three-builds-warden.jpg',quality=93)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ruinweavers | The Bound Warden</title>
<style>body{margin:0;background:#293f4a;color:#f2e7c9;font:16px/1.6 system-ui}main{max-width:1400px;margin:auto;padding:28px}h1,h2{font-family:Georgia}h1{font-size:38px}a{color:#f1cf94}.builds{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}article{min-width:0}img,video{width:100%;height:auto}small{color:#c1ceca}p{max-width:1000px}@media(max-width:850px){.builds{grid-template-columns:1fr}}</style>
<main><h1>The Bound Warden</h1><p><a href="/">Play the complete Broken Court run</a> · <a href="/?scene=guardian">Face the Warden directly</a></p>
<p>A constructed Guardian with two fitted ward plates. Watch the shard lanes, leave its committed march, and read the furnace ring. Heat, moisture, bindings, cover and force obey the same rules as the rest of the court.</p>
<p>These are actual keyboard/mouse fights at normal health against active AI, in the same final arena. The isolated scene starts with a labelled three-upgrade fixture; it does not fake the spell effects. Complete solo and two-client runs with real personal reward choices are tested separately. No concept imagery.</p>
<div class="builds">'''+''.join(cards)+'''</div><p>Structure rewards repeated ground placement and release of bindings. Field play maintains and redirects two inscriptions. Reaction play gathers wet targets and heats them; Shared vapour remains a weakly supported payoff, despite visible transfers. Strong Basin/Ember play also remains viable. Scripted comparisons are not human skill models or proof of balance.</p><p><small>Runtime '''+', '.join(sorted(builds))+'''. Installed headless Chrome 152, Intel UHD ANGLE / D3D11, 1440×900 viewport, Lightweight 1152×720 buffer. Recorded on one Windows computer; recording overhead is excluded from the separate performance report. Local two-client tests do not validate another laptop or the remote TURN path.</small></p>
<p>WASD move · pointer aims · LMB/J Primary · RMB/F/K Secondary · 1–4 or Tab/Q select · Space dodge · hold E near a downed partner. Create co-op, share the room code, then both Ready. New run changes the seed; Retry same seed repeats offers given the same choices.</p></main></html>''',encoding='utf-8')
print('Packaged real Guardian captures:',', '.join(sorted(builds)))
