import { handleNodeRequest } from '../server/research.mjs';
import { runAdjustment } from '../server/adjust.mjs';
export const config={maxDuration:300};
export default (req,res)=>handleNodeRequest(req,res,runAdjustment);
