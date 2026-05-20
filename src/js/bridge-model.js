import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0f1e)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 5000)
camera.position.set(0, 50, 200)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 3))

const sun = new THREE.DirectionalLight(0xffffff, 5)
sun.position.set(100, 200, 100)
scene.add(sun)

const fill = new THREE.DirectionalLight(0xaaccff, 2)
fill.position.set(-100, 50, -100)
scene.add(fill)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

const loader = new GLTFLoader()
loader.load('/bridge_design.glb', (gltf) => {
  const model = gltf.scene

  // Hide ground/terrain elements, keep bridge road surfaces and markings
  model.traverse(o => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    const fp = s.x * s.z;
    const n = o.name;

    // Always keep: asphalt road surface, white/yellow lane markings on bridge
    if (/^(Surf_Asphalt|B_Col_White|B_Col_DYel)/.test(n)) return;

    const isGround =
      fp > 100000 ||
      (fp > 10000 && /^ConcreteCast-I/.test(n)) ||
      /^(Grass_|VMN_|Brick_)/.test(n) ||
      (/^Surf_Concrete_/.test(n) && fp > 5000);
    if (isGround) o.visible = false;
  });

  scene.add(model);

  // Calculate camera based on structural elements only (exclude wide road surfaces)
  const visBox = new THREE.Box3();
  model.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    if (/^(Surf_Asphalt|B_Col_White|B_Col_DYel)/.test(o.name)) return;
    visBox.expandByObject(o);
  });
  const center = visBox.getCenter(new THREE.Vector3());
  const size = visBox.getSize(new THREE.Vector3());
  model.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const dist = (maxDim / 2) / Math.tan(fov / 2) * 0.7;
  camera.position.set(dist * 0.5, dist * 0.15, dist * 0.7);
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.minDistance = maxDim * 0.02;
  controls.maxDistance = dist * 5;
  controls.update();
}, undefined, (err) => console.error('GLB load error:', err))

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
