#!/usr/bin/env bash
# Copyright (c) 2024-2026 Makai View Media
# Author: MakaiView (Steve Robinson)
# License: MIT
# Source: https://github.com/MakaiView/LaserSettingsManager
# Usage: bash -c "$(curl -fsSL https://raw.githubusercontent.com/MakaiView/LaserSettingsManager/master/install/create_lxc.sh)"

source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/core.func)
load_functions

APP="Laser Settings Tracker"
NSAPP="laser-tracker"
DEFAULTS_DIR="/usr/local/community-scripts/defaults"
USER_DEFAULTS_FILE="/usr/local/community-scripts/default.vars"
APP_DEFAULTS_FILE="${DEFAULTS_DIR}/${NSAPP}.vars"

# Built-in defaults
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
var_ipv6_method="${var_ipv6_method:-none}"
var_ssh="${var_ssh:-no}"
var_pw="${var_pw:-}"
var_verbose="${var_verbose:-no}"
var_nesting="${var_nesting:-1}"

# Default timezone to host's timezone if not explicitly set
_HOST_TZ=$(cat /etc/timezone 2>/dev/null \
  || timedatectl show --property=Timezone --value 2>/dev/null \
  || echo "UTC")
var_timezone="${var_timezone:-$_HOST_TZ}"

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
# STORAGE SELECTION
# ==============================================================================
select_storage() {
  local CLASS=$1 CONTENT CONTENT_LABEL
  case $CLASS in
    container) CONTENT='rootdir'; CONTENT_LABEL='Container rootfs' ;;
    template)  CONTENT='vztmpl';  CONTENT_LABEL='Container template' ;;
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
# LOAD / SAVE DEFAULTS
# ==============================================================================
load_defaults_file() {
  local FILE="$1"
  [[ -f "$FILE" ]] || return 1
  while IFS='=' read -r KEY VALUE; do
    KEY="${KEY%%#*}"           # strip inline comments
    KEY="${KEY//[[:space:]]/}" # strip whitespace
    [[ -z "$KEY" ]] && continue
    [[ "$KEY" =~ ^var_ ]] || continue
    VALUE="${VALUE#"${VALUE%%[![:space:]]*}"}" # ltrim
    VALUE="${VALUE%"${VALUE##*[![:space:]]}"}" # rtrim
    declare -g "$KEY"="$VALUE"
  done <"$FILE"
}

save_defaults_file() {
  local FILE="$1"
  mkdir -p "$(dirname "$FILE")"
  cat <<EOF >"$FILE"
# Laser Settings Tracker — saved $(date)
var_hostname=${var_hostname}
var_cpu=${var_cpu}
var_ram=${var_ram}
var_disk=${var_disk}
var_brg=${var_brg}
var_net=${var_net}
var_gateway=${var_gateway:-}
var_ip=${var_ip:-}
var_cidr=${var_cidr:-}
var_ipv6_method=${var_ipv6_method}
var_ipv6=${var_ipv6:-}
var_ipv6_cidr=${var_ipv6_cidr:-}
var_ipv6_gateway=${var_ipv6_gateway:-}
var_vlan=${var_vlan:-}
var_mtu=${var_mtu:-}
var_mac=${var_mac:-}
var_ns=${var_ns:-}
var_pw=${var_pw:-}
var_ssh=${var_ssh}
var_ssh_authorized_key=${var_ssh_authorized_key:-}
var_unprivileged=${var_unprivileged}
var_tags=${var_tags}
var_verbose=${var_verbose}
var_timezone=${var_timezone:-}
var_container_storage=${var_container_storage:-}
var_template_storage=${var_template_storage:-}
EOF
}

# ==============================================================================
# SETTINGS SUMMARY
# ==============================================================================
settings_summary() {
  local NET_DISPLAY="DHCP"
  [[ "${var_net:-dhcp}" != "dhcp" ]] && NET_DISPLAY="Static ${var_ip:-?}/${var_cidr:-?}  gw ${var_gateway:-?}"
  local PRIV_DISPLAY="Unprivileged"
  [[ "${var_unprivileged:-1}" == "0" ]] && PRIV_DISPLAY="Privileged"
  local PW_DISPLAY="${var_pw:+set (hidden)}${var_pw:-none (auto-login)}"
  cat <<EOF
  Hostname  : ${var_hostname}
  CPU Cores : ${var_cpu}
  RAM       : ${var_ram} MiB
  Disk      : ${var_disk} GiB
  OS        : Ubuntu ${var_version}
  Bridge    : ${var_brg}${var_vlan:+  (VLAN ${var_vlan})}
  IPv4      : ${NET_DISPLAY}
  IPv6      : ${var_ipv6_method}
  DNS       : ${var_ns:-host default}
  Password  : ${PW_DISPLAY}
  SSH       : ${var_ssh}
  Type      : ${PRIV_DISPLAY} LXC
  Tags      : ${var_tags}
  Timezone  : ${var_timezone:-host default}
  Verbose   : ${var_verbose}
EOF
}

# ==============================================================================
# ADVANCED SETTINGS WIZARD  (19 steps matching community-scripts)
# ==============================================================================
advanced_settings() {
  local NEW

  # 1. Hostname
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Hostname" \
    --inputbox "\nContainer hostname:" 10 58 "$var_hostname" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW" ]] && var_hostname="$NEW"

  # 2. CPU
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "CPU Cores" \
    --inputbox "\nNumber of CPU cores:" 10 52 "$var_cpu" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 1 ]] && var_cpu="$NEW"

  # 3. RAM
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "RAM (MiB)" \
    --inputbox "\nRAM in MiB (e.g. 1024, 2048):" 10 52 "$var_ram" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 256 ]] && var_ram="$NEW"

  # 4. Disk
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Disk Size (GiB)" \
    --inputbox "\nDisk size in GiB:" 10 52 "$var_disk" 3>&1 1>&2 2>&3) || exit 0
  [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 4 ]] && var_disk="$NEW"

  # 5. Network bridge
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Network Bridge" \
    --inputbox "\nNetwork bridge (e.g. vmbr0, vmbr1):" 10 58 "$var_brg" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW" ]] && var_brg="$NEW"

  # 6. IPv4 method
  local IPV4_CHOICE
  IPV4_CHOICE=$(whiptail --backtitle "Laser Settings Tracker" --title "IPv4 Configuration" \
    --notags --menu "\nSelect IPv4 configuration method:" 12 58 2 \
    "dhcp"   "DHCP — automatic IP assignment" \
    "static" "Static IP — fixed address" \
    3>&1 1>&2 2>&3) || exit 0
  var_net="${IPV4_CHOICE:-dhcp}"

  if [[ "$var_net" == "static" ]]; then
    local IPV4_DEFAULT="${var_ip:-}/${var_cidr:-24}"
    [[ "$IPV4_DEFAULT" == "/" ]] && IPV4_DEFAULT=""
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Static IPv4 Address" \
      --inputbox "\nIPv4 address with CIDR prefix\n(e.g. 192.168.1.100/24):" 11 60 "$IPV4_DEFAULT" 3>&1 1>&2 2>&3) || exit 0
    if [[ -n "$NEW" && "$NEW" == *"/"* ]]; then
      var_ip="${NEW%/*}"
      var_cidr="${NEW#*/}"
    fi
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "IPv4 Gateway" \
      --inputbox "\nDefault gateway (e.g. 192.168.1.1):" 10 60 "${var_gateway:-}" 3>&1 1>&2 2>&3) || exit 0
    [[ -n "$NEW" ]] && var_gateway="$NEW"
  fi

  # 7. IPv6 method
  local IPV6_CHOICE
  IPV6_CHOICE=$(whiptail --backtitle "Laser Settings Tracker" --title "IPv6 Configuration" \
    --notags --menu "\nSelect IPv6 configuration method:" 18 64 5 \
    "none"    "None — stack active, no address configured" \
    "auto"    "SLAAC — stateless auto-configuration" \
    "dhcp"    "DHCPv6 — stateful, requires DHCPv6 server" \
    "static"  "Static — manual IPv6 address" \
    "disable" "Disable — IPv6 completely off at kernel level" \
    3>&1 1>&2 2>&3) || exit 0
  var_ipv6_method="${IPV6_CHOICE:-none}"

  if [[ "$var_ipv6_method" == "static" ]]; then
    local IPV6_DEFAULT="${var_ipv6:-}/${var_ipv6_cidr:-64}"
    [[ "$IPV6_DEFAULT" == "/" ]] && IPV6_DEFAULT=""
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Static IPv6 Address" \
      --inputbox "\nIPv6 address with prefix (e.g. 2001:db8::100/64):" 10 68 "$IPV6_DEFAULT" 3>&1 1>&2 2>&3) || exit 0
    if [[ -n "$NEW" && "$NEW" == *"/"* ]]; then
      var_ipv6="${NEW%/*}"
      var_ipv6_cidr="${NEW#*/}"
    fi
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "IPv6 Gateway" \
      --inputbox "\nIPv6 gateway (e.g. 2001:db8::1):" 10 64 "${var_ipv6_gateway:-}" 3>&1 1>&2 2>&3) || exit 0
    [[ -n "$NEW" ]] && var_ipv6_gateway="$NEW"
  fi

  # 8. VLAN
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "VLAN Tag" \
    --inputbox "\nVLAN tag 1–4094 (leave blank for none):" 10 52 "${var_vlan:-}" 3>&1 1>&2 2>&3) || exit 0
  if [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 1 && "$NEW" -le 4094 ]]; then
    var_vlan="$NEW"
  else
    var_vlan=""
  fi

  # 9. MTU
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "MTU" \
    --inputbox "\nMTU size (leave blank for default 1500):" 10 52 "${var_mtu:-}" 3>&1 1>&2 2>&3) || exit 0
  if [[ "$NEW" =~ ^[0-9]+$ && "$NEW" -ge 68 && "$NEW" -le 9000 ]]; then
    var_mtu="$NEW"
  else
    var_mtu=""
  fi

  # 10. MAC address
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "MAC Address" \
    --inputbox "\nMAC address (leave blank to auto-generate):" 10 68 "${var_mac:-}" 3>&1 1>&2 2>&3) || exit 0
  var_mac="${NEW:-}"

  # 11. DNS nameserver
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "DNS Nameserver" \
    --inputbox "\nDNS nameserver IP (leave blank for host default)\ne.g. 1.1.1.1 or 8.8.8.8:" 11 62 "${var_ns:-}" 3>&1 1>&2 2>&3) || exit 0
  var_ns="${NEW:-}"

  # 12. Root password
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Root Password" \
    --passwordbox "\nRoot password for console access.\n(Leave blank for passwordless auto-login):" 11 62 "${var_pw:-}" 3>&1 1>&2 2>&3) || exit 0
  var_pw="${NEW:-}"

  # 13. SSH
  if whiptail --backtitle "Laser Settings Tracker" --title "Enable SSH" \
    --yesno "\nEnable SSH server in the container?" 10 52 3>&1 1>&2 2>&3; then
    var_ssh="yes"
    NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "SSH Public Key" \
      --inputbox "\nPaste your SSH public key (optional):" 10 76 "${var_ssh_authorized_key:-}" 3>&1 1>&2 2>&3) || exit 0
    [[ -n "$NEW" ]] && var_ssh_authorized_key="$NEW" || var_ssh_authorized_key=""
  else
    var_ssh="no"
  fi

  # 14. Container type
  if whiptail --backtitle "Laser Settings Tracker" --title "Container Type" \
    --defaultno \
    --yesno "\nUse PRIVILEGED container?\n\nUnprivileged is recommended (more secure).\nChoose Yes only if you need hardware access\nor legacy kernel module support." \
    14 60 3>&1 1>&2 2>&3; then
    var_unprivileged=0
  else
    var_unprivileged=1
  fi

  # 15. Verbose output
  if whiptail --backtitle "Laser Settings Tracker" --title "Verbose Mode" \
    --yesno "\nEnable verbose output during installation?\n(Shows all commands as they run)" \
    10 58 3>&1 1>&2 2>&3; then
    var_verbose="yes"
  else
    var_verbose="no"
  fi

  # 16. Tags
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Container Tags" \
    --inputbox "\nContainer tags (semicolon-separated, no spaces):" 10 58 "$var_tags" 3>&1 1>&2 2>&3) || exit 0
  [[ -n "$NEW" ]] && var_tags="$NEW"

  # 17. Timezone
  NEW=$(whiptail --backtitle "Laser Settings Tracker" --title "Timezone" \
    --inputbox "\nTimezone in TZ format (leave blank for host timezone)\ne.g. America/Denver  America/New_York  UTC:" 11 68 "${var_timezone:-}" 3>&1 1>&2 2>&3) || exit 0
  var_timezone="${NEW:-}"

  # 18 & 19. Storage (template + container) — prompts appear after wizard
  # var_template_storage and var_container_storage override select_storage() if set
}

# ==============================================================================
# MAIN MENU  (5-item community-scripts style)
# ==============================================================================
USER_DEF_LABEL="User Defaults"
APP_DEF_LABEL="App Defaults"
[[ ! -f "$USER_DEFAULTS_FILE" ]] && USER_DEF_LABEL="User Defaults    (none saved)"
[[ ! -f "$APP_DEFAULTS_FILE"  ]] && APP_DEF_LABEL="App Defaults     (none saved)"

CHOICE=$(whiptail \
  --backtitle "Laser Settings Tracker" \
  --title "Community-Scripts Options" \
  --ok-button "Select" --cancel-button "Exit Script" \
  --notags \
  --menu "\nChoose an option:\n Use TAB or Arrow keys to navigate, ENTER to select." \
  20 64 5 \
  "1" "Default Settings" \
  "2" "Advanced Settings" \
  "3" "$USER_DEF_LABEL" \
  "4" "$APP_DEF_LABEL" \
  "5" "Settings Menu" \
  3>&1 1>&2 2>&3) || { echo ""; exit 0; }

case "$CHOICE" in
# ── DEFAULT INSTALL ──────────────────────────────────────────────────────────
1)
  echo -e "${TAB}${BL}Using Default Settings${CL}"
  SUMMARY=$(settings_summary)
  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Default Settings" \
    --yesno "\nThe following default settings will be used:\n\n${SUMMARY}\nProceed?" \
    28 64; then
    exit 0
  fi
  ;;

# ── ADVANCED INSTALL ─────────────────────────────────────────────────────────
2)
  echo -e "${TAB}${RD}Using Advanced Settings${CL}"
  advanced_settings
  SUMMARY=$(settings_summary)
  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Confirm Advanced Settings" \
    --yesno "\nConfirm settings:\n\n${SUMMARY}\nProceed?" \
    30 68; then
    exit 0
  fi
  # Offer to save as app defaults
  SAVE_LABEL="Save these settings as App Defaults?"
  [[ -f "$APP_DEFAULTS_FILE" ]] && SAVE_LABEL="App Defaults already exist — update them?"
  if whiptail --backtitle "Laser Settings Tracker" --title "Save Defaults" \
    --yesno "\n${SAVE_LABEL}\n\nLocation: ${APP_DEFAULTS_FILE}" \
    11 72 3>&1 1>&2 2>&3; then
    save_defaults_file "$APP_DEFAULTS_FILE"
    msg_ok "App defaults saved to ${APP_DEFAULTS_FILE}"
  fi
  ;;

# ── USER DEFAULTS ─────────────────────────────────────────────────────────────
3)
  if [[ ! -f "$USER_DEFAULTS_FILE" ]]; then
    whiptail --backtitle "Laser Settings Tracker" --title "User Defaults" \
      --msgbox "\nNo user defaults found.\n\nRun Advanced Settings, configure your preferences,\nthen save them from Settings Menu → Save as User Defaults.\n\nFile location: ${USER_DEFAULTS_FILE}" \
      14 68
    exit 0
  fi
  echo -e "${TAB}${BL}Loading User Defaults${CL}"
  load_defaults_file "$USER_DEFAULTS_FILE"
  SUMMARY=$(settings_summary)
  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "User Defaults" \
    --yesno "\nLoaded from: ${USER_DEFAULTS_FILE}\n\n${SUMMARY}\nProceed?" \
    30 68; then
    exit 0
  fi
  ;;

# ── APP DEFAULTS ──────────────────────────────────────────────────────────────
4)
  if [[ ! -f "$APP_DEFAULTS_FILE" ]]; then
    whiptail --backtitle "Laser Settings Tracker" --title "App Defaults" \
      --msgbox "\nNo app defaults found for Laser Settings Tracker.\n\nRun Advanced Settings and save defaults when prompted.\n\nFile location: ${APP_DEFAULTS_FILE}" \
      13 72
    exit 0
  fi
  echo -e "${TAB}${BL}Loading App Defaults${CL}"
  load_defaults_file "$APP_DEFAULTS_FILE"
  SUMMARY=$(settings_summary)
  if ! whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "App Defaults" \
    --yesno "\nLoaded from: ${APP_DEFAULTS_FILE}\n\n${SUMMARY}\nProceed?" \
    30 68; then
    exit 0
  fi
  ;;

# ── SETTINGS MENU ─────────────────────────────────────────────────────────────
5)
  SETTINGS_CHOICE=$(whiptail \
    --backtitle "Laser Settings Tracker" \
    --title "Settings Menu" \
    --notags \
    --menu "\nManage saved configurations:" \
    18 68 4 \
    "1" "View current settings" \
    "2" "Save current settings as App Defaults" \
    "3" "Save current settings as User Defaults" \
    "4" "Delete App Defaults" \
    3>&1 1>&2 2>&3) || exit 0

  case "$SETTINGS_CHOICE" in
    1)
      SUMMARY=$(settings_summary)
      whiptail --backtitle "Laser Settings Tracker" --title "Current Settings" \
        --msgbox "\n${SUMMARY}" 24 68
      ;;
    2)
      save_defaults_file "$APP_DEFAULTS_FILE"
      whiptail --backtitle "Laser Settings Tracker" --title "Saved" \
        --msgbox "\nApp defaults saved to:\n${APP_DEFAULTS_FILE}" 10 68
      ;;
    3)
      save_defaults_file "$USER_DEFAULTS_FILE"
      whiptail --backtitle "Laser Settings Tracker" --title "Saved" \
        --msgbox "\nUser defaults saved to:\n${USER_DEFAULTS_FILE}" 10 68
      ;;
    4)
      if [[ -f "$APP_DEFAULTS_FILE" ]]; then
        if whiptail --backtitle "Laser Settings Tracker" --title "Delete App Defaults" \
          --yesno "\nDelete app defaults file?\n${APP_DEFAULTS_FILE}" 10 68; then
          rm -f "$APP_DEFAULTS_FILE"
          whiptail --backtitle "Laser Settings Tracker" --title "Deleted" \
            --msgbox "\nApp defaults deleted." 8 48
        fi
      else
        whiptail --backtitle "Laser Settings Tracker" --title "Not Found" \
          --msgbox "\nNo app defaults file found at:\n${APP_DEFAULTS_FILE}" 10 68
      fi
      ;;
  esac
  exit 0
  ;;
esac

# ==============================================================================
# START HOST-SIDE LOG
# (started here so whiptail UI is not polluted; settings are logged first)
# ==============================================================================
LOG_FILE="/var/log/laser-tracker-install-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

printf "=== Laser Settings Tracker — Host Install Log ===\n"
printf "=== Started : %s ===\n" "$(date)"
printf "=== Host    : %s ===\n\n" "$(hostname)"
printf "--- Installer Settings ---\n"
settings_summary
printf "\n"

# ==============================================================================
# STORAGE SELECTION
# (skipped if var_template_storage / var_container_storage loaded from defaults)
# ==============================================================================
msg_info "Detecting available storages"
if [[ -n "${var_template_storage:-}" ]]; then
  TEMPLATE_STORAGE="$var_template_storage"
  msg_ok "Template storage (from defaults): ${TEMPLATE_STORAGE}"
else
  select_storage template
  TEMPLATE_STORAGE="$STORAGE_RESULT"
fi
if [[ -n "${var_container_storage:-}" ]]; then
  ROOTFS_STORAGE="$var_container_storage"
  msg_ok "Container storage (from defaults): ${ROOTFS_STORAGE}"
else
  select_storage container
  ROOTFS_STORAGE="$STORAGE_RESULT"
fi
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
# IPv4
if [[ "${var_net:-dhcp}" == "dhcp" ]]; then
  NET_OPT="name=eth0,bridge=${var_brg},ip=dhcp"
else
  NET_OPT="name=eth0,bridge=${var_brg},ip=${var_ip}/${var_cidr},gw=${var_gateway}"
fi

# IPv6
case "${var_ipv6_method:-none}" in
  auto)    NET_OPT="${NET_OPT},ip6=auto" ;;
  dhcp)    NET_OPT="${NET_OPT},ip6=dhcp" ;;
  static)  NET_OPT="${NET_OPT},ip6=${var_ipv6}/${var_ipv6_cidr},gw6=${var_ipv6_gateway}" ;;
  disable) NET_OPT="${NET_OPT},ip6=manual" ;;
  *)       ;;  # none — omit ip6 param entirely
esac

[[ -n "${var_vlan:-}" ]] && NET_OPT="${NET_OPT},tag=${var_vlan}"
[[ -n "${var_mtu:-}"  ]] && NET_OPT="${NET_OPT},mtu=${var_mtu}"
[[ -n "${var_mac:-}"  ]] && NET_OPT="${NET_OPT},hwaddr=${var_mac}"

# ==============================================================================
# CREATE CONTAINER
# ==============================================================================
msg_info "Creating LXC container CT${CTID}"
PCT_ARGS=(
  "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}"
  --hostname     "$var_hostname"
  --memory       "$var_ram"
  --cores        "$var_cpu"
  --rootfs       "${ROOTFS_STORAGE}:${var_disk}"
  --net0         "$NET_OPT"
  --unprivileged "$var_unprivileged"
  --features     "nesting=${var_nesting:-1}"
  --onboot       1
  --start        0
)
[[ -n "${var_tags:-}"  ]] && PCT_ARGS+=(--tags       "$var_tags")
[[ -n "${var_pw:-}"    ]] && PCT_ARGS+=(--password   "$var_pw")
[[ -n "${var_ns:-}"    ]] && PCT_ARGS+=(--nameserver "$var_ns")
PCT_ARGS+=(--timezone "${var_timezone}")

if ! pct create "${PCT_ARGS[@]}" &>/dev/null; then
  msg_error "Failed to create container"
  exit 1
fi

# SSH authorized key
if [[ "${var_ssh:-no}" == "yes" && -n "${var_ssh_authorized_key:-}" ]]; then
  pct set "$CTID" --ssh-public-keys <(echo "${var_ssh_authorized_key}") &>/dev/null || true
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

# Disable IPv6 at kernel level if requested
if [[ "${var_ipv6_method:-none}" == "disable" ]]; then
  pct exec "$CTID" -- bash -c \
    "echo 'net.ipv6.conf.all.disable_ipv6=1' >>/etc/sysctl.conf && sysctl -p" &>/dev/null || true
fi

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
# DOWNLOAD INSTALL FUNCTIONS  (same pattern as build.func)
# Exports install.func content as FUNCTIONS_FILE_PATH.
# lxc-attach inherits exported env vars; pct exec does NOT.
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
echo -e "${TAB}${CM} Container  : CT${CTID} (${var_hostname})"
echo -e "${TAB}${CM} URL        : ${YW}http://${IP}${CL}"
echo -e "${TAB}${CM} Host log   : ${LOG_FILE}"
echo -e "${TAB}${CM} Container log : pct exec ${CTID} -- cat /var/log/laser-tracker-install.log"
echo ""
echo -e " Open ${YW}http://${IP}${CL} in your browser to get started."
echo ""
