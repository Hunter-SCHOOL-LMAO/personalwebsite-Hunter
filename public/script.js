// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    // Update active state
    document.querySelectorAll('nav a').forEach(link => {
      link.classList.remove('active');
    });
    this.classList.add('active');
  });
});

// Update active nav link on scroll
window.addEventListener('scroll', () => {
  let current = '';
  const sections = document.querySelectorAll('section');
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (pageYOffset >= sectionTop - 100) {
      current = section.getAttribute('id');
    }
  });

  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});

// Camera Sensor Widget with Matter.js
const photonBox = document.getElementById('photonBox');
const sensorOutput = document.getElementById('sensorOutput');
const photonCountDisplay = document.getElementById('photonCount');
const rgbValueDisplay = document.getElementById('rgbValue');
const apertureValueDisplay = document.getElementById('apertureValue');
const apertureLeft = document.getElementById('apertureLeft');
const apertureRight = document.getElementById('apertureRight');

// Matter.js modules
const { Engine, World, Bodies, Body, Events } = Matter;

// Create engine
const engine = Engine.create();
engine.gravity.y = 0; // No gravity for photon simulation

// Configure engine for perfect collisions with no energy loss
engine.enableSleeping = false; // Prevent bodies from sleeping
engine.positionIterations = 10; // Increase accuracy
engine.velocityIterations = 10; // Increase accuracy
engine.constraintIterations = 4; // More constraint solving

const boxWidth = 600;
const boxHeight = 400;
const bladeHeight = 50;
const bladeY = 360; // Near bottom, just above sensor

let photons = [];
let detectedPhotons = [];
let animationId = null;
let apertureWidth = 500;
let apertureLeftEdge = 50;
let apertureRightEdge = 550;

// Create static bodies for walls with perfect elasticity
const wallThickness = 10;
const wallOptions = {
  isStatic: true,
  restitution: 1,
  friction: 0,
  frictionStatic: 0,
  slop: 0
};

const leftWall = Bodies.rectangle(-wallThickness/2, boxHeight/2, wallThickness, boxHeight, wallOptions);
const rightWall = Bodies.rectangle(boxWidth + wallThickness/2, boxHeight/2, wallThickness, boxHeight, wallOptions);
const topWall = Bodies.rectangle(boxWidth/2, -wallThickness/2, boxWidth, wallThickness, wallOptions);
const bottomWall = Bodies.rectangle(boxWidth/2, boxHeight - 2.5, boxWidth, 5, { 
  ...wallOptions,
  label: 'sensor'
});

// Create aperture blades (will be recreated when aperture changes)
let leftBlade, rightBlade;

function createApertureBlades() {
  // Remove old blades if they exist
  if (leftBlade) World.remove(engine.world, leftBlade);
  if (rightBlade) World.remove(engine.world, rightBlade);
  
  const bladeWidth = (boxWidth - apertureWidth) / 2;
  
  const bladeOptions = {
    isStatic: true,
    restitution: 1,
    friction: 0,
    frictionStatic: 0,
    slop: 0,
    label: 'blade'
  };
  
  leftBlade = Bodies.rectangle(
    bladeWidth / 2,
    bladeY,
    bladeWidth,
    bladeHeight,
    bladeOptions
  );
  
  rightBlade = Bodies.rectangle(
    boxWidth - bladeWidth / 2,
    bladeY,
    bladeWidth,
    bladeHeight,
    bladeOptions
  );
  
  World.add(engine.world, [leftBlade, rightBlade]);
  
  // Update aperture edges
  apertureLeftEdge = bladeWidth;
  apertureRightEdge = boxWidth - bladeWidth;
}

// Add walls to world
World.add(engine.world, [leftWall, rightWall, topWall, bottomWall]);
createApertureBlades();

class Photon {
  constructor() {
    this.radius = Math.random() * 8 + 5;
    const x = Math.random() * (boxWidth - this.radius * 2) + this.radius;
    const y = Math.random() * 150 + this.radius;
    
    // Random color with varying brightness
    this.r = Math.floor(Math.random() * 256);
    this.g = Math.floor(Math.random() * 256);
    this.b = Math.floor(Math.random() * 256);
    this.brightness = Math.random() * 0.9 + 0.1;
    
    this.displayR = Math.floor(this.r * this.brightness);
    this.displayG = Math.floor(this.g * this.brightness);
    this.displayB = Math.floor(this.b * this.brightness);
    
    // Store target speed for velocity maintenance
    this.targetSpeed = Math.random() * 2 + 3; // Speed between 3-5
    
    // Create Matter.js body
    this.body = Bodies.circle(x, y, this.radius, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      density: 0.001,
      inertia: Infinity, // Prevents rotation from affecting linear motion
      slop: 0 // Reduces penetration tolerance for more accurate collisions
    });
    
    // Disable sleeping to prevent photons from stopping
    this.body.sleepThreshold = Infinity;
    
    // Set initial velocity
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * this.targetSpeed;
    const vy = Math.sin(angle) * this.targetSpeed;
    Body.setVelocity(this.body, { x: vx, y: vy });
    
    // Add to world
    World.add(engine.world, this.body);
    
    // Create DOM element
    this.element = document.createElement('div');
    this.element.className = 'photon';
    this.element.style.width = this.radius * 2 + 'px';
    this.element.style.height = this.radius * 2 + 'px';
    this.element.style.backgroundColor = `rgb(${this.displayR}, ${this.displayG}, ${this.displayB})`;
    this.element.style.boxShadow = `0 0 ${this.radius}px rgba(${this.displayR}, ${this.displayG}, ${this.displayB}, 0.6)`;
    photonBox.appendChild(this.element);
    
    this.wasAtSensor = false;
  }
  
  update() {
    // Maintain constant speed by normalizing velocity
    const velocity = this.body.velocity;
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Only adjust if speed has deviated significantly
    if (Math.abs(currentSpeed - this.targetSpeed) > 0.1) {
      const scale = this.targetSpeed / currentSpeed;
      Body.setVelocity(this.body, {
        x: velocity.x * scale,
        y: velocity.y * scale
      });
    }
    
    // Sync DOM element with Matter.js body position
    const pos = this.body.position;
    this.element.style.left = (pos.x - this.radius) + 'px';
    this.element.style.top = (pos.y - this.radius) + 'px';
    
    // Check for sensor hit (sensor line is at y=395, blades at y=360)
    // Detect photons passing through the aperture gap between blades and sensor
    const bladeBottomY = bladeY + bladeHeight / 2; // y=385
    const sensorTopY = boxHeight - 10; // y=390
    const isInDetectionZone = pos.y >= bladeBottomY && pos.y <= sensorTopY;
    const isInAperture = pos.x >= apertureLeftEdge && pos.x <= apertureRightEdge;
    
    // Track if photon is crossing the sensor line
    if (isInDetectionZone && isInAperture && !this.wasAtSensor && velocity.y > 0) {
      // Moving downward through aperture to sensor
      this.hitSensor();
      this.wasAtSensor = true;
    } else if (!isInDetectionZone) {
      // Reset flag when photon leaves detection zone
      this.wasAtSensor = false;
    }
  }
  
  hitSensor() {
    detectedPhotons.push({
      r: this.displayR,
      g: this.displayG,
      b: this.displayB
    });
    updateSensorDisplay();
  }
  
  remove() {
    this.element.remove();
    World.remove(engine.world, this.body);
  }
}

function addPhotons(count) {
  for (let i = 0; i < count; i++) {
    photons.push(new Photon());
  }
  if (!animationId) {
    animate();
  }
}

function animate() {
  // Update Matter.js physics engine
  Engine.update(engine, 1000 / 60);
  
  // Update photon DOM elements to match physics bodies
  photons.forEach(photon => photon.update());
  
  animationId = requestAnimationFrame(animate);
}

function updateSensorDisplay() {
  if (detectedPhotons.length === 0) return;

  // Calculate average color
  let totalR = 0, totalG = 0, totalB = 0;
  detectedPhotons.forEach(p => {
    totalR += p.r;
    totalG += p.g;
    totalB += p.b;
  });

  const avgR = Math.floor(totalR / detectedPhotons.length);
  const avgG = Math.floor(totalG / detectedPhotons.length);
  const avgB = Math.floor(totalB / detectedPhotons.length);

  // Apply brightness multiplier based on photon count
  // More photons = brighter output (simulates exposure/accumulation)
  // Scale: 10 photons = 20% brightness, 100 photons = 100% brightness
  const brightnessMultiplier = Math.min(detectedPhotons.length / 10, 1.5);
  
  const displayR = Math.min(255, Math.floor(avgR * brightnessMultiplier));
  const displayG = Math.min(255, Math.floor(avgG * brightnessMultiplier));
  const displayB = Math.min(255, Math.floor(avgB * brightnessMultiplier));

  // Update display
  sensorOutput.style.backgroundColor = `rgb(${displayR}, ${displayG}, ${displayB})`;
  
  // Update text color for contrast
  const brightness = (displayR * 299 + displayG * 587 + displayB * 114) / 1000;
  sensorOutput.style.color = brightness > 128 ? '#212315' : '#eceee2';
  
  photonCountDisplay.textContent = detectedPhotons.length;
  rgbValueDisplay.textContent = `${displayR}, ${displayG}, ${displayB}`;
}

function resetSensor() {
  // Remove all photons
  photons.forEach(photon => photon.remove());
  photons = [];
  detectedPhotons = [];
  
  // Cancel animation
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Reset display
  sensorOutput.style.backgroundColor = 'rgb(0, 0, 0)';
  sensorOutput.style.color = '#212315';
  photonCountDisplay.textContent = '0';
  rgbValueDisplay.textContent = '0, 0, 0';
}

function adjustAperture(sliderValue) {
  // Reverse the slider: low value = wide aperture, high value = narrow aperture
  apertureWidth = 800 - parseInt(sliderValue); // 200px to 600px gap
  
  // Recreate aperture blades with new width
  createApertureBlades();
  
  // Update CSS for visual blades
  const bladeWidth = (boxWidth - apertureWidth) / 2;
  apertureLeft.style.width = bladeWidth + 'px';
  apertureRight.style.width = bladeWidth + 'px';
  
  // Calculate f-stop (inverse relationship - wider aperture = smaller f-number)
  // Map 200-600px to f/16-f/1.4 (inverse scale)
  const fStop = (16 - ((apertureWidth - 200) / 400) * 14.6).toFixed(1);
  apertureValueDisplay.textContent = `f/${fStop} (${apertureWidth}px)`;
}

// Initialize aperture on load
adjustAperture(300);

// Start with some initial photons
addPhotons(10);

