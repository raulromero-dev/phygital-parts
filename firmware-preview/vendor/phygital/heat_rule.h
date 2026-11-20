// The R rule on the board, so the device finds warm camera-sized spots standalone
// (2026-11-20). Same numbers as thermal/thermal_host.py and app/…/Thermal.kt:
//   mean of the frames of the last 1 s  →  pixel ≥ 2 °C above its 7×7 median
//   →  blob ≤ 12 px, ring delta ≥ 2 °C, not on the border, isolated, no chess artefact
//   →  persistence: seen within 1.5 px in two thirds of the frames of the last 1.5 s (≥ 2).
// Verdict: one method on the board = a lead ("Possible camera"), never "strong"; the
// phone or laptop, which also runs A and S, can say strong. A lead is a place to look.
// Shared with tools/tft_sim (compiled on the laptop), so no Arduino calls in here.
#pragma once
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <algorithm>

struct HeatRule {
  static const int FW = 32, FH = 24, FN = FW * FH;
  static const int HIST = 6;              // frames kept for the 1 s mean (4 fps → 4, with slack)
  static const int PH = 8;                // persistence frames (1.5 s at 4 fps → 6, with slack)
  static const int MAXS = 4;              // spots per frame we keep
  float minDelta = 2.0f; int maxSize = 12; float windowS = 1.5f, share = 2.0f / 3, radius = 1.5f;

  float hist[HIST][FN]; uint32_t histAt[HIST]; int histN = 0, histHead = 0;
  struct Frame { uint32_t at; int n; float x[MAXS], y[MAXS], dc[MAXS]; };
  Frame pf[PH]; int pN = 0, pHead = 0;
  float mean[FN];
  bool lead = false; int sx = -1, sy = -1; float sdc = 0;   // the result after push()

  static float medianOf(float *v, int n) {
    std::nth_element(v, v + n / 2, v + n);
    float m = v[n / 2];
    if (n % 2 == 0) { std::nth_element(v, v + n / 2 - 1, v + n / 2); m = (m + v[n / 2 - 1]) / 2; }
    return m;
  }

  // mean of the frames of the last second (Smoother)
  void smooth(const float *raw, uint32_t now) {
    int slot = (histHead + histN) % HIST;
    if (histN == HIST) { slot = histHead; histHead = (histHead + 1) % HIST; histN--; }
    memcpy(hist[slot], raw, sizeof(float) * FN); histAt[slot] = now; histN++;
    while (histN > 1 && now - histAt[histHead] > 1000) { histHead = (histHead + 1) % HIST; histN--; }
    memset(mean, 0, sizeof(mean));
    for (int k = 0; k < histN; k++) { const float *f = hist[(histHead + k) % HIST]; for (int i = 0; i < FN; i++) mean[i] += f[i]; }
    for (int i = 0; i < FN; i++) mean[i] /= histN;
  }

  float ringDelta(const float *t, int xi, int yi) {
    float core = -1e9f, ring[64]; int n = 0;
    for (int yy = 0; yy < FH; yy++) for (int xx = 0; xx < FW; xx++) {
      int d = std::max(abs(xx - xi), abs(yy - yi));
      if (d <= 1) core = std::max(core, t[yy * FW + xx]);
      else if (d >= 3 && d <= 4 && n < 64) ring[n++] = t[yy * FW + xx];
    }
    return n ? core - medianOf(ring, n) : 0;
  }
  bool isolated(const float *t, int xi, int yi) {
    float best = -1e9f; bool any = false;
    static const int off[3] = {-3, 0, 3};
    for (int a = 0; a < 3; a++) for (int b = 0; b < 3; b++) {
      int dy = off[a], dx = off[b];
      if (!dy && !dx) continue;
      int cy = yi + dy, cx = xi + dx;
      if (cy < 0 || cy >= FH || cx < 0 || cx >= FW) continue;
      float s = 0; int n = 0;
      for (int yy = std::max(0, cy - 1); yy < std::min(FH, cy + 2); yy++)
        for (int xx = std::max(0, cx - 1); xx < std::min(FW, cx + 2); xx++) { s += t[yy * FW + xx]; n++; }
      best = std::max(best, s / n); any = true;
    }
    return any && t[yi * FW + xi] - best >= minDelta;
  }
  bool chessArtifact(const float *t, int xi, int yi) {
    float a = 0, b = 0; int na = 0, nb = 0;
    for (int yy = std::max(0, yi - 2); yy < std::min(FH, yi + 3); yy++)
      for (int xx = std::max(0, xi - 2); xx < std::min(FW, xi + 3); xx++)
        if ((yy + xx) % 2 == 1) { a += t[yy * FW + xx]; na++; } else { b += t[yy * FW + xx]; nb++; }
    return fabsf(a / na - b / nb) > 1.5f;
  }

  // one frame in: smooth, rule, persist; results in lead / sx / sy / sdc
  void push(const float *raw, uint32_t now) {
    smooth(raw, now);
    const float *t = mean;
    static bool mask[FN]; static bool seen[FN]; static int stack[FN]; static int pix[FN];
    float win[49];
    for (int y = 0; y < FH; y++) for (int x = 0; x < FW; x++) {
      int n = 0;
      for (int dy = -3; dy <= 3; dy++) for (int dx = -3; dx <= 3; dx++)
        win[n++] = t[std::min(std::max(y + dy, 0), FH - 1) * FW + std::min(std::max(x + dx, 0), FW - 1)];
      mask[y * FW + x] = t[y * FW + x] - medianOf(win, 49) >= minDelta;
      seen[y * FW + x] = false;
    }
    Frame &fr = pf[(pHead + pN) % PH];
    if (pN == PH) { fr = pf[pHead]; pHead = (pHead + 1) % PH; pN--; }
    Frame cur; cur.at = now; cur.n = 0;
    for (int start = 0; start < FN; start++) {
      if (!mask[start] || seen[start]) continue;
      int sp = 0, np = 0; stack[sp++] = start; seen[start] = true;
      while (sp) {
        int p = stack[--sp]; pix[np++] = p;
        int y = p / FW, x = p % FW;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          int yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= FH || xx < 0 || xx >= FW) continue;
          int q = yy * FW + xx;
          if (mask[q] && !seen[q]) { seen[q] = true; stack[sp++] = q; }
        }
      }
      if (np > maxSize) continue;
      int best = pix[0]; for (int i = 1; i < np; i++) if (t[pix[i]] > t[best]) best = pix[i];
      int x = best % FW, y = best / FW;
      if (x == 0 || x == FW - 1 || y == 0 || y == FH - 1) continue;
      float d = ringDelta(t, x, y);
      if (d < minDelta || !isolated(t, x, y) || chessArtifact(t, x, y)) continue;
      if (cur.n < MAXS) { cur.x[cur.n] = x; cur.y[cur.n] = y; cur.dc[cur.n] = d; cur.n++; }
    }
    pf[(pHead + pN) % PH] = cur; pN++;
    while (pN > 1 && now - pf[pHead].at > (uint32_t)(windowS * 1000)) { pHead = (pHead + 1) % PH; pN--; }
    int need = std::max(2, (int)ceilf(pN * share));
    lead = false; sx = sy = -1; sdc = 0;
    for (int i = 0; i < cur.n; i++) {
      int hits = 0;
      for (int k = 0; k < pN; k++) {
        const Frame &f = pf[(pHead + k) % PH];
        for (int j = 0; j < f.n; j++)
          if (hypotf(cur.x[i] - f.x[j], cur.y[i] - f.y[j]) <= radius) { hits++; break; }
      }
      if (hits >= need && cur.dc[i] > sdc) { lead = true; sx = cur.x[i]; sy = cur.y[i]; sdc = cur.dc[i]; }
    }
  }
};
