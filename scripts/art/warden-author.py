"""Original Bound Warden; same illustrated material/export recipe, metres, +Z glTF forward.
No external assets. Two separate physical plate instances share one exported mesh.
"""
from pathlib import Path
import bpy, math
source=Path(__file__).with_name('finish-author.py')
exec(compile(source.read_text().split('for name,fn in [')[0],str(source),'exec'))

def warden():
 root=joint('warden',(0,0,0))
 def torso():
  cone('load-bearing-core',(0,0,1.65),.74,.83,1.4,'dark',10)
  for side in [-1,1]:
   o=cube('painted-breast',(side*.39,-.56,1.98),(.66,.32,.94),'patina',.10);o.rotation_euler[1]=side*.13
   cube('repair-staple',(side*.39,-.75,1.99),(.12,.07,.68),'trim',.02)
   rod('shoulder-yoke',(side*.60,0,2.20),(side*1.08,0,2.20),.13,'trim')
  cube('sternum',(0,-.63,1.61),(.30,.20,1.2),'stone',.045)
  # Fitted furnace shutters; broad, purposeful shapes instead of glowing noise.
  for z in [1.30,1.48,1.66]:cube('furnace-louvre',(0,-.77,z),(.52,.10,.085),'trim',.014)
  cube('pelvis',(0,0,.90),(1.25,.80,.45),'stone',.1)
  for side in [-1,1]:
   rod('spine-brace',(side*.48,.38,1.04),(side*.61,.46,2.25),.08,'trim')
 section('torso',(0,0,1.15),root,torso)
 def head():
  cone('crown',(0,0,2.55),.46,.37,.48,'stone',8)
  cube('face',(0,-.31,2.53),(.61,.22,.34),'patina',.06)
  cube('visor',(0,-.432,2.59),(.44,.025,.075),'light',.01)
  cube('brow',(0,-.42,2.76),(.74,.30,.12),'trim',.025)
  arch('broken-halo',(0,.08,2.55),.66,.075,'trim',-.15,3.3,12,.1)
 section('head',(0,0,2.28),root,head)
 for side in [-1,1]:
  tag='L' if side<0 else 'R';x=side*.48
  def leg(x=x):
   rod('bronze-thigh',(x,0,1.04),(x,0,.5),.20,'trim')
   cube('shin',(x,-.035,.40),(.43,.55,.63),'patina',.065)
   cube('foot',(x,-.19,.13),(.63,.89,.24),'stone',.065)
   cube('edge',(x,-.63,.15),(.54,.025,.12),'trim',.01)
  section('leg'+tag,(x,0,1.02),root,leg)
  def arm(side=side):
   rod('arm-pin',(side*.82,0,2.15),(side*.94,-.03,1.60),.15,'trim')
   cube('throwing-fist',(side*.91,-.09,1.47),(.40,.44,.45),'stone',.075)
  section('arm'+tag,(side*.80,0,2.17),root,arm)
 return root

def plate():
 # Collar to greave: an ordinary ward plate hangs clear of the central core.
 cube('plate-back',(0,.05,.96),(.92,.63,1.78),'dark',.12)
 cube('painted-plate',(0,-.18,1.02),(.96,.30,1.64),'patina',.1)
 for side in [-1,1]:cube('stone-edge',(side*.43,-.22,1.02),(.14,.18,1.45),'stone',.035)
 for z in [.40,1.52]:cube('fitted-band',(0,-.36,z),(.98,.085,.13),'trim',.02)
 rod('central-binding',(0,-.37,.27),(0,-.37,1.78),.045,'trim')
 # Broad surviving painted face, never an active target marker.
 cube('paint-repair',(0,-.347,1.06),(.48,.02,.50),'stone',.045)

export('warden',warden)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'warden.blend'))
export('wardplate',plate)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wardplate.blend'))
print('Authored one articulated Warden and one reusable physical ward plate.')
