"""One original illustrated court. Reuses the proven authoring primitives.
Metres, feet at zero, Blender -Y forward -> glTF +Z. No external assets.
Articulated named joints are posed by the non-authoritative view adapter.
"""
from pathlib import Path
import bpy, math
source=Path(__file__).with_name('author.py')
exec(compile(source.read_text().split('for style in PALETTES:')[0],str(source),'exec'))
style='storybook' # smooth original primitive tessellation, not another style family
OUT=ROOT/'assets/art-source'
bpy.ops.wm.read_factory_settings(use_empty=True)
# One original, reusable broad brush-value map. No noise, normal map or unique texture sets.
image=bpy.data.images.new('shared-pigment',width=256,height=256,alpha=False)
pixels=[]
for y in range(256):
 for x in range(256):
  u=x/256;v=y/256
  wash=.92+.035*math.sin(u*8+v*3)+.025*math.sin(v*17+math.sin(u*5))
  # A few long worn brush edges, broad enough to survive minification.
  for center in [.18,.57,.82]:
   if abs(v-center-.018*math.sin(u*23))<.016 and .08<u<.88:wash-=.07
  pixels.extend([wash,wash,wash,1])
image.pixels=pixels;image.filepath_raw=str(OUT/'shared-pigment.png');image.file_format='PNG';image.save()
palette={'cloth':'785578','trim':'DDB277','stone':'DED7BC','dark':'334453','patina':'537F91','light':'F2E7C9','wood':'936451','skin':'B98067','hair':'382F3C','red':'BA715D','green':'667D6E'}
for key,h in palette.items():
 m=bpy.data.materials.new(key);m.use_nodes=True
 rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)];rgba=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]+[1]
 m.diffuse_color=rgba;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba;p.inputs['Roughness'].default_value=.55 if key=='trim' else .92
 mats[key]=m

def joint(name,pos,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos
 if parent:o.parent=parent
 return o

def merge_into(items,name,parent,pivot=(0,0,0)):
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.context.scene.cursor.location=pivot;bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
 return o

def section(name,pivot,parent,build):
 global parts
 start=len(parts);build();items=parts[start:];del parts[start:]
 node=joint(name,pivot);merge_into(items,name+'_mesh',node,pivot)
 if parent:world=node.matrix_world.copy();node.parent=parent;node.matrix_world=world
 return node

def human():
 root=joint('mage',(0,0,0));hips=joint('hips',(0,0,0),root)
 def torso():
  cone('coat',(0,0,1.09),.24,.27,.58,'cloth',10)
  cube('belt',(0,0,.91),(.49,.34,.095),'dark',.02)
  cube('buckle',(0,-.19,.92),(.13,.035,.10),'trim',.015)
  # Broad lapels and diagonal sash survive distance; no embroidered noise.
  for x in [-.15,.15]:
   o=cube('lapel',(x,-.17,1.23),(.10,.065,.37),'light',.025);o.rotation_euler[1]=x*.9
  o=cube('sash',(0,-.213,1.14),(.10,.045,.59),'red',.015);o.rotation_euler[1]=-.48
  cube('satchel',(-.29,.10,.84),(.22,.20,.27),'wood',.04)
 section('chest',(0,0,1.1),hips,torso)
 def head():
  rod('neck',(0,0,1.37),(0,0,1.51),.085,'skin')
  ellipsoid('face',(0,-.012,1.66),(.15,.135,.205),'skin')
  ellipsoid('hair',(0,.035,1.735),(.175,.148,.165),'hair')
  cube('brow',(0,-.138,1.73),(.24,.03,.04),'hair',.009)
  cone('nose',(0,-.166,1.64),.042,.018,.10,'skin',5).rotation_euler[0]=math.pi/2
  ellipsoid('tied-hair',(0,.19,1.59),(.07,.09,.12),'hair')
 section('head',(0,0,1.46),hips,head)
 for side in [-1,1]:
  tag='L' if side<0 else 'R';x=side*.135
  thigh=section('thigh'+tag,(x,0,.91),hips,lambda x=x:rod('trouser',(x,0,.90),(x,-.015,.51),.108,'dark'))
  def shin(x=x):
   rod('boot-shaft',(x,-.015,.51),(x,-.025,.15),.093,'wood')
   cube('boot',(x,-.085,.095),(.19,.32,.18),'dark',.04)
   cube('boot-band',(x,-.018,.41),(.195,.19,.055),'trim',.008)
  section('shin'+tag,(x,-.015,.51),thigh,shin)
  x=side*.29
  upper=section('upper'+tag,(x,0,1.35),hips,lambda x=x:rod('sleeve',(x,0,1.35),(x,-.015,1.04),.095,'cloth'))
  def fore(x=x,side=side):
   rod('sleeve-cuff',(x,-.015,1.04),(x,-.055,.88),.082,'light')
   rod('forearm',(x,-.055,.92),(x,-.08,.79),.058,'skin')
   ellipsoid('hand',(x,-.08,.78),(.068,.065,.084),'skin')
   if side>0:
    rod('staff',(x,-.08,.14),(x,-.08,1.81),.023,'wood')
    arch('measure',(x,-.08,1.82),.12,.031,'trim',-.4,4.8,12,.04)
  section('fore'+tag,(x,-.015,1.04),upper,fore)
 def mantle():
  # Split short travelling cape, shoulder pivot, broad two-color hem.
  verts=[(-.29,.07,1.37),(.29,.07,1.37),(-.33,.23,1.05),(.33,.23,1.05),(-.28,.30,.67),(-.04,.31,.73),(.04,.31,.73),(.28,.30,.67)]
  faces=[(0,1,3,2),(2,3,6,5),(2,5,4),(3,7,6)]
  mesh=bpy.data.meshes.new('split-mantle');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('split-mantle',mesh);bpy.context.collection.objects.link(o);finish(o,'mantle','cloth')
  sol=o.modifiers.new('Thickness','SOLIDIFY');sol.thickness=.025;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
  rod('hem-left',verts[4],verts[5],.022,'trim');rod('hem-right',verts[6],verts[7],.022,'trim')
 section('cape',(0,.07,1.37),hips,mantle)
 return root

def painted_cover():
 cover()
 # Architectural paint is a broad panel; cracks and repairs are large and static.
 for y in [-1.098,1.098]:
  cube('painted-panel',(0,y,.88),(1.22,.006,.83),'patina')
  for x,z,w in [(-.49,.63,.14),(.39,1.10,.20),(.47,.67,.11)]:cube('lost-plaster',(x,y*1.002,z),(w,.004,.15),'stone')
  for a,b in [((-.1,y*1.004,.50),(.03,y*1.004,.82)),((.03,y*1.004,.82),(-.08,y*1.004,1.24))]:rod('repair',a,b,.023,'trim',4)

def monument():
 cube('high-support',(0,0,-1.15),(4.5,.65,2.3),'stone',.04)
 for x in [-2.0,2.0]:
  cube('pedestal',(x,0,.6),(.9,1.2,1.2),'stone',.08)
  cube('pigment',(x,-.606,.72),(.60,.012,.67),'patina')
 for i in range(8):
  a=.08+i*.4
  arch('repaired-ring',(0,0,1.35),2.0,.40,'patina' if i%3==0 else 'stone',a,a+.36,4,.64)
  arch('edge-inlay',(0,-.34,1.35),1.88,.035,'trim',a,a+.35,4,.035)
 # Asymmetrical suspended mechanical vane, static and non-emissive.
 rod('crossbar',(-1.7,0,1.9),(1.7,0,1.9),.055,'dark')
 o=cube('vane',(.5,0,2.2),(.38,.12,1.4),'red',.035);o.rotation_euler[1]=-.4

def surround():
 # Everything is outside or below the existing combat volume.
 # The existing wall is dressed within its solid envelope, not punctured.
 for side in [-1,1]:
  cube('wall-body',(side*12.3,0,.725),(.60,22,2.45),'patina')
  for y in [-9,-6,-3,0,3,6,9]:
   cube('wall-cap',(side*12.3,y,2.04),(.60,2.90,.12),'stone',.025)
   cube('wall-panel',(side*11.996,y,.98),(.008,2.64,1.13),'patina')
   cube('wall-foot',(side*11.995,y,.12),(.018,2.78,.16),'stone')
  for y in [-7.5,1.5,7.5]:cube('bond',(side*11.989,y,1.02),(.009,.18,1.45),'trim')
 for y in [-11.3,11.3]:
  cube('wall-body',(0,y,.725),(24,.60,2.45),'patina')
  for x in [-10,-6,-2,2,6,10]:
   cube('wall-cap',(x,y,2.04),(3.9,.60,.12),'stone',.025)
   cube('wall-panel',(x,y-math.copysign(.304,y),.98),(3.70,.008,1.13),'patina')
   cube('wall-foot',(x,y-math.copysign(.305,y),.12),(3.75,.018,.16),'stone')
 for side in [-1,1]:
  cube('terrace',(side*17,0,-1.65),(9,27,1.4),'patina',.25)
  for i in range(7):
   x=side*(13.3+(i%3)*1.6);y=-11+i*3.9
   cube('buttress',(x,y,-.9),(1.3,2.1,2.0),'stone',.10)
   cube('buttress-paint',(x,y-.99,-.45),(1.15,.02,.65),'patina')
 cube('north-terrace',(0,16,-2),(28,9,1.3),'patina',.3)
 for x in [-10,-5,4,9]:
  cube('distant-plinth',(x,17,-.8),(2,2.4,2),'stone',.08)
  for dx in [-.65,.65]:cone('distant-column',(x+dx,17,1.4),.28,.23,2.6,'stone')
  cube('lintel',(x,17,2.8),(2.1,.8,.4),'stone',.06)
 # A few large foliage masses frame the boundary; no scattered noisy grass.
 for x,y in [(-13.3,-7),(13.4,-8),(-14,10),(-15,13)]:
  rod('trunk',(x,y,-.4),(x+.2,y,2.5),.15,'wood')
  for dx,dy,z in [(-.6,0,2.5),(.5,.1,2.8),(0,.5,3.1)]:ellipsoid('canopy',(x+dx,y+dy,z),(1,.7,.6),'green')

def paint_vertices(root):
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if not o.data.uv_layers:
   uv=o.data.uv_layers.new(name='UVMap')
   for loop in o.data.loops:
    v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*.8+.5,v.z*.8)
  colors=o.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='CORNER')
  for poly in o.data.polygons:
   for li in poly.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co
    # Broad low-frequency value/pigment shifts, not speckle. Upward planes lighter.
    value=.90+.05*math.sin(v.x*2+v.z*1.7)+.035*poly.normal.z
    colors.data[li].color=(value,value*.995,value*.975,1)
  o.data.color_attributes.active_color=colors

def export(name,fn):
 global parts
 parts=[];root=fn()
 if not root:
  root=joint(name,(0,0,0));merge_into(parts,name+'_solid',root)
 paint_vertices(root)
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 target=OUT/'illustrated';target.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(target/(name+'.glb')),export_format='GLB',use_selection=True,export_materials='EXPORT',export_extras=True,export_vertex_color='ACTIVE')

for name,fn in [('mage',human),('sentinel',sentinel),('pursuer',pursuer),('cover',painted_cover),('landmark',monument),('vessel',vessel),('timber',timber),('ballast',ballast),('loose',loose),('surround',surround)]:export(name,fn)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'illustrated.blend'))
print('Authored one articulated mage and painted court.')
