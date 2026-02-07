/**
 * 人生IF线生成器 - 前端核心逻辑
 */

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initNavigation();
    initForm();
    initModal();
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
        const response = await fetch('/api/generate/stream', {
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

// ===== 设置弹窗 =====
function initModal() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('settingsModal');
    const modalOverlay = modal.querySelector('.modal-overlay');
    const apiProvider = document.getElementById('apiProvider');
    const customEndpointGroup = document.getElementById('customEndpointGroup');
    const saveSettings = document.getElementById('saveSettings');

    // 由于改为后端调用，设置弹窗主要用于展示信息
    settingsBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modalOverlay.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    apiProvider.addEventListener('change', () => {
        customEndpointGroup.style.display =
            apiProvider.value === 'custom' ? 'block' : 'none';
    });

    saveSettings.addEventListener('click', () => {
        showToast('API 设置已由服务端管理');
        modal.classList.remove('active');
    });

    // 分享按钮
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.addEventListener('click', () => {
        const storyContent = document.getElementById('storyContent').innerText;
        const nickname = document.getElementById('resultName').textContent;

        const shareText = `【${nickname}的IF线人生】\n\n${storyContent.slice(0, 200)}...\n\n🌌 来自「人生IF线生成器」`;

        if (navigator.share) {
            navigator.share({
                title: '我的IF线人生',
                text: shareText,
            });
        } else {
            // 复制到剪贴板
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('已复制到剪贴板');
            });
        }
    });
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
