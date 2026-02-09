/**
 * 人生IF线生成器 - 前端核心逻辑
 */

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initNavigation();
    initForm();
});

// ===== 星空背景 =====
function initStars() {
    const starsContainer = document.getElementById('stars');
    const starCount = 100;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (2 + Math.random() * 2) + 's';
        starsContainer.appendChild(star);
    }
}

// ===== 页面导航 =====
function initNavigation() {
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    startBtn.addEventListener('click', () => {
        showPage('formPage');
    });

    restartBtn.addEventListener('click', () => {
        resetForm();
        showPage('welcomePage');
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    // Ensure we start at the top of the new page, using rAF for layout stability
    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    });
}

// ===== 表单处理 =====
let currentStep = 1;
const totalSteps = 4;

function initForm() {
    const form = document.getElementById('lifeForm');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const generateBtn = document.getElementById('generateBtn');

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep()) {
            if (currentStep < totalSteps) {
                goToStep(currentStep + 1);
            }
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateCurrentStep()) {
            submitForm();
        }
    });

    // 初始化再来一次按钮
    const regenerateBtn = document.getElementById('regenerateBtn');
    regenerateBtn.addEventListener('click', () => {
        submitForm();
    });
}

function goToStep(step) {
    currentStep = step;

    // 切换步骤时滚动到顶部，优化手机端体验
    window.scrollTo(0, 0);

    // 更新步骤显示
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    // 更新进度条
    const progress = (step / totalSteps) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    // 更新步骤指示器
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index + 1 < step) {
            dot.classList.add('completed');
        } else if (index + 1 === step) {
            dot.classList.add('active');
        }
    });

    // 更新按钮状态
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const generateBtn = document.getElementById('generateBtn');

    prevBtn.disabled = step === 1;

    if (step === totalSteps) {
        nextBtn.style.display = 'none';
        generateBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        generateBtn.style.display = 'none';
    }
}

function validateCurrentStep() {
    const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredInputs = currentStepEl.querySelectorAll('[required]');

    for (const input of requiredInputs) {
        if (input.type === 'radio') {
            const name = input.name;
            const checked = currentStepEl.querySelector(`input[name="${name}"]:checked`);
            if (!checked) {
                showToast('请完成所有必填项');
                return false;
            }
        } else if (!input.value.trim()) {
            input.focus();
            showToast('请完成所有必填项');
            return false;
        }
    }
    return true;
}

function resetForm() {
    document.getElementById('lifeForm').reset();
    goToStep(1);
}

function getFormData() {
    const form = document.getElementById('lifeForm');
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    // 确保 age 是数字
    data.age = parseInt(data.age) || 25;

    return data;
}

// ===== 提交表单并生成故事 =====
async function submitForm() {
    const formData = getFormData();

    // 显示加载页面
    showPage('loadingPage');

    // 更新加载文案
    const loadingTexts = [
        '寻找平行宇宙中的另一个你',
        '穿越时空的缝隙...',
        '在无数可能性中定位...',
        '编织另一条世界线的故事...',
        '即将抵达...',
    ];

    let textIndex = 0;
    const loadingText = document.getElementById('loadingText');
    const textInterval = setInterval(() => {
        textIndex = (textIndex + 1) % loadingTexts.length;
        loadingText.textContent = loadingTexts[textIndex];
    }, 2000);

    try {
        // 调用流式 API
        // Detect if we are running under /if_i/ path
        const apiPath = window.location.pathname.includes('/if_i')
            ? '/if_i/api/generate/stream'
            : '/api/generate/stream';

        const response = await fetch(apiPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            throw new Error('生成失败，请稍后重试');
        }

        clearInterval(textInterval);

        // 显示结果页面
        showPage('resultPage');
        document.getElementById('resultName').textContent = formData.nickname;

        // 处理流式响应
        const storyContent = document.getElementById('storyContent');
        storyContent.innerHTML = '<span class="typing-cursor"></span>';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let storyText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'content') {
                            storyText += data.content;
                            storyContent.innerHTML = formatStory(storyText) + '<span class="typing-cursor"></span>';
                            storyContent.scrollTop = storyContent.scrollHeight;
                        } else if (data.type === 'done') {
                            storyContent.innerHTML = formatStory(storyText);
                        } else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    } catch (e) {
                        // 跳过非 JSON 行
                    }
                }
            }
        }

    } catch (error) {
        clearInterval(textInterval);
        console.error('生成失败:', error);
        showToast(error.message || '生成失败，请检查网络连接');
        showPage('formPage');
    }
}

function formatStory(text) {
    // 将换行转换为段落
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// 分享相关逻辑
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const closeShareModal = document.getElementById('closeShareModal');
const shareImage = document.getElementById('shareImage');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const modalShareBtn = document.getElementById('modalShareBtn');

// 统一保存图片的当前 blob，用于下载按钮
let currentShareBlob = null;

shareBtn.addEventListener('click', async () => {
    // 保存原始按钮状态
    const originalContent = shareBtn.innerHTML;
    shareBtn.innerHTML = '<span class="btn-icon">⏳</span> 生成图片中...';
    shareBtn.disabled = true;

    try {
        // 获取要截图的区域 (结果页内容)
        const element = document.querySelector('#resultPage .content-wrapper');
        const actions = element.querySelector('.result-actions');

        // 临时隐藏按钮
        if (actions) actions.style.display = 'none';

        // 使用 html2canvas 生成图片
        const canvas = await html2canvas(element, {
            backgroundColor: '#0a0a0f', // 强制深色背景
            scale: 2, // 高清截图
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => {
                // 确保克隆文档中的按钮也是隐藏的
                const clonedActions = clonedDoc.querySelector('.result-actions');
                if (clonedActions) clonedActions.style.display = 'none';

                // 强制展开故事容器，以便捕获完整内容
                const clonedStory = clonedDoc.querySelector('.story-container');
                if (clonedStory) {
                    clonedStory.style.maxHeight = 'none';
                    clonedStory.style.overflow = 'visible';
                }
            }
        });

        // 恢复按钮显示
        if (actions) actions.style.display = '';

        // 将 canvas 转换为 Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        if (!blob) {
            throw new Error('图片生成失败');
        }

        currentShareBlob = blob;
        const imageUrl = URL.createObjectURL(blob);
        shareImage.src = imageUrl;

        const file = new File([blob], 'if_life.png', { type: 'image/png' });

        // 打开弹窗
        openModal('shareModal');

        // 检查是否支持原生分享
        // 注意：navigator.canShare 在某些浏览器中可能不存在
        let canShare = false;
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                canShare = true;
            }
        } catch (e) {
            console.warn('Check canShare failed:', e);
        }

        if (canShare) {
            modalShareBtn.style.display = 'inline-flex';
            // 此时“保存图片”作为备选，样式上可以弱化，或者保持原样
        } else {
            modalShareBtn.style.display = 'none';
        }

        // PC端：尝试自动复制到剪贴板，作为额外便利
        if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            try {
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                showToast('图片已复制到剪贴板');
            } catch (err) {
                // 忽略复制失败
            }
        }

        // 恢复按钮状态
        shareBtn.innerHTML = originalContent;
        shareBtn.disabled = false;

    } catch (error) {
        console.error('生成分享图片失败:', error);
        showToast('生成图片失败，请重试');
        shareBtn.innerHTML = originalContent;
        shareBtn.disabled = false;
    }
});

// 绑定新分享按钮事件
modalShareBtn.addEventListener('click', async () => {
    if (!currentShareBlob) return;

    const file = new File([currentShareBlob], 'if_life.png', { type: 'image/png' });
    try {
        await navigator.share({
            files: [file],
            title: '我的IF线人生',
            text: '来看看我在另一个宇宙的故事！'
        });
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
            showToast('分享失败，请尝试保存图片');
        }
    }
});

// 弹窗控制
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

closeShareModal.addEventListener('click', () => closeModal('shareModal'));
document.querySelector('#shareModal .modal-overlay').addEventListener('click', () => closeModal('shareModal'));

modalDownloadBtn.addEventListener('click', () => {
    if (currentShareBlob) {
        downloadImage(currentShareBlob);
    }
});

// 辅助函数：下载图片
function downloadImage(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `if_life_${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== Toast 提示 =====
function showToast(message) {
    // 创建 toast 元素
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: rgba(124, 58, 237, 0.9);
            color: white;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
