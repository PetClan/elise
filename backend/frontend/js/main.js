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
    { text: "A huge thank you to Elise for bringing so much fun and energy to Highgate. Our residents loved singing along to Scottish songs and singalong favourites, with plenty of smiles and toe-tapping all afternoon", author: "Highgate Care Home, Glasgow" },
    { text: "Alex has had a lovely birthday, everyone enjoyed your choice of songs and your singing. Thanks again", author: "Bield Housing, Linlithgow" },
    { text: "Thank you so much for today, you were fantastic and the residents loved you", author: "Cumbernauld Care Home" },
    { text: "Elise sang a range of songs including ABBA songs, the residents had a great time singing and dancing along to the music", author: "Hatton Lea Care Home, Bellshill" },
    { text: "We had such great feedback from your visit last week. Your shows are such a favourite here, we're already asking about St Andrew's Day and Burns Night!", author: "Wheatlands Care Home, Bonnybridge" },
    { text: "Residents were treated to a fabulous afternoon of ABBA classics with the amazing Elise, who had everyone singing, dancing in their seats and soaking up every minute of the music", author: "Activities Coordinator, Carrondale Care Home" },
    { text: "The resident and staff feedback was that you are amazing and they want you back to do what you do best for our Christmas party", author: "Cumbernauld Care Home" },
    { text: "Omg elise you are absolutely outstanding and have an unbelievable future ahead! ", author: "Activities Coordinator, Milngavie Manor Care Home" },
    { text: "I'm very grateful to Elise for the fantastic show she performed from my mum's 80th Birthday. Her voice is beautiful and her choice of songs were perfect. It was a joyous afternoon for all. Highly recommended!", author: "Susan" }
];

document.addEventListener('DOMContentLoaded', function () {
    const reviewsTrack = document.getElementById('reviewsGrid');
    const reviewsDots = document.getElementById('reviewsDots');
    if (!reviewsTrack) return;

    reviewsTrack.innerHTML = reviews.map(function (review) {
        return '<article class="review-card">' +
            '<p class="review-text">"' + review.text + '"</p>' +
            '<p class="review-author">— ' + review.author + '</p>' +
            '</article>';
    }).join('');

    const carousel = reviewsTrack.closest('.reviews-carousel');
    let position = 0;
    let timer = null;

    function perView() {
        return window.innerWidth >= 992 ? 3 : 1;
    }

    function maxPosition() {
        return Math.max(0, reviews.length - perView());
    }

    function render() {
        const card = reviewsTrack.querySelector('.review-card');
        if (!card) return;
        const step = card.offsetWidth + parseFloat(getComputedStyle(reviewsTrack).gap || 0);
        reviewsTrack.style.transform = 'translateX(-' + (position * step) + 'px)';

        const dots = reviewsDots.querySelectorAll('.reviews-dot');
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === position);
        });
    }

    function buildDots() {
        if (!reviewsDots) return;
        reviewsDots.innerHTML = '';
        for (let i = 0; i <= maxPosition(); i++) {
            const dot = document.createElement('button');
            dot.className = 'reviews-dot';
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Go to review ' + (i + 1));
            dot.addEventListener('click', function () {
                position = i;
                render();
                restart();
            });
            reviewsDots.appendChild(dot);
        }
    }

    function advance() {
        position = position >= maxPosition() ? 0 : position + 1;
        render();
    }

    function restart() {
        clearInterval(timer);
        timer = setInterval(advance, 6500);
    }

    function setup() {
        if (position > maxPosition()) position = maxPosition();
        buildDots();
        render();
    }

    setup();
    restart();

    if (carousel) {
        carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
        carousel.addEventListener('mouseleave', restart);
    }

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setup, 150);
    });
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
