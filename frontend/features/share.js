import { MOBILE_UA_REGEX } from '../constants.js';
import { APP_STATE } from '../state.js';
import { byId, closeModal, openModal } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';

export function initShare() {
    const shareBtn = byId('shareBtn');
    const shareModal = byId('shareModal');
    const closeShareModal = byId('closeShareModal');
    const shareImage = byId('shareImage');
    const modalDownloadBtn = byId('modalDownloadBtn');
    const modalShareBtn = byId('modalShareBtn');

    shareBtn.addEventListener('click', async () => {
        const originalContent = shareBtn.innerHTML;
        shareBtn.innerHTML = '<span class="btn-icon">⏳</span> 生成图片中...';
        shareBtn.disabled = true;

        let actions = null;
        try {
            const element = document.querySelector('#resultPage .content-wrapper');
            actions = element.querySelector('.result-actions');

            if (actions) {
                actions.style.display = 'none';
            }

            const canvas = await html2canvas(element, {
                backgroundColor: '#0a0a0f',
                scale: 2,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedActions = clonedDoc.querySelector('.result-actions');
                    if (clonedActions) {
                        clonedActions.style.display = 'none';
                    }

                    const clonedStory = clonedDoc.querySelector('.story-container');
                    if (clonedStory) {
                        clonedStory.style.maxHeight = 'none';
                        clonedStory.style.overflow = 'visible';
                    }
                },
            });

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!blob) {
                throw new Error('图片生成失败');
            }

            APP_STATE.currentShareBlob = blob;
            shareImage.src = URL.createObjectURL(blob);

            const file = new File([blob], 'if_life.png', { type: 'image/png' });
            openModal(shareModal);

            let canShare = false;
            try {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    canShare = true;
                }
            } catch (e) {
                console.warn('Check canShare failed:', e);
            }

            modalShareBtn.style.display = canShare ? 'inline-flex' : 'none';

            if (!MOBILE_UA_REGEX.test(navigator.userAgent)) {
                try {
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);
                    showToast('图片已复制到剪贴板');
                } catch (err) {
                    // 忽略复制失败
                }
            }
        } catch (error) {
            console.error('生成分享图片失败:', error);
            showToast('生成图片失败，请重试');
        } finally {
            if (actions) {
                actions.style.display = '';
            }
            shareBtn.innerHTML = originalContent;
            shareBtn.disabled = false;
        }
    });

    modalShareBtn.addEventListener('click', async () => {
        if (!APP_STATE.currentShareBlob) {
            return;
        }

        const file = new File([APP_STATE.currentShareBlob], 'if_life.png', { type: 'image/png' });

        try {
            await navigator.share({
                files: [file],
                title: '我的IF线人生',
                text: '来看看我在另一个宇宙的故事！',
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                showToast('分享失败，请尝试保存图片');
            }
        }
    });

    closeShareModal.addEventListener('click', () => closeModal(shareModal));
    shareModal.querySelector('.modal-overlay').addEventListener('click', () => closeModal(shareModal));

    modalDownloadBtn.addEventListener('click', () => {
        if (APP_STATE.currentShareBlob) {
            downloadImage(APP_STATE.currentShareBlob);
        }
    });
}

function downloadImage(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `if_life_${Date.now()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
