"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uHeat;
uniform float uCols;
uniform float uPad;
uniform vec3 uAccent;
uniform vec3 uWall;
uniform float uSpot;
uniform float uHaze;
uniform float uScroll;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

float dust(vec2 p, float t) {
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 5.0 + fi * 4.0;
    vec2 drift = vec2(sin(t * 0.05 + fi * 2.0) * 0.25, t * (0.012 + fi * 0.006));
    vec2 g = (p + drift) * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + fi * 17.0);
    if (h < 0.8) continue;
    vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
    off += 0.12 * vec2(sin(t * 0.6 + h * 30.0), cos(t * 0.45 + h * 20.0));
    float size = 0.022 + 0.032 * hash(id + 1.3);
    float twinkle = 0.45 + 0.55 * sin(t * (0.8 + h * 1.6) + h * 40.0);
    acc += smoothstep(size, 0.0, length(f - off)) * twinkle * (1.0 - fi * 0.28);
  }
  return acc;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;

  float aspect = uRes.x / uRes.y;

  // Deep painted wall, darker towards the floor
  vec3 bot = uWall * 0.4;
  vec3 mid = uWall * 0.79;
  vec3 top = uWall;
  vec3 col = mix(bot, mid, smoothstep(0.0, 0.6, uv.y));
  col = mix(col, top, smoothstep(0.6, 1.0, uv.y));
  col *= 0.9 + 0.14 * fbm(p * 4.0 + 7.0);

  // Drifting haze (domain-warped fbm)
  float ft = t * 0.025;
  vec2 q = vec2(fbm(p * 1.3 + vec2(ft, -ft * 0.6)), fbm(p * 1.3 + vec2(-ft * 0.8, ft) + 3.1));
  float fog = fbm(p * 1.7 + q * 1.8 + vec2(ft * 0.6, 0.0));

  // Gallery down-lights washing the wall above each column of shelves
  float wash = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi >= uCols) break;
    float cx = uPad + (1.0 - 2.0 * uPad) * (fi + 0.5) / uCols;
    float dy = 1.04 - uv.y;
    float dx = (uv.x - cx) * aspect;
    float width = 0.05 + dy * 0.34;
    float cone = exp(-pow(dx / width, 2.0) * 1.8);
    float scallop = smoothstep(0.0, 0.1, dy - dx * dx * 2.4);
    wash += cone * scallop * exp(-dy * 1.35);
  }

  // On product pages the row of lights gives way to one spot over the hero
  vec2 sp = vec2((uv.x - 0.45) * aspect, 1.06 - uv.y);
  float spotW = 0.12 + sp.y * 0.55;
  float heroSpot = exp(-pow(sp.x / spotW, 2.0) * 1.6) * exp(-sp.y * 0.9);
  // Scrolling past the wall eases the row of spotlights into one soft overhead glow
  float overhead = exp(-pow((uv.x - 0.5) * aspect / (0.35 + (1.06 - uv.y) * 0.5), 2.0)) * exp(-(1.06 - uv.y) * 1.2);
  wash = mix(wash, overhead * 0.75, uScroll);
  float light = mix(wash, heroSpot * 1.15, uHeat) * uSpot;

  vec3 warmWhite = vec3(1.0, 0.92, 0.82);
  col += warmWhite * light * 0.2;
  col += warmWhite * light * smoothstep(0.35, 0.95, fog) * 0.09 * uHaze;
  col *= 1.0 + (0.24 * fog * (0.4 + light) - 0.12) * uHaze;

  // Accent light rising from below, stronger around the hero shelf on product pages
  vec3 ember = pow(uAccent, vec3(1.2));
  float breath = 0.85 + 0.15 * sin(t * 0.55);
  float floorGlow = exp(-uv.y * uv.y * 9.0) * (0.5 + 0.5 * fog);
  vec2 hp = (uv - vec2(0.45, 0.2)) * vec2(1.1, 2.6);
  float heroGlow = exp(-dot(hp, hp) * 3.0);
  col += ember * (floorGlow * mix(0.1, 0.15, uHeat) + heroGlow * 0.26 * uHeat) * breath;

  // Cursor light
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  float d = length(p - m);
  float torch = exp(-d * d * 7.0) * uMouseOn;
  col += warmWhite * torch * 0.055;

  // Dust motes catching the light
  float motes = dust(p, t);
  col += vec3(1.0, 0.9, 0.8) * motes * (0.015 + light * 0.3 + torch * 0.5 + floorGlow * 0.12);

  // Vignette
  vec2 v = (uv - 0.5) * vec2(1.0, 1.15);
  col *= mix(0.4, 1.0, smoothstep(1.0, 0.22, length(v)));

  // Dither against banding
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

const RENDER_SCALE = 0.6;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

type Props = {
  accent: string;
  wall: string;
  spotlight: number;
  haze: number;
  columns: number;
};

/** Animated showroom wall rendered with a single full-screen fragment shader. */
export function Atmosphere({ accent, wall, spotlight, haze, columns }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatTarget = useRef(0);
  const redraw = useRef<() => void>(() => {});
  const pathname = usePathname();

  useEffect(() => {
    heatTarget.current = pathname.startsWith("/p/") ? 1 : 0;
    redraw.current();
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      mouseOn: gl.getUniformLocation(prog, "uMouseOn"),
      heat: gl.getUniformLocation(prog, "uHeat"),
      scroll: gl.getUniformLocation(prog, "uScroll"),
      cols: gl.getUniformLocation(prog, "uCols"),
      pad: gl.getUniformLocation(prog, "uPad"),
    };

    gl.uniform3f(gl.getUniformLocation(prog, "uAccent"), ...hexToRgb(accent));
    gl.uniform3f(gl.getUniformLocation(prog, "uWall"), ...hexToRgb(wall));
    gl.uniform1f(gl.getUniformLocation(prog, "uSpot"), spotlight);
    gl.uniform1f(gl.getUniformLocation(prog, "uHaze"), haze);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = {
      w: 0,
      h: 0,
      mouse: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      mouseOn: 0,
      mouseOnTarget: 0,
      heat: heatTarget.current,
    };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * RENDER_SCALE;
      state.w = Math.max(1, Math.round(window.innerWidth * scale));
      state.h = Math.max(1, Math.round(window.innerHeight * scale));
      canvas.width = state.w;
      canvas.height = state.h;
      gl.viewport(0, 0, state.w, state.h);

      // Mirrors the wall grid: brand columns with 4vw gutters on desktop, 2 columns with 20px on mobile
      const desktop = window.innerWidth >= 768;
      gl.uniform1f(u.cols, desktop ? columns : 2);
      gl.uniform1f(u.pad, desktop ? 0.04 : 20 / window.innerWidth);
      if (!state.target.x) {
        state.target = { x: state.w * 0.5, y: state.h * 0.6 };
        state.mouse = { ...state.target };
      }
    };

    const onMove = (e: PointerEvent) => {
      const sx = state.w / window.innerWidth;
      state.target = { x: e.clientX * sx, y: state.h - e.clientY * sx };
      state.mouseOnTarget = e.pointerType === "mouse" ? 1 : 0;
    };
    const onLeave = () => (state.mouseOnTarget = 0);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let shown = false;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const k = 1 - Math.exp(-dt * 4);
      state.mouse.x += (state.target.x - state.mouse.x) * k;
      state.mouse.y += (state.target.y - state.mouse.y) * k;
      state.mouseOn += (state.mouseOnTarget - state.mouseOn) * (1 - Math.exp(-dt * 2.5));
      state.heat += (heatTarget.current - state.heat) * (1 - Math.exp(-dt * 1.8));

      gl.uniform2f(u.res, state.w, state.h);
      gl.uniform1f(u.time, reduced ? 12 : elapsed + 12);
      gl.uniform2f(u.mouse, state.mouse.x, state.mouse.y);
      gl.uniform1f(u.mouseOn, reduced ? 0 : state.mouseOn);
      gl.uniform1f(u.heat, reduced ? heatTarget.current : state.heat);
      gl.uniform1f(u.scroll, Math.min(1, window.scrollY / (window.innerHeight * 0.9)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
      raf = reduced ? 0 : requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const onResize = () => {
      resize();
      if (reduced) start();
    };

    resize();
    start();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) redraw.current = start;

    return () => {
      cancelAnimationFrame(raf);
      redraw.current = () => {};
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [accent, wall, spotlight, haze, columns]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-1000"
    />
  );
}
