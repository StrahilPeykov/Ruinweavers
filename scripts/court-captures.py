"""Package a small actual-play handoff after browser tests/measurement finish.
Usage: python scripts/court-captures.py CAPTURE_DIR RECORDED_WEBM
No staged/fake simulation, generated concept imagery or external assets.
"""
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

source = Path(sys.argv[1])
video = Path(sys.argv[2])
out = Path('public/broken-court')
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 19)
sheet = Image.new('RGB', (1440, 670), '#293f4a')
draw = ImageDraw.Draw(sheet)
names = ['Threshold', 'Painted colonnade', 'Divided hall', 'Approach', 'Last ward']
for i, name in enumerate(names):
    im = Image.open(source / f'coop-room-{i+1}.png').convert('RGB')
    im.thumbnail((480,300))
    x,y = (i%3)*480,(i//3)*335
    sheet.paste(im,(x,y))
    draw.text((x+12,y+306),f'{i+1} / {name}',font=font,fill='#f2e7c9')
im = Image.open(source/'coop-victory.png').convert('RGB'); im.thumbnail((480,300))
sheet.paste(im,(960,335));draw.text((972,641),'The ward settles / victory',font=font,fill='#f2e7c9')
sheet.save(out/'five-courts-actual-gameplay.jpg',quality=88)
Image.open(source/'coop-room-3.png').save(out/'illustrated-coop-gameplay.png')
subprocess.run(['ffmpeg','-y','-ss','7','-i',str(video),'-t','15',
                '-vf','scale=960:-2','-an','-c:v','libx264','-preset','medium',
                '-crf','24','-movflags','+faststart',str(out/'normal-coop-combat.mp4')],check=True)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Ruinweavers | Through the Broken Court</title>
<style>body{margin:0;background:#293f4a;color:#f2e7c9;font:17px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:32px 20px}h1{font:42px Georgia}a{color:#edc990}img,video{width:100%;height:auto;margin:12px 0;border-radius:4px}small{color:#c3cdca}</style>
<main><p>RUINWEAVERS</p><h1>Through the Broken Court</h1><p><a href="/">Play solo or create / join co-op</a></p>
<p>Five connected encounters, two personal alteration choices, one final ward. New run draws a fresh seed; Retry same seed repeats its offers given the same choices.</p>
<video controls muted playsinline preload="metadata" src="normal-coop-combat.mp4" poster="illustrated-coop-gameplay.png"></video>
<small>Actual two-client local WebRTC gameplay. Normal health and active enemies; scripted choices executed through real keyboard/mouse inputs. Lightweight, native Chrome / Intel UHD on one Windows computer. Video recording affects frame timings; performance was measured separately. No concept images.</small>
<img src="five-courts-actual-gameplay.jpg" alt="Actual views of the five courts and the final resolution">
<p>WASD move · pointer aim · hold LMB/J Primary · RMB/F/K Secondary · 1–4 or Tab/Q select · Space dodge · E continue/revive.</p>
<p>Create co-op, copy the room code, partner joins, both Ready. Controls and settings include Standard/Lightweight and the preserved development comparisons.</p></main></html>''',encoding='utf-8')
