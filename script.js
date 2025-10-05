// --- Loading Screen Logic ---
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) { 
        // Add a class to trigger the fade-out animation
        loadingScreen.classList.add('loading-screen--hidden');
    }
});

// --- Website Navigation Logic (for index.html) ---
const sideNavElement = document.querySelector('nav.side-nav');

if (sideNavElement) {
    const sections = document.querySelectorAll('main [id]');
    // On mobile, only the top-nav is visible. On desktop, both are.
    const navLinks = document.querySelectorAll('.side-nav .nav-link');

    function updateActiveSection() {
        let current = '';
        const scrollPosition = window.pageYOffset + window.innerHeight / 1.5;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const sectionBottom = sectionTop + sectionHeight;

            // Check if the scroll position is within the section's bounds
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                current = section.getAttribute('id');
            }
        });

        // If no section is in view, optionally set a default or keep the last active
        if (!current && sections.length > 0) {
            const lastSection = sections[sections.length - 1];
            if (scrollPosition >= lastSection.offsetTop) {
                current = lastSection.getAttribute('id'); // Handle case where scrolled past last section
            }
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveSection);
    // Run initially to set active section on page load
    updateActiveSection();
}

// --- Hide/Show Top Nav on Scroll ---
const topNav = document.querySelector('.top-nav');
const sideNav = document.querySelector('.side-nav');
const heroSection = document.querySelector('.hero-section');
const chatbotContainer = document.querySelector('.chatbot-container');
const planetNavNext = document.getElementById('nav-next-btn');
const planetNavBack = document.getElementById('nav-back-btn');

// This logic should only apply to the homepage which has a hero section.
if (heroSection) {
    function toggleNavOnScroll() {
        // Use window.innerHeight as it's equivalent to 100vh
        const shouldBeVisible = window.pageYOffset > window.innerHeight * 0.95;

        if (shouldBeVisible) { // Show nav just before hero is fully gone
            topNav.classList.add('top-nav--visible');
            if (sideNav) sideNav.classList.add('side-nav--visible');
            chatbotContainer.classList.add('chatbot-container--visible');
            if (planetNavNext) planetNavNext.classList.add('planet-nav-btn--visible');
            if (planetNavBack) planetNavBack.classList.add('planet-nav-btn--visible');
        } else {
            topNav.classList.remove('top-nav--visible');
            if (sideNav) sideNav.classList.remove('side-nav--visible');
            chatbotContainer.classList.remove('chatbot-container--visible');
            if (planetNavNext) planetNavNext.classList.remove('planet-nav-btn--visible');
            if (planetNavBack) planetNavBack.classList.remove('planet-nav-btn--visible');
        }
    }

    window.addEventListener('scroll', toggleNavOnScroll);
} else if (topNav) { // --- Logic for all other pages ---
    let lastScrollTop = 0;

    // Fade in the nav bar and other elements on page load
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
                // Scrolling Down
                topNav.classList.remove('top-nav--visible');
            } else {
                // Scrolling Up
                topNav.classList.add('top-nav--visible');
            }
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
    }, false);
} 

// --- Fade-in sections on scroll ---
const sectionsToFade = document.querySelectorAll('.fade-in-section');

const observerOptions = {
    root: null, // relative to the viewport
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
        // Add the scrolled class after scrolling a small amount (e.g., 50px)
        if (window.pageYOffset > 50) {
            logoContainer.classList.add('logo-container--scrolled');
        } else {
            logoContainer.classList.remove('logo-container--scrolled');
        }
    }

    window.addEventListener('scroll', animateLogo);
} else if (logoContainer) {
    // For any other page, add the 'scrolled' class after a short delay.
    // This allows the CSS transition for opacity to trigger, creating a fade-in effect.
    setTimeout(() => {
        logoContainer.classList.add('logo-container--scrolled');
    }, 100); // 100ms delay
}

// --- Methodology Navigator Logic ---
const methodologyContainer = document.querySelector('.methodology-container');
const steps = document.querySelectorAll('.methodology-step'); // each step
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
    // Show only the current step
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

// Button events
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

// Initialize first step
updateMethodologyView();

// Select all images in methodology steps
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

// Close modal when clicking the X
closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Optional: close modal when clicking outside the image
modal.addEventListener('click', e => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});