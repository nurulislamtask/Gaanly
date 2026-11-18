#!/usr/bin/env bash
# Regenerates every Gaanly icon (desktop, web/PWA, Android, iOS) from one master mark.
# Needs: rsvg-convert (librsvg) and ImageMagick. Run from the repo root: bash design/build-icons.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BG_COLOR="#07162E"
GLYPH='<path d="M134 330V268A122 122 0 0 1 378 268V330" fill="none" stroke="url(#n)" stroke-width="34" stroke-linecap="round"/>
<rect x="92" y="296" width="86" height="138" rx="40" fill="url(#n)"/>
<rect x="334" y="296" width="86" height="138" rx="40" fill="url(#n)"/>
<rect x="206" y="330" width="26" height="76" rx="13" fill="url(#b)"/>
<rect x="243" y="292" width="26" height="150" rx="13" fill="url(#b)"/>
<rect x="280" y="318" width="26" height="100" rx="13" fill="url(#b)"/>'
DEFS='<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D2A57"/><stop offset="0.55" stop-color="#0E5C73"/><stop offset="1" stop-color="#12A59A"/></linearGradient>
<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFF5EE"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC24A"/><stop offset="1" stop-color="#FF5C7A"/></linearGradient>
<radialGradient id="glow" cx="0.25" cy="0.15" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#021428" flood-opacity="0.4"/></filter>
</defs>'
# the headphones' visual center is ~(256,278)
glyph() { # $1 = scale
  echo "<g filter=\"url(#sh)\" transform=\"translate(256 256) scale($1) translate(-256 -278)\">$GLYPH</g>"
}
# tile RX SCALE [bg:yes|no]
tile() {
  local rx=$1 sc=$2 bg=${3:-yes}
  echo "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\">$DEFS"
  if [ "$bg" = yes ]; then
    echo "<rect width=\"512\" height=\"512\" rx=\"$rx\" fill=\"url(#bg)\"/><rect width=\"512\" height=\"512\" rx=\"$rx\" fill=\"url(#glow)\"/>"
  fi
  glyph "$sc"; echo "</svg>"
}
png() { rsvg-convert -w "$2" -h "$2" "$1" -o "$3"; }

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
tile 116 1.12 > "$T/round.svg"        # rounded app tile
tile 0   1.05 > "$T/full.svg"         # full-bleed (iOS, apple-touch)
tile 0   0.86 > "$T/maskable.svg"     # full-bleed, glyph inside the 80% safe zone
tile 256 1.0  > "$T/circle.svg"       # circular legacy Android icon
cp "$T/maskable.svg" "$T/fg.svg"      # Android adaptive foreground: full-bleed gradient, note inside the safe zone
cp "$T/round.svg" design/logo.svg

# ---- web / PWA
cp "$T/round.svg" web/public/favicon.svg
png "$T/round.svg" 192 web/public/icon-192.png
png "$T/round.svg" 512 web/public/icon-512.png
png "$T/maskable.svg" 512 web/public/icon-maskable-512.png
png "$T/full.svg" 180 web/public/apple-touch-icon.png

# ---- desktop
png "$T/round.svg" 512 desktop/build/icon.png
# macOS: 1024 canvas, 824 tile in the middle (Apple's grid)
png "$T/round.svg" 824 "$T/mac824.png"
convert -size 1024x1024 xc:none "$T/mac824.png" -gravity center -composite desktop/build/icon-mac.png
for s in 16 24 32 48 64 128 256; do png "$T/round.svg" $s "$T/ico$s.png"; done
convert "$T"/ico16.png "$T"/ico24.png "$T"/ico32.png "$T"/ico48.png "$T"/ico64.png "$T"/ico128.png "$T"/ico256.png desktop/build/icon.ico

# ---- iOS (opaque, square: iOS rounds it itself)
png "$T/full.svg" 1024 "$T/ios.png"
convert "$T/ios.png" -alpha off mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

# ---- Android
R=mobile/android/app/src/main/res
declare -A LEG=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
declare -A FG=([mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)
for d in "${!LEG[@]}"; do
  png "$T/round.svg"  "${LEG[$d]}" "$R/mipmap-$d/ic_launcher.png"
  png "$T/circle.svg" "${LEG[$d]}" "$R/mipmap-$d/ic_launcher_round.png"
  png "$T/fg.svg"     "${FG[$d]}"  "$R/mipmap-$d/ic_launcher_foreground.png"
done

# ---- splash screens (dark background + the tile in the middle) and the TV banner
splash() { # $1 width $2 height $3 out
  local m=$(( ($1 < $2 ? $1 : $2) * 26 / 100 ))
  png "$T/round.svg" "$m" "$T/sp.png"
  convert -size "$1x$2" "xc:$BG_COLOR" "$T/sp.png" -gravity center -composite -alpha off "$3"
}
for f in $(find "$R" -name splash.png); do
  read -r w h <<<"$(identify -format '%w %h' "$f")"; splash "$w" "$h" "$f"
done
for f in mobile/ios/App/App/Assets.xcassets/Splash.imageset/splash-*.png; do
  read -r w h <<<"$(identify -format '%w %h' "$f")"; splash "$w" "$h" "$f"
done
png "$T/round.svg" 120 "$T/bn.png"
convert -size 320x180 "xc:$BG_COLOR" "$T/bn.png" -gravity center -composite -alpha off "$R/drawable-xhdpi/banner.png"
echo "icons regenerated"
