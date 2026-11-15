import { escapeHtml } from './product-data.js';
import './loading.css';
// Actual action text only; no simulated progress or decorative loading scene.
export function loadingIndicator(label, compact = false) {
 return `<div class="loading-action${compact?' loading-action--compact':''}" role="status"><span class="loading-label">${escapeHtml(label)}</span></div>`;
}
