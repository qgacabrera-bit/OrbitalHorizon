// --- Planet Generator Logic ---
const container = document.getElementById('planet-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000); // Reduced FOV
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

let pointLight; // Declare the point light globally
let baseLightIntensity = 2.0; // Store the base intensity for pulsing
let fallbackDirectionalLight; // For when the star is hidden
let ambientLight; // Declare an ambient light globally
let stellarObject; // Declare stellarObject globally
let orbitLine; // Declare orbitLine globally
let isRevolutionEnabled = true; // Flag to control revolution animation
const clock = new THREE.Clock(); // Real-time clock for accurate animation
let simulatedDays = 0; // Accumulator for simulated time
let timeScale = 1.0; // Controls the speed of the simulation
let isPaused = false; // Flag to pause the simulation
let isTopDownView = false; // Flag for top-down camera view
//slider elements
const radiusSlider = document.getElementById('radius-slider');
const tempSlider = document.getElementById('temp-slider');
const insolationSlider = document.getElementById('insolation-slider');
const radiusInput = document.getElementById('radius-input');
const tempInput = document.getElementById('temp-input');
const insolationInput = document.getElementById('insolation-input');
const stellarRadiusSlider = document.getElementById('stellar-radius-slider');
const stellarRadiusInput = document.getElementById('stellar-radius-input');
const stellarTempSlider = document.getElementById('stellar-temp-slider');
const stellarTempInput = document.getElementById('stellar-temp-input');
const periodSlider = document.getElementById('period-slider');
const periodInput = document.getElementById('period-input');
const infoPanel = document.getElementById('planet-info-panel');

if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
}

const geometry = new THREE.SphereGeometry(50, 64, 64);
const textureLoader = new THREE.TextureLoader();

// List of planet texture paths
const textures = [
    'https://i.imgur.com/zlnvuaI.jpeg',
    'https://i.imgur.com/v9vKt4T.jpeg',
    'https://i.imgur.com/nVEgUBd.jpeg',
    'https://i.imgur.com/I4PhNbE.jpeg',
    'https://i.imgur.com/ivNyaJo.jpeg',
    'https://i.imgur.com/jxuq7Wj.jpeg',
    'https://i.imgur.com/bj8hvU4.jpeg',
    'https://i.imgur.com/RF0Gb8A.jpeg',
    'https://i.imgur.com/5BO62v7.jpeg',
    'https://i.imgur.com/vh2ApNc.jpeg',
    'https://imgur.com/pp6V4rC.jpeg',
    'https://i.imgur.com/bGwIGAH.jpeg',
    'https://i.imgur.com/xEl0Hp5.jpeg',
    'https://i.imgur.com/t5a5hUS.jpeg',
    'https://i.imgur.com/VVH74ia.jpeg',
    'https://i.imgur.com/SztsBYE.jpeg',
    'https://i.imgur.com/pbybcso.png',
    'https://i.imgur.com/Ry6Wqap.png',
    'https://i.imgur.com/jCBb5EU.png',
    'https://i.imgur.com/WeKNEnI.png',
    'https://i.imgur.com/J6oioXm.png',
    'https://i.imgur.com/TO1lR8E.png',
    'https://i.imgur.com/ls7CrET.png',
    'https://i.imgur.com/AUDyk0h.png'  

];;

// --- Atmosphere Shaders ---
const atmosphereVertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const atmosphereFragmentShader = `
    varying vec3 vNormal;
    uniform vec3 uGlowColor;
    void main() {
        // Calculate intensity based on the angle of the surface normal to the camera
        // This creates the "glow" effect at the planet's limb (Fresnel effect)
        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(uGlowColor, 1.0) * intensity;
    }
`;

const planetMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Start with white, will be tinted by temperature
    map: null
});
const planet = new THREE.Mesh(geometry, planetMaterial);
planet.castShadow = true;
planet.targetPosition = new THREE.Vector3(); // For smooth transitions
planet.receiveShadow = true;

// Create a central object for the star system
const starSystem = new THREE.Object3D();
scene.add(starSystem);
starSystem.add(planet); // Add planet to the star system

function createAtmosphere(radius = 50, glowColor = new THREE.Color(0x93d5f0), scale = 1.05) {
    const atmosphereGeometry = new THREE.SphereGeometry(radius, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
            uGlowColor: { value: glowColor }
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.scale.set(scale, scale, scale); // Apply the scale
    return atmosphere;
}

const planetAtmosphere = createAtmosphere();
planetAtmosphere.scale.set(1.05, 1.05, 1.05);
planet.add(planetAtmosphere);

let starfield;

function createStarfield() {
    const starCount = 10000;
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 35000; // x
        positions[i3 + 1] = (Math.random() - 0.5) * 35000; // y
        positions[i3 + 2] = (Math.random() - 0.5) * 35000; // z
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.8
    });

    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
}

const originalCameraZ = 200;
let cameraTargetZ = originalCameraZ;
const originalCameraPosition = new THREE.Vector3(0, 0, originalCameraZ);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let draggedObject = null;
let previousMousePosition = { x: 0, y: 0 };

if (renderer.domElement) {
    renderer.domElement.addEventListener('mousedown', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const objectsToIntersect = [planet];
        if (comparisonObject) {
            objectsToIntersect.push(comparisonObject);
        }
        const intersects = raycaster.intersectObjects(objectsToIntersect, true); 

        if (intersects.length > 0) {
            draggedObject = intersects[0].object.parent === scene ? intersects[0].object : intersects[0].object.parent;
        }

        isDragging = true;
        previousMousePosition = {
            x: e.clientX,
            y: e.clientY
        };
    });

    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
        draggedObject = null;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!isDragging || !draggedObject) return;

        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        const rotationSpeed = 0.005;
        if (isTopDownView) {
            // In top-down view, dragging should pan the camera
            const panSpeed = 0.5;
            camera.position.x -= deltaMove.x * panSpeed;
            camera.position.z += deltaMove.y * panSpeed; // Y mouse movement maps to Z scene movement
        } else if (draggedObject) {
            // In perspective view, dragging rotates the object
            draggedObject.rotation.y += deltaMove.x * rotationSpeed;
            draggedObject.rotation.x += deltaMove.y * rotationSpeed;
        } else {
            // If not dragging an object, rotate the whole system
            starSystem.rotation.y += deltaMove.x * rotationSpeed * 0.1;
            starSystem.rotation.x += deltaMove.y * rotationSpeed * 0.1;
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
}

let comparisonObject = null;
let currentComparisonBody = null; // To track the name of the current comparison
let storedPlanets = []; // Array to hold multiple stored planets
const comparisonData = {
    earth: {
        radius: 50, // Base radius (1 Earth radii)
        texture: 'https://i.imgur.com/jxuq7Wj.jpeg'
    },
    mars: {
        radius: 50 * 0.53, // Mars is ~0.53x Earth's radius
        texture: 'https://i.imgur.com/pp6V4rC.jpeg'
    },
    moon: {
        radius: 50 * 0.273, // Moon is ~0.273x Earth's radius
        texture: 'https://i.imgur.com/bGwIGAH.jpeg'
    },
    jupiter: {
        radius: 50 * 11.2, // Jupiter is ~11.2x Earth's radius
        texture: 'https://i.imgur.com/s9YuOa7.jpeg'
    },
    sun: {
        radius: 50 * 109, // Sun is ~109x Earth's radius
        texture: 'https://i.imgur.com/zlnvuaI.jpeg'
    }
};

function showComparison(bodyName) {
    currentComparisonBody = bodyName; // Track the current comparison

    if (comparisonObject) {
        starSystem.remove(comparisonObject); // Remove from starSystem
        comparisonObject.geometry.dispose();
        if (Array.isArray(comparisonObject.material)) {
            comparisonObject.material.forEach(m => m.dispose());
        } else {
            comparisonObject.material.dispose();
        }
        if (comparisonObject.children.length > 0) {
            comparisonObject.children[0].geometry.dispose();
            comparisonObject.children[0].material.dispose();
        }
        comparisonObject = null;
    }

    if (bodyName && bodyName !== 'none') {
        let data;
        let compMaterial;
        let atmosphereColor = new THREE.Color(0xffffff); // Default atmosphere

        if (bodyName.startsWith('stored_')) {
            const index = parseInt(bodyName.split('_')[1], 10);
            if (index >= storedPlanets.length) return; // Invalid index

            data = storedPlanets[index];
            const storedTexture = textureLoader.load(data.texturePath);
            compMaterial = new THREE.MeshStandardMaterial({
                map: storedTexture,
                color: data.color.clone()
            });
            atmosphereColor = data.atmosphereColor.clone();
        } else {
            data = comparisonData[bodyName];
            const compTexture = textureLoader.load(data.texture);
            compMaterial = new THREE.MeshStandardMaterial({ map: compTexture });
        }
        
        const compGeometry = new THREE.SphereGeometry(data.radius, 64, 64);
        comparisonObject = new THREE.Mesh(compGeometry, compMaterial);
        comparisonObject.castShadow = true;
        comparisonObject.targetPosition = new THREE.Vector3(); // For smooth transitions
        comparisonObject.receiveShadow = true;

        const comparisonAtmosphere = createAtmosphere(data.radius, atmosphereColor);
        comparisonAtmosphere.scale.set(1.02, 1.02, 1.02);
        comparisonObject.add(comparisonAtmosphere);

        const userPlanetRadius = planet.scale.x * 50;
        const comparisonRadius = data.radius;

        starSystem.add(comparisonObject); // Add comparison object to the star system

        let totalWidth;

        if (isRevolutionEnabled) {
            // Stellar mode: Position planets opposite each other in a shared orbit.
            const starRadius = stellarObject.geometry.parameters.radius * stellarObject.scale.x;
            const largerPlanetRadius = Math.max(userPlanetRadius, comparisonRadius);
            const minGap = 80; // Use the same gap as solo mode for consistency
            const orbitalRadius = starRadius * 1.5 + largerPlanetRadius + minGap;

            planet.targetPosition.set(orbitalRadius, 0, 0);
            comparisonObject.targetPosition.set(-orbitalRadius, 0, 0);
            totalWidth = orbitalRadius * 2;
        } else {
            // Solo mode: Position planets side-by-side.
            const halfGap = 30;
            planet.targetPosition.set(-userPlanetRadius - halfGap, 0, 0);
            comparisonObject.targetPosition.set(comparisonRadius + halfGap, 0, 0);
            totalWidth = userPlanetRadius + comparisonRadius + (halfGap * 2);
        }

        // Correctly calculate total height including the star if it's visible
        const starRadiusForHeight = isRevolutionEnabled ? stellarObject.geometry.parameters.radius * stellarObject.scale.x : 0;
        const totalHeight = Math.max(userPlanetRadius * 2, comparisonRadius * 2, starRadiusForHeight * 2);

        const fov = camera.fov * (Math.PI / 180);
        const distanceForHeight = totalHeight / (2 * Math.tan(fov / 2));
        const distanceForWidth = totalWidth / (2 * Math.tan(fov / 2) * camera.aspect);

        cameraTargetZ = Math.max(distanceForHeight, distanceForWidth) * 1.4;
    } else {
        currentComparisonBody = null; // Clear tracking when no comparison is active
        // When clearing, re-run the main radius update function. This will correctly
        // calculate the planet's solo orbit based on the current star size.
        updatePlanetRadius(radiusInput.value);
    }
}

function storeCustomPlanet() {
    const planetNameInput = document.getElementById('planet-name-input');
    const planetData = {
        name: planetNameInput ? planetNameInput.value : 'Custom Planet',
        radius: planet.scale.x * 50,
        texturePath: planetMaterial.map.image.src, // Store the path, not the image data
        color: planetMaterial.color.clone(),
        atmosphereColor: planetAtmosphere.material.uniforms.uGlowColor.value.clone()
    };
    storedPlanets.push(planetData);
    const storedIndex = storedPlanets.length - 1;

    const newButton = document.createElement('button');
    newButton.classList.add('compare-btn');
    newButton.dataset.body = `stored_${storedIndex}`;
    newButton.textContent = planetData.name;

    newButton.addEventListener('click', () => {
        showComparison(newButton.dataset.body);
    });

    const clearButton = document.getElementById('clear-comparison-btn');
    if (clearButton) {
        clearButton.parentNode.insertBefore(newButton, clearButton);
    }
}

// Function to randomly select and apply a new texture
function randomizePlanet() {
    const randomTexturePath = textures[Math.floor(Math.random() * textures.length)];
    textureLoader.load(
        randomTexturePath,
        // onLoad callback
        (texture) => {
            planetMaterial.map = texture;
            planetMaterial.needsUpdate = true; // Tell Three.js to update the material
        },
        undefined,
        (err) => {
            console.error('An error occurred loading the texture:', err);
        }
    );
}

camera.position.z = originalCameraZ;

function updatePlanetRadius(value) {
    if (planet) {
        // If the input ends in a dot or is empty, don't parse it yet.
        if (typeof value === 'string' && (value.endsWith('.') || value === '')) {
            radiusInput.value = value;
            return;
        }

        // The 'value' is in Earth Radii. The base size of our sphere geometry is 50.
        // So, a value of 1 (1 Earth Radius) should result in a planet of size 50.
        const earthRadii = parseFloat(value);
        const newRadius = earthRadii * 50; // Convert Earth Radii to simulator units.
        const scaleFactor = newRadius / 50; // Calculate scale based on base geometry size.
        planet.scale.set(scaleFactor, scaleFactor, scaleFactor);

        let totalWidth, totalHeight;

        if (comparisonObject) {
            // --- COMPARE MODE ---
            const userPlanetRadius = newRadius;
            const comparisonRadius = comparisonObject.geometry.parameters.radius;
            const starRadius = isRevolutionEnabled ? stellarObject.geometry.parameters.radius * stellarObject.scale.x : 0;
            totalHeight = Math.max(userPlanetRadius * 2, comparisonRadius * 2, starRadius * 2);

            if (isRevolutionEnabled) {
                // Stellar mode: Position planets opposite each other.
                const starRadius = stellarObject.geometry.parameters.radius * stellarObject.scale.x;
                const largerPlanetRadius = Math.max(userPlanetRadius, comparisonRadius); // This is newRadius
                const minGap = 80;
                const orbitalRadius = starRadius * 1.5 + largerPlanetRadius + minGap;

                planet.targetPosition.set(orbitalRadius, 0, 0);
                comparisonObject.targetPosition.set(-orbitalRadius, 0, 0);
                totalWidth = orbitalRadius * 2;
            } else {
                // Solo mode: Position planets side-by-side.
                const halfGap = 30;
                planet.targetPosition.set(-userPlanetRadius - halfGap, 0, 0);
                comparisonObject.targetPosition.set(comparisonRadius + halfGap, 0, 0);
                totalWidth = userPlanetRadius + comparisonRadius + (halfGap * 2);
            }
        } else {
            // --- SOLO MODE ---
            const starRadius = isRevolutionEnabled ? stellarObject.geometry.parameters.radius * stellarObject.scale.x : 0;
            totalHeight = Math.max(starRadius * 2, newRadius * 2); // Height of star (if visible) or planet

            if (isRevolutionEnabled) {
                // Stellar mode: Update orbital radius.
                const starRadius = stellarObject.geometry.parameters.radius * stellarObject.scale.x;
                const minGap = 80; // Increased base gap
                const newOrbitalRadius = starRadius * 1.5 + newRadius + minGap; // Make orbit distance more dependent on star size
                planet.targetPosition.set(newOrbitalRadius, 0, 0);

                // Update the visual orbit line
                orbitLine.geometry.dispose();
                orbitLine.geometry = new THREE.RingGeometry(newOrbitalRadius - 0.5, newOrbitalRadius + 0.5, 128);
                totalWidth = newOrbitalRadius + newRadius;
            } else {
                // Solo mode: Planet is at the center.
                planet.targetPosition.set(0, 0, 0);
                totalWidth = newRadius * 2;
            }
        }

        // Universal camera zoom logic
        const fov = camera.fov * (Math.PI / 180);
        const distanceForHeight = totalHeight / (2 * Math.tan(fov / 2));
        const distanceForWidth = totalWidth / (2 * Math.tan(fov / 2) * camera.aspect);
        cameraTargetZ = Math.max(originalCameraZ, distanceForHeight, distanceForWidth) * 1.4;
        
        radiusInput.value = earthRadii;
        radiusSlider.value = earthRadii;

        updatePlanetInsights();
    }
}

function updatePlanetTemperature(value) {
    // If the input ends in a dot or is empty, don't parse it yet.
    if (typeof value === 'string' && (value.endsWith('.') || value.endsWith('-') || value === '')) {
        tempInput.value = value;
        return;
    }

    const temp = parseFloat(value);

    // --- New, more detailed color mapping for temperature ---
    let r, g, b;
    if (temp <= -50) {
        // Icy blue/white for very cold planets
        const t = (temp + 200) / 150; // Normalize from -200 to -50
        r = 0.8 - t * 0.4; // 0.8 -> 0.4
        g = 0.9 - t * 0.2; // 0.9 -> 0.7
        b = 1.0;
    } else if (temp <= 25) {
        // Transition from blue to a temperate green
        const t = (temp + 50) / 75; // Normalize from -50 to 25
        r = 0.4 - t * 0.2; // 0.4 -> 0.2
        g = 0.7 - t * 0.1; // 0.7 -> 0.6
        b = 1.0 - t * 0.5; // 1.0 -> 0.5
    } else if (temp <= 100) {
        // Temperate green to arid yellow/brown
        const t = (temp - 25) / 75; // Normalize from 25 to 100
        r = 0.2 + t * 0.6; // 0.2 -> 0.8
        g = 0.6 + t * 0.2; // 0.6 -> 0.8
        b = 0.5 - t * 0.4; // 0.5 -> 0.1
    } else if (temp <= 500) {
        // Arid brown to glowing orange/red
        const t = (temp - 100) / 400; // Normalize from 100 to 500
        r = 0.8 + t * 0.2; // 0.8 -> 1.0
        g = 0.8 - t * 0.4; // 0.8 -> 0.4
        b = 0.1;
    } else {
        // Glowing red to white-hot for extreme temperatures
        const t = (temp - 500) / 500; // Normalize from 500 to 1000
        r = 1.0;
        g = 0.4 + t * 0.6; // 0.4 -> 1.0
        b = 0.1 + t * 0.8; // 0.1 -> 0.9
    }

    planetMaterial.color.setRGB(r, g, b);

    const atmosphereColor = new THREE.Color(r, g, b);
    planetAtmosphere.material.uniforms.uGlowColor.value = atmosphereColor;

    tempInput.value = temp;
    tempSlider.value = temp;

    updatePlanetInsights();
}

function updateInsolation(value) {
    if (pointLight && fallbackDirectionalLight) {
        // If the input ends in a dot or is empty, don't parse it yet.
        if (typeof value === 'string' && (value.endsWith('.') || value === '')) {
            insolationInput.value = value;
            return;
        }

        const intensity = parseFloat(value) / 50;

        // Apply intensity to the currently active light source
        baseLightIntensity = intensity; // Update the base intensity
        pointLight.intensity = intensity;
        fallbackDirectionalLight.intensity = intensity;

        insolationInput.value = value;
        insolationSlider.value = value;
    }
}

function updateStellarRadius(value) {
    if (stellarObject) {
        if (typeof value === 'string' && (value.endsWith('.') || value === '')) {
            stellarRadiusInput.value = value;
            return;
        }
        const newRadius = parseFloat(value);
        const baseRadius = stellarObject.geometry.parameters.radius;
        const scaleFactor = newRadius / baseRadius;
        stellarObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Adjust light intensity based on the star's surface area (proportional to radius squared)
        // We'll use the insolation slider's value as a base multiplier.
        const baseInsolation = parseFloat(insolationInput.value) || 50;
        const insolationIntensity = baseInsolation / 50;
        baseLightIntensity = insolationIntensity * (scaleFactor * scaleFactor);
        pointLight.intensity = baseLightIntensity;

        // Make shadows softer as the star gets bigger to simulate a larger light source
        pointLight.shadow.radius = Math.max(1, scaleFactor * 2);

        // Trigger a full position and camera recalculation
        updatePlanetRadius(radiusInput.value);

        stellarRadiusInput.value = newRadius;
        stellarRadiusSlider.value = newRadius;
    }
}

function updateStellarTemperature(value) {
    if (stellarObject && pointLight) {
        if (typeof value === 'string' && (value.endsWith('.') || value === '')) {
            stellarTempInput.value = value;
            return;
        }
        const temp = parseFloat(value);
        const minTemp = 2000;
        const maxTemp = 30000;
        const midTemp = 6600; // Point where color is roughly white

        // Normalize temperature to a 0-1 range
        const t = (temp - minTemp) / (maxTemp - minTemp);

        // Blue increases with temp, Red decreases
        const r = Math.max(0, 1 - t * 1.2);
        const b = Math.min(1, t * 1.8);
        const g = 1 - Math.abs(t - 0.4) * 1.5; // Green peaks in the middle (yellowish)

        stellarObject.material.emissive.setRGB(r, g, b); // Change the star's core emissive color
        starAtmosphere.material.uniforms.uGlowColor.value.setRGB(r, g, b); // Change the atmosphere's glow color
        // pointLight.color.setRGB(r, g, b); // Keep the light white for better visibility of the planet's texture

        stellarTempInput.value = temp;
        stellarTempSlider.value = temp;
    }
}

function updateOrbitalPeriod(value) {
    if (typeof value === 'string' && (value.endsWith('.') || value === '')) {
        periodInput.value = value;
        return;
    }
    // This function now just syncs the slider and input. The animation loop reads the value directly.
    periodInput.value = value;
    periodSlider.value = value;
}

function toggleStarSystem(isVisible) {
    isRevolutionEnabled = isVisible; // Set the flag first

    // Toggle visibility of stellar controls
    const stellarControls = [
        document.getElementById('stellar-radius-slider').parentElement,
        document.getElementById('stellar-temp-slider').parentElement
    ];
    // Also toggle the orbital period slider with the star system
    const periodControl = document.getElementById('period-slider').parentElement;
    stellarControls.push(periodControl);

    // --- Prevent Sun comparison when star system is active to avoid z-fighting ---
    const sunCompareBtn = document.querySelector('.compare-btn[data-body="sun"]');
    if (sunCompareBtn) {
        sunCompareBtn.disabled = isVisible;
        if (isVisible) {
            sunCompareBtn.title = "Cannot compare with the Sun while in a star system.";
            // If the sun is currently being compared, clear it.
            if (currentComparisonBody === 'sun') {
                showComparison('none');
            }
        } else {
            sunCompareBtn.title = "";
        }
    }

    stellarControls.forEach(control => {
        control.classList.toggle('hidden', !isVisible);
    });

    if (stellarObject) {
        stellarObject.visible = isVisible;
    }
    if (orbitLine) {
        orbitLine.visible = isVisible;
    }
    if (pointLight) {
        pointLight.visible = isVisible;
    }
    if (fallbackDirectionalLight) {
        fallbackDirectionalLight.visible = !isVisible;
    }
    if (ambientLight) {
        ambientLight.visible = !isVisible; // Show ambient light only when star system is hidden
    }

    if (isVisible) {
        // Recalculate positions for all modes (solo or compare)
        // This will correctly place planets in orbit or side-by-side.
        updatePlanetRadius(radiusInput.value);
    } else {
        // When hiding the star system during comparison, center the pair.
        if (comparisonObject) {
            const userPlanetRadius = planet.scale.x * 50;
            const comparisonRadius = comparisonObject.geometry.parameters.radius;
            const halfGap = 30;
            planet.targetPosition.x = -userPlanetRadius - halfGap;
            comparisonObject.targetPosition.x = comparisonRadius + halfGap;
        } 
        else {
            planet.targetPosition.x = 0; // Center the single planet.
        }
        // After repositioning, we must recalculate the camera zoom
        // to fit the objects in their new, star-less arrangement.
        updatePlanetRadius(radiusInput.value);
    }

}

function initializeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const radius = params.get('radius');
    const temp = params.get('temp');
    const insol = params.get('insol');
    const name = params.get('name');
    const stellarRadius = params.get('stellar_radius');
    const stellarTemp = params.get('stellar_temp');
    const period = params.get('period');

    if (radius || temp || insol) {
        // If we have data from the ML model, automatically enable the star system
        const showStarToggle = document.getElementById('show-star-toggle');
        if (showStarToggle) {
            showStarToggle.checked = true;
            toggleStarSystem(true);
        }

        // --- Temperature Handling ---
        const tempInKelvin = parseFloat(temp || 0);
        // Convert Kelvin to Celsius for the internal color/slider logic
        const tempInCelsius = tempInKelvin - 273.15;

        // --- Stellar Radius Handling ---
        // Convert from Solar Radii (from model) to the simulator's internal scale.
        // 1 Solar Radius is ~696,340 km. Earth is ~6,371 km. Sun is ~109x Earth.
        // The simulator's base star radius is 30. Let's use a multiplier.
        const solarRadiusInSimScale = 30 * 109; // Approx. scale of Sun vs Earth in sim
        const stellarRadiusInSim = parseFloat(stellarRadius || 1.0) * solarRadiusInSimScale;

        // Set star properties FIRST, so the planet's orbit can be calculated correctly.
        if (stellarRadius) updateStellarRadius(stellarRadiusInSim);
        if (stellarTemp) updateStellarTemperature(stellarTemp);
        if (period) updateOrbitalPeriod(period);
        if (insol) updateInsolation(insol);
        if (radius) updatePlanetRadius(radius); // This will now correctly calculate orbit based on the new star size.
        if (temp) updatePlanetTemperature(tempInCelsius);

        // Display the original, correct units in the info panel
        const planetName = name || "Predicted Planet";
        document.getElementById('planet-name-header').firstChild.textContent = planetName;
        document.getElementById('info-radius').textContent = `${parseFloat(radius || 0).toFixed(2)} Earth Radii`;
        document.getElementById('info-temp').textContent = `${tempInKelvin.toFixed(2)} K`;
        document.getElementById('info-insol').textContent = `${parseFloat(insol || 0).toFixed(2)} Earth Flux`;
        document.getElementById('info-stellar-temp').textContent = `${stellarTemp} K`;
        document.getElementById('info-stellar-radius').textContent = `${stellarRadius} Solar Radii`;
        document.getElementById('info-period').textContent = `${period} days`;

        if (name) {
            const planetNameInput = document.getElementById('planet-name-input');
            if (planetNameInput) {
                planetNameInput.value = name;
            }
        }

        if (infoPanel) {
            infoPanel.classList.add('visible');
        }

        // Lock the controls since this is a pre-defined planet
        const controlsToLock = [
            radiusSlider, radiusInput,
            tempSlider, tempInput,
            insolationSlider, insolationInput,
            stellarRadiusSlider, stellarRadiusInput,
            stellarTempSlider, stellarTempInput,
            periodSlider, periodInput
        ];
        controlsToLock.forEach(control => {
            if (control) {
                control.disabled = true;
                // Add a tooltip to the parent container to explain why it's locked
                if (control.parentElement.classList.contains('slider-container')) {
                    control.parentElement.title = "Save this planet, then create a 'New Planet' to customize values.";
                }
            }
        });

        updatePlanetInsights(); // Update insights for the loaded planet

    } else {
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
    }
}

function resetToCustomPlanet() {
    // 1. Unlock controls
    const controlsToUnlock = [
        radiusSlider, radiusInput,
        tempSlider, tempInput,
        insolationSlider, insolationInput,
        stellarRadiusSlider, stellarRadiusInput,
        stellarTempSlider, stellarTempInput,
        periodSlider, periodInput
    ];
    controlsToUnlock.forEach(control => {
        if (control) {
            control.disabled = false;
            // Remove the tooltip from the parent container
            if (control.parentElement.classList.contains('slider-container')) {
                control.parentElement.title = "";
            }
        }
    });

    // 2. Reset values to their defaults
    const defaultRadius = 1; // 1 Earth Radius
    const defaultTemp = 0;
    const defaultInsolation = 50;
    const defaultName = "My Custom Planet";
    const defaultStellarRadius = 30;
    const defaultStellarTemp = 5800;
    const defaultPeriod = 365;

    // Reset stellar properties first to ensure correct orbital calculations
    updateStellarRadius(defaultStellarRadius);
    updateStellarTemperature(defaultStellarTemp);
    updateOrbitalPeriod(defaultPeriod);

    // Then reset planet properties
    updatePlanetRadius(defaultRadius);
    updatePlanetTemperature(defaultTemp);
    updateInsolation(defaultInsolation);

    const planetNameInput = document.getElementById('planet-name-input');
    if (planetNameInput) {
        planetNameInput.value = defaultName;
    }

    // 3. Hide info panel and clear any comparisons
    if (infoPanel) {
        infoPanel.classList.remove('visible', 'collapsed');
    }
    showComparison('none'); // This also resets the camera zoom

    // 4. Reset simulation time and controls
    simulatedDays = 0;
    timeScale = 1.0;
    isPaused = false;

    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) {
        speedDisplay.textContent = `x${timeScale}`;
    }
    const pausePlayBtn = document.getElementById('pause-play-btn');
    if (pausePlayBtn) {
        const icon = pausePlayBtn.querySelector('i');
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    }

    updatePlanetInsights(); // Update insights on reset
}

function toggleTopDownView() {
    isTopDownView = !isTopDownView;
    const topDownBtn = document.getElementById('top-down-btn');
    if (topDownBtn) {
        topDownBtn.classList.toggle('active', isTopDownView);
    }

    // When switching views, disable object dragging
    draggedObject = null;

    // Recalculate zoom to ensure it's appropriate for the new view
    updatePlanetRadius(radiusInput.value);
}

function updatePlanetInsights() {
    const radius = parseFloat(radiusInput.value);
    const temp = parseFloat(tempInput.value);

    const habitabilityEl = document.getElementById('insight-habitability');
    const typeEl = document.getElementById('insight-type');
    const summaryEl = document.getElementById('insight-summary');

    // --- Planet Type Logic ---
    let planetType = "Unknown";
    if (radius > 15) {
        planetType = "Gas Giant";
    } else if (radius > 4) {
        planetType = "Ice Giant";
    } else if (radius > 1.75) {
        planetType = "Mini-Neptune";
    } else if (radius > 1.25) {
        planetType = "Super-Earth";
    } else if (radius > 0.5) {
        planetType = "Rocky Planet";
    } else {
        planetType = "Dwarf Planet";
    }
    typeEl.textContent = planetType;

    // --- Habitability Logic ---
    let habitability = "Likely Uninhabitable";
    let summary = "";

    if (planetType === "Gas Giant" || planetType === "Ice Giant") {
        habitability = "Not Habitable";
        summary = "This planet is a gas/ice giant and lacks a solid surface for life as we know it.";
    } else if (temp < -50) {
        habitability = "Too Cold";
        summary = "The surface is likely frozen solid, making liquid water impossible.";
    } else if (temp > 100) {
        habitability = "Too Hot";
        summary = "Surface temperatures are too high for liquid water, which would boil away.";
    } else {
        habitability = "Potentially Habitable";
        summary = "This rocky world exists within the 'Goldilocks Zone' where its temperature could allow for liquid water on its surface—a key ingredient for life.";
    }

    habitabilityEl.textContent = habitability;
    summaryEl.textContent = summary;
}


function animate() {
    requestAnimationFrame(animate);
    let deltaTime = clock.getDelta(); // Time in seconds since last frame

    if (isPaused) {
        deltaTime = 0; // If paused, no time passes
    }

    const scaledDeltaTime = deltaTime * timeScale;
    simulatedDays += scaledDeltaTime; // Accumulate simulated days based on time scale

    // Update the day counter display
    const dayCounterDisplay = document.getElementById('day-counter-display');
    if (dayCounterDisplay) {
        dayCounterDisplay.textContent = `Days Passed: ${Math.floor(simulatedDays)}`;
    }

    if (!isDragging) {
        if (planet) {
            planet.rotation.y += 0.005 * timeScale; // Axial rotation
        }
        if (comparisonObject) {
            comparisonObject.rotation.y += 0.002 * timeScale; // Axial rotation
        }
        if (stellarObject) {
            stellarObject.rotation.y += 0.001 * timeScale; // Slow star surface rotation
        }
        if (starAtmosphere) {
            starAtmosphere.rotation.y += 0.0005 * timeScale; // Slow corona rotation
        }
        if (stellarObject && stellarObject.visible) {
            // Add a pulsing effect to the star's corona and light
            const pulseFactor = 0.05; // How much it pulses
            const pulseSpeed = 1.5; // How fast it pulses
            const pulse = Math.sin(simulatedDays * pulseSpeed) * pulseFactor;

            // Pulse the corona's scale
            const baseCoronaScale = 1.3;
            starAtmosphere.scale.setScalar(baseCoronaScale + pulse);
            pointLight.intensity = baseLightIntensity + (pulse * 5); // Pulse from the base intensity
        }

        if (isRevolutionEnabled) {
            const orbitalPeriod = parseFloat(periodInput.value);
            if (orbitalPeriod > 0 && !isPaused) {
                const angle = (simulatedDays / orbitalPeriod) * 2 * Math.PI;
                
                if (comparisonObject) {
                    // Revolve both planets in opposite directions
                    const orbitalRadius = planet.targetPosition.x; // Use the target X as the stable radius
                    planet.position.x = orbitalRadius * Math.cos(angle);
                    planet.position.z = orbitalRadius * Math.sin(angle);
                    comparisonObject.position.x = -orbitalRadius * Math.cos(angle);
                    comparisonObject.position.z = -orbitalRadius * Math.sin(angle);
                } else {
                    // Revolve the solo planet
                    const orbitalRadius = planet.targetPosition.x; // The target X is our desired orbital radius
                    planet.position.x = orbitalRadius * Math.cos(angle);
                    planet.position.z = orbitalRadius * Math.sin(angle);
                }
            }
        } else if (!isPaused) {
            // When not revolving, smoothly transition to the target position.
            planet.position.lerp(planet.targetPosition, 0.05);
            if (comparisonObject) {
                comparisonObject.position.lerp(comparisonObject.targetPosition, 0.05);
            }
        }
    }

    // Smoothly move the camera to its target position and orientation
    if (isTopDownView) {
        // Animate to top-down position
        const zoomOutFactor = 1.5; // Zoom out further in top-down view
        const topDownTarget = new THREE.Vector3(0, cameraTargetZ * zoomOutFactor, 0.01); // Use Z distance for Y height
        camera.position.lerp(topDownTarget, 0.05);
        camera.lookAt(scene.position);
    } else {
        // Animate to perspective position
        originalCameraPosition.z = cameraTargetZ;
        camera.position.lerp(originalCameraPosition, 0.05);
        camera.lookAt(scene.position); // Ensure camera always looks at the center in perspective view
    }

    renderer.render(scene, camera);
}

function init() {
    randomizePlanet();
    // Create the stellar object (sun)
    const stellarGeometry = new THREE.SphereGeometry(30, 64, 64); // Adjust size as needed
    const sunTexture = textureLoader.load('https://i.imgur.com/zlnvuaI.jpeg'); // Replace with your sun texture link
    const stellarMaterial = new THREE.MeshStandardMaterial({
        map: sunTexture,
        emissive: 0xffffff, // Make it glow
        emissiveMap: sunTexture, // Use the texture for the glow map
        emissiveIntensity: 1.0 // Keep base intensity moderate
    });
    stellarObject = new THREE.Mesh(stellarGeometry, stellarMaterial);
    stellarObject.receiveShadow = false; // The star should not receive shadows
    stellarObject.castShadow = false; // The star itself doesn't need to cast a shadow
    starSystem.add(stellarObject); // Add the sun to the star system

    // Add a prominent atmosphere to the star using the same function as the planets
    starAtmosphere = createAtmosphere(30, new THREE.Color(0xffff00), 1.3); // radius 30, yellow glow, prominent scale
    stellarObject.add(starAtmosphere);

    // Create the orbit path for the main planet
    const orbitRadius = 150;
    const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
    orbitLine = new THREE.Mesh(new THREE.RingGeometry(orbitRadius - 0.5, orbitRadius + 0.5, 128), orbitMaterial);
    orbitLine.rotation.x = Math.PI / 2; // Rotate the ring to be flat on the XZ plane
    starSystem.add(orbitLine);

    // Add a PointLight at the center of the star
    pointLight = new THREE.PointLight(0xffffff, baseLightIntensity, 0, 0); // color, intensity, distance, decay. Decay set to 0 for no falloff.
    pointLight.castShadow = true;
    starSystem.add(pointLight);

    // Add a very dim, global ambient light to ensure the planet is never fully black
    const globalAmbientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(globalAmbientLight);

    // Add a secondary ambient light that is initially hidden
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambientLight.visible = false;
    scene.add(ambientLight);

    // Add a fallback directional light that is also initially hidden
    fallbackDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fallbackDirectionalLight.position.set(50, 50, 50);
    fallbackDirectionalLight.visible = false;
    scene.add(fallbackDirectionalLight);

    planet.targetPosition.set(150, 0, 0); // Set initial orbital radius for the main planet
    planet.position.copy(planet.targetPosition); // Set initial position without animation
    createStarfield();

    if (radiusSlider && radiusInput) {
        radiusSlider.addEventListener('input', (event) => updatePlanetRadius(event.target.valueAsNumber));
        radiusInput.addEventListener('input', (event) => updatePlanetRadius(event.target.value)); // Pass string to handle decimals
    }
    if (tempSlider && tempInput) {
        tempSlider.addEventListener('input', (event) => updatePlanetTemperature(event.target.valueAsNumber));
        tempInput.addEventListener('input', (event) => updatePlanetTemperature(event.target.value)); // Pass string
    }
    if (insolationSlider && insolationInput) {
        insolationSlider.addEventListener('input', (event) => updateInsolation(event.target.valueAsNumber));
        insolationInput.addEventListener('input', (event) => updateInsolation(event.target.value)); // Pass string
    }

    if (stellarRadiusSlider && stellarRadiusInput) {
        stellarRadiusSlider.addEventListener('input', (event) => updateStellarRadius(event.target.valueAsNumber));
        stellarRadiusInput.addEventListener('input', (event) => updateStellarRadius(event.target.value));
    }
    if (stellarTempSlider && stellarTempInput) {
        stellarTempSlider.addEventListener('input', (event) => updateStellarTemperature(event.target.valueAsNumber));
        stellarTempInput.addEventListener('input', (event) => updateStellarTemperature(event.target.value));
    }

    if (periodSlider && periodInput) {
        periodSlider.addEventListener('input', (event) => updateOrbitalPeriod(event.target.valueAsNumber));
        periodInput.addEventListener('input', (event) => updateOrbitalPeriod(event.target.value));
    }

    const showStarToggle = document.getElementById('show-star-toggle');
    if (showStarToggle) {
        showStarToggle.addEventListener('change', (event) => toggleStarSystem(event.target.checked));
        toggleStarSystem(showStarToggle.checked); // Set initial state on load
    }

    const randomizeButton = document.getElementById('randomize-btn');
    if (randomizeButton) {
        randomizeButton.addEventListener('click', randomizePlanet);
    }

    const newPlanetButton = document.getElementById('new-planet-btn');
    if (newPlanetButton) {
        newPlanetButton.addEventListener('click', resetToCustomPlanet);
    }

    const storePlanetButton = document.getElementById('store-planet-btn');
    if (storePlanetButton) {
        storePlanetButton.addEventListener('click', storeCustomPlanet);
    }

    const compareButtons = document.querySelectorAll('.compare-btn');
    compareButtons.forEach(button => {
        button.addEventListener('click', () => showComparison(button.dataset.body));
    });

    // --- Time Controls ---
    const slowDownBtn = document.getElementById('slow-down-btn');
    const pausePlayBtn = document.getElementById('pause-play-btn');
    const fastForwardBtn = document.getElementById('fast-forward-btn');
    const speedDisplay = document.getElementById('speed-display');

    if (slowDownBtn) {
        slowDownBtn.addEventListener('click', () => {
            timeScale = Math.max(0.25, timeScale / 2); // Slow down, with a minimum speed
            speedDisplay.textContent = `x${timeScale}`;
        });
    }

    if (fastForwardBtn) {
        fastForwardBtn.addEventListener('click', () => {
            timeScale = Math.min(16, timeScale * 2); // Speed up, with a maximum of x16
            speedDisplay.textContent = `x${timeScale}`;
        });
    }

    if (pausePlayBtn) {
        pausePlayBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            const icon = pausePlayBtn.querySelector('i');
            if (isPaused) {
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-play');
                // When pausing, reset timeScale to 1 but keep the display
                // This makes resuming feel natural.
            } else {
                icon.classList.remove('fa-play');
                icon.classList.add('fa-pause');
            }
            // If we unpause and the speed was something else, it resumes at that speed.
            if (!isPaused && timeScale === 0) {
                timeScale = 1.0; // Resume at normal speed if it was fully stopped
            }
        });
    }

    // --- Camera Controls ---
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const topDownBtn = document.getElementById('top-down-btn');

    if (topDownBtn) {
        topDownBtn.addEventListener('click', toggleTopDownView);
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            cameraTargetZ *= 0.8; // Zoom in by 20%
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            cameraTargetZ *= 1.2; // Zoom out by 20%
        });
    }
    initializeFromURL();
    updatePlanetInsights(); // Initial calculation on page load
    animate();
}

function setupEventListeners() {
    const toggleButton = document.getElementById('toggle-info-panel');
    if (toggleButton && infoPanel) {
        toggleButton.addEventListener('click', () => {
            infoPanel.classList.toggle('collapsed');
        });
    }
}

function onWindowResize() {
    if (container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

window.addEventListener('resize', onWindowResize);
setupEventListeners();
init();