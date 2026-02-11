import { byId, showPage } from '../utils/dom.js';

export function initNavigation({ resetForm }) {
    const startBtn = byId('startBtn');
    const restartBtn = byId('restartBtn');

    startBtn.addEventListener('click', () => {
        showPage('formPage');
    });

    restartBtn.addEventListener('click', () => {
        resetForm();
        showPage('welcomePage');
    });
}
