export function byId(id) {
    return document.getElementById(id);
}

export function showPage(pageId) {
    document.querySelectorAll('.page').forEach((page) => {
        page.classList.remove('active');
    });
    byId(pageId).classList.add('active');

    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    });
}

export function openModal(modalEl) {
    modalEl.classList.add('active');
}

export function closeModal(modalEl) {
    modalEl.classList.remove('active');
}
