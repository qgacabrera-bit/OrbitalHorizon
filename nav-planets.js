// --- Interactive Planet Navigation for index.html ---

const navContainer = document.getElementById('planet-nav-container');

if (navContainer) {
    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, navContainer.clientWidth / navContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(navContainer.clientWidth, navContainer.clientHeight);
    renderer.setClearColor(0x000000, 0);
    navContainer.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Reduced ambient light for darker shadows
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8); // Slightly reduced point light intensity
    pointLight.position.set(-50, -50, 0); // Moved light to the lower-left
    scene.add(pointLight);

    // --- Starfield Creation ---
    let starfield;

    function createStarfield() {
        const starCount = 5000;
        const starGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            // Distribute stars within a large sphere to avoid a "box" look
            const vertex = new THREE.Vector3();
            vertex.set(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            vertex.multiplyScalar(Math.random() * 500 + 100); // Radius from 100 to 600
            positions.set([vertex.x, vertex.y, vertex.z], i3);
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
        starfield = new THREE.Points(starGeometry, starMaterial);
        scene.add(starfield);
    }

    createStarfield();

    camera.position.z = 60; // Pull camera back to compensate for the narrower FOV

    // 3. Define the layout positions and scales for the planets
    const desktopLayout = [
        { position: new THREE.Vector3(-40, 0, -25), scale: 5.5 }, // Far-left
        { position: new THREE.Vector3(-26, 0, -15), scale: 7.0 }, // Mid-left
        { position: new THREE.Vector3(0, 0, 0),     scale: 8.5 }, // Center
        { position: new THREE.Vector3(26, 0, -15),  scale: 7.0 }, // Mid-right
        { position: new THREE.Vector3(40, 0, -25),  scale: 5.5 }  // Far-right
    ];

    const mobileLayout = [
        { position: new THREE.Vector3(-25, 0, -20), scale: 2.5 }, // Far-left
        { position: new THREE.Vector3(-15, 0, -10), scale: 3.5 }, // Mid-left
        { position: new THREE.Vector3(0, 0, 0),     scale: 4.5 }, // Center
        { position: new THREE.Vector3(15, 0, -10),  scale: 3.5 }, // Mid-right
        { position: new THREE.Vector3(25, 0, -20),  scale: 2.5 }  // Far-right
    ];

    let currentLayout = window.innerWidth <= 768 ? mobileLayout : desktopLayout;

    // Planet Data (Texture, Link) - Positions will be assigned dynamically
    const planetsData = [
        { name: 'AI Workbench', description: 'Upload datasets, train models, and discover new exoplanets using our machine learning tools.', texture: 'https://i.imgur.com/jxuq7Wj.jpeg', link: 'data-processing.html' },
        { name: 'Demo', description: 'View a gallery of project visuals and a video demonstration.', texture: 'https://i.imgur.com/v9vKt4T.jpeg', link: '#demo' },
        { name: 'About', description: 'Learn about the project, its goals, and the science of exoplanet discovery.', texture: 'https://i.imgur.com/nVEgUBd.jpeg', link: '#about' },
        { name: 'Simulator', description: 'Create and explore your own custom planets in our interactive 3D simulator.', texture: 'https://i.imgur.com/pp6V4rC.jpeg', link: 'planet.html' },
        { name: 'Team', description: 'Meet the dedicated team behind the Orbital Horizon project.', texture: 'https://i.imgur.com/I4PhNbE.jpeg', link: 'team.html' },
    ];

    const textureLoader = new THREE.TextureLoader();
    const planets = []; // To hold our planet meshes for raycasting and animation

    // 4. Planet Creation Loop
    planetsData.forEach(data => {
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshStandardMaterial({ // Using MeshStandardMaterial for better lighting
            map: textureLoader.load(data.texture)
        });
        const planet = new THREE.Mesh(geometry, material);

        planet.userData.link = data.link; // Store the link in the object's user data
        planet.userData.name = data.name; // Store name for easier lookup
        // Add target properties for animation
        planet.targetPosition = new THREE.Vector3();
        planet.targetScale = new THREE.Vector3();

        scene.add(planet);
        planets.push(planet);
    });

    // 5. Raycasting for Clicks and Hovers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredPlanet = null;

    function onMouseMove(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planets);

        // Reset previous hover effect
        if (hoveredPlanet && !intersects.find(i => i.object === hoveredPlanet)) {
            document.body.style.cursor = 'default';
            // The scale will now animate back to its original size in the animate() loop
            hoveredPlanet = null;
        }

        if (intersects.length > 0) {
            const firstIntersect = intersects[0].object;
            if (hoveredPlanet !== firstIntersect) {
                document.body.style.cursor = 'pointer';
                // The hover scale-up is now handled in the animate() loop for a smoother effect
                hoveredPlanet = firstIntersect;
            }
        }
    }

    function onClick(event) {
        // We can reuse the raycaster from the mouse move
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planets);

        if (intersects.length > 0 && intersects[0].object === planets[currentFocusIndex]) {
            const clickedPlanet = intersects[0].object;
            if (clickedPlanet.userData.link) {
                window.location.href = clickedPlanet.userData.link;
            }
        } else if (hoveredPlanet) {
            // If a non-central planet is clicked, make it the focus
            const clickedIndex = planets.indexOf(hoveredPlanet);
            if (clickedIndex !== -1) {
                setFocus(clickedIndex);
            }
        }
    }

    // --- New Navigation Logic ---
    let currentFocusIndex = 2; // Start with 'About' page in focus (now at index 2)
    const planetLabel = document.getElementById('planet-label');
    const planetDescription = document.getElementById('planet-description');

    function setFocus(newIndex) {
        currentFocusIndex = newIndex;
        const numPlanets = planets.length;

        for (let i = 0; i < numPlanets; i++) {
            const planet = planets[i];
            // Calculate the layout slot for this planet
            const offset = i - currentFocusIndex;
            const layoutIndex = (2 + offset + numPlanets) % numPlanets; // 2 is the center slot

            const targetLayout = currentLayout[layoutIndex];
            planet.targetPosition.copy(targetLayout.position);
            planet.targetScale.set(targetLayout.scale, targetLayout.scale, targetLayout.scale);
        }

        // Update the planet label with a fade effect
        if (planetLabel) {
            const { name, description } = planetsData[newIndex];
            
            // Fade out
            planetLabel.classList.remove('visible');
            planetDescription.classList.remove('visible');

            // Wait for fade out, then update text and fade in
            setTimeout(() => {
                planetLabel.textContent = name;
                planetDescription.textContent = description;
                planetLabel.classList.add('visible');
                planetDescription.classList.add('visible');
            }, 250); // Should be about half the CSS transition duration
        }
    }

    // Button event listeners
    const nextBtn = document.getElementById('nav-next-btn');
    const backBtn = document.getElementById('nav-back-btn');

    if (nextBtn && backBtn) {
        nextBtn.addEventListener('click', () => {
            const newIndex = (currentFocusIndex + 1) % planets.length;
            setFocus(newIndex);
        });

        backBtn.addEventListener('click', () => {
            const newIndex = (currentFocusIndex - 1 + planets.length) % planets.length;
            setFocus(newIndex);
        });
    }

    // Initial setup
    setFocus(currentFocusIndex);
    // Set initial positions without animation
    planets.forEach(p => {
        p.position.copy(p.targetPosition);
        p.scale.copy(p.targetScale);
    });

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    let time = 0; // Time variable for the floating animation

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        time += 0.02; // Increment time for the sine wave

        // Animate each planet
        planets.forEach((planet, index) => {
            planet.rotation.y += 0.001 + (index * 0.0005); // Vary rotation speed (slowed down)

            // Add a floating animation to the focused planet
            if (index === currentFocusIndex) {
                const floatAmplitude = 0.5; // Controls how high/low it floats (increased)
                // Smoothly interpolate towards the floating y position
                const targetY = planet.targetPosition.y + Math.sin(time) * floatAmplitude;
                planet.position.y += (targetY - planet.position.y) * 0.05;
            } else {
                // For non-focused planets, just lerp the y position normally
                planet.position.y += (planet.targetPosition.y - planet.position.y) * 0.05;
            }

            planet.position.x += (planet.targetPosition.x - planet.position.x) * 0.05;
            planet.position.z += (planet.targetPosition.z - planet.position.z) * 0.05;
            planet.scale.lerp(planet.targetScale, 0.1);
        });

        // Animate the starfield
        if (starfield) {
            starfield.rotation.y += 0.0001;
            
        }

        renderer.render(scene, camera);
    }

    animate();

    // 7. Responsive Resizing
    window.addEventListener('resize', () => {
        if (navContainer) {
            camera.aspect = navContainer.clientWidth / navContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(navContainer.clientWidth, navContainer.clientHeight);
            currentLayout = window.innerWidth <= 768 ? mobileLayout : desktopLayout;
        }
    });
}