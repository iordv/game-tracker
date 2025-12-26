/**
 * GameTracker Animations
 * Handles all animations and transitions
 */

const Animations = {
    /**
     * Fade in an element
     * @param {HTMLElement} element - Element to animate
     * @param {number} duration - Duration in ms
     */
    fadeIn(element, duration = 250) {
        element.style.opacity = '0';
        element.style.display = 'block';

        requestAnimationFrame(() => {
            element.style.transition = `opacity ${duration}ms ease-out`;
            element.style.opacity = '1';
        });

        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    },

    /**
     * Fade out an element
     * @param {HTMLElement} element - Element to animate
     * @param {number} duration - Duration in ms
     */
    fadeOut(element, duration = 250) {
        element.style.transition = `opacity ${duration}ms ease-out`;
        element.style.opacity = '0';

        return new Promise(resolve => {
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    },

    /**
     * Slide in from bottom
     * @param {HTMLElement} element - Element to animate
     * @param {number} duration - Duration in ms
     */
    slideInUp(element, duration = 400) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.display = 'block';

        requestAnimationFrame(() => {
            element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });

        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    },

    /**
     * Slide out to bottom
     * @param {HTMLElement} element - Element to animate
     * @param {number} duration - Duration in ms
     */
    slideOutDown(element, duration = 300) {
        element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-in`;
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';

        return new Promise(resolve => {
            setTimeout(() => {
                element.style.display = 'none';
                element.style.transform = '';
                resolve();
            }, duration);
        });
    },

    /**
     * Scale bounce animation (for save button, etc)
     * @param {HTMLElement} element - Element to animate
     */
    bounce(element) {
        element.style.transition = 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        element.style.transform = 'scale(1.2)';

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);

        return new Promise(resolve => {
            setTimeout(resolve, 500);
        });
    },

    /**
     * Shake animation for errors
     * @param {HTMLElement} element - Element to animate
     */
    shake(element) {
        element.style.animation = 'shake 0.5s ease-in-out';

        return new Promise(resolve => {
            setTimeout(() => {
                element.style.animation = '';
                resolve();
            }, 500);
        });
    },

    /**
     * Staggered fade in for lists - optimized for no flash
     * @param {NodeList|Array} elements - Elements to animate
     * @param {number} stagger - Stagger delay in ms
     * @param {number} duration - Duration per item in ms
     */
    staggerFadeIn(elements, stagger = 30, duration = 200) {
        const items = Array.from(elements);

        // Skip if no items or already animated
        if (!items.length) return Promise.resolve();

        // Check if already visible (avoid re-animation on re-render)
        const firstItem = items[0];
        if (firstItem.dataset.animated === 'true') {
            return Promise.resolve();
        }

        // Apply initial state via class for instant hide
        items.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
            el.style.transitionDelay = `${index * stagger}ms`;
        });

        // Force reflow then animate
        void firstItem.offsetHeight;

        // Start animation immediately
        items.forEach((el) => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.dataset.animated = 'true';
        });

        // Clean up transitions after animation completes
        const totalDuration = items.length * stagger + duration;
        return new Promise(resolve => {
            setTimeout(() => {
                items.forEach(el => {
                    el.style.transition = '';
                    el.style.transitionDelay = '';
                });
                resolve();
            }, totalDuration);
        });
    },

    /**
     * View transition between views
     * @param {HTMLElement} fromView - Current view
     * @param {HTMLElement} toView - Target view
     * @param {string} direction - 'forward' or 'back'
     */
    async viewTransition(fromView, toView, direction = 'forward') {
        const isForward = direction === 'forward';

        // Hide from view
        fromView.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
        fromView.style.opacity = '0';
        fromView.style.transform = isForward ? 'translateX(-20px)' : 'translateX(20px)';

        await new Promise(r => setTimeout(r, 200));

        fromView.classList.remove('active');
        fromView.style.transform = '';
        fromView.style.opacity = '';

        // Show to view
        toView.style.opacity = '0';
        toView.style.transform = isForward ? 'translateX(20px)' : 'translateX(-20px)';
        toView.classList.add('active');

        requestAnimationFrame(() => {
            toView.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
            toView.style.opacity = '1';
            toView.style.transform = 'translateX(0)';
        });

        await new Promise(r => setTimeout(r, 300));

        toView.style.transition = '';
        toView.style.transform = '';
        toView.style.opacity = '';
    },

    /**
     * Ripple effect on touch
     * @param {MouseEvent|TouchEvent} event - Click/touch event
     * @param {HTMLElement} element - Element to add ripple to
     */
    ripple(event, element) {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX || event.touches?.[0]?.clientX || 0) - rect.left;
        const y = (event.clientY || event.touches?.[0]?.clientY || 0) - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
      position: absolute;
      width: 10px;
      height: 10px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      animation: ripple 0.6s ease-out forwards;
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
    `;

        // Ensure parent has relative positioning
        const originalPosition = element.style.position;
        if (!originalPosition || originalPosition === 'static') {
            element.style.position = 'relative';
        }
        element.style.overflow = 'hidden';

        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
            if (!originalPosition || originalPosition === 'static') {
                element.style.position = originalPosition;
            }
        }, 600);
    },

    /**
     * Parallax scroll effect for hero images
     * @param {HTMLElement} element - Element with background
     * @param {number} scrollY - Current scroll position
     * @param {number} speed - Parallax speed (0-1)
     */
    parallax(element, scrollY, speed = 0.5) {
        const offset = scrollY * speed;
        element.style.transform = `translateY(${offset}px) scale(1.1)`;
    },

    /**
     * Card hover 3D tilt effect
     * @param {HTMLElement} card - Card element
     * @param {MouseEvent} event - Mouse event
     */
    tilt3D(card, event) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseX = event.clientX - centerX;
        const mouseY = event.clientY - centerY;

        const rotateX = (mouseY / (rect.height / 2)) * -5;
        const rotateY = (mouseX / (rect.width / 2)) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    },

    /**
     * Reset card tilt
     * @param {HTMLElement} card - Card element
     */
    resetTilt(card) {
        card.style.transform = '';
    }
};

// Add ripple keyframes to document
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: translate(-50%, -50%) scale(40);
      opacity: 0;
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// Export for use in other modules
window.Animations = Animations;
