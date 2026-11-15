"""Grove SCD41: vendor SCD4x STEP + Seeed Eagle PCB outline.
Run node blender/convert-cad.cjs scd4x, then Blender --background --python this file.
Connector bodies and component heights are approximations, not manufacturing CAD.
"""
import bpy, math, json, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color[:3],1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color[:3],1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.4;return m
blue=material('Blue',(.02,.09,.16));white=material('Grove socket',(.8,.82,.79));black=material('Component',(.02,.025,.03));gold=material('Contacts',(.65,.45,.15),.7)
def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def box(name,dimensions,position,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.name=name;o.dimensions=dimensions;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
r=ET.parse(ROOT/'blender/vendor/scd41/scd41.brd').getroot()
p=r.find('.//package[@name="BORDER_1U-DIM-W/-DRILL"]');segments=[]
for w in p.findall('wire'):
 if w.get('layer')!='20':continue
 a=(float(w.get('x1')),float(w.get('y1')));b=(float(w.get('x2')),float(w.get('y2')));theta=math.radians(float(w.get('curve',0)))
 if abs(theta)<1e-6:pts=[a,b]
 else:
  dx,dy=b[0]-a[0],b[1]-a[1];f=1/(2*math.tan(theta/2));cx=(a[0]+b[0])/2-dy*f;cy=(a[1]+b[1])/2+dx*f;radius=math.hypot(a[0]-cx,a[1]-cy);angle=math.atan2(a[1]-cy,a[0]-cx);n=max(4,math.ceil(abs(theta)*16));pts=[(cx+radius*math.cos(angle+theta*i/n),cy+radius*math.sin(angle+theta*i/n)) for i in range(n+1)]
 segments.append(pts)
outline=segments.pop(0)
while segments:
 for j,pts in enumerate(segments):
  if math.dist(outline[-1],pts[0])<.001:outline+=pts[1:];segments.pop(j);break
  if math.dist(outline[-1],pts[-1])<.001:outline+=list(reversed(pts))[1:];segments.pop(j);break
 else:raise ValueError('Disconnected PCB outline')
outline=outline[:-1];n=len(outline)
board=mesh('Seeed v1.01 PCB',[(x,y,z) for z in [-.8,.8] for x,y in outline],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],blue)
for y in [-10,10]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=1.1,depth=3,location=(0,y,0));hole=bpy.context.object;bpy.context.view_layer.objects.active=board;mod=board.modifiers.new('Manufacturer mounting hole','BOOLEAN');mod.object=hole;mod.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(hole,do_unlink=True)
# Reuse vendor sensor geometry; offset its lowest point onto the PCB top face.
data=json.loads((ROOT/'blender/.cache/scd4x.json').read_text());bottom=min(m['attributes']['position']['array'][i] for m in data['meshes'] for i in range(2,len(m['attributes']['position']['array']),3))
for i,m in enumerate(data['meshes']):
 a=m['attributes']['position']['array'];idx=m['index']['array'];verts=[(-a[j+1],a[j],a[j+2]-bottom+.8) for j in range(0,len(a),3)];faces=[tuple(idx[j:j+3]) for j in range(0,len(idx),3)]
 mesh('Sensirion vendor CAD '+str(i),verts,faces,material('CAD '+str(i),m.get('color',[.55,.55,.55]),.35))
# J1 is on the underside. Latch and cavity are approximate, aligned to Eagle J1.
box('Grove J1 body',(8.8,10,6),(4.6,0,-3.8),white)
box('Grove J1 mouth',(.08,8,3.4),(9.04,0,-3.5),black)
for y in [-3,-1,1,3]:box('J1 contact',(3.5,.45,.45),(7,y,-3.5),gold)
for e in r.findall('.//board/elements/element'):
 if e.get('name') in ['R1','R2','R3','PWR']:box(e.get('name'),(.8,1.6,.5),(float(e.get('x')),float(e.get('y')),-1.05),black)
for x in [-3.81,-1.27,1.27,3.81]:box('J2 pad',(1.5,1.5,.05),(x,-7.874,.83),gold)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/grove-scd41.glb'),export_format='GLB',export_yup=True)
print('Exported SCD41 with reused sensor CAD and manufacturer PCB outline.')
