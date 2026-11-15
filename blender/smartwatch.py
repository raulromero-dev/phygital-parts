"""Seeed Round Display v1.1 planning model; reuse official Eagle outline/placements.
Glass and component heights are illustrative. Run with Blender --background --python.
The existing XIAO manufacturer STEP-derived GLB is reused without alteration.
"""
import bpy, math, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
r=ET.parse(ROOT/'blender/vendor/round-display/round-display-v1.1.brd').getroot()
mats={}
for name,color,metal in [('PCB',(.025,.035,.04),0),('Glass',(.008,.013,.019),.15),('Rubber',(.012,.015,.02),0),('Gold',(.67,.47,.16),.75),('Tin',(.5,.55,.59),.8),('Ceramic',(.68,.64,.53),0),('Ink',(.68,.73,.76),.1),('Orange',(.7,.2,.09),0)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.35;mats[name]=m

def finish(o,name,mat):
 o.name=name;o.data.materials.append(mats[mat]);return o

def box(name,w,h,d,x,y,z,mat,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.z=rot
 bevel=o.modifiers.new('Soft edges','BEVEL');bevel.width=min(.12,h/4);bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 return finish(o,name,mat)

def disc(name,radius,height,x,y,z,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=radius,depth=height,location=(x,-z,y));return finish(bpy.context.object,name,mat)

# Stitch the manufacturer's straight and curved outline segments into one polygon.
wires=[dict(w.attrib) for w in r.findall('.//board/plain/wire') if w.get('layer')=='20']
segments=[]
for w in wires:
 a=(float(w['x1']),float(w['y1']));b=(float(w['x2']),float(w['y2']));theta=math.radians(float(w.get('curve',0)))
 if abs(theta)<.0001: pts=[a,b]
 else:
  dx,dy=b[0]-a[0],b[1]-a[1];f=1/(2*math.tan(theta/2));cx=(a[0]+b[0])/2-dy*f;cy=(a[1]+b[1])/2+dx*f;radius=math.hypot(a[0]-cx,a[1]-cy);angle=math.atan2(a[1]-cy,a[0]-cx);n=max(4,math.ceil(abs(theta)*32));pts=[(cx+radius*math.cos(angle+theta*i/n),cy+radius*math.sin(angle+theta*i/n)) for i in range(n+1)]
 segments.append(pts)
outline=segments.pop(0)
while segments:
 for j,pts in enumerate(segments):
  if math.dist(outline[-1],pts[0])<.001: outline+=pts[1:];segments.pop(j);break
  if math.dist(outline[-1],pts[-1])<.001: outline+=list(reversed(pts))[1:];segments.pop(j);break
 else: raise ValueError('Disconnected manufacturer outline')
outline=outline[:-1];n=len(outline);verts=[(-y,-x,z) for z in [.3,1.3] for x,y in outline];faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Manufacturer outline');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Seeed v1.1 PCB',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,'PCB')
# Two rear sockets at Eagle J4/J5 centres; socket cavities and contact bodies estimated.
for side in [-1,1]:
 x=side*7.62;box('2.54 mm 7-way socket',2.5,4.8,18.28,x,-2.1,-9.652,'Rubber')
 for pin in range(7):
  z=-9.652+(pin-3)*2.54;box('Socket contact',.9,.5,.9,x,-4.75,z,'Gold');box('Contact opening',.55,.05,.55,x,-5,z,'Rubber')
# Reuse all small component placement centres from the Eagle board.
for e in r.findall('.//board/elements/element'):
 name=e.get('name');x=-float(e.get('y'));z=float(e.get('x'));rot=-math.radians(float((e.get('rot') or 'R0').replace('R','').replace('M','')))
 if name[0] in ['R','C','D','Q','U','L'] and not name.startswith('U$'):
  if e.get('value')=='DNP': continue
  if name.startswith('U'): w,d,h=(3.9,5,1.3) if name=='U4' else (2,2,.7)
  elif name.startswith('Q'):w,d,h=1.2,2,.8
  else:w,d,h=.55,1.05,.45
  box(name,w,h,d,x,.3-h/2,z,'Rubber' if name[0] in 'RQU' else 'Ceramic',rot)
box('J1 battery 1.25 socket',5,3,4,0,-1.2,-19.731,'Ceramic')
box('microSD socket',12,2,13,0,-.7,5.715,'Tin')
disc('CR927 holder',4.8,2.6,-11.959,-1,7.008,'Tin')
box('FPC connector',3,1,9,8.255,-.2,9.906,'Ceramic')
disc('Display bezel',19.5,2.8,0,2.7,0,'Rubber');disc('Glass',19.5,.8,0,4.5,0,'Glass');disc('Active display',16.25,.04,0,4.92,0,'Glass')
# Illustrative clock face, not live firmware or a physical dial.
for tick in range(12):
 a=tick*math.tau/12;box('Dial tick',.28,.04,1.1,14*math.sin(a),4.96,14*math.cos(a),'Ink',-a)
box('Hour hand',.65,.05,7,2.2,4.98,-2.2,'Ink',math.pi/4)
box('Minute hand',.4,.05,10,-3,4.98,-3,'Ink',-math.pi/4)
disc('Dial centre',.55,.06,0,4.98,0,'Orange')
# Batch by material for a compact browser asset.
for name in mats:
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mats[name]]
 if not objs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name='Round Display / '+name
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/watch-display.glb'),export_format='GLB',export_yup=True)
print('Exported round display; PCB outline/placements reused, component heights approximate.')
