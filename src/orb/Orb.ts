import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, Scene, ShaderMaterial, WebGLRenderer,
} from 'three';
import type { OrbState } from './machine';

export interface Orb { setState(s: OrbState): void; dispose(): void }

const COLORS = {
  coral: new Color('#e8572a'),
  coralLit: new Color('#f06e43'),
  cream: new Color('#f4efe6'),
  blue: new Color('#3d6bff'),
  red: new Color('#ff3b30'),
  amber: new Color('#ffb020'),
};

interface Params {
  amp: number; freq: number; flow: number; breath: number; breathSpeed: number; beat: number;
  spin: number; tint: Color; tintMix: number; glow: number; size: number;
}
const PRESETS: Record<OrbState, Params> = {
  idle:      { amp: 0.10, freq: 1.5, flow: 0.5, breath: 0.018, breathSpeed: 0.8, beat: 0,    spin: 0.10, tint: COLORS.coralLit, tintMix: 0.0,  glow: 0.55, size: 1.0 },
  listening: { amp: 0.15, freq: 1.8, flow: 0.8, breath: 0.060, breathSpeed: 1.9, beat: 0,    spin: 0.16, tint: COLORS.coralLit, tintMix: 0.22, glow: 0.8,  size: 1.1 },
  thinking:  { amp: 0.34, freq: 2.7, flow: 2.4, breath: 0.020, breathSpeed: 2.6, beat: 0,    spin: 0.55, tint: COLORS.blue,     tintMix: 0.8,  glow: 0.75, size: 1.0 },
  speaking:  { amp: 0.17, freq: 2.0, flow: 1.1, breath: 0.020, breathSpeed: 1.2, beat: 0.07, spin: 0.20, tint: COLORS.coral,    tintMix: 0.4,  glow: 0.95, size: 1.15 },
  blocked:   { amp: 0.30, freq: 3.4, flow: 3.0, breath: 0.030, breathSpeed: 9.0, beat: 0.03, spin: 0.30, tint: COLORS.red,      tintMix: 1.5,  glow: 1.3,  size: 1.25 },
  confirm:   { amp: 0.13, freq: 1.7, flow: 0.9, breath: 0.040, breathSpeed: 2.4, beat: 0,    spin: 0.12, tint: COLORS.amber,    tintMix: 0.85, glow: 0.95, size: 1.1 },
};

const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const VERT = /* glsl */ `
${NOISE}
attribute float aSeed;
attribute float aCore;
uniform float uTime, uFlow, uAmp, uFreq, uBreath, uBreathSpeed, uBeat, uBeatPhase, uSize, uPx;
varying float vN; varying float vSeed; varying float vCore; varying float vDepth; varying float vR;
void main(){
  vec3 p = position;
  float n = vnoise(p * uFreq + vec3(0.0, uFlow, uFlow * 0.6));
  float breath = 1.0 + uBreath * sin(uTime * uBreathSpeed + aCore * 2.0);
  float beat = uBeat * (0.5 + 0.5 * sin(uBeatPhase + aSeed * 6.2831)) ;
  float k = mix(1.0, 0.55, aCore);
  p *= breath + (n - 0.5) * uAmp * k + beat * k;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vN = n; vSeed = aSeed; vCore = aCore; vR = length(p);
  vDepth = smoothstep(-1.1, 1.1, (modelMatrix * vec4(p, 1.0)).z);
  float base = mix(4.0, 5.2, aCore) * (0.65 + 0.7 * aSeed);
  gl_PointSize = base * uSize * uPx * (3.5 / -mv.z);
}`;

const FRAG = /* glsl */ `
uniform vec3 uCream, uCoral, uBlue, uTint;
uniform float uTintMix, uGlow;
varying float vN; varying float vSeed; varying float vCore; varying float vDepth; varying float vR;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  if (a < 0.01) discard;
  vec3 shell = mix(uCream, uBlue, step(0.9, vSeed) * 0.85 * (1.0 - uTintMix * 0.85));
  shell = mix(shell, uCoral, smoothstep(0.62, 0.9, vN) * 0.45);
  vec3 hot = mix(uCoral * 1.35, uCream, smoothstep(0.34, 0.0, vR));
  vec3 col = mix(shell, hot, vCore);
  col = mix(col, uTint, clamp(uTintMix * (0.6 + 0.4 * vN), 0.0, 1.0));
  float alpha = a * mix(0.38, 1.0, vDepth) * mix(1.0, 1.1, vCore) * (0.75 + 0.35 * uGlow);
  gl_FragColor = vec4(col, alpha);
}`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uStrength;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float g = pow(clamp(1.0 - d, 0.0, 1.0), 2.4);
  gl_FragColor = vec4(uColor, g * uStrength);
}`;

function build(count: number) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const core = new Float32Array(count);
  const nCore = Math.round(count * 0.14);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const isCore = i < nCore;
    const m = isCore ? nCore : count - nCore;
    const j = isCore ? i : i - nCore;
    const y = 1 - (j / (m - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * j;
    const rad = isCore ? 0.22 + 0.2 * Math.random() : 0.96 + 0.08 * Math.random();
    pos[i * 3] = Math.cos(th) * r * rad;
    pos[i * 3 + 1] = y * rad;
    pos[i * 3 + 2] = Math.sin(th) * r * rad;
    seed[i] = Math.random();
    core[i] = isCore ? 1 : 0;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  g.setAttribute('aCore', new BufferAttribute(core, 1));
  return g;
}

export function createOrb(canvas: HTMLCanvasElement): Orb {
  const host = canvas.parentElement ?? canvas;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const px = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(px);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 20);
  camera.position.z = 3.5;

  const uniforms = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uAmp: { value: 0 }, uFreq: { value: 1.5 },
    uBreath: { value: 0 }, uBreathSpeed: { value: 1 }, uBeat: { value: 0 }, uBeatPhase: { value: 0 },
    uSize: { value: 1 }, uPx: { value: px }, uTintMix: { value: 0 }, uGlow: { value: 0.5 },
    uCream: { value: COLORS.cream.clone() }, uCoral: { value: COLORS.coral.clone() },
    uBlue: { value: COLORS.blue.clone() }, uTint: { value: COLORS.coral.clone() },
  };
  const mat = new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const geo = build(6000);
  const group = new Group();
  group.add(new Points(geo, mat));
  scene.add(group);

  const haloU = { uColor: { value: COLORS.coral.clone() }, uStrength: { value: 0.5 } };
  const halo = new Mesh(
    new PlaneGeometry(4.2, 4.2),
    new ShaderMaterial({
      uniforms: haloU, transparent: true, depthWrite: false, blending: AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: HALO_FRAG,
    }),
  );
  halo.position.z = -0.8;
  scene.add(halo);

  // Current (smoothed) values and target preset.
  let target = PRESETS.idle;
  const cur = { ...PRESETS.idle, tint: PRESETS.idle.tint.clone() };
  let flash = 0;
  let time = 0; let flow = 0; let beatPhase = 0;
  let last = 0; let raf = 0; let acc = 0;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;

  const resize = () => {
    const w = Math.max(1, host.clientWidth); const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the sphere fully inside short and narrow stages.
    camera.position.z = Math.max(3.5, 3.5 / Math.min(1, camera.aspect) * 0.95);
    camera.updateProjectionMatrix();
  };

  const apply = (dt: number, snap: boolean) => {
    const k = snap ? 1 : 1 - Math.exp(-dt * 4.5);
    cur.amp += (target.amp - cur.amp) * k;
    cur.freq += (target.freq - cur.freq) * k;
    cur.flow += (target.flow - cur.flow) * k;
    cur.breath += (target.breath - cur.breath) * k;
    cur.breathSpeed += (target.breathSpeed - cur.breathSpeed) * k;
    cur.beat += (target.beat - cur.beat) * k;
    cur.spin += (target.spin - cur.spin) * k;
    cur.tintMix += (target.tintMix - cur.tintMix) * k;
    cur.glow += (target.glow - cur.glow) * k;
    cur.size += (target.size - cur.size) * k;
    cur.tint.lerp(target.tint, k);
    flash = Math.max(0, flash - dt * 1.6);

    time += dt; flow += dt * cur.flow;
    // Simulated rhythmic voice: two incommensurate sines, no audio involved.
    beatPhase += dt * (9 + 4 * Math.sin(time * 1.3));
    const env = cur.beat * (0.6 + 0.4 * Math.sin(time * 5.1) * Math.sin(time * 2.3));
    group.rotation.y += dt * cur.spin;
    group.rotation.x = 0.28;

    uniforms.uTime.value = time; uniforms.uFlow.value = flow;
    uniforms.uAmp.value = cur.amp + flash * 0.12; uniforms.uFreq.value = cur.freq;
    uniforms.uBreath.value = cur.breath; uniforms.uBreathSpeed.value = cur.breathSpeed;
    uniforms.uBeat.value = env; uniforms.uBeatPhase.value = beatPhase;
    uniforms.uSize.value = cur.size + flash * 0.25;
    uniforms.uTint.value.copy(cur.tint); uniforms.uTintMix.value = cur.tintMix;
    uniforms.uGlow.value = cur.glow + flash * 0.6;
    haloU.uColor.value.copy(COLORS.coral).lerp(cur.tint, Math.min(1, cur.tintMix));
    haloU.uStrength.value = 0.42 * cur.glow + flash * 0.3;
  };

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    if (t - last < 33) return; // ~30 fps
    const dt = Math.min(0.1, (t - last) / 1000 || 0.033);
    last = t;
    apply(dt, false);
    renderer.render(scene, camera);
  };
  const renderStatic = () => { apply(0, true); time = 4; uniforms.uTime.value = 4; group.rotation.y = 0.9; renderer.render(scene, camera); };

  const sync = () => {
    cancelAnimationFrame(raf); raf = 0;
    if (reduced.matches) { renderStatic(); return; }
    if (visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };

  const ro = new ResizeObserver(() => { resize(); if (!raf) renderStatic(); });
  ro.observe(host);
  const io = new IntersectionObserver((e) => { visible = e[e.length - 1]?.isIntersecting ?? true; sync(); });
  io.observe(host);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  reduced.addEventListener('change', sync);
  resize();
  // Start from the idle look immediately (no easing from zero).
  apply(0, true);
  sync();

  return {
    setState(s) {
      target = PRESETS[s];
      if (s === 'blocked') flash = 1;
      if (reduced.matches) { Object.assign(cur, { ...target, tint: target.tint.clone() }); renderStatic(); }
    },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduced.removeEventListener('change', sync);
      geo.dispose(); mat.dispose(); halo.geometry.dispose(); (halo.material as ShaderMaterial).dispose();
      renderer.dispose();
    },
  };
}
