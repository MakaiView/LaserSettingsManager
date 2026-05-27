#!/usr/bin/env bash
# Laser Settings Tracker — Proxmox LXC creator
# Runs on the PROXMOX HOST
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/create_lxc.sh)"

source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/core.func)
load_functions

APP="Laser Settings Tracker"
NSAPP="laser-settings-tracker"
var_cpu=1
var_ram=1024
var_disk=8
var_os="ubuntu"
var_version="22.04"
var_unprivileged=1

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

if ! command -v whiptail &>/dev/null; then
  msg_error "whiptail is required — apt install whiptail"
  exit 1
fi

# ==============================================================================
# STORAGE SELECTION HELPER (adapted from build.func)
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
    msg_error "No storage found for '${CONTENT_LABEL}' — enable '${CONTENT}' content type in Datacenter → Storage"
    exit 1
  fi

  # Auto-select when only one option exists
  if [[ $((${#MENU[@]} / 3)) -eq 1 ]]; then
    STORAGE_RESULT="${STORAGE_MAP[${MENU[0]}]}"
    return 0
  fi

  local SELECTED
  SELECTED=$(whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Storage Pool: ${CONTENT_LABEL}" \
    --radiolist "\nWhich storage pool for ${CONTENT_LABEL}?\n(Spacebar to select)" \
    16 70 6 "${MENU[@]}" 3>&1 1>&2 2>&3) || exit 0

  SELECTED=$(echo "$SELECTED" | sed 's/[[:space:]]*$//')
  if [[ -z "$SELECTED" || -z "${STORAGE_MAP[$SELECTED]+_}" ]]; then
    msg_error "No storage selected"
    exit 1
  fi
  STORAGE_RESULT="${STORAGE_MAP[$SELECTED]}"
}

# ==============================================================================
# INTERACTIVE INSTALL MENU  (mirrors community-scripts flow)
# ==============================================================================
CHOICE=$(whiptail \
  --backtitle "Laser Settings Tracker Installer" \
  --title "Community-Scripts Options" \
  --ok-button "Select" --cancel-button "Exit Script" \
  --notags \
  --menu "\nChoose an option:\n Use TAB or Arrow keys to navigate, ENTER to select." \
  18 60 3 \
  "1" "Default Install" \
  "2" "Advanced Install" \
  3>&1 1>&2 2>&3) || { echo ""; exit 0; }

case "$CHOICE" in
1)
  echo -e "${TAB}${BL}Using Default Settings${CL}"
  if ! whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Default Settings" \
    --yesno "\nThe following default settings will be used:\n
  Hostname  : ${NSAPP}
  CPU Cores : ${var_cpu}
  RAM       : ${var_ram} MiB
  Disk      : ${var_disk} GiB
  OS        : Ubuntu ${var_version}
  Type      : Unprivileged LXC\n
Proceed?" \
    20 58; then
    exit 0
  fi
  ;;
2)
  echo -e "${TAB}${RD}Using Advanced Install${CL}"

  NEW_CPU=$(whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Advanced: CPU Cores" \
    --inputbox "\nEnter number of CPU cores (default: ${var_cpu}):" \
    10 52 "$var_cpu" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW_CPU" =~ ^[0-9]+$ && "$NEW_CPU" -ge 1 ]] && var_cpu="$NEW_CPU"

  NEW_RAM=$(whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Advanced: RAM (MiB)" \
    --inputbox "\nEnter RAM in MiB (default: ${var_ram}):" \
    10 52 "$var_ram" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW_RAM" =~ ^[0-9]+$ && "$NEW_RAM" -ge 256 ]] && var_ram="$NEW_RAM"

  NEW_DISK=$(whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Advanced: Disk Size (GiB)" \
    --inputbox "\nEnter disk size in GiB (default: ${var_disk}):" \
    10 52 "$var_disk" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW_DISK" =~ ^[0-9]+$ && "$NEW_DISK" -ge 4 ]] && var_disk="$NEW_DISK"

  NEW_HOST=$(whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Advanced: Hostname" \
    --inputbox "\nEnter container hostname (default: ${NSAPP}):" \
    10 52 "$NSAPP" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW_HOST" ]] && NSAPP="$NEW_HOST"

  if ! whiptail \
    --backtitle "Laser Settings Tracker Installer" \
    --title "Confirm Advanced Settings" \
    --yesno "\nConfirm the following settings:\n
  Hostname  : ${NSAPP}
  CPU Cores : ${var_cpu}
  RAM       : ${var_ram} MiB
  Disk      : ${var_disk} GiB
  OS        : Ubuntu ${var_version}
  Type      : Unprivileged LXC\n
Proceed?" \
    20 58; then
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
msg_ok "Template storage: ${TEMPLATE_STORAGE} | Container storage: ${ROOTFS_STORAGE}"

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
  msg_error "No Ubuntu ${var_version} template found — check Proxmox template sources"
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
# CREATE CONTAINER
# ==============================================================================
msg_info "Creating LXC container CT${CTID}"
if ! pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}" \
  --hostname "$NSAPP" \
  --memory "$var_ram" \
  --cores "$var_cpu" \
  --rootfs "${ROOTFS_STORAGE}:${var_disk}" \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged "$var_unprivileged" \
  --features nesting=1 \
  --onboot 1 \
  --start 0 \
  &>/dev/null; then
  msg_error "Failed to create container"
  exit 1
fi
msg_ok "Container CT${CTID} created"

# ==============================================================================
# START CONTAINER
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
  msg_error "Container did not get an IP after 60s — check DHCP on vmbr0"
  exit 1
fi
msg_ok "Network ready — ${IP}"

# ==============================================================================
# LOAD INSTALL FUNCTIONS (same pattern as build.func)
# Download install.func on host, export as FUNCTIONS_FILE_PATH.
# lxc-attach inherits exported env vars — install.sh sources it directly.
# ==============================================================================
msg_info "Downloading install functions"
FUNCTIONS_FILE_PATH="$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/install.func)"
if [[ -z "$FUNCTIONS_FILE_PATH" || ${#FUNCTIONS_FILE_PATH} -lt 100 ]]; then
  msg_error "Failed to download install.func"
  exit 1
fi
export FUNCTIONS_FILE_PATH
export APPLICATION="$APP"
export app="$NSAPP"
export VERBOSE="${VERBOSE:-no}"
msg_ok "Install functions ready"

# ==============================================================================
# RUN INSTALLER INSIDE CONTAINER
# lxc-attach (unlike pct exec) inherits the host's exported env vars,
# so FUNCTIONS_FILE_PATH is available inside the container.
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
echo -e "${TAB}${CM} Container : CT${CTID} (${NSAPP})"
echo -e "${TAB}${CM} URL       : ${YW}http://${IP}${CL}"
echo ""
echo -e " Open ${YW}http://${IP}${CL} in your browser to get started."
echo ""
