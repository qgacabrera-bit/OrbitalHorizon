// --- Loading Screen Logic ---
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) { 
        loadingScreen.classList.add('loading-screen--hidden');
    }
});

// --- Website Navigation Logic ---
const sideNavElement = document.querySelector('nav.side-nav');

if (sideNavElement) {
    const sections = document.querySelectorAll('main [id]');
    const navLinks = document.querySelectorAll('.side-nav .nav-link');

    function updateActiveSection() {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            // Highlight when the top of the section is near the top of the viewport.
            if (scrollY >= sectionTop - 150 && scrollY < sectionTop + sectionHeight - 150) {
                current = section.getAttribute('id');
            }
        });
        // If scrolled to the very bottom of the page, ensure the last section is active.
        // A 5px buffer accounts for browser inconsistencies.
        const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 5;
        if (isAtBottom) current = 'methodology';

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveSection);
    updateActiveSection();
}

// --- Hide/Show Top Nav on Scroll ---
const topNav = document.querySelector('.top-nav');
const sideNav = document.querySelector('.side-nav');
const heroSection = document.querySelector('.hero-section');
const chatbotContainer = document.querySelector('.chatbot-container');
const planetNavNext = document.getElementById('nav-next-btn');
const planetNavBack = document.getElementById('nav-back-btn');

let hasWelcomed = false; // Flag to ensure welcome happens only once

// This logic should only apply to the homepage which has a hero section.
if (heroSection) {
    const aboutSection = document.getElementById('about');
    function toggleNavOnScroll() {
        // Determine the point at which to show the navigation, relative to the 'about' section.
        const navTriggerPoint = aboutSection ? aboutSection.offsetTop + 400 : window.innerHeight;
        const showMainNavigation = window.pageYOffset > navTriggerPoint;

        topNav.classList.toggle('top-nav--visible', showMainNavigation);
        if (sideNav) sideNav.classList.toggle('side-nav--visible', showMainNavigation);
        if (planetNavNext) planetNavNext.classList.toggle('planet-nav-btn--visible', showMainNavigation);
        if (planetNavBack) planetNavBack.classList.toggle('planet-nav-btn--visible', showMainNavigation);

        const showChatbot = window.pageYOffset > window.innerHeight * 0.5;
        if (chatbotContainer) {
            const isVisible = chatbotContainer.classList.contains('chatbot-container--visible');
            if (showChatbot && !isVisible) {
                chatbotContainer.classList.add('chatbot-container--visible');
                if (!hasWelcomed) {
                    showWelcomeBubble();
                    hasWelcomed = true;
                }
            } else if (!showChatbot && isVisible) {
                chatbotContainer.classList.remove('chatbot-container--visible');
            }
        }
    }

    window.addEventListener('scroll', toggleNavOnScroll);
} else if (topNav) { 
    // --- Logic for all other pages ---
    let lastScrollTop = 0;

    setTimeout(() => {
        topNav.classList.add('top-nav--visible');
        if (chatbotContainer) {
            chatbotContainer.classList.add('chatbot-container--visible');
        }
        if (sideNav) { 
            sideNav.classList.add('side-nav--visible');
        }
    }, 100); // Small delay to allow CSS transition

    // Hide on scroll down, show on scroll up
    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        // Only apply hide/show if scrolled past a certain point (e.g., 100px)
        if (scrollTop > 100) {
            if (scrollTop > lastScrollTop) {
                topNav.classList.remove('top-nav--visible');
            } else {
                topNav.classList.add('top-nav--visible');
            }
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);
} 

function showWelcomeBubble() {
    const bubble = document.getElementById('chatbot-welcome-bubble');
    if (!bubble) return;

    bubble.classList.add('visible');

    setTimeout(() => {
        bubble.classList.remove('visible');
    }, 8000);
}
// --- Fade-in sections on scroll ---
const sectionsToFade = document.querySelectorAll('.fade-in-section');

const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% of the section is visible
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

sectionsToFade.forEach(section => {
    observer.observe(section);
});

// --- Animate Logo on Scroll ---
const logoContainer = document.querySelector('.logo-container');
if (heroSection && logoContainer) {
    function animateLogo() {
        if (window.pageYOffset > 50) {
            logoContainer.classList.add('logo-container--scrolled');
        } else {
            logoContainer.classList.remove('logo-container--scrolled');
        }
    }

    window.addEventListener('scroll', animateLogo);
} else if (logoContainer) {
    // For any other page, add the 'scrolled' class after a short delay.
    setTimeout(() => {
        logoContainer.classList.add('logo-container--scrolled');
    }, 100);
}

// --- Methodology Navigator Logic ---
const methodologyContainer = document.querySelector('.methodology-container');
const steps = document.querySelectorAll('.methodology-step');
const prevBtn = document.getElementById('methodology-prev-btn');
const nextBtn = document.getElementById('methodology-next-btn');
const navDotsContainer = document.getElementById('methodology-nav-dots');
const totalSteps = steps.length;
let currentStep = 0;

// Create navigation dots
for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement('button');
    dot.classList.add('methodology-nav-dot');
    dot.setAttribute('aria-label', `Go to step ${i + 1}`);
    dot.addEventListener('click', () => {
        currentStep = i;
        updateMethodologyView();
    });
    navDotsContainer.appendChild(dot);
}

const dots = navDotsContainer.querySelectorAll('.methodology-nav-dot');

function updateMethodologyView() {
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
        step.classList.toggle('hidden', index !== currentStep);
    });
    // Resize container to fit active step
    requestAnimationFrame(() => {
        const activeStep = steps[currentStep];
        methodologyContainer.style.height = activeStep.offsetHeight + 'px';
    });

    // Update dots
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentStep);
    });

    // Update button states
    prevBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === totalSteps - 1;
}

nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        updateMethodologyView();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        updateMethodologyView();
    }
});

updateMethodologyView();

const stepImages = document.querySelectorAll('.methodology-step-images img');
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const closeModal = document.getElementById('close-modal');
// Function to open modal with clicked image
stepImages.forEach(img => {
    img.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modalImg.src = img.src;
        modalImg.alt = img.alt;
    });
});

closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});

modal.addEventListener('click', e => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});