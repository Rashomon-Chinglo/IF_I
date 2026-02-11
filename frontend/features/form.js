import { LOADING_TEXTS } from '../constants.js';
import { APP_STATE } from '../state.js';
import { byId, showPage } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { renderStreamedStory } from './story.js';

const FORM_DRAFT_STORAGE_KEY = 'if_i_form_draft';

export function initForm() {
    const form = byId('lifeForm');
    const prevBtn = byId('prevBtn');
    const nextBtn = byId('nextBtn');
    const regenerateBtn = byId('regenerateBtn');

    restoreFormDraft(form);

    prevBtn.addEventListener('click', () => {
        if (APP_STATE.currentStep > 1) {
            goToStep(APP_STATE.currentStep - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep() && APP_STATE.currentStep < APP_STATE.totalSteps) {
            goToStep(APP_STATE.currentStep + 1);
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateCurrentStep()) {
            submitForm();
        }
    });

    form.addEventListener('input', () => {
        persistFormDraft(form);
    });
    form.addEventListener('change', () => {
        persistFormDraft(form);
    });

    regenerateBtn.addEventListener('click', () => {
        submitForm();
    });
}

export function resetForm() {
    const form = byId('lifeForm');
    form.reset();
    clearFormDraft();
    goToStep(1);
}

function goToStep(step) {
    APP_STATE.currentStep = step;

    window.scrollTo(0, 0);

    document.querySelectorAll('.form-step').forEach((formStep) => {
        formStep.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    const progress = (step / APP_STATE.totalSteps) * 100;
    byId('progressFill').style.width = progress + '%';

    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index + 1 < step) {
            dot.classList.add('completed');
        } else if (index + 1 === step) {
            dot.classList.add('active');
        }
    });

    const prevBtn = byId('prevBtn');
    const nextBtn = byId('nextBtn');
    const generateBtn = byId('generateBtn');

    prevBtn.disabled = step === 1;

    if (step === APP_STATE.totalSteps) {
        nextBtn.style.display = 'none';
        generateBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        generateBtn.style.display = 'none';
    }
}

function validateCurrentStep() {
    const currentStepEl = document.querySelector(`.form-step[data-step="${APP_STATE.currentStep}"]`);
    const requiredInputs = currentStepEl.querySelectorAll('[required]');

    for (const input of requiredInputs) {
        if (input.type === 'radio') {
            const checked = currentStepEl.querySelector(`input[name="${input.name}"]:checked`);
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

function getFormData() {
    const form = byId('lifeForm');
    persistFormDraft(form);

    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    data.age = parseInt(data.age, 10) || 25;
    return data;
}

function getRawFormData(formEl) {
    const formData = new FormData(formEl);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    return data;
}

function persistFormDraft(formEl) {
    const rawData = getRawFormData(formEl);
    try {
        sessionStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(rawData));
    } catch (error) {
        console.warn('保存表单草稿失败:', error);
    }
}

function restoreFormDraft(formEl) {
    let raw = null;

    try {
        raw = sessionStorage.getItem(FORM_DRAFT_STORAGE_KEY);
    } catch (error) {
        console.warn('读取表单草稿失败:', error);
        return;
    }

    if (!raw) {
        return;
    }

    let data = null;
    try {
        data = JSON.parse(raw);
    } catch (error) {
        clearFormDraft();
        return;
    }

    if (!data || typeof data !== 'object') {
        return;
    }

    for (const [name, value] of Object.entries(data)) {
        const controls = formEl.querySelectorAll(`[name="${name}"]`);
        if (!controls.length) {
            continue;
        }

        controls.forEach((control) => {
            if (control.type === 'radio') {
                control.checked = control.value === String(value);
                return;
            }

            if (control.type === 'checkbox') {
                control.checked = Boolean(value);
                return;
            }

            control.value = String(value);
        });
    }
}

function clearFormDraft() {
    try {
        sessionStorage.removeItem(FORM_DRAFT_STORAGE_KEY);
    } catch (error) {
        console.warn('清理表单草稿失败:', error);
    }
}

function resolveApiPath() {
    return window.location.pathname.includes('/if_i')
        ? '/if_i/api/generate/stream'
        : '/api/generate/stream';
}

function startLoadingTextRotation() {
    const loadingText = byId('loadingText');
    let textIndex = 0;

    const timer = setInterval(() => {
        textIndex = (textIndex + 1) % LOADING_TEXTS.length;
        loadingText.textContent = LOADING_TEXTS[textIndex];
    }, 2000);

    return () => {
        clearInterval(timer);
    };
}

async function submitForm() {
    const formData = getFormData();

    showPage('loadingPage');
    const stopLoadingRotation = startLoadingTextRotation();
    let stoppedLoading = false;
    let enteredResultPage = false;

    try {
        const response = await fetch(resolveApiPath(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            throw new Error('生成失败，请稍后重试');
        }

        byId('resultName').textContent = formData.nickname;

        const storyContent = byId('storyContent');
        storyContent.innerHTML = '<span class="typing-cursor"></span>';

        await renderStreamedStory(response, storyContent, {
            onFirstContent: () => {
                if (!stoppedLoading) {
                    stopLoadingRotation();
                    stoppedLoading = true;
                }
                if (!enteredResultPage) {
                    showPage('resultPage');
                    enteredResultPage = true;
                }
            },
        });

        if (!stoppedLoading) {
            stopLoadingRotation();
            stoppedLoading = true;
        }

        if (!enteredResultPage) {
            showPage('resultPage');
            enteredResultPage = true;
        }
    } catch (error) {
        if (!stoppedLoading) {
            stopLoadingRotation();
            stoppedLoading = true;
        }
        console.error('生成失败:', error);
        showToast(error.message || '生成失败，请检查网络连接');
        showPage('formPage');
    }
}
