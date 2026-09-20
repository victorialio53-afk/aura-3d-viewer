import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


// ======================================================
// TELEGRAM
// ======================================================

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


// ======================================================
// HTML
// ======================================================

const container = document.getElementById("viewer");
const loading = document.getElementById("loading");
const resetButton = document.getElementById("resetButton");


// ======================================================
// ОСНОВНЫЕ НАСТРОЙКИ AURI
// ======================================================

// Размер модели внутри viewer.
// Чем больше число — тем крупнее капсула.
const MODEL_SIZE = 2.35;

// Исправление исходного наклона модели.
// Капсула была наклонена вправо,
// поэтому здесь компенсируем наклон против часовой стрелки.
const STRAIGHTEN_ANGLE = THREE.MathUtils.degToRad(13);

// Высота лёгкой левитации.
const HOVER_HEIGHT = 0.045;

// Скорость левитации.
const HOVER_SPEED = 1.15;

// Скорость автоматического вращения.
const IDLE_ROTATION_SPEED = 0.00115;

// Через сколько миллисекунд после касания
// модель снова начинает сама вращаться.
const IDLE_DELAY = 2200;


// ======================================================
// SCENE
// ======================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color("#09090e");


// ======================================================
// CAMERA
// ======================================================

const camera = new THREE.PerspectiveCamera(
  32,
  1,
  0.01,
  100
);

// Камера изначально стоит строго напротив AURI.
camera.position.set(0, 0, 5);


// ======================================================
// RENDERER
// ======================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

container.appendChild(renderer.domElement);


// ======================================================
// LIGHT
// ======================================================

// Общий мягкий свет
const ambient = new THREE.AmbientLight(
  0xffffff,
  1.1
);

scene.add(ambient);


// Основной свет слева-сверху
const keyLight = new THREE.DirectionalLight(
  0xffffff,
  3.2
);

keyLight.position.set(-3, 4, 4);

scene.add(keyLight);


// Мягкий холодный свет справа
const fillLight = new THREE.DirectionalLight(
  0xb9bdff,
  1.8
);

fillLight.position.set(3, 1.5, 3);

scene.add(fillLight);


// Фиолетовый контровой свет
const rimLight = new THREE.DirectionalLight(
  0x7779bd,
  4.5
);

rimLight.position.set(2, 2, -3);

scene.add(rimLight);


// ======================================================
// СТРУКТУРА МОДЕЛИ
// ======================================================

// motionRoot отвечает ТОЛЬКО за:
// — левитацию
// — медленное вращение
const motionRoot = new THREE.Group();

scene.add(motionRoot);


// orientationRoot отвечает только
// за постоянное исправление наклона.
const orientationRoot = new THREE.Group();

motionRoot.add(orientationRoot);


let model = null;

let userIsInteracting = false;
let lastInteractionTime = 0;


// ======================================================
// ORBIT CONTROLS
// ======================================================

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

// Не позволяем залезть внутрь модели.
controls.minDistance = 2.5;

// И не позволяем улететь слишком далеко.
controls.maxDistance = 8;


// Мы центрируем AURI в точке 0 / 0 / 0.
controls.target.set(0, 0, 0);


controls.addEventListener("start", () => {
  userIsInteracting = true;
  lastInteractionTime = performance.now();
});


controls.addEventListener("end", () => {
  userIsInteracting = false;
  lastInteractionTime = performance.now();
});


// ======================================================
// ЗАГРУЗКА GLB
// ======================================================

const loader = new GLTFLoader();

loader.load(

  "./AURA_capsule.glb",

  (gltf) => {

    model = gltf.scene;

    orientationRoot.add(model);

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

    console.error(
      "GLB loading error:",
      error
    );

    loading.querySelector("span").textContent =
      "MODEL LOAD ERROR";
  }

);


// ======================================================
// ПОДГОТОВКА И ЦЕНТРИРОВАНИЕ МОДЕЛИ
// ======================================================

function prepareModel(object) {

  // Сначала обновляем все трансформации
  object.updateMatrixWorld(true);


  // --------------------------------------------------
  // 1. Узнаём исходный размер модели
  // --------------------------------------------------

  let box = new THREE.Box3().setFromObject(object);

  const initialSize = new THREE.Vector3();

  box.getSize(initialSize);


  const maxDimension = Math.max(
    initialSize.x,
    initialSize.y,
    initialSize.z
  );


  // --------------------------------------------------
  // 2. Приводим её к нужному размеру
  // --------------------------------------------------

  const scale = MODEL_SIZE / maxDimension;

  object.scale.multiplyScalar(scale);

  object.updateMatrixWorld(true);


  // --------------------------------------------------
  // 3. ВАЖНО:
  // снова вычисляем границы уже ПОСЛЕ масштабирования
  // --------------------------------------------------

  box = new THREE.Box3().setFromObject(object);

  const realCenter = new THREE.Vector3();

  box.getCenter(realCenter);


  // --------------------------------------------------
  // 4. Перемещаем настоящий геометрический центр
  // капсулы точно в 0 / 0 / 0
  // --------------------------------------------------

  object.position.x -= realCenter.x;
  object.position.y -= realCenter.y;
  object.position.z -= realCenter.z;

  object.updateMatrixWorld(true);


  // --------------------------------------------------
  // 5. Исправляем наклон вправо
  // --------------------------------------------------

  orientationRoot.rotation.set(
    0,
    0,
    STRAIGHTEN_ANGLE
  );


  // --------------------------------------------------
  // 6. Материалы
  // --------------------------------------------------

  object.traverse((child) => {

    if (!child.isMesh) return;

    child.castShadow = false;
    child.receiveShadow = false;


    const materials =
      Array.isArray(child.material)
        ? child.material
        : [child.material];


    materials.forEach((material) => {

      if (!material) return;

      material.needsUpdate = true;


      // Если материал индикатора emissive,
      // сохраняем информацию для пульсации.
      if (
        material.emissive &&
        (
          material.emissive.r > 0 ||
          material.emissive.g > 0 ||
          material.emissive.b > 0
        )
      ) {

        material.userData.isAuriEmission = true;

        material.emissiveIntensity =
          Math.max(
            material.emissiveIntensity || 1,
            2
          );

      }

    });

  });

}


// ======================================================
// RESET VIEW
// ======================================================

function resetView() {

  // Камера снова строго перед моделью.
  camera.position.set(
    0,
    0,
    5
  );


  // Камера смотрит точно в центр AURI.
  controls.target.set(
    0,
    0,
    0
  );


  controls.update();


  // Сбрасываем только вращение,
  // которое появляется во время idle-анимации.
  motionRoot.rotation.set(
    0,
    0,
    0
  );


  // Постоянное исправление наклона
  // остаётся всегда.
  orientationRoot.rotation.set(
    0,
    0,
    STRAIGHTEN_ANGLE
  );

}


resetButton.addEventListener(
  "click",
  resetView
);


// ======================================================
// АДАПТАЦИЯ ПОД РАЗМЕР VIEWER
// ======================================================

function resizeViewer() {

  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;


  camera.aspect = width / height;

  camera.updateProjectionMatrix();


  renderer.setSize(
    width,
    height,
    false
  );

}


// Очень важно для Telegram и телефонов:
// следим именно за размером самого viewer,
// а не только за размером окна браузера.
const resizeObserver =
  new ResizeObserver(() => {

    resizeViewer();

  });


resizeObserver.observe(container);


// И сразу вызываем первый раз.
resizeViewer();


// ======================================================
// ANIMATION
// ======================================================

const clock = new THREE.Clock();


function animate() {

  const time = clock.getElapsedTime();


  if (model) {

    // --------------------------------------------------
    // ЛЁГКАЯ ЛЕВИТАЦИЯ
    // --------------------------------------------------

    motionRoot.position.y =
      Math.sin(
        time * HOVER_SPEED
      ) * HOVER_HEIGHT;


    // --------------------------------------------------
    // IDLE ROTATION
    // --------------------------------------------------

    const idle =
      !userIsInteracting &&
      performance.now() - lastInteractionTime >
        IDLE_DELAY;


    if (idle) {

      motionRoot.rotation.y +=
        IDLE_ROTATION_SPEED;

    }


    // --------------------------------------------------
    // ПУЛЬС ИНДИКАТОРА
    // --------------------------------------------------

    const pulse =
      2.15 +
      Math.sin(time * 2.4) * 0.5;


    model.traverse((child) => {

      if (!child.isMesh) return;


      const materials =
        Array.isArray(child.material)
          ? child.material
          : [child.material];


      materials.forEach((material) => {

        if (
          material &&
          material.userData &&
          material.userData.isAuriEmission
        ) {

          material.emissiveIntensity =
            pulse;

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
