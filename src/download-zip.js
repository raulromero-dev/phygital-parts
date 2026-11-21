// Small, dependency-free ZIP writer. Stored entries keep source/binary bytes exact.
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
export function storedZip(entries){
 if(!Array.isArray(entries)||entries.length>200)throw Error('Too many download files.');
 const local=[],central=[],seen=new Set();let offset=0,centralSize=0;
 for(const [path,value]of entries){
  if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(path))throw Error('Invalid download filename.');
  seen.add(path);const name=encoder.encode(path),data=typeof value==='string'?encoder.encode(value):value;
  if(!(data instanceof Uint8Array)||name.length>65535||offset+data.length>32e6)throw Error('Download is too large.');
  const crc=crc32(data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
  const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);
  d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);directory.set(name,46);
  local.push(header,data);central.push(directory);offset+=header.length+data.length;centralSize+=directory.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:'application/zip'});
}
