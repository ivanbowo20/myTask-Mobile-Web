export const GALAXY_VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const GALAXY_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uF;
uniform float uMobile;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

// ---- Fast Deterministic Hash & Procedural Noise (WebGL 1.0 Safe) ----------
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// Fast algebraic power helpers (eliminates expensive SFU pow() on PowerVR GE8322)
float fastPow15(float x) {
  float c = max(x, 0.0);
  return c * sqrt(c + 0.00001);
}

float fastPow25(float x) {
  float c = max(x, 0.0);
  return c * c * sqrt(c + 0.00001);
}

// Adaptive FBM: 4 octaves on Desktop, 2 octaves on Mobile (uniform-coherent, WebGL 1.0 safe)
float fbmAdaptive(vec2 p) {
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  float s = 0.52 * noise2(p);
  p = m * p * 2.04 + vec2(13.7, 7.3);
  s += 0.26 * noise2(p);
  if (uMobile < 0.5) {
    p = m * p * 2.04 + vec2(13.7, 7.3);
    s += 0.13 * noise2(p);
    p = m * p * 2.04 + vec2(13.7, 7.3);
    s += 0.065 * noise2(p);
    return s;
  }
  return s * 1.24;
}

// Lightweight 3-octave (Desktop) / 2-octave (Mobile) FBM for dust & nebula
float fbmLight(vec2 p) {
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  float s = 0.55 * noise2(p);
  p = m * p * 2.08 + vec2(5.1, 11.9);
  s += 0.275 * noise2(p);
  if (uMobile < 0.5) {
    p = m * p * 2.08 + vec2(5.1, 11.9);
    s += 0.1375 * noise2(p);
    return s;
  }
  return s * 1.16;
}

// ---- Pass 1: Deep Midnight-Blue Left Cosmos (Gently Enriched) + Nebula ----
vec3 deepSpaceBackdrop(vec2 uv, vec2 p, float t) {
  float leftBlue = smoothstep(0.64, -0.06, uv.x) * (0.64 + 0.36 * smoothstep(0.95, 0.04, uv.y));
  float rightWarm = smoothstep(0.62, 1.05, uv.x) * smoothstep(-0.05, 0.68, uv.y);

  vec3 col = vec3(0.006, 0.008, 0.019);
  // Gently enriched royal midnight blue on the left to harmonize with bright sapphire hero stars
  col += vec3(0.028, 0.088, 0.295) * fastPow15(leftBlue);
  col += vec3(0.032, 0.019, 0.009) * mix(fastPow15(rightWarm), rightWarm * rightWarm, 0.40);

  vec2 nebUv = p * 1.42 + vec2(t * 0.003, -t * 0.002);
  float neb1 = fbmLight(nebUv);
  float neb2 = fbmLight(nebUv * 1.75 - vec2(t * 0.004, t * 0.0025) + neb1 * 0.72);
  float mist = smoothstep(0.34, 0.84, neb2);

  col += vec3(0.024, 0.044, 0.112) * mist * (0.48 + 0.52 * leftBlue);
  col += vec3(0.034, 0.022, 0.042) * smoothstep(0.46, 0.90, neb1) * 0.24;
  return col;
}

// ---- Pass 2: Background Starfield + Ultra-Light 1-Cell Hero Bright Stars --
vec3 starLayer(vec2 p, float scale, float density, float t, vec2 drift, float seed) {
  vec2 sp = p * scale + drift * t;
  vec2 id = floor(sp);
  vec2 f = fract(sp) - 0.5;

  float rnd = hash21(id + seed);
  if (rnd < density) return vec3(0.0);

  vec2 jitter = (hash22(id + seed * 1.7 + 19.3) - 0.5) * 0.74;
  float dist = length(f - jitter);

  float mag = hash21(id + seed * 2.3 + 41.7);
  float phase = hash21(id + seed * 3.1 + 73.1) * TWO_PI;
  float rate = 0.9 + hash21(id + seed * 4.7 + 11.9) * 1.7;
  float twinkle = 0.60 + 0.40 * sin(t * rate + phase);

  float radius = 0.055 + mag * 0.072;
  float core = smoothstep(radius, 0.0, dist);
  float halo = exp(-dist * (18.5 - mag * 7.0)) * 0.36 * mag * mag;

  float temp = hash21(id + seed * 5.9 + 97.3);
  vec3 tint = mix(vec3(0.58, 0.78, 1.0), vec3(0.99, 0.96, 0.93), smoothstep(0.0, 0.58, temp));
  tint = mix(tint, vec3(1.0, 0.75, 0.44), smoothstep(0.72, 1.0, temp));

  return tint * (core * 0.94 + halo) * twinkle * (0.34 + 0.76 * mag);
}

// Ultra-lightweight 1-cell pass (0 FBM, 0 pow) for radiant sapphire-blue, diamond-white & amber hero stars
vec3 heroStarLayer(vec2 p, float scale, float density, float t, vec2 drift, float seed) {
  vec2 sp = p * scale + drift * t;
  vec2 id = floor(sp);
  vec2 f = fract(sp) - 0.5;

  float rnd = hash21(id + seed);
  if (rnd < density) return vec3(0.0);

  // Tight jitter keeps optical bloom 100% inside the cell boundary (zero square clipping!)
  vec2 jitter = (hash22(id + seed * 2.1 + 31.7) - 0.5) * 0.42;
  float dist = length(f - jitter);
  if (dist > 0.34) return vec3(0.0);

  float mag = hash21(id + seed * 3.3 + 17.9);
  float phase = hash21(id + seed * 4.1 + 59.3) * TWO_PI;
  float rate = 0.75 + hash21(id + seed * 5.3 + 83.1) * 1.35;
  float twinkle = 0.76 + 0.24 * sin(t * rate + phase);

  // Crisp optical pinpoint core + velvety telescope radial bloom
  float pinpoint = smoothstep(0.048 + mag * 0.022, 0.0, dist);
  float innerGlow = exp(-dist * (22.0 - mag * 6.0));
  float outerBloom = exp(-dist * (8.8 - mag * 2.0)) * smoothstep(0.34, 0.08, dist);

  // Spectral distribution inspired by reference: ~44% bright sapphire-blue, ~34% diamond-white, ~22% warm amber
  float temp = hash21(id + seed * 7.1 + 109.7);
  vec3 haloTint;
  vec3 coreTint;
  if (temp < 0.44) {
    // Luminous sapphire / cobalt-blue supergiant
    haloTint = mix(vec3(0.28, 0.56, 1.0), vec3(0.52, 0.76, 1.0), temp * 2.2);
    coreTint = vec3(0.92, 0.96, 1.0);
  } else if (temp < 0.78) {
    // Crisp diamond-white star
    haloTint = vec3(0.84, 0.90, 1.0);
    coreTint = vec3(1.0, 0.99, 0.98);
  } else {
    // Warm golden-amber giant
    haloTint = vec3(1.0, 0.62, 0.28);
    coreTint = vec3(1.0, 0.93, 0.80);
  }

  float intensity = (0.58 + 0.58 * mag) * twinkle;
  return (coreTint * (pinpoint * 1.12 + innerGlow * 0.48) + haloTint * (innerGlow * 0.45 + outerBloom * 0.34)) * intensity;
}

vec3 starfield3D(vec2 p, float t) {
  vec3 stars = vec3(0.0);
  // Dense crisp background starfield (active on Desktop & Mobile)
  stars += starLayer(p, 35.0, 0.906, t * 0.85, vec2(0.022, 0.008), 37.0) * 0.78;
  stars += starLayer(p, 16.5, 0.946, t * 0.95, vec2(0.040, 0.014), 91.0) * 1.02;
  // Ultra-light 1-cell radiant hero stars (blue supergiants, diamond-white, amber) — active on Desktop & Mobile!
  stars += heroStarLayer(p, 8.6, 0.815, t, vec2(0.032, 0.011), 143.0) * 1.08;

  if (uMobile < 0.5) {
    // Extra fine distant star carpet + secondary mid-bright hero sparkle on Desktop
    stars += starLayer(p, 68.0, 0.895, t * 0.75, vec2(0.012, 0.004), 1.0) * 0.52;
    stars += heroStarLayer(p, 13.8, 0.875, t * 1.05, vec2(0.024, 0.009), 229.0) * 0.72;
  }
  return stars;
}

// ---- Pass 3: Close-Up Colossal Starry Spiral Galaxy (Serene 40% Rotation) --
vec3 galacticStarLayer(vec2 gp, float scale, float density, float t, float seed, float armMask, float radMask, float r) {
  vec2 sp = gp * scale;
  vec2 id = floor(sp);
  vec2 f = fract(sp) - 0.5;

  float rnd = hash21(id + seed);
  // Richer stellar density along the spiral arms & dusty silver-blue tendrils
  float localThresh = mix(density + 0.08, density - 0.16, clamp(armMask, 0.0, 1.0));
  if (rnd < localThresh) return vec3(0.0);

  vec2 jit = (hash22(id + seed * 1.9 + 27.4) - 0.5) * 0.72;
  float d = length(f - jit);

  float mag = hash21(id + seed * 2.7 + 61.3);
  float phase = hash21(id + seed * 3.5 + 14.9) * TWO_PI;
  float rate = 0.95 + hash21(id + seed * 4.3 + 82.1) * 1.85;
  float tw = 0.66 + 0.34 * sin(t * rate + phase);

  float starRad = 0.105 + mag * 0.105;
  float pinpoint = smoothstep(starRad, 0.0, d);
  float glow = exp(-d * (14.2 - mag * 4.5)) * 0.30 * mag * mag;

  // Inner warm golden-cream stars transitioning outward to crisp ice-blue & silver-white OB stars
  float temp = hash21(id + seed * 6.1 + 43.7);
  vec3 innerPop = mix(vec3(1.0, 0.91, 0.74), vec3(1.0, 0.78, 0.50), temp);
  vec3 outerPop = mix(vec3(0.62, 0.80, 1.0), vec3(0.98, 0.97, 0.95), smoothstep(0.18, 0.74, temp));
  outerPop = mix(outerPop, vec3(1.0, 0.78, 0.48), smoothstep(0.84, 1.0, temp));
  vec3 tint = mix(innerPop, outerPop, smoothstep(0.14, 0.46, r));

  return tint * (pinpoint * 1.15 + glow) * tw * (0.45 + 0.85 * mag) * radMask;
}

vec3 spiralGalaxy(vec2 p, vec2 center, float scale, float t, out float dustOcclude) {
  vec2 d = (p - center) * scale;

  // Iconic graceful oval inclination (~13 deg) matching Triple Galactic close-up framing
  vec2 tilted = rot2(0.22) * d;
  vec2 g = vec2(tilted.x * 1.54, tilted.y * 0.90);

  float r = length(g);
  dustOcclude = 0.0;
  if (r > 0.88) return vec3(0.0);

  // Serene, meditative cosmic rotation (~40% of previous speed — zero pulsing, zero grid shearing!)
  float rotAngle = t * 0.046;
  vec2 gRot = rot2(-rotAngle) * g;
  float angle = atan(gRot.y, gRot.x);
  float logR = log(r + 0.056);

  // Rich multi-strand logarithmic spiral structure: grand arms + secondary arms + delicate fibrous spurs
  float spiralPhase = angle + logR * 4.45;
  float mainArms = 0.5 + 0.5 * cos(spiralPhase * 2.0);
  float subArms = 0.5 + 0.5 * cos(spiralPhase * 3.0 + 1.40);
  float fineSpur = 0.5 + 0.5 * cos(spiralPhase * 5.0 - 0.75);
  float microRib = 0.5 + 0.5 * cos(spiralPhase * 7.0 + 2.1);

  float mainP = mix(fastPow15(mainArms), mainArms * mainArms, 0.30);
  float subP = fastPow25(subArms);
  float spurP = fineSpur * fineSpur * fineSpur;
  float armProfile = mainP * 0.74 + subP * 0.28 + spurP * 0.14 + (microRib * microRib) * 0.07;

  // Co-rotating organic interstellar dust & fibrous silver-blue star clouds
  float cloud1 = fbmAdaptive(gRot * 8.6 + vec2(r * 2.4, -r * 1.8));
  float cloud2 = fbmLight(gRot * 17.8 + vec2(cloud1 * 1.45, -cloud1 * 1.15));
  float ridgedBase = 1.0 - abs(cloud2 * 2.0 - 1.0);
  float ridged = ridgedBase * ridgedBase;

  float diskEnv = exp(-r * 2.95) * smoothstep(0.87, 0.26, r);
  float outerDisk = smoothstep(0.07, 0.24, r) * diskEnv;

  // Sharp dark brown-ochre dust lanes wrapping closely around the elliptical golden core & inner arms
  float dustPhase = 0.5 + 0.5 * cos((spiralPhase - 0.42) * 2.0);
  float dustSecondary = 0.5 + 0.5 * cos((spiralPhase - 0.16) * 4.0 + cloud1 * 2.5);
  float coreRingD = (r - 0.175) * 11.5;
  float coreDustRing = exp(-coreRingD * coreRingD) * smoothstep(0.28, 0.74, cloud1 * 0.6 + ridged * 0.55);
  float dustMainP = fastPow25(dustPhase);
  float dustSecP = dustSecondary * dustSecondary * dustSecondary;
  float dustFilaments = ((dustMainP * 0.86 + dustSecP * 0.38) * smoothstep(0.24, 0.74, cloud1 * 0.62 + ridged * 0.54)
                      * smoothstep(0.065, 0.15, r) * exp(-r * 2.35))
                      + coreDustRing * 0.44;
  dustOcclude = clamp(dustFilaments * 0.94, 0.0, 0.86);

  // Larger, velvety golden-cream elliptical core (100% steady — gentle falloff that never glares behind cards)
  float coreInner = exp(-r * r * 28.0);
  float coreBulge = exp(-r * 4.95) * (0.86 + 0.14 * cloud1);
  // Subtle dusty texture softly hugging the outer perimeter of the golden core
  float coreEdgeTexture = 1.0 - smoothstep(0.07, 0.22, r) * (1.0 - cloud2) * 0.22;

  vec3 coreCol = vec3(1.0, 0.91, 0.74) * coreInner * 1.02;
  coreCol += vec3(0.93, 0.72, 0.45) * coreBulge * coreEdgeTexture * 0.82;

  // Rich astronomical color transition: warm gold-amber inner -> dusty silver-ochre mid -> fibrous silver-blue outer
  vec3 innerArmCol = vec3(0.90, 0.68, 0.44);
  vec3 midArmCol = vec3(0.70, 0.70, 0.80);
  vec3 outerArmCol = vec3(0.54, 0.70, 0.98);

  vec3 armTint = mix(innerArmCol, midArmCol, smoothstep(0.14, 0.34, r));
  armTint = mix(armTint, outerArmCol, smoothstep(0.28, 0.60, r));

  // Fibrous detail boost in outer silver-blue arms
  float fiberDetail = 0.46 + 0.68 * cloud2 + 0.26 * ridged;
  float armLuminance = outerDisk * (0.18 + 0.92 * armProfile) * fiberDetail;
  vec3 armsCol = armTint * armLuminance * 0.94;

  // PowerVR GE8322 Optimization: Early-skip micro-star grid hashes inside dense bright core (r <= 0.085)!
  vec3 galStars = vec3(0.0);
  if (r > 0.085 && r < 0.84) {
    float starRadEnv = smoothstep(0.085, 0.20, r) * smoothstep(0.84, 0.22, r) * exp(-r * 1.85);
    float armStarWeight = clamp(armProfile * 0.98 + exp(-r * 4.8) * 0.48, 0.0, 1.0);

    // Layer A: Dense medium rotating star clusters along spiral arms (Desktop & Mobile)
    galStars += galacticStarLayer(gRot, 58.0, 0.75, t, 19.3, armStarWeight, starRadEnv, r) * 1.05;
    // Layer B: Fine glittering star-dust carpet rotating cleanly with fibrous arms (Desktop & Mobile)
    galStars += galacticStarLayer(gRot, 112.0, 0.62, t * 1.08, 71.7, armStarWeight, starRadEnv, r) * 0.86;

    if (uMobile < 0.5) {
      // Layer C (Desktop): Ultra-fine thousands of micro-star dust sparkles
      vec2 gRotSlow = rot2(-rotAngle * 0.95) * g;
      galStars += galacticStarLayer(gRotSlow, 152.0, 0.56, t * 0.85, 131.5, armStarWeight, starRadEnv, r) * 0.62;
      // Layer D (Desktop): Crisp luminous OB-star knots embedded in outer spiral tendrils
      galStars += galacticStarLayer(gRot, 32.0, 0.84, t * 1.15, 211.9, armProfile, outerDisk * 1.48, r) * 1.22;
    }
  }

  // Combine velvety steady core + fibrous spiral arms + sharp rotating stars + dark dust-lane absorption
  vec3 total = coreCol + armsCol + galStars;
  total *= (1.0 - clamp(dustFilaments * 0.80, 0.0, 0.80));
  // Subtle warm backlit umber-ochre rim along dark dust filaments
  total += vec3(0.32, 0.16, 0.06) * dustFilaments * exp(-r * 2.8) * 0.52;

  return total;
}

// ---- Pass 4: Dimmed Harmonized Right Dust Stream (Early-Out Left 64%) -----
void applyRightDustStream(inout vec3 col, vec2 uv, vec2 p, float t, float isPortrait) {
  if (uv.x < 0.64) return;

  float edgePos = mix(0.90, 0.94, isPortrait);
  float tilt = mix(0.20, 0.13, isPortrait);
  float d = (uv.x - edgePos) + (0.5 - uv.y) * tilt;

  float flowT = t * 0.032;
  vec2 warpCoord = vec2(p.x * 3.2 - flowT * 0.35, p.y * 2.5 - flowT);
  float w1 = fbmLight(warpCoord);
  float w2 = fbmAdaptive(warpCoord * 1.55 + vec2(w1 * 0.95, -flowT * 0.6));

  float ribbon = d + (w1 - 0.5) * 0.13 + (w2 - 0.5) * 0.06;

  float upperBias = smoothstep(0.10, 0.68, uv.y);
  float rightFade = smoothstep(0.66, 0.97, uv.x) * (0.35 + 0.65 * upperBias);

  float halo = exp(-ribbon * ribbon * 34.0) * (0.52 + 0.58 * w2) * rightFade;
  float spineD = (ribbon - 0.022) * 18.0;
  float spine = exp(-spineD * spineD) * smoothstep(0.30, 0.78, w2) * rightFade;

  vec3 warmGlow = mix(vec3(0.52, 0.30, 0.13), vec3(0.84, 0.64, 0.38), smoothstep(0.35, 0.85, w2));
  col += warmGlow * halo * 0.25;
  col = mix(col, vec3(0.18, 0.09, 0.038) + warmGlow * 0.12, clamp(spine * 0.45, 0.0, 0.45));
}

// ---- Pass 5: Sleek Periodic Shooting Stars / Meteors (Every ~6-8s) --------
vec3 singleMeteor(vec2 p, float t, float period, float timeOffset, float seedBase) {
  float cycleIdx = floor((t + timeOffset) / period);
  float localT = mod(t + timeOffset, period);
  float duration = 1.02;
  if (localT > duration) return vec3(0.0);

  float prog = localT / duration;
  float env = smoothstep(0.0, 0.14, prog) * smoothstep(1.0, 0.44, prog);

  vec2 rnd = hash22(vec2(cycleIdx + seedBase, seedBase * 3.7));
  vec2 startPos = vec2((rnd.x - 0.55) * 1.15, 0.16 + rnd.y * 0.30);
  float dirSign = rnd.x > 0.46 ? -1.0 : 1.0;
  vec2 dir = normalize(vec2(dirSign * 0.88, -0.47));

  vec2 headPos = startPos + dir * (prog * 0.50);
  vec2 rel = p - headPos;
  float along = dot(rel, dir);
  float perp = abs(dot(rel, vec2(-dir.y, dir.x)));

  float tailLen = 0.20;
  if (along > 0.012 || along < -tailLen) return vec3(0.0);

  float tailFactor = smoothstep(-tailLen, 0.0, along) * smoothstep(0.012, -0.002, along);
  float beamWidth = mix(0.0005, 0.0019, tailFactor);
  float streak = exp(-perp / beamWidth) * fastPow15(tailFactor) * env;
  float headGlow = exp(-length(rel) * 170.0) * env;

  vec3 col = mix(vec3(0.76, 0.85, 1.0), vec3(1.0, 0.95, 0.86), tailFactor);
  return col * (streak * 0.88 + headGlow * 1.10);
}

vec3 meteorShower(vec2 p, float t) {
  vec3 m = vec3(0.0);
  m += singleMeteor(p, t, 7.6, 1.9, 11.0);
  m += singleMeteor(p, t, 14.3, 8.7, 57.0);
  return m;
}

// ---- Pass 6: Colossal Close-Up Silhouette Ringed Gas Giant (100% Preserved)
vec3 toPlanetFrame(vec3 v) {
  vec2 rxy = rot2(-0.49) * v.xy;
  v.xy = rxy;
  vec2 ryz = rot2(0.255) * v.yz;
  v.yz = ryz;
  return v;
}

vec3 renderSilhouetteRingedPlanet(vec3 bgCol, vec2 lp, float pd, float pxAA, vec2 center, float R, vec2 lightTarget, float t) {
  if (pd > R * 2.65) return bgCol;

  vec2 toLightXY = normalize(lightTarget - center);
  vec3 L = normalize(vec3(toLightXY * 0.94, -0.34));
  vec3 Lloc = normalize(toPlanetFrame(L));

  vec3 roL = toPlanetFrame(vec3(lp, 0.0));
  vec3 rdL = toPlanetFrame(vec3(0.0, 0.0, -1.0));

  float ringAlpha = 0.0;
  vec3 ringCol = vec3(0.0);
  float ringZ = -10.0;

  if (abs(rdL.y) > 0.001) {
    float tHit = -roL.y / rdL.y;
    vec3 hitL = roL + rdL * tHit;
    float rr = length(hitL.xz) / R;
    ringZ = -tHit;

    bool isHiddenBackRing = (ringZ < 0.0) && (pd < R - pxAA);
    if (!isHiddenBackRing && rr > 1.22 && rr < 2.52) {
      float ringAngle = atan(hitL.z, hitL.x);

      float cRing = smoothstep(1.22, 1.35, rr) * (1.0 - smoothstep(1.48, 1.54, rr)) * 0.26;
      float bRing = smoothstep(1.47, 1.55, rr) * (1.0 - smoothstep(1.89, 1.93, rr)) * 0.84;
      float aRing = smoothstep(2.01, 2.06, rr) * (1.0 - smoothstep(2.42, 2.52, rr)) * 0.62;
      float enckeGap = 1.0 - 0.65 * smoothstep(2.28, 2.30, rr) * (1.0 - smoothstep(2.31, 2.33, rr));
      aRing *= enckeGap;

      float ringlets = 0.72 + 0.28 * sin(rr * 115.0 + 0.5) * (0.72 + 0.28 * cos(rr * 240.0));
      float microGrain = 0.90 + 0.10 * sin(rr * 390.0);
      float baseDensity = (cRing + bRing + aRing) * ringlets * microGrain;

      float shimmer1 = 0.5 + 0.5 * sin(ringAngle * 5.0 - t * 0.34 + rr * 12.0);
      float shimmer2 = 0.5 + 0.5 * sin(ringAngle * 11.0 - t * 0.52 - rr * 22.0);
      float icySparkle = 0.86 + 0.22 * shimmer1 * (0.62 + 0.38 * shimmer2);

      vec3 rTone = mix(vec3(0.42, 0.34, 0.28), vec3(0.84, 0.75, 0.64), smoothstep(1.36, 1.85, rr));
      rTone = mix(rTone, vec3(0.68, 0.64, 0.60), smoothstep(2.00, 2.48, rr));
      float sunSide = smoothstep(-0.35, 0.85, dot(normalize(hitL.xz + vec2(1e-5)), normalize(Lloc.xz + vec2(1e-5))));
      rTone *= (0.72 + 0.38 * sunSide);

      float shadowFactor = 1.0;
      float projL = dot(hitL, Lloc);
      if (projL < 0.0) {
        vec3 perpV = hitL - Lloc * projL;
        float perpD = length(perpV) / R;
        shadowFactor = smoothstep(0.975, 1.028, perpD);
        shadowFactor = mix(0.025, 1.0, shadowFactor);
      }

      ringCol = rTone * icySparkle * shadowFactor;
      ringAlpha = clamp(baseDensity * 0.72, 0.0, 0.78);
    }
  }

  float planetMask = 1.0 - smoothstep(R - pxAA, R + pxAA, pd);
  vec3 planetCol = vec3(0.0);

  if (planetMask > 0.001) {
    float pz = sqrt(max(0.0, R * R - min(pd * pd, R * R)));
    vec3 N = normalize(vec3(lp, pz));
    vec3 Nloc = normalize(toPlanetFrame(N));

    float ndotl = dot(N, L);
    float viewZ = max(N.z, 0.0);
    float omz = max(1.0 - viewZ, 0.0);
    float omzSqrt = sqrt(omz + 0.00001);
    float omz2 = omz * omz;
    float omz4 = omz2 * omz2;
    float omz8 = omz4 * omz4;

    vec3 nightSilhouette = vec3(0.008, 0.010, 0.017) + vec3(0.006, 0.009, 0.018) * omz;

    vec3 crescentTerm = vec3(0.0);
    float rimMask = smoothstep(-0.22, 0.42, ndotl);
    float ringShadowOnCrescent = 1.0;

    if (ndotl > -0.22) {
      if (abs(Lloc.y) > 0.001 && ndotl > -0.1) {
        float tRingS = -Nloc.y / Lloc.y;
        if (tRingS > 0.0) {
          vec3 pRingHit = Nloc + Lloc * tRingS;
          float prr = length(pRingHit.xz);
          if (prr > 1.32 && prr < 2.45) {
            float gap = smoothstep(1.90, 1.94, prr) * (1.0 - smoothstep(1.98, 2.02, prr));
            ringShadowOnCrescent = mix(0.42, 1.0, gap);
          }
        }
      }

      if (ndotl > -0.04) {
        float lat = Nloc.y;
        float lon = atan(Nloc.z, Nloc.x) + t * 0.045;
        float bandShift = fbmLight(vec2(lon * 2.2, lat * 6.0)) * 0.14;
        float bands = 0.5 + 0.5 * sin(lat * 13.0 + bandShift * 4.5);
        float crescentDiffuse = smoothstep(-0.04, 0.34, ndotl) * (omz * omzSqrt);
        vec3 crescentAlbedo = mix(vec3(0.54, 0.33, 0.18), vec3(0.95, 0.78, 0.54), bands);
        crescentTerm = crescentAlbedo * crescentDiffuse * ringShadowOnCrescent * 0.72;
      }
    }

    float rimPow = omz4 * omzSqrt;
    float rimHot = omz8 * omz;
    vec3 atmoRim = mix(vec3(0.88, 0.56, 0.28), vec3(1.0, 0.88, 0.68), rimHot)
                 * rimPow * rimMask * 1.18 * ringShadowOnCrescent;

    float darkRim = (omz4 * omz2 * omz * omzSqrt) * (1.0 - rimMask) * 0.11;
    vec3 subtleBlueEdge = vec3(0.18, 0.28, 0.52) * darkRim;

    planetCol = nightSilhouette + crescentTerm + atmoRim + subtleBlueEdge;
  }

  vec3 res = bgCol;

  if (ringAlpha > 0.001 && ringZ < 0.0) {
    res = mix(res, ringCol, ringAlpha);
  }

  if (planetMask < 0.999) {
    float outsideDist = max(pd - R, 0.0);
    float outerAtmo = exp(-outsideDist * (26.0 / max(R / 0.36, 0.65))) * smoothstep(R * 1.32, R, pd);
    float sunAlign = smoothstep(-0.18, 0.82, dot(normalize(lp + vec2(1e-5)), toLightXY));
    vec3 outerGlowCol = mix(vec3(0.75, 0.42, 0.18), vec3(1.0, 0.84, 0.58), exp(-outsideDist * 75.0))
                      * outerAtmo * sunAlign * 0.42;
    res += outerGlowCol * (1.0 - planetMask);
  }

  res = mix(res, planetCol, planetMask);

  if (ringAlpha > 0.001 && ringZ >= 0.0) {
    res = mix(res, ringCol, ringAlpha);
  }

  return res;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float invResY = 1.0 / max(uRes.y, 1.0);
  float asp = uRes.x * invResY;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) * invResY;

  // Smooth adaptive framing:
  // Desktop: Colossal close-up galaxy (+42% closer) upper-left-center + silhouette planet lower-right (preserved)
  // Portrait Mobile: Colossal close-up galaxy (+38% closer) upper-center + silhouette planet lower-right (preserved)
  float isPortrait = smoothstep(1.02, 0.70, asp);

  vec2 galCenter = mix(vec2(-0.04 * asp, 0.065), vec2(-0.02, 0.235), isPortrait);
  float galScale = mix(0.74, 1.06, isPortrait);

  // Planet silhouette coordinates & radius preserved 100% identically
  vec2 planetCenter = mix(vec2(0.475 * asp, -0.44), vec2(0.45 * asp + 0.04, -0.45), isPortrait);
  float planetR = mix(0.365, 0.275, isPortrait);

  vec2 planetLP = p - planetCenter;
  float planetDist = length(planetLP);
  float pxAA = 1.8 * invResY;

  vec3 col = vec3(0.0);

  // Early-skip ALL 5 background passes for pixels strictly hidden behind the opaque silhouette planet
  if (planetDist > planetR - pxAA) {
    // 1. Gently enriched midnight-blue left cosmos & subtle living nebula
    col = deepSpaceBackdrop(uv, p, uTime);

    // 2. Crisp starfield + ultra-lightweight 1-cell radiant hero stars (sapphire-blue, diamond-white, amber)
    vec3 stars = starfield3D(p, uTime);

    // 3. Close-up colossal starry spiral galaxy with serene 40% rotation speed
    float galDustOcclude = 0.0;
    vec3 galaxy = spiralGalaxy(p, galCenter, galScale, uTime, galDustOcclude);

    col += stars * (1.0 - galDustOcclude * 0.68);
    col += galaxy;

    // 4. Dimmed harmonized ochre dust stream on far right edge (early-out left 64%)
    applyRightDustStream(col, uv, p, uTime, isPortrait);

    // 5. Sleek periodic shooting stars / meteors (every ~6-8s)
    col += meteorShower(p, uTime);
  }

  // 6. Colossal Close-Up Silhouette Ringed Gas Giant (100% preserved)
  col = renderSilhouetteRingedPlanet(col, planetLP, planetDist, pxAA, planetCenter, planetR, galCenter, uTime);

  // 7. Filmic contrast curve + subtle vignette + integrated WCAG AA vertical scrim (Zero Chrome Overdraw)
  col = (col / (1.0 + col * 0.20)) * 1.035;

  float vig = smoothstep(1.44, 0.48, length((uv - 0.5) * vec2(1.05, 0.96)));
  col *= mix(0.85, 1.0, vig);

  float scrimAlpha = uv.y > 0.5
    ? mix(0.20, 0.10, (uv.y - 0.5) * 2.0)
    : mix(0.48, 0.20, uv.y * 2.0);
  col *= (1.0 - scrimAlpha);

  float dither = (hash21(gl_FragCoord.xy + uF * 19.13) - 0.5) * 0.011;
  col += dither;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
