/**
 * Matrix Scene - Data City drive-through (X-Z plane, Y up)
 * Implements a single road spline and a driver camera without orbiting.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { makeGlassPlus, makeHoloDepth, makeNeonHalo, makeScanlinesCRT, updateUniformsEachFrame } from '../utils/cyber_materials.js?v=42';
import { SECTION_NAMES } from '../core/sections.js';

export function matrixSceneFactory(config) {
  // Will generate nodes after creating the path curve in mount()
  const NUM_NODES = 8;
  
  const defaults = {
    nodes: [], // Will be populated in mount() based on actual curve
    road_points: [],
    marks: [],
    camera: { 
      eyeHeight: 1.5,      // Ещё ниже: почти касаемся дороги
      lookAhead: 0.012,    // Смотрит вперед по пути
      speed: 3,            // Базовая скорость
      tilt: 0.03,          // Положительный наклон (слегка вверх)
      shake: 0.02          // Минимальные микроколебания
    }
  };

  const cfg = { ...defaults, ...config };
  cfg.camera = { ...defaults.camera, ...(config?.camera || {}) };

  console.log('[MatrixScene] Factory config received:', config);

  const TOK = {
    colors: {
      bg: 0xe8f4ff,        // Светлый небесно-голубой
      fog: 0xd8ecff,       // Атмосферный туман
      ground: 0xf0f4f8,    // Светло-серый асфальт
      road: 0xe0e6ec,      // Дорога
      tower: 0xffffff,     // Белые здания
      towerGlass: 0xe3f2fd, // Стеклянные фасады
      towerEdge: 0x5cb6ff,  // Неоновые края (голубой)
      neonAccent: 0x00d4ff, // Яркий неон
      route: 0x5cb6ff,      // Путь (голубой)
      highlight: 0x2563eb
    }
  };

  return {
    mount(ctx) {
      const { scene, renderer } = ctx;

      // Create dedicated camera for Matrix scene (independent from global navigation)
      const driveCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
      const originalCamera = ctx.camera;

      // Scene environment - светлый киберпанк день
      scene.background = new THREE.Color(TOK.colors.bg);
      scene.fog = new THREE.Fog(TOK.colors.fog, 600, 1800); // Мягкий дальний туман (увеличен для 3x масштаба)
      
      // Ambient light - яркое рассеянное освещение
      const ambient = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambient);
      
      // Hemisphere light - небо + отражение от земли
      const hemi = new THREE.HemisphereLight(0xe8f4ff, 0xf0f4f8, 0.6);
      scene.add(hemi);

      // Center-screen development label (dismissible)
      let devLabelEl = null;
      try {
        devLabelEl = document.createElement('div');
        devLabelEl.id = 'matrix-dev-label';
        devLabelEl.style.position = 'fixed';
        devLabelEl.style.left = '50%';
        devLabelEl.style.top = '50%';
        devLabelEl.style.transform = 'translate(-50%, -50%)';
        devLabelEl.style.zIndex = '2100';
        devLabelEl.style.pointerEvents = 'auto';
        devLabelEl.style.padding = '18px 22px';
        devLabelEl.style.background = 'rgba(18,23,34,0.70)';
        devLabelEl.style.color = '#E6EEF8';
        devLabelEl.style.border = '1px solid #243041';
        devLabelEl.style.borderRadius = '8px';
        devLabelEl.style.font = '600 24px/1.3 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
        devLabelEl.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)';
        devLabelEl.style.textAlign = 'center';
        devLabelEl.style.maxWidth = '90vw';
        devLabelEl.style.whiteSpace = 'pre-wrap';
        devLabelEl.textContent = 'Фигачит глубокая творческая разработочка :)';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Закрыть');
        closeBtn.textContent = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '6px';
        closeBtn.style.right = '8px';
        closeBtn.style.padding = '4px 8px';
        closeBtn.style.font = '600 16px/1 ui-sans-serif, system-ui';
        closeBtn.style.color = '#9AA6B2';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', ()=>{ try{ devLabelEl.remove(); }catch(_){} });
        devLabelEl.appendChild(closeBtn);
        document.body.appendChild(devLabelEl);
      } catch(_) {}
      
      // Directional light - солнце под углом 45°
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      sun.position.set(300, 300, 150); // Увеличено для 3x масштаба
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.left = -600;  // -200 * 3
      sun.shadow.camera.right = 600;  // 200 * 3
      sun.shadow.camera.top = 600;    // 200 * 3
      sun.shadow.camera.bottom = -600; // -200 * 3
      scene.add(sun);

      // Загружаем готовую сцену Matrix.glb
      const loader = new GLTFLoader();
      let matrixModel = null;
      let pathPoints = [];
      let mixer = null;
      let mixerActions = [];
      // Programmatic animation targets
      const programmaticAnim = { planet: null, rings: [] };
      const urlParams = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : null;
      const debugAnim = urlParams ? (urlParams.get('animdebug') === '1') : false;

      // Deterministic pseudo-random helpers based on name
      function hashString(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }
      function seededRand(seed, min = 0, max = 1) {
        // xorshift32
        let x = seed || 123456789;
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        const n = (x >>> 0) / 4294967296;
        return min + (max - min) * n;
      }
      function resolveRotatable(node) {
        if (!node) return null;
        if (node.isMesh) return node;
        let found = null;
        node.traverse((c) => { if (!found && c.isMesh) { found = c; } });
        return found || node;
      }

      function choosePivot(node) {
        if (!node) return null;
        // Prefer a meaningful parent as rotation pivot if exists
        if (node.parent && node.parent !== matrixModel) {
          return node.parent;
        }
        return node;
      }

      function createPivotFor(node) {
        if (!node || !node.parent) return node;
        const parent = node.parent;
        // Create pivot and insert at node's position
        const pivot = new THREE.Object3D();
        // Compute node's local position relative to parent
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);
        const parentWorldInverse = parent.matrixWorld.clone().invert();
        const localPos = worldPos.clone().applyMatrix4(parentWorldInverse);
        pivot.position.copy(localPos);
        parent.add(pivot);
        // Reparent node under pivot while preserving world transform
        try { pivot.attach(node); } catch (_) { try { pivot.add(node); } catch (_) {} }
        pivot.updateMatrixWorld(true);
        return pivot;
      }

      function createOrbitPivotAt(worldPos, parent) {
        if (!parent) return null;
        const pivot = new THREE.Object3D();
        // Convert world position into parent's local space
        const inv = parent.matrixWorld.clone().invert();
        const local = worldPos.clone().applyMatrix4(inv);
        pivot.position.copy(local);
        parent.add(pivot);
        pivot.updateMatrixWorld(true);
        return pivot;
      }
      
      const glbUrl = `./Matrix.glb?v=${(typeof performance !== 'undefined' ? Math.floor(performance.now()) : Date.now())}`;
      loader.load(glbUrl, (gltf) => {
        matrixModel = gltf.scene;
        
        // Масштабируем сцену в 3 раза
        matrixModel.scale.set(1.5, 1.5, 1.5);
        
        scene.add(matrixModel);
        console.log('[MatrixScene] ✅ Matrix.glb loaded and scaled 3x');
        
        // Инициализируем и запускаем анимации (если есть)
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(matrixModel);
          mixer.timeScale = 0.5; // замедляем все анимации в 2 раза
          mixerActions = gltf.animations.map((clip) => {
            const action = mixer.clipAction(clip);
            action.setEffectiveTimeScale(0.5);
            action.reset();
            action.play();
            return action;
          });
          console.log('[MatrixScene] ▶️ Animations found and started:', gltf.animations.map(c => c.name));
        } else {
          console.log('[MatrixScene] ℹ️ No animations in GLB');
        }

        // Логируем все объекты для отладки
        const allObjects = [];
        matrixModel.traverse((child) => {
          if (child.name) allObjects.push(child.name);
        });
        console.log('[MatrixScene] 🔍 All objects in scene:', allObjects.join(', '));

        // Apply random cyber materials (deterministic by mesh name)
        const materialFactories = [
          () => makeGlassPlus({ opacity: 0.35, refraction: 0.65, stereo: 0.25 }),
          () => makeHoloDepth({ opacity: 0.75, hScale: 0.18, hGlitch: 0.08 }),
          () => makeNeonHalo({ opacity: 0.95, nHalo: 0.55, nPeak: 0.9, gain: 1.25 }),
          () => makeScanlinesCRT({ opacity: 0.7, sDen: 0.85, sBri: 1.05, reverse: 0.0 })
        ];
        const assigned = [];
        matrixModel.traverse((o) => {
          if (!o || !o.isMesh || !o.geometry) return;
          const name = o.name || 'mesh';
          // Stable index by name
          let h = 2166136261 >>> 0;
          for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
          const idx = (h % materialFactories.length) >>> 0;
          try {
            const mat = materialFactories[idx]();
            if (mat) {
              o.material = mat;
              assigned.push(`${name}->#${idx}`);
            }
          } catch (_) {}
        });
        console.log('[MatrixScene] 🎨 Materials assigned:', assigned.slice(0, 24).join(' | '), assigned.length > 24 ? `...(+${assigned.length-24})` : '');

        // Explicit overrides for key objects to ensure visible effect
        const planetObj = matrixModel.getObjectByName('Planet') || matrixModel.getObjectByName('Circle.001');
        const torus1Raw = matrixModel.getObjectByName('Torus001') || matrixModel.getObjectByName('Torus.001');
        const torus2Raw = matrixModel.getObjectByName('Torus002') || matrixModel.getObjectByName('Torus.002');
        const torus3Raw = matrixModel.getObjectByName('Torus038') || matrixModel.getObjectByName('Torus.0038');
        const planetMesh = resolveRotatable(planetObj);
        const torus1 = resolveRotatable(torus1Raw);
        const torus2 = resolveRotatable(torus2Raw);
        const torus3 = resolveRotatable(torus3Raw);
        if (planetMesh && planetMesh.isMesh) {
          planetMesh.material = makeHoloDepth({ opacity: 0.9, hScale: 0.14, hGlitch: 0.12, gain: 1.3 });
          console.log('[MatrixScene] 🎯 Planet material set: HOLO on', planetMesh.name || '(mesh)');
        }
        const neonSet = ()=> makeNeonHalo({ opacity: 0.95, nHalo: 0.7, nPeak: 1.0, gain: 1.4, edge: 2.1 });
        if (torus1 && torus1.isMesh) { torus1.material = neonSet(); console.log('[MatrixScene] 🎯 Torus001 material set: NEON on', torus1.name || '(mesh)'); }
        if (torus2 && torus2.isMesh) { torus2.material = neonSet(); console.log('[MatrixScene] 🎯 Torus002 material set: NEON on', torus2.name || '(mesh)'); }
        if (torus3 && torus3.isMesh) { torus3.material = neonSet(); console.log('[MatrixScene] 🎯 Torus038 material set: NEON on', torus3.name || '(mesh)'); }

        // Setup programmatic rotations: planet and rings
        const planetNamePattern = /(Окруж|Окружность|Сфера|Sphere|Circle|Планет|Planet)/i;
        const ringNamePattern = /(torus|tor|торус|тор|ring|кольц)/i;
        const sphereGeomPattern = /Sphere/i;
        const torusGeomPattern = /Torus/i;
        const planetCandidates = [];
        const ringCandidates = [];
        // Try to locate an inner core/wireframe sphere to sync UI pulse
        const coreNamePattern = /(core|ядро|wire|wireframe|inner|center)/i;
        let corePulseTarget = null;
        
        matrixModel.traverse((child) => {
          if (!child || !child.name) return;
          const geomType = (child.geometry && child.geometry.type) ? String(child.geometry.type) : '';
          // Central planet by flexible name match
          if (planetNamePattern.test(child.name) || sphereGeomPattern.test(geomType)) {
            planetCandidates.push({ child, geomType });
          }
          // Possible core sphere for pulse sync
          if (!corePulseTarget) {
            if (coreNamePattern.test(child.name) || sphereGeomPattern.test(geomType)) {
              corePulseTarget = child;
            }
          }
          // Torus rings by name match
          if (ringNamePattern.test(child.name) || torusGeomPattern.test(geomType)) {
            // Assign varied axes and speeds
            const axes = [
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(1, 1, 0).normalize(),
              new THREE.Vector3(0, 1, 1).normalize()
            ];
            const axis = axes[(programmaticAnim.rings.length) % axes.length].clone();
            const base = 0.25; // base speed
            const variance = 0.15 * ((programmaticAnim.rings.length % 3) - 1); // -0.15, 0, +0.15
            const speed = Math.max(0.08, base + variance); // rad/sec
            programmaticAnim.rings.push({ object: child, axis, speed });
            console.log('[MatrixScene] 🌀 Ring target add:', child.name, 'geom:', geomType, 'axis:', axis.toArray(), 'speed:', speed);
          }
        });
        // Choose planet: prefer named candidate; fallback to first sphere-like mesh
        if (!programmaticAnim.planet && planetCandidates.length > 0) {
          const chosen = planetCandidates[0];
          programmaticAnim.planet = {
            object: chosen.child,
            axis: new THREE.Vector3(0, 1, 0),
            speed: 0.15
          };
          console.log('[MatrixScene] 🌍 Planet fallback set:', chosen.child.name, 'geom:', chosen.geomType);
        }
        console.log('[MatrixScene] 🔁 Programmatic anim targets — planet:', !!programmaticAnim.planet, 'rings:', programmaticAnim.rings.length, 'corePulseTarget:', corePulseTarget?.name);
        if (programmaticAnim.planet) {
          console.log('[MatrixScene] Planet initial rot:', programmaticAnim.planet.object.rotation.toArray());
        }

        // Explicit bindings by exact names provided by user
        try {
          // Exact names (updated per GLB): Planet, Torus001, Torus002, Torus038
          let explicitPlanetRaw = matrixModel.getObjectByName('Planet') || matrixModel.getObjectByName('Circle.001');
          let explicitRing1Raw = matrixModel.getObjectByName('Torus001') || matrixModel.getObjectByName('Torus.001');
          let explicitRing2Raw = matrixModel.getObjectByName('Torus002') || matrixModel.getObjectByName('Torus.002');
          let explicitRing3Raw = matrixModel.getObjectByName('Torus038') || matrixModel.getObjectByName('Torus.0038');
          // Fallback: partial matches
          if (!explicitPlanetRaw) explicitPlanetRaw = matrixModel.getObjectByName('Circle') || matrixModel.children.find(n => (n.name||'').includes('Circle.001')) || null;
          if (!explicitRing1Raw) explicitRing1Raw = matrixModel.children.find(n => /Torus\.?0?01/.test(n.name||'')) || null;
          if (!explicitRing2Raw) explicitRing2Raw = matrixModel.children.find(n => /Torus\.?0?02/.test(n.name||'')) || null;
          if (!explicitRing3Raw) explicitRing3Raw = matrixModel.children.find(n => /Torus\.?0?38/.test(n.name||'')) || null;
          // Build pivots so animation clips on children do not override
          const explicitPlanet = createPivotFor(choosePivot(resolveRotatable(explicitPlanetRaw)));
          const explicitRing1 = createPivotFor(choosePivot(resolveRotatable(explicitRing1Raw)));
          const explicitRing2 = createPivotFor(choosePivot(resolveRotatable(explicitRing2Raw)));
          const explicitRing3 = createPivotFor(choosePivot(resolveRotatable(explicitRing3Raw)));
          if (explicitPlanet) {
            // Planet self-rotation pivot (desync via seeded axis/speed and initial rotation)
            const pSeed = hashString(explicitPlanet.name);
            const ax = seededRand(pSeed + 11, -0.2, 0.2);
            const ay = seededRand(pSeed + 17, 0.7, 1.0);
            const az = seededRand(pSeed + 23, -0.2, 0.2);
            const axis = new THREE.Vector3(ax, ay, az).normalize();
            const speed = seededRand(pSeed + 31, 0.35, 0.9);
            explicitPlanet.rotation.set(
              seededRand(pSeed + 101, 0, Math.PI * 2),
              seededRand(pSeed + 103, 0, Math.PI * 2),
              seededRand(pSeed + 107, 0, Math.PI * 2)
            );
            programmaticAnim.planet = { object: explicitPlanet, axis, speed };
            explicitPlanet.matrixAutoUpdate = true;
            explicitPlanet.matrixWorldNeedsUpdate = true;
            console.log('[MatrixScene] 🌍 Explicit planet bound:', explicitPlanet.name, 'parent:', explicitPlanet.parent?.name);

            // Prepare a shared orbit center at planet world position
            const planetWorld = new THREE.Vector3();
            explicitPlanet.getWorldPosition(planetWorld);
            programmaticAnim.orbitCenterPivot = createOrbitPivotAt(planetWorld, matrixModel);
            if (debugAnim && programmaticAnim.orbitCenterPivot) {
              const helper = new THREE.AxesHelper(10);
              programmaticAnim.orbitCenterPivot.add(helper);
            }
          }
          const ringAxes = [
            new THREE.Vector3(0, 1, 0),                // horizontal plane
            new THREE.Vector3(1, 0.4, 0).normalize(),   // tilted X
            new THREE.Vector3(0, 0.6, 1).normalize()    // tilted Z
          ];
          const ringSpeeds = [0.8, 0.5, 1.2]; // базовые скорости
          const expRings = [explicitRing1, explicitRing2, explicitRing3];
          expRings.forEach((r, i) => {
            if (!r) return;
            r.matrixAutoUpdate = true;
            r.matrixWorldNeedsUpdate = true;
            // Also create an orbit pivot at planet center so ring orbits the planet
            const pivotParent = programmaticAnim.orbitCenterPivot || matrixModel;
            const orbitPivot = programmaticAnim.orbitCenterPivot ? new THREE.Object3D() : null;
            if (orbitPivot) {
              // place orbit pivot at planet center (already in planet pivot local via add)
              pivotParent.add(orbitPivot);
              orbitPivot.updateMatrixWorld(true);
              try { orbitPivot.attach(r); } catch (_) { try { orbitPivot.add(r); } catch (_) {} }
              if (debugAnim) {
                const helper = new THREE.AxesHelper(8);
                orbitPivot.add(helper);
              }
            }
            // Desync: unique axis, speed, phase per ring based on name
            const seed = hashString(r.name || ('ring' + i));
            const ax = seededRand(seed + 1, -1, 1);
            const ay = seededRand(seed + 2, -1, 1);
            const az = seededRand(seed + 3, -1, 1);
            const axis = new THREE.Vector3(ax, ay, az).normalize();
            const base = ringSpeeds[i % ringSpeeds.length];
            const speed = base * seededRand(seed + 5, 0.6, 1.4);
            // Initial random orientation (phase)
            r.rotation.set(
              seededRand(seed + 101, 0, Math.PI * 2),
              seededRand(seed + 103, 0, Math.PI * 2),
              seededRand(seed + 107, 0, Math.PI * 2)
            );
            // Orbit speed also desynced
            const orbitSpeed = seededRand(seed + 7, 0.2, 0.7);
            programmaticAnim.rings.push({ object: r, axis, speed, orbitPivot, orbitSpeed });
            console.log('[MatrixScene] 🌀 Explicit ring bound:', r.name, 'parent:', r.parent?.name, 'axis:', axis.toArray(), 'speed:', speed.toFixed(3), 'orbit:', !!orbitPivot, 'orbitSpeed:', orbitSpeed.toFixed(3));
          });
          if (!explicitPlanetRaw) console.warn('[MatrixScene] ⚠️ Explicit planet not found (Planet/Circle.001)');
          if (!explicitRing1Raw) console.warn('[MatrixScene] ⚠️ Explicit ring1 not found (Torus001/.001)');
          if (!explicitRing2Raw) console.warn('[MatrixScene] ⚠️ Explicit ring2 not found (Torus002/.002)');
          if (!explicitRing3Raw) console.warn('[MatrixScene] ⚠️ Explicit ring3 not found (Torus038/.0038)');
        } catch (e) {
          console.warn('[MatrixScene] Explicit binding error:', e);
        }
        
        // Извлекаем точки пути (Ob1_p1 ... Ob8_p8)
        const pathObjects = [];
        const objectMarkers = {}; // Храним первую точку каждого объекта для маркеров
        
        matrixModel.traverse((child) => {
          // Ищем объекты с именами Ob1_p1, Ob2_p2, etc.
          if (child.name && child.name.match(/^Ob\d+_p\d+$/)) {
            // Используем world position (на случай вложенности)
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            
            const objNum = parseInt(child.name.match(/Ob(\d+)/)[1]);
            const pointNum = parseInt(child.name.match(/_p(\d+)$/)[1]);
            
            pathObjects.push({
              name: child.name,
              position: worldPos,
              objectNum: objNum,
              pointNum: pointNum
            });
            
            // Сохраняем первую точку каждого объекта для маркера
            if (pointNum === 1) {
              objectMarkers[objNum] = worldPos;
            }
          }
        });
        
        // Сортируем по номеру объекта, затем по номеру точки
        pathObjects.sort((a, b) => {
          if (a.objectNum !== b.objectNum) {
            return a.objectNum - b.objectNum;
          }
          return a.pointNum - b.pointNum;
        });
        
        console.log('[MatrixScene] 📍 Found', pathObjects.length, 'path points:', pathObjects.map(p => p.name).join(', '));
        console.log('[MatrixScene] 🎯 Found', Object.keys(objectMarkers).length, 'object markers at Ob*_p1 positions');
        
        // Создаем массив точек для пути
        pathPoints = pathObjects.map(p => p.position);
        
        // Передаем позиции маркеров для создания сфер и меток
        window._objectMarkers = objectMarkers;
        
        if (pathPoints.length > 0) {
          // Строим путь через найденные точки
          initializePathAndCamera(pathPoints);
        } else {
          console.error('[MatrixScene] ❌ No path objects found (Ob1_p1...Ob8_p8)');
        }
      }, undefined, (error) => {
        console.error('[MatrixScene] ❌ Error loading Matrix.glb:', error);
      });

      // Функция инициализации пути и камеры (вызывается после загрузки GLB)
      let curve = null;
      let routeGeo = null;
      
      function initializePathAndCamera(pathPoints) {
        console.log('[MatrixScene] 🛣️ Initializing path with', pathPoints.length, 'points');
        
        // Создаем кривую через точки пути
        curve = new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal');
        
        // Визуализация пути
        const curvePoints = curve.getPoints(800);
        routeGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const route = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ 
          color: 0x5cb6ff,
        transparent: true, 
          opacity: 0.4,
        linewidth: 3 
      }));
      scene.add(route);

        // Создаем узлы (маркеры) для объектов Ob1...Ob8 (используем первые точки _p1)
        const SECTION_NAMES_ORDER = ['about', 'basics', 'patterns', 'assistant', 'prompts', 'operations', 'security', 'marketplace'];
        const objectMarkers = window._objectMarkers || {};
        
        // Создаем маркеры для каждого объекта (1-8)
        for (let objNum = 1; objNum <= NUM_NODES; objNum++) {
          const point = objectMarkers[objNum];
          
          if (point) {
            cfg.nodes.push({
              id: `Object${objNum}`,
              x: point.x,
              y: point.y,
              z: point.z
            });
            
            // Находим t для этой точки на кривой
            let closestT = 0;
            let minDist = Infinity;
            for (let t = 0; t <= 1; t += 0.001) {
              const curvePoint = curve.getPointAt(t);
              const dist = point.distanceTo(curvePoint);
              if (dist < minDist) {
                minDist = dist;
                closestT = t;
              }
            }
            
            cfg.marks.push({
              nodeId: `Object${objNum}`,
              u: closestT
            });
            
            console.log(`[MatrixScene] Node ${objNum}: t=${closestT.toFixed(3)}, pos=(${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
          } else {
            console.warn(`[MatrixScene] ⚠️ Missing marker for Object ${objNum} (Ob${objNum}_p1 not found)`);
          }
        }
        
        // Создаем видимые маркеры узлов
        createNodeMarkers();
        
        // Инициализируем контроллеры камеры
        initializeCameraControls();
      }

      // Nodes (objects of interest)
      const objectsById = new Map();
      const nodes = [];
      const SECTION_ORDER = ['about','basics','patterns','assistant','prompts','operations','security','marketplace'];
      
      // Создаем anchors сразу с дефолтными позициями (обновятся после загрузки GLB)
      const anchors = SECTION_ORDER.map((sectionId, idx) => ({
        name: sectionId,
        pos: new THREE.Vector3(0, 10, 0), // Временная позиция
        sectionName: SECTION_NAMES[sectionId]
      }));
      
      function createNodeMarkers() {
      cfg.nodes.forEach((n, idx) => {
          // Светящиеся маркеры узлов (уменьшенные сферы)
          const g = new THREE.SphereGeometry(1, 32, 32); // Уменьшены дальше (радиус 1)
          const m = new THREE.MeshStandardMaterial({ 
            color: 0x5cb6ff, 
            emissive: 0x00d4ff, 
            emissiveIntensity: 1.2,
            roughness: 0.1,
            metalness: 0.6
          });
        const s = new THREE.Mesh(g, m);
          // Используем реальную Y позицию из объекта (уже есть в n.y)
          s.position.set(n.x, n.y, n.z);
        scene.add(s);
        nodes.push(s);
        objectsById.set(n.id, s);
          
          // Обновляем anchor с реальной позицией (метки над сферами)
        const sectionId = SECTION_ORDER[Math.min(idx, SECTION_ORDER.length - 1)];
          if (anchors[idx]) {
            anchors[idx].pos.set(n.x, n.y + 10, n.z); // Метки на 10 единиц выше сфер
          }
        });
        console.log('[MatrixScene] ✨ Created', nodes.length, 'node markers (spheres + labels)');
      }
      
      // Функция инициализации контроллеров камеры
      function initializeCameraControls() {
        if (!curve) {
          console.error('[MatrixScene] ❌ Cannot initialize camera: curve is null');
          return;
        }
        
        marks = (cfg.marks || []).map(m => ({ ...m, triggered: false }));
        curveLength = curve.getLength();
        console.log('[MatrixScene] 📹 Camera controls initialized, path length:', curveLength.toFixed(1));
      }

      // Drive camera controller - переменные
      let marks = [];
      const epsilon = 0.0025;
      let curveLength = 0;
      const lookAhead = cfg.camera.lookAhead;
      const eyeHeight = cfg.camera.eyeHeight;
      let u = 0.0;
      let smoothU = 0.0; // Smoothed camera position for fluid scrolling
      let paused = false;
      let targetSpeed = cfg.camera.speed; // m/s
      let currentSpeed = 0.0;
      const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
      const onReachCallbacks = [];

      // Optional scroll-driven mode for Matrix
      let useScrollControl = true;
      let cycleHeight = 0;
      let onScrollFn = null;
      let onResizeFn = null;

      function setupScrollControl() {
        // one full loop of the path == viewport * N (еще сильнее замедлен)
        cycleHeight = window.innerHeight * 24; // ещё быстрее скролл (в 2 раза от текущего)
        if (typeof document !== 'undefined') {
          document.body.style.height = (cycleHeight + window.innerHeight) + 'px';
          window.scrollTo(0, 1); // avoid zero edge
        }
        
        // Infinite scroll handler - teleport when reaching boundaries
        onScrollFn = () => {
          if (localOrbit) return; // Don't interfere with orbit mode
          
          const yRaw = window.scrollY;
          const EPS = 1;
          
          // Teleport to bottom when reaching top
          if (yRaw <= 0) {
            window.scrollTo(0, cycleHeight - EPS);
          } 
          // Teleport to top when reaching bottom
          else if (yRaw >= cycleHeight) {
            window.scrollTo(0, EPS);
          }
        };
        
        onResizeFn = () => {
          cycleHeight = window.innerHeight * 24; // ещё быстрее скролл (в 2 раза от текущего)
          if (typeof document !== 'undefined') {
            document.body.style.height = (cycleHeight + window.innerHeight) + 'px';
          }
        };
        
        window.addEventListener('scroll', onScrollFn, { passive: false }); // passive: false for scrollTo
        window.addEventListener('resize', onResizeFn, { passive: true });
      }

      function cleanupScrollControl() {
        if (onScrollFn) window.removeEventListener('scroll', onScrollFn);
        if (onResizeFn) window.removeEventListener('resize', onResizeFn);
        onScrollFn = null; onResizeFn = null;
        if (typeof document !== 'undefined') {
          document.body.style.height = '';
        }
      }

      function setSpeed(mps) { targetSpeed = Math.max(0, mps); }
      function pause() { paused = true; }
      function resume() { paused = false; }
      function jumpTo(nextU) { u = ((nextU % 1) + 1) % 1; }
      function onReach(cb) { if (typeof cb === 'function') onReachCallbacks.push(cb); }

      const DriveCam = { setSpeed, pause, resume, jumpTo, onReach };
      if (typeof window !== 'undefined') {
        window.DriveCam = DriveCam;
      }

      // Camera rig: keep eye height constant; dedicated drive camera mounted on rig
      const rig = new THREE.Object3D();
      scene.add(rig);
      driveCamera.position.set(0, 0, 0); // Камера в центре rig (rig сам на высоте eyeHeight)
      driveCamera.rotation.set(0, 0, 0); // Сброс rotation
      driveCamera.quaternion.set(0, 0, 0, 1); // Сброс quaternion
      driveCamera.up.set(0, 1, 0); // Явно устанавливаем up вектор (Y вверх)
      rig.add(driveCamera);
      driveCamera.near = 0.1;
      driveCamera.far = 3600; // Увеличил far для масштабированной сцены
      driveCamera.fov = 60;
      driveCamera.updateProjectionMatrix();

      // Enable scroll control by default
      setupScrollControl();

      // Local Orbit Inspector (optional)
      let localOrbit = false;
      let orbitTheta = 0; // azimuth
      let orbitPhi = Math.PI / 2; // polar
      let orbitRadius = 8;
      const orbitCenter = new THREE.Vector3();
      const ORBIT_MIN_R = 1.6, ORBIT_MAX_R = 40;
      let isMouseDown = false, lastX = 0, lastY = 0;
      let savedPaused = false;
      let orbitPressTimer = null;
      let orbitPending = false; // Flag to track if we're waiting for orbit activation
      let lastPointerX = 0, lastPointerY = 0;
      const ORBIT_ACTIVATE_DELAY_MS = 180; // Same as Calm
      const ORBIT_MOVE_SLOP = 4; // Same as Calm - drag >4px activates orbit

      function enterLocalOrbit(initialEvent) {
        if (localOrbit) {
          console.log('[MatrixScene] Already in orbit mode, ignoring');
          return;
        }
        console.log('[MatrixScene] ENTERING local orbit mode at u =', u);
        localOrbit = true;
        orbitPending = false; // Clear pending flag
        useScrollControl = false; // freeze scroll drive while inspecting
        savedPaused = paused; // freeze path advancement
        paused = true;
        
        // Set orbit center at current rig position (current path point + eye height)
        const pNow = curve.getPointAt(u);
        orbitCenter.set(pNow.x, eyeHeight, pNow.z);
        console.log('[MatrixScene] Orbit center (with eyeHeight):', orbitCenter);
        
        // Get camera's current world position before detaching
        const camWorld = new THREE.Vector3();
        driveCamera.getWorldPosition(camWorld);
        console.log('[MatrixScene] Camera world position before detach:', camWorld);
        
        // Detach camera from rig, preserving world transform
        try { scene.attach(driveCamera); } catch (_) { try { scene.add(driveCamera); } catch (_) {} }
        
        // Calculate spherical coordinates from current camera position relative to orbit center
        const delta = camWorld.clone().sub(orbitCenter);
        const r = Math.max(ORBIT_MIN_R, Math.min(ORBIT_MAX_R, delta.length() || 8));
        orbitRadius = r;
        console.log('[MatrixScene] Initial orbit radius:', orbitRadius, 'delta:', delta);
        
        if (r > 0.001) {
          const nx = delta.x / r, ny = delta.y / r, nz = delta.z / r;
          orbitPhi = Math.acos(Math.max(-1, Math.min(1, ny)));
          orbitTheta = Math.atan2(nz, nx);
        } else {
          // Default view if radius is too small
          orbitPhi = Math.PI / 2;
          orbitTheta = 0;
        }
        console.log('[MatrixScene] Orbit angles - theta:', orbitTheta, 'phi:', orbitPhi);
        
        // If activated by long-press/mouse, immediately enter dragging
        if (initialEvent && typeof initialEvent.clientX === 'number') {
          isMouseDown = true;
          lastX = initialEvent.clientX;
          lastY = initialEvent.clientY;
        }
        const btn = document.getElementById('toggle-orbit-btn');
        if (btn) {
          btn.classList.add('active');
          console.log('[MatrixScene] Button marked as active');
        } else {
          console.warn('[MatrixScene] Button not found during enterLocalOrbit');
        }
        // Lock page scroll during orbit
        if (document && document.body && document.body.style) {
          document.body.dataset._prevOverflow = document.body.style.overflow || '';
          document.documentElement && (document.documentElement.dataset._prevOverflow = document.documentElement.style.overflow || '');
          document.body.style.overflow = 'hidden';
          if (document.documentElement) document.documentElement.style.overflow = 'hidden';
        }
        const banner = document.getElementById('mode-banner');
        if (banner) { 
          banner.style.display = 'block'; 
          banner.textContent = 'Режим: Орбита (Matrix) — Esc для выхода';
          console.log('[MatrixScene] Banner displayed');
        } else {
          console.warn('[MatrixScene] Banner not found during enterLocalOrbit');
        }
      }
      function exitLocalOrbit() {
        if (!localOrbit) {
          console.log('[MatrixScene] Not in orbit mode, ignoring exit');
          return;
        }
        console.log('[MatrixScene] EXITING local orbit mode at u =', u);
        localOrbit = false;
        useScrollControl = true; // resume scroll drive
        paused = savedPaused; // restore path advancement state
        
        // Проверяем, что путь загружен
        if (!curve) {
          console.warn('[MatrixScene] ⚠️ Curve not loaded yet, cannot reposition rig');
          return;
        }
        
        // Update rig position to current path point before reattaching camera
        const pNow = curve.getPointAt(u);
        rig.position.set(pNow.x, eyeHeight, pNow.z);
        rig.up.set(0, 1, 0);
        
        // Направление взгляда: ИСПОЛЬЗУЕМ КАСАТЕЛЬНУЮ, чтобы не смотреть строго вверх/вниз,
        // даже если следующая точка совпадает по XZ
        const tiltAmount = (cfg.camera.tilt ?? 0);
        const tangent = curve.getTangentAt(u).normalize();
        const lookDist = Math.max(6, curveLength * 0.005); // ближе цель взгляда
        const lookTargetX = pNow.x + tangent.x * lookDist;
        const lookTargetZ = pNow.z + tangent.z * lookDist;
        const targetY = eyeHeight + tiltAmount * 50;
        rig.lookAt(lookTargetX, targetY, lookTargetZ);
        console.log('[MatrixScene] Rig repositioned to path at:', rig.position, 'looking at tilt:', tiltAmount);
        
        // Reattach camera to rig and reset to local position
        // Сначала удаляем камеру из scene
        if (driveCamera.parent) {
          driveCamera.parent.remove(driveCamera);
        }
        
        // ПОЛНЫЙ СБРОС камеры к исходному состоянию
        driveCamera.position.set(0, 0, 0);
        driveCamera.rotation.set(0, 0, 0);
        driveCamera.quaternion.set(0, 0, 0, 1);
        driveCamera.up.set(0, 1, 0);
        driveCamera.scale.set(1, 1, 1);
        
        // Сбрасываем матрицы
        driveCamera.matrix.identity();
        driveCamera.matrixWorld.identity();
        driveCamera.matrixAutoUpdate = true;
        driveCamera.matrixWorldAutoUpdate = true;
        
        // Добавляем камеру обратно в rig
        rig.add(driveCamera);
        
        // Обновляем матрицы rig и камеры
        rig.updateMatrix();
        rig.updateMatrixWorld(true);
        driveCamera.updateMatrix();
        driveCamera.updateMatrixWorld(true);
        
        console.log('[MatrixScene] ✅ Camera fully reset and reattached to rig');
        console.log('  Camera local pos:', driveCamera.position);
        console.log('  Camera rotation:', driveCamera.rotation);
        console.log('  Camera quaternion:', driveCamera.quaternion);
        console.log('  Rig orientation:', rig.rotation);
        
        const btn = document.getElementById('toggle-orbit-btn');
        if (btn) {
          btn.classList.remove('active');
          console.log('[MatrixScene] Button unmarked as active');
        } else {
          console.warn('[MatrixScene] Button not found during exitLocalOrbit');
        }
        // Restore page scroll
        if (document && document.body && document.body.style) {
          const prev = document.body.dataset._prevOverflow || '';
          document.body.style.overflow = prev;
          if (document.documentElement) {
            const prevH = document.documentElement.dataset._prevOverflow || '';
            document.documentElement.style.overflow = prevH;
          }
        }
        const banner = document.getElementById('mode-banner');
        if (banner) {
          banner.style.display = 'none';
          console.log('[MatrixScene] Banner hidden');
        } else {
          console.warn('[MatrixScene] Banner not found during exitLocalOrbit');
        }
      }

      const onMouseDown = (e) => {
        if (e.button !== 0) return; // Only left button
        console.log('[MatrixScene] mousedown detected, localOrbit:', localOrbit);
        
        isMouseDown = true;
        orbitPending = true;
        lastX = e.clientX;
        lastY = e.clientY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        
        clearTimeout(orbitPressTimer);
        orbitPressTimer = setTimeout(() => {
          if (isMouseDown && orbitPending) {
            console.log('[MatrixScene] Entering orbit mode (timer)');
            enterLocalOrbit(e);
          }
        }, ORBIT_ACTIVATE_DELAY_MS);
      };
      
      const onMouseMove = (e) => {
        if (!isMouseDown) return;
        
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        
        // If pending orbit and moved > SLOP, enter orbit immediately (drag-to-orbit)
        if (orbitPending && (Math.abs(dx) + Math.abs(dy) > ORBIT_MOVE_SLOP)) {
          console.log('[MatrixScene] Entering orbit mode (movement)');
          enterLocalOrbit(e);
        }
        
        // Update lastX/lastY for next delta
        lastX = e.clientX;
        lastY = e.clientY;
        
        // If already in orbit: rotate camera
        if (localOrbit && isMouseDown) {
          orbitTheta -= dx * 0.008;
          orbitPhi = Math.max(0.001, Math.min(Math.PI - 0.001, orbitPhi - dy * 0.008));
        }
      };
      
      const onMouseUp = () => {
        console.log('[MatrixScene] Mouse up');
        isMouseDown = false;
        orbitPending = false;
        clearTimeout(orbitPressTimer);
      };
      
      const onWheel = (e) => {
        if (!localOrbit) return;
        orbitRadius = Math.max(ORBIT_MIN_R, Math.min(ORBIT_MAX_R, orbitRadius + e.deltaY * 0.0025));
        e.preventDefault();
      };
      
      const onGlobalWheelGuard = (e) => { if (localOrbit) { e.preventDefault(); } };
      const onKey = (e) => { 
        if (e.key === 'Escape') exitLocalOrbit(); 
        if (e.key === 'o' || e.key === 'O') { localOrbit ? exitLocalOrbit() : enterLocalOrbit(); } 
      };
      const onKeyToggleBtn = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'toggle-orbit-btn') { e.preventDefault(); localOrbit ? exitLocalOrbit() : enterLocalOrbit(); } };

      // Get canvas element for mouse events
      const canvas = renderer.domElement;
      console.log('[MatrixScene] Canvas element:', canvas);
      console.log('[MatrixScene] Canvas tag:', canvas?.tagName);
      console.log('[MatrixScene] Canvas parent:', canvas?.parentElement);
      console.log('[MatrixScene] Binding orbit events with capture: true');

      // Test: add a simple click listener to verify canvas receives events
      const testClick = (e) => {
        console.log('[MatrixScene] TEST: Canvas received click event!', e);
      };
      canvas.addEventListener('click', testClick, true);

      // Bind listeners - try both with and without capture
      // First try: with capture (should fire first)
      canvas.addEventListener('mousedown', onMouseDown, { capture: true });
      console.log('[MatrixScene] mousedown listener attached with capture');
      
      window.addEventListener('mousemove', onMouseMove, true);
      window.addEventListener('mouseup', onMouseUp, true);
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });
      window.addEventListener('wheel', onGlobalWheelGuard, { passive: false, capture: true });
      window.addEventListener('keydown', onKey, true);

      // Store testClick for cleanup
      canvas._matrixTestClick = testClick;

      // Ensure orbit toggle container is visible for Matrix
      console.log('[MatrixScene] Setting up orbit toggle for Matrix local navigation');
      const orbitContainer = document.getElementById('mobile-orbit-toggle');
      if (orbitContainer) {
        orbitContainer.style.display = 'flex';
        // Mark as controlled by Matrix local navigation
        orbitContainer.dataset.controller = 'matrix';
      }
      
      // Store button click handler for cleanup
      let orbitBtn = null;
      const onOrbitBtnClick = () => {
        console.log('[MatrixScene] Orbit button clicked, localOrbit:', localOrbit);
        if (localOrbit) { exitLocalOrbit(); }
        else {
          const cx = (typeof lastPointerX === 'number' ? lastPointerX : (window.innerWidth / 2));
          const cy = (typeof lastPointerY === 'number' ? lastPointerY : (window.innerHeight / 2));
          enterLocalOrbit({ clientX: cx, clientY: cy });
        }
      };
      
      function attachOrbitButton() {
        orbitBtn = document.getElementById('toggle-orbit-btn');
        if (!orbitBtn) {
          console.warn('[MatrixScene] Orbit button not found');
          return false;
        }
        console.log('[MatrixScene] Attaching orbit button listeners');
        orbitBtn.style.display = 'flex';
        // Mark as controlled by Matrix local navigation
        orbitBtn.dataset.controller = 'matrix';
        orbitBtn.addEventListener('click', onOrbitBtnClick, true);
        orbitBtn.addEventListener('keydown', onKeyToggleBtn, true);
        return true;
      }
      if (!attachOrbitButton()) {
        window.addEventListener('DOMContentLoaded', attachOrbitButton, { once: true });
      }

      // Expose manual API for testing
      if (typeof window !== 'undefined') {
        window.DriveCam.enterOrbit = enterLocalOrbit;
        window.DriveCam.exitOrbit = exitLocalOrbit;
      }

      // Update loop for scene
      function update(t, dt) {
        // Обновляем анимации GLTF (если есть)
        if (mixer && typeof dt === 'number' && isFinite(dt)) {
          mixer.update(dt);
        }

        // Обновляем шейдерные униформы материалов сцены (uTime)
        if (matrixModel) {
          updateUniformsEachFrame(matrixModel, t);
        }

        // Программные вращения: планета и кольца
        if (programmaticAnim.planet) {
          const obj = programmaticAnim.planet.object;
          obj.rotation.reorder('YXZ');
          // Комбинированное вращение, чтобы убрать синхронность
          obj.rotateOnAxis(programmaticAnim.planet.axis, programmaticAnim.planet.speed * dt);
          obj.updateMatrix();
          obj.updateMatrixWorld(true);
        }
        if (programmaticAnim.rings && programmaticAnim.rings.length) {
          for (const r of programmaticAnim.rings) {
            const obj = r.object;
            obj.rotation.reorder('YXZ');
            obj.rotateOnAxis(r.axis, r.speed * dt);
            obj.updateMatrix();
            obj.updateMatrixWorld(true);
            if (r.orbitPivot) {
              // Slow orbit around planet center
              r.orbitPivot.rotation.reorder('YXZ');
              r.orbitPivot.rotateOnAxis(new THREE.Vector3(0,1,0), (r.orbitSpeed || 0.35) * dt);
              r.orbitPivot.updateMatrix();
              r.orbitPivot.updateMatrixWorld(true);
            }
          }
        }
        // Фоллбэк: если по каким-то причинам ничего не привязалось — вращаем все торусы в сцене
        if ((!programmaticAnim.planet && (!programmaticAnim.rings || programmaticAnim.rings.length === 0)) && matrixModel) {
          matrixModel.traverse((child) => {
            if (!child || !child.name) return;
            if (/Torus/i.test(child.name) || (child.geometry && /Torus/i.test(String(child.geometry.type)))) {
              child.rotation.y += 1.0 * dt;
            }
            if (/Circle\.001/.test(child.name)) {
              child.rotation.y += 0.6 * dt;
            }
          });
        }

        // Sync global UI pulse to core sphere scale if available
        try {
          if (typeof window !== 'undefined') {
            if (!update._pulseState) update._pulseState = { mn: Infinity, mx: 0 };
            const ps = update._pulseState;
            let p = null;
            if (corePulseTarget) {
              const s = corePulseTarget.scale;
              const sv = (s && typeof s.x === 'number') ? s.x : null;
              if (sv && isFinite(sv)) {
                ps.mn = Math.min(ps.mn, sv);
                ps.mx = Math.max(ps.mx, sv);
                const span = (ps.mx - ps.mn);
                if (span > 1e-5) {
                  p = (sv - ps.mn) / span; // 0..1 normalized to observed scale
                }
              }
            }
            if (p === null) {
              // fallback to time based pulse
              p = 0.5 + 0.5 * Math.sin(t * 0.9);
            }
            window._corePulse = p;
            // Optional hue sync from material color if present
            let hueDeg = null;
            const mat = corePulseTarget && corePulseTarget.material;
            if (mat && mat.color) {
              const c = mat.color; // THREE.Color
              const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
              let h = 0; const d = max - min;
              if (d > 1e-5) {
                if (max === c.r) h = ((c.g - c.b) / d) % 6;
                else if (max === c.g) h = (c.b - c.r) / d + 2;
                else h = (c.r - c.g) / d + 4;
                h *= 60; if (h < 0) h += 360;
                hueDeg = h;
              }
            }
            if (hueDeg != null) window._coreHueDeg = hueDeg;
          }
        } catch(_) {}

        // Ждем загрузки пути
        if (!curve || curveLength === 0) return;
        
        // Freeze path position when in orbit mode
        if (!localOrbit) {
          // Smooth speed
          if (!useScrollControl) {
            currentSpeed = lerp(currentSpeed, paused ? 0 : targetSpeed, Math.min(1, dt * 2.5));
            const du = (currentSpeed / curveLength) * dt; // normalized advance
            u = (u + du) % 1;
          } else {
            // Scroll-driven u each frame for robustness
            const ch = cycleHeight || (window.innerHeight * 24);
            const yRaw = window.scrollY || 0;
            // Use virtual scroll position (with modulo) for seamless looping
            const yClamped = Math.max(0, Math.min(yRaw, ch));
            const yVirtual = (ch > 0) ? ((yClamped % ch) + ch) % ch : 0;
            const progress = ch > 0 ? (yVirtual / ch) : 0;
            // РЕВЕРС: инвертируем progress
            u = ((1 - progress) % 1 + 1) % 1;
          }
          
          // Smooth camera movement for fluid scrolling (interpolate towards target u)
          // Handle wrapping: if jump is > 0.5, we crossed 0/1 boundary
          let uDiff = u - smoothU;
          if (uDiff > 0.5) uDiff -= 1;
          if (uDiff < -0.5) uDiff += 1;
          smoothU = (smoothU + uDiff * 0.35) % 1; // Smooth interpolation (35% per frame) - faster for less jerky scroll
          if (smoothU < 0) smoothU += 1;
        }

        // Compute camera position using smoothed u for fluid movement
        const effectiveU = localOrbit ? u : smoothU;
        const p = curve.getPointAt(effectiveU);
        if (localOrbit) {
          const sinPhi = Math.sin(orbitPhi), cosPhi = Math.cos(orbitPhi);
          const x = orbitRadius * sinPhi * Math.cos(orbitTheta);
          const y = orbitRadius * cosPhi;
          const z = orbitRadius * sinPhi * Math.sin(orbitTheta);
          // Use orbitCenter.y (which already includes eyeHeight) instead of adding eyeHeight again
          driveCamera.position.set(orbitCenter.x + x, orbitCenter.y + y, orbitCenter.z + z);
          driveCamera.up.set(0, 1, 0);
          driveCamera.lookAt(orbitCenter.x, orbitCenter.y, orbitCenter.z);
        } else {
          // Плавное движение камеры-автомобиля (БЕЗ дергания)
          // Используем касательную, чтобы не было вертикального lookAt
          const tangent = curve.getTangentAt(effectiveU).normalize();
          const forwardDist = Math.max(6, curveLength * 0.005);
          const qx = p.x + tangent.x * forwardDist;
          const qz = p.z + tangent.z * forwardDist;
          
          // Позиция камеры - стабильная, без колебаний
          rig.position.set(p.x, eyeHeight, p.z);
          rig.up.set(0, 1, 0);
          
          // Направление взгляда с наклоном сверху вниз
          const tiltAmount = (cfg.camera.tilt ?? 0);
          const targetY = eyeHeight + tiltAmount * 50;
          rig.lookAt(qx, targetY, qz);
          
          // ВАЖНО: Камера должна иметь нулевую локальную ориентацию
          // Всё управление идет через rig!
          driveCamera.position.set(0, 0, 0);
          driveCamera.quaternion.set(0, 0, 0, 1);
          driveCamera.up.set(0, 1, 0);
        }

        // Check marks
        for (const mk of marks) {
          if (mk.triggered) continue;
          const duWrap = Math.min(
            Math.abs(u - mk.u),
            1 - Math.abs(u - mk.u)
          );
          if (duWrap <= epsilon) {
            mk.triggered = true;
            // Highlight object and invoke callbacks
            const obj = objectsById.get(mk.nodeId);
            if (obj && obj.material) {
              obj.material.emissive = new THREE.Color(TOK.colors.highlight);
              obj.material.color = new THREE.Color(TOK.colors.highlight);
            }
            onReachCallbacks.forEach(fn => {
              try { fn(mk.nodeId); } catch (_) {}
            });
          }
        }
      }

      function resize() {}

      function dispose() {
        console.log('[MatrixScene] Disposing Matrix local navigation');
        // Exit orbit if active
        if (localOrbit) exitLocalOrbit();
        
        // Stop and dispose animations
        if (mixerActions && mixerActions.length) {
          for (const a of mixerActions) { try { a.stop(); } catch (_) {} }
          mixerActions = [];
        }
        if (mixer) { try { mixer.stopAllAction(); } catch (_) {} mixer = null; }
        programmaticAnim.planet = null;
        programmaticAnim.rings = [];
        
        // Cleanup geometries
        if (routeGeo) routeGeo.dispose();
        
        // Cleanup scroll control
        cleanupScrollControl();
        
        // Remove all event listeners
        canvas.removeEventListener('mousedown', onMouseDown, { capture: true });
        canvas.removeEventListener('click', canvas._matrixTestClick, true);
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('wheel', onWheel, true);
        window.removeEventListener('wheel', onGlobalWheelGuard, true);
        window.removeEventListener('keydown', onKey, true);
        
        // Remove button event listeners and controller marks
        if (orbitBtn) {
          orbitBtn.removeEventListener('click', onOrbitBtnClick, true);
          orbitBtn.removeEventListener('keydown', onKeyToggleBtn, true);
          orbitBtn.classList.remove('active');
          delete orbitBtn.dataset.controller;
          orbitBtn = null;
        }
        
        // Hide UI elements and remove controller marks
        const banner = document.getElementById('mode-banner');
        if (banner) banner.style.display = 'none';
        
        const orbitContainer = document.getElementById('mobile-orbit-toggle');
        if (orbitContainer) {
          orbitContainer.style.display = 'none';
          delete orbitContainer.dataset.controller;
        }
      }

      // Return scene nodes but signal to disable global navigation
      return {
        raycastTargets: nodes, // Allow raycasting for interaction
        nodes: nodes, // Provide nodes for HUD system
        getLabelAnchors: () => anchors,
        getActiveCamera: () => driveCamera,
        driveOnly: true, // flag to disable global navigation
        update,
        resize,
        dispose: ()=>{
          try { if (devLabelEl) devLabelEl.remove(); } catch(_) {}
          dispose();
        }
      };
    }
  };
}

