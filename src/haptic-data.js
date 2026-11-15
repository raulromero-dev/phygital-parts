// Reference preset. Live user-edited connections remain in the cable inspector.
export const HAPTIC_SIGNALS = [
  {id:'scl', pin:1, label:'SCL · clock', color:'Yellow', xiao:'D5 / GPIO6'},
  {id:'sda', pin:2, label:'SDA · data', color:'White', xiao:'D4 / GPIO5'},
  {id:'vcc', pin:3, label:'VCC · supply', color:'Red', xiao:'3.3 V rail · review current'},
  {id:'gnd', pin:4, label:'GND · return', color:'Black', xiao:'GND'},
];
export const HAPTIC_ROUTES = [
  {id:'up', name:'Board → hub', from:'expansion:i2c2-', to:'haptic-hub:up-', fromLabel:'Carrier J4 · upper-right I²C', toLabel:'Hub · I2C input', description:'Use the spare upper-right Grove I²C socket on the expansion board, with USB at the top. The XIAO reaches this socket through the carrier’s internal traces.'},
  ...Array.from({length:4},(_,n)=>({id:`ch${n}`, name:`Hub → motor ${n+1}`, from:`haptic-hub:ch${n}-`, to:`grove-haptic-${n+1}:`, fromLabel:`Hub · I2C${n} / channel ${n}`, toLabel:`Motor ${n+1} · Grove socket`, description:`Plug a separate Grove cable into hub port I2C${n} and the white socket on haptic module ${n+1}. Its coin motor is already attached to the driver. No separate motor wiring.`})),
];
export const HAPTIC_SOURCING = {
  checked:'November 14, 2026 · 2:34 p.m. ET',
  motor:{sku:'105020011', price:4.90, url:'https://www.seeedstudio.com/Grove-Haptic-Motor-p-2546.html'},
  hub:{sku:'103020293', price:7.99, url:'https://www.seeedstudio.com/Grove-8-Channel-I2C-Hub-TCA9548A-p-4398.html'},
  cables:{sku:'110990036', price:1.45, url:'https://www.seeedstudio.com/Grove-Universal-4-Pin-Buckled-5cm-Cable-5-PCs-Pack.html'},
  amazonMotor:{price:23.99, url:'https://www.amazon.com/dp/B0GXYPQXPJ'},
  amazonHub:{price:39.99, url:'https://www.amazon.com/dp/B0BWJCJ9HL'},
  microcenter:{price:7.99,url:'https://www.microcenter.com/product/613668/adafruit-industries-drv2605l-haptic-motor-controller'},
};
