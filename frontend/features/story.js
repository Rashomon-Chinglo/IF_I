export function formatStory(text) {
    const paragraphs = text.split('\n\n').filter((p) => p.trim());
    return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function charsPerFrame(queuedChars) {
    if (queuedChars > 2400) return 34;
    if (queuedChars > 1400) return 29;
    if (queuedChars > 800) return 26;
    if (queuedChars > 350) return 22;
    return 17;
}

export async function renderStreamedStory(response, storyContentEl, options = {}) {
    if (!response.body) {
        throw new Error('生成失败，请稍后重试');
    }

    const { onAnalysis, onFirstContent } = options;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let storyText = '';
    const pendingChunks = [];
    let queuedChars = 0;
    let queueOffset = 0;
    let streamFinished = false;
    let receivedFirstContent = false;
    let animationFrameId = null;
    let lastPumpAt = null;
    let charBudget = 0;
    let finalized = false;
    let settled = false;
    let settleDrain;
    const drainPromise = new Promise((resolve) => {
        settleDrain = resolve;
    });

    const streamTextEl = document.createElement('div');
    streamTextEl.style.whiteSpace = 'pre-wrap';
    streamTextEl.style.wordBreak = 'break-word';
    const streamTextNode = document.createTextNode('');
    const cursorEl = document.createElement('span');
    cursorEl.className = 'typing-cursor';
    streamTextEl.appendChild(streamTextNode);
    storyContentEl.innerHTML = '';
    storyContentEl.appendChild(streamTextEl);
    storyContentEl.appendChild(cursorEl);
    const storyScrollBoxEl = storyContentEl.closest('.story-container');

    const scrollTextBoxToBottom = () => {
        const target = storyScrollBoxEl || storyContentEl;
        target.scrollTop = target.scrollHeight;
        requestAnimationFrame(() => {
            target.scrollTop = target.scrollHeight;
        });
    };

    const settle = () => {
        if (settled) {
            return;
        }
        settled = true;
        settleDrain();
    };

    const keepLatestVisible = () => {
        scrollTextBoxToBottom();

        // When the story box is not scrollable on some mobile layouts,
        // keep the latest cursor roughly in viewport as a fallback.
        if (!storyScrollBoxEl && cursorEl.isConnected) {
            const rect = cursorEl.getBoundingClientRect();
            const bottomEdge = window.innerHeight - 18;
            if (rect.bottom > bottomEdge) {
                cursorEl.scrollIntoView({
                    block: 'end',
                    inline: 'nearest',
                    behavior: 'auto',
                });
            }
        }
    };

    const finalizeRender = () => {
        if (finalized) {
            return;
        }
        finalized = true;
        storyContentEl.innerHTML = formatStory(storyText);
        scrollTextBoxToBottom();
        const lastBlock = storyContentEl.lastElementChild;
        if (!storyScrollBoxEl && lastBlock) {
            lastBlock.scrollIntoView({
                block: 'end',
                inline: 'nearest',
                behavior: 'auto',
            });
        }
    };

    const pumpCharacters = (now) => {
        animationFrameId = null;
        let didAppend = false;

        if (typeof now === 'number') {
            if (lastPumpAt === null) {
                lastPumpAt = now;
            }
            const elapsed = Math.max(0, now - lastPumpAt);
            lastPumpAt = now;
            charBudget += (elapsed / 1000) * charsPerFrame(queuedChars);
        }

        if (queuedChars > 0) {
            const stepCap = 3;
            let remaining = Math.min(Math.floor(charBudget), stepCap);
            let emitted = 0;

            while (remaining > 0 && pendingChunks.length > 0) {
                const current = pendingChunks[0];
                const available = current.length - queueOffset;
                const take = Math.min(remaining, available);
                const piece = current.slice(queueOffset, queueOffset + take);

                storyText += piece;
                streamTextNode.data += piece;

                remaining -= take;
                emitted += take;
                queuedChars -= take;
                queueOffset += take;
                didAppend = true;

                if (queueOffset >= current.length) {
                    pendingChunks.shift();
                    queueOffset = 0;
                }
            }

            if (emitted > 0) {
                charBudget = Math.max(0, charBudget - emitted);
            }
        }

        if (didAppend) {
            keepLatestVisible();
        }

        if (queuedChars > 0 || !streamFinished) {
            animationFrameId = requestAnimationFrame(pumpCharacters);
            return;
        }

        finalizeRender();
        settle();
    };

    const ensurePump = () => {
        if (animationFrameId !== null) {
            return;
        }
        animationFrameId = requestAnimationFrame(pumpCharacters);
    };

    const handleDataLine = (line) => {
        if (!line.startsWith('data:')) {
            return;
        }

        const payload = line.slice(5).trim();
        if (!payload) {
            return;
        }

        try {
            const data = JSON.parse(payload);

            if (data.type === 'analysis') {
                if (typeof onAnalysis === 'function') {
                    onAnalysis(data);
                }
                return;
            }

            if (data.type === 'content') {
                if (typeof data.content !== 'string' || !data.content) {
                    return;
                }

                if (!receivedFirstContent) {
                    receivedFirstContent = true;
                    if (typeof onFirstContent === 'function') {
                        onFirstContent();
                    }
                }

                pendingChunks.push(data.content);
                queuedChars += data.content.length;
                ensurePump();
                return;
            }

            if (data.type === 'done') {
                streamFinished = true;
                ensurePump();
                return;
            }

            if (data.type === 'error') {
                throw new Error(data.message);
            }
        } catch (e) {
            if (e instanceof SyntaxError) {
                return;
            }
            if (e instanceof Error) {
                throw e;
            }
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                buffer += decoder.decode();
            } else {
                buffer += decoder.decode(value, { stream: true });
            }

            const lines = buffer.split('\n');
            buffer = done ? '' : lines.pop() || '';

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line) {
                    continue;
                }
                handleDataLine(line);
            }

            if (done) {
                break;
            }
        }

        if (buffer.trim()) {
            handleDataLine(buffer.trim());
        }

        streamFinished = true;
        ensurePump();
        await drainPromise;
    } finally {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (!finalized && settled) {
            finalizeRender();
        }
    }
}
