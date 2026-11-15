"""Reuse M5Stack's MIT Cardputer-Adv STL and make a cosmetic-compact fit concept.
The supplier STL contains a full assembled unit at the origin plus detached
parts in a distant layout. Only the assembled unit (|native Y| < 44 mm) is used.
Case, mirror, label colors and port-clearance allowances are original concepts,
not a production-ready enclosure or manufacturer surface finish.
"""
import bpy, bmesh, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models'
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0,rough=.4):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
white=material('M5 ivory',(.77,.77,.72));black=material('M5 charcoal',(.025,.03,.035));orange=material('M5 orange',(.9,.23,.035));glass=material('Display glass',(.025,.065,.075),.25,.2)
pink=material('Compact blush',(.63,.28,.36),.12,.32);trim=material('Compact rose trim',(.72,.46,.36),.65,.24);mirror=material('Mirror concept',(.67,.77,.8),.95,.12);ink=material('Key legends',(.82,.83,.78))
def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True)
def box(name,size,pos,mat,radius=.6):
    # Inputs use the app's X / Y-up / Z-depth axes.
    bpy.ops.mesh.primitive_cube_add(size=1,location=(pos[0],-pos[2],pos[1]));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if radius:
        b=o.modifiers.new('Soft edge','BEVEL');b.width=radius;b.segments=6;bpy.ops.object.modifier_apply(modifier=b.name)
    if mat:o.data.materials.append(mat)
    return o
def rounded(name,w,d,h,r,y,mat):
    # Rounded rectangle extruded along Y. Explicit arc mesh keeps thin lids round.
    pts=[]
    for cx,cz,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for k in range(17):
            a=math.radians(start+k*90/16);pts.append((cx+r*math.cos(a),cz+r*math.sin(a)))
    # Above corner ordering starts at right/front and goes counterclockwise.
    n=len(pts);verts=[(x,-z,yy)for yy in [y-h/2,y+h/2]for x,z in pts]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def text(body,size,pos,mat):
    curve=bpy.data.curves.new(body,'FONT');curve.body=body;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.materials.append(mat)
    o=bpy.data.objects.new(body,curve);bpy.context.collection.objects.link(o);o.location=(pos[0],-pos[2],pos[1]);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
clear()
bpy.ops.wm.stl_import(filepath=str(ROOT/'blender/vendor/cardputer/Cardputer-Adv.stl'))
o=bpy.context.object;bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if abs(v.co.y)>44],context='VERTS');bm.to_mesh(o.data);bm.free()
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
for o in list(bpy.context.scene.objects):
    pts=[v.co for v in o.data.vertices];lo=[min(v[i]for v in pts)for i in range(3)];hi=[max(v[i]for v in pts)for i in range(3)];cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2
    m=black if cx>5 else orange if cx<-10 and cy>20 else glass if cx<-10 and cy<0 else white
    o.data.materials.append(m)
    for v in o.data.vertices:
        x,y,z=v.co;v.co=(y,-x,z)
    o.name='M5Stack original / '+m.name
for row,keys in enumerate(['1234567890-=[]','qwertyuiop{}','asdfghjkl;','zxcvbnm,./']):
    for col,key in enumerate(keys):text(key,1.45,(-36.6+col*5.6,8.06,2.0+row*6.15),ink)
box('Display surface allowance',(27,.08,14),(-8.8,9.16,-17),glass,.03)
text('phygital',2.3,(-8.8,9.21,-17),ink)
export('cardputer-adv')
clear()
# An open protective cradle: 90 x 60 mm inner footprint for the 84 x 54 mm unit.
outer=rounded('Compact base',98,68,24,10,0,pink);inner=rounded('Interior clearance',90,60,25,6,3,pink)
bpy.context.view_layer.objects.active=outer;b=outer.modifiers.new('Hollow cradle','BOOLEAN');b.operation='DIFFERENCE';b.object=inner;bpy.ops.object.modifier_apply(modifier=b.name);bpy.data.objects.remove(inner,do_unlink=True)
# Open rear and side access: precise port cutouts remain a future measured design.
for x,z,size in [(-48,0,(12,18,42)),(48,0,(12,18,42)),(0,-33,(64,18,12))]:
    cutter=box('Port access',size,(x,7,z),None,1);bpy.context.view_layer.objects.active=outer;b=outer.modifiers.new('Access opening','BOOLEAN');b.operation='DIFFERENCE';b.object=cutter;bpy.ops.object.modifier_apply(modifier=b.name);bpy.data.objects.remove(cutter,do_unlink=True)
box('Front clasp allowance',(15,3,2),(0,10,34),trim,.7)
export('compact-base')
clear()
rounded('Compact lid',98,68,4,10,0,pink)
rounded('Mirror backing rim',90,60,.8,8,2.4,trim)
export('compact-lid')
clear()
rounded('Unspecified cut-to-size mirror',86,56,1,7,0,mirror)
export('compact-mirror')
clear()
for x in [-34,-17,0,17,34]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=2,depth=15,location=(x,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Concept hinge barrel';o.data.materials.append(trim)
export('compact-hinge')
