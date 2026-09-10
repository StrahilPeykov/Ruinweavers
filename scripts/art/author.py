"""Original Ruinweavers art proof. Blender background authoring, metres, Z up.
Export converts to glTF Y up; all actors face -Y here (+Z at runtime).
No imported meshes, textures, fonts, or proprietary reference assets.
"""
import bpy, math, os
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/art-source'
PALETTES = {
 'storybook': {'cloth':'654563','trim':'D5AE64','stone':'C3AE8B','dark':'293A3B','patina':'647C6A','light':'EFDBAF','wood':'865744'},
 'ink': {'cloth':'294958','trim':'DCA956','stone':'657D82','dark':'182934','patina':'42636B','light':'E4CCA0','wood':'79604F'},
}
style='storybook'
mats={}
parts=[]

def mat(key):
 return mats[key]

def finish(o,name,key):
 o.name=name; o.data.materials.append(mat(key)); parts.append(o)
 return o

def cube(name,pos,size,key,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
 o=bpy.context.object; o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Fitted softened edge','BEVEL'); m.width=bevel; m.segments=2 if style=='storybook' else 1
  bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,name,key)

def ellipsoid(name,pos,scale,key):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12 if style=='storybook' else 6,ring_count=6,location=pos)
 o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if style=='storybook':
  for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,key)

def cone(name,pos,r1,r2,height,key,n=None):
 bpy.ops.mesh.primitive_cone_add(vertices=n or (12 if style=='storybook' else 5),radius1=r1,radius2=r2,depth=height,location=pos)
 return finish(bpy.context.object,name,key)

def rod(name,a,b,r,key,n=8):
 a,b=Vector(a),Vector(b); o=cone(name,(a+b)/2,r,r,(b-a).length,key,n)
 o.rotation_mode='QUATERNION'; o.rotation_quaternion=(b-a).to_track_quat('Z','Y')
 return o

def arch(name,pos,r,width,key,start=0,end=math.pi,n=12,depth=.22):
 # Vertical fitted annular segment in XZ, forward face is -Y.
 verts=[]
 for y in [-depth/2,depth/2]:
  for rr in [r-width/2,r+width/2]:
   for i in range(n+1):
    a=start+(end-start)*i/n; verts.append((pos[0]+math.cos(a)*rr,pos[1]+y,pos[2]+math.sin(a)*rr))
 k=n+1; faces=[]
 for i in range(n):
  faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
 faces.extend([(0,k,3*k,2*k),(n,2*k+n,3*k+n,k+n)])
 mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
 o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); return finish(o,name,key)

def cape():
 # Open pleated shoulder mantle; deliberately different topology/proportion.
 verts=[]; n=12 if style=='storybook' else 6
 for z,rx,ry in [(1.22,.28,.23),(.96,.43,.30),(.44,.40,.29)]:
  for i in range(n+1):
   a=-.20+(math.pi+ .4)*i/n
   pleat=(.025 if i%2 else -.025) if style=='ink' else 0
   verts.append((math.cos(a)*(rx+pleat),math.sin(a)*(ry+pleat)+.035,z))
 faces=[]
 for row in range(2):
  for i in range(n):
   k=row*(n+1)+i;faces.append((k,k+1,k+n+2,k+n+1))
 mesh=bpy.data.meshes.new('mantle');mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new('mantle',mesh);bpy.context.collection.objects.link(o);finish(o,'mantle','cloth')
 m=o.modifiers.new('cloth thickness','SOLIDIFY');m.thickness=.025;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return o

def mage():
 for x in [-.14,.14]:cube('boot',(x,-.04,.14),(.20,.32,.25),'dark',.04)
 cone('tunic',(0,0,.59),.32,.22,.75,'cloth')
 cone('collar',(0,0,1.03),.38,.20,.30,'trim')
 hood=ellipsoid('hood',(0,.015,1.33),(.32,.28,.33),'cloth')
 if style=='ink':hood.rotation_euler[1]=.2
 ellipsoid('face',(0,-.229,1.29),(.20,.065,.20),'dark')
 cube('brow',(0,-.281,1.43),(.32,.04,.06),'light',.01)
 # Small face opening, asymmetrical satchel and measuring staff show facing.
 ellipsoid('nose',(0,-.30,1.27),(.055,.06,.055),'light')
 cube('satchel',(-.30,.15,.63),(.22,.24,.32),'wood',.06)
 rod('arm',(.25,0,.95),(.40,-.19,.75),.085,'cloth')
 ellipsoid('hand',(.40,-.20,.78),(.10,.09,.09),'light')
 rod('staff',(.40,-.21,.18),(.40,-.21,1.69),.035,'wood')
 if style=='storybook': arch('measure',(.40,-.21,1.71),.14,.045,'trim',-.25,math.pi*1.65,16,.055)
 else:
  for a,b in [((.4,-.21,1.49),(.54,-.21,1.72)),((.54,-.21,1.72),(.4,-.21,1.88)),((.4,-.21,1.88),(.26,-.21,1.72)),((.26,-.21,1.72),(.4,-.21,1.49))]:rod('measure',a,b,.026,'trim',4)
 cube('identity',(-.11,-.27,1.08),(.24,.05,.12),'light',.02)
 return cape()

def sentinel():
 cone('foot',(0,0,.14),.54,.42,.28,'dark')
 for x in [-.26,.26]:rod('strut',(x,0,.22),(x*.8,0,.72),.09,'trim')
 if style=='storybook':
  ellipsoid('shell',(0,.03,1.02),(.54,.30,.64),'stone')
  arch('lens',(0,-.29,1.14),.33,.12,'trim',0,2*math.pi,16,.10)
  ellipsoid('eye',(0,-.36,1.14),(.20,.10,.20),'dark')
  for x in [-.40,.40]:ellipsoid('pauldron',(x,0,.90),(.20,.25,.34),'patina')
 else:
  cone('shell',(0,0,1.01),.51,.14,1.15,'stone',4)
  cube('aperture',(0,-.32,1.10),(.12,.07,.52),'light')
  for x in [-.43,.43]:
   o=cone('blade',(x,0,1.03),.18,.04,.9,'dark',3);o.rotation_euler[1]=x*.5
 cube('hot-slit',(0,-.405,1.14),(.08,.025,.18),'trim')

def pursuer():
 ellipsoid('carapace',(0,.08,.54),(.42,.49,.30),'stone')
 for side in [-1,1]:
  for y in [-.22,.32]:
   rod('leg',(side*.26,y,.53),(side*.45,y-.12,.13),.075,'dark')
   cube('foot',(side*.43,y-.17,.10),(.13,.23,.15),'trim',.025)
 if style=='storybook':
  ellipsoid('mask',(0,-.36,.63),(.36,.20,.32),'patina')
  for x in [-.19,.19]:arch('binding',(x,-.16,.59),.18,.055,'trim',0,math.pi,8,.40)
 else:
  o=cone('prow',(0,-.31,.67),.37,0,.64,'patina',3);o.rotation_euler[0]=math.pi/2
  for x in [-.30,.30]:
   o=cone('fin',(x,.1,.72),.17,0,.52,'dark',3);o.rotation_euler[0]=-.6
 cube('forward-eye',(0,-.535,.64),(.32,.035,.075),'light')

def cover():
 # All visible solids stay inside the unchanged 1.8 x 1.7 x 2.2 collider.
 cube('core',(0,0,.80),(1.78,2.16,1.6),'stone',.08 if style=='storybook' else .025)
 cube('cap',(0,0,1.64),(1.8,2.2,.12),'light',.04)
 for y in [-1.09,1.09]:
  if style=='storybook':arch('fitted-joint',(0,y,.85),.61,.09,'patina',0,2*math.pi,16,.015)
  else:
   for x in [-.5,0,.5]:
    o=cube('scored-joint',(x,y,.85),(.07,.02,1.35),'dark');o.rotation_euler[1]=.28
 for x in [-.72,.72]:cube('brace',(x,0,.85),(.10,2.2,1.60),'trim',.01)

def landmark():
 # Outside north wall; its base never promises a reachable gameplay surface.
 if style=='storybook':
  for i in range(9):
   a=.08+i*.34
   arch('fitted-arch',(0,0,2.2),4.1,.82,'stone' if i%3 else 'patina',a,a+.295,4,1.1)
   arch('inner-binding',(0,-.58,2.2),3.85,.09,'trim',a,a+.295,4,.08)
  for x in [-4.1,4.1]:cube('root',(x,0,1.1),(1.25,1.7,2.2),'stone',.15)
 else:
  for side in [-1,1]:
   for i in range(5):
    o=cube('folded-fin',(side*(4.1-i*.53),i*.06,1.2+i*.94),(.70,1.4,2.5),'stone' if i%2 else 'patina',.015)
    o.rotation_euler[1]=-side*(.18+i*.13)
    o=cube('ink-seam',(side*(4.1-i*.53),-.73+i*.06,1.2+i*.94),(.12,.045,2.15),'light');o.rotation_euler[1]=-side*(.18+i*.13)
 cube('foundation',(0,0,.16),(10.5,2.7,.32),'dark',.05)

def vessel():
 # Second matching prop, same primitives/material/pivot/export contract.
 cone('vessel',(0,0,.44),.36,.25,.70,'patina')
 cone('lip',(0,0,.81),.29,.29,.10,'trim')
 cone('opening',(0,0,.868),.235,.235,.012,'dark')
 cone('foot',(0,0,.07),.32,.25,.14,'stone')
 for x in [-.34,.34]:arch('handle',(x,0,.55),.16,.06,'trim',0,2*math.pi,10,.09)

def timber():
 cube('crate',(0,0,.79),(1.16,1.16,1.58),'wood',.035)
 for z in [.2,1.35]:cube('binding',(0,0,z),(1.19,1.19,.10),'trim',.015)
 for x in [-.35,0,.35]:cube('plank',(x,-.586,.79),(.035,.012,1.40),'dark')

def ballast():
 cube('weight',(0,0,.73),(1.57,1.57,1.46),'patina',.10)
 cube('binding',(0,0,.83),(.22,1.59,1.55),'trim',.025)
 arch('ring',(0,0,1.5),.18,.08,'dark',0,math.pi,12,.16)

def loose():
 cone('fragment',(0,0,.35),.36,.24,.7,'stone',6)
 cube('inlay',(0,-.27,.39),(.18,.025,.24),'patina')

def pack(name,animated):
 global parts
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
 static=[o for o in parts if o!=animated]
 bpy.ops.object.select_all(action='DESELECT')
 for o in static:o.select_set(True)
 bpy.context.view_layer.objects.active=static[0];bpy.ops.object.join();merged=bpy.context.object;merged.name=name+'_solid'
 # World transforms baked, feet/origin at zero.
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');merged.parent=root
 if animated:
  animated.name=name+'_mantle';animated.parent=root
  for f,v in [(1,-.025),(16,.025),(31,-.025)]:
   animated.rotation_euler[0]=v;animated.keyframe_insert(data_path='rotation_euler',frame=f)
  animated.animation_data.action.name='Mantle_breath'
 for o in bpy.context.selected_objects:o.select_set(False)
 root.select_set(True);merged.select_set(True)
 if animated:animated.select_set(True)
 target=OUT/style;target.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(target/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_materials='EXPORT',export_extras=True)

for style in PALETTES:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.context.scene.frame_end=31
 mats={}
 for key,hexcode in PALETTES[style].items():
  m=bpy.data.materials.new(key);m.use_nodes=True
  rgb=[int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
  # Convert sRGB palette to linear factors (glTF factors are linear).
  rgba=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]+[1]
  m.diffuse_color=rgba;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba;p.inputs['Roughness'].default_value=.86;p.inputs['Metallic'].default_value=.08 if key=='trim' else 0
  mats[key]=m
 for name,fn in [('mage',mage),('sentinel',sentinel),('pursuer',pursuer),('cover',cover),('landmark',landmark),('vessel',vessel),('timber',timber),('ballast',ballast),('loose',loose)]:
  parts=[];animated=fn();pack(name,animated)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(style+'.blend')))
print('Authored both original asset sets.')
