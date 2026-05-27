#!/usr/bin/env bash
# Copyright (c) 2024-2026 Makai View Media
# Author: MakaiView (Steve Robinson)
# License: MIT
# Source: https://github.com/MakaiView/LaserSettingsManager
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/create_lxc.sh)"

source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/core.func)
load_functions

APP="Laser Settings Tracker"
var_tags="${var_tags:-laser;maker}"
var_cpu="${var_cpu:-1}"
var_ram="${var_ram:-1024}"
var_disk="${var_disk:-8}"
var_os="${var_os:-ubuntu}"
var_version="${var_version:-22.04}"
var_unprivileged="${var_unprivileged:-1}"
var_hostname="${var_hostname:-laser-tracker}"
var_brg="${var_brg:-vmbr0}"
var_net="${var_net:-dhcp}"
var_ssh="${var_ssh:-no}"

INSTALL_URL="https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/install.sh"

# ==============================================================================
# HEADER
# ==============================================================================
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

# ==============================================================================
# PRE-FLIGHT
# ==============================================================================
if ! command -v pveversion &>/dev/null; then
  msg_error "This script must run on a Proxmox VE host"
  exit 1
fi

# ==============================================================================
# STORAGE SELECTION (adapted from build.func)
# ==============================================================================
select_storage() {
  local CLASS=$1 CONTENT CONTENT_LABEL
  case $CLASS in
    container) CONTENT='rootdir';  CONTENT_LABEL='Container rootfs' ;;
    template)  CONTENT='vztmpl';   CONTENT_LABEL='Container template' ;;
  esac

  declare -A STORAGE_MAP
  local -a MENU=()

  while read -r TAG TYPE _ TOTAL USED FREE _; do
    [[ -n "$TAG" && -n "$TYPE" ]] || continue
    local DISPLAY="${TAG} (${TYPE})"
    local USED_FMT FREE_FMT
    USED_FMT=$(numfmt --to=iec --from-unit=1024 --format %.1f <<<"${USED:-0}" 2>/dev/null || echo "?")
    FREE_FMT=$(numfmt --to=iec --from-unit=1024 --format %.1f <<<"${FREE:-0}" 2>/dev/null || echo "?")
    STORAGE_MAP["$DISPLAY"]="$TAG"
    MENU+=("$DISPLAY" "Free: ${FREE_FMT}B  Used: ${USED_FMT}B" "OFF")
  done < <(pvesm status -content "$CONTENT" 2>/dev/null | awk 'NR>1')

  if [[ ${#MENU[@]} -eq 0 ]]; then
    msg_error "No storage for '${CONTENT_LABEL}' — enable '${CONTENT}' content type in Datacenter → Storage"
    exit 1
  fi

  if [[ $((${#MENU[@]} / 3)) -eq 1 ]]; then
    STORAGE_RESULT="${STORAGE_MAP[${MENU[0]}]}"
    return 0
  fi

  local SELECTED
  SELECTED=$(whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Storage Pool: ${CONTENT_LABEL}" \
    --radiolist "\nSelect storage for ${CONTENT_LABEL}:\n(Spacebar to select)" \
    16 70 6 "${MENU[@]}" 3>&1 1>&2 2>&3) || exit 0
  SELECTED=$(echo "$SELECTED" | sed 's/[[:space:]]*$//')
  if [[ -z "$SELECTED" || -z "${STORAGE_MAP[$SELECTED]+_}" ]]; then
    msg_error "No storage selected"
    exit 1
  fi
  STORAGE_RESULT="${STORAGE_MAP[$SELECTED]}"
}

# ==============================================================================
# MAIN MENU
# ==============================================================================
CHOICE=$(whiptail \
  --backtitle "Laser Settings Tracker" \
  --title "Community-Scripts Options" \
  --ok-button "Select" --cancel-button "Exit Script" \
  --notags \
  --menu "\nChoose an option:\n Use TAB or Arrow keys to navigate, ENTER to select." \
  16 60 2 \
  "1" "Default Install" \
  "2" "Advanced Install" \
  3>&1 1>&2 2>&3) || { echo ""; exit 0; }

case "$CHOICE" in
# ── DEFAULT INSTALL ──────────────────────────────────────────────────────────
1)
  echo -e "${TAB}${BL}Using Default Settings${CL}"
  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Default Settings" \
    --yesno "\nThe following default settings will be used:\n
  Hostname  : ${var_hostname}
  CPU Cores : ${var_cpu}
  RAM       : ${var_ram} MiB
  Disk      : ${var_disk} GiB
  OS        : Ubuntu ${var_version}
  Network   : DHCP on ${var_brg}
  Type      : Unprivileged LXC\n
Proceed?" \
    22 58; then
    exit 0
  fi
  ;;

# ── ADVANCED INSTALL ─────────────────────────────────────────────────────────
2)
  echo -e "${TAB}${RD}Using Advanced Install${CL}"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Hostname" \
    --inputbox "\nContainer hostname:" 10 52 "$var_hostname" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW" ]] && var_hostname="$NEW"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "CPU Cores" \
    --inputbox "\nNumber of CPU cores:" 10 52 "$var_cpu" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 1 ]] && var_cpu="$NEW"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "RAM (MiB)" \
    --inputbox "\nRAM in MiB (e.g. 1024, 2048):" 10 52 "$var_ram" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 256 ]] && var_ram="$NEW"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Disk Size (GiB)" \
    --inputbox "\nDisk size in GiB:" 10 52 "$var_disk" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 4 ]] && var_disk="$NEW"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Network Bridge" \
    --inputbox "\nNetwork bridge (e.g. vmbr0, vmbr1):" 10 52 "$var_brg" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW" ]] && var_brg="$NEW"

  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "VLAN Tag" \
    --inputbox "\nVLAN tag (1-4094, leave blank for none):" 10 52 "" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 1 && "$NEW" -le 4094 ]] && var_vlan="$NEW"

  whiptail --backtitle "Laser Settings Tracker" --title "Enable SSH" \
    --yesno "\nEnable SSH server in the container?" 10 52 3>&1 1>&2 2>&3 \
    && var_ssh="yes" || var_ssh="no"

  if [[ "$var_ssh" == "yes" ]]; then
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "SSH Public Key" \
      --inputbox "\nPaste your SSH public key (optional):" 10 72 "" 3>&1 1>&2 2>&3) || exit 0
    [[ -n "$NEW" ]] && var_ssh_authorized_key="$NEW"
  fi

  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Confirm Advanced Settings" \
    --yesno "\nConfirm settings:\n
  Hostname  : ${var_hostname}
  CPU Cores : ${var_cpu}
  RAM       : ${var_ram} MiB
  Disk      : ${var_disk} GiB
  Bridge    : ${var_brg}${var_vlan:+  (VLAN ${var_vlan})}
  SSH       : ${var_ssh}
  Type      : Unprivileged LXC\n
Proceed?" \
    24 58; then
    exit 0
  fi
  ;;
esac

# ==============================================================================
# STORAGE SELECTION
# ==============================================================================
msg_info "Detecting available storages"
select_storage template;  TEMPLATE_STORAGE="$STORAGE_RESULT"
select_storage container; ROOTFS_STORAGE="$STORAGE_RESULT"
msg_ok "Template: ${TEMPLATE_STORAGE} | Container: ${ROOTFS_STORAGE}"

# ==============================================================================
# CTID
# ==============================================================================
msg_info "Allocating container ID"
CTID=$(pvesh get /cluster/nextid)
msg_ok "Container ID: ${CTID}"

# ==============================================================================
# TEMPLATE
# ==============================================================================
msg_info "Updating template list"
pveam update &>/dev/null
msg_ok "Template list updated"

msg_info "Resolving Ubuntu ${var_version} template"
OS_TEMPLATE=$(pveam available --section system 2>/dev/null \
  | awk '{print $2}' | grep "^ubuntu-${var_version}" | sort -V | tail -1)
if [[ -z "$OS_TEMPLATE" ]]; then
  msg_error "No Ubuntu ${var_version} template found"
  exit 1
fi
msg_ok "Template: ${OS_TEMPLATE}"

if [[ ! -f "/var/lib/vz/template/cache/${OS_TEMPLATE}" ]]; then
  msg_info "Downloading ${OS_TEMPLATE}"
  if ! pveam download "$TEMPLATE_STORAGE" "$OS_TEMPLATE"; then
    msg_error "Template download failed"
    exit 1
  fi
  msg_ok "Template downloaded"
else
  msg_ok "Template already present"
fi

# ==============================================================================
# BUILD NETWORK OPTIONS
# ==============================================================================
NET_OPT="name=eth0,bridge=${var_brg},ip=dhcp"
[[ "${var_net:-dhcp}" == "dhcp" ]] || NET_OPT="name=eth0,bridge=${var_brg},ip=${var_ip}/${var_cidr},gw=${var_gateway}"
[[ -n "${var_vlan:-}" ]] && NET_OPT="${NET_OPT},tag=${var_vlan}"
[[ -n "${var_mtu:-}" ]]  && NET_OPT="${NET_OPT},mtu=${var_mtu}"
[[ -n "${var_mac:-}" ]]  && NET_OPT="${NET_OPT},hwaddr=${var_mac}"

# ==============================================================================
# CREATE CONTAINER
# ==============================================================================
msg_info "Creating LXC container CT${CTID}"
PCT_ARGS=(
  "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}"
  --hostname "$var_hostname"
  --memory   "$var_ram"
  --cores    "$var_cpu"
  --rootfs   "${ROOTFS_STORAGE}:${var_disk}"
  --net0     "$NET_OPT"
  --unprivileged "$var_unprivileged"
  --features nesting=1
  --onboot 1
  --start 0
)
[[ -n "${var_tags:-}" ]] && PCT_ARGS+=(--tags "$var_tags")

if ! pct create "${PCT_ARGS[@]}" &>/dev/null; then
  msg_error "Failed to create container"
  exit 1
fi

# SSH configuration
if [[ "${var_ssh:-no}" == "yes" ]]; then
  pct set "$CTID" --ssh-public-keys <(echo "${var_ssh_authorized_key:-}") &>/dev/null || true
fi

msg_ok "Container CT${CTID} created"

# ==============================================================================
# START
# ==============================================================================
msg_info "Starting container"
if ! pct start "$CTID"; then
  msg_error "Failed to start container CT${CTID}"
  exit 1
fi
msg_ok "Container started"

# ==============================================================================
# WAIT FOR NETWORK
# ==============================================================================
msg_info "Waiting for network"
IP=""
for i in {1..30}; do
  IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
  [[ -n "$IP" ]] && break
  sleep 2
done
if [[ -z "$IP" ]]; then
  msg_error "No IP address after 60s — check DHCP on ${var_brg}"
  exit 1
fi
msg_ok "Network ready — ${IP}"

# ==============================================================================
# LOAD INSTALL FUNCTIONS  (same pattern as build.func)
# Exports install.func content as FUNCTIONS_FILE_PATH.
# lxc-attach inherits all exported env vars — install.sh sources it directly.
# ==============================================================================
msg_info "Downloading install functions"
FUNCTIONS_FILE_PATH="$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
if [[ -z "$FUNCTIONS_FILE_PATH" || ${#FUNCTIONS_FILE_PATH} -lt 100 ]]; then
  msg_error "Failed to download install.func"
  exit 1
fi
export FUNCTIONS_FILE_PATH
export APPLICATION="$APP"
export app="${var_hostname}"
export VERBOSE="${var_verbose:-no}"
export SSH_ROOT="${var_ssh:-no}"
msg_ok "Install functions ready"

# ==============================================================================
# RUN INSTALLER  (lxc-attach inherits exported env vars; pct exec does not)
# ==============================================================================
msg_info "Running installer inside CT${CTID}"
echo ""
lxc-attach -n "$CTID" -- bash -c "$(curl -fsSL ${INSTALL_URL})"
INSTALL_EXIT=$?
echo ""
if [[ "$INSTALL_EXIT" -ne 0 ]]; then
  msg_error "Installer exited with code ${INSTALL_EXIT}"
  exit 1
fi
msg_ok "Installation complete"

# ==============================================================================
# DONE
# ==============================================================================
echo ""
echo -e "${GN}╔══════════════════════════════════════════════╗${CL}"
echo -e "${GN}║     Laser Settings Tracker — Ready!        ║${CL}"
echo -e "${GN}╚══════════════════════════════════════════════╝${CL}"
echo ""
echo -e "${TAB}${CM} Container : CT${CTID} (${var_hostname})"
echo -e "${TAB}${CM} URL       : ${YW}http://${IP}${CL}"
echo ""
echo -e " Open ${YW}http://${IP}${CL} in your browser to get started."
echo ""
