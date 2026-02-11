import { initForm, resetForm } from './features/form.js';
import { initNavigation } from './features/navigation.js';
import { initShare } from './features/share.js';
import { initStars } from './features/stars.js';

function mountApp() {
    initStars();
    initNavigation({ resetForm });
    initForm();
    initShare();
}

export function initApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountApp);
        return;
    }
    mountApp();
}
