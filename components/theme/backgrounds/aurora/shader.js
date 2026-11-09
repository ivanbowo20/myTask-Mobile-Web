export const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// All animation is driven by uP (0..2pi) and only uses integer multiples of it,
// so the scene loops perfectly when uP wraps.
export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uP;
uniform float uF;

const float H = 0.36;                       // horizon line
const vec3 EMERALD = vec3(0.1765, 0.6941, 0.3608); // #2DB15C
const vec3 CLOVER  = vec3(0.4745, 0.8078, 0.4039); // #79CE67

float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float noise1(float x){ float i=floor(x), f=fract(x); float u=f*f*(3.-2.*f); return mix(hash11(i), hash11(i+1.), u); }
float noise2(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
}
float fbm2(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise2(p); p=p*2.03+7.1; a*=.5; } return s; }

float ridge(float x, float seed){
  float h=0., a=.5, f=1.;
  for(int i=0;i<5;i++){
    float n = noise1(x*f+seed);
    n = 1.-abs(2.*n-1.);
    h += a*n*n;
    a *= .5; f *= 2.2;
  }
  return h;
}
float backH(float x){ return H + 0.05 + 0.44*ridge(x*1.25, 3.7); }
float frontH(float x){ return H + 0.012 + 0.2*ridge(x*1.9+11., 9.3); }

// ---- Aurora ---------------------------------------------------------------
vec3 aurora(vec2 p){
  vec3 acc = vec3(0.);
  float x = p.x;
  for(int i=0;i<3;i++){
    float fi = float(i);
    float wave = 0.07*sin(x*1.7 + fi*2.0 + uP)
               + 0.035*sin(x*3.9 - fi + 2.*uP + 1.3)
               + 0.018*sin(x*7.3 + fi*3. + 3.*uP);
    float yc = 0.57 + fi*0.075 + wave + 0.03*sin(uP + fi*1.7);
    float d = p.y - yc;
    float f = d > 0. ? exp(-d*(6.5 - fi*1.2)) : exp(d*42.);
    float rays = 0.45 + 0.55*noise1(x*42. + wave*55. + fi*17. + 2.5*sin(uP + fi));
    rays = mix(1., rays, smoothstep(-0.02, 0.18, d)*0.7 + 0.3);
    float br  = 0.62 + 0.38*sin(2.*uP + fi*2.1 + x*0.9);
    float env = 0.18 + 0.82*(0.5 + 0.5*sin(x*1.25 + uP + fi*1.9));
    float inten = f*rays*br*env;
    vec3 col = mix(EMERALD, CLOVER, exp(-max(d,0.)*8.));
    acc += col*inten*(0.95 - fi*0.14);
  }
  return 1. - exp(-acc*1.35);
}

// ---- Sky ------------------------------------------------------------------
vec3 stars(vec2 p){
  const float N = 230.;
  vec2 q = p*N;
  vec2 id = floor(q);
  vec2 f = fract(q);
  float h = hash21(id);
  if(h < 0.965) return vec3(0.);
  vec2 pos = vec2(hash21(id+3.1), hash21(id+7.7))*0.6+0.2;
  float d = length(f-pos);
  float mag = hash21(id+11.3);
  float k = floor(hash21(id+5.5)*4.)+1.;
  float tw = 0.78 + 0.22*sin(k*uP + hash21(id+1.7)*6.283);
  float s = smoothstep(0.30 + mag*0.2, 0.0, d) * (0.35 + 0.65*mag) * tw;
  vec3 tint = mix(vec3(0.75,0.85,1.0), vec3(1.0,0.93,0.82), hash21(id+9.1));
  return tint*s;
}

vec3 sky(vec2 p, out float aurLum){
  float t = smoothstep(H, 1.0, p.y);
  vec3 col = mix(vec3(0.022,0.05,0.062), vec3(0.003,0.008,0.022), pow(t, 0.6));
  // faint milky band
  float band = exp(-pow((p.y - 0.95 + 0.38*(p.x-0.6))*3.2, 2.));
  col += vec3(0.02,0.03,0.045)*band*(0.4+0.8*fbm2(p*6.));
  vec3 a = aurora(p);
  aurLum = max(a.g, 0.);
  col += a;
  col += stars(p)*(1. - min(aurLum*0.9, 0.75));
  return col;
}

vec3 aurGlow(float x){
  float wave = 0.5 + 0.5*sin(x*2.1 + uP);
  return mix(EMERALD, CLOVER, 0.45) * (0.32 + 0.28*wave);
}

// ---- Scene above the waterline (mountains + sky) ---------------------------
vec3 scene(vec2 p){
  float px = 1.5/uRes.y;
  float al;
  vec3 col = sky(p, al);

  float e = 0.004;
  float hb = backH(p.x);
  float mb = 1. - smoothstep(hb-px, hb+px, p.y);
  if(mb > 0.001){
    float s = (backH(p.x+e) - backH(p.x-e))/(2.*e);
    float shade = 0.55 + 0.45*clamp(s*0.35, -1., 1.);
    float rel = (p.y-H)/max(hb-H, 0.001);
    float grain = fbm2(vec2(p.x*26., p.y*9.));
    float gul = noise2(vec2(p.x*70., p.y*3.));
    float snow = smoothstep(0.38, 0.62, rel + (grain-0.5)*0.42 - (gul-0.5)*0.12);
    vec3 glow = aurGlow(p.x);
    vec3 rock = vec3(0.022,0.032,0.046)*(0.6+shade);
    vec3 sn   = vec3(0.20,0.27,0.33)*(0.45+shade*0.8);
    vec3 m = mix(rock, sn, snow);
    m += glow*0.07*(0.4+snow);
    float haze = exp(-(p.y-H)*7.)*0.55;
    m = mix(m, vec3(0.035,0.08,0.085), haze);
    col = mix(col, m, mb);
  }

  float hf = frontH(p.x);
  float mf = 1. - smoothstep(hf-px, hf+px, p.y);
  if(mf > 0.001){
    float rel = (p.y-H)/max(hf-H, 0.001);
    float grain = fbm2(vec2(p.x*34., p.y*14.));
    float snow = smoothstep(0.62, 0.9, rel + (grain-0.5)*0.4);
    vec3 m = mix(vec3(0.009,0.014,0.022), vec3(0.09,0.12,0.15), snow);
    m += aurGlow(p.x)*0.025;
    col = mix(col, m, mf);
  }

  // low mist hugging the water
  float mist = exp(-(p.y-H)*16.)*0.5;
  col += vec3(0.030,0.075,0.075)*mist*(0.8+0.4*noise2(vec2(p.x*3.+sin(uP)*0.3, 1.)));
  return col;
}

float rockHeight(float x, float asp){
  float u = x/asp;
  float base = 0.27*pow(1. - smoothstep(0., 0.40, u), 1.4)
             + 0.15*pow(smoothstep(0.68, 1., u), 1.5);
  float jag = noise1(x*7.+2.)*0.06 + noise1(x*19.)*0.02 + noise1(x*47.)*0.006;
  return base + jag*smoothstep(0.0, 0.12, base) - 0.002;
}

void main(){
  vec2 p = gl_FragCoord.xy/uRes.y;
  float asp = uRes.x/uRes.y;
  vec3 col;

  if(p.y >= H){
    col = scene(p);
  } else {
    float depth = H - p.y;
    float z = 1./(depth + 0.035);
    float amp = (0.25 + depth*2.4);
    float dx = (sin(z*4.0 + p.x*18. + 4.*uP) * 0.5
              + sin(z*7.3 + p.x*33. - 3.*uP + 1.) * 0.35
              + sin(z*13. + p.x*61. + 2.*uP + 2.) * 0.15) * 0.0045 * amp;
    float dy = (noise2(vec2(p.x*9. + sin(uP)*1.2, z*0.9 + cos(uP)*1.2)) - 0.5) * 0.014 * amp;
    float ry = max(2.*H - p.y + dy, H + 0.001);
    vec3 refl = scene(vec2(p.x + dx, ry));
    float fres = mix(0.92, 0.62, clamp(depth*1.6, 0., 1.));
    vec3 water = vec3(0.004,0.012,0.017);
    // soft ripple glints
    float gl = smoothstep(0.55, 1., noise2(vec2(p.x*14. + dx*300., z*3.5 + sin(uP)))) * 0.5;
    col = mix(water, refl*0.88, fres) + refl*gl*0.18;
    // dark shoreline under the mountains
    col *= 0.55 + 0.45*smoothstep(0., 0.025, depth);
  }

  // foreground wet rocks
  float rh = rockHeight(p.x, asp);
  float rm = 1. - smoothstep(rh-0.0015, rh+0.0015, p.y);
  if(rm > 0.001){
    vec3 glow = aurGlow(p.x);
    float tex = fbm2(vec2(p.x*13., p.y*13.));
    float facets = fbm2(vec2(p.x*4.+5., p.y*6.));
    vec3 rc = vec3(0.008,0.011,0.014)*(0.5 + tex*1.2 + facets*0.6);
    float wet = smoothstep(0.52, 0.85, fbm2(vec2(p.x*26., p.y*20.) + 3.));
    float streak = smoothstep(0.6, 0.95, noise2(vec2(p.x*5., p.y*55.)));
    float rim = exp(-(rh-p.y)*55.);
    float lowWet = exp(-p.y*12.);
    rc += glow*(0.07*wet + 0.05*streak*wet + 0.28*rim*(0.5+tex) + 0.05*lowWet*wet);
    col = mix(col, rc, rm);
  }

  // grade: lifted blacks, soft cool shadows, vignette, grain
  col = col*0.97 + vec3(0.004,0.007,0.010);
  col = pow(max(col, 0.), vec3(0.96));
  vec2 uv = gl_FragCoord.xy/uRes;
  float vig = smoothstep(1.25, 0.35, length((uv-0.5)*vec2(1.1,1.0)));
  col *= mix(0.55, 1., vig);
  float g = hash21(gl_FragCoord.xy + uF*17.31) - 0.5;
  col += g*0.028;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
`;
