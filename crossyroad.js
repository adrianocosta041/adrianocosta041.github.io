import * as THREE from "https://threejs.org/build/three.module.js";

const counterDOM = document.getElementById('counter');
const highscoreDOM = document.getElementById('highscore');
const Score = document.getElementsByClassName('Score');
const Record = document.getElementsByClassName('Record');
console.log(Record);
const endDOM = document.getElementById('end');

const scene = new THREE.Scene();


const distance = 500;
const camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 20000);

camera.rotation.x = 50 * Math.PI / 180;
camera.rotation.y = 20 * Math.PI / 180;
camera.rotation.z = 10 * Math.PI / 180;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const camera_1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera_1.position.z = 20;
camera_1.position.y = 15;
camera_1.position.x = 0;

camera_1.rotation.x = Math.PI / 2;


const zoom = 2;

const chickenSize = 15;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;

const stepTime = 200; // Miliseconds it takes for the chicken to take a step forward, backward, left or right

let lanes;
let currentLane;
let currentColumn;

let points = 0;
let highscore = 0;

let gamelost = false;
let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [{ x: 10, y: 0, w: 50, h: 30 }, { x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110, 40, [{ x: 10, y: 10, w: 50, h: 30 }, { x: 70, y: 10, w: 30, h: 30 }]);

const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

let isOrthographicCameraActive = true;

const generateLanes = () => [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;
  scene.add(lane.mesh);
  return lane;
}).filter((lane) => lane.index >= 0);

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;

  scene.add(lane.mesh);
  lanes.push(lane);
}

const chicken = new Chicken();
scene.add(chicken);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight)

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = chicken;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = - d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = - d;

const backLight = new THREE.DirectionalLight(0x000000, .4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight)

const laneTypes = ['car', 'truck', 'forest'];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
const threeHeights = [50, 55, 60, 80, 100];

const initaliseValues = () => {
  lanes = generateLanes()

  currentLane = 0;
  currentColumn = Math.floor(columns / 2);

  previousTimestamp = null;

  startMoving = false;
  moves = [];
  stepStartTimestamp;

  chicken.position.x = 0;
  chicken.position.y = 0;
  //chicken.rotateZ(Math.PI);
  // Assuming `chicken` is your chicken object...



  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
}

initaliseValues();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach(rect => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxGeometry(12 * zoom, 33 * zoom, 12 * zoom),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  wheel.position.z = 6 * zoom;
  return wheel;
}


function Car() {
  const car = new THREE.Group();
  const carColors = [0x00ff66, 0xc1ff00, 0xffcc00, 0xff8736, 0xfd4e4e];

  const color = carColors[Math.floor(Math.random() * carColors.length)];
  //const length = randomInt(70, 90);
  const carLengths = [50, 70, 80];
  const length = carLengths[Math.floor(Math.random() * carLengths.length)];
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(length * zoom, 30 * zoom, 18 * zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabinColors = [0x03defe, 0xcccccc, 0x000000];
  const cabinColour = cabinColors[Math.floor(Math.random() * cabinColors.length)];
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(33 * zoom, 24 * zoom, 12 * zoom),
    [
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true, map: carBackTexture }),
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true, map: carFrontTexture }),
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true, map: carRightSideTexture }),
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true, map: carLeftSideTexture }),
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ cabinColour, flatShading: true }) // bottom
    ]
  );
  cabin.position.x = 6 * zoom;
  cabin.position.z = 25.5 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -18 * zoom;
  car.add(frontWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 18 * zoom;
  car.add(backWheel);

  car.castShadow = true;
  car.receiveShadow = false;

  return car;
}




function Truck() {
  const truck = new THREE.Group();
  const truckColors = [0x49464c, 0x49606a, 0x668e97, 0xe4f0f3];
  const color = truckColors[Math.floor(Math.random() * truckColors.length)];
  const CargoColors = [0xb03636, 0x68905a, 0x5a6a86, 0x15557c];
  const Cargocolor = CargoColors[Math.floor(Math.random() * CargoColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(100 * zoom, 25 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * zoom;
  truck.add(base)

  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(75 * zoom, 35 * zoom, 40 * zoom),
    new THREE.MeshPhongMaterial({ color: Cargocolor, flatShading: true })
  );
  cargo.position.x = 15 * zoom;
  cargo.position.z = 30 * zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(25 * zoom, 30 * zoom, 30 * zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // back
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color, flatShading: true }) // bottom
    ]
  );
  cabin.position.x = -40 * zoom;
  cabin.position.z = 20 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -38 * zoom;
  truck.add(frontWheel);

  const middleWheel = new Wheel();
  middleWheel.position.x = -10 * zoom;
  truck.add(middleWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 30 * zoom;
  truck.add(backWheel);

  return truck;
}
// aux funtions:

function Three() {
  const three = new THREE.Group();
  const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(15 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);


  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(15 * zoom, height * zoom, 5),
    //new THREE.BoxGeometry(30 * zoom, 30 * zoom, height * zoom),
    new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * zoom;
  crown.rotation.x = Math.PI / 2;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  return three;
}
function RockGeometry(size = [1, 1, 1]) {
  let geometry = new THREE.BoxGeometry(
    size[0],
    size[1],
    size[2],
    size[0] * 2,
    size[1] * 2,
    size[2] * 2
  );
  // make the box less boxy
  // slice off some edges
  // move origing to the bottom of the box
  geometry.translate(0, size[1] / 2, 0);
  // scene.add(pointsAfter)
  return geometry;
}


function Rock(size) {
  //const height = 10;
  let geometry = new RockGeometry(size);
  const RockMaterial = new THREE.MeshPhongMaterial({
    color: 0x8b9994,
    flatShading: true,
    shininess: 0
  });
  let mesh = new THREE.Mesh(geometry, RockMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
  // const rock = new THREE.Mesh(
  //   new THREE.RockGeometry(10 * zoom, 10 * zoom, height * zoom),
  //   new THREE.MeshPhongMaterial(RockMaterial)
  // );
  // rock.position.z = height / 2 * zoom;
  // rock.castShadow = true;
  // rock.receiveShadow = true;
  // return rock;
}

function Chicken() {
  const chicken = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(chickenSize * zoom, chickenSize * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true })
  );
  body.position.z = 20 * zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  chicken.add(body);

  // Rowel
  const rowel = new THREE.Mesh(
    new THREE.BoxGeometry(1 * zoom, 5 * zoom, 25 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xF0619A, flatShading: true })
  );
  rowel.position.z = 21 * zoom;
  rowel.castShadow = true;
  rowel.receiveShadow = false;
  chicken.add(rowel);

  // Eyes
  const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 }); // Black color
  const eyeGeometry = new THREE.SphereGeometry(1 * zoom); // Sphere geometry for eyes

  const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
  eye1.position.set(-3 * zoom, 15, 25 * zoom);
  chicken.add(eye1);

  const eye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
  eye2.position.set(3 * zoom, 15, 25 * zoom);
  chicken.add(eye2);

  // Beak
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(2 * zoom, 5 * zoom, 10),
    new THREE.MeshLambertMaterial({ color: 0xFFD400, flatShading: true })
  );
  beak.position.set(-1 * zoom, 14 * zoom, 25 * zoom);
  beak.rotation.x = 1 / Math.PI;
  chicken.add(beak);


  // wings
  const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
  const wingGeometry = new THREE.BoxGeometry(7 * zoom, 2 * zoom, 10 * zoom);

  const wing1 = new THREE.Mesh(wingGeometry, wingMaterial);
  wing1.position.set(-8 * zoom, 0, 20 * zoom);
  wing1.rotation.z = 1 / Math.PI;
  chicken.add(wing1);

  const wing2 = new THREE.Mesh(wingGeometry, wingMaterial);
  wing2.position.set(8 * zoom, 0, 20 * zoom);
  wing2.rotation.z = 1 / Math.PI;
  chicken.add(wing2);


  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(6 * zoom, 4 * zoom, 6 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xFFFFEA, flatShading: true })
  );
  tail.position.z = 20 * zoom; // Adjust position as needed
  tail.position.y = -8 * zoom; // Adjust position as needed
  tail.castShadow = true;
  tail.receiveShadow = false;
  chicken.add(tail);

  //legs
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true });
  const legGeometry = new THREE.BoxGeometry(1 * zoom, 30 * zoom, 1 * zoom);

  const leg1 = new THREE.Mesh(legGeometry, legMaterial);
  leg1.position.set(-3 * zoom, 0 * zoom, 10 * zoom);
  leg1.rotation.x = -Math.PI / 2;
  chicken.add(leg1);

  const leg2 = new THREE.Mesh(legGeometry, legMaterial);
  leg2.position.set(3 * zoom, 0 * zoom, 10 * zoom);
  leg2.rotation.x = -Math.PI / 2;
  chicken.add(leg2);

  //feet
  const feetMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF00, flatShading: true });
  const feetGeometry = new THREE.BoxGeometry(2 * zoom, 6 * zoom, 1 * zoom);

  const feet1 = new THREE.Mesh(feetGeometry, feetMaterial);
  feet1.position.set(-3 * zoom, 0 * zoom, 3 * zoom);
  chicken.add(feet1);

  const feet2 = new THREE.Mesh(feetGeometry, feetMaterial);
  feet2.position.set(3 * zoom, 0 * zoom, 3 * zoom);
  chicken.add(feet2);

  chicken.add(camera_1);

  return chicken;
}
function Road() {
  const road = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
    new THREE.MeshPhongMaterial({ color })
  );

  for (let i = 0; i < 10; i++) {
    const crosswalk = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
    );
    crosswalk.scale.set(10 * zoom, 1 * zoom, 1 * zoom);
    crosswalk.position.z = 1.5 * zoom;
    crosswalk.position.y = i * 1 * zoom; // Position the crosswalk at a specific y position
    road.add(crosswalk);
  }


  const middle = createSection(0x454A59);
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(0x393D49);
  left.position.x = - boardWidth * zoom;
  road.add(left);

  const right = createSection(0x393D49);
  right.position.x = boardWidth * zoom;
  road.add(right);

  return road;
}
function handleButtonClick(direction) {
  // If a move is in progress, ignore the button click
  if (stepStartTimestamp) return;

  // Your existing code here...
}
handleButtonClick('forward');

function GrassBit() {
  // Create a grass bit using a BoxGeometry and a MeshPhongMaterial
  const geometry = new THREE.BoxGeometry(1 * zoom, 1 * zoom, 8 * zoom);
  const material = new THREE.MeshPhongMaterial({ color: 0xbaf455 });
  return new THREE.Mesh(geometry, material);
}
function Grass() {
  const grass = new THREE.Group();
  const createSection = color => {
    const section = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
      new THREE.MeshPhongMaterial({ color })
    );

    // Add grass bits to the section
    for (let i = 0; i < 200; i++) { // Adjust the number of grass bits as needed
      const grassBit = new GrassBit();
      grassBit.position.set(
        (Math.random() - 0.5) * boardWidth * zoom, // Random x position within the section
        (Math.random() - 0.5) * positionWidth * zoom, // Random y position within the section
        1.5 * zoom // z position slightly above the section
      );
      section.add(grassBit);
    }

    return section;
  };

  const createSideSection = color => {
    const section = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
      new THREE.MeshPhongMaterial({ color })

    );
    return section;
  }


  const middle = createSection(0xbaf455);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSideSection(0x99C846);
  left.position.x = - boardWidth * zoom;
  grass.add(left);

  const right = createSideSection(0x99C846);
  right.position.x = boardWidth * zoom;
  grass.add(right);

  grass.position.z = 1.5 * zoom;
  return grass;
}


const listener = new THREE.AudioListener();
camera.add(listener);


const audioLoader = new THREE.AudioLoader();


const endSound = new THREE.Audio(listener);
audioLoader.load('sounds/fail.mp3', function (buffer) {
  endSound.setBuffer(buffer);
  endSound.setLoop(false);
  endSound.setVolume(0.5);
});


document.addEventListener('keydown', function (event) {
  if (event.key === 'm' || event.key === 'M') {
    if (sound.isPlaying) {
      sound.pause();
      muteButton.textContent = 'Unmute';
    } else {
      sound.play();
      muteButton.textContent = 'Mute';
    }
  }
});


function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random() * laneTypes.length)];

  switch (this.type) {
    case 'field': {
      this.type = 'field';
      this.mesh = new Grass();
      break;
    }
    // trees and rocks
    case 'forest': {
      this.mesh = new Grass();

      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const three = new Three();
        let position;
        do {
          position = Math.floor(Math.random() * columns);
        } while (this.occupiedPositions.has(position))
        this.occupiedPositions.add(position);
        three.position.x = (position * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        this.mesh.add(three);
        return three;
      })


      this.rocks = [1, 2, 3, 4].map(() => {
        const rock = new Rock([30, 30, 30]);
        let position;
        do {
          position = Math.floor(Math.random() * columns);
        } while (this.occupiedPositions.has(position))
        this.occupiedPositions.add(position);
        rock.position.x = (position * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        this.mesh.add(rock);
        return rock;
      })
      break;
    }
    case 'car': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2, 3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor(Math.random() * columns / 2);
        } while (occupiedPositions.has(position))
        occupiedPositions.add(position);
        vechicle.position.x = (position * positionWidth * 2 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      })

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case 'truck': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor(Math.random() * columns / 3);
        } while (occupiedPositions.has(position))
        occupiedPositions.add(position);
        vechicle.position.x = (position * positionWidth * 3 + positionWidth / 2) * zoom - boardWidth * zoom / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      })

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}
document.querySelector("#retry").addEventListener("click", () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  gamelost = false;
  if (points > highscore) {
    highscore = points;
    console.log("New high score: " + highscore); // Log new high score
    alert("New high score: " + highscore); // Show alert with new high score
  }
  points = 0; // Reset points
  counterDOM.innerHTML = points;
  console.log("RESET POINTS");
  highscoreDOM.innerHTML = highscore;
  initaliseValues();
  endDOM.style.visibility = 'hidden';
});

document.getElementById('forward').addEventListener("click", () => move('forward'));

document.getElementById('backward').addEventListener("click", () => move('backward'));

document.getElementById('left').addEventListener("click", () => move('left'));

document.getElementById('right').addEventListener("click", () => move('right'));

window.addEventListener("keydown", event => {
  if (event.keyCode == '38') {
    // up arrow
    move('forward');
  }
  else if (event.keyCode == '40') {
    // down arrow
    move('backward');
  }
  else if (event.keyCode == '37') {
    // left arrow
    move('left');
  }
  else if (event.keyCode == '39') {
    // right arrow
    move('right');
  }
});

function move(direction) {
  // position of the chicken
  console.log(currentColumn, currentLane);
  if (gamelost) return;
  const finalPositions = moves.reduce((position, move) => {
    if (move === 'forward') return { lane: position.lane + 1, column: position.column };
    if (move === 'backward') return { lane: position.lane - 1, column: position.column };
    if (move === 'left') return { lane: position.lane, column: position.column - 1 };
    if (move === 'right') return { lane: position.lane, column: position.column + 1 };
  }, { lane: currentLane, column: currentColumn })

  if (direction === 'forward') {
    if (lanes[finalPositions.lane + 1].type === 'forest' && lanes[finalPositions.lane + 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
    addLane();
  }
  else if (direction === 'backward') {
    if (finalPositions.lane === 0) return;
    if (lanes[finalPositions.lane - 1].type === 'forest' && lanes[finalPositions.lane - 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'left') {
    if (finalPositions.column === 0) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column - 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'right') {
    if (finalPositions.column === columns - 1) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column + 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  moves.push(direction);
}

window.addEventListener('keydown', function (event) {
  if (event.key === 'r' || event.key === 'R') {
    isOrthographicCameraActive = !isOrthographicCameraActive;
  }
  if (isOrthographicCameraActive == false) {
    document.querySelector('.Score p').style.color = "black";
    document.querySelector('.Record p').style.color = "black";
    scene.background = new THREE.Color(0x1b8bb9);
  }
  else {
    document.querySelector('.Score p').style.color = "white";
    document.querySelector('.Record p').style.color = "white";
    scene.background = new THREE.Color(0xffffff);
  }
});



function animate(timestamp) {
  requestAnimationFrame(animate);
  let positionY;

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Animate cars and trucks moving on the lane
  lanes.forEach(lane => {
    if (lane.type === 'car' || lane.type === 'truck') {
      const aBitBeforeTheBeginingOfLane = -boardWidth * zoom / 2 - positionWidth * 2 * zoom;
      const aBitAfterTheEndOFLane = boardWidth * zoom / 2 + positionWidth * 2 * zoom;
      lane.vechicles.forEach(vechicle => {
        if (lane.direction) {
          vechicle.position.x = vechicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vechicle.position.x -= lane.speed / 16 * delta;
        } else {
          vechicle.position.x = vechicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vechicle.position.x += lane.speed / 16 * delta;
        }
      });
    }
  });

  if (startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
    switch (moves[0]) {
      case 'forward': {
        const positionY = currentLane * positionWidth * zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY; // initial chicken position is 0

        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'backward': {
        positionY = currentLane * positionWidth * zoom - moveDeltaDistance
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'left': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX; // initial chicken position is 0
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'right': {
        const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - boardWidth * zoom / 2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX;

        chicken.position.z = jumpDeltaDistance;
        break;
      }
    }
    // Once a step has ended
    if (moveDeltaTime > stepTime) {
      switch (moves[0]) {
        case 'forward': {
          currentLane++;
          points++;
          // Check if the chicken is in column 9 when it moves forward
          if (currentColumn === 8 && (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck')) {
            // The chicken crossed a crosswalk, so award double points
            points += 1;

          }
          counterDOM.innerHTML = points;
          break;
        }
        case 'backward': {
          currentLane--;
          points -= 2;
          if (points < 0) {
            points = 0;
          }

          counterDOM.innerHTML = points;
          break;
        }
        case 'left': {
          currentColumn--;
          break;
        }
        case 'right': {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      // If more steps are to be taken then restart counter otherwise stop stepping
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Hit test
  if (lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const chickenMinX = chicken.position.x - chickenSize * zoom / 2;
    const chickenMaxX = chicken.position.x + chickenSize * zoom / 2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
    lanes[currentLane].vechicles.forEach(vechicle => {
      const carMinX = vechicle.position.x - vechicleLength * zoom / 2;
      const carMaxX = vechicle.position.x + vechicleLength * zoom / 2;
      if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
        endDOM.style.visibility = 'visible';
        gamelost = true;
        isOrthographicCameraActive = true;
        console.log('hit');
        endSound.play();
      }

    });

  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (gamelost) {
    camera.position.z += 0.01;
  }
  const activeCamera = isOrthographicCameraActive ? camera : camera_1;
  renderer.render(scene, activeCamera);
}

requestAnimationFrame(animate);