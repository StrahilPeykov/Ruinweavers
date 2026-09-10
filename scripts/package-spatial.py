"""Package actual unretouched browser viewports and a short video excerpt.
Run AFTER browser performance work: python scripts/package-spatial.py RUN_DIR VIDEO_PATH
Only selected media and sanitized measurement fields enter Git; raw logs stay local.
"""
import json, sys, subprocess, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
run=Path(sys.argv[1]); video=Path(sys.argv[2]); out=Path('public/spatial');out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',24)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',19)
sheet=Image.new('RGB',(1600,1650),'#233d44');d=ImageDraw.Draw(sheet)
names=['Split court · crossfire','Offset gallery · circulation','Rotunda · two approaches','Repair yard · material elbow','Warden crossing · committed routes']
for i,name in enumerate(names):
 p=run/f'solo-room-{i+1}.png';im=Image.open(p).convert('RGB');im.thumbnail((780,488),Image.Resampling.LANCZOS)
 x=10+(i%2)*800;y=50+(i//2)*545;sheet.paste(im,(x,y));d.text((x,y-36),name,font=font,fill='#f3e5c7')
 if i in [2,4]:shutil.copyfile(p,out/f'court-{i+1}.png')
d.text((810,1200),'Actual gameplay viewports',font=font,fill='#f3e5c7');d.text((810,1240),'Same camera, fixed run, existing magic.',font=small,fill='#d5dfd8');d.text((810,1280),'Plans / traces are separate diagnostics.',font=small,fill='#d5dfd8')
sheet.save(out/'run-contact.png')
subprocess.run(['ffmpeg','-y','-ss','8','-i',str(video),'-t','26','-vf','scale=960:-2','-an','-c:v','libvpx-vp9','-b:v','0','-crf','37','-row-mt','1',str(out/'spatial-run.webm')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
source={}
for name in ['solo','coop']:
 p=run/f'{name}.json'
 if not p.exists():continue
 r=json.loads(p.read_text(encoding='utf-8-sig'))
 measurements=[]
 for m in r['measurements']:
  render=m['render'];measurements.append({k:m[k] for k in ['role','frames','rooms','maxFields']}|{'render':{k:render[k] for k in ['quality','renderer','viewport','drawingBuffer','drawCalls','triangles','geometries','textures','contextLost']},'assets':{k:render['art'][k] for k in ['downloadBytes','loadMs','assets','sharedGeometries']}})
 source[name]={'build':r['environment']['build'],'browser':r['environment']['browser'],'wallSeconds':r['wallSeconds'],'combatSeconds':r['combatSeconds'],'status':r['status'],'measurements':measurements,'results':r['results'],'upgrades':r['upgrades'],'transport':[{k:t[k] for k in ['role','snapshotIntervals','snapshotApply','serialization','wireBytes','inputAcknowledgement','peakScheduled','droppedSnapshots']} for t in r['transport']]}
Path('artifacts/spatial-0.3/browser-validation.json').write_text(json.dumps(source,indent=2),encoding='utf-8')
print('Packaged actual run viewports, excerpt and sanitized measurements.')
