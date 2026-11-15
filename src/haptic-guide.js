import './haptic-guide.css';
import { HAPTIC_ROUTES as routes, HAPTIC_SIGNALS as signals, HAPTIC_SOURCING as sources } from './haptic-data.js';
const link=(url,label)=>`<a href="${url}" target="_blank" rel="noreferrer">${label} ↗</a>`;
const money=value=>`$${value.toFixed(2)}`;
const ref=name=>`${import.meta.env.BASE_URL}reference/${name}`;

function cableCloseup(){
 return `<svg class="hg-cable-closeup" viewBox="0 0 440 110" role="img" aria-label="Grove cable with four wires and a keyed white plug at each end, aligned with board sockets">
 <g fill="var(--mono-paper)" stroke="var(--mono-secondary)"><rect x="4" y="34" width="37" height="56" rx="3"/><rect x="61" y="38" width="49" height="48" rx="3"/><path d="M75 38 V30 H94 V38"/><rect x="330" y="38" width="49" height="48" rx="3"/><path d="M346 38 V30 H365 V38"/><rect x="399" y="34" width="37" height="56" rx="3"/></g>
 ${[0,1,2,3].map(n=>`<path d="M110 ${47+n*10} H330" stroke="${['var(--mono-muted)','var(--mono-border-strong)','var(--mono-secondary)','var(--mono-ink)'][n]}" stroke-width="3"/><path d="M24 ${47+n*10} H41 M399 ${47+n*10} H416" stroke="var(--mono-strong)" stroke-width="2"/><rect x="65" y="${44+n*10}" width="11" height="5" fill="var(--mono-border)" stroke="var(--mono-muted)"/><rect x="364" y="${44+n*10}" width="11" height="5" fill="var(--mono-border)" stroke="var(--mono-muted)"/>`).join('')}
 <g fill="var(--mono-secondary)" font-size="10" font-family="inherit"><text x="4" y="17">Socket</text><text x="61" y="17">Keyed plug</text><text x="220" y="17" text-anchor="middle">One 4-wire cable</text><text x="322" y="17">Keyed plug</text><text x="399" y="17">Socket</text><text x="48" y="104" text-anchor="middle">← insert</text><text x="390" y="104" text-anchor="middle">insert →</text></g></svg>`;
}

function diagram(){
  return `<svg class="hg-diagram" viewBox="0 0 920 370" role="img" aria-labelledby="hg-diagram-title hg-diagram-desc">
    <title id="hg-diagram-title">One carrier, one multiplexer, four independent haptic modules</title>
    <desc id="hg-diagram-desc">With USB up, carrier J4 at upper right connects to the hub input. Hub I2C0 through I2C3 each connect to one haptic module. Thermal camera stays on lower-right J1. Use the cable buttons below to inspect each route.</desc>
    <text x="24" y="26" class="hg-svg-caption">YOUR BOARD · USB ↑</text>
    <rect x="24" y="43" width="196" height="265" rx="12" class="hg-pcb"/>
    <rect x="92" y="37" width="60" height="23" rx="4" class="hg-socket"/>
    <rect x="84" y="66" width="77" height="101" rx="4" class="hg-chip"/>
    <text x="122" y="113" text-anchor="middle">XIAO</text><text x="122" y="133" text-anchor="middle" class="hg-small">ESP32-S3</text>
    ${Array.from({length:7},(_,n)=>`<rect x="69" y="72" width="7" height="7" transform="translate(0 ${n*13})"/><rect x="170" y="72" width="7" height="7" transform="translate(0 ${n*13})"/>`).join('')}
    <rect x="82" y="189" width="81" height="66" rx="3" class="hg-chip"/><text x="123" y="227" text-anchor="middle" class="hg-small">OLED</text>
    <rect x="15" y="178" width="37" height="28" rx="3" class="hg-socket"/><rect x="15" y="241" width="37" height="28" rx="3" class="hg-socket"/>
    <rect x="193" y="178" width="36" height="28" rx="3" class="hg-socket"/><rect x="193" y="241" width="36" height="28" rx="3" class="hg-socket"/>
    <text x="182" y="174" class="hg-small">J4</text><text x="182" y="238" class="hg-small">J1</text>
    <path d="M229 255 H265 V300 H311" class="hg-fixed-wire"/>
    <rect x="311" y="277" width="104" height="46" rx="5" class="hg-chip"/><text x="363" y="297" text-anchor="middle" class="hg-small">Thermal camera</text><text x="363" y="313" text-anchor="middle" class="hg-tiny">existing cable</text>
    <text x="26" y="340" class="hg-small">XIAO Expansion Board</text>
    <g data-route-picture="up" class="hg-route-picture"><path d="M229 192 H297 Q312 192 312 177 V148 Q312 135 326 135 H370" class="hg-wire"/><path d="M229 192 H297 Q312 192 312 177 V148 Q312 135 326 135 H370" class="hg-wire-hit" data-route="up" role="button" tabindex="0" aria-label="Inspect board to hub cable"/><text x="261" y="113" class="hg-small">4-wire Grove cable</text></g>
    <rect x="379" y="54" width="158" height="211" rx="8" class="hg-pcb"/>
    <rect x="366" y="120" width="35" height="30" rx="3" class="hg-socket"/><text x="408" y="132" class="hg-small">I2C</text><text x="408" y="148" class="hg-tiny">input</text>
    <text x="458" y="26" text-anchor="middle" class="hg-svg-caption">CHANNEL HUB</text><text x="451" y="191" text-anchor="middle" class="hg-small">TCA9548A</text><text x="451" y="210" text-anchor="middle" class="hg-small">0x70</text>
    <text x="438" y="289" class="hg-small">Ports 4–7 unused</text>
    ${[0,1,2,3].map(n=>{const y=64+n*76;return `<g data-route-picture="ch${n}" class="hg-route-picture"><rect x="512" y="${68+n*40}" width="33" height="24" rx="3" class="hg-socket"/><text x="480" y="${84+n*40}" class="hg-tiny">I2C${n}</text><path d="M545 ${80+n*40} C600 ${80+n*40} 608 ${y+24} 666 ${y+24}" class="hg-wire"/><path d="M545 ${80+n*40} C600 ${80+n*40} 608 ${y+24} 666 ${y+24}" class="hg-wire-hit" data-route="ch${n}" role="button" tabindex="0" aria-label="Inspect motor ${n+1} cable"/><rect x="674" y="${y}" width="217" height="52" rx="6" class="hg-pcb"/><rect x="659" y="${y+12}" width="31" height="28" rx="3" class="hg-socket"/><rect x="710" y="${y+15}" width="24" height="24" rx="2" class="hg-chip"/><circle cx="861" cy="${y+26}" r="19" class="hg-motor"/><path d="M734 ${y+22} H843 M734 ${y+29} H843" class="hg-fixed-wire"/><text x="746" y="${y+20}" class="hg-small">Motor ${n+1}</text><text x="746" y="${y+39}" class="hg-tiny">DRV2605L · 0x5A</text></g>`;}).join('')}
    <text x="674" y="26" class="hg-svg-caption">4 COMPLETE MODULES</text>
    <text x="674" y="361" class="hg-small">Motor + driver + socket on each PCB</text>
  </svg>`;
}

function sourcing(){
 return `<div class="hg-shop-grid">
 <article class="hg-shop-card"><span class="hg-eyebrow">ORIGINAL MANUFACTURER</span><h3>Seeed Studio</h3><div class="hg-price">${money(4*sources.motor.price+sources.hub.price+sources.cables.price)} <small>parts + cable pack</small></div><ul><li>4 × haptic module · ${money(sources.motor.price)} each · In stock*</li><li>1 × channel hub · ${money(sources.hub.price)} · In stock</li><li>5 × 5 cm Grove cables · ${money(sources.cables.price)} per pack</li></ul><p>Best verified price for the original parts. Cable stock was not displayed; measure the routes before choosing 5 cm.</p><div class="hg-shop-links">${link(sources.motor.url,'Motor · 105020011')}${link(sources.hub.url,'Hub · 103020293')}${link(sources.cables.url,'5 cm cables · 110990036')}</div><small>*Stock flag shown; availability of four units not separately confirmed. Shipping, tax and duties extra.</small></article>
 <article class="hg-shop-card"><span class="hg-eyebrow">MARKETPLACE EQUIVALENTS</span><h3>Amazon</h3><div class="hg-price">${money(4*sources.amazonMotor.price+sources.amazonHub.price)} <small>4 modules + hub</small></div><ul><li>NGW haptic module · ${money(sources.amazonMotor.price)} each · 9 left</li><li>NGW channel hub · ${money(sources.amazonHub.price)} · 17 left</li><li>Observed delivery: December 2</li></ul><p>Photos and description match the Grove design, but these are NGW listings, not confirmed Seeed SKU stock. Verify the exact part with the seller.</p><div class="hg-shop-links">${link(sources.amazonMotor.url,'Amazon motor listing')}${link(sources.amazonHub.url,'Amazon hub listing')}</div><small>Hub lists one cable; motor listing does not. You still need five cables total. Prices before tax.</small></article>
 <article class="hg-shop-card"><span class="hg-eyebrow">LOCAL PICKUP</span><h3>Micro Center Cambridge</h3><div class="hg-price hg-price-status">No matching set verified</div><p>No exact integrated Grove haptic module was found in the store search. The Adafruit DRV2605L controller was ${money(sources.microcenter.price)} and sold out with Cambridge selected.</p><p>That Adafruit product is a driver-only breakout; it does not include an attached motor or the Grove plug-in connection.</p><div class="hg-shop-links">${link(sources.microcenter.url,'View driver-only listing')}</div><small>This is not a substitute for the complete solder-free module.</small></article>
 </div><p class="hg-footnote">Checked ${sources.checked}. These are recorded observations, not live stock. Recheck the linked listings before ordering. Reuse your intact Grove cables if their length and pinout match; do not assume a cable is bundled with every Seeed module.</p>`;
}

export function hapticGuideHtml(){
 return `<section id="haptic-guide" class="hg"><div class="hg-intro"><div><span class="hg-eyebrow">FOUR MOTORS. FOUR INDEPENDENT EFFECTS.</span><h2>Plug in the whole module.</h2><p>Each Seeed Grove Haptic Motor includes its coin motor, DRV2605L driver and white Grove socket. The motor leads are already attached.</p></div><img src="${ref('grove-haptic.jpg')}" alt="Seeed Grove Haptic Motor with a white Grove socket, driver chip and attached coin motor"></div>
 <div class="hg-tabs" role="tablist" aria-label="Haptic guide"><button role="tab" id="hg-wiring-tab" aria-controls="hg-wiring" aria-selected="true" data-hg-tab="wiring">How it plugs in</button><button role="tab" id="hg-shopping-tab" aria-controls="hg-shopping" aria-selected="false" tabindex="-1" data-hg-tab="shopping">Where to buy</button></div>
 <div id="hg-wiring" role="tabpanel" aria-labelledby="hg-wiring-tab"><div class="hg-map-heading"><h3>One socket on your board → four motors</h3><span>Reference plan · click a cable</span></div><div class="hg-diagram-scroll">${diagram()}</div><div class="hg-route-buttons" aria-label="Choose a cable">${routes.map(r=>`<button data-route="${r.id}" aria-pressed="false">${r.name}</button>`).join('')}</div>
 <div class="hg-detail" id="hg-route-detail" aria-live="polite"></div>
 <div class="hg-bottom-grid"><details class="hg-disclosure"><summary>Why the extra hub?</summary><img class="hg-hub-photo" src="${ref('grove-haptic-hub.jpg')}" alt="Seeed TCA9548A Grove multiplexer with one I2C input and eight labeled channel sockets"><p>Every motor uses address <strong>0x5A</strong>. The TCA9548A hub at <strong>0x70</strong> separates them onto individual channels. An ordinary passive splitter does not do this.</p><p>Firmware selects one channel, sends that motor an effect at 100 kHz, then disables the haptic branches before returning the camera bus to 400 kHz. This guide does not install that firmware. Previously started effects can keep playing; selecting one channel does not limit power draw.</p></details><details class="hg-disclosure"><summary>Where do these fit?</summary><p>The modules are larger than bare coins: each reserves 42 × 24 × 10 mm, around a nominal 40 × 20 mm PCB. The hub reserves 82 × 22 × 10 mm. Heights and cable clearance still need measurement.</p><p>Add the set below to position the existing Blender models. The hub starts outside the current enclosure so its fit problem is visible. Move it and inspect the assembly checks.</p></details></div>
 <p class="hg-power"><strong>Power still needs review.</strong> Four modules have a combined manufacturer maximum of 3 W (about 0.91 A at 3.3 V), before the board, camera or screen. The carrier’s supply capacity is unverified. The hub switches data, not motor power; this connector plan is not approval to power all four.</p>
 </div><div id="hg-shopping" role="tabpanel" aria-labelledby="hg-shopping-tab" hidden>${sourcing()}</div>
 <footer class="hg-footer"><div><strong>4 modules + 1 hub + 5 Grove cables</strong><small>Supply capacity and enclosure fit still need review. No screen is selected by this guide.</small></div><button class="button primary" id="hg-add">Add set & map 5 cables</button></footer>
 <details class="hg-sources"><summary>Sources & what this diagram represents</summary><p>This is the reference preset, not your edited wiring. Cable inspectors show your live mapping. Connector drawings are schematic, not physical pin orientation or scale. Align the keyed Grove housings and verify continuity; do not use a battery JST-PH lead or bare Dupont pins in these sockets.</p><p>${link('https://wiki.seeedstudio.com/Grove-Haptic_Motor/','Haptic module specification')} · ${link('https://wiki.seeedstudio.com/Grove-8-Channel-I2C-Multiplexer-I2C-Hub-TCA9548A/','Multiplexer documentation')} · ${link('https://wiki.seeedstudio.com/Seeeduino-XIAO-Expansion-Board/','Carrier documentation')}</p><p>Carrier socket positions and 3.3 V nets follow Seeed Eagle v1.0 200824. Check your actual revision. Photos © Seeed Studio; original source URLs and hashes are bundled alongside the images.</p></details></section>`;
}

export function mountHapticGuide(root,{onAdd,initialRoute='up'}={}){
 let selected=routes.some(r=>r.id===initialRoute)?initialRoute:'up';
 function chooseRoute(id){
  selected=id;const r=routes.find(r=>r.id===id);
  root.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===id)));
  root.querySelectorAll('[data-route-picture]').forEach(g=>g.classList.toggle('selected',g.dataset.routePicture===id));
  root.querySelector('#hg-route-detail').innerHTML=`<div class="hg-detail-copy"><span class="hg-eyebrow">${id==='up'?'CABLE 1 OF 5':`CABLE ${Number(id.slice(2))+2} OF 5`}</span><h3>${r.fromLabel} → ${r.toLabel}</h3><p>${r.description}</p><p><strong>One standard 4-pin Grove–Grove cable.</strong> Keyed plug at both ends; no crimping, soldering or male-to-female adapters.</p></div><div class="hg-pinout">${cableCloseup()}<table><caption>Same function at both ends · not a front-view pin drawing</caption><thead><tr><th>Contact</th><th>Wire</th><th>Signal</th><th>XIAO / carrier net</th></tr></thead><tbody>${signals.map(s=>`<tr><td>${s.pin}</td><td>${s.color}</td><td>${s.label}</td><td>${s.xiao}</td></tr>`).join('')}</tbody></table></div>`;
 }
 const controller=new AbortController();const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
 root.querySelectorAll('[data-route]').forEach(el=>{listen(el,'click',()=>chooseRoute(el.dataset.route));if(el.tagName.toLowerCase()==='path')listen(el,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRoute(el.dataset.route);}});});
 const tabs=[...root.querySelectorAll('[data-hg-tab]')];
 function chooseTab(tab){tabs.forEach(b=>{const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;root.querySelector('#hg-'+b.dataset.hgTab).hidden=!active;});}
 tabs.forEach((b,n)=>{listen(b,'click',()=>chooseTab(b));listen(b,'keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(n+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];chooseTab(next);next.focus();}});});
 listen(root.querySelector('#hg-add'),'click',()=>onAdd?.());chooseRoute(selected);
 return ()=>controller.abort();
}
