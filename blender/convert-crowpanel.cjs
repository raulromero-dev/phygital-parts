/* Unmodified Elecrow and Espressif STEP -> rebuildable local mesh caches. */
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const occt = await require('occt-import-js')();
  for (const [source, cache] of [
    ['advance-hmi2_8-20260126.stp', 'crowpanel-advance-hmi2_8-20260126'],
    ['ESP32-S3-WROOM-1.STEP', 'crowpanel-esp32'],
  ]) {
    const data = occt.ReadStepFile(fs.readFileSync(path.join(__dirname, 'vendor/crowpanel', source)), {
      linearUnit: 'millimeter', linearDeflectionType: 'absolute_value', linearDeflection: .015, angularDeflection: .15,
    });
    if (!data.success || !data.meshes.length) throw new Error(`Cannot tessellate ${source}`);
    fs.mkdirSync(path.join(__dirname, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '.cache', cache + '.json'), JSON.stringify(data));
    console.log(source, data.meshes.length, 'CAD bodies');
  }
})();
