"""Build the pinned real Phygital renderer into a portable Studio preview bundle.
Set EMXX to em++ from an Emscripten SDK. No compiler is needed at app runtime.
"""
import base64, hashlib, json, os, pathlib, subprocess

root = pathlib.Path(__file__).resolve().parents[1]
folder = root / 'firmware-preview'
source = folder / 'vendor/phygital/tools/tft_sim/scenes.txt'
scenes = []
for line in source.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#'): continue
    if line.startswith('scene '): scenes.append({'name': line[6:], 'lines': []})
    else: scenes[-1]['lines'].append(line)
(folder / 'scenes.generated.h').write_text('static const int SCENE_COUNT = %d;\nstatic const char *SCENES[] = {%s};\n' % (len(scenes), ','.join(json.dumps('\n'.join(s['lines'])) for s in scenes)))
out = root / 'public/firmware'; out.mkdir(exist_ok=True)
exports = ['sim_init','sim_width','sim_height','sim_frame','sim_scene','sim_step','sim_tap','sim_input','sim_get_input']
cmd = [os.environ.get('EMXX','em++'), '-std=c++17','-O2','-DARDUINO=10819',
       '-I'+str(folder/'vendor/phygital/tools/tft_sim/stubs'), '-I'+str(folder/'vendor/adafruit-gfx'),
       str(folder/'adapter.cpp'), str(folder/'vendor/adafruit-gfx/Adafruit_GFX.cpp'),
       '--no-entry','-sSTANDALONE_WASM=1','-sFILESYSTEM=0','-sINITIAL_MEMORY=16777216',
       '-sALLOW_MEMORY_GROWTH=0','-sSTACK_SIZE=1048576',
       '-sEXPORTED_FUNCTIONS='+json.dumps(['_'+name for name in exports]),
       '-o',str(out/'phygital-tft.wasm')]
subprocess.run(cmd, check=True)
wasm = (out/'phygital-tft.wasm').read_bytes()
provenance = json.loads((folder/'sources.json').read_text())
bundle = {'format':'phygital-firmware','version':1,'name':'Phygital · Haldzemo 2.8″',
          'width':240,'height':320,'pixelFormat':'rgb565','sourceUrl':provenance['repository'],
          'revision':provenance['revision'],'sha256':hashlib.sha256(wasm).hexdigest(),
          'scenes':[s['name'].split('-',1)[1].replace('-',' ').capitalize() for s in scenes],
          'inputs':[{'id':0,'name':'Signal strength','min':-95,'max':-25,'step':1,'value':-48,'unit':'dBm'},
                    {'id':1,'name':'Phone linked','min':0,'max':1,'step':1,'value':0,'unit':''},
                    {'id':2,'name':'Sound','min':0,'max':1,'step':1,'value':1,'unit':''},
                    {'id':3,'name':'Warm spot','min':0,'max':1,'step':1,'value':0,'unit':''}]}
(out/'phygital-tft.json').write_text(json.dumps({**bundle,'wasm':base64.b64encode(wasm).decode()}, separators=(',',':'))+'\n')
print('Built real renderer:',len(wasm),'bytes,',len(scenes),'scenes; revision',provenance['revision'][:7])
