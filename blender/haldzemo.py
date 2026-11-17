"""Photo-based Haldzemo B0G8Z6NS9B reconstruction; NOT manufacturer CAD.
Seller overall envelope 50 x 86 x 14.28 mm, 14-pin 2.54 mm header.
Small packages, hole centres and internal construction are visual estimates.
Browser coordinates: X width, Y up/front, Z portrait length.
"""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
for name,color,metal,rough in [
 ('Charcoal soldermask',(.018,.028,.025),0,.55),('Glass',(.009,.014,.020),.18,.19),
 ('Glass border',(.006,.008,.009),.05,.3),('Black plastic',(.022,.024,.026),0,.48),
 ('Package',(.035,.037,.039),0,.55),('Gold contacts',(.67,.45,.13),.8,.27),
 ('Tin contacts',(.57,.62,.65),.82,.3),('Cream FPC housing',(.73,.72,.65),0,.5),
 ('Amber flex',(.45,.19,.035),.2,.42),('Silkscreen',(.66,.7,.66),0,.65),
 ('Trace',(.045,.065,.052),.15,.6),('Ceramic',(.41,.32,.21),0,.65)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;mats[name]=m

def loc(p):return (p[0],-p[2],p[1])
def finish(o,name,mat):o.name=name;o.data.materials.append(mats[mat]);return o
def box(name,p,size,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,name,mat)
 if bevel:
  b=o.modifiers.new('Manufactured edges','BEVEL');b.width=bevel;b.segments=4;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def cylinder(name,p,r,h,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=h,location=loc(p));return finish(bpy.context.object,name,mat)
def ring(name,p,outer,inner,h,mat):
 o=cylinder(name,p,outer,h,mat);cut=cylinder('Hole tool',p,inner,h+3,mat);bpy.context.view_layer.objects.active=o;b=o.modifiers.new('Bore','BOOLEAN');b.object=cut;b.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=b.name);bpy.data.objects.remove(cut,do_unlink=True);return o
def text(body,p,size=1,front=False):
 curve=bpy.data.curves.new(body,'FONT');curve.body=body;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.extrude=.006;curve.resolution_u=4
 o=bpy.data.objects.new(body,curve);bpy.context.collection.objects.link(o);o.location=loc(p)
 if not front:o.rotation_euler=(0,math.pi,0)
 curve.materials.append(mats['Silkscreen']);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)

pcb=box('50 x 86 mm PCB',(0,1.8,0),(50,1.6,86),'Charcoal soldermask',.65)
for x in [-22,22]:
 for z in [-39.6,39.6]:
  cut=cylinder('Drill',(x,1.8,z),1.5,4,'Tin contacts');bpy.context.view_layer.objects.active=pcb;b=pcb.modifiers.new('Mounting hole','BOOLEAN');b.object=cut;b.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=b.name);bpy.data.objects.remove(cut,do_unlink=True)
  for y in [.98,2.62]:ring('Plated mounting annulus',(x,y,z),2.25,1.5,.12,'Tin contacts')
# Front glass and laminated display stack. Centred inside the long PCB envelope.
box('LCD backlight frame',(0,4.35,-1.5),(48,3.5,67.6),'Tin contacts',.55)
box('Glass 50 x 69.2',(0,6.64,-1.5),(50,1,69.2),'Glass border',.6)
box('Visible IPS area 43.6 x 58.05',(0,7.125,-1.5),(43.6,.03,58.05),'Glass',.4)
text('2.8 TFT SPI',(0,2.68,35.6),1.4,True)
text('240 x 320  /  Capacitive touch',(0,2.68,-38),.95,True)
# P3: downward-facing installed male header, exactly 2.54 mm pitch.
box('P3 header insulator',(0,-.25,40.6),(35.56,2.5,2.5),'Black plastic',.15)
labels=['VCC','GND','CS','RST','DC','MOSI','SCK','LED','MISO','SCL','T_RST','SDA','INT','SD_CS']
for n,label in enumerate(labels):
 x=(n-6.5)*2.54
 box('P3 pin '+str(n+1),(x,(-1.5-7.14)/2,40.6),(.64,5.64,.64),'Gold contacts',.055)
 box('P3 solder pad',(x,.93,40.6),(1.5,.12,1.65),'Tin contacts',.15)
 text(str(n+1),(x,.90,37.8),.78)
 # Labels alternate two rows to keep the rear view legible at high magnification.
 text(label,(x,.90,35.8-(n%2)*2),.65)
text('P3',(20,.9,40.5),1.2)
rear_objects=set(bpy.context.scene.objects)
# Rear top 14-pin 0.5 mm FPC socket and silkscreen table.
box('P2 cream FPC body',(0,-.1,-35),(11,2.2,4.6),'Cream FPC housing',.18)
box('P2 retaining latch',(0,-1.25,-33.7),(10,1,1.1),'Black plastic',.1)
for n in range(14):box('P2 contact',((n-6.5)*.5,-.15,-37.7),(.2,.35,1.3),'Gold contacts')
text('P2  FPC 14P / 0.5',(0,.9,-29.9),1.05)
for n in range(7):text(f'{n+1:02} {labels[n]}    {n+8:02} {labels[n+7]}',(0,.9,-26.6+n*2.1),.83)
# Estimated rear package layout follows the seller image; no invented PCB routing claim.
box('Touch flex',(-16,.79,-16),(7,.22,18),'Amber flex',.2)
box('Touch FPC',(-16,-.1,-24.4),(8,2,3.5),'Cream FPC housing',.1)
box('FT6336G package',(-16,.25,-13.8),(3.8,1.1,3.8),'Package',.12)
box('MicroSD cage base',(13,-.1,-3),(13.6,2.2,15.5),'Tin contacts',.18)
box('MicroSD dark slot',(13,-1.27,3.9),(11.5,.45,1.8),'Black plastic',.06)
for x in [7,19]:box('MicroSD latch',(x,-1.35,-2),(1,.35,8),'Tin contacts',.1)
text('microSD',(13,-1.24,-5),1)
box('Display amber flex',(-13,.75,17),(15,.35,15),'Amber flex',.35)
for n in range(20):box('Flex conductor',(-19.3+n*.64,.51,18),(.23,.07,11),'Gold contacts')
box('Flex bonded IC',(-13,-.02,15),(10,1.2,3),'Package',.15)
box('Level converter U2',(1,-.1,27),(14.5,2,4.5),'Package',.2)
for n in range(10):
 for z in [24.3,29.7]:box('U2 gullwing lead',(-5.3+n*1.18,.2,z),(.45,.35,1.5),'Tin contacts',.08)
text('U2',(1,.9,22.8),1)
for n,(x,z) in enumerate([(-19,27),(-15,27),(-11,27),(18,24)]):
 box('Transistor/regulator',(x,.12,z),(2.7,1.6,3.1),'Package',.12)
 for xx in [-.8,.8]:box('Lead',(x+xx,.64,z+1.8),(.6,.3,1),'Tin contacts')
 text(('Q'+str(n+1)) if n<3 else 'U1',(x,.88,z-3),.85)
for n in range(24):
 x=-20+(n%8)*5.5;z=6+(n//8)*4.8
 if -21<x<-5 and z>9:continue
 box('SMD passive',(x,.47,z),(1.8,1,1),'Ceramic' if n%3 else 'Package',.08)
 for dx in [-.8,.8]:box('SMD end',(x+dx,.44,z),(.4,1.05,1.05),'Tin contacts',.04)
text('2.8 TFT SPI 240x320 V1.0',(0,.89,-40.5),1)
text('Capacitive Touch',(0,.89,32),1)
# Package positions above were read in rear-photo coordinates, mirrored from front X.
for obj in set(bpy.context.scene.objects)-rear_objects:obj.location.x*=-1
# Editable source retained before material batching.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/haldzemo.blend'))
for name,mat in mats.items():
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
 if not objs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 if len(objs)>1:bpy.ops.object.join()
 bpy.context.object.name='Haldzemo / '+name
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/lcd-haldzemo-28.glb'),export_format='GLB',export_yup=True)
