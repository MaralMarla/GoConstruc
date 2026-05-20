import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import LANGS from '../data/translations.json'

const SERVICES = [
  { num: '01', img: '/servicebridge.png',    tk: { eyebrow: 'svc.eyebrow', title: 'svc.1.title', body: 'svc.1.body', body2: 'svc.1.body2', stat: 'svc.1.stat' } },
  { num: '02', img: '/pavementservice.webp', tk: { eyebrow: 'svc.eyebrow', title: 'svc.2.title', body: 'svc.2.body', stat: 'svc.2.stat' } },
  { num: '03', img: '/resource.png',         tk: { eyebrow: 'svc.eyebrow', title: 'svc.3.title', body: 'svc.3.body', stat: 'svc.3.stat' } },
]

function t(key) {
  const lang = localStorage.getItem('gc-lang') || 'en'
  return LANGS[lang]?.[key] ?? LANGS['en'][key] ?? ''
}

export function initServices3D() {
  const section = document.getElementById('services')
  if (!section) return

  // ── Build DOM ──────────────────────────────────────────────
  section.innerHTML = `
    <div class="svc3d__sticky" id="svc3d-sticky">
      <canvas id="svc3d-canvas"></canvas>

      <div class="svc3d__img-panel" id="svc3d-img-panel">
        <img id="svc3d-img" src="${SERVICES[0].img}" alt="" />
      </div>

      <div class="svc3d__card-wrap">
        <div class="svc3d__card" id="svc3d-card">
          <span class="svc3d__eyebrow u-label" id="svc3d-eyebrow"></span>
          <span class="svc3d__num"            id="svc3d-num">01</span>
          <h3  class="svc3d__title"           id="svc3d-title"></h3>
          <p   class="svc3d__desc"            id="svc3d-desc"></p>
          <p   class="svc3d__desc svc3d__desc2" id="svc3d-desc2" style="display:none;margin-top:8px;"></p>
          <span class="svc3d__stat u-label"   id="svc3d-stat"></span>
        </div>

        <div class="svc3d__dots" id="svc3d-dots">
          <button class="svc3d__dot is-active" data-i="0" aria-label="Service 1"></button>
          <button class="svc3d__dot"           data-i="1" aria-label="Service 2"></button>
          <button class="svc3d__dot"           data-i="2" aria-label="Service 3"></button>
        </div>
      </div>

      <div class="svc3d__scroll-hint" id="svc3d-hint">
        <div class="svc3d__hint-bar"></div>
        <span class="u-label">Scroll</span>
      </div>
    </div>
  `

  const sticky  = document.getElementById('svc3d-sticky')
  const canvas  = document.getElementById('svc3d-canvas')

  // ── Three.js setup ─────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene  = new THREE.Scene()
  scene.background = new THREE.Color(0x050508)

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20000)

  scene.add(new THREE.AmbientLight(0xffffff, 3.5))
  const sun = new THREE.DirectionalLight(0xffffff, 5)
  sun.position.set(100, 200, 100)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xaaccff, 2)
  fill.position.set(-100, 50, -100)
  scene.add(fill)

  function resize() {
    const w = sticky.clientWidth, h = sticky.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', resize)
  // Defer so sticky div has final dimensions after layout
  requestAnimationFrame(resize)

  // ── Camera state ───────────────────────────────────────────
  const camCur = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }
  const camTgt = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() }
  let stops = null

  // ── Load GLB ───────────────────────────────────────────────
  const loader = new GLTFLoader()
  loader.load('/bridge_design.glb', gltf => {
    const model = gltf.scene

    model.traverse(o => {
      if (!o.isMesh) return
      const b  = new THREE.Box3().setFromObject(o)
      const s  = b.getSize(new THREE.Vector3())
      const fp = s.x * s.z
      const n  = o.name
      if (/^(Surf_Asphalt|B_Col_White|B_Col_DYel)/.test(n)) return
      if (
        fp > 100000 ||
        (fp > 10000 && /^ConcreteCast-I/.test(n)) ||
        /^(Grass_|VMN_|Brick_)/.test(n) ||
        (/^Surf_Concrete_/.test(n) && fp > 5000)
      ) o.visible = false
    })

    scene.add(model)

    // Structural bounding box (no wide road surfaces)
    const visBox = new THREE.Box3()
    model.traverse(o => {
      if (!o.isMesh || !o.visible) return
      if (/^(Surf_Asphalt|B_Col_White|B_Col_DYel)/.test(o.name)) return
      visBox.expandByObject(o)
    })

    const center = visBox.getCenter(new THREE.Vector3())
    const size   = visBox.getSize(new THREE.Vector3())
    model.position.sub(center)

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov    = camera.fov * (Math.PI / 180)
    const dist   = (maxDim / 2) / Math.tan(fov / 2) * 0.7

    camera.far = dist * 12
    camera.updateProjectionMatrix()

    // Find road deck Y from actual Surf_Asphalt mesh positions (after centering)
    let deckY = size.y * 0.2
    model.traverse(o => {
      if (!o.isMesh || !/^Surf_Asphalt/.test(o.name)) return
      const b = new THREE.Box3().setFromObject(o)
      if (b.max.y > deckY) deckY = b.max.y
    })

    window.__svc3dDebug = { sx: size.x, sy: size.y, sz: size.z, dist, deckY }

    // ── 3 Camera stops ────────────────────────────────────────
    // Stop 0: aerial perspective (screenshot 1)
    // Stop 1: road-level first-person (screenshot 2)
    // Stop 2: guardrail close-up (screenshot 3)
    stops = [
      // Stop 0: elevated perspective looking along bridge length
      {
        pos: new THREE.Vector3(-size.x * 0.2, deckY + size.y * 0, size.z * -0.45),
        tgt: new THREE.Vector3( size.x * 0.5, deckY - 1,             0),
      },
      // Stop 1: road-level driver POV
      {
        pos: new THREE.Vector3(-size.x * 0.1, deckY -7,           size.z * -0.45),
        tgt: new THREE.Vector3( size.x * 0.3, -deckY -5.5,           size.z * 0.22),
      },
      // Stop 2: very low, near left guardrail
      {
        pos: new THREE.Vector3(-size.x * 0, deckY -10,           size.z * -0.45),
        tgt: new THREE.Vector3( size.x * 0.30, deckY - 5.5,           size.z * 0.22),
      },
    ]

    camCur.pos.copy(stops[0].pos)
    camCur.tgt.copy(stops[0].tgt)
    camTgt.pos.copy(stops[0].pos)
    camTgt.tgt.copy(stops[0].tgt)
    camera.position.copy(stops[0].pos)
    camera.lookAt(stops[0].tgt)
  })

  // ── Service card update ────────────────────────────────────
  let activeStop = 0

  function setCard(idx, animate = false) {
    if (idx === activeStop && animate) return
    const card = document.getElementById('svc3d-card')
    if (!card) return

    const apply = () => {
      const svc = SERVICES[idx]
      document.getElementById('svc3d-eyebrow').innerHTML = t(svc.tk.eyebrow)
      document.getElementById('svc3d-num').textContent   = svc.num
      document.getElementById('svc3d-title').innerHTML   = t(svc.tk.title)
      document.getElementById('svc3d-desc').innerHTML    = t(svc.tk.body)
      const desc2El = document.getElementById('svc3d-desc2')
      if (desc2El) {
        if (svc.tk.body2) {
          desc2El.innerHTML = t(svc.tk.body2)
          desc2El.style.display = ''
        } else {
          desc2El.style.display = 'none'
        }
      }
      document.getElementById('svc3d-stat').innerHTML    = t(svc.tk.stat)
      const imgEl = document.getElementById('svc3d-img')
      if (imgEl) imgEl.src = svc.img
      document.querySelectorAll('.svc3d__dot').forEach((d, i) =>
        d.classList.toggle('is-active', i === idx)
      )
      activeStop = idx
    }

    if (animate) {
      card.classList.add('is-out')
      const panel = document.getElementById('svc3d-img-panel')
      if (panel) panel.classList.add('is-out')
      setTimeout(() => {
        apply()
        card.classList.remove('is-out')
        if (panel) panel.classList.remove('is-out')
      }, 280)
    } else {
      apply()
    }
  }

  setCard(0)

  // ── Scroll logic ───────────────────────────────────────────
  function scrollProgress() {
    const r = section.getBoundingClientRect()
    const total = section.offsetHeight - window.innerHeight
    return Math.max(0, Math.min(1, -r.top / total))
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  window.addEventListener('scroll', () => {
    if (!stops) return

    const p = scrollProgress()

    // Map 0-1 progress across 2 segments (3 stops)
    const seg = p * 2
    const i0  = Math.min(1, Math.floor(seg))
    const i1  = Math.min(2, i0 + 1)
    const raw = seg - i0
    const et  = easeInOut(Math.max(0, Math.min(1, raw)))

    camTgt.pos.lerpVectors(stops[i0].pos, stops[i1].pos, et)
    camTgt.tgt.lerpVectors(stops[i0].tgt, stops[i1].tgt, et)

    const newStop = p < 0.33 ? 0 : p < 0.67 ? 1 : 2
    if (newStop !== activeStop) setCard(newStop, true)

    // Fade scroll hint
    const hint = document.getElementById('svc3d-hint')
    if (hint) hint.style.opacity = p > 0.04 ? '0' : '1'
  }, { passive: true })

  // ── Dot click navigation ───────────────────────────────────
  document.getElementById('svc3d-dots')?.addEventListener('click', e => {
    const dot = e.target.closest('.svc3d__dot')
    if (!dot) return
    const i = parseInt(dot.getAttribute('data-i'))
    const total = section.offsetHeight - window.innerHeight
    window.scrollTo({ top: section.offsetTop + (i / 2) * total, behavior: 'smooth' })
  })

  // ── Animate loop ───────────────────────────────────────────
  ;(function animate() {
    requestAnimationFrame(animate)
    camCur.pos.lerp(camTgt.pos, 0.055)
    camCur.tgt.lerp(camTgt.tgt, 0.055)
    camera.position.copy(camCur.pos)
    camera.lookAt(camCur.tgt)
    renderer.render(scene, camera)
  })()
}
