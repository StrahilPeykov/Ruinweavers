"""Package three actual input-driven runs; run only after measurement/browser jobs finish.
Each input folder contains solo.json, <build>-last-ward-combat.png and recording.webm.
Usage: python scripts/build-captures.py artifacts/build-0.2/raw/recorded
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, sys
root=Path(sys.argv[1]); out=Path('public/build-identity');out.mkdir(parents=True,exist_ok=True)
names={'reaction':('Gather and transform','Divided stream / Undertow / Shared vapour'),
       'field':('Move the battlefield','Double inscription / Crosswise inscription / Migrating inscriptions'),
       'structure':('Prepare and release','Stone remembers / Walking fault / Break the seal')}
sheet=Image.new('RGB',(2160,520),'#293f4a');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
cards=[];builds=set()
for i,(key,(title,choices)) in enumerate(names.items()):
    folder=root/key;meta=json.loads((folder/'solo.json').read_text(encoding='utf-8'));builds.add(meta['environment']['build'])
    image=Image.open(folder/f'{key}-last-ward-combat.png').convert('RGB');image.save(out/f'{key}-last-ward.jpg',quality=93)
    thumb=image.resize((720,450));sheet.paste(thumb,(720*i,0))
    draw.text((720*i+14,460),title,font=font,fill='#f2e7c9');draw.text((720*i+14,493),choices,font=small,fill='#d0dacf')
    video=folder/'recording.webm'
    duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(video)]))
    # Recording closes after the run/restart checks; retain a short final-encounter excerpt.
    start=max(0,duration-13)
    subprocess.run(['ffmpeg','-y','-ss',str(start),'-i',str(video),'-t','9','-vf','scale=960:-2','-an','-c:v','libx264','-preset','medium','-crf','24','-movflags','+faststart',str(out/f'{key}-last-ward.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    cards.append(f'<article><h2>{title}</h2><p>{choices}</p><a href="{key}-last-ward.jpg"><img src="{key}-last-ward.jpg" alt="Actual {key} build in The Last Ward"></a><video controls muted playsinline preload="metadata" src="{key}-last-ward.mp4" poster="{key}-last-ward.jpg"></video><small>{meta["combatSeconds"]:.1f} seconds of combat across the whole run. Seed {143 if key=="reaction" else 0}; seed changes offers, not this encounter.</small></article>')
sheet.save(out/'three-builds-last-ward.jpg',quality=92)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ruinweavers | One mage, three builds</title>
<style>body{margin:0;background:#293f4a;color:#f2e7c9;font:16px/1.6 system-ui}main{max-width:1400px;margin:auto;padding:28px}h1,h2{font-family:Georgia}h1{font-size:38px}a{color:#f1cf94}.builds{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}article{min-width:0}img,video{width:100%;height:auto}small{color:#c1ceca}p{max-width:1000px}@media(max-width:850px){.builds{grid-template-columns:1fr}}</style>
<main><h1>One mage, three builds</h1><p><a href="/">Play the Broken Court solo or together</a></p>
<p>Same five rooms, enemies, health rules and base spells. Three personal choices after courts 1, 3 and 4. These are actual normal-health, active-enemy runs driven through keyboard, mouse and reward cards. No concept images or fake preview simulation.</p>
<p>Structure offers the clearest measured payoff. Field control trades completion speed for repositioning and safety in some cases. Shared vapour remains the least certain marginal payoff. These scripts are transparent sensitivity tests, not models of human skill or proof of balance.</p>
<div class="builds">'''+''.join(cards)+'''</div><p><small>Runtime '''+', '.join(sorted(builds))+'''. Installed headless Chrome 152 / Intel UHD ANGLE D3D11, 1440x900 viewport, Lightweight 1152x720 drawing buffer on one Windows computer. Recording adds overhead; frame/transport measurements were taken separately. Co-op was also exercised through two local WebRTC clients; this is not a remote-laptop relay test.</small></p>
<p>WASD move; pointer aim; LMB/J Primary; RMB/F/K Secondary; 1-4 or Tab/Q select; Space dodge; E continue/revive. Controls &amp; settings includes your build and device-local rendering quality.</p></main></html>''',encoding='utf-8')
