// A second, independent framebuffer adapter for an arbitrary 128x64 display.
// Replace draw() with your actual screen-rendering code and simulated inputs.
#include <stdint.h>
static uint16_t pixels[128*64];
static int level=30, active=0;
static void draw(void){
 for(int y=0;y<64;y++)for(int x=0;x<128;x++){
  uint16_t c=0x0841;
  if(x>7&&x<120&&y>7&&y<56)c=0x18e3;
  if(x>15&&x<16+level&&y>38&&y<47)c=active?0x07e0:0xeec0;
  if(x>16&&x<30&&y>16&&y<30)c=active?0x07e0:0xffff;
  pixels[y*128+x]=c;
 }
}
int sim_width(void){return 128;}
int sim_height(void){return 64;}
uintptr_t sim_frame(void){return (uintptr_t)pixels;}
void sim_init(void){draw();}
void sim_scene(int scene){active=scene==1;level=active?80:30;draw();}
void sim_step(int ms){(void)ms;}
void sim_tap(int x,int y){(void)x;(void)y;active=!active;draw();}
void sim_input(int id,double value){if(id==0)level=(int)value;draw();}
