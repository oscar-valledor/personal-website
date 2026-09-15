// Copy-the-prompt link. Falls back to selecting the block if the
// clipboard API is unavailable (e.g. non-secure context).
(function () {
  const link = document.getElementById('copy-prompt');
  const block = document.getElementById('install-prompt');
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const done = function () {
      link.textContent = 'Copied';
      setTimeout(function () { link.textContent = 'Copy the prompt'; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(block.textContent).then(done, function () { selectBlock(); });
    } else {
      selectBlock();
    }
    function selectBlock() {
      const range = document.createRange();
      range.selectNodeContents(block);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });
})();

// The ingestion cycle, drawn with the Providence morph mechanism:
// one point cloud cycling scatter → grid → graph → sphere
// (drop → file → connect → compound).
// ponytail: copy-prompt above shares this module, so a failed three.js import also kills the copy button
import * as THREE from './three.subset.min.js';

const SIMPLEX = /* glsl */`
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

const GA_ANGLE = Math.PI * (3 - Math.sqrt(5)); // golden angle
const STAGES = ['01 — drop', '02 — file', '03 — connect', '04 — compound'];

// Each particle gets an index-matched point on every target shape.
function buildShapes(count) {
  const scatter = new Float32Array(count * 3);
  const grid    = new Float32Array(count * 3);
  const graph   = new Float32Array(count * 3);
  const sphere  = new Float32Array(count * 3);
  const scales  = new Float32Array(count);

  // Hubs for the graph stage — a handful of dense clusters.
  const HUBS = 14;
  const hubs = [];
  for (let h = 0; h < HUBS; h++) {
    const y = 1 - (h / (HUBS - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = h * GA_ANGLE * 7.3;
    hubs.push([Math.cos(th) * rad * 0.72, y * 0.72, Math.sin(th) * rad * 0.72]);
  }

  const side = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    // scatter — loose cloud of raw material
    const r = Math.cbrt(Math.random()) * 1.05;
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const ur = Math.sqrt(1 - u * u);
    scatter[i*3] = Math.cos(a) * ur * r;
    scatter[i*3+1] = u * r;
    scatter[i*3+2] = Math.sin(a) * ur * r;

    // grid — a flat lattice: pages, order
    const gx = i % side, gy = Math.floor(i / side);
    const E = 0.85;
    grid[i*3]   = (gx / (side - 1) * 2 - 1) * E;
    grid[i*3+1] = (gy / (side - 1) * 2 - 1) * E;
    grid[i*3+2] = (Math.random() - 0.5) * 0.04;

    // graph — clusters plus the links between them
    if (i % 5 < 3) {
      const hub = hubs[i % HUBS];
      const S = 0.16;
      graph[i*3]   = hub[0] + (Math.random() + Math.random() + Math.random() - 1.5) * S;
      graph[i*3+1] = hub[1] + (Math.random() + Math.random() + Math.random() - 1.5) * S;
      graph[i*3+2] = hub[2] + (Math.random() + Math.random() + Math.random() - 1.5) * S;
    } else {
      const p = hubs[i % HUBS], q = hubs[(i * 7 + 3) % HUBS];
      const t = Math.random();
      graph[i*3]   = p[0] + (q[0] - p[0]) * t + (Math.random() - 0.5) * 0.02;
      graph[i*3+1] = p[1] + (q[1] - p[1]) * t + (Math.random() - 0.5) * 0.02;
      graph[i*3+2] = p[2] + (q[2] - p[2]) * t + (Math.random() - 0.5) * 0.02;
    }

    // sphere — the whole brain
    const sy = 1 - (i / (count - 1)) * 2;
    const srad = Math.sqrt(Math.max(0, 1 - sy * sy));
    const sth = i * GA_ANGLE;
    sphere[i*3] = Math.cos(sth) * srad * 0.9;
    sphere[i*3+1] = sy * 0.9;
    sphere[i*3+2] = Math.sin(sth) * srad * 0.9;

    scales[i] = 0.55 + Math.random() * 0.6;
  }
  return { scatter, grid, graph, sphere, scales };
}

function smooth(e) { return e * e * (3 - 2 * e); }

function createMorph(canvas, stageEl) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = 2600;
  const HOLD = 2.2, MORPH = 1.7, CYC = HOLD + MORPH, SHAPES = 4;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3.0;

  const S = buildShapes(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(S.scatter, 3));
  geo.setAttribute('aP0', new THREE.BufferAttribute(S.scatter, 3));
  geo.setAttribute('aP1', new THREE.BufferAttribute(S.grid, 3));
  geo.setAttribute('aP2', new THREE.BufferAttribute(S.graph, 3));
  geo.setAttribute('aP3', new THREE.BufferAttribute(S.sphere, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(S.scales, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 }, uNoiseOffset: { value: Math.random() * 10 },
      uSize: { value: 1.15 },
      uPixelRatio: { value: PR }, uColor: { value: new THREE.Color('#000000') },
      uW: { value: new THREE.Vector4(1, 0, 0, 0) },
    },
    vertexShader: /* glsl */`
      uniform float uTime, uNoiseOffset, uSize, uPixelRatio;
      uniform vec4 uW;
      attribute vec3 aP0, aP1, aP2, aP3;
      attribute float aScale;
      ${SIMPLEX}
      void main() {
        vec3 pos = aP0*uW.x + aP1*uW.y + aP2*uW.z + aP3*uW.w;
        vec3 dir = normalize(pos + vec3(0.0001));
        float t = (uTime + uNoiseOffset) * 0.2;
        float n = snoise(pos * 1.3 + vec3(0.0, 0.0, t));
        pos += dir * n * 0.03;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aScale * uPixelRatio * (3.4 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform vec3 uColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        if (length(uv) > 0.5) discard;
        float mask = 1.0 - smoothstep(0.40, 0.5, length(uv));
        gl_FragColor = vec4(uColor, mask * 0.95);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.rotation.x = -0.12;
  scene.add(points);

  // Renderer built successfully — reveal the canvas. If the module
  // failed to load (404), this line never runs
  // and the canvas stays display:none with the static caption.
  canvas.style.display = 'block';

  // In reduced-motion mode there is no render loop, so resize/theme
  // changes must repaint by hand or the canvas goes blank.
  let onScreen = true;
  const repaint = () => { if (onScreen) renderer.render(scene, camera); };

  // Pure black-and-white site: particles follow the colour scheme.
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const setColor = () => {
    material.uniforms.uColor.value.set(dark.matches ? '#ffffff' : '#000000');
    if (reduce) repaint();
  };
  dark.addEventListener('change', setColor);

  function resize() {
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 340;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  new IntersectionObserver((es) => {
    const wasOn = onScreen;
    onScreen = es[0].isIntersecting;
    if (reduce && onScreen && !wasOn) repaint();
  }, { rootMargin: '200px' }).observe(canvas);

  setColor();
  resize();
  new ResizeObserver(() => { resize(); if (reduce) repaint(); }).observe(canvas);

  if (reduce) {
    // Hold the finished state: the sphere, no motion.
    material.uniforms.uW.value.set(0, 0, 0, 1);
    stageEl.textContent = 'drop — file — connect — compound';
    repaint();
    return;
  }

  const clock = new THREE.Clock();
  const w = new THREE.Vector4();
  let shownStage = -1;
  function render() {
    const dt = clock.getDelta();
    material.uniforms.uTime.value += dt;

    const t = material.uniforms.uTime.value;
    const total = ((t % (CYC * SHAPES)) + CYC * SHAPES) % (CYC * SHAPES);
    const idx = Math.floor(total / CYC);
    const lt = total - idx * CYC;
    w.set(0, 0, 0, 0);
    let active = idx;
    if (lt < HOLD) {
      w.setComponent(idx, 1);
    } else {
      const e = smooth((lt - HOLD) / MORPH);
      w.setComponent(idx, 1 - e);
      w.setComponent((idx + 1) % SHAPES, e);
      if (e > 0.5) active = (idx + 1) % SHAPES;
    }
    material.uniforms.uW.value.copy(w);

    if (active !== shownStage) {
      shownStage = active;
      stageEl.textContent = STAGES[active];
    }

    points.rotation.y += dt * 0.12;
    if (onScreen) renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();
}

try {
  createMorph(document.getElementById('brain-morph'), document.getElementById('morph-stage'));
} catch (err) {
  // No WebGL: drop the canvas, keep the caption as a static diagram.
  document.getElementById('brain-morph').remove();
  document.getElementById('morph-stage').textContent = 'drop — file — connect — compound';
}
