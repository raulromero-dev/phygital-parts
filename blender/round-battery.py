"""LPR553535 planning mesh from the public manufacturer dimensional drawing.
No vendor CAD was supplied. Foil, tape and PCM detail are illustrative.
Cell envelope is 35 x 5.5 x 32 mm; the 50 mm lead and plug are not modelled.
"""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
for name,color,metal in [('Foil',(.57,.62,.65),.65),('Tape',(.58,.38,.075),.15),('PCB',(.035,.18,.115),0),('Ink',(.035,.045,.05),0),('Contact',(.6,.46,.2),.65)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;mats[name]=m

def finish(obj,name,mat):
 obj.name=name;obj.data.materials.append(mats[mat]);return obj

def pouch(name,scale,height,mat):
 a=math.asin(-14.5/17.5);pts=[(17.5*math.cos(t)*scale,(17.5*math.sin(t)-1.5)*scale) for t in [a+(math.pi-2*a)*i/192 for i in range(193)]]
 n=len(pts);verts=[(x,-z,y) for y in [-height/2,height/2] for x,z in pts];faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);b=o.modifiers.new('Rounded pouch seam','BEVEL');b.width=.17;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);o.select_set(False)

pouch('Insulated round pouch seam',1,5.5,'Tape');pouch('Aluminium pouch',.975,5.42,'Foil')
# Partial cover over protection electronics at the flattened edge.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,14.6,2.64));o=bpy.context.object;o.dimensions=(12,1.7,.15);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'Protection circuit allowance','PCB')
for x in [-3.15,3.15]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,15.65,0));o=bpy.context.object;o.dimensions=(.9,.65,.3);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'Lead attachment allowance','Contact')
for text,size,depth in [('LPR553535',2.3,-2.5),('3.7V  600mAh',1.6,1),('FIT CANDIDATE',1.1,4)]:
 curve=bpy.data.curves.new(text,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';o=bpy.data.objects.new(text,curve);bpy.context.collection.objects.link(o);o.location=(0,-depth,2.725);curve.materials.append(mats['Ink']);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
# Keep browser draw calls small.
for name,mat in mats.items():
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
 if not objs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 if len(objs)>1:bpy.ops.object.join()
 bpy.context.object.name='Round battery / '+name
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/watch-round-battery.glb'),export_format='GLB',export_yup=True)
