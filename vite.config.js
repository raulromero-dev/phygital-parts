import { defineConfig } from 'vite';
// Keep the rendering engine cached separately from the changing catalogue/UI.
export default defineConfig({build:{rollupOptions:{output:{manualChunks(id){
 if(id.includes('/node_modules/three/'))return 'three';
 if(id.includes('/node_modules/lucide/'))return 'icons';
}}}}});
