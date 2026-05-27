#!/usr/bin/env bash
# Laser Settings Tracker — LXC install script
# Runs INSIDE the LXC container via lxc-attach from create_lxc.sh
# FUNCTIONS_FILE_PATH is exported by create_lxc.sh and inherited via lxc-attach

# ==============================================================================
# LOAD FUNCTIONS
# install.func bootstraps curl if missing, then sources core.func itself.
# ==============================================================================
source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

# ==============================================================================
# NODE.JS 20  (setup_nodejs is provided by tools.func, sourced by update_os)
# ==============================================================================
msg_info "Installing Node.js 20"
NODE_VERSION="20" setup_nodejs
msg_ok "Installed Node.js $(node -v)"

# ==============================================================================
# PM2
# ==============================================================================
msg_info "Installing PM2"
$STD npm install -g pm2
msg_ok "Installed PM2"

# ==============================================================================
# NGINX
# ==============================================================================
msg_info "Installing Nginx"
$STD apt-get install -y nginx
msg_ok "Installed Nginx"

# ==============================================================================
# APPLICATION
# ==============================================================================
APP_DIR="/opt/laser-tracker"
REPO="https://github.com/MakaiView/LaserSettingsManager.git"

msg_info "Cloning Laser Settings Tracker"
$STD git clone "$REPO" "$APP_DIR"
echo "$(git -C "$APP_DIR" describe --tags --abbrev=0 2>/dev/null || git -C "$APP_DIR" rev-parse --short HEAD)" \
  > "/opt/${APPLICATION}_version.txt"
msg_ok "Cloned to ${APP_DIR}"

msg_info "Installing Node.js dependencies"
$STD npm install --production --prefix "$APP_DIR/app"
msg_ok "Dependencies installed"

msg_info "Creating data directories"
mkdir -p "$APP_DIR/data/uploads" "$APP_DIR/logs"
chmod 755 "$APP_DIR/data" "$APP_DIR/data/uploads"
msg_ok "Data directories created"

msg_info "Configuring environment"
cp "$APP_DIR/.env.example" "$APP_DIR/.env"
TOKEN=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
sed -i "s/changeme_set_a_real_token_here/$TOKEN/" "$APP_DIR/.env"
msg_ok "Environment configured"

# ==============================================================================
# NGINX REVERSE PROXY
# ==============================================================================
msg_info "Configuring Nginx"
cat >/etc/nginx/sites-available/laser-tracker <<'NGINX'
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
systemctl enable -q nginx
systemctl reload nginx
msg_ok "Nginx configured"

# ==============================================================================
# PM2 START & STARTUP
# ==============================================================================
msg_info "Starting application with PM2"
$STD pm2 start "$APP_DIR/app/ecosystem.config.js"
$STD pm2 save
msg_ok "Application started"

msg_info "Configuring PM2 startup"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root &>/dev/null
systemctl enable -q pm2-root 2>/dev/null || true
msg_ok "PM2 startup configured"

# ==============================================================================
# FINALIZE
# ==============================================================================
motd_ssh
customize
cleanup_lxc
