import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export function initEarthScene() {
  const canvas = document.getElementById('earth-canvas')
  if (!canvas) return

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const w = canvas.parentElement.clientWidth
  const h = canvas.parentElement.clientHeight
  renderer.setSize(w, h)

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
  camera.position.set(-1.8, 2.4, 4.8)
  camera.lookAt(0, -0.6, 0)

  // Sun far to the left so terminator cuts across camera view
  const ambient = new THREE.AmbientLight(0xffffff, 0.04)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xffffff, 3.5)
  sun.position.set(-10, 2, 1)
  scene.add(sun)

  // Preload all textures
  const tl = new THREE.TextureLoader()
  const dayMap    = tl.load('/earth-textures/8k_earth_daymap.jpeg')
  const nightMap  = tl.load('/earth-textures/8k_earth_nightmap.jpg')
  const normalMap = tl.load('/earth-textures/8k_earth_normal_map_(0-00-00-00).jpg')
  const specMap   = tl.load('/earth-textures/8k_earth_specular_map.png')

  const earthGroup = new THREE.Group()
  scene.add(earthGroup)

  const loader = new FBXLoader()
  loader.load('/Earth.fbx', (fbx) => {
    const box = new THREE.Box3().setFromObject(fbx)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3()).length()
    const scale = 5.5 / size

    fbx.position.sub(center)
    fbx.scale.setScalar(scale)

    fbx.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhongMaterial({
          map: dayMap,
          emissiveMap: nightMap,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 1.8,
          normalMap: normalMap,
          specularMap: specMap,
          shininess: 25,
        })
      }
    })
    earthGroup.add(fbx)
  })

  window.addEventListener('resize', () => {
    const nw = canvas.parentElement.clientWidth
    const nh = canvas.parentElement.clientHeight
    renderer.setSize(nw, nh)
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
  })

  function animate() {
    requestAnimationFrame(animate)
    earthGroup.rotation.y += 0.00025
    renderer.render(scene, camera)
  }
  animate()
}
