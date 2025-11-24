<div align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Launchpad Logo" width="128" height="128">
  <h1>Launchpad</h1>
  <p>A modern recreation of the classic macOS Launchpad - the beloved full-screen app launcher that Apple removed in macOS 26 Tahoe (September 2024).</p>
</div>

## 🌟 Features

- **🎯 Grid-Based App Display** - iOS/iPadOS-style full-screen grid interface
- **📁 Folder Organization** - Create folders by dragging apps together, customize folder names
- **🔍 Real-Time Search** - Instant app filtering, searches inside folders too
- **📱 Multi-Page Support** - Organize hundreds of apps across multiple pages
- **🎨 Native macOS Vibrancy** - Beautiful glass effect with desktop wallpaper blur
- **⌨️ Keyboard Shortcuts** - F4 to open, Esc to close, arrows for navigation
- **🖱️ Drag & Drop** - Rearrange apps freely, drag between pages with edge detection
- **🗑️ App Management** - Right-click apps to open, reveal in Finder, hide, or move to Trash
- **🖼️ Multi-Monitor Support** - Smart window positioning on the monitor with cursor focus
- **🔲 Hot Corners** - Trigger Launchpad by moving mouse to screen corners (configurable)
- **✨ macOS Tahoe Design** - Unified confirmation dialogs with modern macOS styling
- **💾 Persistent Layout** - Your app arrangement is saved automatically
- **⚡ Lightweight** - Built with Tauri for native performance

## 🎬 Why This Project?

Apple replaced the original Launchpad with a new "Apps" panel that:

- ❌ Removes custom app arrangement
- ❌ Eliminates the folder system
- ❌ Forces automatic categorization

This project restores the **original Launchpad experience** that users loved, as a standalone application.

## 🛠️ Technology Stack

- **[Tauri 2.x](https://tauri.app/)** - Rust-based desktop framework for native macOS integration
- **[React 19](https://react.dev/)** - Modern UI with hooks and TypeScript
- **[Vite 7](https://vitejs.dev/)** - Lightning-fast dev server and build tool
- **[Rust](https://www.rust-lang.org/)** - Backend for system integration and app detection

## 📦 Installation

### Download Pre-Built App

1. Download the latest `.dmg` from [Releases](https://github.com/your-username/launchpad/releases)
2. Open the DMG and drag Launchpad to Applications
3. Launch from Applications folder or press **F4**

### Build from Source

See [BUILD_AND_TEST.md](BUILD_AND_TEST.md) for detailed build instructions.

Quick start:

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production app
npm run tauri build
```

## 🎮 Usage

### Opening Launchpad

- Press **F4** (default)
- Click the Launchpad icon in Applications
- **Hot Corners** - Move mouse to configured corner (Settings → Hot Corner)
- _Note: Trackpad gestures coming soon_

### Organizing Apps

- **Drag & Drop** - Click and drag to rearrange apps
- **Create Folders** - Drag one app onto another
- **Rename Folders** - Click folder name in the folder view
- **Cross-Page Drag** - Drag to screen edges to switch pages

### Navigation

- **Arrow Keys** - Navigate between pages (when not searching)
- **Type to Search** - Start typing to filter apps instantly
- **Esc** - Close Launchpad
- **Enter** - Launch the first search result

### App Management

- **Right-Click App** - Context menu with options:
  - Open - Launch the application
  - Show in Finder - Reveal app in Finder
  - Hide from Launchpad - Remove from view (doesn't uninstall)
  - Move to Trash - Safely delete app (recoverable from Trash)

### Customization

- **Right-Click Background** - Access grid settings and folder options
- **Grid Size** - Customize rows and columns for your screen
- **Full-Width Mode** - Toggle between centered and full-width layouts
- **Hot Corner Settings** - Configure which corner triggers Launchpad
  - Choose corner: Top-left, Top-right, Bottom-left, Bottom-right
  - Adjust trigger threshold (5-50 pixels)
  - Set debounce delay (100-1000ms)
- **Edit Mode** - Toggle jiggling animation for easy rearrangement

## 🏗️ Project Structure

```
launchpad/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript interfaces
│   ├── App.tsx            # Main application
│   └── App.css            # Styles
├── src-tauri/             # Rust backend
│   ├── src/lib.rs         # Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # App configuration
└── BUILD_AND_TEST.md      # Build instructions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Phosphor Icons](https://phosphoricons.com/)** - Beautiful icon system used for the app logo
- **[Tauri](https://tauri.app/)** - Amazing framework for building lightweight desktop apps
- **Apple** - For the original Launchpad design inspiration
- **Community** - All users who missed the classic Launchpad experience

## 🚀 Roadmap

**Completed:**
- [x] Multi-monitor support
- [x] Per-monitor focus detection
- [x] Single instance enforcement
- [x] App context menu (reveal in Finder, move to Trash, hide)
- [x] Hot corners activation (configurable corner, threshold, debounce)

**Planned:**
- [ ] Global keyboard shortcut customization (F4 + custom)
- [ ] Trackpad gestures (pinch to open/close)
- [ ] iCloud sync for app layouts
- [ ] Auto-categorization option (optional)
- [ ] Multiple layout profiles

---

**Made with 💙💛 using Tauri and React**
