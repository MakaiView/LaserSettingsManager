#!/usr/bin/env bash
# Laser Settings Tracker — Proxmox LXC creator
# Runs on the PROXMOX HOST
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/create_lxc.sh)"
set -euo pipefail

YW=$(echo "\033[33m")
GN=$(echo "\033[1;92m")
RD=$(echo "\033[01;31m")
BL=$(echo "\033[36m")
CL=$(echo "\033[m")
BFR="\\r\\033[K"
HOLD="-"
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"

msg_info()  { echo -ne " ${HOLD} ${YW}${1}...${CL}"; }
msg_ok()    { echo -e "${BFR} ${CM} ${GN}${1}${CL}"; }
msg_error() { echo -e "${BFR} ${CROSS} ${RD}${1}${CL}"; exit 1; }

# ── Verify running on Proxmox host ───────────────────────────────────────────
if ! command -v pveversion &>/dev/null; then
  msg_error "This script must run on a Proxmox VE host"
fi

echo ""
echo -e "${BL}╔══════════════════════════════════════════════╗${CL}"
echo -e "${BL}║       Laser Settings Tracker Installer      ║${CL}"
echo -e "${BL}╚══════════════════════════════════════════════╝${CL}"
echo ""

# ── Config ───────────────────────────────────────────────────────────────────
CTID=$(pvesh get /cluster/nextid)
TEMPLATE_STORAGE="local"
ROOTFS_STORAGE="local-lvm"
RAM=1024
DISK=8
CORES=1
HOSTNAME="laser-tracker"

# ── Download template if needed ───────────────────────────────────────────────
msg_info "Updating template list"
pveam update &>/dev/null
msg_ok "Template list updated"

msg_info "Resolving Ubuntu 22.04 template"
OS_TEMPLATE=$(pveam available --section system 2>/dev/null \
  | awk '{print $2}' | grep '^ubuntu-22.04' | sort -V | tail -1)
if [ -z "$OS_TEMPLATE" ]; then
  msg_error "No Ubuntu 22.04 template found in pveam — check your Proxmox template sources"
fi
TEMPLATE_PATH="/var/lib/vz/template/cache/${OS_TEMPLATE}"
msg_ok "Using template: ${OS_TEMPLATE}"

if [ ! -f "$TEMPLATE_PATH" ]; then
  msg_info "Downloading ${OS_TEMPLATE}"
  echo ""
  pveam download "$TEMPLATE_STORAGE" "$OS_TEMPLATE" \
    || msg_error "Failed to download template"
  msg_ok "Template downloaded"
else
  msg_ok "Template already present"
fi

# ── Create LXC ───────────────────────────────────────────────────────────────
msg_info "Creating LXC container (CT${CTID})"
pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}" \
  --hostname "$HOSTNAME" \
  --memory "$RAM" \
  --cores "$CORES" \
  --rootfs "${ROOTFS_STORAGE}:${DISK}" \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
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
for i in {1..20}; do
  IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
  if [ -n "$IP" ]; then break; fi
  sleep 2
done
if [ -z "$IP" ]; then
  msg_error "Container did not get a network address in time. Check DHCP."
fi
msg_ok "Network ready — IP: ${IP}"

# ── Run install script inside container ───────────────────────────────────────
msg_info "Running installer inside container"
pct exec "$CTID" -- bash -c \
  "curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/install.sh | bash" \
  2>&1
msg_ok "Install complete"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GN}╔══════════════════════════════════════════════╗${CL}"
echo -e "${GN}║         Laser Tracker — Ready!              ║${CL}"
echo -e "${GN}╚══════════════════════════════════════════════╝${CL}"
echo ""
echo -e " ${CM} Container: CT${CTID} (${HOSTNAME})"
echo -e " ${CM} IP:        ${YW}${IP}${CL}"
echo -e " ${CM} URL:       ${YW}http://${IP}${CL}"
echo ""
echo -e " Open ${YW}http://${IP}${CL} in your browser to get started."
echo ""
