import { handleNodeRequest } from '../server/research.mjs';
import { runAsset } from '../server/assets.mjs';
export const config={maxDuration:60};
export default (req,res)=>handleNodeRequest(req,res,runAsset);
