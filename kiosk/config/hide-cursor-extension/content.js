(() => {
  const style = document.createElement("style");
  style.textContent = `
    html, body {
      overscroll-behavior-x: none !important;
      overscroll-behavior-y: contain !important;
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
})();
