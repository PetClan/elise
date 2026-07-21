// ========================================
// PUBLIC PAGE - MAIN.JS
// ========================================

// ============================================================
// REVIEWS — edit this list to update what's shown on the page.
// To ADD a review:    copy a line and change the text.
// To REMOVE a review: delete its line.
// Keep each line in the format:  { text: "...", author: "..." },
// Don't put quote marks inside text — they're added automatically.
// ============================================================
const reviews = [
    { text: "Residents were treated to a fabulous afternoon of ABBA classics with the amazing Elise, who had everyone singing, dancing in their seats and soaking up every minute of the music", author: "Activities Coordinator, Carrondale Care Home" },
    { text: "Omg elise you are absolutely outstanding and have an unbelievable future ahead! ", author: "Activities Coordinator, Milngavie Manor Care Home" },
    { text: "I'm very grateful to Elise for the fantastic show she performed from my mum's 80th Birthday. Her voice is beautiful and her choice of songs were perfect. It was a joyous afternoon for all. Highly recommended!", author: "Susan" }
];

document.addEventListener('DOMContentLoaded', function () {
    const reviewsGrid = document.getElementById('reviewsGrid');
    if (reviewsGrid) {
        reviewsGrid.innerHTML = reviews.map(function (review) {
            return '<article class="review-card">' +
                '<p class="review-text">"' + review.text + '"</p>' +
                '<p class="review-author">— ' + review.author + '</p>' +
                '</article>';
        }).join('');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile nav when clicking a link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navLinks.classList.remove('active');
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        } else {
            navbar.style.background = 'var(--white)';
            navbar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
    });

    // Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            // Here you would typically send this to a server
            // For now, we'll just show a success message
            alert('Thank you for your message! Elise will get back to you soon.');
            contactForm.reset();
        });
    }

    // Animation on scroll (simple fade-in effect)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Apply to service cards, testimonial cards, etc.
    const animatedElements = document.querySelectorAll('.service-card, .testimonial-card, .gallery-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
});
