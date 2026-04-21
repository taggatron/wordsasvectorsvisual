import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const words = [
  {
    word: "man",
    vector: [-2.2, 0.4, -0.6],
    color: "#2a9d8f",
    idea: "A base masculine concept vector.",
  },
  {
    word: "woman",
    vector: [1.8, 0.6, -0.4],
    color: "#f4a261",
    idea: "A base feminine concept vector.",
  },
  {
    word: "king",
    vector: [-1.4, 2.0, 0.5],
    color: "#457b9d",
    idea: "A high-status masculine concept vector.",
  },
  {
    word: "queen",
    vector: [1.0, 2.1, 0.7],
    color: "#e63946",
    idea: "A high-status feminine concept vector.",
  },
  {
    word: "prince",
    vector: [-0.8, 1.6, 1.6],
    color: "#264653",
    idea: "Younger royal masculine direction.",
  },
  {
    word: "princess",
    vector: [1.5, 1.8, 1.7],
    color: "#ff8fab",
    idea: "Younger royal feminine direction.",
  },
];

const relations = [
  { from: "man", to: "king", direction: "+royalty" },
  { from: "woman", to: "queen", direction: "+royalty" },
  { from: "man", to: "woman", direction: "+gender" },
  { from: "king", to: "queen", direction: "+gender" },
  { from: "prince", to: "princess", direction: "+gender" },
  { from: "king", to: "prince", direction: "+younger" },
  { from: "queen", to: "princess", direction: "+younger" },
];

const host = document.getElementById("canvas-host");
const selectedWordEl = document.getElementById("selected-word");
const selectedIdeaEl = document.getElementById("selected-idea");
const selectedVectorEl = document.getElementById("selected-vector");
const relationListEl = document.getElementById("relation-list");
const chipsEl = document.getElementById("word-chips");
const panelEl = document.getElementById("info-panel");
const addWordBtn = document.getElementById("add-word-btn");
const addWordStatusEl = document.getElementById("add-word-status");
const sequencePrevBtn = document.getElementById("sequence-prev");
const sequenceNextBtn = document.getElementById("sequence-next");
const sequenceAutoBtn = document.getElementById("sequence-auto");
const sequenceStatusEl = document.getElementById("sequence-status");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 80);
camera.position.set(8.4, 5.3, 9.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(host.clientWidth, host.clientHeight);
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 4.8;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 1.05, 0.4);

scene.add(new THREE.HemisphereLight(0xf9f0df, 0xa1bed3, 1.08));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(5, 7, 4);
scene.add(keyLight);

const grid = new THREE.GridHelper(14, 14, 0xc2ad90, 0xd8c7b0);
grid.position.y = -1.35;
grid.material.transparent = true;
grid.material.opacity = 0.34;
scene.add(grid);

const axesGroup = new THREE.Group();
scene.add(axesGroup);

addAxis(
  new THREE.Vector3(-3.5, -1.2, 0),
  new THREE.Vector3(3.5, -1.2, 0),
  "#456b8f",
  "X gender (masc -> fem)",
  "#35516a",
  new THREE.Vector3(0.15, 0.23, 0)
);
addAxis(
  new THREE.Vector3(0, -1.2, 0),
  new THREE.Vector3(0, 3.3, 0),
  "#c06147",
  "Y status (common -> royal)",
  "#844032",
  new THREE.Vector3(0.28, 0.08, 0)
);
addAxis(
  new THREE.Vector3(0, -1.2, -2.6),
  new THREE.Vector3(0, -1.2, 3.6),
  "#2a9d8f",
  "Z age (older -> younger)",
  "#1b6d64",
  new THREE.Vector3(0.18, 0.21, 0)
);

const particles = buildBackgroundParticles();
scene.add(particles);

const nodeByWord = new Map();
const hitTargets = [];
const rippleBursts = [];

for (const wordDef of words) {
  const group = new THREE.Group();
  group.position.set(...wordDef.vector);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 30, 30),
    new THREE.MeshStandardMaterial({ color: wordDef.color, roughness: 0.28, metalness: 0.08 })
  );

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 24, 24),
    new THREE.MeshBasicMaterial({ color: wordDef.color, transparent: true, opacity: 0.14 })
  );

  const label = makeTextSprite(wordDef.word, "#1f2d3d", "rgba(255, 255, 255, 0.86)", 34, 18, 0.0062);
  label.position.set(0, 0.48, 0);

  mesh.userData.word = wordDef.word;
  group.add(mesh, halo, label);
  scene.add(group);

  hitTargets.push(mesh);
  nodeByWord.set(wordDef.word, {
    def: wordDef,
    group,
    mesh,
    halo,
    label,
    pulse: 0,
    hover: false,
  });
}

const relationObjects = [];
for (const [index, relation] of relations.entries()) {
  const fromNode = nodeByWord.get(relation.from);
  const toNode = nodeByWord.get(relation.to);
  if (!fromNode || !toNode) {
    continue;
  }

  const start = fromNode.group.position.clone();
  const end = toNode.group.position.clone();
  const vector = end.clone().sub(start);
  const length = vector.length();
  const direction = vector.clone().normalize();

  const arrow = new THREE.ArrowHelper(direction, start, length, 0x7d8d9a, 0.2, 0.11);
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.32;
  arrow.cone.material.transparent = true;
  arrow.cone.material.opacity = 0.32;

  const tag = makeTextSprite(relation.direction, "#2b3d4f", "rgba(255, 255, 255, 0.72)", 23, 12, 0.0052);
  tag.position.copy(start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.16 + index * 0.02, 0)));
  tag.material.opacity = 0.38;

  scene.add(arrow, tag);

  relationObjects.push({
    ...relation,
    arrow,
    tag,
    active: false,
    phase: index * 0.7,
  });
}

const chipButtons = [];
for (const wordDef of words) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "word-chip";
  btn.textContent = wordDef.word;
  btn.addEventListener("click", () => selectWord(wordDef.word));
  chipsEl.appendChild(btn);
  chipButtons.push(btn);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
let hoveredWord = null;
let selectedWord = "princess";
let selectedIndex = words.findIndex((item) => item.word === selectedWord);
let sequenceTimer = null;
const sequenceIntervalMs = 1900;
const buildOrder = ["princess", "queen", "king", "woman", "man", "prince"];
let revealedCount = 0;
let autoFrameActive = false;

const desiredTarget = new THREE.Vector3(0, 1, 0.3);
const desiredCamera = new THREE.Vector3().copy(camera.position);

if (selectedIndex < 0) {
  selectedIndex = 0;
}

renderer.domElement.addEventListener("pointermove", (event) => {
  updatePointer(event);
  updateHoverState();
});

renderer.domElement.addEventListener("pointerleave", () => {
  hoveredWord = null;
  for (const node of nodeByWord.values()) {
    node.hover = false;
  }
  renderer.domElement.style.cursor = "default";
});

renderer.domElement.addEventListener("click", (event) => {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  if (hit?.object?.userData?.word) {
    selectWord(hit.object.userData.word);
  }
});

controls.addEventListener("start", () => {
  // Keep the user's chosen orbit/camera orientation once they interact.
  autoFrameActive = false;
});

if (addWordBtn) {
  addWordBtn.addEventListener("click", () => {
    revealNextWord();
  });
}

if (sequencePrevBtn) {
  sequencePrevBtn.addEventListener("click", () => {
    moveSequence(-1);
  });
}

if (sequenceNextBtn) {
  sequenceNextBtn.addEventListener("click", () => {
    moveSequence(1);
  });
}

if (sequenceAutoBtn) {
  sequenceAutoBtn.addEventListener("click", () => {
    if (sequenceTimer) {
      stopAutoSequence();
    } else {
      startAutoSequence();
    }
  });
}

window.addEventListener("resize", () => {
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight);
});

initializeWordBuild();

const clock = new THREE.Clock();
animate();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (autoFrameActive) {
    controls.target.lerp(desiredTarget, 1 - Math.pow(0.01, delta));
    camera.position.lerp(desiredCamera, 1 - Math.pow(0.03, delta));

    if (controls.target.distanceToSquared(desiredTarget) < 0.0004 && camera.position.distanceToSquared(desiredCamera) < 0.0016) {
      autoFrameActive = false;
    }
  }

  for (const [word, node] of nodeByWord) {
    if (!node.visible) {
      continue;
    }

    node.pulse = Math.max(0, node.pulse - delta * 1.35);

    const pulseWave = Math.sin((1 - node.pulse) * 16) * node.pulse * 0.34;
    const selectedBoost = word === selectedWord ? 0.13 : 0;
    const hoverBoost = node.hover ? 0.09 : 0;
    const total = 1 + selectedBoost + hoverBoost + Math.max(0, pulseWave);

    node.group.scale.setScalar(total);
    node.halo.material.opacity =
      0.09 +
      (word === selectedWord ? 0.22 : 0.04) +
      (node.hover ? 0.06 : 0) +
      Math.max(0, pulseWave) * 0.4;

    node.label.material.opacity = word === selectedWord || node.hover ? 0.96 : 0.42;
  }

  for (const relation of relationObjects) {
    const activePulse = relation.active ? 0.58 + 0.35 * Math.sin(elapsed * 5 + relation.phase) : 0;
    const lineOpacity = relation.active ? activePulse : 0.2;

    relation.arrow.line.material.opacity = lineOpacity;
    relation.arrow.cone.material.opacity = lineOpacity;
    relation.tag.material.opacity = relation.active ? 0.95 : 0.38;

    if (relation.active) {
      relation.arrow.setColor(new THREE.Color("#1d3557"));
    } else {
      relation.arrow.setColor(new THREE.Color("#7d8d9a"));
    }
  }

  for (let i = rippleBursts.length - 1; i >= 0; i -= 1) {
    const ripple = rippleBursts[i];
    ripple.life -= delta * 1.8;
    ripple.mesh.lookAt(camera.position);

    const scale = 1 + (1 - ripple.life) * 3.2;
    ripple.mesh.scale.setScalar(scale);
    ripple.mesh.material.opacity = Math.max(0, ripple.life * 0.65);

    if (ripple.life <= 0) {
      scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      rippleBursts.splice(i, 1);
    }
  }

  particles.rotation.y = elapsed * 0.02;
  controls.update();
  renderer.render(scene, camera);
}

function selectWord(word) {
  const picked = nodeByWord.get(word);
  if (!picked || !picked.visible) {
    return;
  }

  selectedWord = word;
  selectedIndex = words.findIndex((item) => item.word === word);
  picked.pulse = 1;

  spawnRipple(picked.group.position, picked.def.color);

  selectedWordEl.textContent = picked.def.word;
  selectedIdeaEl.textContent = picked.def.idea;
  selectedVectorEl.textContent = `[${picked.def.vector.map((v) => v.toFixed(2)).join(", ")}]`;

  relationListEl.textContent = "";
  const related = relations.filter(
    (rel) => (rel.from === word || rel.to === word) && isWordVisible(rel.from) && isWordVisible(rel.to)
  );

  for (const [index, rel] of related.entries()) {
    const li = document.createElement("li");
    li.style.animationDelay = `${index * 90}ms`;

    if (rel.from === word) {
      li.textContent = `${rel.from} ${rel.direction} -> ${rel.to}`;
    } else {
      li.textContent = `${rel.to} - ${rel.direction.slice(1)} -> ${rel.from}`;
    }

    relationListEl.appendChild(li);
  }

  for (const relation of relationObjects) {
    relation.active = (relation.from === word || relation.to === word) && isWordVisible(relation.from) && isWordVisible(relation.to);
  }

  updateWordChipState();

  const offset = new THREE.Vector3(3.95, 2.6, 4.45);
  desiredTarget.copy(picked.group.position);
  desiredCamera.copy(picked.group.position).add(offset);
  autoFrameActive = true;

  updateSequenceStatus();

  panelEl.classList.remove("flash");
  void panelEl.offsetWidth;
  panelEl.classList.add("flash");
}

function initializeWordBuild() {
  for (const wordDef of words) {
    setWordVisible(wordDef.word, false);
  }

  revealedCount = 0;
  revealNextWord();
  selectWord(selectedWord);
}

function revealNextWord() {
  if (revealedCount >= buildOrder.length) {
    updateBuilderStatus();
    return;
  }

  const nextWord = buildOrder[revealedCount];
  revealedCount += 1;

  setWordVisible(nextWord, true);
  const node = nodeByWord.get(nextWord);
  if (node) {
    node.pulse = 1;
    spawnRipple(node.group.position, node.def.color);
  }

  if (!isWordVisible(selectedWord)) {
    selectedWord = nextWord;
  }

  selectWord(selectedWord);
  updateBuilderStatus();
}

function setWordVisible(word, visible) {
  const node = nodeByWord.get(word);
  if (!node) {
    return;
  }

  node.visible = visible;
  node.group.visible = visible;
  refreshRelationVisibility();
  updateWordChipState();
}

function isWordVisible(word) {
  return !!nodeByWord.get(word)?.visible;
}

function refreshRelationVisibility() {
  for (const relation of relationObjects) {
    const visible = isWordVisible(relation.from) && isWordVisible(relation.to);
    relation.arrow.visible = visible;
    relation.tag.visible = visible;

    if (!visible) {
      relation.active = false;
    }
  }
}

function updateWordChipState() {
  for (const [idx, btn] of chipButtons.entries()) {
    const word = words[idx].word;
    const visible = isWordVisible(word);
    btn.disabled = !visible;
    btn.classList.toggle("active", visible && word === selectedWord);
  }
}

function updateBuilderStatus() {
  const visibleCount = words.filter((wordDef) => isWordVisible(wordDef.word)).length;

  if (addWordStatusEl) {
    addWordStatusEl.textContent = `${visibleCount} of ${words.length} words visible`;
  }

  if (addWordBtn) {
    addWordBtn.disabled = visibleCount >= words.length;
    addWordBtn.textContent = visibleCount >= words.length ? "All Words Added" : "Add Next Word";
  }
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHoverState() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  const hitWord = hit?.object?.userData?.word || null;

  hoveredWord = hitWord;
  renderer.domElement.style.cursor = hoveredWord ? "pointer" : "default";

  for (const [word, node] of nodeByWord) {
    node.hover = word === hoveredWord;
  }
}

function addAxis(start, end, color, labelText, textColor, labelOffset = new THREE.Vector3(0.12, 0.18, 0.12)) {
  const points = [start, end];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })
  );
  axesGroup.add(line);

  const direction = end.clone().sub(start).normalize();
  const arrow = new THREE.ArrowHelper(direction, end.clone().addScaledVector(direction, -0.16), 0.19, new THREE.Color(color));
  axesGroup.add(arrow);

  const label = makeTextSprite(labelText, textColor, "rgba(255, 255, 255, 0.72)", 24, 15, 0.0056);
  label.position.copy(end.clone().add(labelOffset));
  axesGroup.add(label);
}

function moveSequence(direction) {
  if (!Number.isFinite(direction) || direction === 0) {
    return;
  }

  const visibleWords = words.filter((wordDef) => isWordVisible(wordDef.word)).map((wordDef) => wordDef.word);
  if (!visibleWords.length) {
    return;
  }

  let currentPosition = visibleWords.indexOf(selectedWord);
  if (currentPosition === -1) {
    currentPosition = 0;
  }

  const nextPosition = (currentPosition + direction + visibleWords.length) % visibleWords.length;
  selectWord(visibleWords[nextPosition]);
}

function startAutoSequence() {
  if (sequenceTimer) {
    return;
  }

  sequenceTimer = setInterval(() => {
    moveSequence(1);
  }, sequenceIntervalMs);

  updateSequenceStatus();
}

function stopAutoSequence() {
  if (!sequenceTimer) {
    return;
  }

  clearInterval(sequenceTimer);
  sequenceTimer = null;
  updateSequenceStatus();
}

function updateSequenceStatus() {
  const visibleWords = words.filter((wordDef) => isWordVisible(wordDef.word)).map((wordDef) => wordDef.word);
  const currentPosition = Math.max(0, visibleWords.indexOf(selectedWord));

  if (sequenceStatusEl) {
    sequenceStatusEl.textContent = `Step ${currentPosition + 1} of ${Math.max(visibleWords.length, 1)}${sequenceTimer ? " • autoplay" : ""}`;
  }

  if (sequenceAutoBtn) {
    sequenceAutoBtn.textContent = sequenceTimer ? "Pause Auto" : "Auto Play";
  }
}

function spawnRipple(position, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.24, 40),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.64 })
  );
  ring.position.copy(position);
  ring.lookAt(camera.position);
  scene.add(ring);

  rippleBursts.push({ mesh: ring, life: 1 });
}

function makeTextSprite(text, color = "#1f2d3d", background = "rgba(255, 255, 255, 0.75)", size = 46, padding = 20, scale = 0.0087) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const font = `${size}px Space Grotesk`;
  ctx.font = font;

  const width = Math.ceil(ctx.measureText(text).width + padding * 2);
  const height = Math.ceil(size + padding * 1.4);

  canvas.width = width;
  canvas.height = height;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = background;
  roundRect(ctx, 0, 0, width, height, 14);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * scale, height * scale, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildBackgroundParticles() {
  const count = 380;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const cA = new THREE.Color("#457b9d");
  const cB = new THREE.Color("#2a9d8f");

  for (let i = 0; i < count; i += 1) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 22;
    positions[idx + 1] = Math.random() * 8 - 2;
    positions[idx + 2] = (Math.random() - 0.5) * 22;

    const blend = Math.random();
    const mixed = cA.clone().lerp(cB, blend);
    colors[idx] = mixed.r;
    colors[idx + 1] = mixed.g;
    colors[idx + 2] = mixed.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.45,
      vertexColors: true,
    })
  );
}
