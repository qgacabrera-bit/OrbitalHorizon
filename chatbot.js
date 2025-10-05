// --- Chatbot Logic ---
const chatbotResponses = {
    // Core Project Concepts
    "exoplanet": "An exoplanet is simply a planet that orbits a star outside of our solar system. The discovery of these distant worlds is a huge field in astronomy.",
    "find exoplanets": "We use machine learning models trained on publicly available datasets from NASA. These models are designed to automatically analyze transit data and identify potential exoplanets, which is a lot faster than manual analysis.",
    "work": "We use machine learning models trained on publicly available datasets from NASA. These models are designed to automatically analyze transit data and identify potential exoplanets, which is a lot faster than manual analysis.",
    "transit method": "The transit method is how many exoplanets are discovered. It involves observing a star's light for a slight, periodic dip in brightness. This dip suggests that a planet is passing in front of the star, or 'transiting.'",

    // Datasets and Missions
    "kepler and tess": "Both are NASA satellites that use the transit method to find exoplanets. Kepler focused on a single region of the sky for a long period, while TESS is designed to survey nearly the entire sky by observing brighter, closer stars.",
    "kepler": "Kepler was a NASA satellite that focused on a single region of the sky to find exoplanets.",
    "tess": "TESS is a NASA satellite that surveys nearly the entire sky by observing brighter, closer stars to find exoplanets.",
    "data do you use": "We use open-source datasets from NASA missions like Kepler, K2, and TESS. This data includes confirmed exoplanets, planetary candidates, and false positives, along with variables like orbital period and planetary radius.",
    "data publicly available": "Yes, all the data we use is publicly available through NASA. We've just applied machine learning to analyze it in a new way.",

    // Machine Learning & Research
    "automated classification": "Manual analysis of exoplanet data is incredibly time-consuming. Automated classification allows us to process vast amounts of data quickly and efficiently, which could lead to the discovery of many new exoplanets that might otherwise be missed.",
    "accuracy": "Promising research studies have shown that machine learning models can achieve high-accuracy results in identifying exoplanets. Our goal is to build on that research and provide a reliable tool for classification.",
    "discover new exoplanets": "By automatically analyzing vast amounts of data that hasn't been fully studied yet, our project has the potential to uncover new exoplanets hiding within the datasets from satellites like Kepler and TESS.",

    // Specific Terminology
    "planetary candidate": "A planetary candidate is a potential exoplanet identified through data analysis that has yet to be officially confirmed by other methods.",
    "false positive": "A false positive is a signal in the data that initially looks like an exoplanet transit but is later determined to be caused by something else, like a background star or instrumental noise.",

    // Navigation and Help
    "demonstration": "Yes, absolutely! The interactive simulator on our homepage visualizes some of the planets we've identified, allowing you to see their characteristics in 3D.",
    "learn more": "You can check out the Resources tab on our website for links to the NASA datasets and research papers that inspired this project.",
    "resources": "You can check out the Resources tab on our website for links to the NASA datasets and research papers that inspired this project.",

    // General conversation starters
    "how are you": "I'm doing great, thanks for asking! I'm here to help you learn about Orbital Horizon and the fascinating world of exoplanets.",
    "orbital horizon": "Orbital Horizon is a project that uses machine learning to identify exoplanets from large NASA datasets. Our goal is to make this data more accessible and to help uncover new planets hidden within the data from missions like Kepler and TESS.",
    "project about": "Orbital Horizon is a project that uses machine learning to identify exoplanets from large NASA datasets. Our goal is to make this data more accessible and to help uncover new planets hidden within the data from missions like Kepler and TESS.",
    "hi": "Hello there! I'm Astra, your guide to Orbital Horizon. How can I assist you?",
    "hello": "Hello there! I'm Astra, your guide to Orbital Horizon. How can I assist you?",
    "hey": "Hey! It's great to see you. What can I help you with today?",
    "you're welcome": "You're most welcome! Is there anything else I can assist you with?",
    "thank you": "You're most welcome! Is there anything else I can assist you with?",
    "are you single": "As an AI, I don't have personal relationships, but I'm always here to help you explore the cosmos! 😉",
    "what do you do": "I'm a chatbot designed to answer your questions about the Orbital Horizon project and exoplanet discovery. Think of me as your personal guide.",
    "who are you": "I am Astra, the AI assistant for Orbital Horizon. My purpose is to help you navigate our project and learn about the cosmos.",
    "what is your name": "My name is Astra, and I'm here to help you explore the vast universe of exoplanets.",
    "what is": "That's a great question! What specifically would you like to know more about?",

    // --- New questions added ---
    "how to use simulator": "You can visit the Interactive Simulator page and follow the on-screen instructions to explore different exoplanets.",
    "can i contribute": "Currently, the project is research-based, but you can explore our Resources section to access the datasets we used.",
    "future plans": "We plan to expand the project to analyze more datasets and improve the machine learning model's accuracy.",
    "contact": "For inquiries, you can reach out to our team via the Contact section on the website.",
    "learning resources": "Check the Resources tab on our site for tutorials, datasets, and research papers related to exoplanet discovery."
};

const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const questionButtonsContainer = document.getElementById('question-buttons-container');
const chatbotIcon = document.querySelector('.chatbot-icon');
const closeChatBtn = document.querySelector('.close-btn');

let chatOpen = false;

const randomFacts = [
    "Saturn’s rings are made mostly of ice particles.",
    "Mars has the largest volcano in the solar system called Olympus Mons.",
    "The Moon is drifting away from Earth at about 3.8 cm per year.",
    "Jupiter has 79 known moons.",
    "Venus rotates in the opposite direction to most planets.",
    "A day on Venus is longer than a year on Venus.",
    "Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tons on Earth.",
    "There are more stars in the universe than grains of sand on all the Earth’s beaches.",
    "Mercury has a very thin atmosphere, causing extreme temperature variations between day and night.",
    "Pluto has five known moons, the largest being Charon.",
    "The Sun accounts for about 99.86% of the total mass of our solar system.",
    "Black holes warp space and time so much that even light cannot escape them.",
    "A year on Mercury is just 88 Earth days long.",
    "Titan, Saturn’s largest moon, has lakes of liquid methane and ethane.",
    "The Great Red Spot on Jupiter is a giant storm that has lasted for over 300 years.",
    "Uranus rotates on its side compared to other planets.",
    "The Sun’s surface temperature is around 5,500°C (9,932°F).",
    "Comets are often described as 'dirty snowballs' made of ice and dust.",
    "The Milky Way galaxy contains around 100-400 billion stars.",
    "Neptune has the fastest winds in the solar system, reaching up to 2,100 km/h (1,300 mph).",
    "Some exoplanets orbit two stars, like the fictional planet Tatooine in Star Wars.",
    "Earth is the only planet in the solar system with liquid water on its surface.",
    "A light-year is the distance that light travels in one year, about 9.46 trillion kilometers.",
    "The first human-made object to leave the solar system was Voyager 1.",
    "Solar flares are sudden bursts of energy from the Sun that can disrupt satellites on Earth.",
    "The largest asteroid in the solar system is Ceres, which is also classified as a dwarf planet.",
    "The Sun will eventually become a red giant and then shrink into a white dwarf.",
    "Halley's Comet is visible from Earth approximately every 76 years.",
    "The closest star system to Earth is Alpha Centauri, about 4.37 light-years away.",
    "Saturn is the least dense planet; it would float in water if you could find a bathtub big enough.",
    "The Hubble Space Telescope has provided some of the most detailed images of distant galaxies.",
    "A supernova is the explosion of a star at the end of its life cycle.",
    "The Kuiper Belt is a region beyond Neptune filled with icy bodies and dwarf planets.",
    "Pluto was reclassified from a planet to a dwarf planet in 2006.",
    "The Sun’s core temperature reaches about 15 million degrees Celsius.",
    "Venus has no moons, while Mars has two small moons, Phobos and Deimos.",
    "The Moon always shows the same face to Earth due to tidal locking.",
    "The Andromeda galaxy is on a collision course with the Milky Way, expected in about 4 billion years.",
    "Some stars are so large that if placed in the center of our solar system, they would engulf Mercury, Venus, Earth, and Mars.",
    "The coldest place in the universe is the Boomerang Nebula, at −272°C (1 K).",
    "Astronomers estimate there may be over 100 billion galaxies in the observable universe.",
    "Jupiter’s magnetic field is 14 times stronger than Earth’s.",
    "The Sun emits energy as electromagnetic radiation, including visible light, ultraviolet, and infrared.",
    "Cosmic microwave background radiation is the afterglow of the Big Bang.",
    "Some planets, called 'hot Jupiters,' orbit very close to their stars, making them extremely hot.",
    "The largest known star is UY Scuti, about 1,700 times the radius of the Sun.",
    "The first exoplanet around a Sun-like star was discovered in 1995.",
    "Neutron stars can rotate hundreds of times per second, appearing as pulsars.",
    "The universe is approximately 13.8 billion years old.",
    "Some moons, like Europa, may have subsurface oceans capable of supporting life.",
    "Gravity is stronger on Jupiter than on Earth, about 2.5 times stronger.",
    "The observable universe is about 93 billion light-years in diameter."
];

// --- Predefined clickable questions ---
const mainQuestions = [
    "What is the project about?",
    "What is an exoplanet?",
    "How do you find exoplanets?",
    "What data do you use?",
    "What is the transit method?",
    "What are Kepler and TESS?",
    "How to use the simulator?",
    "What is a false positive?"
];


function toggleChat() {
    chatWindow.classList.toggle('open');
    
    if (!chatOpen) {
        chatbotIcon.classList.toggle('no-pulse');
        chatOpen = true;

        // Show the clickable main questions when the chat opens
        showMainQuestions();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage(message = null) {
    const userMessage = message || chatInput.value.trim();
    if (userMessage === '') return;

    appendMessage(userMessage, 'user-message');
    chatInput.value = '';

    showTypingIndicator();

    const botResponse = getBotResponse(userMessage);
    setTimeout(() => {
        hideTypingIndicator();
        appendMessage(botResponse, 'bot-message');

        // After answering, show remaining questions + random facts
        showMainQuestions();
    }, 500);
}

// Append message to chat
function appendMessage(message, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(className);
    messageElement.innerText = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    // Use bot-message class for alignment and styling, plus a specific class
    typingIndicator.classList.add('bot-message', 'typing-indicator');
    typingIndicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}
// Show remaining questions + random facts button
function showMainQuestions() {
    // Clear previous buttons
    questionButtonsContainer.innerHTML = '';

    // --- Randomly select up to 3 main questions ---
    const shuffled = [...mainQuestions].sort(() => 0.5 - Math.random());
    const questionsToShow = shuffled.slice(0, 3);

    questionsToShow.forEach(q => {
        const button = document.createElement('button');
        button.classList.add('chat-question-btn');
        button.innerText = q;
        button.addEventListener('click', () => {
            // Send the message but don't remove the question from the main list
            sendMessage(q);
        });
        questionButtonsContainer.appendChild(button);
    });

    // --- Random Facts Button (always show, no repeats) ---
    const factsButton = document.createElement('button');
    factsButton.classList.add('chat-question-btn');
    factsButton.innerText = "Random Facts 🌠";

    factsButton.addEventListener('click', () => {
        if (remainingFacts.length === 0) {
            // Reset and reshuffle when all facts have been used
            remainingFacts = [...randomFacts];
            shuffleArray(remainingFacts);
        }
        const fact = remainingFacts.pop(); // take one fact
        appendMessage("Did you know? " + fact, 'bot-message');
        showMainQuestions(); // Redisplay remaining questions + random facts
    });

    questionButtonsContainer.appendChild(factsButton);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Random Facts tracking (no repeats) ---
let remainingFacts = [...randomFacts];
shuffleArray(remainingFacts);

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}