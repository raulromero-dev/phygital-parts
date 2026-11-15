import { handleNodeRequest } from '../server/research.mjs';
import { runModel } from '../server/model.mjs';
export const config={maxDuration:300};
export default (req,res)=>handleNodeRequest(req,res,runModel);
