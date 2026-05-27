#!/usr/bin/env bash
# Copyright (c) 2024-2026 Makai View Media
# Author: MakaiView (Steve Robinson)
# License: MIT
# Source: https://github.com/MakaiView/LaserSettingsManager

# Full install log — captured before anything runs, regardless of VERBOSE setting
INSTALL_LOG="/var/log/laser-tracker-install.log"
mkdir -p /var/log
exec > >(tee -a "$INSTALL_LOG") 2>&1
printf "=== Laser Settings Tracker — Container Install Log ===\n"
printf "=== Started : %s ===\n\n" "$(date)"

# Force verbose so $STD passes all command output to the log
VERBOSE="yes"

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt-get install -y \
  git \
  nginx
msg_ok "Installed Dependencies"

NODE_VERSION="22" setup_nodejs

msg_info "Installing Laser Settings Tracker"
$STD git clone https://github.com/MakaiView/LaserSettingsManager.git /opt/laser-tracker
$STD npm install --production --prefix /opt/laser-tracker/app
mkdir -p /opt/laser-tracker/data/uploads /opt/laser-tracker/logs
chmod 755 /opt/laser-tracker/data /opt/laser-tracker/data/uploads
echo "$(git -C /opt/laser-tracker rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
  >/opt/laser-tracker_version.txt
msg_ok "Installed Laser Settings Tracker"

msg_info "Configuring Environment"
cp /opt/laser-tracker/.env.example /opt/laser-tracker/.env
TOKEN=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
sed -i "s/changeme_set_a_real_token_here/$TOKEN/" /opt/laser-tracker/.env
msg_ok "Configured Environment"

msg_info "Configuring Nginx"
cat <<'EOF' >/etc/nginx/sites-available/laser-tracker
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
EOF
ln -sf /etc/nginx/sites-available/laser-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
$STD nginx -t
systemctl enable -q --now nginx
msg_ok "Configured Nginx"

msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/laser-tracker.service
[Unit]
Description=Laser Settings Tracker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/laser-tracker/app
EnvironmentFile=/opt/laser-tracker/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl enable -q --now laser-tracker
msg_ok "Created Service"

printf "\n=== Install complete : %s ===\n" "$(date)"
printf "=== Log saved at    : %s ===\n" "$INSTALL_LOG"

motd_ssh
customize
cleanup_lxc
