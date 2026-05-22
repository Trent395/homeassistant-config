# Pi3 Kiosk — Home Assistant Client

Raspberry Pi 3 with 7" touchscreen running as a dedicated HA client panel.
Boots directly into Chromium kiosk mode pointing at the Jetson Orin Nano HA server.

## Directory layout

```
kiosk/
  config/
    labwc-autostart            # ~/.config/labwc/autostart — Chromium launcher
    kiosk-shell.service        # ~/.config/systemd/user/kiosk-shell.service
    hide-cursor-extension/     # ~/.config/chromium/hide-cursor-extension/
  kiosk-shell/                 # legacy Node.js multi-app iframe shell (not running)
```

## Deploying config changes to the Pi

```sh
# labwc autostart
cp kiosk/config/labwc-autostart ~/.config/labwc/autostart

# hide-cursor extension
cp kiosk/config/hide-cursor-extension/* ~/.config/chromium/hide-cursor-extension/
```

## Design

Chromium runs in `--kiosk` mode with `--ozone-platform=wayland` under labwc.
The hide-cursor extension suppresses the cursor and `overscroll-behavior` to
prevent accidental back-navigation. HA's native touch gestures work without
any wrapper shell or proxy layer.

## Legacy: kiosk-shell

`kiosk-shell/` is the previous implementation — a Node.js/Express server that
proxied HA (to strip `X-Frame-Options`) and embedded it in an iframe inside a
swipe-navigable multi-app shell. Retired because the proxy and iframe layer
added latency, the bottom-swipe gesture conflicted with HA's own gestures causing
accidental reloads, and there is only ever one app (HA) to show.
