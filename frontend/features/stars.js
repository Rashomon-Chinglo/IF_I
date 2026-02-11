import { byId } from '../utils/dom.js';

export function initStars() {
    const starsContainer = byId('stars');
    const starCount = 100;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = 2 + Math.random() * 2 + 's';
        starsContainer.appendChild(star);
    }
}
