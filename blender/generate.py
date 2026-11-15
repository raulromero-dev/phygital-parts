"""Detailed, editable planning models, in millimetres (not manufacturer CAD).

The photographed outlines guide the visible components. Small passives, traces,
connector interiors and underside features are illustrative, not verified PCB
routing or connector pin order. Electrical meaning stays in connections.js.
"""
import bpy, math, json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if requested:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/parts-library.blend'))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
materials = {}
root = None


def mat(name, color, metal=0, rough=.45):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    n = m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value = (*color, 1)
    n.inputs['Metallic'].default_value = metal
    n.inputs['Roughness'].default_value = rough
    materials[name] = m


mat('PCB jade', (.025,.17,.12))
mat('PCB charcoal', (.025,.03,.03))
mat('Gold', (.65,.43,.12), .75, .26)
mat('Tin', (.57,.62,.64), .75, .28)
mat('Black', (.012,.016,.02), 0, .4)
mat('Ceramic', (.85,.83,.75))
mat('Screen', (.008,.018,.021), .2, .16)
mat('Screen ink', (.48,.83,.78), 0, .4)
mat('Foil', (.65,.69,.71), .7, .3)
mat('Kapton', (.73,.44,.045), .2, .4)
mat('Wire red', (.5,.025,.025))
mat('Purple', (.21,.13,.36))
mat('Blue', (.04,.17,.3))
mat('Copper trace', (.08,.24,.19), .25, .5)


# Browser Y-up -> Blender Z-up; glTF export reverses this transform.
def loc(p):
    return (p[0], -p[2], p[1])


def finish(o, name, material):
    o.name = name
    o.data.materials.append(materials[material])
    o.parent = root
    return o


def box(name, dims, p, material, bevel=.16):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc(p))
    o = bpy.context.object
    o.dimensions = (dims[0], dims[2], dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Manufactured edge radius', 'BEVEL')
        mod.width = min(bevel, min(dims)/3)
        mod.segments = 4
        bpy.ops.object.modifier_apply(modifier=mod.name)
        # Smooth the edge radius while keeping the broad PCB/shell faces flat.
        for f in o.data.polygons:
            f.use_smooth = True
        mod = o.modifiers.new('Face normals', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o, name, material)


def cylinder(name, r, h, p, material, axis='y', vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=h, location=loc(p))
    o = bpy.context.object
    if axis == 'z': o.rotation_euler[0] = math.pi/2
    if axis == 'x': o.rotation_euler[1] = math.pi/2
    for poly in o.data.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return finish(o, name, material)


def ring(name, outer, inner, h, p, material, axis='y', segments=96):
    # A real hollow ring: plated holes, socket rims and lens barrels stay open.
    verts, faces = [], []
    for y, r in [(-h/2,outer),(h/2,outer),(-h/2,inner),(h/2,inner)]:
        for i in range(segments):
            a = 2*math.pi*i/segments
            q = (r*math.cos(a), y, r*math.sin(a))
            if axis == 'x': q = (q[1],q[0],q[2])
            if axis == 'z': q = (q[0],q[2],q[1])
            verts.append(loc(tuple(q[j]+p[j] for j in range(3))))
    for a,b in [(0,1),(1,3),(3,2),(2,0)]:
        for i in range(segments):
            j = (i+1)%segments
            faces.append((a*segments+i,a*segments+j,b*segments+j,b*segments+i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    for i,poly in enumerate(mesh.polygons): poly.use_smooth = i//segments in [0,2]
    return finish(o, name, material)


def wire(name, points, radius=.22, material='Black'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points, points):
        p.co = loc(co)
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    finish(o, name, material)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)


def text(label, p, size=1.8, material='Ceramic'):
    bpy.ops.object.text_add(location=loc(p))
    o = bpy.context.object
    o.data.body = label
    o.data.size = size
    o.data.align_x = 'CENTER'
    o.data.align_y = 'CENTER'
    o.data.extrude = .006
    o.data.resolution_u = 8
    finish(o, label, material)
    bpy.ops.object.convert(target='MESH')


def pcb(w, d, y=-2, material='PCB jade', holes=True):
    board = box('FR4 circuit board', (w,1.2,d), (0,y,0), material, .35)
    if holes:
        # Drill the substrate instead of painting black circles on its surface.
        for x in [-w/2+2.1,w/2-2.1]:
            for z in [-d/2+2.1,d/2-2.1]:
                tool = cylinder('Drill tool', .85, 3, (x,y,z), 'Black', vertices=48)
                bpy.context.view_layer.objects.active = board
                mod = board.modifiers.new('Mounting bore', 'BOOLEAN')
                mod.operation = 'DIFFERENCE'
                mod.object = tool
                bpy.ops.object.modifier_apply(modifier=mod.name)
                bpy.data.objects.remove(tool, do_unlink=True)
                for face in [-1,1]:
                    ring('Plated mounting eyelet',1.55,.85,.06,(x,y+face*.63,z),'Gold',segments=64)
    # Edge copper and tiny vias supply visual scale, without implying a netlist.
    for x in [-w/2+1,w/2-1]:
        for z in [-d*.24,0,d*.24]:
            ring('Illustrative via',.27,.12,.04,(x,y+.64,z),'Gold',segments=24)
    return board


def passive(x,y,z,vertical=False):
    w,d = (.65,1.4) if vertical else (1.4,.65)
    box('SMD passive', (w,.48,d), (x,y,z), 'Ceramic', .05)
    for s in [-1,1]:
        dims = (w,.5,.3) if vertical else (.3,.5,d)
        p = (x,y,z+s*.55) if vertical else (x+s*.55,y,z)
        box('Solder termination', dims, p, 'Tin', .035)


def chip(x,y,z,w=4,d=4,pins=5):
    box('IC package', (w,.9,d), (x,y,z), 'Black', .12)
    cylinder('Pin one mark', .19, .015, (x-w/2+.55,y+.46,z-d/2+.55), 'Ceramic',vertices=24)
    for side in [-1,1]:
        for i in range(pins):
            box('IC gull-wing lead', (.65,.2,.22), (x+side*(w/2+.18),y-.25,z+(i-(pins-1)/2)*d/(pins+.5)), 'Tin', .04)


def connector(name,p,pins=4,pitch=2,w=9,d=6,h=4.6):
    x,y,z = p
    # Separate shell walls, key and recessed metal contacts; no guessed pin labels.
    box(name+' floor',(w,.55,d),(x,y-h/2+.28,z),'Ceramic',.13)
    for dx in [-1,1]:
        box(name+' side wall',(.7,h,d),(x+dx*(w/2-.35),y,z),'Ceramic',.16)
        box(name+' mounting tab',(1.1,.6,1.5),(x+dx*(w/2-.1),y-h/2,z-1),'Tin',.05)
    box(name+' rear wall',(w-1.4,h,.65),(x,y,z+d/2-.32),'Ceramic',.13)
    box(name+' front lip',(w-1.4,1.2,.7),(x,y-h/2+.6,z-d/2+.35),'Ceramic',.1)
    box(name+' latch',(2.7,.6,1.8),(x,y+h/2-.3,z+d/2-.2),'Ceramic',.1)
    for i in range(pins):
        dx=(i-(pins-1)/2)*pitch
        box(name+' contact channel',(.9,.07,d-1.2),(x+dx,y-h/2+.59,z),'Black',.08)
        box(name+' contact',(.45,2.4,.45),(x+dx,y-h/2+1.65,z+.6),'Gold',.05)


def usb(p):
    x,y,z=p
    box('USB-C upper shell',(8.2,.45,5.4),(x,y+1.35,z),'Tin',.4)
    box('USB-C lower shell',(8.2,.45,5.4),(x,y-1.35,z),'Tin',.4)
    for dx in [-3.9,3.9]: box('USB-C curved side',(.6,2.6,5.4),(x+dx,y,z),'Tin',.28)
    box('USB-C tongue',(5.7,.5,4.1),(x,y,z+.5),'Black',.2)
    for i in range(12):
        for dy in [-.28,.28]:
            box('USB-C contact',(.22,.06,1.5),(x+(i-5.5)*.42,y+dy,z-.8),'Gold',.015)
    for dx in [-3.7,3.7]:
        box('USB-C solder anchor',(.65,.3,1.8),(x+dx,y-1.45,z+1.1),'Tin',.06)


def imported_cad(id, offset=(0,0,0), rotate=False):
    data=json.loads((ROOT/'blender/.cache'/f'{id}.json').read_text())
    positions=[m['attributes']['position']['array'] for m in data['meshes']]
    center=[(min(min(a[j::3]) for a in positions)+max(max(a[j::3]) for a in positions))/2 for j in range(3)]
    for m in data['meshes']:
        a=m['attributes']['position']['array']
        inds=m['index']['array']
        def transform(q, is_point=True):
            v=[q[i]-center[i] if is_point else q[i] for i in range(3)]
            if rotate: v=[v[2],v[1],-v[0]]
            if id=='mosfet-5648': v=[v[0],v[2],-v[1]]
            if id=='oled-938': v=[v[0],-v[2],v[1]]
            if id=='lcd-27579': v=[v[0],v[2],-v[1]]
            if is_point: v=[v[i]+offset[i] for i in range(3)]
            return loc(v)
        verts=[transform(a[i:i+3]) for i in range(0,len(a),3)]
        mesh=bpy.data.meshes.new(m['name'])
        mesh.from_pydata(verts,[],[inds[i:i+3] for i in range(0,len(inds),3)])
        mesh.update()
        o=bpy.data.objects.new(m['name'],mesh)
        bpy.context.collection.objects.link(o)
        o.parent=root
        o['source']='Waveshare manufacturer STEP' if id=='lcd-27579' else 'Adafruit manufacturer STEP' if id in ['oled-938','mosfet-5648'] else 'Seeed Studio STEP' if id=='xiao' else 'Melexis 55 degree STEP'
        colors={}
        def material_index(color):
            color=tuple(color)
            if color not in colors:
                name='CAD '+','.join(f'{n:.3f}' for n in color)
                if name not in materials: mat(name,color,.45 if max(color)-min(color)<.07 and min(color)>.3 else .05,.32)
                mesh.materials.append(materials[name]);colors[color]=len(mesh.materials)-1
            return colors[color]
        default=m.get('color',[.5,.52,.54])
        if id=='thermal-sensor':
            if 'GLASS' in m['name']: default=[.12,.13,.14]
            elif 'CAP' in m['name']: default=[.08,.09,.1]
        material_index(default)
        for face in m.get('brep_faces',[]):
            mi=material_index(face.get('color') or default)
            for i in range(face['first'],face['last']+1): mesh.polygons[i].material_index=mi
        # The vendor CAD leaves the OLED front face in a generic CAD color.
        # Apply dark display glass for legibility; the geometry stays unchanged.
        if id=='oled-938' and max(a[2::3])<.01 and max(a[0::3])-min(a[0::3])>30:
            mesh.materials.clear();mesh.materials.append(materials['Screen'])
            for face in mesh.polygons: face.material_index=0
        n=m['attributes'].get('normal',{}).get('array')
        if n:
            for f in mesh.polygons: f.use_smooth=True
            mesh.normals_split_custom_set_from_vertices([transform(n[i:i+3],False) for i in range(0,len(n),3)])


def expansion_from_eagle():
    # Reuse Seeed's native CAD placements instead of estimating them from pixels.
    board=ET.parse(ROOT/'blender/vendor/expansion-board.brd').find('.//board')
    def xy(x,y,height): return (float(y)-21.25,height,float(x)-29)
    substrate=pcb(42.5,58,-3.3,'PCB charcoal',holes=False)
    for c in board.findall('./plain/circle'):
        if c.get('layer')!='20': continue
        p=xy(c.get('x'),c.get('y'),-3.3);r=float(c.get('radius'))
        tool=cylinder('CAD mounting bore',r,3,p,'Black',vertices=64)
        bpy.context.view_layer.objects.active=substrate
        mod=substrate.modifiers.new('CAD mounting bore','BOOLEAN');mod.operation='DIFFERENCE';mod.object=tool
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(tool,do_unlink=True)
        ring('CAD mounting annulus',r+.6,r,.08,(p[0],-2.65,p[2]),'Tin',segments=64)
    packages={(lib.get('name'),pkg.get('name')):pkg for lib in board.findall('./libraries/library') for pkg in lib.findall('./packages/package')}
    for e in board.findall('./elements/element'):
        name=e.get('name');pkgname=e.get('package');rot=e.get('rot','R0');bottom='M' in rot
        if name.startswith('FR'): continue
        height=-4.2 if bottom else -2.2
        x,_,z=xy(e.get('x'),e.get('y'),height)
        before=set(root.children_recursive)
        if re.match(r'[CRLDF]\d',name) or name.startswith('FB'):
            passive(x,height,z,'90' in rot or '270' in rot)
        elif name=='U6':
            box('OLED carrier',(16.9,1.2,24.74),(x,-1.9,z),'Black',.25)
            box('OLED glass',(14.1,.55,23.2),(x,-1,z),'Screen',.3)
            text('PHYGITAL',(x,-.71,z-2),1.6,'Screen ink')
            text('HEAT / WIFI',(x,-.71,z+3),.95,'Screen ink')
            box('OLED flex',(9,.14,4),(x,-1,z+13),'Kapton',.08)
            for i in range(18): box('Flex contact',(.14,.03,3), (x+(i-8.5)*.45,-.9,z+13),'Gold',0)
        elif name=='U2':
            for dx in [-7.62,7.62]:
                box('XIAO socket',(2.5,5.5,17.7),(x+dx,.1,z),'Black',.18)
                for i in range(7): ring('Socket contact',.6,.33,.2,(x+dx,2.9,z+(i-3)*2.54),'Gold',segments=32)
        elif name in ['J1','J4','J5','J6']:
            # Body offset follows the through-hole footprint's courtyard. The
            # contact sequence remains unverified in the app until bench traced.
            dx=3 if x>0 else -3
            connector('Grove '+name,(x+dx,-.1,z),w=8.5,d=7,h=5)
        elif name=='J2': connector('Battery JST',(x,-.1,z),pins=2,w=7,d=6,h=5)
        elif name=='J3':
            box('microSD cage',(14.5,1.85,16.1),(x,-4.8,z),'Tin',.3)
            for dz in [-4,0,4]: box('microSD stamped slot',(8,.05,.8),(x,-5.76,z+dz),'Black',.06)
        elif name=='BAT1':
            box('RTC cell holder',(12.1,1.5,13.2),(x,-4.7,z),'Black',.5)
            cylinder('CR1220 cell',6,1.2,(x,-5.8,z),'Tin')
            box('Cell retaining clip',(2,.15,13),(x,-6.43,z),'Tin',.12)
        elif name=='BUZ1':
            box('Buzzer 5 mm',(5,2.5,5),(x,-1.45,z),'Black',.3)
            cylinder('Buzzer vent',.8,.06,(x,-.16,z),'Screen')
        elif name in ['K1','K2']:
            box('Tactile switch',(3.8,1.8,4.5),(x,-1.8,z),'Tin',.15)
            box('Switch actuator',(1.4,.8,2),(x,-.6,z),'Black',.15)
        elif name=='SW1':
            box('Power slide switch',(3.5,3.2,9),(x,-1.1,z),'Tin',.2)
            box('Power slider',(2,1.5,3),(x,.9,z),'Black',.1)
        elif name=='J7':
            box('Auxiliary header',(5,3,10),(x,-.7,z),'Black',.15)
            for dx in [-1.27,1.27]:
                for dz in [-3.81,-1.27,1.27,3.81]: box('Header pin',(.64,5,.64),(x+dx,.5,z+dz),'Gold',.05)
        elif name.startswith('U'):
            chip(x,height,z,3 if name!='U1' else 5,3 if name!='U1' else 3.9,4)
        elif name=='X1': box('RTC crystal',(1.2,.55,2),(x,height,z),'Tin',.1)
        for o in set(root.children_recursive)-before:
            o.name=name+' / '+o.name;o['eagle_package']=pkgname;o['placement_source']='Seeed Expansion Board v1.0 200824'
        # Import actual footprint pads from the supplied Eagle library.
        pkg=packages.get((e.get('library'),pkgname))
        if pkg is None: continue
        angle=math.radians(float(re.search(r'R([0-9.]+)',rot).group(1)))
        for pad in list(pkg.findall('pad'))+list(pkg.findall('smd')):
            px=float(pad.get('x'));py=float(pad.get('y'))
            if bottom: px=-px
            rx=px*math.cos(angle)-py*math.sin(angle)+float(e.get('x'))
            ry=px*math.sin(angle)+py*math.cos(angle)+float(e.get('y'))
            p=xy(rx,ry,-3.95 if bottom else -2.65)
            if name in ['J10','J11']:
                box(name+' header spacer',(2.5,2.5,2.5),(p[0],-1.3,p[2]),'Black',.15)
                box(name+' exposed contact',(.64,4.5,.64),(p[0],1.3,p[2]),'Gold',.04)
            if pad.tag=='pad':
                radius=float(pad.get('diameter',1.6))/2
                ring(name+' pad '+pad.get('name'),radius,float(pad.get('drill'))/2,.08,p,'Gold',segments=24)
            else:
                box(name+' SMD land',(float(pad.get('dy')),.05,float(pad.get('dx'))),p,'Tin',.03)
    text('XIAO EXPANSION',(0,-2.65,25.8),1)


def grove_haptic_from_eagle():
    # Use board-level origins from Seeed's native CAD; distant panel test
    # fixtures are deliberately excluded. Body heights remain planning proxies.
    doc=ET.parse(ROOT/'blender/vendor/grove-haptic.brd').getroot()
    pcb(40,20,-3,'Blue',holes=False)
    for e in doc.findall('.//board/elements/element'):
        x,z=float(e.get('x')),-float(e.get('y'))
        if abs(x)>20.3 or abs(z)>10.5: continue
        name=e.get('name')
        if name=='J1':
            before=set(bpy.data.objects)
            connector('Grove I2C socket',(0,0,0),w=10,d=7,h=5)
            for o in set(bpy.data.objects)-before:
                # Rotate the stock socket to match Eagle R90, then translate.
                v=o.location.copy();o.location=(-v.y+x,v.x-z,v.z);o.rotation_euler.z+=math.pi/2
        elif name=='M1':
            cylinder('Pre-attached haptic motor',5.6,3.5,(x,-.65,z),'Tin')
            cylinder('Motor cap',5.1,.15,(x,1.15,z),'Black')
            for dz in [-2,2]:box('Factory motor terminal',(2,.3,.8),(x-5.2,-2.1,z+dz),'Tin',.05)
        elif name=='U1':chip(x,-1.9,z,3,3,5)
        elif name=='C9':box('Tantalum capacitor',(3.5,2.2,2.8),(x,-1.3,z),'Black',.2)
        elif name.startswith(('C','R')):passive(x,-2.1,z)
    text('GROVE HAPTIC',(1,-2.35,7.5),1.1)
    text('0x5A',(-1,-2.35,-8),.9)


def spi_screen(id):
    # Manufacturer face dimensions are exact; depth, rear components and
    # connector packages are explicitly provisional until a sample is measured.
    w,d,aw,ad=(50.54,73.06,43.20,57.60) if id=='lcd-27579' else (43.3,70.5,36.72,48.96)
    pcb(w,d,-1.6,'Blue',holes=False)
    box('LCD metal frame',(w-1,1.2,d-9),(0,.1,-2),'Tin',.4)
    box('Black display bezel',(w-.8,.8,d-9),(0,1.1,-2),'Black',.35)
    box('Active display area',(aw,.08,ad),(0,1.56,-2),'Screen',.1)
    text('PHYGITAL',(0,1.62,-9),3)
    text('SCAN',(0,1.62,7),1.8)
    for n in range(7):box('Screen preview trace',(.6,.03,4+n%3*2),((n-3)*2,1.62,0),'Ceramic',.05)
    # A visible flexible tail and shrouded connector distinguish it from OLEDs.
    box('LCD flexible tail',(18,.15,8),(0,-2.4,d/2-7),'Kapton',.1)
    connector('Display cable socket',(0,-.9,d/2-3.5),pins=13 if id=='lcd-27579' else 8,pitch=1 if id=='lcd-27579' else 2,w=16 if id=='lcd-27579' else 19,d=5,h=4)
    chip(0,-3.15,0,5,5,6)
    for x in [-12,-8,8,12]:passive(x,-2.55,10)


def grove_mux_proxy():
    # No manufacturer mechanical CAD was located. Keep the provisional board
    # separate from the Eagle-derived haptic module and label it in the catalog.
    pcb(82,22,-3,'Blue')
    connector('Upstream Grove',(-34,0,0),w=10,d=7,h=5)
    for n in range(8):
        x=-20+(n%4)*16;z=-6 if n<4 else 6
        connector(f'Grove channel {n}',(x,0,z),w=10,d=6,h=5)
        text(f'CH{n}',(x,2.6,z),1)
    chip(-29,-1.9,0,4,5,8)
    text('0x70',(-29,-2.35,8),1)


def build(id):
    if id=='expansion':
        expansion_from_eagle()
    elif id=='grove-haptic':
        grove_haptic_from_eagle()
    elif id=='grove-mux':
        grove_mux_proxy()
    elif id=='lcd-27579':
        imported_cad('lcd-27579')
    elif id=='lcd-18366':
        spi_screen(id)
    elif id=='xiao':
        imported_cad('xiao', rotate=True)
    elif id=='thermal':
        # Manufacturer sensor assembly; the unidentified seller PCB is a proxy.
        imported_cad('thermal-sensor', offset=(-2,0,-2))
        pcb(22,24,-2.7,'PCB charcoal')
        connector('I2C connector',(3,.4,7.8),w=9,d=5,h=5)
        for x,z in [(-8,5),(-8,7),(-5,9),(7,-4),(8,-1)]: passive(x,-1.8,z,True)
        chip(6,-1.55,-7,2.6,3,4)
        text('MLX90640',(0,-2.05,-10.4),1)
    elif id=='battery':
        box('Pouch sealed edge',(55,4.6,73),(0,0,0),'Kapton',1.25)
        box('Aluminium cell',(52,4.7,66),(0,0,2),'Foil',1.1)
        for x in [-26.6,26.6]: box('Crimped side seam',(1.2,4.1,69),(x,0,1),'Kapton',.3)
        box('Protection PCB',(48,.45,4.7),(0,1.65,-32.8),'PCB jade',.2)
        chip(-9,2.2,-32.8,4,2,3)
        chip(8,2.2,-32.8,3,2,3)
        for x in [-17,-3,17]: passive(x,2.2,-32.8)
        box('Positive welded tab',(5,.1,2.5),(-21,2.45,-33.2),'Tin',.1)
        box('Negative welded tab',(5,.1,2.5),(21,2.45,-33.2),'Tin',.1)
        text('505573',(0,2.38,-5),4,'Black')
        text('3.7 V  2500 mAh',(0,2.38,4),2.5,'Black')
        text('Li-ion polymer',(0,2.38,12),1.6,'Black')
        # Short terminals stay inside the catalog envelope; full routes use the planner.
        wire('Positive lead',[(-21,2.5,-33),(-24,1.2,-34),(-25,0,-36)],.55,'Wire red')
        wire('Negative lead',[(21,2.5,-33),(24,1.2,-34),(25,0,-36)],.55)
    elif id=='rod':
        # Flattened paddle seen in the user's photo; body size is unmeasured.
        # Cross-section is a rounded 20 mm-wide capsule, not a cylindrical rod.
        points=[]
        for cx,cz,start in [(0,-65,180),(0,44,0)]:
            for i in range(49):
                angle=math.radians(start+i*180/48)
                points.append((10*math.cos(angle),cz+10*math.sin(angle)))
        verts=[loc((x,y,z)) for y in [-3.6,3.6] for x,z in points]
        n=len(points)
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh=bpy.data.meshes.new('Paddle shell');mesh.from_pydata(verts,[],faces);mesh.update()
        o=bpy.data.objects.new('Flat rounded antenna paddle',mesh);bpy.context.collection.objects.link(o);finish(o,'Flat rounded antenna paddle','Black')
        bevel=o.modifiers.new('Shell edge radius','BEVEL');bevel.width=1.7;bevel.segments=6;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
        for face in o.data.polygons: face.use_smooth=True
        normal=o.modifiers.new('Shell normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=normal.name)
        for x in [-8.5,8.5]: wire('Mould seam',[(x,0,-62),(x,0,-10),(x,0,42)],.10,'PCB charcoal')
        cylinder('Hinge barrel',5.1,11,(0,0,55),'Black','x')
        cylinder('Hinge pivot',2.1,11.2,(0,0,55),'Tin','x')
        box('Hinge neck',(7,7,9),(0,0,61),'Black',1)
        cylinder('RP-SMA rotating collar',6.4,11,(0,0,69),'Black','z')
        for i in range(32):
            a=i*math.pi/16
            cylinder('Collar knurl',.18,8,(6.35*math.cos(a),6.35*math.sin(a),69),'Black','z',vertices=12)
        ring('RP-SMA mating shell',4.5,3.4,4,(0,0,75),'Gold','z')
        for z in [73.8,74.5,75.2,75.9]: ring('Thread crest',4.7,4.3,.24,(0,0,z),'Gold','z')
        ring('Recessed centre socket',.65,.28,1.5,(0,0,75),'Gold','z')
        ring('RP-SMA insulator',3.35,.7,.8,(0,0,75),'Ceramic','z')
    elif id in ['oled-938','mosfet-5648']:
        imported_cad(id)
    elif id in ['oled-326','oled-az','oled-uctronics']:
        w,d={'oled-326':(29.2,26.7),'oled-az':(36,34),'oled-uctronics':(27,27)}[id]
        pcb(w,d,-2,'PCB charcoal')
        box('OLED glass',(w-3,.8,d-8),(0,-.8,-1),'Screen',.4)
        text('PHYGITAL',(0,-.36,-2),2.1,'Screen ink')
        text('SIGNAL / HEAT',(0,-.36,2),1.1,'Screen ink')
        box('Display flex',(10,.2,4),(0,-1,d/2-4),'Kapton',.1)
        for x in [-6,-2,2,6]: passive(x,-1,d/2-2)
        if id=='oled-326':
            for x in [-w/2+2.3,w/2-2.3]: connector('STEMMA QT proxy',(x,0,0),pins=4,w=4,d=4,h=3,pitch=1)
        else:
            for i in range(4):
                x=(i-1.5)*2.54
                box('Header spacer',(2.5,2.5,2.5),(x,-1.5,-d/2+2),'Black',.1)
                box('Header contact',(.64,6,.64),(x,.5,-d/2+2),'Gold',.04)
    elif id=='strip':
        box('Flexible film',(45,.4,10),(0,0,0),'Kapton',.6)
        # This is an antenna concept, not an RF-tuned trace design.
        for x in range(-19,20,5): box('Illustrative copper trace',(1.3,.06,7),(x,.24,0),'Gold',.05)
        box('Illustrative feed trace',(40,.06,1),(0,.24,-3),'Gold',.05)
        box('Adhesive backing',(43,.13,9),(0,-.28,0),'Black',.4)
        box('Feed pad',(2,.15,2),(-20,.3,-3),'Tin',.12)
        text('2.4 GHz',(4,.29,1),1.5,'Black')
    elif id=='rf':
        pcb(35,35,-3.2,'PCB charcoal')
        box('Shield solder flange',(25,.4,25),(0,-2.4,0),'Tin',.4)
        box('RF shield',(23.5,4.2,23.5),(0,0,0),'Tin',.6)
        text('AD8317',(0,2.12,0),3,'Black')
        for x in [-14,14]:
            cylinder('SMA hex body',3,4,(x,-.4,0),'Gold','x',vertices=6)
            ring('SMA shell',2.7,1.7,4,(x,-.4,0),'Gold','x')
            for dx in [-1.5,-.75,0,.75,1.5]: ring('SMA thread',2.85,2.6,.3,(x+dx,-.4,0),'Gold','x',segments=48)
        for x in [-8,-3,3,8]: passive(x,-2.2,-14)
        for x in [-6,6]: ring('Power solder pad',.9,.4,.08,(x,-2.56,14),'Gold',segments=32)
        text('RF IN',(-13,-2.54,-7),1)
        text('VOUT',(13,-2.54,-7),1)
    elif id=='motor':
        cylinder('Motor stainless can',5,2.65,(0,-.05,0),'Tin')
        ring('Crimped rim',5.03,4.8,.25,(0,1.25,0),'Tin')
        cylinder('Adhesive backing',4.6,.18,(0,1.43,0),'Black')
        for x in [-.8,.8]:
            box('Terminal solder',(.85,.2,1.1),(x,-1.35,3.7),'Tin',.1)
            wire('Motor lead',[(x,-1.25,3.4),(x,-.7,4.2),(x,0,4.6)],.25,'Wire red' if x<0 else 'Black')
    elif id in ['jst','grove','grove-tail']:
        pins=2 if id=='jst' else 4
        width=8 if id=='jst' else 10
        connector('JST-PH' if pins==2 else 'Grove plug',(0,0,-.6),pins=pins,w=width,d=6,h=5)
        for i in range(pins):
            x=(i-(pins-1)/2)*2
            wire('Insulated conductor',[(x,-1,2),(x,-.7,3),(x,-.4,3.8)],.35,'Wire red' if i==0 else 'Black')
            if id=='grove-tail': cylinder('Exposed conductor',.18,.6,(x,-.4,3.8),'Tin','z',vertices=24)
    elif id=='jumper':
        box('Dupont crimp housing',(2.54,2.54,7),(0,0,0),'Black',.15)
        box('Retention window',(1.2,.1,2),(0,1.29,0),'Tin',.08)
        box('Male contact',(.64,.64,4.8),(0,0,-5.5),'Tin',.06)
        wire('Jumper insulation',[(0,0,3),(0,0,3.6),(0,.15,4.1)],.45,'Wire red')
    elif id=='headers':
        for i in range(40):
            x=-49.53+i*2.54
            box('Breakaway spacer',(2.45,2.6,2.54),(x,-1.5,0),'Black',.22)
            box('Square pin',(.64,11,.64),(x,0,0),'Gold',.08)
    elif id=='driver':
        pcb(18,17,-1.2,'Purple')
        chip(0,.1,0,4,4,6)
        for x,z in [(-5,-3),(5,-3),(5,0),(-5,1)]: passive(x,-.3,z,True)
        for x in [-5,-2.5,0,2.5,5]: ring('Header pad',.85,.45,1.3,(x,-1.2,-6.5),'Gold',segments=32)
        text('DRV2605L',(0,-.54,5),1.25)
    elif id=='charger':
        pcb(30,25,-2.7,'Blue')
        chip(0,-1.5,0,4,4,6)
        chip(8,-1.5,-4,3,4,5)
        for x,z in [(-5,0),(-5,3),(4,4),(0,5),(8,2),(10,5)]: passive(x,-1.8,z)
        usb((-8,-.3,-9))
        connector('Battery jack',(9,-.1,9),pins=2,w=7,d=5)
        box('Inductor',(5,2,5),(-7,-.7,7),'Black',.3)
        text('BQ24074',(0,-2.05,9),1.3)


ids=['expansion','xiao','thermal','battery','rod','strip','rf','motor','jst','headers','driver','charger','grove','grove-tail','jumper','oled-938','oled-326','oled-az','oled-uctronics','mosfet-5648','lcd-27579','lcd-18366','grove-haptic','grove-mux']
ROOT.joinpath('public/models').mkdir(parents=True,exist_ok=True)
stats=json.loads((ROOT/'blender/model-stats.json').read_text()) if requested else []
stats=[s for s in stats if s['id'] not in requested]
for index,id in enumerate(ids):
    if requested and id not in requested: continue
    if requested and id in bpy.data.objects:
        old=bpy.data.objects[id]
        for child in list(old.children_recursive): bpy.data.objects.remove(child,do_unlink=True)
        bpy.data.objects.remove(old,do_unlink=True)
    bpy.ops.object.empty_add()
    root=bpy.context.object
    root.name=id
    root['part_id']=id
    root['units']='millimetres'
    root['accuracy']='detailed planning proxy; illustrative microfeatures; see catalog'
    build(id)
    originals=list(root.children_recursive)
    # Keep every named piece editable in .blend, but batch GLB meshes by material
    # to avoid hundreds of browser draw calls when adding fine connector details.
    batches={}
    for o in originals:
        if o.type!='MESH': continue
        key='Imported CAD' if len(o.data.materials)>1 or o.get('source') else o.data.materials[0].name
        copy=o.copy()
        copy.data=o.data.copy()
        bpy.context.collection.objects.link(copy)
        batches.setdefault(key,[]).append(copy)
    exports=[]
    for name,objects in batches.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        o=bpy.context.object
        o.name=id+' / '+name
        exports.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for o in exports: o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{id}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    stats.append({'id':id,'editablePieces':len(originals),'drawMeshes':len(exports),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in exports)})
    for o in exports: bpy.data.objects.remove(o,do_unlink=True)
    root.location=(index%4*120,index//4*190,0)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.unit_settings.scale_length=.001
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/parts-library.blend'))
ROOT.joinpath('blender/model-stats.json').write_text(json.dumps(sorted(stats,key=lambda s:ids.index(s['id'])),indent=2)+'\n')
print(f'Saved editable library and {len(ids)} detailed GLB planning models.')
