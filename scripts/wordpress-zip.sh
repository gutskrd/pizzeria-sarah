#!/usr/bin/env sh
# Packs the WordPress plugin into wordpress/pizzeria-sarah.zip, ready for Plugins → Nieuwe plugin → Plugin uploaden.
set -e
cd "$(dirname "$0")/../wordpress"
rm -f pizzeria-sarah.zip
zip -rqX pizzeria-sarah.zip pizzeria-sarah -x '*.DS_Store'
echo "Klaar: wordpress/pizzeria-sarah.zip"
