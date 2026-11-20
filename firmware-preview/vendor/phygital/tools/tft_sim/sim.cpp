// Touch-screen simulator: compiles the real tft_ui.h (and heat_rule.h) against stub Arduino
// headers and the real Adafruit_GFX, renders each page for a few scripted situations into
// an emulated 240x320 panel and writes them as PNGs (tools/tft_sim/run.sh). Use it to check
// layout, text size and wording before flashing the board.
#include "Arduino.h"
uint32_t simNow = 5000;
SimSerial Serial; SimESP ESP; SimWire Wire;
#include "SPI.h"
SimSPI SPI;
#include "Adafruit_ILI9341.h"
uint16_t simPanel[SIM_W * SIM_H];

// ---- the Phygital.ino globals tft_ui.h draws from, with the same names and types
const int W = 32, H = 24, N = W * H;
float frame[N];
float tMin = 20, tMax = 24, tMed = 21;
int maxIdx = 0, hotCount = 0;
bool thermalOk = true;
struct HostDet { bool r, a, s; int x, y; float dc; uint32_t at; int heat; } host = {false, false, false, -1, -1, 0, 0, 0};
bool hostFresh() { return host.at && simNow - host.at < 3000; }
int hostVotes() { return hostFresh() ? host.heat : 0; }
#include "../../heat_rule.h"
HeatRule heatRule;
int heatLevel() { return hostFresh() ? host.heat : (heatRule.lead ? 1 : 0); }
bool heatSpot(int &x, int &y, float &dc) {
  if (hostFresh()) { if (host.x < 0) return false; x = host.x; y = host.y; dc = host.dc; return true; }
  if (!heatRule.lead) return false; x = heatRule.sx; y = heatRule.sy; dc = heatRule.sdc; return true;
}
volatile uint8_t page = 0;
volatile bool soundOn = true;
volatile bool phoneConnected = false;
bool wifiAlert = false, tagAlert = false;
const char *const PAGE_NAMES[] = {"HEAT", "WIFI", "LOCATOR", "TRACKERS"};
const int NUM_PAGES = 4;
struct Cand { uint8_t mac[6]; char radio; int8_t rssi; uint8_t weight; uint8_t age; char name[33]; };
const int MAX_CAND = 24;
Cand cands[MAX_CAND]; int candCount = 0; int devTotal = 0;
const int VENDOR_ALERT_PCT = 30;
enum TargetMode : uint8_t { TM_AUTO, TM_FIXED, TM_NONE };
struct Target { uint8_t mode; bool has; uint8_t mac[6]; float wifiAvg, bleAvg; uint32_t wifiLast, bleLast; int8_t candIdx; char name[33]; };
Target target = {TM_AUTO, false, {0}, 0, 0, 0, 0, -1, ""};
const char *const MODE_NAMES[] = {"auto", "fixed", "none"};
const int RSSI_FAR = -90, RSSI_CLOSE = -30;
float simRssi = -48; bool simSeen = true, simW = true, simB = false;
bool getTarget(float &r, float &w, float &b, bool &ws, bool &bs) { r = simRssi; w = simRssi; b = simRssi - 4; ws = simW; bs = simB; return simSeen && target.has; }
const char *proximityLabel(float r) { return r > -45 ? "VERY CLOSE" : r > -55 ? "CLOSE" : r > -70 ? "NEAR" : "FAR"; }
struct Tag { uint8_t mac[6]; uint8_t kind, state; int8_t rssi; uint32_t firstSeen, lastSeen, adverts; };
const int SHOW_TAG = 6;
Tag simTags[SHOW_TAG]; int simTagN = 0;
int tagSnapshot(Tag *out, int maxOut) { int n = std::min(simTagN, maxOut); for (int i = 0; i < n; i++) out[i] = simTags[i]; return n; }
const char *const TAG_NAMES[] = {"AirTag", "Find My item", "SmartTag", "Google tag", "Tile", "Chipolo", "Pebblebee", "Tracker", "Tracker", "Tracker", "Tracker"};
const char *const STATE_NAMES[] = {"?", "near", "away"};
bool tagSuspect(const Tag &t) { return t.state != 1; }
uint8_t tagWeight(const Tag &t) { static const uint8_t base[] = {85, 70, 85, 70, 60, 60, 60, 55, 55, 55, 50}; if (t.state == 1) return 20; if (t.state == 0 && t.kind <= 3) return 60; return base[t.kind]; }
void setTarget(const uint8_t *mac, const char *name, uint8_t mode, int) { memcpy(target.mac, mac, 6); snprintf(target.name, 33, "%s", name); target.mode = mode; target.has = true; }
volatile bool nextTarget = false;
volatile uint32_t toastAt = 0; const char *volatile toastMsg = "";
const uint32_t TOAST_MS = 1500;
void showToast(const char *m) { toastMsg = m; toastAt = simNow; }
const int BUZZER_PIN = 0;

#include "../../tft_ui.h"

// ---- scenes.txt drives everything (see the file for the keywords)
static void cand(int i, const char *name, char radio, int rssi, int weight) {
  Cand &c = cands[i]; memset(&c, 0, sizeof(c)); c.mac[5] = i + 1; c.radio = radio; c.rssi = rssi; c.weight = weight; snprintf(c.name, 33, "%s", name);
}
static void tagRow(int i, int kind, int state, int rssi) { Tag &t = simTags[i]; memset(&t, 0, sizeof(t)); t.mac[5] = i; t.kind = kind; t.state = state; t.rssi = rssi; t.lastSeen = simNow - 3000 * i; }
static void syntheticFrame(bool warmSpot) {
  tMin = 1e9; tMax = -1e9; float sum = 0;
  for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
    float v = 21.0f + 1.2f * sinf(x * 0.21f) * cosf(y * 0.3f) + 0.15f * ((x * 7 + y * 13) % 5 - 2);
    if (warmSpot) { float d = hypotf(x - 20, y - 9); if (d < 1.5f) v += 3.2f; else if (d < 2.5f) v += 1.2f; }
    frame[y * W + x] = v; tMin = std::min(tMin, v); if (v > tMax) { tMax = v; maxIdx = y * W + x; } sum += v;
  }
  tMed = sum / N;
  hotCount = warmSpot ? 5 : 0;
  heatRule = HeatRule();
  for (int i = 0; i < 8; i++) { heatRule.push(frame, simNow); simNow += 250; }
}
static void resetScene() {
  page = 0; soundOn = true; phoneConnected = false; wifiAlert = tagAlert = false; candCount = 0; devTotal = 0;
  target = Target{TM_AUTO, false, {0}, 0, 0, 0, 0, -1, ""}; simRssi = -48; simSeen = true; simTagN = 0; toastAt = 0;
  host = HostDet{false, false, false, -1, -1, 0, 0, 0};
  syntheticFrame(false);
}
static void save(const char *name) {
  renderAll(); push(0, 0, TW, TH);
  char path[256]; snprintf(path, sizeof(path), "out/%s.raw", name);
  FILE *f = fopen(path, "wb");
  for (int i = 0; i < SIM_W * SIM_H; i++) { uint16_t c = simPanel[i]; uint8_t rgb[3] = {(uint8_t)((c >> 8) & 0xF8), (uint8_t)((c >> 3) & 0xFC), (uint8_t)((c << 3) & 0xF8)}; fwrite(rgb, 1, 3, f); }
  fclose(f);
  fprintf(stdout, "wrote %s\n", path);
}

int main(int argc, char **argv) {
  tftSetup();
  FILE *f = fopen(argc > 1 ? argv[1] : "scenes.txt", "r");
  if (!f) { fprintf(stderr, "no scenes.txt\n"); return 1; }
  char line[256], scene[64] = ""; bool open = false;
  while (fgets(line, sizeof(line), f)) {
    char *p = line; while (*p == ' ' || *p == '\t') p++;
    size_t n = strlen(p); while (n && (p[n - 1] == '\n' || p[n - 1] == '\r' || p[n - 1] == ' ')) p[--n] = 0;
    if (!*p || *p == '#') continue;
    char key[32]; int k = 0; while (p[k] && p[k] != ' ' && k < 31) { key[k] = p[k]; k++; } key[k] = 0;
    const char *arg = p + k; while (*arg == ' ') arg++;
    if (!strcmp(key, "scene")) { if (open) save(scene); snprintf(scene, sizeof(scene), "%s", arg); resetScene(); open = true; }
    else if (!strcmp(key, "page")) page = atoi(arg);
    else if (!strcmp(key, "frame")) syntheticFrame(!strcmp(arg, "warm"));
    else if (!strcmp(key, "host")) { int lv, x, y; float dc; if (sscanf(arg, "%d %d %d %f", &lv, &x, &y, &dc) == 4) host = HostDet{true, lv >= 2, false, x, y, dc, simNow, lv}; }
    else if (!strcmp(key, "cand")) { char r; int rssi, w; char name[64] = ""; if (sscanf(arg, "%c %d %d %63[^\n]", &r, &rssi, &w, name) >= 3 && candCount < MAX_CAND) cand(candCount++, name, r, rssi, w); }
    else if (!strcmp(key, "target")) { if (!strcmp(arg, "none")) { target.has = false; target.mode = TM_NONE; } else { int i = atoi(arg); if (i < candCount) setTarget(cands[i].mac, cands[i].name, TM_FIXED, i); } }
    else if (!strcmp(key, "rssi")) simRssi = atof(arg);
    else if (!strcmp(key, "seen")) simSeen = atoi(arg);
    else if (!strcmp(key, "tag")) { int kind, st, rssi; if (sscanf(arg, "%d %d %d", &kind, &st, &rssi) == 3 && simTagN < SHOW_TAG) tagRow(simTagN++, kind, st, rssi); }
    else if (!strcmp(key, "alert")) { if (!strcmp(arg, "wifi")) wifiAlert = true; else if (!strcmp(arg, "tag")) tagAlert = true; else wifiAlert = tagAlert = false; }
    else if (!strcmp(key, "app")) phoneConnected = atoi(arg);
    else if (!strcmp(key, "sound")) soundOn = atoi(arg);
    else if (!strcmp(key, "toast")) { static char t[64]; snprintf(t, sizeof(t), "%s", arg); showToast(t); }
    else if (!strcmp(key, "devices")) devTotal = atoi(arg);
    else fprintf(stderr, "scenes.txt: unknown key '%s'\n", key);
  }
  if (open) save(scene);
  fclose(f);
  return 0;
}
