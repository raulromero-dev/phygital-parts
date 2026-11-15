"""Convert SenseRing GPL-3.0 source STLs without altering their assembly coordinates.
Reused CAD; presentation colors are added here. Source/license shipped separately.
"""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];source=ROOT/'blender/vendor/sense-ring'
meta={};cx=7.3539915085;cz=-13.0415575504
for stem,id,color in [('Board','ring-board',(.035,.12,.08)),('Battery','ring-battery',(.64,.43,.1)),('InnerShell','ring-inner',(.14,.17,.2)),('OuterShell','ring-outer',(.46,.5,.54))]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.wm.stl_import(filepath=str(source/(stem+'.stl')),forward_axis='Y',up_axis='Z');o=bpy.context.object
 # STL has mm units. Keep browser axes: X/Y/Z -> Blender X/-Z/Y.
 raw=[v.co.copy() for v in o.data.vertices];lo=[min(v[i] for v in raw) for i in range(3)];hi=[max(v[i] for v in raw) for i in range(3)];center=[(a+b)/2 for a,b in zip(lo,hi)]
 meta[id]={'dimensions':[round(b-a,6) for a,b in zip(lo,hi)],'position':[round(center[0]-cx,6),round(center[1]+3,6),round(center[2]-cz,6)]}
 for v in o.data.vertices:x,y,z=v.co;v.co=(x,-z,y)
 o.name='SenseRing / '+stem;m=bpy.data.materials.new(stem);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.38;n.inputs['Metallic'].default_value=.45 if stem=='OuterShell' else .15;o.data.materials.append(m)
 if stem=='Board':
  m2=bpy.data.materials.new('Components');m2.diffuse_color=(.08,.085,.09,1);o.data.materials.append(m2)
  for p in o.data.polygons:
   # CAD board outline versus component bodies; no geometry is invented.
   z=sum(raw[i].z for i in p.vertices)/len(p.vertices)
   if z<-.55 or z>.55:p.material_index=1
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{id}.glb'),export_format='GLB',export_yup=True)
(ROOT/'src/ring-geometry.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta))
