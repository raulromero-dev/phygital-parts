"""CrowPanel Advance 2.8 bare assembly, manufacturer CAD + Eagle-placed detail.

Run `node blender/convert-crowpanel.cjs`, then
`blender --background --python blender/crowpanel.py`.
See vendor/crowpanel/README.md for source attribution, exclusions and accuracy.
All working dimensions are millimetres. Export is screen-up / browser Y-up.
"""
import bpy, json, math, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.001
materials={}
def mat(name,c,metal=0,rough=.42):
    if name in materials:return materials[name]
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    materials[name]=m;return m
pcb=mat('Elecrow black soldermask',(.018,.022,.025));black=mat('Molded black polymer',(.012,.014,.016));tin=mat('Connector plated metal',(.58,.62,.65),.7,.28)
white=mat('Connector white polymer',(.83,.84,.80));gold=mat('Exposed contacts',(.62,.42,.13),.75,.3);ink=mat('White silkscreen',(.78,.8,.78));ceramic=mat('Ceramic capacitors',(.45,.36,.24));glass=mat('Black cover glass',(.009,.012,.015),.15,.2);active=mat('Unpowered IPS active area',(.018,.024,.029),.12,.25)
bpy.ops.object.empty_add();root=bpy.context.object;root.name='crowpanel-advance-28';root['part_id']='crowpanel-advance-28';root['units']='millimetres';root['source']='Elecrow v1.2 STEP / Eagle + Espressif module STEP';root['accuracy']='Manufacturer assembly geometry; case removed; Eagle-positioned minor bodies illustrative.'
# Manufacturer board coordinate origin. Native STEP +Z is PCB component side;
# flipping the board gives the glass screen the positive browser Y normal.
OX,OY=2699.35,1443.1
CX,CY,CZ=2739.85,1469.915,.05

def native(p):return(p[0]-CX,-(p[1]-CY),-(p[2]-CZ))
def board(p):return native((p[0]+OX,p[1]+OY,p[2]))
def make_mesh(name,vertices,triangles,material,source):
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],triangles);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(material);o['source']=source
    return o

def import_body(m,name,transform,default):
    a=m['attributes']['position']['array'];indices=m['index']['array']
    o=make_mesh(name,[transform(a[i:i+3]) for i in range(0,len(a),3)],[indices[i:i+3] for i in range(0,len(indices),3)],default,'Manufacturer STEP; coordinate conversion only')
    # Preserve the STEP tessellator's surface normals. This keeps drilled holes
    # smooth and avoids triplicating every curved triangle vertex in the GLB.
    if 'normal' in m['attributes']:
        raw=m['attributes']['normal']['array'];zero=Vector(transform((0,0,0)))
        normals=[(Vector(transform(raw[j:j+3]))-zero).normalized() for j in range(0,len(raw),3)]
        for face in o.data.polygons:face.use_smooth=True
        o.data.normals_split_custom_set_from_vertices(normals)
    return o

cad=json.loads((ROOT/'blender/.cache/crowpanel-advance-hmi2_8-20260126.json').read_text())
excluded={53,54,56,*range(72,80)} # SK28/XK/SG28 acrylic + case screws/standoffs
names={0:'Elecrow PCB and short buttons',49:'J8 wireless expansion socket',50:'J9 wireless expansion socket',51:'J7 I2C HY2.0 socket',52:'J6 UART1 HY2.0 socket',55:'2.8 inch LCD and touch glass',57:'J5 UART0 XH2.54 housing',66:'J10 LiPo PH2.0 housing',71:'J2 speaker PH2.0 housing'}
for i,m in enumerate(cad['meshes']):
    if i in excluded:continue
    if i==0:
        # Elecrow merges a coarse ESP32 stand-in into its PCB solid. Its flat
        # 3.2 mm shield would cover Espressif's detailed 3.1 mm shield. Remove
        # only faces above the PCB within that stand-in's exact XY footprint;
        # the complete manufacturer module below replaces it at Eagle U1.
        a=m['attributes']['position']['array'];idx=m['index']['array'];kept=[]
        for j in range(0,len(idx),3):
            tri=idx[j:j+3];vs=[a[k*3:k*3+3] for k in tri]
            in_module=all(OX-.02<=q[0]<=OX+25.58 and OY+25.00<=q[1]<=OY+43.04 for q in vs)
            if not (in_module and max(q[2] for q in vs)>.001):kept.extend(tri)
        m={**m,'index':{'array':kept}}
    material=pcb if i==0 else black if i in (49,50) else white if i in (51,52,57,66,71) else glass if i==55 else black if i in (12,13,36,37) else tin
    o=import_body(m,names.get(i,'Elecrow CAD '+str(i)+' '+m['name']),native,material)
    o['cad_mesh_index']=i
    if i==0:
        o.data.materials.append(black)
        # STEP groups the PCB and mechanical button proxies in one body.
        for f in o.data.polygons:
            if f.center.z < -.15:f.material_index=1

brd=ET.parse(ROOT/'blender/vendor/crowpanel/v1.2.brd').getroot()
packages={(l.get('name'),p.get('name')):p for l in brd.findall('.//board/libraries/library') for p in l.findall('./packages/package')}
elements={e.get('name'):e for e in brd.findall('.//board/elements/element')}
def xy(e,x=0,y=0):
    rot=e.get('rot','R0');angle=math.radians(float(re.sub('[A-Z]','',rot)))
    if 'M' in rot:x=-x
    return(float(e.get('x'))+math.cos(angle)*x-math.sin(angle)*y,float(e.get('y'))+math.sin(angle)*x+math.cos(angle)*y)

def box(name,dims,p,material,angle=0,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=board(p));o=bpy.context.object;o.name=name;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.z=-angle;o.parent=root;o.data.materials.append(material);o['source']='Eagle XY placement; illustrative body / height'
    if bevel:
        m=o.modifiers.new('small edge radius','BEVEL');m.width=min(bevel,min(dims)/4);m.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def label(text,p,size=1,angle=0,front=False,material=ink):
    bpy.ops.object.text_add(location=board(p));o=bpy.context.object;o.name='Marking '+text;o.data.body=text;o.data.size=size;o.data.extrude=.003;o.data.resolution_u=4;o.parent=root;o.data.materials.append(material)
    # Text defaults to +Z facing. Reverse on the PCB rear (+nativeZ).
    o.rotation_euler=(math.pi,0,-angle) if not front else (0,0,-angle)
    bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o

# Restore the top soldermask plane beneath the removed fused module proxy.
box('PCB under replaced ESP32 stand-in',(25.57,18.04,.01),(12.78,34.02,-.005),pcb,bevel=0)

# Exact Espressif WROOM-1 model includes its PCB antenna, castellation contacts,
# shield and internal die/passives. Align its 18 x25.5 mm outline to Eagle U1.
u=elements['U1'];esp=json.loads((ROOT/'blender/.cache/crowpanel-esp32.json').read_text())
def module_point(q):
    x,y=xy(u,q[0]-9,q[1]-12.75)
    return board((x,y,q[2]+.02))
for i,m in enumerate(esp['meshes']):
    color=m.get('color',[.4,.42,.44]);material=mat('Espressif CAD '+','.join(f'{v:.4f}' for v in color),color,.65 if len(set(round(v,1) for v in color))>1 else .2)
    if i==193:material=tin
    o=import_body(m,'ESP32-S3-WROOM-1 / '+str(i)+' '+m['name'][:75],module_point,material)
    o['source']='Espressif ESP32-S3-WROOM-1 manufacturer STEP; aligned to Elecrow Eagle U1'

# Add the board's real pads and contacts from the Eagle package, not invented
# routing. Bodies missing from the mechanical assembly are illustrative solids
# placed at their actual footprint. Optional NC / DNP parts are excluded.
imported={'U1','J2','J3','J4','J5','J6','J7','J8','J9','J10','J12','J13','J14','J15','K1','K2'}
for ref,e in elements.items():
    if ref.startswith('P') or 'NC' in e.get('value',''):continue
    p=packages[(e.get('library'),e.get('package'))];rot=e.get('rot','R0');back='M' in rot;surface=-1.6 if back else 0;sign=-1 if back else 1
    angle=math.radians(float(re.sub('[A-Z]','',rot)))
    pads=p.findall('smd')
    for pad in pads:
        x,y=xy(e,float(pad.get('x')),float(pad.get('y')));pa=angle+math.radians(float(re.sub('[A-Z]','',pad.get('rot','R0'))))
        box(ref+' pad '+pad.get('name'),(float(pad.get('dx')),float(pad.get('dy')),.035),(x,y,surface+sign*.025),gold,pa,bevel=.012)
    if ref in imported:continue
    pkg=e.get('package');x,y=xy(e)
    if pkg in ('R0402','C0402'):w,d,h=1,.5,.35
    elif pkg in ('C0603','R0603-SP','L0603','LED0603','LED_KT-0603RYG'):w,d,h=1.6,.8,.65
    elif pkg=='C0805':w,d,h=2,1.25,.8
    elif pkg=='L0420':w,d,h=4,4,2
    elif pkg=='BEEP_5025':w,d,h=5,5,2.5
    elif pkg=='9P-SMD-W/-RING':
        # The footprint origin sits at the solder contact row, not body centre.
        x,y=xy(e,7.3,2.3);w,d,h=14.6,15,1.8
    else:
        wires=[t for t in p.findall('wire') if t.get('layer') in ('21','51')]
        if wires:
            xs=[float(t.get(k)) for t in wires for k in ('x1','x2')];ys=[float(t.get(k)) for t in wires for k in ('y1','y2')];w=max(xs)-min(xs);d=max(ys)-min(ys);x,y=xy(e,(max(xs)+min(xs))/2,(max(ys)+min(ys))/2)
            w=max(.5,min(w,9));d=max(.5,min(d,9));h=1.2 if max(w,d)>3 else .85
        else:w,d,h=2,2,.8
    material=ceramic if ref.startswith('C') else tin if ref in ('J1','MIC1') else white if ref.startswith('FPC') else black
    if ref=='J1':
        # Open microSD shell: roof + sidewalls, allowing a visible card mouth.
        box('J1 microSD metal roof',(w,d,.22),(x,y,surface+sign*(h-.11)),tin,angle)
        for xx in (-w/2+.2,w/2-.2):
            xxg=x+math.cos(angle)*xx;yyg=y+math.sin(angle)*xx
            box('J1 microSD shell side',(.4,d,h),(xxg,yyg,surface+sign*h/2),tin,angle)
        box('J1 microSD contact insert',(w-1,d-1,.25),(x,y,surface+sign*.2),black,angle)
    else:
        box(ref+' '+e.get('value',''),(w,d,h),(x,y,surface+sign*(h/2+.025)),material,angle)
        if ref.startswith(('R','C','FB')):
            for delta in (-w*.38,w*.38):
                px=x+math.cos(angle)*delta;py=y+math.sin(angle)*delta
                box(ref+' terminal',(.22,d+.02,h+.03),(px,py,surface+sign*(h/2+.025)),tin,angle,bevel=.02)
        if ref=='B1':
            bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.8,depth=.015,location=board((x,y,h+.055)));o=bpy.context.object;o.name='Buzzer acoustic opening';o.data.materials.append(glass);o.parent=root

# Actual silkscreen content/XY/rotation from the PCB, on visible rear only.
for t in brd.findall('.//board/plain/text'):
    if t.get('layer')!='21' or not t.text:continue
    angle=math.radians(float(re.sub('[A-Z]','',t.get('rot','R0'))))
    label(t.text,(float(t.get('x')),float(t.get('y')),.06),float(t.get('size','1')),angle)
label('ESP32-S3-WROOM-1',(22,29,3.14),1.1,math.pi/2,material=black)
label('N16R8',(20,29,3.14),1,math.pi/2,material=black)
# Actual 2.8-inch 4:3 active area, surface treatment only; no simulated running UI.
box('IPS active area 57.6 x 43.2 mm',(57.6,43.2,.015),(40.5,27,-7.9075),active,bevel=.005)

# Batch materials for fast web rendering; editable component objects remain .blend.
originals=list(root.children_recursive);batches={}
for o in originals:
    if o.type!='MESH':continue
    cp=o.copy();cp.data=o.data.copy();bpy.context.collection.objects.link(cp);batches.setdefault(cp.data.materials[0].name,[]).append(cp)
exports=[]
for name,objects in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='CrowPanel / '+name;exports.append(o)
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in exports:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/crowpanel-advance-28.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
for o in exports:bpy.data.objects.remove(o,do_unlink=True)
# Exact exported bounds and docking anchors are recorded beside the source.
vs=[o.matrix_world@v.co for o in originals if o.type=='MESH' for v in o.data.vertices]
lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
print('Blender bounds',lo,hi,'editable pieces',len(originals))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/crowpanel-advance-28.blend'),compress=True)
# Optional two diagnostic renders; camera/lights are not part of the saved asset.
if '--render' in sys.argv:
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.world.color=(.5,.5,.5);scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    def aim(o):o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    for pos,power,size in [((0,-30,120),250000,90),((80,10,-70),180000,70),((-60,40,-60),130000,60)]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o)
    bpy.ops.object.camera_add(location=(85,-100,115));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=125;aim(camera)
    scene.render.filepath=str(ROOT/'public/reference/crowpanel-front.png');bpy.ops.render.render(write_still=True)
    camera.location=(85,-100,-115);aim(camera);scene.render.filepath=str(ROOT/'public/reference/crowpanel-back.png');bpy.ops.render.render(write_still=True)
