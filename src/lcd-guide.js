// A physical connector explanation, not a wiring simulator. We deliberately
// show female housings and the two metal tips of each male-to-male adapter.
// Manufacturer GH harness and Seeed socket photos establish the connector chain;
// routed lengths, bend radii and custom GPIO assignments remain planning choices.
export const LCD_GUIDE_WIRES=[
 {pin:1,lcd:'VCC',target:'3V3',side:'right',row:2},
 {pin:2,lcd:'GND',target:'GND',side:'right',row:1},
 {pin:4,lcd:'MOSI',target:'D10',side:'right',row:3},
 {pin:5,lcd:'SCLK',target:'D8',side:'right',row:5},
 {pin:6,lcd:'LCD_CS',target:'D0',side:'left',row:0},
 {pin:7,lcd:'LCD_DC',target:'D2',side:'left',row:2},
 {pin:8,lcd:'LCD_RST',target:'D6',side:'left',row:6},
 {pin:9,lcd:'LCD_BL',target:'D7',side:'right',row:6}
];

export function mountLcdGuide(root,stateApi){
 const svg=root.querySelector('.guide-scene'),choice=root.querySelector('select'),mate=root.querySelector('[data-mate]'),detail=root.querySelector('.guide-selected');
 let view='join',index=0,connected=false;
 const rect=(x,y,w,h,cls='body',r=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
 const line=(x1,y1,x2,y2,cls='leader')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
 const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${t}</text>`;
 const path=(d,cls='wire')=>`<path d="${d}" class="${cls}"/>`;
 const circle=(x,y,r,cls='contact')=>`<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
 const contacts=(x,y,count,pitch,vertical=false)=>Array.from({length:count},(_,n)=>rect(x+(vertical?0:n*pitch),y+(vertical?n*pitch:0),3,6,'contact',0)).join('');
 function cable(w){
  // Stack the three physical objects at phone widths, retaining full-size labels.
  const phone=w<540,H=phone?610:390,lcdX=phone?14:12,lcdY=phone?53:65,lcdW=phone?144:140,lcdH=185;
  let s=text(12,22,'LCD · rear view')+rect(lcdX,lcdY,lcdW,lcdH,'body',7);
  for(const x of [lcdX+10,lcdX+lcdW-10])for(const y of [lcdY+10,lcdY+lcdH-10])s+=circle(x,y,4);
  s+=rect(lcdX+30,lcdY+28,70,80,'outline')+rect(lcdX+40,lcdY+48,48,25,'body')+contacts(lcdX+43,lcdY+52,6,7);
  s+=rect(lcdX+40,lcdY+139,64,18,'outline')+contacts(lcdX+44,lcdY+143,13,4.2);
  s+=text(lcdX+lcdW/2,lcdY+172,'13-pin rear socket','small','middle');
  const plugX=phone?37:182,plugY=phone?268:126;
  // The separated white plug mates directly with the rear socket; a dashed
  // insertion guide must not look like another electrical wire between them.
  s+=`<path d="M${plugX+29} ${plugY} L${lcdX+72} ${lcdY+157}" class="leader" stroke-dasharray="4 4"/>`;
  s+=rect(plugX,plugY,65,25,'outline')+contacts(plugX+6,plugY+5,13,4.1);
  const fanX=phone?120:w*.55,fanY=phone?380:116;
  for(let n=0;n<13;n++){
   const ey=fanY+n*10;
   s+=path(`M${plugX+6+n*4.1} ${plugY+25} C${plugX+50} ${plugY+85},${fanX-40} ${ey},${fanX} ${ey}`);
   s+=rect(fanX,ey-3,28,7,'dark',1)+rect(fanX+23,ey-1.5,4,3,'outline',0);
  }
  if(phone){
   s+=text(12,328,'One white GH1.25 plug')+text(12,348,'included with the screen','small');
   s+=text(165,405,'13 separate')+text(165,425,'female ends');
   s+=text(12,548,'8 used for the display')+text(12,570,'MISO + 4 touch wires stay unplugged','small');
   s+=text(12,597,'Illustrative routing · not to scale','small');
  }else{
   s+=text(172,65,'GH1.25 13-pin cable')+text(172,86,'included with SKU 27579','small');
   s+=text(fanX-12,279,'13 female jumper ends')+text(fanX-12,300,'8 used for this display-only plan','small');
   s+=text(12,350,'Plug sits on the back; the cable routes beneath the display.');
   s+=text(12,374,'Connector positions follow the manufacturer; cable bends are illustrative.','small');
  }
  return {s,H,summary:'One GH1.25 13-pin harness comes with the LCD. The board end fans out into individual female sockets.'};
 }
 function join(w){
  const phone=w<540,H=phone?610:390,cy=phone?130:178,fx=phone?16:16,fw=phone?93:128,delta=connected?0:28;
  const mx=fx+fw-16+delta,bx=phone?w-65:w-86,by=phone?440:258,maleY=by-48-delta;
  let s=text(12,24,'One wire · connector cutaway')+text(12,45,'Enlarged; solid pins enter hollow sockets.','small');
  // Cable female terminal: open at right, with two contact leaves inside.
  s+=path(`M${fx-10} ${cy}H${fx}`,'active-wire')+rect(fx,cy-18,fw,36,'dark',3)+rect(fx+fw-48,cy-9,48,18,'outline',0);
  s+=line(fx+fw-46,cy-6,fx+fw-4,cy-6,'wire')+line(fx+fw-46,cy+6,fx+fw-4,cy+6,'wire');
  s+=text(fx,cy+51,'LCD cable end')+text(fx,cy+72,'female · hole','small');
  // First male tip enters the cable socket horizontally. The other enters the
  // carrier vertically, just as the open top-facing outer header does.
  s+=rect(mx,cy-3,36,6,'metal',0)+rect(mx+36,cy-12,34,24,'dark',2);
  s+=path(`M${mx+70} ${cy} C${mx+105} ${cy},${bx} ${maleY-90},${bx} ${maleY}`,'active-wire');
  s+=rect(bx-12,maleY,24,34,'dark',2)+rect(bx-3,maleY+34,6,36,'metal',0);
  s+=rect(bx-41,by+44,82,10,'body')+rect(bx-23,by,46,44,'dark',2)+rect(bx-7,by,14,35,'outline',0);
  s+=line(bx-4,by+4,bx-4,by+31,'wire')+line(bx+4,by+4,bx+4,by+31,'wire');
  if(phone){
   s+=text(12,278,'2.54 mm male-to-male jumper')+text(12,300,'a metal pin at BOTH ends','small');
   s+=line(135,258,bx-5,330);
   s+=text(12,535,'Carrier’s spare side socket')+text(12,557,'female · opens upward','small');
   s+=text(12,591,'Repeat this connection for all 8 display wires.','small');
  }else{
   s+=text(w*.47,83,'Male-to-male jumper','', 'middle')+text(w*.47,105,'metal pins at BOTH ends','small','middle');
   s+=line(w*.47,113,mx+21,cy-6);
   s+=text(bx-110,by+85,'Carrier side socket')+text(bx-110,by+105,'female · opens upward','small');
   s+=text(12,357,'8 × 2.54 mm male-to-male Dupont jumpers · no soldering');
  }
  return {s,H,summary:connected?'Both male pins are seated: one in the LCD lead, one in the carrier socket. Cutaway shows the hidden contact.':'The two female sockets cannot mate directly. A male-to-male jumper connects them.'};
 }
 function board(w){
  const wire=LCD_GUIDE_WIRES[index],phone=w<540,H=phone?540:460,bw=phone?168:210,bh=330,x=(w-bw)/2,y=65;
  let s=text(w/2,22,'Top view · USB at the top','','middle')+rect(x,y,bw,bh,'body',8)+rect(x+bw/2-18,y-12,36,23,'metal',3);
  const xiaoX=x+46,xiaoW=bw-92;
  s+=rect(xiaoX,y+28,xiaoW,164,'outline',3)+rect(xiaoX+6,y+56,xiaoW-12,85,'body')+text(w/2,y+102,'ESP32','small','middle');
  const pairs=[['D0','5V'],['D1','GND'],['D2','3V3'],['D3','D10'],['D4','D9'],['D5','D8'],['D6','D7']];
  const pitch=22,py=y+38;
  for(let row=0;row<7;row++)for(let side=0;side<2;side++){
   const px=side?x+bw-29:x+15,sy=py+row*pitch,selected=row===wire.row&&(side?'right':'left')===wire.side;
   s+=rect(px,sy,14,14,selected?'on':'dark',1)+rect(px+4,sy+4,6,6,'outline',0);
   s+=text(side?px+22:px-8,sy+12,pairs[row][side],'',side?'start':'end');
  }
  s+=rect(x+38,y+217,bw-76,59,'dark',2)+text(w/2,y+250,'onboard OLED','inverse small','middle');
  const px=wire.side==='left'?x+22:x+bw-22,sy=py+wire.row*pitch+7;
  // Only the selected route is shown so all socket labels remain readable.
  s+=circle(px,sy,11,'on')+rect(px-4,sy-4,8,8,'outline',0);
  const labelY=y+bh+30;
  s+=text(w/2,labelY,`LCD ${wire.lcd} → ${wire.target}`,'','middle');
  s+=text(w/2,labelY+23,`${wire.side==='left'?'Left':'Right'} outer row · socket ${wire.row+1} from USB`,'small','middle');
  if(phone)s+=text(w/2,labelY+55,'Custom assignment · display only','small','middle');
  return {s,H,summary:`LCD contact ${wire.pin} (${wire.lcd}) → included female lead → male-to-male jumper → ${wire.target}.`};
 }
 function render(){
  const w=Math.max(280,Math.round(root.getBoundingClientRect().width));
  const scene=({cable,join,board})[view](w);svg.setAttribute('viewBox',`0 0 ${w} ${scene.H}`);svg.style.height=scene.H+'px';svg.innerHTML=`<title>LCD cable: ${view}</title><desc>${scene.summary}</desc>`+scene.s;detail.textContent=scene.summary;
  root.querySelector('[data-wire-control]').hidden=view==='cable';choice.hidden=view!=='board';root.querySelector('label').hidden=view!=='board';mate.hidden=view!=='join';mate.textContent=connected?'Separate the plugs':'Insert the jumper';choice.value=String(index);
  root.querySelectorAll('[data-guide-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideView===view)));
 }
 function restore(value){const s=value?.privateContent||{};if(['cable','join','board'].includes(s.view))view=s.view;if(Number.isInteger(s.index)&&s.index>=0&&s.index<8)index=s.index;connected=s.connected===true;render();}
 function save(){stateApi?.setWidgetState?.({modelContent:{wire:LCD_GUIDE_WIRES[index],view},privateContent:{view,index,connected}})?.catch(()=>{});}
 root.querySelectorAll('[data-guide-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.guideView;render();save();}));
 choice.addEventListener('change',()=>{index=Number(choice.value);render();save();});mate.addEventListener('click',()=>{connected=!connected;render();save();});
 const observer=new ResizeObserver(render);observer.observe(root);
 const onState=e=>{if(e.detail?.globals?.widgetState)restore(e.detail.globals.widgetState);};window.addEventListener('openai:set_globals',onState);restore(stateApi?.widgetState);
 return ()=>{observer.disconnect();window.removeEventListener('openai:set_globals',onState);};
}
