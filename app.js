import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// -----------------------------
// TELEGRAM
// -----------------------------

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();

  if (typeof tg.disableVerticalSwipes === "function") {
    tg.disableVerticalSwipes();
  }

  if (typeof tg.setHeaderColor === "function") {
    tg.setHeaderColor("#07070c");
  }

  if (typeof tg.setBackgroundColor === "function") {
    tg.setBackgroundColor("#07070c");
  }
}

// -----------------------------
// HTML
// -----------------------------

const container = document.getElementById("viewer");
const loading = document.getElementById("loading");
const resetButton = document.getElementById("resetButton");

// -----------------------------
// SCENE
// -----------------------------

const scene = new THREE.Scene();

scene.background = new THREE.Color("#09090e");

// -----------------------------
// CAMERA
// -----------------------------

const camera = new THREE.PerspectiveCamera(
  32,
  container.clientWidth / container.clientHeight,
  0.01,
  100
);

camera.position.set(0, 0.25, 5);

// -----------------------------
// RENDERER
// -----------------------------

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(
  container.clientWidth,
  container.clientHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

container.appendChild(renderer.domElement);

// -----------------------------
// LIGHTS
// -----------------------------

const ambient = new THREE.AmbientLight(
  0xffffff,
  1.1
);

scene.add(ambient);

const keyLight = new THREE.DirectionalLight(
  0xffffff,
  3.2
);

keyLight.position.set(-3, 4, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(
  0xb9bdff,
  1.8
);

fillLight.position.set(3, 1.5, 3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(
  0x7779bd,
  4.5
);

rimLight.position.set(2, 2, -3);
scene.add(rimLight);

// -----------------------------
// MODEL ROOT
// -----------------------------

const modelRoot = new THREE.Group();

scene.add(modelRoot);

let model = null;
let initialRotationY = 0;

let userIsInteracting = false;
let lastInteractionTime = 0;

// -----------------------------
// CONTROLS
// -----------------------------

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.06;

controls.enablePan = false;

controls.enableZoom = true;
controls.zoomSpeed = 0.7;

controls.rotateSpeed = 0.65;

controls.minDistance = 2.1;
controls.maxDistance = 8;

controls.target.set(0, 0.1, 0);

controls.addEventListener("start", () => {
  userIsInteracting = true;
  lastInteractionTime = performance.now();
});

controls.addEventListener("end", () => {
  userIsInteracting = false;
  lastInteractionTime = performance.now();
});

// -----------------------------
// LOAD GLB
// -----------------------------

const loader = new GLTFLoader();

loader.load(
  "./AURA_capsule.glb",

  (gltf) => {
    model = gltf.scene;

    modelRoot.add(model);

    prepareModel(model);

    loading.style.display = "none";

    resetView();
  },

  (progress) => {
    if (progress.total) {
      const percent = Math.round(
        (progress.loaded / progress.total) * 100
      );

      loading.querySelector("span").textContent =
        `LOADING ${percent}%`;
    }
  },

  (error) => {
    console.error("GLB loading error:", error);

    loading.querySelector("span").textContent =
      "MODEL LOAD ERROR";
  }
);

// -----------------------------
// PREPARE MODEL
// -----------------------------

function prepareModel(object) {

  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  // Центрируем объект
  object.position.x -= center.x;
  object.position.y -= center.y;
  object.position.z -= center.z;

  object.updateMatrixWorld(true);

  // Нормализуем размер
  const maxDimension = Math.max(
    size.x,
    size.y,
    size.z
  );

  const targetSize = 2.25;

  const scale = targetSize / maxDimension;

  object.scale.setScalar(scale);

  // Немного поднимаем визуально
  object.position.y -= 0.05;

  // Настраиваем материалы
  object.traverse((child) => {

    if (!child.isMesh) return;

    child.castShadow = false;
    child.receiveShadow = false;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {

      if (!material) return;

      material.needsUpdate = true;

      // Если в GLB есть emissive материал индикатора,
      // немного усиливаем его.
      if (
        material.emissive &&
        (
          material.emissive.r > 0 ||
          material.emissive.g > 0 ||
          material.emissive.b > 0
        )
      ) {
        material.userData.baseEmissiveIntensity =
          material.emissiveIntensity || 1;

        material.emissiveIntensity =
          Math.max(material.emissiveIntensity || 1, 2);
      }

    });

  });

  initialRotationY = modelRoot.rotation.y;
}

// -----------------------------
// RESET CAMERA
// -----------------------------

function resetView() {

  camera.position.set(0, 0.15, 5);

  controls.target.set(0, 0, 0);

  controls.update();

  modelRoot.rotation.set(
    0,
    initialRotationY,
    0
  );
}

resetButton.addEventListener(
  "click",
  resetView
);

// -----------------------------
// RESIZE
// -----------------------------

function resize() {

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(
    width,
    height,
    false
  );
}

window.addEventListener(
  "resize",
  resize
);

// -----------------------------
// ANIMATION
// -----------------------------

const clock = new THREE.Clock();

function animate() {

  const time = clock.getElapsedTime();

  if (model) {

    // Лёгкая левитация + правильная высота модели
modelRoot.position.y =
  0.42 + Math.sin(time * 1.2) * 0.035;

    // Если пользователь несколько секунд
    // не трогает модель — она слегка оживает.
    const idle =
      !userIsInteracting &&
      performance.now() - lastInteractionTime > 2500;

    if (idle) {
      modelRoot.rotation.y += 0.0012;
    }

    // Пульсация emissive материалов
    const pulse =
      2.1 +
      Math.sin(time * 2.4) * 0.55;

    model.traverse((child) => {

      if (!child.isMesh) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => {

        if (
          material &&
          material.userData &&
          material.userData.baseEmissiveIntensity
        ) {
          material.emissiveIntensity = pulse;
        }

      });

    });

  }

  controls.update();

  renderer.render(
    scene,
    camera
  );
}

renderer.setAnimationLoop(animate);
