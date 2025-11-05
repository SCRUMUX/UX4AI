// cyber_materials.js
// Материалы: GLASS+, HOLO (depth), NEON (halo), SCANLINES (CRT)
// Совместимо с three r150+ (ES Modules). Нет внешних зависимостей.

import * as THREE from 'three';

/* -------------------- Общие шейдеры/хелперы -------------------- */
const VS = /*glsl*/`
  varying vec3 vPos; varying vec3 vNorm; varying vec2 vUv;
  void main(){
    vUv = uv;
    vNorm = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position,1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const DECL = /*glsl*/`
  uniform float uTime, uOpacity, uEdge, uGain;
  uniform float uStereo, uRefraction, uHScale, uHGlitch, uNHalo, uNPeak, uSDen, uSBri, uReverse;
  uniform vec3  uBase, uEdgeCol, uScanTint;
  varying vec3  vPos, vNorm;
  varying vec2  vUv;
`;

const HUE_FN = /*glsl*/`
  vec3 hueShift(vec3 color, float hue){
    const mat3 toYIQ = mat3(
      0.299,0.587,0.114,
      0.596,-0.275,-0.321,
      0.212,-0.523,0.311
    );
    const mat3 toRGB = mat3(
      1.0,0.956,0.621,
      1.0,-0.272,-0.647,
      1.0,-1.107,1.705
    );
    vec3 yiq = toYIQ * color;
    float c = cos(hue), s = sin(hue);
    mat3 rot = mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c);
    return clamp(toRGB * (rot * yiq), 0.0, 1.0);
  }
`;

// «сломанное 3D»: лёгкий RGB-фринжинг по экранным UV
const STEREO_UV = /*glsl*/`
  vec3 stereoUV(vec3 base, vec2 uv, float amt){
    if(amt<=0.001) return base;
    // усиливаем каналы по-разному (без реальных экранных сэмплов — дёшево и заметно)
    return vec3(base.r*(1.0+amt*0.30), base.g*(1.0+amt*0.05), base.b*(1.0+amt*0.20));
  }
`;

// шум для стекла (плиточный «нормал»)
const NOISE_FN = /*glsl*/`
  float n3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
  vec3 tileNormal(vec3 p){
    vec3 q = floor(p*3.0)+0.5;
    float nx = n3(q+vec3(1.0,0.0,0.0))*2.0-1.0;
    float ny = n3(q+vec3(0.0,1.0,0.0))*2.0-1.0;
    float nz = n3(q+vec3(0.0,0.0,1.0))*2.0-1.0;
    return normalize(vec3(nx,ny,nz));
  }
`;

/* -------------------- 0) GLASS+ -------------------- */
const FS_GLASS = DECL + NOISE_FN + STEREO_UV + /*glsl*/`
  float rim(vec3 V, vec3 N){ return 1.0 - max(dot(V,N),0.0); }
  vec3 envColor(float ndoty){
    return mix(vec3(0.55,0.75,0.95), vec3(0.90,0.97,1.0), clamp(ndoty*0.5+0.5, 0.0, 1.0));
  }
  void main(){
    vec3 V = normalize(cameraPosition - vPos);
    vec3 N = normalize(vNorm);
    vec3 Nt = normalize(mix(N, tileNormal(vPos*0.7), uRefraction*0.6));
    float f = pow(rim(V,Nt), 1.5);
    vec3 refl = envColor(Nt.y);
    vec3 base = mix(uBase, uEdgeCol, f);

    // мульти-сэмпл псевдо-линзовый blur
    float blur = uRefraction;
    vec3 acc = vec3(0.0); float wsum=0.0;
    for(int i=-2;i<=2;i++){
      float k=float(i);
      float w = 1.0 - abs(k)*0.18;
      vec3 dir = normalize(V + Nt*0.15*k*blur);
      float t = 0.5 + 0.5*dot(dir,Nt);
      vec3 samp = mix(base, refl, t);
      acc += samp*w; wsum += w;
    }
    vec3 col = acc/wsum;
    col *= (0.9 + 0.2*uGain);
    col  = stereoUV(col, vUv, uStereo);

    float alpha = clamp(uOpacity*(0.45+0.55*f), 0.08, 0.60);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* -------------------- 1) HOLO (Depth) -------------------- */
const FS_HOLO = DECL + HUE_FN + STEREO_UV + /*glsl*/`
  float line(float x,float w){ float g=abs(fract(x)-0.5);
    return smoothstep(0.5-w,0.5,g)-smoothstep(0.5,0.5+w,g);
  }
  float rnd(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    float scale = max(0.06, uHScale);
    vec3 p = vPos * scale;

    // изогнутая рябь
    float curve = sin((p.x*0.8 + p.z*0.6) + uTime*0.5)*0.15;
    float g1 = line(p.x + uTime*0.4 + curve, 0.014) + line(p.z - uTime*0.35 - curve, 0.014);
    float g2 = line(p.x*1.3 - uTime*0.55, 0.012) + line(p.z*1.3 + uTime*0.5, 0.012);
    float g3 = line(p.y*0.9 + uTime*0.3, 0.012);
    float grid = clamp(g1*0.7 + g2*0.6 + g3*0.5, 0.0, 2.0);

    // мелкий глитч секциями
    float section = floor(vPos.y/2.2);
    float j = rnd(vec2(section, floor(uTime*3.0))) - 0.5;
    grid += uHGlitch * j * 0.5;

    float hue = 0.5 * sin(uTime*0.9 + vPos.y*0.22);
    vec3 baseCol = hueShift(vec3(0.70,0.92,1.0), hue);
    baseCol = mix(baseCol, vec3(0.85,0.95,1.0), 0.2);
    vec3 col = mix(uBase, baseCol, clamp(grid,0.0,1.0));
    col *= (0.95 + 0.45*grid) * uGain;
    col  = stereoUV(col, vUv, uStereo);

    float alpha = clamp(uOpacity*(0.60 + 0.40*clamp(grid,0.0,1.0)), 0.30, 0.96);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* -------------------- 2) NEON (Halo) -------------------- */
const FS_NEON = DECL + STEREO_UV + /*glsl*/`
  float rim(vec3 V, vec3 N){ return 1.0 - max(dot(V,N),0.0); }
  void main(){
    vec3 V=normalize(cameraPosition-vPos);
    vec3 N=normalize(vNorm);
    float f=pow(rim(V,N),3.0);
    float axial = 0.5+0.5*sin(vPos.y*1.5 - uTime*3.0);
    float core  = clamp(f*uEdge*1.5, 0.0, 1.0);
    float halo  = clamp(pow(f,0.9)*uNHalo, 0.0, 1.2);

    vec3 col = mix(uBase*0.06, uEdgeCol, core) * (0.9 + 0.35*axial);
    col += uEdgeCol * halo * 0.5;

    // пик-кламп от пересвета
    float peak = max(max(col.r,col.g), col.b);
    float clampK = min(1.0, uNPeak / max(peak, 1e-3));
    col *= clampK;

    // слегка десатурируем на светлом фоне
    float lum = dot(col, vec3(0.299,0.587,0.114));
    col = mix(vec3(lum), col, 0.8);

    col *= uGain;
    col  = stereoUV(col, vUv, uStereo);
    float alpha = clamp(0.90 - 0.45*core, 0.62, 1.0);
    gl_FragColor = vec4(col,alpha);
  }
`;

/* -------------------- 3) SCANLINES (CRT) -------------------- */
const FS_CRT = DECL + STEREO_UV + /*glsl*/`
  float vignette(vec2 uv){ uv=uv*2.0-1.0; float r=dot(uv,uv);
    return smoothstep(1.1,0.2,r);
  }
  void main(){
    float den = max(0.3, uSDen);
    float dir = mix(1.0, -1.0, step(0.5, uReverse)); // reverse waves
    float scan  = 0.5 + 0.5*sin(dir*(vUv.y*(80.0*den)+uTime*6.0));
    float hatch = 0.5 + 0.5*sin(dir*((vUv.x+vUv.y)*(28.0*den)-uTime*3.0));
    float m = clamp((scan*0.9 + hatch*0.5), 0.0, 1.5);
    vec3 col = mix(uBase, uScanTint, m) * (0.7 + 0.7*uSBri);
    col  = stereoUV(col, vUv, uStereo*0.85);
    float vig = vignette(vUv);
    col *= mix(0.96, 1.06, vig);
    float alpha = clamp(uOpacity*(0.42+0.58*m), 0.35, 0.96);
    gl_FragColor = vec4(col,alpha);
  }
`;

/* -------------------- Фабрика материалов -------------------- */
function shaderUniforms(kind, opts = {}) {
  const base = (kind===2) ? 0x0A0F1A : (kind===3) ? 0xECF8FF : 0xDFF5FF;
  const edge = (kind===2) ? 0xFF2AAE : (kind===1) ? 0x11FFD9 : 0x00C2FF;
  return {
    uTime:       { value: 0 },
    uOpacity:    { value: opts.opacity  ?? (kind===1?0.82:kind===2?0.88:kind===3?0.56:0.24) },
    uEdge:       { value: opts.edge     ?? (kind===2?1.9:1.3) },
    uGain:       { value: opts.gain     ?? (kind===2?1.4:1.2) },
    uStereo:     { value: opts.stereo   ?? 0.35 },
    uRefraction: { value: opts.refraction ?? 0.55 },
    uHScale:     { value: opts.hScale   ?? 0.16 },
    uHGlitch:    { value: opts.hGlitch  ?? 0.08 },
    uNHalo:      { value: opts.nHalo    ?? 0.45 },
    uNPeak:      { value: opts.nPeak    ?? 0.80 },
    uSDen:       { value: opts.sDen     ?? 0.90 },
    uSBri:       { value: opts.sBri     ?? 1.10 },
    uReverse:    { value: opts.reverse  ?? 1.0 }, // 1.0 -> reverse on
    uBase:       { value: new THREE.Color(base) },
    uEdgeCol:    { value: new THREE.Color(edge) },
    uScanTint:   { value: new THREE.Color(opts.scanTint ?? 0x2aa6ff) }
  };
}

export function makeGlassPlus(opts={}) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_GLASS,
    uniforms: shaderUniforms(0, opts),
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.NormalBlending
  });
}

export function makeHoloDepth(opts={}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_HOLO,
    uniforms: shaderUniforms(1, opts),
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: (opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending)
  });
  return m;
}

export function makeNeonHalo(opts={}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_NEON,
    uniforms: shaderUniforms(2, opts),
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: (opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending)
  });
  return m;
}

export function makeScanlinesCRT(opts={}) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS_CRT,
    uniforms: shaderUniforms(3, opts),
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.NormalBlending
  });
}

/* -------------------- Применение по именам/тегам -------------------- */
/**
 * applyMaterialsByTag(scene, mapping)
 * mapping: {
 *   includes: { "GLASS": () => ShaderMaterial, "HOLO": ()=>..., ... },
 *   exact:    { "tower_A": ()=>..., ... }  // опционально
 * }
 * Применяет материал, если имя меша содержит ключ (или совпадает точно).
 */
export function applyMaterialsByTag(root, mapping){
  root.traverse((o)=>{
    if(!o.isMesh) return;
    const name = (o.name || '').toLowerCase();
    let factory = null;
    if(mapping?.exact && mapping.exact[o.name]) factory = mapping.exact[o.name];
    if(!factory && mapping?.includes){
      for(const key of Object.keys(mapping.includes)){
        if(name.includes(key.toLowerCase())){ factory = mapping.includes[key]; break; }
      }
    }
    if(factory){
      const mat = factory();
      if(mat) o.material = mat;
    }
  });
}

/* Обновление униформ каждую рамку */
export function updateUniformsEachFrame(root, t){
  root.traverse((o)=>{
    const m = o.material;
    if(m && m.isShaderMaterial && m.uniforms && m.uniforms.uTime){
      m.uniforms.uTime.value = t;
    }
  });
  // Expose a simple global pulse derived from shader time for UI sync (0..1)
  try {
    if (typeof window !== 'undefined') {
      window._corePulse = 0.5 + 0.5 * Math.sin(t * 0.9);
    }
  } catch(_) {}
}

/* Рёбра как отдельный слой поверх мешей (аддитив) */
export function createEdgeOverlay(mesh, color=0x80F5FF, opacity=0.55){
  const g = new THREE.EdgesGeometry(mesh.geometry, 1);
  const mat = new THREE.LineBasicMaterial({
    color, transparent:true, opacity,
    depthWrite:false, blending:THREE.AdditiveBlending
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.position.copy(mesh.position);
  lines.rotation.copy(mesh.rotation);
  lines.scale.copy(mesh.scale);
  return lines;
}


