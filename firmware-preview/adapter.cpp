// Host the original renderer and synthetic sensor fixtures; no ESP32 emulation.
#define main original_scene_main
#include "vendor/phygital/tools/tft_sim/sim.cpp"
#undef main
#include "scenes.generated.h"

static void applyLine(const char *p) {
 char key[32]; int k=0; while(p[k] && p[k]!=' ' && k<31){key[k]=p[k];k++;}key[k]=0;
 const char *arg=p+k; while(*arg==' ')arg++;
 if(!strcmp(key,"page"))page=constrain(atoi(arg),0,3);
 else if(!strcmp(key,"frame"))syntheticFrame(!strcmp(arg,"warm"));
 else if(!strcmp(key,"host")){int lv,x,y;float dc;if(sscanf(arg,"%d %d %d %f",&lv,&x,&y,&dc)==4)host=HostDet{true,lv>=2,false,x,y,dc,simNow,lv};}
 else if(!strcmp(key,"cand")){char r;int rssi,w;char name[64]="";if(sscanf(arg,"%c %d %d %63[^\n]",&r,&rssi,&w,name)>=3&&candCount<MAX_CAND)cand(candCount++,name,r,rssi,w);}
 else if(!strcmp(key,"target")){if(!strcmp(arg,"none")){target.has=false;target.mode=TM_NONE;}else{int i=atoi(arg);if(i>=0&&i<candCount)setTarget(cands[i].mac,cands[i].name,TM_FIXED,i);}}
 else if(!strcmp(key,"rssi"))simRssi=atof(arg);
 else if(!strcmp(key,"seen"))simSeen=atoi(arg);
 else if(!strcmp(key,"tag")){int kind,st,rssi;if(sscanf(arg,"%d %d %d",&kind,&st,&rssi)==3&&simTagN<SHOW_TAG)tagRow(simTagN++,kind,st,rssi);}
 else if(!strcmp(key,"alert")){if(!strcmp(arg,"wifi"))wifiAlert=true;else if(!strcmp(arg,"tag"))tagAlert=true;else wifiAlert=tagAlert=false;}
 else if(!strcmp(key,"app"))phoneConnected=atoi(arg);
 else if(!strcmp(key,"sound"))soundOn=atoi(arg);
 else if(!strcmp(key,"toast")){static char t[64];snprintf(t,sizeof(t),"%s",arg);showToast(t);}
 else if(!strcmp(key,"devices"))devTotal=atoi(arg);
}

extern "C" {
 int sim_width(){return SIM_W;}
 int sim_height(){return SIM_H;}
 double sim_get_input(int id){return id==0?simRssi:id==1?phoneConnected:id==2?soundOn:id==3?heatRule.lead:0;}
 uintptr_t sim_frame(){return reinterpret_cast<uintptr_t>(simPanel);}
 void sim_init(){tftSetup();resetScene();renderAll();push(0,0,TW,TH);}
 void sim_scene(int index){
  if(index<0||index>=SCENE_COUNT)return;
  simNow=5000;resetScene();thermalOk=true;simW=true;simB=false;nextTarget=false;
  char text[8192];snprintf(text,sizeof(text),"%s",SCENES[index]);
  for(char *p=strtok(text,"\n");p;p=strtok(NULL,"\n"))applyLine(p);
  renderAll();push(0,0,TW,TH);
 }
 void sim_step(int ms){
  simNow+=constrain(ms,0,1000);
  if(nextTarget&&candCount){int i=0;while(i<candCount&&memcmp(cands[i].mac,target.mac,6))i++;i=(i+1)%candCount;setTarget(cands[i].mac,cands[i].name,TM_FIXED,i);nextTarget=false;}
  renderAll();push(0,0,TW,TH);
 }
 void sim_tap(int x,int y){if(x>=0&&x<TW&&y>=0&&y<TH)tftTap(x,y);sim_step(0);}
 void sim_input(int id,double value){
  if(id==0)simRssi=constrain(value,-95,-25);
  if(id==1)phoneConnected=value!=0;
  if(id==2)soundOn=value!=0;
  if(id==3)syntheticFrame(value!=0);
  sim_step(0);
 }
}
