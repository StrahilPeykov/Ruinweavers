"""Package actual browser captures; no concept rendering or retouched game pixels.
Run after tests have finished: python scripts/art/finish-captures.py
Requires free ffmpeg and Pillow. Full source recordings stay local/ignored.
"""
import json, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[2]
evidence=root/'artifacts/art-finish'
motion=evidence/'motion'
out=root/'public/art-finish'
out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)

def pair(name, left, right, labels, caption):
    # Same complete viewport, uniformly scaled; labels outside the game frame.
    sheet=Image.new('RGB',(1600,590),'#263d45')
    d=ImageDraw.Draw(sheet)
    for i,path in enumerate([left,right]):
        im=Image.open(path).convert('RGB');im.thumbnail((784,490),Image.Resampling.LANCZOS)
        sheet.paste(im,(8+i*800,48))
        d.text((16+i*800,12),labels[i],font=font,fill='#f2e7c9')
    d.text((16,555),caption,font=small,fill='#d4dfdc')
    sheet.save(out/name)

pair('shared-geometry-comparison.jpg',evidence/'shared-geometry-original.png',evidence/'shared-geometry-illustrated.png',
     ['Existing Storybook treatment','Same geometry / brighter illustrated treatment'],
     'Actual engine captures. Same camera and geometry; palette and shading change together. Lightweight.')
pair('benchmark-comparison.jpg',evidence/'shared-geometry-original.png',evidence/'benchmark-lightweight.png',
     ['Previous proof / normal gameplay view','Refined painted court / normal gameplay view'],
     'Actual engine captures, no branding. New articulated mage, broad pigment and composed boundary. Lightweight.')
pair('quality-comparison.jpg',evidence/'benchmark-lightweight.png',evidence/'benchmark-standard.png',
     ['Lightweight / 1152 x 720 drawing buffer','Standard / 1440 x 900 drawing buffer'],
     'Same 1440 x 900 viewport. Standard adds existing shadows; the scene identity remains in Lightweight.')

clips=[]
for art in ['storybook','illustrated']:
    for loadout in ['flow-echo','capacity-tether']:
        key=f'{art}-{loadout}'
        e=json.loads((motion/f'{key}.json').read_text())
        assert e['returnToPlay'] and not e['errors'], f'Failed evidence: {key}'
        start=max(0,e['marks']['sequence']-.3)
        # Include the same logical sequence through the reward and return, at
        # recorded wall-clock speed. Slower rendering legitimately takes longer.
        duration=e['marks']['reward']-start+5
        subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(start),'-i',str(motion/f'raw/{key}.webm'),
                        '-t',str(duration),'-vf','scale=960:-2,fps=24','-an','-c:v','libx264','-preset','veryfast',
                        '-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(out/f'{key}.mp4')],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration',
                       '-of','default=noprint_wrappers=1:nokey=1',str(out/f'{key}.mp4')],text=True))
        # Six evenly distributed frames for a quick inspection of the actual clip.
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(out/f'{key}.mp4'),'-vf',
                        f'fps=6/{duration},scale=480:-2,tile=3x2','-frames:v','1',str(out/f'{key}-filmstrip.jpg')],check=True)
        clips.append({'file':f'{key}.mp4','build':e['captures'][0]['build'],'start':start,'duration':duration,
                      'source':'Actual WebGL/DOM browser video, silent, no speed-up','fixture':e['fixture']})
for name in ['same-principle','reaction','alteration','downed','reward','grayscale','deuteranopia']:
    shutil.copyfile(motion/f'illustrated-flow-echo-{name}.png',out/f'{name}.png')
shutil.copyfile(motion/'illustrated-capacity-tether-alteration.png',out/'capacity-tether.png')
for name in ['benchmark-lightweight.png','benchmark-standard.png']:
    shutil.copyfile(evidence/name,out/name)
(out/'captures.json').write_text(json.dumps(clips,indent=2)+'\n')
print('Packaged three contact sheets, four actual clips and selected state/reward views.')
