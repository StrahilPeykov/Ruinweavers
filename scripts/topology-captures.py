"""Package unretouched real Playwright frames and a short gameplay excerpt.
Run after browser/performance testing, never concurrently with measurements.
"""
from pathlib import Path
from PIL import Image
import subprocess, json, sys
root=Path(__file__).resolve().parents[1]
raw=root/(sys.argv[1] if len(sys.argv)>1 else 'artifacts/topology-0.3/raw/recorded-final')
out=root/'public/topology'
out.mkdir(parents=True,exist_ok=True)
focused=sorted((root/'artifacts/topology-0.3/raw').glob('focused-*/render.json'),key=lambda p:p.stat().st_mtime)[-1].parent
for source,dest in [(raw/'coop-route-0-disagreement.png','route-disagreement.jpg'),
                    (raw/'coop-route-0-agreed.png','route-agreed.jpg'),
                    (focused/'approach-lightweight-combat.png','approach-gameplay.jpg'),
                    (focused/'diagonal-lightweight-combat.png','diagonal-gameplay.jpg')]:
    Image.open(source).convert('RGB').save(out/dest,quality=88)
# Both recordings are real local clients; choose the last context finalized (guest).
video=sorted((raw/'raw').glob('*.webm'),key=lambda p:p.stat().st_mtime)[-1]
subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','6','-i',str(video),'-t','30',
                '-vf','scale=960:-2','-an','-c:v','libx264','-preset','fast','-crf','25',
                '-movflags','+faststart',str(out/'route-gameplay.mp4')],check=True)
for t in [3,12,23]:
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(t),'-i',str(out/'route-gameplay.mp4'),
                    '-frames:v','1',str(raw/f'clip-inspection-{t}.png')],check=True)
data=json.loads((raw/'coop.json').read_text())
(out/'capture.json').write_text(json.dumps({'build':data['environment']['build'],'generator':data['route']['version'],
    'browser':data['environment']['browser'],'renderer':data['environment']['render']['renderer'],
    'viewport':data['environment']['viewport'],'drawingBuffer':data['environment']['render']['drawingBuffer'],
    'note':'Actual normal-health local two-client run, real mouse/keyboard and card clicks. Video recording affects frame cost; separate unrecorded evidence supplies performance measurements.',
    'rooms':[next(n['room'] for n in data['route']['nodes'] if n['id']==id) for id in data['route']['visited']]},indent=2))
