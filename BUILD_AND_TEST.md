# Building and Testing Launchpad

## Development Mode

Run the app in development mode with hot reload:

```bash
npm run tauri dev
```

This opens the app in a debug window with live updates.

## Production Build

Build an optimized, standalone `.app`:

```bash
npm run tauri:build
```

### Build Output

After building, you'll find the final artifacts in `build/`:

- **Application Bundle**: `build/Launchpad.app`
- **DMG Installer**: `build/Launchpad_<version>_aarch64.dmg` (or x64)

## Testing the .app

### Method 1: Run Directly

```bash
open build/Launchpad.app
```

### Method 2: Install to Applications

```bash
# Copy to Applications folder
cp -r build/Launchpad.app /Applications/

# Then open from Spotlight or Finder
open /Applications/Launchpad.app
```

### Method 3: Install from DMG

1. Open the DMG file in Finder
2. Drag `launchpad.app` to the Applications folder
3. Eject the DMG
4. Launch from Applications

## Customizing the App Icon

To use a custom Launchpad icon (like the classic macOS rocket):

1. Find or create a high-resolution PNG (512x512 or larger)

2. Generate ICNS file:

```bash
# Create iconset directory structure
mkdir icon.iconset

# Generate all required icon sizes
sips -z 16 16     your-icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     your-icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     your-icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     your-icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   your-icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   your-icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   your-icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   your-icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 your-icon.png --out icon.iconset/icon_512x512@2x.png

# Convert to ICNS
iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns

# Cleanup
rm -rf icon.iconset
```

3. Rebuild the app:

```bash
npm run tauri build
```

## Quick Reference

| Command                                                    | Description                 |
| ---------------------------------------------------------- | --------------------------- |
| `npm run dev`                                              | Start Vite dev server only  |
| `npm run build`                                            | Build frontend only         |
| `npm run tauri dev`                                        | Run full app in development |
| `npm run tauri build`                                      | Build production .app       |
| `npm run tauri:build`                                      | Build and copy to `build/`  |
| `open build/Launchpad.app`                                 | Test the built app          |

## Troubleshooting

**Icons not showing?**

- Check icon file exists: `ls -la src-tauri/icons/icon.icns`
- Rebuild after changing icons

**Build fails?**

- Clean build: `cd src-tauri && cargo clean && cd ..`
- Retry: `npm run tauri build`

**App won't open?**

- Check for errors: `open -a Console` and filter for "launchpad"
- Run from terminal to see errors: `./build/Launchpad.app/Contents/MacOS/launchpad`

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

**Made with 💙💛 using Tauri**
