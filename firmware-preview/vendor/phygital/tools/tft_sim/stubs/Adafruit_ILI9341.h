// The panel, emulated: whatever tft_ui.h pushes through setAddrWindow + writePixels lands in
// simPanel exactly as the ILI9341 would store it, so the PNG shows what the glass shows.
#pragma once
#include <stdint.h>
#include <string.h>

const int SIM_W = 240, SIM_H = 320;
extern uint16_t simPanel[SIM_W * SIM_H];

class Adafruit_ILI9341 {
 public:
  Adafruit_ILI9341(int8_t, int8_t, int8_t = -1) {}
  Adafruit_ILI9341(int8_t, int8_t, int8_t, int8_t, int8_t = -1, int8_t = -1) {}
  void begin(uint32_t = 0) { memset(simPanel, 0, sizeof(simPanel)); }
  void setRotation(uint8_t) {}
  void fillScreen(uint16_t c) { for (int i = 0; i < SIM_W * SIM_H; i++) simPanel[i] = c; }
  void startWrite() {}
  void endWrite() {}
  void setAddrWindow(uint16_t x, uint16_t y, uint16_t w, uint16_t h) { wx = x; wy = y; ww = w; wh = h; cx = 0; cy = 0; }
  void writePixels(uint16_t *p, uint32_t n, bool = true, bool = false) {
    for (uint32_t i = 0; i < n; i++) {
      int x = wx + cx, y = wy + cy;
      if (x < SIM_W && y < SIM_H) simPanel[y * SIM_W + x] = p[i];
      if (++cx >= ww) { cx = 0; cy++; }
    }
  }
  void sendCommand(uint8_t, const uint8_t * = NULL, uint8_t = 0) {}
  void setSPISpeed(uint32_t) {}
  void invertDisplay(bool) {}
 private:
  int wx = 0, wy = 0, ww = SIM_W, wh = SIM_H, cx = 0, cy = 0;
};
