import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const container = document.getElementById("app");

const scene = new THREE.Scene();

let width = container.clientWidth || 600;
let height = container.clientHeight || 450;

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 3;

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
  1.5, // Strength
  0.4, // Radius
  0.1, // Threshold
);
composer.addPass(bloomPass);

const crtPass = new ShaderPass(CRTShader);
composer.addPass(crtPass);

function animate(time) {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  crtPass.uniforms.uTime.value = time * 0.001;

  composer.render();
}
animate();

window.addEventListener("resize", () => {
  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
  composer.setSize(newWidth, newHeight);
});
