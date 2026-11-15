import { createServer } from 'vite';
import { handleNodeRequest } from './research.mjs';
import { runAdjustment } from './adjust.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:Number(process.env.PORT||5179),strictPort:true},plugins:[{name:'phygital-local-api',configureServer(vite){vite.middlewares.use('/api/research',(req,res)=>handleNodeRequest(req,res));vite.middlewares.use('/api/adjust',(req,res)=>handleNodeRequest(req,res,runAdjustment));}}]});
await server.listen();server.printUrls();
