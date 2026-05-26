#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/laser-tracker"

echo "Pulling latest code..."
git -C "$APP_DIR" pull origin master

echo "Installing dependencies..."
npm install --production --prefix "$APP_DIR/app"

echo "Restarting app..."
pm2 restart laser-tracker

echo "Done."
