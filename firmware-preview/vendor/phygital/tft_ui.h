// Phygital: the 2.8" touch screen (Haldzemo 240x320 IPS, ILI9341V over SPI,
// FT6336G capacitive touch over I2C), added 2026-11-19. It is the device's main
// standalone screen next to the expansion board's OLED, drawn in the app's
// language (Figma "UI Iteration - Draft v1"): an ember glow top-left fading to
// pale sky, frosted white cards, navy text, ember for anything alarming, risk
// badges, a tab bar, the signal radar. Text is FreeSans (no 6x8 bitmap font),
// sentence case, and as little of it as will do.
//
// Everything is drawn into a full-screen canvas in PSRAM and pushed to the panel
// as finished rectangles, so the user never sees a clear-then-repaint flicker.
// Build with PSRAM=opi in the FQBN (CLAUDE.md); without PSRAM the screen stays off.
//
// Included from Phygital.ino just before setup()/loop(), so every global it
// draws from (page, frame[], host, cands[], target, ...) is already declared.
// Entry points: tftSetup() once Wire is up, tftLoop(newFrame) every loop pass,
// tftCommand() for the TFT,... bench commands.
//
// Wiring (Raul, 2026-11-19), screen header -> XIAO pin on the expansion board:
//   VCC 5V - GND - LCD_CS D0 - LCD_RST D6 - LCD_RS(DC) D9 - SDI D10 - SCK D8 -
//   LED n/c - SDO n/c - CTP_SCL D5 - CTP_RST D7 - CTP_SDA D4 - CTP_INT n/c - SD_CS n/c
// D8/D10 are the hardware SPI pins; D9 (hardware MISO, unused: the panel's
// SDO is not wired) carries DC, so SPI is started without a MISO pin. DC on
// D2 (GPIO3, the expansion board's SD-CS net) never reached the panel on the
// bench (2026-11-19: commands got through, pixel data did not); D9 works.
// The touch chip is polled over I2C (no INT line) and shares the bus with the
// OLED and the thermal camera (0x38 / 0x3C / 0x33).
#pragma once
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include "tft_fonts.h"   // Roboto at 2x, downsampled for anti-aliased text (the app's typeface)

// ---- pins and orientation (change here if the wiring changes)
const int8_t TFT_CS = D0, TFT_DC = D9, TFT_RST = D6;
const int8_t TOUCH_RST = D7;              // CTP_INT is not wired: the touch chip is polled
const uint8_t TOUCH_ADDR = 0x38;
const uint8_t TFT_ROTATION = 0;          // 0 = portrait, header pins at the bottom; 2 flips it
const uint32_t TFT_SPI_HZ = 40000000;    // clean on the bench harness at 40 MHz (2026-11-19); TFT,<hz> retunes live
// Touch coordinates come out in the panel's own orientation; flip here if taps land mirrored.
const bool TOUCH_SWAP_XY = false, TOUCH_FLIP_X = false, TOUCH_FLIP_Y = false;
const char *const TFT_BUILD = __DATE__ " " __TIME__;   // printed at boot: proves which file the board runs

// ---- palette (RGB565 from the app's Theme.kt)
constexpr uint16_t c565(uint8_t r, uint8_t g, uint8_t b) { return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3); }
const uint16_t C_NAVY = c565(0x0E, 0x2A, 0x5A), C_EMBER = c565(0xE8, 0x43, 0x1F), C_CREAM = c565(0xFD, 0xF3, 0xEA);
const uint16_t C_MIST = c565(0xF2, 0xF7, 0xFD), C_SKY = c565(0xDC, 0xEB, 0xFB), C_SLATE = c565(0x5B, 0x6B, 0x85);
const uint16_t C_FAINT = c565(0x8A, 0x97, 0xAD), C_LINE = c565(0xD9, 0xE2, 0xEF), C_WHITE = 0xFFFF, C_BLACK = 0;
const uint16_t C_LEAF = c565(0x2D, 0xA6, 0x6B), C_AMBER = c565(0xC9, 0x8A, 0x1C), C_SKYBLUE = c565(0x2E, 0x7B, 0xE6);
const uint16_t C_PALE_RED = c565(0xFF, 0xE0, 0xD9), C_PALE_BLUE = c565(0xE6, 0xED, 0xF7), C_PALE_AMBER = c565(0xFF, 0xF0, 0xCC);

// ---- layout (portrait, 240 x 320)
const int TW = 240, TH = 320;
const int HDR_H = 56;
const int TAB_Y = 276, TAB_H = TH - TAB_Y;
const char *const TAB_NAMES[] = {"Heat", "Sweep", "Locate", "Trackers"};   // page 0..3 in the app's words
// Fonts are generated at twice the size they appear at (tft_fonts.h); textAt() draws them
// into a 1-bit scratch canvas and averages 2x2 blocks, which gives 4-level anti-aliasing.
// Final sizes: small 7, text 8, bold 9, badge 7, title 11, page 13, big 20 pt.
const GFXfont *const F_SMALL = &Roboto_Regular14pt7b, *const F_TEXT = &Roboto_Regular16pt7b, *const F_BOLD = &Roboto_Medium18pt7b;
const GFXfont *const F_BADGE = &Roboto_Bold14pt7b, *const F_TITLE = &Roboto_Bold22pt7b, *const F_PAGE = &Roboto_Bold26pt7b, *const F_BIG = &Roboto_Bold40pt7b;
const int AA_W = 480, AA_H = 128;        // the 2x scratch canvas: one line of text at up to 24 pt

// ---------------------------------------------------------------- canvas in PSRAM
class Canvas : public GFXcanvas16 {
 public:
  Canvas(uint16_t w, uint16_t h) : GFXcanvas16(w, h, false) {}
  bool alloc() { buffer = (uint16_t *)ps_malloc((size_t)WIDTH * HEIGHT * 2); return buffer != NULL; }   // PSRAM, in tftSetup()
  uint16_t *buf() { return buffer; }
};
Canvas cv(TW, TH);
uint16_t *bgQuiet = NULL, *bgAlert = NULL;   // the gradient pages, rendered once

Adafruit_ILI9341 tftHw(TFT_CS, TFT_DC, TFT_RST);
Adafruit_ILI9341 tftSw(TFT_CS, TFT_DC, MOSI, SCK, TFT_RST, -1);   // TFT,S: bit-banged bus (bench only)
Adafruit_ILI9341 *tftp = &tftHw;
#define tft (*tftp)
bool tftOk = false;
uint16_t heatLut[64];

// ---------------------------------------------------------------- colour helpers
inline void unpack(uint16_t c, int &r, int &g, int &b) { r = (c >> 8) & 0xF8; g = (c >> 3) & 0xFC; b = (c << 3) & 0xF8; }
inline uint16_t mix(uint16_t a, uint16_t b, float t) {
  int ar, ag, ab, br, bg, bb; unpack(a, ar, ag, ab); unpack(b, br, bg, bb);
  return c565(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
inline uint16_t &px(int x, int y) { return cv.buf()[y * TW + x]; }

// The app's Backdrop: vertical cream -> mist -> sky, an ember glow top-left (stronger
// when something was found), a sky glow bottom-right.
void renderBackground(uint16_t *out, bool alert) {
  const float wx = TW * 0.10f, wy = TH * 0.02f, wr = TW * 1.05f, cx = TW * 0.95f, cy = TH * 1.02f, cr = TW * 0.9f;
  const uint16_t peach = c565(0xF6, 0xA7, 0x7B);
  for (int y = 0; y < TH; y++) {
    float t = y / (float)(TH - 1);
    uint16_t base = t < 0.5f ? mix(C_CREAM, C_MIST, t * 2) : mix(C_MIST, C_SKY, (t - 0.5f) * 2);
    for (int x = 0; x < TW; x++) {
      uint16_t c = base;
      float dw = sqrtf((x - wx) * (x - wx) + (y - wy) * (y - wy)) / wr;
      if (dw < 1) {   // ember core fading through peach to nothing
        float a = (1 - dw); a = a * a * (alert ? 0.95f : 0.62f);
        uint16_t glow = dw < 0.45f ? mix(C_EMBER, peach, dw / 0.45f) : peach;
        c = mix(c, glow, a);
      }
      float dc = sqrtf((x - cx) * (x - cx) + (y - cy) * (y - cy)) / cr;
      if (dc < 1) c = mix(c, C_SKYBLUE, (1 - dc) * (1 - dc) * 0.38f);
      out[y * TW + x] = c;
    }
  }
}

// Frosted card: 85 % white over whatever is behind it, rounded corners
void glass(int x, int y, int w, int h, int r = 14, float a = 0.85f, uint16_t tint = C_WHITE) {
  for (int j = 0; j < h; j++)
    for (int i = 0; i < w; i++) {
      int dx = i < r ? r - i : i >= w - r ? i - (w - r - 1) : 0;
      int dy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0;
      if (dx && dy && dx * dx + dy * dy > r * r) continue;
      uint16_t &p = px(x + i, y + j);
      p = mix(p, tint, a);
    }
}

// ---- text: anti-aliased. y is the baseline in screen pixels. Long strings are cut with "..." to a width.
GFXcanvas1 *aa = NULL;
void textAt(int x, int y, const char *s, const GFXfont *f, uint16_t color) {
  if (!aa || !*s) return;
  int16_t bx, by; uint16_t bw, bh;
  aa->setFont(f); aa->setTextSize(1); aa->setTextWrap(false);
  aa->getTextBounds(s, 0, 0, &bx, &by, &bw, &bh);
  if (bw == 0 || bh == 0) return;
  int cx = 2 - bx, cy = 2 - by;                       // cursor that puts the ink box at (2, 2)
  if (cx & 1) cx++;
  if (cy & 1) cy++;                                   // even, so 2x2 blocks line up with screen pixels
  int W2 = min(cx + bx + (int)bw + 2, AA_W), H2 = min(cy + by + (int)bh + 2, AA_H);
  uint8_t *buf = aa->getBuffer();
  const int stride = (AA_W + 7) / 8;
  memset(buf, 0, (size_t)stride * H2);
  aa->setCursor(cx, cy); aa->setTextColor(1); aa->print(s);
  for (int py = 0; py + 1 < H2; py += 2) {
    int sy = y + (py - cy) / 2;
    if (sy < 0 || sy >= TH) continue;
    const uint8_t *r0 = buf + py * stride, *r1 = r0 + stride;
    for (int px2 = 0; px2 + 1 < W2; px2 += 2) {
      int sx = x + (px2 - cx) / 2;
      if (sx < 0 || sx >= TW) continue;
      uint8_t m0 = 0x80 >> (px2 & 7), m1 = m0 >> 1;
      int i = px2 >> 3;
      int n = ((r0[i] & m0) != 0) + ((r0[i] & m1) != 0) + ((r1[i] & m0) != 0) + ((r1[i] & m1) != 0);
      if (!n) continue;
      uint16_t &p = px(sx, sy);
      p = n == 4 ? color : mix(p, color, n * 0.25f);
    }
  }
}
int textW(const char *s, const GFXfont *f) {
  if (!aa) return 0;
  int16_t x, y; uint16_t w, h;
  aa->setFont(f); aa->setTextSize(1); aa->getTextBounds(s, 0, 0, &x, &y, &w, &h);
  return (w + 1) / 2;
}
void textFit(int x, int y, const char *s, const GFXfont *f, uint16_t color, int maxW) {
  char buf[40];
  snprintf(buf, sizeof(buf), "%s", s);
  int n = strlen(buf);
  while (n > 1 && textW(buf, f) > maxW) { buf[--n] = 0; if (n > 3) { buf[n - 1] = '.'; buf[n - 2] = '.'; buf[n - 3] = '.'; } }
  textAt(x, y, buf, f, color);
}
void textRight(int xRight, int y, const char *s, const GFXfont *f, uint16_t color) { textAt(xRight - textW(s, f), y, s, f, color); }
void textCenter(int cx, int y, const char *s, const GFXfont *f, uint16_t color) { textAt(cx - textW(s, f) / 2, y, s, f, color); }

void pill(int x, int y, int w, int h, uint16_t fill, uint16_t edge = 0xFFFF) {
  cv.fillRoundRect(x, y, w, h, h / 2, fill);
  if (edge != 0xFFFF) cv.drawRoundRect(x, y, w, h, h / 2, edge);
}
// High / Med / Low badge for a rule weight (same bands as the app's riskOf)
void badge(int xRight, int y, uint8_t weight) {
  const char *t = weight >= 70 ? "High" : weight >= 50 ? "Med" : "Low";
  uint16_t fg = weight >= 70 ? C_EMBER : weight >= 50 ? C_AMBER : C_SLATE;
  uint16_t bg = weight >= 70 ? C_PALE_RED : weight >= 50 ? C_PALE_AMBER : C_PALE_BLUE;
  int w = textW(t, F_BADGE) + 18;
  pill(xRight - w, y, w, 22, bg);
  textAt(xRight - w + 9, y + 15, t, F_BADGE, fg);
}

// ---- icons: drawn at 2x into the scratch canvas and downsampled, like the text (Lucide-like)
template <typename F>
void aaDraw(int x, int y, int w, int h, uint16_t color, F draw) {
  if (!aa) return;
  int W2 = min(2 * w, AA_W), H2 = min(2 * h, AA_H);
  uint8_t *buf = aa->getBuffer();
  const int stride = (AA_W + 7) / 8;
  memset(buf, 0, (size_t)stride * H2);
  draw(*aa);
  for (int py = 0; py + 1 < H2; py += 2) {
    int sy = y + py / 2;
    if (sy < 0 || sy >= TH) continue;
    const uint8_t *r0 = buf + py * stride, *r1 = r0 + stride;
    for (int px2 = 0; px2 + 1 < W2; px2 += 2) {
      int sx = x + px2 / 2;
      if (sx < 0 || sx >= TW) continue;
      uint8_t m0 = 0x80 >> (px2 & 7), m1 = m0 >> 1;
      int i = px2 >> 3;
      int n = ((r0[i] & m0) != 0) + ((r0[i] & m1) != 0) + ((r1[i] & m0) != 0) + ((r1[i] & m1) != 0);
      if (!n) continue;
      uint16_t &p = px(sx, sy);
      p = n == 4 ? color : mix(p, color, n * 0.25f);
    }
  }
}
// a 2x-space line about 1.5 px thick after downsampling
static void thick(GFXcanvas1 &g, int x0, int y0, int x1, int y1) { g.drawLine(x0, y0, x1, y1, 1); g.drawLine(x0 + 1, y0, x1 + 1, y1, 1); g.drawLine(x0, y0 + 1, x1, y1 + 1, 1); }
static void ring2(GFXcanvas1 &g, int cx, int cy, int r) { g.drawCircle(cx, cy, r, 1); g.drawCircle(cx, cy, r - 1, 1); }

void icoPhone(int x, int y, uint16_t c) {   // 10 x 16
  aaDraw(x, y, 10, 16, c, [](GFXcanvas1 &g) { g.drawRoundRect(0, 0, 20, 32, 6, 1); g.drawRoundRect(1, 1, 18, 30, 5, 1); g.fillRect(7, 26, 6, 2, 1); });
}
void icoSound(int x, int y, bool on, uint16_t c) {   // 20 x 16
  if (on) aaDraw(x, y, 20, 16, c, [](GFXcanvas1 &g) {
    g.fillRect(0, 10, 8, 12, 1); g.fillTriangle(8, 10, 18, 2, 18, 30, 1);
    for (int r = 8; r <= 9; r++) g.drawCircleHelper(20, 16, r, 0x6, 1);
    for (int r = 14; r <= 15; r++) g.drawCircleHelper(20, 16, r, 0x6, 1);
  });
  else {
    aaDraw(x, y, 20, 16, c, [](GFXcanvas1 &g) { g.fillRect(0, 10, 8, 12, 1); g.fillTriangle(8, 10, 18, 2, 18, 30, 1); });
    aaDraw(x, y, 20, 16, C_EMBER, [](GFXcanvas1 &g) { thick(g, 24, 4, 36, 28); });
  }
}
void icoThermo(int x, int y, uint16_t c) {   // 16 x 18
  aaDraw(x, y, 16, 18, c, [](GFXcanvas1 &g) { g.fillRoundRect(10, 0, 12, 22, 6, 1); g.fillCircle(16, 27, 8, 1); g.fillRect(14, 8, 4, 14, 0); g.fillCircle(16, 27, 4, 1); });
}
void icoRadar(int x, int y, uint16_t c) {    // 17 x 17
  aaDraw(x, y, 17, 17, c, [](GFXcanvas1 &g) { ring2(g, 17, 17, 16); ring2(g, 17, 17, 7); thick(g, 17, 17, 29, 5); g.fillCircle(17, 17, 2, 1); });
}
void icoLocate(int x, int y, uint16_t c) {   // 17 x 17
  aaDraw(x, y, 17, 17, c, [](GFXcanvas1 &g) { ring2(g, 17, 17, 12); g.fillCircle(17, 17, 3, 1); thick(g, 17, 0, 17, 6); thick(g, 17, 28, 17, 34); thick(g, 0, 17, 6, 17); thick(g, 28, 17, 34, 17); });
}
void icoBt(int x, int y, uint16_t c) {       // 16 x 17
  aaDraw(x, y, 16, 17, c, [](GFXcanvas1 &g) { thick(g, 16, 0, 16, 33); thick(g, 16, 0, 26, 8); thick(g, 26, 8, 6, 25); thick(g, 16, 33, 26, 25); thick(g, 26, 25, 6, 8); });
}
void icoWifi(int x, int y, uint16_t c) {     // 16 x 16
  aaDraw(x, y, 16, 16, c, [](GFXcanvas1 &g) {
    for (int r = 17; r <= 18; r++) g.drawCircleHelper(16, 26, r, 0x3, 1);
    for (int r = 10; r <= 11; r++) g.drawCircleHelper(16, 26, r, 0x3, 1);
    g.fillCircle(16, 26, 3, 1);
  });
}
void chevron(int x, int y, uint16_t c) {     // 6 x 9
  aaDraw(x, y, 6, 9, c, [](GFXcanvas1 &g) { thick(g, 1, 1, 9, 9); thick(g, 9, 9, 1, 17); });
}
void iconCircle(int cx, int cy, uint16_t bg, char kind, uint16_t fg) {
  cv.fillCircle(cx, cy, 14, bg);
  if (kind == 'W') icoWifi(cx - 8, cy - 8, fg); else icoBt(cx - 8, cy - 8, fg);
}

// ---------------------------------------------------------------- touch (FT6336G)
bool touchPoint(int &x, int &y) {
  Wire.beginTransmission(TOUCH_ADDR); Wire.write(0x02);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)TOUCH_ADDR, (uint8_t)5) != 5) return false;
  uint8_t n = Wire.read() & 0x0F, xh = Wire.read(), xl = Wire.read(), yh = Wire.read(), yl = Wire.read();
  if (n == 0 || n > 2) return false;
  int tx = ((xh & 0x0F) << 8) | xl, ty = ((yh & 0x0F) << 8) | yl;   // panel frame: 0..239 x 0..319
  if (TOUCH_SWAP_XY) { int t = tx; tx = ty; ty = t; }
  if (TOUCH_FLIP_X) tx = TW - 1 - tx;
  if (TOUCH_FLIP_Y) ty = TH - 1 - ty;
  x = constrain(tx, 0, TW - 1); y = constrain(ty, 0, TH - 1);
  return true;
}

// ---------------------------------------------------------------- state
uint8_t drawnPage = 255;
uint32_t contentSig = 0, headerSig = 0;
bool toastWasUp = false;
uint32_t lastTouchAt = 0, lastPoll = 0, lastDraw = 0;
bool touchDown = false;
bool tftPaused = false;
uint8_t tftRotation = TFT_ROTATION;
uint32_t sigAdd(uint32_t h, int v) { return (h ^ (uint32_t)v) * 16777619u; }   // FNV-style mix

// Push a rectangle of the canvas to the panel
void push(int x, int y, int w, int h) {
  tft.startWrite();
  tft.setAddrWindow(x, y, w, h);
  for (int row = 0; row < h; row++) tft.writePixels(cv.buf() + (y + row) * TW + x, w, true, false);
  tft.endWrite();
}
void beginFrame(bool alert) { memcpy(cv.buf(), alert ? bgAlert : bgQuiet, (size_t)TW * TH * 2); }

// ---------------------------------------------------------------- header + tabs
// One idea per page, big type, no captions: the title, a status chip, the content, the tabs.
void renderHeader() {
  bool alert = wifiAlert || tagAlert || heatLevel() >= 1;
  textAt(12, 42, TAB_NAMES[page], F_PAGE, C_NAVY);
  int cx = TW - 12 - 62;
  glass(cx, 20, 62, 26, 13, 0.8f);   // dot, phone, speaker
  cv.fillCircle(cx + 13, 33, 4, alert ? C_EMBER : C_LEAF);
  icoPhone(cx + 23, 25, phoneConnected ? C_NAVY : C_FAINT);
  icoSound(cx + 38, 25, soundOn, C_NAVY);
}

void renderTabs() {
  cv.fillRect(0, TAB_Y, TW, TAB_H, C_MIST);
  cv.drawFastHLine(0, TAB_Y, TW, C_LINE);
  for (int i = 0; i < NUM_PAGES; i++) {
    int x = i * 60; bool on = i == page;
    uint16_t c = on ? C_NAVY : C_FAINT;
    if (on) pill(x + 9, TAB_Y + 4, 42, 22, C_PALE_BLUE);
    int ix = x + 22, iy = TAB_Y + 7;
    if (i == 0) icoThermo(ix, iy, c); else if (i == 1) icoRadar(ix, iy, c); else if (i == 2) icoLocate(ix, iy, c); else icoBt(ix, iy, c);
    textCenter(x + 30, TAB_Y + 40, TAB_NAMES[i], F_SMALL, c);
  }
}

// ---------------------------------------------------------------- heat: the image, then one line
const int IMG_SCALE = 7, IMG_X = 8, IMG_Y_TFT = 58;   // 224 x 168
// Bilinear upscale of the 32x24 frame (no blocks): each output pixel blends its four nearest readings
void renderHeatImage() {
  float span = max(tMax - tMin, 0.1f);
  const int OW = W * IMG_SCALE, OH = H * IMG_SCALE;
  for (int oy = 0; oy < OH; oy++) {
    float v = constrain((oy + 0.5f) / IMG_SCALE - 0.5f, 0.0f, H - 1.0f);
    int y0 = (int)v, y1 = min(y0 + 1, H - 1); float fy = v - y0;
    const float *r0 = frame + y0 * W, *r1 = frame + y1 * W;
    for (int ox = 0; ox < OW; ox++) {
      float u = constrain((ox + 0.5f) / IMG_SCALE - 0.5f, 0.0f, W - 1.0f);
      int x0 = (int)u, x1 = min(x0 + 1, W - 1); float fx = u - x0;
      float t = (r0[x0] * (1 - fx) + r0[x1] * fx) * (1 - fy) + (r1[x0] * (1 - fx) + r1[x1] * fx) * fy;
      int lvl = constrain((int)((t - tMin) / span * 63.99f), 0, 63);
      px(IMG_X + ox, IMG_Y_TFT + oy) = heatLut[lvl];
    }
  }
  int hx, hy; float hdc;
  if (heatSpot(hx, hy, hdc)) {           // the heat detector's spot (the app's, or the board's own rule)
    int cx = IMG_X + hx * IMG_SCALE + 3, cy = IMG_Y_TFT + hy * IMG_SCALE + 3;
    cv.drawCircle(cx, cy, 15, C_WHITE); cv.drawCircle(cx, cy, 14, C_WHITE);
  }
}

void renderHeat() {
  char buf[32];
  if (!thermalOk) {
    textAt(12, 100, "No camera", F_TITLE, C_NAVY);
    textAt(12, 122, "Plug it into a Grove port.", F_TEXT, C_SLATE);
    return;
  }
  renderHeatImage();
  // one verdict about cameras: the board's own R rule standalone, the phone's R/A/S when linked
  int v = heatLevel();
  const char *t = v >= 2 ? "Possible camera, strong" : v == 1 ? "Possible camera" : "Nothing warm";
  int hx, hy; float hdc;
  bool sp = heatSpot(hx, hy, hdc);
  if (sp) snprintf(buf, sizeof(buf), "+%.1f C", hdc); else snprintf(buf, sizeof(buf), "%.0f C", tMax);
  int rw = textW(buf, F_TEXT);
  textFit(12, 256, t, F_TITLE, v >= 1 ? C_EMBER : C_NAVY, TW - 24 - rw - 10);
  textRight(TW - 12, 256, buf, F_TEXT, sp ? C_NAVY : C_SLATE);
}

// ---------------------------------------------------------------- sweep: verdict, radar, the top lead
int sweepRows = 0; int8_t sweepIdx[5];
const int SWEEP_ROW_Y = 226, SWEEP_ROW_H = 48;

void radar(int cx, int cy, int R, bool alert) {
  const uint16_t inner = c565(0x5A, 0x47, 0x45), outer = c565(0x2E, 0x26, 0x26);
  for (int y = -R; y <= R; y++)
    for (int x = -R; x <= R; x++) {
      float d = sqrtf(x * x + y * y);
      if (d > R + 0.5f) continue;
      float t = d / R;
      uint16_t c = mix(inner, outer, t);
      float ang = atan2f(y, x);
      if (ang > -2.0944f && ang < -1.0472f) c = mix(c, C_WHITE, 0.16f);   // facing cone
      if (alert) c = mix(c, C_EMBER, 0.45f * (1 - t));
      float ring = fabsf(d - R / 3.0f); ring = min(ring, fabsf(d - 2 * R / 3.0f)); ring = min(ring, fabsf(d - R));
      if (ring < 0.7f) c = mix(c, C_WHITE, 0.5f);
      else if (d > R - 0.7f) c = mix(c, C_WHITE, 0.3f);
      px(cx + x, cy + y) = c;
    }
  for (int i = 0; i < 12; i++) {
    float a = i * PI / 6;
    cv.drawLine(cx, cy, cx + R * cosf(a), cy + R * sinf(a), mix(outer, C_WHITE, 0.14f));
  }
  int n = min(candCount, 8);
  for (int i = 0; i < n; i++) {   // distance from the centre follows RSSI; the angle means nothing
    const Cand &c = cands[i];
    float a = -PI / 2 + 2 * PI * i / n + (n > 1 ? 0.3f : 0);
    float dist = R * (0.18f + 0.76f * (1 - constrain((c.rssi + 90) / 60.0f, 0.0f, 1.0f)));
    int dx = cx + dist * cosf(a), dy = cy + dist * sinf(a);
    uint16_t col = c.weight >= 70 ? C_EMBER : c.weight >= VENDOR_ALERT_PCT ? C_AMBER : c565(0xBF, 0xC7, 0xD5);
    if (c.weight >= 70) cv.fillCircle(dx, dy, 9, mix(outer, C_EMBER, 0.4f));
    cv.fillCircle(dx, dy, c.weight >= VENDOR_ALERT_PCT ? 6 : 4, col);
  }
  int s = 9;
  cv.fillTriangle(cx, cy - s * 1.4f, cx + s, cy + s, cx, cy + s * 0.45f, C_WHITE);
  cv.fillTriangle(cx, cy - s * 1.4f, cx - s, cy + s, cx, cy + s * 0.45f, C_WHITE);
}

void renderSweep() {
  char buf[40];
  int suspects = 0; for (int i = 0; i < candCount; i++) if (cands[i].weight >= VENDOR_ALERT_PCT) suspects++;
  bool alert = suspects > 0;
  textAt(12, 82, alert ? "Something is here" : candCount ? "Looks quiet" : "Listening", F_TITLE, alert ? C_EMBER : C_NAVY);
  snprintf(buf, sizeof(buf), "%d lead%s, %d device%s", suspects, suspects == 1 ? "" : "s", candCount, candCount == 1 ? "" : "s");
  textAt(12, 102, buf, F_TEXT, C_SLATE);
  radar(120, 164, 52, alert);
  // the top lead, one row, tap to locate
  sweepRows = 0;
  for (int pass = 0; pass < 2 && sweepRows < 1; pass++)
    for (int i = 0; i < candCount && sweepRows < 1; i++)
      if ((cands[i].weight >= VENDOR_ALERT_PCT) == (pass == 0)) sweepIdx[sweepRows++] = i;
  if (sweepRows == 0) return;
  const Cand &c = cands[sweepIdx[0]];
  bool lead = c.weight >= VENDOR_ALERT_PCT, hot = lead && c.weight >= 70;
  glass(8, SWEEP_ROW_Y - 2, TW - 16, SWEEP_ROW_H);
  iconCircle(32, SWEEP_ROW_Y + 22, hot ? C_PALE_RED : C_PALE_BLUE, c.radio, hot ? C_EMBER : lead ? C_NAVY : C_FAINT);
  int bw = lead ? textW(c.weight >= 70 ? "High" : c.weight >= 50 ? "Med" : "Low", F_BADGE) + 26 : 0;
  textFit(54, SWEEP_ROW_Y + 29, c.name, F_BOLD, lead ? C_NAVY : C_FAINT, TW - 54 - 34 - bw);
  if (lead) badge(TW - 34, SWEEP_ROW_Y + 11, c.weight);
  chevron(TW - 26, SWEEP_ROW_Y + 18, C_FAINT);
}

// ---------------------------------------------------------------- locate: the number
void ring(int cx, int cy, int R, float pct, uint16_t on, uint16_t off) {
  float lim = -PI / 2 + 2 * PI * pct;
  for (int y = -R - 7; y <= R + 7; y++)
    for (int x = -R - 7; x <= R + 7; x++) {
      float d = sqrtf(x * x + y * y);
      float e = fabsf(d - R);
      if (e > 6.5f) continue;
      float ang = atan2f(y, x); if (ang < -PI / 2) ang += 2 * PI;
      uint16_t c = ang <= lim && pct > 0 ? on : off;
      uint16_t &p = px(cx + x, cy + y);
      p = e > 5.5f ? mix(p, c, 6.5f - e) : c;
    }
}

void renderLocate() {
  char buf[40];
  float r, w, b; bool ws, bs;
  bool seen = getTarget(r, w, b, ws, bs);
  if (!target.has) textAt(12, 84, target.mode == TM_NONE ? "No target" : "No lead yet", F_TITLE, C_NAVY);
  else textFit(12, 84, target.name, F_TITLE, C_NAVY, TW - 24);
  int cx = TW / 2, cy = 150, R = 52;
  float pct = seen ? constrain((r - RSSI_FAR) / (float)(RSSI_CLOSE - RSSI_FAR), 0.0f, 1.0f) : 0;
  bool close = seen && r > -55;
  for (int y = -R; y <= R; y++) for (int x = -R; x <= R; x++) {
    float d = sqrtf(x * x + y * y) / R; if (d >= 1) continue;
    uint16_t &p = px(cx + x, cy + y); p = mix(p, close ? C_EMBER : C_SKYBLUE, (1 - d) * (0.05f + 0.3f * pct));
  }
  ring(cx, cy, R, pct, close ? C_EMBER : C_NAVY, C_LINE);
  if (seen) snprintf(buf, sizeof(buf), "%d", (int)lroundf(r)); else strcpy(buf, "...");
  textCenter(cx, cy + 12, buf, F_BIG, close ? C_EMBER : C_NAVY);
  const char *lab = !target.has ? "Pick a lead on Sweep" : seen ? proximityLabel(r) : "Not heard, move slowly";
  snprintf(buf, sizeof(buf), "%s", lab); for (char *p = buf + 1; *p; p++) *p = tolower(*p);
  textCenter(cx, 230, buf, target.has && seen ? F_TITLE : F_TEXT, close ? C_EMBER : C_NAVY);
  pill(12, 244, 132, 30, C_NAVY); textCenter(78, 265, "Next", F_TITLE, C_WHITE);
  glass(152, 244, 76, 30, 15, 0.9f); textCenter(190, 265, "Auto", F_TITLE, target.mode == TM_AUTO ? C_FAINT : C_NAVY);
}

// ---------------------------------------------------------------- trackers: verdict and up to three rows
Tag tftTags[SHOW_TAG]; int tftTagCount = 0;
const int TAG_ROW_Y = 116, TAG_ROW_H = 48;
void renderTrackers() {
  char buf[40];
  tftTagCount = tagSnapshot(tftTags, SHOW_TAG);
  int away = 0; for (int i = 0; i < tftTagCount; i++) if (tagSuspect(tftTags[i])) away++;
  textAt(12, 82, away ? "A tracker is here" : tftTagCount ? "Only owned tags" : "No trackers", F_TITLE, away ? C_EMBER : C_NAVY);
  snprintf(buf, sizeof(buf), "%d heard, %d away from owner", tftTagCount, away);
  textAt(12, 102, buf, F_TEXT, C_SLATE);
  int n = min(tftTagCount, 3);
  if (n == 0) return;
  glass(8, TAG_ROW_Y - 4, TW - 16, n * TAG_ROW_H + 4);
  for (int i = 0; i < n; i++) {
    const Tag &t = tftTags[i]; int y = TAG_ROW_Y + i * TAG_ROW_H; bool sus = tagSuspect(t);
    if (i) cv.drawFastHLine(20, y - 2, TW - 40, C_LINE);
    iconCircle(32, y + 22, sus ? C_PALE_RED : C_PALE_BLUE, 'B', sus ? C_EMBER : C_FAINT);
    textFit(54, y + 19, TAG_NAMES[t.kind], F_BOLD, sus ? C_NAVY : C_FAINT, TW - 54 - 34 - 56);
    snprintf(buf, sizeof(buf), "%s, %d dBm", STATE_NAMES[t.state], t.rssi);
    textAt(54, y + 38, buf, F_TEXT, C_FAINT);
    badge(TW - 34, y + 11, tagWeight(t));
    chevron(TW - 26, y + 18, C_FAINT);
  }
}

// ---------------------------------------------------------------- toast
const int TOAST_Y = 136;
bool toastUp() { return toastAt && millis() - toastAt < TOAST_MS; }
void renderToast() {
  char buf[40];
  snprintf(buf, sizeof(buf), "%s", toastMsg);
  for (char *p = buf + 1; *p; p++) *p = tolower(*p);   // the OLED's "SOUND OFF" reads "Sound off" here
  int w = textW(buf, F_TITLE) + 40;
  pill((TW - w) / 2, TOAST_Y + 4, w, 40, C_NAVY);
  textAt((TW - w) / 2 + 20, TOAST_Y + 31, buf, F_TITLE, C_WHITE);
}

// ---------------------------------------------------------------- frame
void renderAll() {
  beginFrame(wifiAlert || tagAlert || heatLevel() >= 1);
  renderHeader();
  switch (page) { case 0: renderHeat(); break; case 1: renderSweep(); break; case 2: renderLocate(); break; default: renderTrackers(); break; }
  renderTabs();
  if (toastUp()) renderToast();
}

uint32_t contentSignature() {
  uint32_t h = 2166136261u;
  h = sigAdd(h, page);
  switch (page) {
    case 0: { int hx, hy; float hdc; bool sp = heatSpot(hx, hy, hdc); h = sigAdd(h, thermalOk); h = sigAdd(h, heatLevel()); h = sigAdd(h, sp); h = sigAdd(h, sp ? (int)(hdc * 10) : 0); } break;
    case 1: h = sigAdd(h, candCount); h = sigAdd(h, devTotal);
            for (int i = 0; i < candCount && i < 8; i++) { h = sigAdd(h, cands[i].weight); h = sigAdd(h, cands[i].rssi); h = sigAdd(h, cands[i].mac[5]); } break;
    case 2: { float r, w, b; bool ws, bs; bool seen = getTarget(r, w, b, ws, bs);
            h = sigAdd(h, target.has); h = sigAdd(h, target.mode); h = sigAdd(h, seen); h = sigAdd(h, seen ? (int)lroundf(r) : 0);
            h = sigAdd(h, ws ? (int)lroundf(w) : -1); h = sigAdd(h, bs ? (int)lroundf(b) : -1); h = sigAdd(h, target.mac[5]); } break;
    default: { Tag l[SHOW_TAG]; int n = tagSnapshot(l, SHOW_TAG); h = sigAdd(h, n);
            for (int i = 0; i < n && i < 4; i++) { h = sigAdd(h, l[i].kind); h = sigAdd(h, l[i].state); h = sigAdd(h, l[i].rssi / 3); } } break;
  }
  return h;
}
uint32_t headerSignature() {
  return sigAdd(sigAdd(sigAdd(sigAdd(2166136261u, page), soundOn), phoneConnected), (wifiAlert || tagAlert || heatLevel() >= 1));
}

// ---------------------------------------------------------------- touch handling
void tftTap(int x, int y) {
  if (y >= TAB_Y) {                                   // tab bar: switch page (same as PAGE,n / the button)
    int p = constrain(x / 60, 0, NUM_PAGES - 1);
    if (p != page) { page = p; Serial.printf("TOUCH tab -> page %s\n", PAGE_NAMES[page]); }
    return;
  }
  if (y < HDR_H && x >= TW - 46) {                    // header: speaker
    soundOn = !soundOn; showToast(soundOn ? "SOUND ON" : "SOUND OFF");
    if (soundOn) tone(BUZZER_PIN, 2000, 40);
    Serial.printf("TOUCH sound -> %s\n", soundOn ? "on" : "off");
    return;
  }
  if (page == 1 && y >= SWEEP_ROW_Y - 4 && y < SWEEP_ROW_Y + sweepRows * SWEEP_ROW_H) {   // sweep row: locate it
    int r = (y - SWEEP_ROW_Y + 4) / SWEEP_ROW_H, i = sweepIdx[min(r, sweepRows - 1)];
    if (i < candCount) {
      setTarget(cands[i].mac, cands[i].name, TM_FIXED, i);
      page = 2; showToast(cands[i].name);
      Serial.printf("TOUCH sweep row %d -> TARGET %s\n", r, cands[i].name);
    }
    return;
  }
  if (page == 3 && y >= TAG_ROW_Y - 4 && y < TAG_ROW_Y + min(tftTagCount, 3) * TAG_ROW_H) {   // tracker row: locate it
    const Tag &t = tftTags[(y - TAG_ROW_Y + 4) / TAG_ROW_H];
    setTarget(t.mac, TAG_NAMES[t.kind], TM_FIXED, -1);
    page = 2; showToast(TAG_NAMES[t.kind]);
    Serial.printf("TOUCH tracker -> TARGET %s\n", TAG_NAMES[t.kind]);
    return;
  }
  if (page == 2 && y >= 240 && y < 276) {             // locate buttons
    if (x < 148) { nextTarget = true; Serial.println("TOUCH next target"); }
    else { target.mode = TM_AUTO; target.has = false; showToast("AUTO"); Serial.println("TOUCH auto target"); }
    return;
  }
}

void tftPollTouch() {
  uint32_t now = millis();
  if (now - lastPoll < 40) return;
  lastPoll = now;
  int x, y;
  bool down = touchPoint(x, y);
  if (down && !touchDown && now - lastTouchAt > 250) { lastTouchAt = now; tftTap(x, y); contentSig = 0; }
  touchDown = down;
}

// ---------------------------------------------------------------- serial bench commands
// TFT,<hz> SPI clock - TFT,R,<0-3> rotation - TFT,I re-init - TFT,T test pattern -
// TFT,S / TFT,H software / hardware SPI - TFT,P pause the UI - TFT,V invert
void tftTestPattern() {
  cv.fillRect(0, 0, TW, 100, c565(255, 0, 0)); cv.fillRect(0, 100, TW, 100, c565(0, 255, 0)); cv.fillRect(0, 200, TW, 120, c565(0, 0, 255));
  cv.drawRect(0, 0, TW, TH, C_WHITE); cv.drawRect(4, 4, TW - 8, TH - 8, C_BLACK);
  textAt(20, 70, "TOP", F_BIG, C_WHITE); textAt(20, 170, "phygital", F_BIG, C_BLACK); textAt(20, 270, "BOTTOM", F_BIG, C_WHITE);
  push(0, 0, TW, TH);
  Serial.println("TFT test pattern: red TOP, green phygital, blue BOTTOM");
}
void tftCommand(const char *arg) {
  if (!tftOk) { Serial.println("TFT not running (no PSRAM?)"); return; }
  if (arg[0] == 'R' && arg[1] == ',') { tftRotation = constrain(atoi(arg + 2), 0, 3); tft.setRotation(tftRotation); Serial.printf("TFT rotation %d\n", tftRotation); }
  else if (arg[0] == 'I') { tft.begin(TFT_SPI_HZ); tft.setRotation(tftRotation); tft.invertDisplay(true); Serial.println("TFT re-init"); }
  else if (arg[0] == 'T') { tftTestPattern(); return; }
  else if (arg[0] == 'P') { tftPaused = !tftPaused; Serial.printf("TFT ui %s\n", tftPaused ? "paused" : "running"); return; }
  else if (arg[0] == 'V') { static bool inv = true; inv = !inv; tft.invertDisplay(inv); Serial.printf("TFT invert %d\n", inv); return; }
  else if (arg[0] == 'S') { tftp = &tftSw; tft.begin(); tft.setRotation(tftRotation); tft.invertDisplay(true); Serial.println("TFT software SPI"); }
  else if (arg[0] == 'H') { tftp = &tftHw; tft.begin(TFT_SPI_HZ); tft.setRotation(tftRotation); tft.invertDisplay(true); Serial.println("TFT hardware SPI"); }
  else { long hz = atol(arg); if (hz >= 1000000) { tft.setSPISpeed(hz); Serial.printf("TFT spi %ld Hz\n", hz); } }
  drawnPage = 255;
}

// ---------------------------------------------------------------- entry points
void tftSetup() {
  pinMode(TOUCH_RST, OUTPUT); digitalWrite(TOUCH_RST, LOW); delay(10); digitalWrite(TOUCH_RST, HIGH);
  SPI.begin(SCK, -1, MOSI, -1);                     // no MISO: D9 is the DC line
  delay(150);                                        // let the panel's own reset finish before the init sequence
  tft.begin(TFT_SPI_HZ);
  tft.setRotation(TFT_ROTATION);
  tft.invertDisplay(true);                          // this IPS panel shows inverted colours without INVON (Raul, 2026-11-20)
  tft.fillScreen(C_CREAM);
  cv.alloc();
  bgQuiet = (uint16_t *)ps_malloc((size_t)TW * TH * 2);
  bgAlert = (uint16_t *)ps_malloc((size_t)TW * TH * 2);
  if (!cv.buf() || !bgQuiet || !bgAlert) {
    Serial.printf("TFT: no PSRAM for the canvas (psram %u bytes); build with PSRAM=opi\n", (unsigned)ESP.getPsramSize());
    return;
  }
  aa = new GFXcanvas1(AA_W, AA_H);                  // 7.7 kB internal RAM
  renderBackground(bgQuiet, false);
  renderBackground(bgAlert, true);
  for (int i = 0; i < 64; i++) {   // inferno-like ramp, the app's STOPS
    static const uint8_t st[5][3] = {{0x1B, 0x0C, 0x41}, {0x78, 0x1C, 0x6D}, {0xCF, 0x44, 0x46}, {0xF9, 0x9E, 0x1B}, {0xFC, 0xFF, 0xA4}};
    float v = i / 63.0f * 4; int k = min((int)v, 3); float t = v - k;
    heatLut[i] = c565(st[k][0] + (st[k + 1][0] - st[k][0]) * t, st[k][1] + (st[k + 1][1] - st[k][1]) * t, st[k][2] + (st[k + 1][2] - st[k][2]) * t);
  }
  delay(200);                                        // FT6336 needs ~200 ms after reset before it answers
  Wire.beginTransmission(TOUCH_ADDR);
  bool touchOk = Wire.endTransmission() == 0;
  if (touchOk) { Wire.beginTransmission(TOUCH_ADDR); Wire.write(0xA4); Wire.write(0x00); Wire.endTransmission(); }   // polling mode
  tftOk = true;
  Serial.printf("TFT started (ILI9341 %d x %d, canvas in PSRAM, build %s), touch %s at 0x%02X\n", TW, TH, TFT_BUILD,
                touchOk ? "found" : "NOT found", TOUCH_ADDR);
  // splash in the app's words
  beginFrame(false);
  glass(24, 118, TW - 48, 84, 18, 0.85f);
  textAt(40, 160, "phygital", F_BIG, C_NAVY);
  textAt(40, 184, "Listens. Never joins.", F_TEXT, C_SLATE);
  push(0, 0, TW, TH);
}

void tftLoop(bool newFrame) {
  if (!tftOk) return;
  tftPollTouch();
  if (tftPaused) return;
  uint32_t now = millis();
  // Self-heal (2026-11-20): on the bench the UI showed after boot and later went blank until a
  // re-init. Whatever resets or sleeps the panel, every 2 s re-send the four commands that
  // bring an ILI9341 back from its reset state and push the whole canvas again. Identical
  // pixels, so nothing visible happens when the panel was fine; ~30 ms at 40 MHz.
  static uint32_t lastHeal = 0;
  if (now - lastHeal >= 2000) {
    lastHeal = now;
    uint8_t fmt = 0x55;                                 // 16-bit pixels
    tft.sendCommand(0x11);                              // sleep out
    tft.sendCommand(0x3A, &fmt, 1);                     // pixel format
    tft.setRotation(tftRotation);                       // MADCTL
    tft.sendCommand(0x21);                              // inversion on (IPS panel)
    tft.sendCommand(0x29);                              // display on
    renderAll();
    push(0, 0, TW, TH);
    contentSig = contentSignature(); headerSig = headerSignature(); drawnPage = page; lastDraw = now;
    toastWasUp = toastUp();
    return;
  }
  bool full = drawnPage != page;
  bool toastNow = toastUp();
  bool hdr = headerSignature() != headerSig;
  bool content = false;
  if (!full && now - lastDraw >= 200) {
    lastDraw = now;
    uint32_t cs = contentSignature();
    if (cs != contentSig) { contentSig = cs; content = true; }
  }
  if (toastNow != toastWasUp) content = true;         // the toast sits on the content: repaint under it
  toastWasUp = toastNow;
  if (full || hdr || content) {
    renderAll();
    if (full) { push(0, 0, TW, TH); drawnPage = page; contentSig = contentSignature(); headerSig = headerSignature(); lastDraw = now; }
    else {
      if (hdr) { push(0, 0, TW, HDR_H); headerSig = headerSignature(); }
      if (content) push(0, HDR_H, TW, TAB_Y - HDR_H);
    }
    return;
  }
  // a new thermal frame: repaint only the image and the range line
  if (page == 0 && thermalOk && newFrame && !toastNow) {
    renderHeatImage();
    push(IMG_X, IMG_Y_TFT, W * IMG_SCALE, H * IMG_SCALE);
  }
}
