/* Tessellate vendor STEP in millimetres before Blender assembles the library.
 * Keep source files intact; the JSON cache is local and rebuildable.
 */
const fs = require('node:fs');
const path = require('node:path');
const occtImport = require('occt-import-js');
(async () => {
  const occt = await occtImport();
  const requested=new Set(process.argv.slice(2));
  for (const [id, file] of [['xiao','xiao-esp32s3.step'],['thermal-sensor','MLX90640_41_FOV_55_asm.stp'],['oled-938','oled-938.step'],['mosfet-5648','mosfet-5648.step'],['lcd-27579','lcd-27579.stp']]) {
    if(requested.size&&!requested.has(id))continue;
    const result = occt.ReadStepFile(fs.readFileSync(path.join(__dirname,'vendor',file)), {
      linearUnit: 'millimeter', linearDeflectionType:'absolute_value', linearDeflection:.015, angularDeflection:.15,
    });
    if (!result.success || !result.meshes.length) throw new Error(`Cannot tessellate ${file}`);
    fs.mkdirSync(path.join(__dirname,'.cache'),{recursive:true});
    fs.writeFileSync(path.join(__dirname,'.cache',id+'.json'),JSON.stringify(result));
    const bounds = result.meshes.map(m => {
      const v=m.attributes.position.array, min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<v.length;i++) { min[i%3]=Math.min(min[i%3],v[i]); max[i%3]=Math.max(max[i%3],v[i]); }
      return {name:m.name,color:m.color,min,max,triangles:m.index.array.length/3};
    });
    const min=[0,1,2].map(i=>Math.min(...bounds.map(b=>b.min[i]))),max=[0,1,2].map(i=>Math.max(...bounds.map(b=>b.max[i])));console.log(id,JSON.stringify({min,max,triangles:bounds.reduce((n,b)=>n+b.triangles,0)}));
  }
})();
