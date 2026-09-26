# Core Pro (F20) magnetic power bank -- model + studio scene.
# Units: metres, dimensions from the listing: 104 x 66 x 7.8 mm.
# Usage: python corepro.py <shot> <out.png> [samples] [res]
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
MM = 0.001
L, W, T = 104*MM, 66*MM, 7.8*MM          # length (y), width (x), thickness (z)
R_CORNER = 7.2*MM                          # plan-view corner radius (from front photo)
R_EDGE = 1.25*MM                           # front/back polished chamfer
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
shot = args[0] if args else 'hero'
out = os.path.abspath(args[1]) if len(args) > 1 else os.path.join(HERE, shot + '.png')
samples = int(args[2]) if len(args) > 2 else 256
res = int(args[3]) if len(args) > 3 else 1600

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ helpers
def rrect(w, h, r, n=32):
    pts = []
    for cx, cy, a0 in [(w/2-r, h/2-r, 0), (-w/2+r, h/2-r, 90), (-w/2+r, -h/2+r, 180), (w/2-r, -h/2+r, 270)]:
        for i in range(n+1):
            a = math.radians(a0 + 90*i/n)
            pts.append((cx + r*math.cos(a), cy + r*math.sin(a)))
    return pts

def slab(name, w, h, r, z0, z1, n=32):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in rrect(w, h, r, n)]
    top = [bm.verts.new((x, y, z1)) for x, y in rrect(w, h, r, n)]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    k = len(bot)
    for i in range(k):
        bm.faces.new([bot[i], bot[(i+1) % k], top[(i+1) % k], top[i]])
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    return ob

def bake(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
    return ob

def smooth(ob):
    for p in ob.data.polygons: p.use_smooth = True

def mat(name, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m, b

def img_node(m, path, non_color=False):
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(path)
    if non_color: n.image.colorspace_settings.name = 'Non-Color'
    return n

# ------------------------------------------------------------------ materials
ALU = (0.56, 0.575, 0.60, 1)   # "F20 grey" anodised
m_face, b_face = mat('BeadBlastAlu', **{'Base Color': ALU, 'Metallic': 1.0, 'Roughness': 0.42})
nt = m_face.node_tree
noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 9000; noise.inputs['Detail'].default_value = 2
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.035; bump.inputs['Distance'].default_value = 0.00002
nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b_face.inputs['Normal'])

m_chamf, _ = mat('PolishedAlu', **{'Base Color': (0.60, 0.615, 0.64, 1), 'Metallic': 1.0, 'Roughness': 0.07})
m_side, b_side = mat('SatinAlu', **{'Base Color': ALU, 'Metallic': 1.0, 'Roughness': 0.26,
                                    'Anisotropic': 0.6})
m_port, _ = mat('PortDark', **{'Base Color': (0.02, 0.02, 0.022, 1), 'Metallic': 0.3, 'Roughness': 0.5})

# Back: black glass with printed pattern
m_back, b_back = mat('BackGlass', **{'Base Color': (0.012, 0.012, 0.013, 1), 'Roughness': 0.28,
                                     'Coat Weight': 0.35, 'Coat Roughness': 0.08})
nt = m_back.node_tree
tp = img_node(m_back, os.path.join(HERE, 'back_print.png'), True)
td = img_node(m_back, os.path.join(HERE, 'back_disc.png'), True)
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs['A'].default_value = (0.012, 0.012, 0.013, 1); mix.inputs['B'].default_value = (0.55, 0.56, 0.58, 1)
nt.links.new(tp.outputs['Color'], mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], b_back.inputs['Base Color'])
rmix = nt.nodes.new('ShaderNodeMapRange'); rmix.inputs['To Min'].default_value = 0.34; rmix.inputs['To Max'].default_value = 0.14
nt.links.new(td.outputs['Color'], rmix.inputs['Value']); nt.links.new(rmix.outputs['Result'], b_back.inputs['Roughness'])

# Display: black glass + emissive digits
m_disp, b_disp = mat('DisplayGlass', **{'Base Color': (0.004, 0.004, 0.005, 1), 'Roughness': 0.03,
                                        'Coat Weight': 1.0, 'Coat Roughness': 0.0, 'Emission Strength': 2.2})
t_disp = img_node(m_disp, os.path.join(HERE, 'display.png'))
m_disp.node_tree.links.new(t_disp.outputs['Color'], b_disp.inputs['Emission Color'])

# ------------------------------------------------------------------ body
body = slab('CorePro', W, L, R_CORNER, -T/2, T/2)
bv = body.modifiers.new('rim', 'BEVEL'); bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
bv.width = R_EDGE; bv.segments = 10; bv.profile = 0.5; bv.harden_normals = True
bake(body)

# USB-C port on the long edge (x = -W/2), near the bottom end
PORT_Y = -L/2 + 18*MM
cut = slab('portcut', 3.25*MM, 8.95*MM, 1.6*MM, 0, 1, 16)
cut.data.transform(Matrix.Translation((0, 0, -0.5)))
cut.data.transform(Matrix.Scale(8*MM, 4, (0, 0, 1)))
cut.rotation_euler = (0, math.radians(90), 0); cut.location = (-W/2, PORT_Y, 0)
bo = body.modifiers.new('port', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
bake(body); bpy.data.objects.remove(cut)
tongue = slab('tongue', 0.7*MM, 6.6*MM, 0.3*MM, 0, 5*MM, 6)
for v in tongue.data.vertices:
    x, y, z = v.co
    v.co = (z, y, x)   # swap x/z: thickness along z, depth along +x
for p in tongue.data.polygons: p.flip()
tongue.location = (-W/2 + 1.0*MM, PORT_Y, 0)
tongue.data.materials.append(m_port)

# side button (pill), further up the same edge
BTN_Y = -L/2 + 46*MM
btn = slab('button', 1.9*MM, 7.0*MM, 0.95*MM, 0, 0.5*MM, 12)
me = btn.data
for v in me.vertices:
    x, y, z = v.co
    v.co = (-z, y, x)
btn.location = (-W/2 + 0.12*MM, BTN_Y, 0)
b2 = btn.modifiers.new('b', 'BEVEL'); b2.width = 0.18*MM; b2.segments = 4; b2.limit_method = 'ANGLE'
bake(btn); smooth(btn); btn.data.materials.append(m_chamf)

# material split by face normal
body.data.materials.append(m_face)    # 0 front (+z)
body.data.materials.append(m_back)    # 1 back (-z)
body.data.materials.append(m_chamf)   # 2 polished chamfers
body.data.materials.append(m_side)    # 3 satin side band
body.data.materials.append(m_port)    # 4 port cavity
for p in body.data.polygons:
    nz = p.normal.z; c = p.center
    if c.x < -W/2 + 0.6*MM and abs(c.y - PORT_Y) < 4.6*MM and abs(c.z) < 1.7*MM and abs(p.normal.x) < 0.99:
        p.material_index = 4
    elif nz > 0.9995: p.material_index = 0
    elif nz < -0.9995: p.material_index = 1
    elif abs(nz) < 0.25: p.material_index = 3
    else: p.material_index = 2
    p.use_smooth = abs(nz) < 0.9995

# UVs for the back print (planar, 0..1 over the footprint; image is drawn back-view)
uv = body.data.uv_layers.new(name='UV')
for p in body.data.polygons:
    for li in p.loop_indices:
        v = body.data.vertices[body.data.loops[li].vertex_index].co
        # back is seen from -z: mirror x so the print reads correctly
        uv.data[li].uv = (0.5 - v.x / W, 0.5 + v.y / L)

# display window on the front, lower right
DX = W/2 - 10.5*MM - 7.4*MM
DY = -L/2 + 10.9*MM + 4.5*MM
disp = slab('display', 14.8*MM, 9.0*MM, 1.4*MM, T/2 - 0.01*MM, T/2 + 0.06*MM, 12)
disp.location = (DX, DY, 0)
disp.data.materials.append(m_disp)
uvd = disp.data.uv_layers.new(name='UV')
for p in disp.data.polygons:
    for li in p.loop_indices:
        v = disp.data.vertices[disp.data.loops[li].vertex_index].co
        uvd.data[li].uv = (0.5 + v.x / (14.8*MM), 0.5 + v.y / (9.0*MM))

# parent everything to one empty so shots can pose the product
rig = bpy.data.objects.new('CoreProRig', None); sc.collection.objects.link(rig)
for o in (body, tongue, btn, disp): o.parent = rig

# ------------------------------------------------------------------ studio
world = bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.02

def area(name, loc, size, energy, shape='RECTANGLE', size_y=None, target=(0, 0, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.shape = shape
    ld.size = size; ld.size_y = size_y or size
    ld.use_shadow = name == 'key'
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    d = Vector(target) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob

# big soft key + fill + edge strips (classic product setup)
# big soft overhead key (gives the matte face its even grey), side strips for chamfer highlights
area('key', (-0.10, -0.15, 0.45), 0.60, 1.6, size_y=0.45)
area('front', (0.05, -0.55, 0.18), 0.35, 0.45, size_y=0.25)
area('stripL', (-0.30, -0.05, 0.10), 0.05, 0.22, size_y=0.45)
area('stripR', (0.28, 0.05, 0.12), 0.05, 0.26, size_y=0.45)
area('back', (0.0, 0.40, 0.25), 0.50, 0.25, size_y=0.12)
floor = bpy.data.objects.new('floor', bpy.data.meshes.new('floor')); sc.collection.objects.link(floor)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0); bm.to_mesh(floor.data); bm.free()
floor.is_shadow_catcher = True

cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.lens = 100; cam_d.sensor_width = 36

def look(loc, target):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

# ------------------------------------------------------------------ shots
if shot == 'front':
    # straight-on catalog shot, product standing on its bottom edge
    rig.rotation_euler = (math.radians(90), 0, 0); rig.location = (0, 0, L/2)
    look((0, -0.62, L/2), (0, 0, L/2)); cam_d.type = 'ORTHO'; cam_d.ortho_scale = 0.155
    sc.render.resolution_x = res; sc.render.resolution_y = res
elif shot == 'back':
    rig.rotation_euler = (math.radians(90), 0, math.radians(180)); rig.location = (0, 0, L/2)
    look((0, -0.62, L/2), (0, 0, L/2)); cam_d.type = 'ORTHO'; cam_d.ortho_scale = 0.155
    sc.render.resolution_x = res; sc.render.resolution_y = res
elif shot == 'hero':
    # standing, leaning back slightly, turned 28 degrees -- shows front, chamfer and port edge
    rig.rotation_euler = (math.radians(82), 0, math.radians(35))
    rig.location = (0, 0, L/2 * math.sin(math.radians(82)) + T/2 * math.cos(math.radians(82)))
    look((-0.20, -0.52, 0.16), (0.004, 0.0, 0.052)); cam_d.lens = 130
    sc.render.resolution_x = res; sc.render.resolution_y = int(res * 1.0)
elif shot == 'flat':
    # lying on its front, showing the back print and the port edge
    rig.rotation_euler = (math.radians(180), 0, math.radians(-100)); rig.location = (0, 0, T/2)
    look((0.10, -0.42, 0.26), (0, 0, 0)); cam_d.lens = 100
    sc.render.resolution_x = res; sc.render.resolution_y = int(res * 0.75)
elif shot == 'edge':
    rig.rotation_euler = (math.radians(90), 0, math.radians(-90)); rig.location = (0, 0, L/2)
    look((-0.10, -0.03, 0.035), (-W/2, 0, 0.035)); cam_d.lens = 100
    sc.render.resolution_x = res; sc.render.resolution_y = int(res * 0.66)

# ------------------------------------------------------------------ export
if shot == 'export':
    # .blend with textures packed in (opens on any PC), plus a GLB for Shopify 3D/AR
    dst = out if os.path.isdir(out) else os.path.dirname(out)
    rig.rotation_euler = (0, 0, 0); rig.location = (0, 0, T/2)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 256; sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    look((-0.20, -0.52, 0.30), (0, 0, 0)); cam_d.lens = 100
    sc.render.resolution_x = 2000; sc.render.resolution_y = 2000
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(dst, 'core-pro.blend'), compress=True)
    # glTF-friendly back material: plain image into Base Color
    bn = m_back.node_tree
    tc = img_node(m_back, os.path.join(HERE, 'back_color.png'))
    bn.links.new(tc.outputs['Color'], b_back.inputs['Base Color'])
    b_back.inputs['Coat Weight'].default_value = 0.0; b_back.inputs['Roughness'].default_value = 0.25
    for o in list(sc.objects):
        if o.type in ('LIGHT', 'CAMERA') or o.name == 'floor': bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=os.path.join(dst, 'core-pro.glb'), export_format='GLB',
                              export_apply=True, export_yup=True)
    print('EXPORTED', dst); sys.exit(0)

# ------------------------------------------------------------------ render
r = sc.render; r.engine = 'CYCLES'; r.film_transparent = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'; r.filepath = out
sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 12; sc.cycles.glossy_bounces = 8
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'corepro.blend'))
bpy.ops.render.render(write_still=True)
print('WROTE', out)
