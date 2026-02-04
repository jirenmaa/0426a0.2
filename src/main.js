import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const container = document.getElementById("app");

let width = container.clientWidth || 600;
let height = container.clientHeight || 450;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000,
);

camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});

const shapes = [
  {
    name: "Prism",
    geo: new THREE.CylinderGeometry(0.8, 0.8, 2, 6),
  },
  {
    name: "Triangular Prism",
    geo: new THREE.CylinderGeometry(0.8, 0.8, 1.5, 3),
  },
  {
    name: "-",
    geo: new THREE.TorusGeometry(10, 4, 10, 30),
  },
  {
    name: "Cone",
    geo: new THREE.ConeGeometry(0.9, 1.6, 10),
  },
  {
    name: "Diamond",
    geo: new THREE.OctahedronGeometry(1.2),
  },

  {
    name: "-",
    geo: new THREE.IcosahedronGeometry(3, 2),
  },
  {
    name: "Icosahedron (Spiky)",
    geo: new THREE.IcosahedronGeometry(1, 0),
  },
  {
    name: "Octahedron (Sharp Points)",
    geo: new THREE.OctahedronGeometry(1),
  },
  {
    name: "Star Crystal",
    geo: new THREE.DodecahedronGeometry(1),
  },
  {
    name: "Tetrahedron (Extreme Points)",
    geo: new THREE.TetrahedronGeometry(1),
  },
];

// Mesh (Single Object, Swap Geometry)
let currentIndex = 0;

const mesh = new THREE.Mesh(shapes[currentIndex].geo, material);
scene.add(mesh);

function updateShape(index) {
  currentIndex = (index + shapes.length) % shapes.length;

  mesh.geometry.dispose();
  mesh.geometry = shapes[currentIndex].geo;

  console.log("Now Showing:", shapes[currentIndex].name);
}

let powerOn = true;

function togglePower() {
  powerOn = !powerOn;

  const overlay = document.querySelector(".crt-overlay");

  if (!powerOn) {
    overlay.style.opacity = "1";
    overlay.style.background = "black";
  } else {
    overlay.style.opacity = "0.15";
    overlay.style.background = "";
  }
}

// Button Controls (PWR, CH+, CH-)
document.querySelector("#btn-power").addEventListener("click", () => {
  togglePower();
});

document.querySelector("#btn-up").addEventListener("click", () => {
  if (!powerOn) return;
  updateShape(currentIndex + 1);
});

document.querySelector("#btn-down").addEventListener("click", () => {
  if (!powerOn) return;
  updateShape(currentIndex - 1);
});

document.querySelector("#btn-aft").addEventListener("click", () => {
  if (!powerOn) return;
  console.log("btn aft")
  const content = document.querySelector(".content");
  content.classList.toggle("hidden");
})

const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      // Curvature
      vec2 uv = vUv;
      vec2 dc = abs(0.5 - uv);
      dc *= dc;
      uv.x -= 0.5; uv.x *= 1.0 + (dc.y * 0.03); uv.x += 0.5;
      uv.y -= 0.5; uv.y *= 1.0 + (dc.x * 0.04); uv.y += 0.5;

      // Sample Texture
      vec4 color = texture2D(tDiffuse, uv);

      // Scanlines
      float scanline = sin(uv.y * 800.0 + uTime * 5.0) * 0.04;
      color.rgb -= scanline;

      // Vignette
      float vignette = smoothstep(0.5, 0.2, length(vUv - 0.5));
      color.rgb *= vignette;

      // Creates a mask that fades to black at the very edges of the distorted UVs
      float edgeMask = smoothstep(0.0, 0.01, uv.x) * smoothstep(1.0, 0.99, uv.x) * smoothstep(0.0, 0.01, uv.y) * smoothstep(1.0, 0.99, uv.y);
      
      gl_FragColor = vec4(color.rgb * edgeMask, 1.0);
    }
  `,
};

const composer = new EffectComposer(renderer);
composer.setSize(width, height);

composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(container.clientWidth, container.clientHeight),
  5.0, // Strength
  0.1, // Radius
  0.5, // Threshold
);
composer.addPass(bloomPass);

const crtPass = new ShaderPass(CRTShader);
composer.addPass(crtPass);

function animate() {
  requestAnimationFrame(animate);

  if (!powerOn) return;

  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;

  composer.render();
}

animate();

window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
});
