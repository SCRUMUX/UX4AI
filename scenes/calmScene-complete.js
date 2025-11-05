/**
 * Calm Scene Plugin - ПОЛНАЯ ВЕРСИЯ
 * Все эффекты из index.html: beamGroups, hologram, nebula, mist, stars, orbits
 */

// THREE.js will be imported via importmap
import * as THREE from 'three';
import { SECTIONS, SECTION_NAMES } from '../core/sections.js';

export function calmSceneCompleteFactory(config) {
  const NODE_PALETTE = config?.colors?.nodePalette || [
    '#5B9CFF', '#22C55E', '#F59E0B', '#EF4444',
    '#8B5CF6', '#14B8A6', '#E11D48', '#A3E635'
  ];

  const IMPULSE_IN_COLOR = config?.colors?.impulseColor || '#5B9CFF';

  // Node definitions - равномерное распределение по 3D пространству
  const nodeDefs = [
    { sectionId: 'about', name: SECTION_NAMES.about, theta: 0, phi: 0, radius: 3.5 },
    { sectionId: 'basics', name: SECTION_NAMES.basics, theta: 45, phi: 30, radius: 4.0 },
    { sectionId: 'patterns', name: SECTION_NAMES.patterns, theta: 90, phi: -25, radius: 4.5 },
    { sectionId: 'assistant', name: SECTION_NAMES.assistant, theta: 135, phi: 35, radius: 4.0 },
    { sectionId: 'prompts', name: SECTION_NAMES.prompts, theta: 180, phi: -30, radius: 4.5 },
    { sectionId: 'operations', name: SECTION_NAMES.operations, theta: 225, phi: 25, radius: 4.0 },
    { sectionId: 'security', name: SECTION_NAMES.security, theta: 270, phi: -20, radius: 4.5 },
    { sectionId: 'marketplace', name: SECTION_NAMES.marketplace, theta: 315, phi: 40, radius: 4.0 }
  ];

  // Helper functions from index.html
  function makeBeamMaterial(colorFromHex, colorToHex, packetColorHex) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        colorFrom: { value: new THREE.Color(colorFromHex) },
        colorTo: { value: new THREE.Color(colorToHex) },
        packetColor: { value: new THREE.Color(packetColorHex || colorFromHex) },
        packetPos: { value: -1.0 },
        packetActive: { value: 0.0 },
        packetWidth: { value: 0.15 },
        glow: { value: 0.03 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 colorFrom, colorTo, packetColor; uniform float packetPos, packetActive, packetWidth, glow;
        varying vec2 vUv;
        void main(){
          float radial = 1.0 - abs(vUv.x - 0.5)*2.0;
          radial = smoothstep(0.0, 0.25, radial);
          vec3 baseCol = mix(colorFrom, colorTo, vUv.y);
          float packet = 0.0;
          if(packetActive > 0.5){
            float dist = abs(vUv.y - packetPos);
            packet = smoothstep(packetWidth, 0.0, dist);
          }
          vec3 col = mix(baseCol, packetColor, packet);
          float a = radial * (glow + packet * (1.0 - glow));
          if(a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }`
    });
    return mat;
  }

  function makeBeamMesh(pA, pB, radius, material, signOverride, curvatureScale = 0.8) {
    const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
    const radialDir = mid.clone().normalize();
    const refAxis = (Math.abs(radialDir.y) < 0.9) ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    const normal = new THREE.Vector3().crossVectors(radialDir, refAxis).normalize();
    const segmentDist = pA.distanceTo(pB);
    const curvatureFactor = curvatureScale;
    const autoSign = (pA.length() > pB.length()) ? -1 : 1;
    const sign = (typeof signOverride === 'number') ? signOverride : autoSign;
    const amplitude = segmentDist * curvatureFactor * sign;
    const controlPoint = (curvatureFactor === 0)
      ? mid.clone() // straight line when control point is at the midpoint colinear
      : mid.clone().add(normal.multiplyScalar(amplitude));
    const curve = new THREE.QuadraticBezierCurve3(pA.clone(), controlPoint, pB.clone());
    const geometry = new THREE.TubeGeometry(curve, 32, radius, 12, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 3;
    return mesh;
  }

  function makeFresnel(baseHex) {
    const base = new THREE.Color(baseHex);
    const glow = base.clone();
    const darker = base.clone().multiplyScalar(0.35);
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 }, base: { value: darker }, glow: { value: glow } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);
          vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz);
          gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 base, glow; uniform float time;
        varying vec3 vN; varying vec3 vV;
        void main(){
          float fr = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
          float pulse = 0.78 + 0.22*sin(time*2.4);
          vec3 col = mix(base, glow, fr) * pulse;
          gl_FragColor = vec4(col, 0.18 + 0.82*fr);
        }`
    });
  }

  function makeBG_DataMist_Dark() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 }, opacity: { value: 0.6 }, scale: { value: 0.6 }, drift: { value: 0.05 }, color: { value: new THREE.Color('#A8D0FF') } },
      vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float time; uniform float opacity; uniform float scale; uniform float drift; uniform vec3 color;
        varying vec3 vPos;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
        float noise(vec3 p){ vec3 i=floor(p), f=fract(p);
          float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
          float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
          vec3 u=f*f*(3.-2.*f);
          return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,g,u.x), mix(h,k,u.x), u.y), u.z);
        }
        float fbm(vec3 p){ float v=0., a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.55;} return v; }
        void main(){
          vec3 P = normalize(vPos);
          float t = time*drift;
          float n = fbm(P*scale + vec3(t, -t*0.7, t*0.4));
          float cloud = smoothstep(0.6, 0.95, n);
          float a = pow(cloud, 1.6)*opacity;
          if(a<0.01) discard;
          gl_FragColor = vec4(color*(0.35+0.65*cloud), a);
        }`
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(15, 64, 64), mat);
    mesh.userData.update = (t) => { mat.uniforms.time.value = t; };
    return mesh;
  }

  function makeBG_ParallaxStars_Dark() {
    function starLayer(count, radius, size, hex, opacity) {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const th = Math.acos(2 * Math.random() - 1);
        const ph = Math.random() * Math.PI * 2;
        pos[i * 3] = radius * Math.sin(th) * Math.cos(ph);
        pos[i * 3 + 1] = radius * Math.cos(th);
        pos[i * 3 + 2] = radius * Math.sin(th) * Math.sin(ph);
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: true, transparent: true, depthWrite: false });
      m.color = new THREE.Color(hex);
      m.opacity = opacity;
      return new THREE.Points(g, m);
    }
    const group = new THREE.Group();
    const far = starLayer(1200, 220, 0.04, '#9AA6B2', 0.38);
    const near = starLayer(700, 150, 0.06, '#5B9CFF', 0.28);
    group.add(far);
    group.add(near);
    group.userData.update = (t) => { far.rotation.y += 0.0002; near.rotation.y -= 0.00035; };
    return group;
  }

  return {
    mount(ctx) {
      const { scene, camera, renderer } = ctx;
      const nodes = [];
      const raycastTargets = [];
      const anchors = [];
      const auraMeshes = [];
      const auraBaseColors = [];
      const beamGroups = [];
      const groupCooldownUntil = [];
      let activePulses = [];
      let nextPulseTime = 0.0;
      // Core wireframe pulse (rendered when impulse reaches the core)
      const coreWireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), wireframe: true, transparent: true, opacity: 0.0, depthWrite: false });
      // Reduce wireframe density ~3x
      const coreWire = new THREE.Mesh(new THREE.SphereGeometry(1.05, 8, 6), coreWireMat);
      coreWire.position.set(0, 0, 0);
      coreWire.name = 'CalmCoreWire';
      coreWire.renderOrder = 4;
      coreWire.visible = false;
      scene.add(coreWire);
      let coreWireState = { active: false, lastSeenTime: 0, color: new THREE.Color('#ffffff'), lastHue: 200 };

      // Background
      scene.background = new THREE.Color(config?.background || '#0B0F14');

      // Lights
      const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x0e1219, 0.6);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(3, 6, 8);
      scene.add(dir);

      // Background mist and stars
      const bg = new THREE.Group();
      const mist = makeBG_DataMist_Dark();
      const stars = makeBG_ParallaxStars_Dark();
      bg.add(mist);
      bg.add(stars);
      scene.add(bg);

      // Create nodes with energy beams
      nodeDefs.forEach((def, idx) => {
        const theta = THREE.MathUtils.degToRad(def.theta);
        const phi = THREE.MathUtils.degToRad(def.phi);
        const x = Math.cos(phi) * Math.cos(theta) * def.radius;
        const y = Math.sin(phi) * def.radius;
        const z = Math.cos(phi) * Math.sin(theta) * def.radius;

        const SPACE_COLOR = '#1B2B47';
        const CORE_COLOR = '#3dbfff';
        const NODE_COLOR = NODE_PALETTE[idx % NODE_PALETTE.length];

        const pNode = new THREE.Vector3(x, y, z);
        const dir = pNode.clone().normalize();
        const coreR = 1.06;
        const pCore = dir.clone().multiplyScalar(coreR);
        const extend = 2.2;
        const rNode = def.radius;
        const pSpace = pNode.clone().multiplyScalar((rNode + extend) / rNode);

        const beamRadius = 0.018;
        
        const matSpaceToNode = makeBeamMaterial(SPACE_COLOR, NODE_COLOR, IMPULSE_IN_COLOR);
        const beamSpaceToNode = makeBeamMesh(pSpace, pNode, beamRadius, matSpaceToNode, -1);
        scene.add(beamSpaceToNode);

        const matNodeToCore = makeBeamMaterial(NODE_COLOR, CORE_COLOR, NODE_COLOR);
        const beamNodeToCore = makeBeamMesh(pNode, pCore, beamRadius * 0.95, matNodeToCore, 1);
        scene.add(beamNodeToCore);

        const matCoreToNode = makeBeamMaterial(CORE_COLOR, NODE_COLOR, NODE_COLOR);
        const beamCoreToNode = makeBeamMesh(pCore, pNode, beamRadius * 0.85, matCoreToNode, 1);
        scene.add(beamCoreToNode);

        const matNodeToSpace = makeBeamMaterial(NODE_COLOR, SPACE_COLOR, IMPULSE_IN_COLOR);
        const beamNodeToSpace = makeBeamMesh(pNode, pSpace, beamRadius * 0.9, matNodeToSpace, -1);
        scene.add(beamNodeToSpace);

        const d1 = pSpace.distanceTo(pNode);
        const d2 = pNode.distanceTo(pCore);
        const totalLength = 2.0 * (d1 + d2);
        const v = totalLength / 2.0;
        const t1 = d1 / v;
        const t2 = d2 / v;
        const t3 = d2 / v;
        const t4 = d1 / v;
        const durations = [t1, t2, t3, t4];

        beamGroups.push({
          beams: [
            // Space → Node (inbound): move packet forward 0 → 1
            { mesh: beamSpaceToNode, material: matSpaceToNode, defaultColor: IMPULSE_IN_COLOR, forward: true },
            // Node → Core (inbound): forward 0 → 1
            { mesh: beamNodeToCore, material: matNodeToCore, defaultColor: NODE_COLOR, forward: true },
            // Core → Node (outbound): reverse 1 → 0
            { mesh: beamCoreToNode, material: matCoreToNode, defaultColor: NODE_COLOR, forward: false },
            // Node → Space (outbound): reverse 1 → 0
            { mesh: beamNodeToSpace, material: matNodeToSpace, defaultColor: IMPULSE_IN_COLOR, forward: false }
          ],
          durations,
          nodeColor: NODE_COLOR
        });
        groupCooldownUntil.push(0);

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 16),
          makeFresnel(NODE_PALETTE[idx % NODE_PALETTE.length])
        );
        sphere.position.set(x, y, z);
        sphere.name = def.name;
        sphere.userData = { sectionId: def.sectionId, name: def.name, color: NODE_COLOR, index: idx, baseScale: 1, pulsePhase: idx * 0.6 };
        sphere.matrixAutoUpdate = true;
        scene.add(sphere);
        nodes.push(sphere);
        raycastTargets.push(sphere);

        anchors.push({ name: def.sectionId, pos: pNode.clone(), sectionName: def.name });

        const baseMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(NODE_COLOR),
          wireframe: true,
          transparent: true,
          opacity: 0.035,
          depthWrite: false
        });
        const baseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.153, 6, 4), baseMat);
        baseMesh.position.set(x, y, z);
        baseMesh.renderOrder = 1;
        scene.add(baseMesh);
        auraMeshes.push(baseMesh);
        auraBaseColors.push(baseMat.color.clone());
      });

      // Hologram shell and inner core
      const gOuter = new THREE.SphereGeometry(1.08, 64, 64);
      const gInner = new THREE.SphereGeometry(1.04, 64, 64);
      
      const holoMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { 
          time: { value: 0 },
          base: { value: new THREE.Color('#6fb6ff') },
          line: { value: new THREE.Color('#c9ecff') },
          speed: { value: 0.012 },
          gridScale: { value: new THREE.Vector2(28.0, 14.0) },
          gridBoost: { value: 1.05 }, baseBoost: { value: 0.45 } 
        },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float time; uniform vec3 base; uniform vec3 line; uniform float speed; uniform vec2 gridScale; uniform float gridBoost; uniform float baseBoost; varying vec3 vN; varying vec3 vV;
          float fresnel(vec3 N, vec3 V){ return pow(1.0 - max(dot(N,V), 0.0), 3.0); }
          void main(){ vec3 N=normalize(vN), V=normalize(vV);
            float u=atan(N.z,N.x)/6.2831853+0.5, v=N.y*0.5+0.5; float t=time*speed;
            float gx=smoothstep(0.0,0.006,abs(fract(u*28.0 - t*0.9)-0.5)-0.495);
            float gy=smoothstep(0.0,0.006,abs(fract(v*14.0 + t*0.6)-0.5)-0.495);
            float grid=max(gx,gy)*gridBoost; float fr=fresnel(N,V)*baseBoost;
            vec3 col=base*fr + line*grid; float a=clamp(fr+grid,0.0,0.9); gl_FragColor=vec4(col,a); }`
      });
      const shell = new THREE.Mesh(gOuter, holoMat);
      shell.renderOrder = 2;
      scene.add(shell);
      
      const swirlMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { 
          time: { value: 0 },
          colorInner: { value: new THREE.Color('#a5f0ff') },
          colorOuter: { value: new THREE.Color('#58b7ff') },
          opacity: { value: 0.55 },
          warpAmp: { value: 1.10 }, warpScale: { value: 3.50 }, warpSpeed: { value: 0.60 }, flicker: { value: 0.25 }, chaos: { value: 0.62 } 
        },
        vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vPos; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vPos=position; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float time; uniform vec3 colorInner; uniform vec3 colorOuter; uniform float opacity; uniform float warpAmp; uniform float warpScale; uniform float warpSpeed; uniform float flicker; uniform float chaos; varying vec3 vN; varying vec3 vV; varying vec3 vPos;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
          float noise(vec3 p){ vec3 i=floor(p), f=fract(p);
            float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
            float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
            vec3 u=f*f*(3.-2.*f);
            return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y),
                       mix(mix(e,g,u.x), mix(h,k,u.x), u.y), u.z);
          }
          float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.55; } return v; }
          float fresnel(vec3 N, vec3 V){ return pow(1.0 - max(dot(N,V), 0.0), 2.0); }
          void main(){
            vec3 N = normalize(vN), V = normalize(vV), P = normalize(vPos);
            float t = time * warpSpeed;
            float n1 = fbm(P*warpScale + vec3(t, -t*0.6, t*0.3));
            float n2 = fbm(P*warpScale*1.7 + vec3(-t*0.4, t*0.8, -t*0.2));
            float n = smoothstep(0.0, 1.0, (n1*0.65 + n2*0.35) * (1.0 + warpAmp*0.6));
            float moving = abs(n1 - n2);
            float energy = mix(n, moving, 0.55);
            float cloud = smoothstep(chaos, 1.0, energy);
            float fr = fresnel(N,V);
            float fl = mix(1.0-flicker, 1.0, 0.5+0.5*sin(time*3.7 + fbm(P*6.0)*4.0));
            float a = (0.18 + 0.82*fr) * opacity * cloud * fl;
            if(a < 0.01) discard;
            vec3 col = mix(colorOuter, colorInner, fr*0.9) * (0.6 + 0.4*cloud);
            gl_FragColor = vec4(col, a);
          }`
      });
      const core = new THREE.Mesh(gInner, swirlMat);
      core.renderOrder = 3;
      scene.add(core);
      
      // Inner nebula (inner core inside the hollow sphere)
      const innerNebulaMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide, blending: THREE.AdditiveBlending,
        uniforms: { 
          time: { value: 0 }, 
          colorA: { value: new THREE.Color('#7cd4ff') }, 
          colorB: { value: new THREE.Color('#9ecbff') },
          opacity: { value: 0.18 }, 
          scale: { value: 2.6 }, 
          drift: { value: 0.22 }, 
          density: { value: 0.85 } 
        },
        vertexShader: `varying vec3 vPos; varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vPos=position; vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float time; uniform vec3 colorA; uniform vec3 colorB; uniform float opacity; uniform float scale; uniform float drift; uniform float density;
          varying vec3 vPos; varying vec3 vN; varying vec3 vV;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453); }
          float noise(vec3 p){
            vec3 i=floor(p), f=fract(p);
            float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
            float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
            vec3 u=f*f*(3.-2.*f);
            return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y),
                       mix(mix(e,g,u.x), mix(h,k,u.x), u.y), u.z);
          }
          float fbm(vec3 p){ float v=0.0, a=0.55; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.52; } return v; }
          float fresnel(vec3 N, vec3 V){ return pow(1.0 - max(dot(N,V),0.0), 2.4); }
          void main(){
            vec3 P = normalize(vPos);
            float t = time*drift;
            float n = fbm(P*scale + vec3(t, -t*0.7, t*0.4));
            float m = fbm(P*scale*1.7 + vec3(-t*0.5, t*0.9, -t*0.2));
            float cloud = smoothstep(0.55, 0.95, n*0.7 + m*0.6);
            float rim = fresnel(normalize(vN), normalize(vV));
            float a = pow(cloud, 1.6) * (0.2 + 0.8*rim) * opacity * density;
            if(a < 0.005) discard;
            vec3 col = mix(colorA, colorB, n*0.6 + m*0.4) * (0.6 + 0.4*rim);
            gl_FragColor = vec4(col, a);
          }`
      });
      const innerNebula = new THREE.Mesh(new THREE.SphereGeometry(1.06, 128, 128), innerNebulaMat);
      innerNebula.renderOrder = 2;
      scene.add(innerNebula);
      
      // Store for animation
      const coreObjects = { shell, core, innerNebula, holoMat, swirlMat, innerNebulaMat };
      
      // Data Stream rings - электрический голографический эффект
      function makeStreamMat() {
        return new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { 
            time: { value: 0 }, 
            color: { value: new THREE.Color('#2d5a7f') }, 
            colorB: { value: new THREE.Color('#3d7ab3') },
            opacity: { value: 1.0 }, 
            segs: { value: 6.0 }, 
            speed: { value: 2.5 }, 
            jitter: { value: 0.2 },
            fresnelBoost: { value: 2.0 },
            blinkSpeed: { value: 15.0 },
            noiseAmount: { value: 0.3 },
            pulseColor: { value: new THREE.Color('#2d5a7f') },
            pulseIntensity: { value: 0.0 }
          },
          vertexShader: `varying vec2 vUv2; varying vec3 vN; varying vec3 vV; varying vec3 vPos; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vPos=position; vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vUv2=uv; gl_Position=projectionMatrix*mv; }`,
          fragmentShader: `uniform float time; uniform vec3 color; uniform vec3 colorB; uniform float opacity; uniform float segs; uniform float speed; uniform float jitter; uniform float fresnelBoost; uniform float blinkSpeed; uniform float noiseAmount; uniform vec3 pulseColor; uniform float pulseIntensity; varying vec2 vUv2; varying vec3 vN; varying vec3 vV; varying vec3 vPos;
            float fr(vec3 N, vec3 V){ return pow(1.0 - max(dot(N,V),0.0), fresnelBoost); }
            float rnd(float x){ return fract(sin(x*78.233)*43758.5453); }
            void main(){
              vec3 N = normalize(vN); vec3 V = normalize(vV);
              float rim = fr(N, V);
              
              float u = vUv2.x; float t = time*speed;
              float seg = floor(u*segs);
              float off = rnd(seg)*jitter;
              float head = fract(u*segs - t - off);
              float pulse = smoothstep(0.15, 0.0, abs(head-0.5));
              float tail = smoothstep(0.7, 0.1, head);
              
              // Быстрое мигание
              float blink = step(0.6, fract(time * blinkSpeed));
              
              // Шум для электрического эффекта
              float noise = rnd(seg + time * 0.1) * noiseAmount;
              
              // Импульсный эффект
              float impulse = sin(time * 5.0) * 0.5 + 0.5;
              
              // Переход цвета как у туманности
              float colorMix = rnd(seg + time * 0.05);
              vec3 baseCol = mix(color, colorB, colorMix * 0.7);
              
              // ДОБАВЛЯЕМ ЦВЕТ ИМПУЛЬСА ИЗВНЕ (когда node импульс попадает в центр)
              vec3 finalColor = mix(baseCol, pulseColor, pulseIntensity * 0.6);
              
              float a = (pulse*0.98 + tail*0.7) * rim * opacity;
              a *= (0.3 + 0.5*blink);
              a += noise * 0.2;
              a *= (0.35 + 0.55*impulse);
              // НЕ меняем яркость
              
              if(a < 0.01) discard;
              
              vec3 col = finalColor * (0.4 + 0.5*pulse + 0.6*impulse + noise*0.3);
              gl_FragColor = vec4(col, a);
            }`
        });
      }
      
      const streamGroup = new THREE.Group();
      const streamGeo = new THREE.TorusGeometry(1.03, 0.035, 16, 360);
      [0,1,2,3,4,5,6].forEach(i => {
        const mat = makeStreamMat();
        const m = new THREE.Mesh(streamGeo, mat);
        // Разные плоскости для каждой орбиты
        if (i === 0) m.rotation.x = 0.0;
        if (i === 1) m.rotation.x = Math.PI * 0.5;
        if (i === 2) m.rotation.set(Math.PI * 0.33, 0, Math.PI * 0.23);
        if (i === 3) m.rotation.set(Math.PI * 0.66, Math.PI * 0.33, Math.PI * 0.15);
        if (i === 4) m.rotation.set(Math.PI * 0.25, Math.PI * 0.66, Math.PI * 0.5);
        if (i === 5) m.rotation.set(Math.PI * 0.75, Math.PI * 0.25, Math.PI * 0.35);
        if (i === 6) m.rotation.set(Math.PI * 0.4, Math.PI * 0.4, Math.PI * 0.6);
        m.renderOrder = 4;
        m.userData.phase = i * 0.4;
        m.userData.material = mat;
        streamGroup.add(m);
      });
      streamGroup.userData._rotate = { y: 0.025, x: 0.015, z: 0.005 }; // Быстрое вращение с Z
      scene.add(streamGroup);
      
      // Moiré outer orbits
      function matMoire() {
        return new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { 
            time: { value: 0 }, 
            color: { value: new THREE.Color('#cfefff') }, 
            opacity: { value: 0.30 }, 
            speed: { value: 0.005 }, 
            freqA: { value: 22.0 }, 
            freqB: { value: 26.0 } 
          },
          vertexShader: `varying vec2 vUv2; varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vUv2=uv; vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
          fragmentShader: `uniform float time; uniform vec3 color; uniform float opacity; uniform float speed; uniform float freqA; uniform float freqB; varying vec2 vUv2; varying vec3 vN; varying vec3 vV;
            float fr(vec3 N, vec3 V){ return pow(1.0 - max(dot(N,V),0.0), 2.2); }
            void main(){
              float u = vUv2.x*6.28318;
              float w1 = 0.5 + 0.5*sin(u*freqA - time*speed*120.0);
              float w2 = 0.5 + 0.5*sin(u*freqB + time*speed*140.0);
              float moire = abs(w1 - w2);
              float rim = smoothstep(0.35,1.0, fr(normalize(vN),normalize(vV)));
              float a = rim * (0.35 + 0.65*moire) * opacity;
              if(a<0.01) discard;
              gl_FragColor = vec4(color * (0.6 + 0.4*moire), a);
            }`
        });
      }
      
      const orbitGroup = new THREE.Group();
      orbitGroup.userData._rotate = { y: 0.0, x: 0.0 }; // Группа не вращается
      [3,4,5].forEach((r, i) => {
        const tor = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 16, 720), matMoire());
        if (i === 0) tor.rotation.set(Math.PI * 0.3, Math.PI * 0.2, 0);
        if (i === 1) tor.rotation.set(0, Math.PI * 0.42, Math.PI * 0.25);
        if (i === 2) tor.rotation.set(Math.PI * 0.18, Math.PI * 0.12, Math.PI * 0.5);
        tor.userData._mat = tor.material;
        tor.renderOrder = 1;
        // Каждая орбита вращается в свою сторону с разными скоростями
        const sign = (i % 2 === 0 ? 1 : -1); // Чередование направления
        tor.userData.rotateSpeed = { 
          y: sign * (0.0005 + i * 0.0001), 
          x: sign * (-0.0003 + i * 0.00005),
          z: sign * (0.0002 - i * 0.00003)
        };
        orbitGroup.add(tor);
      });
      scene.add(orbitGroup);
      
      // Store stream and orbit groups for animation
      const effectGroups = { streamGroup, orbitGroup };

      function updatePulses(time) {
        for (let i = activePulses.length - 1; i >= 0; i--) {
          const pulse = activePulses[i];
          const group = beamGroups[pulse.groupIndex];
          const dt = time - pulse.startTime;
          if (dt > 2.3) { // extend total path by ~0.3s
            group.beams.forEach((beamObj) => {
              beamObj.material.uniforms.packetActive.value = 0.0;
            });
            activePulses.splice(i, 1);
            // start cooldown to avoid immediate re-spawn on the same path
            if (typeof groupCooldownUntil[pulse.groupIndex] === 'number') {
              groupCooldownUntil[pulse.groupIndex] = time + 2.5;
            }
            continue;
          }
          const dur = group.durations;
          let segIdx = 0;
          let local = 0.0;
          if (dt < dur[0]) {
            segIdx = 0;
            local = dt / dur[0];
          } else if (dt < dur[0] + dur[1]) {
            segIdx = 1;
            local = (dt - dur[0]) / dur[1];
          } else if (dt < dur[0] + dur[1] + dur[2]) {
            segIdx = 2;
            local = (dt - dur[0] - dur[1]) / dur[2];
          } else {
            segIdx = 3;
            local = (dt - dur[0] - dur[1] - dur[2]) / dur[3];
          }
          for (let j = 0; j < group.beams.length; j++) {
            const beamObj = group.beams[j];
            const active = (j === segIdx) ? 1.0 : 0.0;
            beamObj.material.uniforms.packetActive.value = active;
            if (active > 0.5) {
              const dirForward = (beamObj.forward !== false);
              const pos = dirForward ? local : (1.0 - local);
              beamObj.material.uniforms.packetPos.value = pos;
              const packetColorHex = (j === 0 || j === 3) ? IMPULSE_IN_COLOR : group.nodeColor;
              beamObj.material.uniforms.packetColor.value.set(packetColorHex);
              
              // КОГДА ИМПУЛЬС ИДЕТ К ЦЕНТРУ (segIdx === 1), РАСКРАСИМ МАЛЕНЬКИЕ ОРБИТЫ
              if (j === 1 && segIdx === 1) { // segment 1: node → core
                const pulseIntensity = 0.4 + 0.4 * (1.0 - local); // Меньше максимальная интенсивность
                effectGroups.streamGroup.children.forEach(orbitMesh => {
                  if (orbitMesh.userData.material && orbitMesh.userData.material.uniforms) {
                    orbitMesh.userData.material.uniforms.pulseColor.value.set(packetColorHex);
                    orbitMesh.userData.material.uniforms.pulseIntensity.value = pulseIntensity;
                  }
                });
                // Activate core wireframe pulse with the packet color
                coreWireState.active = true;
                coreWireState.lastSeenTime = time;
                coreWireState.color.set(packetColorHex);
                // Глобальный триггер для сетки: мгновенная вспышка и оттенок
                try {
                  if (typeof window !== 'undefined') {
                    const col = new THREE.Color(packetColorHex);
                    const hsl = col.getHSL({h:0,s:0,l:0});
                    const hueDeg = hsl.h * 360;
                    const intensity = Math.max(0, Math.min(1, pulseIntensity));
                    window.dispatchEvent(new CustomEvent('calmPulse', { detail: { hueDeg, intensity, ts: (typeof performance!=='undefined'?performance.now():Date.now()) } }));
                    // Keep globals in sync for fallbacks
                    window._corePulseStep = 1;
                    window._coreHueDeg = hueDeg;
                  }
                } catch(_) {}
              }
            }
          }
        }
        
        // Затухание импульса, если нет активных импульсов к центру
        let hasActiveToCenter = false;
        for (let i = 0; i < activePulses.length; i++) {
          const pulse = activePulses[i];
          const group = beamGroups[pulse.groupIndex];
          const dt = time - pulse.startTime;
          const dur = group.durations;
          let segIdx = 0;
          if (dt < dur[0]) segIdx = 0;
          else if (dt < dur[0] + dur[1]) segIdx = 1;
          else if (dt < dur[0] + dur[1] + dur[2]) segIdx = 2;
          else segIdx = 3;
          
          if (segIdx === 1) {
            hasActiveToCenter = true;
            // Activate core wireframe pulse with packet color
            coreWireState.active = true;
            coreWireState.lastSeenTime = time;
            if (group && group.beams && group.beams.length > 0) {
              // Use packet color for visibility
              const packetColorHex = IMPULSE_IN_COLOR;
              coreWireState.color.set(packetColorHex);
            }
            break;
          }
        }
        
        // Плавное затухание если нет активных импульсов
        if (!hasActiveToCenter) {
          effectGroups.streamGroup.children.forEach(orbitMesh => {
            if (orbitMesh.userData.material && orbitMesh.userData.material.uniforms) {
              orbitMesh.userData.material.uniforms.pulseIntensity.value *= 0.95;
            }
          });
          // Let core wireframe fade out
          if (coreWireState.active) {
            if (time - coreWireState.lastSeenTime > 0.65) { // extend presence by ~0.3s
              coreWireState.active = false;
            }
          }
        }
        // Reset step only after a short grace since last trigger
        try {
          if (typeof window !== 'undefined') {
            if (typeof coreWireState.lastSeenTime === 'number') {
              if (time - coreWireState.lastSeenTime > 0.12) {
                window._corePulseStep = 0;
              }
            } else {
              window._corePulseStep = 0;
            }
          }
        } catch(_) {}
      }

      function spawnPulse(currentTime) {
        const available = [];
        for (let i = 0; i < beamGroups.length; i++) {
          let found = false;
          for (let j = 0; j < activePulses.length; j++) {
            if (activePulses[j].groupIndex === i) {
              found = true;
              break;
            }
          }
          const cooldownOk = (groupCooldownUntil[i] || 0) <= currentTime;
          if (!found && cooldownOk) available.push(i);
        }
        if (available.length === 0) return;
        const chosen = available[Math.floor(Math.random() * available.length)];
        activePulses.push({ groupIndex: chosen, startTime: currentTime });
        nextPulseTime = currentTime + (2.5 + Math.random() * 1.2);
      }

      function update(t, dt) {
        if (mist && mist.userData.update) mist.userData.update(t);
        if (stars && stars.userData.update) stars.userData.update(t);
        if (coreObjects.shell && coreObjects.holoMat.uniforms) {
          coreObjects.shell.rotation.y += 0.0012;
          coreObjects.holoMat.uniforms.time.value = t;
        }
        if (coreObjects.core && coreObjects.swirlMat.uniforms) {
          coreObjects.swirlMat.uniforms.time.value = t;
        }
        if (coreObjects.innerNebula && coreObjects.innerNebulaMat.uniforms) {
          coreObjects.innerNebulaMat.uniforms.time.value = t;
        }
        if (effectGroups.streamGroup && effectGroups.streamGroup.userData._rotate) {
          const rot = effectGroups.streamGroup.userData._rotate;
          effectGroups.streamGroup.rotation.y += rot.y;
          effectGroups.streamGroup.rotation.x += rot.x || 0;
          effectGroups.streamGroup.rotation.z += rot.z || 0;
          effectGroups.streamGroup.children.forEach(m => {
            if (m.userData.material && m.userData.material.uniforms) {
              m.userData.material.uniforms.time.value = t + (m.userData.phase || 0);
              if (m.userData.material.uniforms.pulseSpeed) {
                m.userData.material.uniforms.pulseSpeed.value = 2.0;
              }
            }
          });
        }
        if (effectGroups.orbitGroup) {
          effectGroups.orbitGroup.children.forEach(tor => {
            if (tor.userData._mat && tor.userData._mat.uniforms) {
              tor.userData._mat.uniforms.time.value = t;
            }
            // Individual rotation for each orbit - разные направления
            if (tor.userData.rotateSpeed) {
              tor.rotation.y += tor.userData.rotateSpeed.y;
              tor.rotation.x += tor.userData.rotateSpeed.x;
              tor.rotation.z += tor.userData.rotateSpeed.z;
            }
          });
        }
        if (beamGroups.length > 0 && t >= nextPulseTime) {
          spawnPulse(t);
        }
        updatePulses(t);

        // Update core wireframe pulse
        if (coreWire) {
          if (coreWireState.active) {
            coreWire.visible = true;
            // Sample current small-orbit pulse color/intensity to follow their shade
            let sampledColor = null;
            let sampledIntensity = 0.0;
            if (effectGroups && effectGroups.streamGroup && effectGroups.streamGroup.children.length > 0) {
              for (let k = 0; k < effectGroups.streamGroup.children.length; k++) {
                const om = effectGroups.streamGroup.children[k];
                const u = om?.userData?.material?.uniforms;
                if (u && u.pulseColor && u.pulseIntensity) {
                  sampledColor = u.pulseColor.value; // THREE.Color
                  sampledIntensity = u.pulseIntensity.value; // 0..1
                  break;
                }
              }
            }
            if (sampledColor) {
              coreWire.material.color.copy(sampledColor);
            } else {
              coreWire.material.color.copy(coreWireState.color);
            }
            // Keep within the core shell bounds (<= inner sphere radius ~1.06)
            // 27x faster for glitch-like lightning effect
            const sNorm = 0.5 + 0.5 * Math.sin(t * 16.0 * 27.0);
            // Exponential, broken spike (glitch-like): fast rise, sharp fall, then low jitter
            const spikePhase = (t * 16.0 * 27.0) % 1.0;
            let spike = 0.0;
            if (spikePhase < 0.12) {
              // Fast exponential rise
              const x = spikePhase / 0.12;
              spike = Math.pow(x, 0.25);
            } else if (spikePhase < 0.28) {
              // Sharper fall
              const x = (spikePhase - 0.12) / 0.16;
              spike = Math.pow(1.0 - x, 1.5);
            } else {
              // Low jitter tail to avoid flatline
              spike = 0.06 * (0.5 + 0.5 * Math.sin(t * 33.0 + 0.9));
            }
            // Amplitude from near-point to inner core boundary
            const minS = 0.02, maxS = 0.99; // from almost point-like to just inside core
            const s = minS + (maxS - minS) * spike;
            coreWire.scale.set(s, s, s);
            // Opacity follows an exponential of the spike for more transparency
            const spikeExp = Math.pow(spike, 2.2);
            const baseOp = 0.005;
            const varOp = 0.02 * spikeExp;
            const hf = 0.01 * (0.5 + 0.5 * Math.sin(t * 57.0 + 0.4));
            const intensityBoost = 0.08 * (sampledIntensity || 0.0);
            coreWire.material.opacity = Math.min(1.0, 0.75 * (baseOp + varOp + hf + intensityBoost) + 0.1);
            coreWire.material.needsUpdate = true;
            // Publish exact wireframe-driven pulse/hue for UI grid sync
            try {
              if (typeof window !== 'undefined') {
                // Normalize opacity to 0..1 as pulse
                const p = Math.max(0, Math.min(1, coreWire.material.opacity));
                window._corePulse = p;
                // Hue from current wireframe color
                const c = coreWire.material.color;
                const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
                let h = coreWireState.lastHue || 200; const d = max - min;
                if (d > 1e-5) {
                  if (max === c.r) h = ((c.g - c.b) / d) % 6;
                  else if (max === c.g) h = (c.b - c.r) / d + 2;
                  else h = (c.r - c.g) / d + 4;
                  h *= 60; if (h < 0) h += 360;
                  coreWireState.lastHue = h; // save for fallback
                }
                window._coreHueDeg = coreWireState.lastHue;
                // Stable getter for external consumers
                const rgb = { r: Math.round(c.r*255), g: Math.round(c.g*255), b: Math.round(c.b*255) };
                window.__getCalmWireframeState = function(){
                  return { hueDeg: window._coreHueDeg, intensity: window._corePulse, rgb };
                };
                // Flash window to help the UI catch the peak
                if (typeof performance !== 'undefined' && step === 1) {
                  window._coreFlashUntilMs = performance.now() + 140; // shorter, crisper
                }
              }
            } catch(_) {}
          } else {
            // Smoothly fade out and hide
            coreWire.material.opacity *= 0.85;
            if (coreWire.material.opacity < 0.01) {
              coreWire.visible = false;
              coreWire.material.opacity = 0.0;
            }
            // Still publish last known hue even when fading (for grid sync)
            try {
              if (typeof window !== 'undefined') {
                window._corePulse = Math.max(0, coreWire.material.opacity);
                window._coreHueDeg = coreWireState.lastHue || 200;
                const c = coreWire.material.color;
                const rgb = { r: Math.round(c.r*255), g: Math.round(c.g*255), b: Math.round(c.b*255) };
                window.__getCalmWireframeState = function(){
                  return { hueDeg: window._coreHueDeg, intensity: window._corePulse, rgb };
                };
              }
            } catch(_) {}
          }
        }

        // Gentle node pulsation; rotate wireframe only (inside aura)
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          // Drive shader time if present (fresnel pulse)
          const mat = node.material;
          if (mat && mat.uniforms && mat.uniforms.time) {
            mat.uniforms.time.value = t;
          }
          const phase = node.userData?.pulsePhase || (i * 0.6);
          const s = 1.0 + 0.04 * Math.sin(t * 1.8 + phase);
          node.scale.setScalar(s);
          node.updateMatrix();
          node.updateMatrixWorld();
          if (auraMeshes[i]) {
            // keep wireframe slightly inside the main sphere and rotate it
            auraMeshes[i].scale.setScalar(0.98 * s);
            auraMeshes[i].rotation.y += 0.001; /* 30x slower total */
            if (auraMeshes[i].material) {
              // Opacity pulse (desynced from scale):
              const opPulse = Math.sin(t * 1.53 + i * 1.17);
              const a = 0.08 + 0.06 * (0.5 + 0.5 * opPulse);
              auraMeshes[i].material.opacity = a * 0.25; /* reduce visibility to quarter */
              // Intensity pulse via color brightness (desynced from opacity):
              if (auraBaseColors[i]) {
                const brPulse = Math.sin(t * 1.27 + i * 1.91);
                const k = 0.85 + 0.20 * (0.5 + 0.5 * brPulse);
                auraMeshes[i].material.color.copy(auraBaseColors[i]).multiplyScalar(k);
              }
              auraMeshes[i].material.needsUpdate = true;
            }
          }
        }
      }

      function resize(width, height) {
        // Handled by engine
      }

      function dispose() {
        nodes.forEach(node => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) node.material.dispose();
        });
        beamGroups.forEach(group => {
          group.beams.forEach(beam => {
            if (beam.material) beam.material.dispose();
            if (beam.mesh && beam.mesh.geometry) beam.mesh.geometry.dispose();
          });
        });
        if (mist.geometry) mist.geometry.dispose();
        if (mist.material) mist.material.dispose();
        if (stars.children) {
          stars.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
        if (coreObjects.shell) {
          if (coreObjects.shell.geometry) coreObjects.shell.geometry.dispose();
          if (coreObjects.holoMat) coreObjects.holoMat.dispose();
        }
        if (coreObjects.core) {
          if (coreObjects.core.geometry) coreObjects.core.geometry.dispose();
          if (coreObjects.swirlMat) coreObjects.swirlMat.dispose();
        }
        if (coreObjects.innerNebula) {
          if (coreObjects.innerNebula.geometry) coreObjects.innerNebula.geometry.dispose();
          if (coreObjects.innerNebulaMat) coreObjects.innerNebulaMat.dispose();
        }
        if (effectGroups.streamGroup) {
          effectGroups.streamGroup.children.forEach(m => {
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
          });
        }
        if (effectGroups.orbitGroup) {
          effectGroups.orbitGroup.children.forEach(tor => {
            if (tor.geometry) tor.geometry.dispose();
            if (tor.userData._mat) tor.userData._mat.dispose();
          });
        }
      }

      // Public wireframe state for UI grid: hue + sharp flash step
      function getWireframeState() {
        let hueDeg = coreWireState.lastHue || 200;
        let flash = 0;
        let rgb = { r: 180, g: 210, b: 255 };
        let intensity = 0.0;
        if (coreWire && coreWire.material && coreWire.material.color) {
          // compute hue from current material color every call
          const c = coreWire.material.color;
          const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
          const d = max - min;
          if (d > 1e-5) {
            let h = 0;
            if (max === c.r) h = ((c.g - c.b) / d) % 6;
            else if (max === c.g) h = (c.b - c.r) / d + 2;
            else h = (c.r - c.g) / d + 4;
            h *= 60; if (h < 0) h += 360;
            hueDeg = h;
          }
          rgb = { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) };
          // derive flash from actual opacity (sharp threshold)
          const op = Number(coreWire.material.opacity) || 0;
          flash = op >= 0.25 ? 1 : 0;
          intensity = Math.max(0, Math.min(1, op));
        }
        return { hueDeg, flash, rgb, intensity };
      }

      return {
        raycastTargets,
        nodes,
        getLabelAnchors: () => anchors,
        navigateTo: async (sectionId) => {
          const node = nodes.find(n => n.userData.sectionId === sectionId);
          if (node) {
            // Navigate to node (implementation in navigation.js)
          }
        },
        update,
        resize,
        dispose,
        getWireframeState
      };
    }
  };
}

// Expose Calm plugin getter for external consumers (grid overlay)
try {
  if (typeof window !== 'undefined') {
    window.__CALM_PLUGIN_AVAILABLE__ = true;
  }
} catch(_) {}

