// Just enough Arduino for the touch-screen simulator (tools/tft_sim): the real
// tft_ui.h and Adafruit_GFX.cpp compile against this on the laptop.
#pragma once
#ifndef ARDUINO
#define ARDUINO 10819
#endif
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <math.h>
#include <ctype.h>
#include <algorithm>
#include <string>
using std::min;
using std::max;

class __FlashStringHelper;
#define F(x) (x)
#define strlen_P strlen
class String {              // the little Adafruit_GFX needs
  std::string s;
 public:
  String(const char *c = "") : s(c) {}
  const char *c_str() const { return s.c_str(); }
  unsigned length() const { return s.length(); }
  char charAt(unsigned i) const { return s[i]; }
};

typedef bool boolean;
typedef uint8_t byte;
#define PROGMEM
#ifndef pgm_read_byte
#define pgm_read_byte(a) (*(const unsigned char *)(a))
#define pgm_read_word(a) (*(const unsigned short *)(a))
#define pgm_read_dword(a) (*(const unsigned long *)(a))
#define pgm_read_pointer(a) (*(const void **)(a))
#endif
#define PI 3.1415926535897932384626433832795
#define DEG_TO_RAD 0.017453292519943295769236907684886
#define radians(d) ((d) * DEG_TO_RAD)
#define degrees(r) ((r) * 57.295779513082320876798154814105)
#define constrain(x, a, b) ((x) < (a) ? (a) : (x) > (b) ? (b) : (x))
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define HIGH 1
#define LOW 0

extern uint32_t simNow;
inline uint32_t millis() { return simNow; }
inline void delay(uint32_t ms) { simNow += ms; }
inline void yield() {}
inline void pinMode(int, int) {}
inline void digitalWrite(int, int) {}
inline void tone(int, int, int = 0) {}
inline void *ps_malloc(size_t n) { return malloc(n); }

// XIAO ESP32-S3 pin names used by tft_ui.h
static const uint8_t D0 = 1, D1 = 2, D2 = 3, D3 = 4, D4 = 5, D5 = 6, D6 = 43, D7 = 44, D8 = 7, D9 = 8, D10 = 9;
static const uint8_t MOSI = 9, MISO = 8, SCK = 7;

struct SimSerial {
  int printf(const char *f, ...) { va_list a; va_start(a, f); int n = vfprintf(stderr, f, a); va_end(a); return n; }
  void println(const char *s) { fprintf(stderr, "%s\n", s); }
  void print(const char *s) { fputs(s, stderr); }
};
extern SimSerial Serial;

struct SimESP { unsigned getPsramSize() { return 8 * 1024 * 1024; } };
extern SimESP ESP;

// I2C stub: nothing answers, so the touch poll returns "no touch"
struct SimWire {
  void beginTransmission(uint8_t) {}
  size_t write(uint8_t) { return 1; }
  uint8_t endTransmission(bool = true) { return 4; }
  uint8_t requestFrom(uint8_t, uint8_t) { return 0; }
  int read() { return 0; }
};
extern SimWire Wire;
