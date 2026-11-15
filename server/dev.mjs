import { createServer } from 'vite';
import { handleNodeRequest } from './research.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:Number(process.env.PORT||5179),strictPort:true},plugins:[{name:'phygital-local-api',configureServer(vite){vite.middlewares.use('/api/research',(req,res)=>handleNodeRequest(req,res));}}]});
await server.listen();server.printUrls();
