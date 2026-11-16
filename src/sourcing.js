import { modelUrl } from './model-data.js';
import { escapeHtml as esc } from './product-data.js';

const bounded=(s,n)=>typeof s==='string'&&s.length<=n;
export const calendarDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function browsingContext(){return {timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone};}
// Shared allowlist for API results and private chat history. No provider payloads.
export function cleanSourcing(value){
 if(value==null)return null;
 if(!bounded(value.location,120)||!(value.deadline===null||calendarDate(value.deadline))||!bounded(value.notes,1200)||!Array.isArray(value.offers)||value.offers.length>5)throw Error('Invalid shopping results.');
 const offers=value.offers.map(o=>{
  if(!o||!bounded(o.name,160)||!o.name.trim()||!bounded(o.sku,100)||!bounded(o.retailer,100)||!bounded(o.price,80)||!bounded(o.location,120)||!bounded(o.evidence,500)||!bounded(o.compatibility,900)||!['exact','alternative'].includes(o.match)||!['in_stock','out_of_stock','unknown'].includes(o.stock)||!['delivery','pickup','unknown'].includes(o.fulfillment)||!(o.availableBy===null||calendarDate(o.availableBy))||!bounded(o.url,2000)||!modelUrl(o.url))throw Error('Invalid retailer offer.');
  const evidenceUrl=bounded(o.evidenceUrl,2000)?modelUrl(o.evidenceUrl):null;
  return {name:o.name,sku:o.sku,retailer:o.retailer,url:modelUrl(o.url),price:o.price,match:o.match,location:o.location,evidence:o.evidence,compatibility:o.compatibility,stock:evidenceUrl&&o.evidence?o.stock:'unknown',fulfillment:o.fulfillment,availableBy:evidenceUrl&&o.evidence&&o.location&&o.stock==='in_stock'&&o.fulfillment!=='unknown'?o.availableBy:null,evidenceUrl};
 });
 const checkedAt=typeof value.checkedAt==='string'&&Number.isFinite(Date.parse(value.checkedAt))?new Date(value.checkedAt).toISOString():null;
 return {location:value.location,deadline:value.deadline,notes:value.notes,offers,checkedAt};
}
export function offerTiming(offer,report,now=Date.now()){
 const stale=!report.checkedAt||now-Date.parse(report.checkedAt)>86400000||Date.parse(report.checkedAt)>now+60000;
 if(stale)return 'Recheck availability';
 if(offer.stock==='out_of_stock')return 'Sold out';
 if(!offer.availableBy)return offer.stock==='in_stock'?'In stock · timing unverified':'Availability unverified';
 if(report.deadline&&offer.availableBy>report.deadline)return 'After your deadline';
 return (offer.fulfillment==='pickup'?'Pickup':'Delivery')+' by '+offer.availableBy;
}
export function sourcingHtml(value,{review=false,messageId='',now=Date.now()}={}){
 const report=cleanSourcing(value);if(!report)return '';
 return '<section class="sourcing-results" aria-label="Shopping results"><div class="sourcing-context">'+esc([report.location,report.deadline?'Need by '+report.deadline:''].filter(Boolean).join(' · '))+'</div>'+report.offers.map((o,i)=>
  '<article class="sourcing-card"><small>'+esc(o.retailer)+' · '+(o.match==='exact'?'Exact part':'Alternative')+'</small><strong>'+esc(o.name)+'</strong><div class="sourcing-price">'+esc(o.price||'Check price')+'<span>'+esc(offerTiming(o,report,now))+'</span></div><a class="button sourcing-buy" href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">View at '+esc(o.retailer)+' ↗</a><details><summary>Fit & availability</summary><p>'+esc(o.compatibility)+'</p><p>'+esc([o.location,o.evidence].filter(Boolean).join(' · '))+'</p>'+(o.evidenceUrl?'<a href="'+esc(o.evidenceUrl)+'" target="_blank" rel="noopener noreferrer">Availability source ↗</a>':'')+(o.sku?'<small>'+esc(o.sku)+'</small>':'')+'</details>'+(review?'<button class="text-button sourcing-review" data-review-offer="'+i+'" data-message="'+esc(messageId)+'">Check fit & add…</button>':'')+'</article>').join('')+(report.notes?'<p class="sourcing-notes">'+esc(report.notes)+'</p>':'')+'<small class="sourcing-checked">'+(report.checkedAt?'Checked '+esc(new Date(report.checkedAt).toLocaleString()):'Check time unavailable')+' · Confirm stock and delivery at checkout.</small></section>';
}
