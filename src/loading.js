import { escapeHtml } from './product-data.js';
import './loading.css';

// A tiny spacecraft escapes a four-conductor cable. Decorative motion stays
// separate from the readable status, including when reduced motion is enabled.
export function loadingIndicator(label, compact = false) {
 return `<div class="cable-escape${compact ? ' cable-escape--compact' : ''}" role="status">
 <svg class="cable-escape-scene" viewBox="0 0 240 100" fill="none" aria-hidden="true" focusable="false">
  <g class="escape-stars" stroke="currentColor" stroke-linecap="round" opacity=".18">
   <path d="M26 20h4m58 64h5m65-67h3m52 64h5M139 75h3M60 52h4"/>
  </g>
  <g class="escape-cable">
   <g stroke="currentColor" stroke-width="1.7" opacity=".45">
    <path d="M-18 26C20 26 26 66 55 66S67 35 88 35"/>
    <path d="M-18 32C18 32 23 72 54 72S67 42 88 42"/>
    <path d="M-18 38C16 38 20 78 53 78S67 49 88 49"/>
    <path d="M-18 44C14 44 17 84 52 84S67 56 88 56"/>
   </g>
   <rect x="86" y="29" width="26" height="33" rx="5" fill="var(--mono-paper)" stroke="currentColor" stroke-width="1.7"/>
   <path d="M91 34v23m4-20h9m-9 7h9m-9 7h9" stroke="currentColor" stroke-width="1.2" opacity=".4"/>
   <g stroke="var(--escape-pin)" stroke-width="2.8" stroke-linecap="round">
    <path d="M112 35h9M112 42h9M112 49h9M112 56h9"/>
   </g>
  </g>
  <g class="escape-ship">
   <g class="escape-thrust" stroke="var(--escape-accent)" stroke-width="2" stroke-linecap="round">
    <path d="M154 44h-12m12 6h-18m18 6h-12"/>
   </g>
   <path d="m162 39-8-12 20 8m-12 26-8 12 20-8" fill="var(--mono-raised)" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
   <path d="M158 38c18-9 31-4 44 12-13 16-26 21-44 12l4-12-4-12Z" fill="var(--mono-paper)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M163 39v22" stroke="currentColor" stroke-width="1.4"/>
   <circle cx="181" cy="50" r="5.5" fill="var(--escape-accent)" fill-opacity=".2" stroke="var(--escape-accent)" stroke-width="1.7"/>
  </g>
 </svg><span class="cable-escape-label">${escapeHtml(label)}</span></div>`;
}
