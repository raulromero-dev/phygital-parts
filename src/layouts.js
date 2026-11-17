import { validateState, envelope, checks } from './engine.js';

export const MAX_LAYOUTS=8;
// Each branch is a complete assembly, never another collection of branches.
export function layoutDocument(state){
 const {layouts,...document}=state;
 return validateState(document);
}
export function layoutChoices(state){
 return state.layouts?.variants.map(v=>({...v,document:v.id===state.layouts.activeId?layoutDocument(state):v.document}))||[];
}
export function addLayouts(state,variants,{originalName='Original'}={}){
 if(!Array.isArray(variants)||!variants.length||variants.length>4)throw Error('Create one to four layouts at a time.');
 const next=validateState(state),base=layoutDocument(next);
 const group=next.layouts||{activeId:'layout-'+crypto.randomUUID(),variants:[]};
 if(!group.variants.length)group.variants.push({id:group.activeId,name:originalName,description:'',document:base});
 if(group.variants.length+variants.length>MAX_LAYOUTS)throw Error('This project can hold up to eight layouts.');
 for(const variant of variants)group.variants.push({id:'layout-'+crypto.randomUUID(),name:variant.name,description:variant.description||'',document:layoutDocument(variant.document)});
 next.layouts=group;
 return validateState(next);
}
export function switchLayout(state,id){
 const current=validateState(state),variant=current.layouts?.variants.find(v=>v.id===id);
 if(!variant)throw Error('This layout is no longer available.');
 // Validation synchronized the outgoing branch first; editing a sibling can
 // never alter it. Project name stays shared; parts, cables and notes do not.
 return validateState({...variant.document,name:current.name,layouts:{...current.layouts,activeId:id}});
}
export function renameLayout(state,id,name){
 const next=validateState(state),variant=next.layouts?.variants.find(v=>v.id===id);
 if(!variant)throw Error('This layout is no longer available.');
 variant.name=name.trim();return validateState(next);
}
export function removeLayout(state,id){
 let next=validateState(state);
 if(!next.layouts?.variants.some(v=>v.id===id)||next.layouts.variants.length<2)throw Error('Keep at least one layout.');
 if(next.layouts.activeId===id)next=switchLayout(next,next.layouts.variants.find(v=>v.id!==id).id);
 next.layouts.variants=next.layouts.variants.filter(v=>v.id!==id);
 return validateState(next);
}
export function layoutSummary(document){
 const [width,height,length]=envelope(document);
 return {dimensions:`${length} × ${width} × ${height} mm`,parts:document.instances.length,warnings:checks(document).filter(c=>c.level!=='ok').length};
}
