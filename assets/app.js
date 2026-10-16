'use strict';

// Add only the owner's confirmed profile URLs here.
const profileLinks = { github: 'https://github.com/9AcE4', linkedin: 'https://www.linkedin.com/in/pascal-arndt' };
const root = document.documentElement;
root.dataset.font = new URLSearchParams(window.location.search).get('font') === 'classic' ? 'classic' : 'code';
const body = document.body;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.getElementById('motion-toggle');
const canvas = document.getElementById('field');
const notice = document.getElementById('notice');
let noticeTimer;
let paused = reducedMotion.matches;
let userMotionChoice = false;
let renderEffect = () => {};
let syncTypingMotion = () => {};

function showNotice(message) {
  window.clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.add('visible');
  noticeTimer = window.setTimeout(() => notice.classList.remove('visible'), 4200);
}

for (const button of document.querySelectorAll('[data-profile]')) {
  const platform = button.dataset.profile;
  const name = platform === 'github' ? 'GitHub' : 'LinkedIn';
  const url = profileLinks[platform];
  if (url) {
    const link = document.createElement('a');
    link.className = button.className;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${name}-Profil (neuer Tab)`);
    link.replaceChildren(...button.childNodes);
    button.replaceWith(link);
  } else {
    button.addEventListener('click', () => showNotice(`${name}: Die genaue Profiladresse ergänzen wir noch.`));
  }
}

function updateMotionControl() {
  body.classList.toggle('motion-paused', paused);
  toggle.setAttribute('aria-pressed', String(paused));
  const label = paused ? 'Animationen fortsetzen' : 'Animationen pausieren';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  syncTypingMotion();
}

updateMotionControl();
toggle.addEventListener('click', () => {
  userMotionChoice = true;
  paused = !paused;
  updateMotionControl();
});

reducedMotion.addEventListener('change', event => {
  if (userMotionChoice) return;
  paused = event.matches;
  updateMotionControl();
});

function startTerminal() {
  const block = document.getElementById('terminal-block');
  const text = document.getElementById('terminal-text');
  const list = document.getElementById('terminal-statements');
  if (!block || !text || !list) return;
  // The HTML list is the single source for visible and accessible copy.
  const phrases = Array.from(list.querySelectorAll('li'), item => Array.from(item.textContent.trim()));
  if (!phrases.length) return;
  let phrase = 0;
  let character = 0;
  let phase = 'typing';
  let timer = 0;
  let delay = 600;

  function paint() {
    text.textContent = phrases[phrase].slice(0, character).join('');
  }

  function schedule() {
    if (paused || document.hidden || timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      tick();
    }, delay);
  }

  function tick() {
    if (paused || document.hidden) return;
    if (phase === 'typing') {
      character += 1;
      paint();
      if (character === phrases[phrase].length) {
        phase = 'holding';
        delay = 3000;
      } else {
        delay = 68;
      }
    } else if (phase === 'holding') {
      phase = 'deleting';
      delay = 28;
    } else if (phase === 'deleting') {
      character = Math.max(0, character - 1);
      paint();
      if (character === 0) {
        phase = 'between';
        delay = 450;
      } else {
        delay = 28;
      }
    } else {
      phrase = (phrase + 1) % phrases.length;
      phase = 'typing';
      delay = 68;
    }
    schedule();
  }

  syncTypingMotion = () => {
    window.clearTimeout(timer);
    timer = 0;
    block.classList.toggle('is-animated', !paused);
    schedule();
  };
  document.addEventListener('visibilitychange', syncTypingMotion);
  syncTypingMotion();
}

startTerminal();

const pointer = { x: .55, y: .46, tx: .55, ty: .46 };
window.addEventListener('pointermove', event => {
  if (paused) return;
  pointer.tx = event.clientX / Math.max(window.innerWidth, 1);
  pointer.ty = 1 - event.clientY / Math.max(window.innerHeight, 1);
  if (event.pointerType === 'mouse') {
    root.style.setProperty('--mx', ((pointer.tx - .5) * 2).toFixed(3));
    root.style.setProperty('--my', ((.5 - pointer.ty) * 2).toFixed(3));
  }
}, { passive: true });

document.addEventListener('pointerleave', () => {
  pointer.tx = .55;
  pointer.ty = .46;
  root.style.setProperty('--mx', '0');
  root.style.setProperty('--my', '0');
});

// The original calm chrome reflections, combined with the clean name-based layout.
const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float surface(vec2 p) {
  float t = u_time * .055;
  float warp = noise(p * 1.1 + vec2(t, -t * .55));
  vec2 q = p + vec2(warp * .65, warp * .3);
  return sin(q.x * 2.45 + q.y * 1.45 + t * 1.2) * .43
       + sin(q.x * 1.3 - q.y * 2.2 - t * .9) * .24
       + noise(q * 2.3 - t * .24) * .23;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - .5) * vec2(aspect, 1.0) * 2.7;
  p += (u_pointer - .5) * vec2(.17, .13);
  float h = surface(p);
  float eps = .008;
  vec3 normal = normalize(vec3((h - surface(p + vec2(eps, 0.))) / eps,
                               (h - surface(p + vec2(0., eps))) / eps, 1.7));
  vec3 reflected = reflect(vec3(0., 0., -1.), normal);
  float lightA = pow(max(0., dot(reflected, normalize(vec3(-.45, .7, .6)))), 30.);
  float lightB = pow(max(0., dot(reflected, normalize(vec3(.6, -.25, .8)))), 58.);
  float soft = pow(max(0., dot(normal, normalize(vec3(-.2, .6, .9)))), 3.);
  float ribbon = pow(1. - abs(sin(h * 3.6 + p.y * .45)), 24.);
  float edge = smoothstep(.0, .8, abs(normal.x));
  float dist = distance(uv, vec2(.52, .45));
  float vignette = 1. - smoothstep(.25, .95, dist);
  vec3 color = vec3(.027, .035, .041);
  color += vec3(.10, .125, .14) * soft * .35;
  color += vec3(.42, .51, .57) * (lightA * .60 + lightB * .34);
  color += vec3(.16, .20, .23) * ribbon * (.25 + edge * .5);
  color *= .63 + vignette * .37;
  float grain = hash(gl_FragCoord.xy + floor(u_time * 10.)) - .5;
  color += grain * .006;
  gl_FragColor = vec4(color, 1.);
}
`;

function startBackground() {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) { canvas.style.display = 'none'; return; }
  const shaders = [];
  let program;
  let buffer;
  function cleanup() {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation unavailable');
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
    return shader;
  }
  try {
    program = gl.createProgram();
    if (!program) throw new Error('WebGL program unavailable');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('WebGL link unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL buffer unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const mouse = gl.getUniformLocation(program, 'u_pointer');
    const time = gl.getUniformLocation(program, 'u_time');
    let elapsed = 8;
    let lastFrame = 0;
    let previousTime = 0;
    let animationFrame;
    renderEffect = () => {
      if (gl.isContextLost()) return;
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(mouse, pointer.x, pointer.y);
      gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    function resize() {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const maxPixels = width < 760 ? 420000 : 1000000;
      const scale = Math.min(window.devicePixelRatio || 1, Math.sqrt(maxPixels / (width * height)));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      renderEffect();
    }
    function frame(now) {
      animationFrame = window.requestAnimationFrame(frame);
      const delta = previousTime ? Math.min((now - previousTime) / 1000, .1) : 0;
      previousTime = now;
      if (document.hidden || paused) return;
      elapsed += delta;
      if (now - lastFrame < 1000 / 30) return;
      pointer.x += (pointer.tx - pointer.x) * .045;
      pointer.y += (pointer.ty - pointer.y) * .045;
      renderEffect();
      lastFrame = now;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      window.cancelAnimationFrame(animationFrame);
      canvas.style.opacity = '0';
    });
    animationFrame = window.requestAnimationFrame(frame);
  } catch (_) {
    cleanup();
    canvas.style.display = 'none';
  }
}
startBackground();
