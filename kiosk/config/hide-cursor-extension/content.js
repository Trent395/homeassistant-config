(() => {
  const APPS = [
    {
      name: "Home Assistant",
      url: "http://jetson-orin-nano.swordfish-kelvin.ts.net:8123",
      matches: [/jetson-orin-nano\.swordfish-kelvin\.ts\.net:8123(?:[/?#]|$)/, /homeassistant\.local:8123(?:[/?#]|$)/],
    },
  ];

  const style = document.createElement("style");
  style.textContent = `
    html, body {
      overscroll-behavior-x: none !important;
      overscroll-behavior-y: contain !important;
      scrollbar-width: none !important;
    }

    * {
      cursor: none !important;
      scrollbar-width: none !important;
    }

    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
    }
  `;

  const mount = () => {
    if (!style.parentNode) {
      (document.documentElement || document.body || document).appendChild(style);
    }
  };

  mount();
  document.addEventListener("DOMContentLoaded", mount, { once: true });

  const currentUrl = window.location.href;
  const currentIndex = APPS.findIndex((app) =>
    app.matches.some((pattern) => pattern.test(currentUrl))
  );
  const homeApp = APPS.find((app) => app.name === "Home Assistant");
  const appOrigins = Array.from(new Set(
    APPS.map((app) => {
      try {
        return new URL(app.url).origin;
      } catch (_) {
        return null;
      }
    }).filter(Boolean)
  ));

  let touchStartX = null;
  let touchStartY = null;
  let touchStartTime = 0;
  let touchStartedNearBottom = false;
  let touchStartedNearLeft = false;
  let touchStartedNearRight = false;
  let navigating = false;
  let bottomEscapeTriggered = false;
  let edgeSwipeTriggered = false;

  const getEdgeSizePx = () => Math.max(72, Math.round(window.innerWidth * 0.14));

  const warmOrigins = () => {
    const head = document.head || document.documentElement || document.body;
    if (!head) {
      return;
    }

    appOrigins.forEach((origin) => {
      ["preconnect", "dns-prefetch"].forEach((rel) => {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = origin;
        head.appendChild(link);
      });
    });
  };

  warmOrigins();
  document.addEventListener("DOMContentLoaded", warmOrigins, { once: true });

  const resetTouchTracking = () => {
    touchStartX = null;
    touchStartY = null;
    touchStartTime = 0;
    touchStartedNearBottom = false;
    touchStartedNearLeft = false;
    touchStartedNearRight = false;
    bottomEscapeTriggered = false;
    edgeSwipeTriggered = false;
  };

  const navigateHome = () => {
    if (!homeApp || navigating) {
      return;
    }

    navigating = true;
    window.location.assign(homeApp.url);
  };

  const navigateToOffset = (offset) => {
    if (navigating || APPS.length < 2 || currentIndex === -1) {
      return;
    }

    navigating = true;
    const nextIndex = (currentIndex + offset + APPS.length) % APPS.length;
    window.location.assign(APPS[nextIndex].url);
  };

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        resetTouchTracking();
        return;
      }

      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      touchStartedNearBottom = touch.clientY >= window.innerHeight - 100;
      const edgeSizePx = getEdgeSizePx();
      touchStartedNearLeft = touch.clientX <= edgeSizePx;
      touchStartedNearRight = touch.clientX >= window.innerWidth - edgeSizePx;
      bottomEscapeTriggered = false;
      edgeSwipeTriggered = false;
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (
        bottomEscapeTriggered ||
        edgeSwipeTriggered ||
        touchStartX === null ||
        touchStartY === null ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      if (
        dt <= 900 &&
        (touchStartedNearLeft || touchStartedNearRight) &&
        Math.abs(dx) >= 36 &&
        Math.abs(dx) > Math.abs(dy) * 1.2
      ) {
        const movingIntoPage = (touchStartedNearLeft && dx > 0) || (touchStartedNearRight && dx < 0);
        if (movingIntoPage) {
          edgeSwipeTriggered = true;
          event.preventDefault();
          navigateToOffset(dx < 0 ? 1 : -1);
          return;
        }
      }

      if (!touchStartedNearBottom) {
        return;
      }

      if (
        dt <= 1200 &&
        dy < -70 &&
        Math.abs(dy) > Math.abs(dx) * 1.1
      ) {
        bottomEscapeTriggered = true;
        event.preventDefault();
        navigateHome();
      }
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null || touchStartY === null || event.changedTouches.length !== 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;
      const startedNearBottom = touchStartedNearBottom;
      const startedNearLeft = touchStartedNearLeft;
      const startedNearRight = touchStartedNearRight;
      const alreadyTriggered = bottomEscapeTriggered || edgeSwipeTriggered;
      resetTouchTracking();

      if (alreadyTriggered) {
        return;
      }

      if (dt > 700) {
        return;
      }

      if (
        (startedNearLeft || startedNearRight) &&
        Math.abs(dx) >= 70 &&
        Math.abs(dx) > Math.abs(dy) * 1.25
      ) {
        const movingIntoPage = (startedNearLeft && dx > 0) || (startedNearRight && dx < 0);
        if (movingIntoPage) {
          navigateToOffset(dx < 0 ? 1 : -1);
        }
        return;
      }

      if (
        startedNearBottom &&
        dy < -110 &&
        Math.abs(dy) > Math.abs(dx) * 1.2 &&
        homeApp
      ) {
        navigateHome();
        return;
      }

      if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.4) {
        return;
      }

      navigateToOffset(dx < 0 ? 1 : -1);
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    "touchcancel",
    () => {
      resetTouchTracking();
    },
    { passive: true, capture: true }
  );
})();
