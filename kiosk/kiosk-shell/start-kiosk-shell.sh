#!/bin/sh
set -eu

PORT="${KIOSK_SHELL_PORT:-8081}"

cd "$HOME/kiosk-shell"
export GTK_IM_MODULE="${GTK_IM_MODULE:-maliit}"
export QT_IM_MODULE="${QT_IM_MODULE:-maliit}"
export XMODIFIERS="${XMODIFIERS:-@im=maliit}"

exec chromium \
  --enable-remote-extensions \
  --enable-wayland-ime \
  --wayland-text-input-version=3 \
  --force-dark-mode \
  --enable-features=WebContentsForceDark \
  --disable-extensions-except="$HOME/.config/chromium/hide-cursor-extension" \
  --load-extension="$HOME/.config/chromium/hide-cursor-extension" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-features=ChromeWhatsNewUI,PrivacySandboxSettings4,Translate \
  --disable-sync \
  --no-default-browser-check \
  --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT' \
  --touch-events=enabled \
  --ozone-platform=wayland \
  "http://127.0.0.1:${PORT}/"
