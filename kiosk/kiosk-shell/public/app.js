const state = {
    apps: [],
    currentIndex: 0,
    firstFrameReady: false,
    loadedAppIds: new Set()
};

const SWIPE_MIN_DISTANCE = 42;

async function loadApps() {
    const response = await fetch('/api/apps', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load apps (${response.status})`);
    }
    const payload = await response.json();
    state.apps = Array.isArray(payload.apps) ? payload.apps : [];
}

function render() {
    const slides = document.getElementById('slides');
    const emptyState = document.getElementById('empty-state');
    slides.innerHTML = '';

    if (!state.apps.length) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    state.apps.forEach((app) => {
        const slide = document.createElement('section');
        slide.className = 'slide';
        slide.dataset.appId = app.id;

        const iframe = document.createElement('iframe');
        iframe.className = 'app-frame';
        iframe.loading = 'lazy';
        iframe.allow = 'camera; microphone; fullscreen; autoplay';
        iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.dataset.entryUrl = app.entryUrl;
        iframe.dataset.appId = app.id;
        slide.appendChild(iframe);
        slides.appendChild(slide);
    });

    updateSlides(false);
    flashStatus();
    ensureVisibleFrameLoaded();
}

function updateSlides(animate = true) {
    const slides = document.getElementById('slides');
    slides.style.transition = animate ? 'transform 220ms ease' : 'none';
    slides.style.transform = `translateX(-${state.currentIndex * 100}vw)`;
    ensureVisibleFrameLoaded();
}

function flashStatus(text) {
    const app = state.apps[state.currentIndex];
    const pill = document.getElementById('status-pill');
    if (!pill) {
        return;
    }
    pill.textContent = text || app?.name || '';
    if (!pill.textContent) {
        pill.classList.add('hidden');
        return;
    }
    pill.classList.remove('hidden');
    pill.classList.add('show');
    clearTimeout(flashStatus.timeoutId);
    flashStatus.timeoutId = setTimeout(() => {
        pill.classList.remove('show');
        setTimeout(() => pill.classList.add('hidden'), 220);
    }, 1200);
}

function switchTo(index) {
    if (!state.apps.length) {
        return;
    }
    const total = state.apps.length;
    const nextIndex = ((index % total) + total) % total;
    if (nextIndex === state.currentIndex) {
        flashStatus();
        return;
    }
    state.currentIndex = nextIndex;
    updateSlides(true);
    flashStatus();
}

function reloadCurrentApp() {
    const frames = document.querySelectorAll('.app-frame');
    const frame = frames[state.currentIndex];
    if (!frame) {
        return;
    }
    const entryUrl = frame.dataset.entryUrl;
    frame.src = entryUrl;
    state.loadedAppIds.add(frame.dataset.appId);
    flashStatus(`Reloading ${state.apps[state.currentIndex]?.name || 'app'}`);
}

function ensureVisibleFrameLoaded() {
    const frames = document.querySelectorAll('.app-frame');
    frames.forEach((frame, index) => {
        const entryUrl = frame.dataset.entryUrl;
        const appId = frame.dataset.appId;
        if (!entryUrl) {
            return;
        }
        if (index === state.currentIndex && !state.loadedAppIds.has(appId)) {
            frame.src = entryUrl;
            state.loadedAppIds.add(appId);
        }
    });
}

function hideBootSplash() {
    if (state.firstFrameReady) {
        return;
    }
    state.firstFrameReady = true;
    const splash = document.getElementById('boot-splash');
    if (splash) {
        splash.classList.add('hidden');
    }
}

function bindEdgeSwipe(element, direction) {
    let startX = null;
    let startY = null;
    element.addEventListener('touchstart', (event) => {
        if (!event.touches.length) {
            return;
        }
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (event) => {
        if (startX === null || startY === null || !event.changedTouches.length) {
            startX = null;
            startY = null;
            return;
        }
        const deltaX = event.changedTouches[0].clientX - startX;
        const deltaY = event.changedTouches[0].clientY - startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX) {
            startX = null;
            startY = null;
            return;
        }

        if (direction === 'left' && deltaX >= SWIPE_MIN_DISTANCE) {
            switchTo(state.currentIndex - 1);
        } else if (direction === 'right' && deltaX <= -SWIPE_MIN_DISTANCE) {
            switchTo(state.currentIndex + 1);
        }
        startX = null;
        startY = null;
    }, { passive: true });
}

function bindKeyboard() {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            switchTo(state.currentIndex - 1);
        } else if (event.key === 'ArrowRight') {
            switchTo(state.currentIndex + 1);
        } else if (event.key.toLowerCase() === 'r') {
            reloadCurrentApp();
        }
    });
}

function bindFrameLoadEvents() {
    const frames = document.querySelectorAll('.app-frame');
    frames.forEach((frame) => {
        frame.addEventListener('load', () => {
            if (frame.dataset.entryUrl && frame.src) {
                hideBootSplash();
            }
        });
    });
}

async function init() {
    await loadApps();
    render();
    bindFrameLoadEvents();
    bindEdgeSwipe(document.getElementById('gesture-left'), 'left');
    bindEdgeSwipe(document.getElementById('gesture-right'), 'right');
    bindKeyboard();
}

init().catch((error) => {
    console.error(error);
    const emptyState = document.getElementById('empty-state');
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `<h1>Shell failed</h1><p>${error.message}</p>`;
});
