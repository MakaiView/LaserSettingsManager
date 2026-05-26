#!/usr/bin/env bash
# Laser Settings Tracker — LXC install script
# Runs INSIDE the LXC container
set -euo pipefail

YW=$(echo "\033[33m")
GN=$(echo "\033[1;92m")
RD=$(echo "\033[01;31m")
CL=$(echo "\033[m")
BFR="\\r\\033[K"
HOLD="-"
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"

APP_DIR="/opt/laser-tracker"
REPO="https://github.com/MakaiView/LaserSettingsManager.git"

msg_info()  { echo -ne " ${HOLD} ${YW}${1}...${CL}"; }
msg_ok()    { echo -e "${BFR} ${CM} ${GN}${1}${CL}"; }
msg_error() { echo -e "${BFR} ${CROSS} ${RD}${1}${CL}"; exit 1; }

msg_info "Updating package lists"
apt-get update -qq &>/dev/null
msg_ok "Package lists updated"

msg_info "Installing base packages"
apt-get install -y -qq curl git nginx &>/dev/null
msg_ok "Base packages installed"

msg_info "Installing Node.js 20.x"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
apt-get install -y -qq nodejs &>/dev/null
msg_ok "Node.js $(node -v) installed"

msg_info "Installing PM2"
npm install -g pm2 &>/dev/null
msg_ok "PM2 installed"

msg_info "Cloning repository"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR" ]; then
  git -C "$APP_DIR" pull origin master &>/dev/null
else
  git clone "$REPO" "$APP_DIR" &>/dev/null
fi
msg_ok "Repository cloned to $APP_DIR"

msg_info "Installing Node.js dependencies"
npm install --production --prefix "$APP_DIR/app" &>/dev/null
msg_ok "Dependencies installed"

msg_info "Creating data directories"
mkdir -p "$APP_DIR/data/uploads" "$APP_DIR/logs"
chmod 755 "$APP_DIR/data" "$APP_DIR/data/uploads"
msg_ok "Data directories created"

msg_info "Creating .env file"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  sed -i "s/changeme_set_a_real_token_here/$TOKEN/" "$APP_DIR/.env"
fi
msg_ok ".env configured"

msg_info "Configuring Nginx"
cat > /etc/nginx/sites-available/laser-tracker <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /opt/laser-tracker/data/uploads/;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/laser-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t &>/dev/null
systemctl reload nginx
msg_ok "Nginx configured"

msg_info "Starting application with PM2"
pm2 start "$APP_DIR/app/ecosystem.config.js" &>/dev/null
pm2 save &>/dev/null
msg_ok "App started with PM2"

msg_info "Configuring PM2 startup"
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root 2>&1 | tail -1)
eval "$PM2_STARTUP" &>/dev/null || true
msg_ok "PM2 startup configured"

IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GN}╔══════════════════════════════════════════════╗${CL}"
echo -e "${GN}║     Laser Settings Tracker — Installed!     ║${CL}"
echo -e "${GN}╚══════════════════════════════════════════════╝${CL}"
echo ""
echo -e " ${CM} App URL:   ${YW}http://${IP}${CL}"
echo -e " ${CM} App dir:   ${YW}${APP_DIR}${CL}"
echo -e " ${CM} Database:  ${YW}${APP_DIR}/data/settings.db${CL}"
echo -e " ${CM} Env file:  ${YW}${APP_DIR}/.env${CL}  (edit to set UPDATE_TOKEN)"
echo ""
