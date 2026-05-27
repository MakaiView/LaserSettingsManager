#!/usr/bin/env bash
# Laser Settings Tracker — Proxmox LXC creator
# Runs on the PROXMOX HOST
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/create_lxc.sh)"

source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/core.func)
load_functions
catch_errors

APP="Laser Settings Tracker"
var_cpu="1"
var_ram="1024"
var_disk="8"
var_os="ubuntu"
var_version="22.04"
var_unprivileged="1"

TEMPLATE_STORAGE="local"
ROOTFS_STORAGE="local-lvm"
INSTALL_URL="https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/install.sh"

# ── Header ────────────────────────────────────────────────────────────────────
clear
echo -e "${BL}
  _                          _____      _   _   _
 | |    __ _ ___  ___ _ __  / ____|    | | | | (_)
 | |   / _\` / __|/ _ \\ '__| \\__ \\  ___| |_| |_ _ _ __   __ _ ___
 | |__| (_| \\__ \\  __/ |    ___) |/ _ \\ __| __| | '_ \\ / _\` / __|
 |_____\\__,_|___/\\___|_|   |____/ \\___/\\__|\\__|_| | | | (_| \\__ \\
                                                   |_| |_|\\__, |___/
                                 Tracker                   __/ |
                                                          |___/
${CL}"

msg_ok "Using: ${APP}"
echo -e "${TAB}${GN}CPU:${CL}   ${var_cpu} core(s)"
echo -e "${TAB}${GN}RAM:${CL}   ${var_ram} MB"
echo -e "${TAB}${GN}Disk:${CL}  ${var_disk} GB"
echo -e "${TAB}${GN}OS:${CL}    Ubuntu ${var_version}"
echo ""

# ── Verify running on Proxmox host ───────────────────────────────────────────
if ! command -v pveversion &>/dev/null; then
  msg_error "This script must run on a Proxmox VE host"
fi

# ── Resolve next CTID ────────────────────────────────────────────────────────
msg_info "Allocating container ID"
CTID=$(pvesh get /cluster/nextid)
msg_ok "Container ID: ${CTID}"

# ── Resolve Ubuntu 22.04 template ────────────────────────────────────────────
msg_info "Updating template list"
pveam update &>/dev/null
msg_ok "Template list updated"

msg_info "Resolving Ubuntu ${var_version} template"
OS_TEMPLATE=$(pveam available --section system 2>/dev/null \
  | awk '{print $2}' | grep "^ubuntu-${var_version}" | sort -V | tail -1)
if [ -z "$OS_TEMPLATE" ]; then
  msg_error "No Ubuntu ${var_version} template found — check Proxmox template sources"
fi
TEMPLATE_PATH="/var/lib/vz/template/cache/${OS_TEMPLATE}"
msg_ok "Template: ${OS_TEMPLATE}"

# ── Download template if needed ───────────────────────────────────────────────
if [ ! -f "$TEMPLATE_PATH" ]; then
  msg_info "Downloading ${OS_TEMPLATE}"
  if ! pveam download "$TEMPLATE_STORAGE" "$OS_TEMPLATE"; then
    msg_error "Failed to download template — check storage content types and network"
  fi
  msg_ok "Template downloaded"
else
  msg_ok "Template already present"
fi

# ── Create LXC ───────────────────────────────────────────────────────────────
msg_info "Creating LXC container CT${CTID}"
pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}" \
  --hostname laser-tracker \
  --memory "$var_ram" \
  --cores "$var_cpu" \
  --rootfs "${ROOTFS_STORAGE}:${var_disk}" \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged "$var_unprivileged" \
  --features nesting=1 \
  --onboot 1 \
  --start 0 \
  &>/dev/null
msg_ok "Container CT${CTID} created"

# ── Start container ───────────────────────────────────────────────────────────
msg_info "Starting container"
pct start "$CTID"
sleep 5
msg_ok "Container started"

# ── Wait for network ──────────────────────────────────────────────────────────
msg_info "Waiting for network"
IP=""
for i in {1..20}; do
  IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
  [ -n "$IP" ] && break
  sleep 2
done
if [ -z "$IP" ]; then
  msg_error "Container did not get a network address — check DHCP"
fi
msg_ok "Network ready — ${IP}"

# ── Run installer inside container ───────────────────────────────────────────
msg_info "Running installer inside CT${CTID}"
lxc-attach -n "$CTID" -- bash -c "$(curl -fsSL ${INSTALL_URL})"
msg_ok "Installation complete"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GN}╔══════════════════════════════════════════════╗${CL}"
echo -e "${GN}║     Laser Settings Tracker — Ready!        ║${CL}"
echo -e "${GN}╚══════════════════════════════════════════════╝${CL}"
echo ""
echo -e "${TAB}${CM} Container: CT${CTID}"
echo -e "${TAB}${CM} URL:       ${YW}http://${IP}${CL}"
echo ""
echo -e " Open ${YW}http://${IP}${CL} in your browser to get started."
echo ""
