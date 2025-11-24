# UI Improvements Plan

## Overview

This document outlines the plan for three major UI improvements:
1. **OS Theme Integration** - Follow system light/dark mode and accent colors
2. **Settings Reorganization** - Rename and restructure settings UI
3. **Internationalization** - Support OS language settings

---

## 1. OS Theme Integration

### Current State
- Fixed dark theme with blue accents
- No system theme detection
- Hardcoded colors in CSS

### Goals
- Automatically switch between light/dark mode based on OS settings
- Use system accent colors for buttons and interactive elements
- Real-time updates when user changes OS theme

### Technical Approach

#### A. System Theme Detection (Light/Dark Mode)

**Frontend Approach**:
```typescript
// React hook to detect theme changes
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleThemeChange = (e: MediaQueryListEvent) => {
    setTheme(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleThemeChange);
  return () => mediaQuery.removeEventListener('change', handleThemeChange);
}, []);
```

**CSS Variables Approach**:
```css
:root {
  /* Light theme */
  --bg-primary: rgba(255, 255, 255, 0.95);
  --bg-secondary: rgba(240, 240, 240, 0.9);
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --border-color: rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark theme */
    --bg-primary: rgba(30, 30, 30, 0.95);
    --bg-secondary: rgba(50, 50, 50, 0.9);
    --text-primary: #f5f5f7;
    --text-secondary: #a1a1a6;
    --border-color: rgba(255, 255, 255, 0.1);
  }
}
```

#### B. System Accent Color Detection

**macOS Native Approach** (Requires Rust backend):
```rust
// Add to Cargo.toml:
// cocoa = "0.25"  (already installed)
// objc = "0.2"

#[tauri::command]
fn get_system_accent_color() -> Result<String, String> {
    use cocoa::appkit::{NSColor, NSColorSpace};
    use cocoa::base::{id, nil};
    use objc::{msg_send, sel, sel_impl};

    unsafe {
        let color: id = msg_send![class!(NSColor), controlAccentColor];
        let rgb_color: id = msg_send![color, colorUsingColorSpace: NSColorSpace::genericRGBColorSpace()];

        let r: f64 = msg_send![rgb_color, redComponent];
        let g: f64 = msg_send![rgb_color, greenComponent];
        let b: f64 = msg_send![rgb_color, blueComponent];

        // Convert to hex
        let hex = format!("#{:02x}{:02x}{:02x}",
                         (r * 255.0) as u8,
                         (g * 255.0) as u8,
                         (b * 255.0) as u8);

        Ok(hex)
    }
}
```

**Alternative: CSS System Colors** (Simpler):
```css
.button-primary {
  background-color: -apple-system-blue; /* Uses system accent */
  background-color: AccentColor; /* CSS standard */
}
```

#### C. Implementation Strategy

**Phase 1: CSS Media Query Approach** (Easiest)
- Use `@media (prefers-color-scheme: dark)` for theme switching
- Use CSS system colors like `AccentColor` for buttons
- No backend changes needed
- Works immediately

**Phase 2: Enhanced Control** (If needed)
- Add Rust command to get exact accent color
- Store theme preference in settings
- Allow manual override of system theme

### Files to Modify
- `src/App.css` - Add CSS variables and media queries
- `src/components/GridSettings.tsx` - Update component styles
- `src/components/AppContextMenu.tsx` - Update menu styles
- `src/components/ConfirmDialog.tsx` - Update dialog styles
- `src-tauri/src/lib.rs` - (Optional) Add accent color detection

### Recommended Approach
**Start with Phase 1** - Pure CSS approach with media queries and system colors. This is:
- Zero JavaScript needed
- Automatic real-time updates
- Native macOS appearance
- Minimal code changes

---

## 2. Settings Reorganization

### Current State
- Component: `GridSettings.tsx`
- Menu item: "Grid Settings"
- Contains:
  - Grid dimensions (rows, cols)
  - Full width toggle
  - Hot corners configuration
  - Global keyboard shortcut

### Problems
- Misleading name - contains more than grid settings
- Will grow as more settings are added
- No logical grouping

### Proposed Solutions

#### Option A: Simple Rename
**Change**: "Grid Settings" → "Settings" or "Preferences"
**Pros**:
- Minimal code changes
- Clear and accurate
- Standard terminology

**Cons**:
- Single long list of settings
- May become cluttered with future additions

#### Option B: Tabbed Settings
**Structure**:
```
Settings
├── Appearance Tab
│   ├── Grid dimensions (rows, cols)
│   └── Full width toggle
├── Controls Tab
│   ├── Keyboard shortcut
│   └── Hot corners
└── (Future: Gestures, Sync, etc.)
```

**Pros**:
- Better organization
- Room for growth
- Professional appearance

**Cons**:
- More complex implementation
- May be overkill for current settings count

#### Option C: Sections within Single Modal
**Structure**:
```
Settings
┌─────────────────────────────┐
│ Grid Layout                 │
│ • Rows per page             │
│ • Columns per page          │
│ • Use full screen width     │
├─────────────────────────────┤
│ Hot Corners                 │
│ • Enable hot corner         │
│ • Corner position           │
│ • Trigger threshold         │
│ • Debounce delay            │
├─────────────────────────────┤
│ Keyboard Shortcut           │
│ • Shortcut to open          │
└─────────────────────────────┘
```

**Pros**:
- Clear organization without tabs
- Single scrollable view
- Already partially implemented (sections exist)

**Cons**:
- Long scroll for many settings

### Recommended Approach
**Option C - Sections with Better Headers**

Already have sections with separators. Just need to:
1. Rename component: `GridSettings.tsx` → `SettingsModal.tsx`
2. Update section headers for clarity
3. Rename menu item: "Grid Settings" → "Settings"
4. Add icons to section headers for visual clarity

### Files to Modify
- `src/components/GridSettings.tsx` → `src/components/SettingsModal.tsx`
- `src/App.tsx` - Update component import and usage
- `src/App.css` - Rename CSS classes if needed
- `src/components/AppContextMenu.tsx` - Update menu text

---

## 3. Internationalization (i18n)

### Current State
- All text hardcoded in English
- No translation system
- No locale detection

### Goals
- Detect OS language
- Display UI in user's preferred language
- Support at minimum: English, Spanish, French, German, Chinese, Japanese, Ukrainian, Polish

### Technical Approach

#### A. Library Options

**Option 1: react-i18next** (Most Popular)
```bash
npm install react-i18next i18next
```

**Pros**:
- Industry standard
- Excellent TypeScript support
- Built-in pluralization, interpolation
- Lazy loading of translations

**Cons**:
- Larger bundle size
- More setup required

**Option 2: react-intl** (Formatjs)
```bash
npm install react-intl
```

**Pros**:
- Comprehensive formatting (dates, numbers, currencies)
- Good TypeScript support
- ICU message format

**Cons**:
- Larger bundle size
- More complex for simple use cases

**Option 3: Custom Solution**
```typescript
// Simple context-based approach
const translations = {
  en: { 'app.name': 'Launchpad', ... },
  es: { 'app.name': 'Lanzador', ... },
  // ...
};
```

**Pros**:
- Lightweight
- Full control
- No dependencies

**Cons**:
- Manual pluralization
- No advanced formatting
- More maintenance

#### B. OS Language Detection

**Tauri Approach**:
```rust
#[tauri::command]
fn get_system_locale() -> Result<String, String> {
    use std::process::Command;

    let output = Command::new("defaults")
        .args(&["read", "-g", "AppleLocale"])
        .output()
        .map_err(|e| e.to_string())?;

    let locale = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    // Returns: "en_US", "es_ES", "fr_FR", etc.
    Ok(locale)
}
```

**Browser API** (Simpler):
```typescript
const locale = navigator.language; // "en-US", "es-ES", etc.
const primaryLang = locale.split('-')[0]; // "en", "es", etc.
```

#### C. Implementation Strategy

**Phase 1: Setup i18n System**
1. Install react-i18next
2. Create translation files structure:
```
src/locales/
├── en.json
├── es.json
├── fr.json
├── de.json
├── zh.json
├── ja.json
├── uk.json
└── pl.json
```

**Phase 2: Extract Strings**
Replace all hardcoded strings:
```typescript
// Before:
<h2>Grid Settings</h2>

// After:
<h2>{t('settings.title')}</h2>
```

**Phase 3: Add Language Selector**
Option to override OS language in settings

### Translation Structure Example

**en.json**:
```json
{
  "app": {
    "name": "Launchpad"
  },
  "settings": {
    "title": "Settings",
    "save": "Save",
    "cancel": "Cancel"
  },
  "grid": {
    "title": "Grid Layout",
    "rows": "Rows per page",
    "cols": "Columns per page",
    "fullWidth": "Use full screen width",
    "appsPerPage": "Apps per page: {{count}}"
  },
  "hotCorners": {
    "title": "Hot Corners",
    "enable": "Enable hot corner",
    "position": "Corner position",
    "threshold": "Trigger threshold (pixels)",
    "debounce": "Debounce delay (ms)",
    "positions": {
      "topLeft": "Top Left",
      "topRight": "Top Right",
      "bottomLeft": "Bottom Left",
      "bottomRight": "Bottom Right"
    }
  },
  "keyboard": {
    "title": "Keyboard Shortcut",
    "label": "Keyboard shortcut to open Launchpad",
    "examples": "Examples: F4, CommandOrControl+Space, Alt+L",
    "modifiers": "Modifiers: Cmd/CommandOrControl, Alt/Option, Shift, Ctrl"
  },
  "contextMenu": {
    "open": "Open",
    "showInFinder": "Show in Finder",
    "hide": "Hide from Launchpad",
    "moveToTrash": "Move to Trash",
    "settings": "Settings",
    "editMode": "Edit Mode"
  },
  "search": {
    "placeholder": "Search applications..."
  },
  "folder": {
    "unnamed": "Unnamed Folder",
    "rename": "Rename Folder",
    "delete": "Delete Folder"
  },
  "confirm": {
    "deleteFolder": "Delete folder \"{{name}}\" and move all apps inside back to the grid?",
    "delete": "Delete",
    "cancel": "Cancel",
    "moveToTrash": "Are you sure you want to move \"{{name}}\" to Trash?",
    "moveToTrashButton": "Move to Trash"
  }
}
```

### Files to Modify
- `package.json` - Add i18next dependencies
- `src/i18n.ts` - (New) i18n configuration
- `src/main.tsx` - Initialize i18n
- `src/App.tsx` - Wrap with I18nextProvider
- All component files - Replace hardcoded strings with `t()` calls
- `src/locales/*.json` - (New) Translation files
- `src-tauri/src/lib.rs` - (Optional) Add system locale detection

### Recommended Approach
**react-i18next** with browser language detection for Phase 1

**Supported Languages** (8 total):
- English (en) - Base language
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- Ukrainian (uk)
- Polish (pl)

---

## Implementation Order

### Priority 1: OS Theme Integration (Easiest)
- **Effort**: Low (2-3 hours)
- **Impact**: High (immediate visual improvement)
- **Approach**: Pure CSS with media queries
- **Risk**: Low (non-breaking, visual only)

### Priority 2: Settings Reorganization (Medium)
- **Effort**: Low (1-2 hours)
- **Impact**: Medium (better UX, clearer naming)
- **Approach**: Rename + section headers
- **Risk**: Low (refactoring only)

### Priority 3: Internationalization (Most Complex)
- **Effort**: High (8-12 hours)
- **Impact**: High (global accessibility)
- **Approach**: react-i18next with 7 languages
- **Risk**: Medium (extensive changes, testing needed)

---

## Detailed Implementation Steps

### Step 1: OS Theme Integration

1. **Update App.css**:
   - Define CSS variables for colors
   - Add `@media (prefers-color-scheme: dark)` section
   - Replace hardcoded colors with variables

2. **Test Both Themes**:
   - System Preferences → Appearance → Light/Dark
   - Verify all components update correctly
   - Check vibrancy effect compatibility

3. **Optional Enhancement**:
   - Add theme toggle in settings for manual override
   - Store preference in localStorage

### Step 2: Settings Reorganization

1. **Rename Files**:
   - `GridSettings.tsx` → `SettingsModal.tsx`
   - Update imports in App.tsx

2. **Update UI**:
   - Change modal title from "Grid Settings" to "Settings"
   - Improve section headers with clearer titles
   - Consider adding icons to sections

3. **Update Context Menu**:
   - Change "Grid Settings" to "Settings" in menu

4. **Update Types**:
   - Rename `GridSettings` interface to `AppSettings`
   - Update localStorage key if desired

### Step 3: Internationalization

1. **Install Dependencies**:
   ```bash
   npm install react-i18next i18next
   ```

2. **Create i18n Configuration**:
   - Create `src/i18n.ts`
   - Set up language detection
   - Configure fallback language (English)

3. **Create Translation Files**:
   - Create `src/locales/` directory
   - Add translation files for each language
   - Start with English, then translate

4. **Update Components**:
   - Import `useTranslation` hook
   - Replace all hardcoded strings
   - Handle dynamic content (app names, counts)

5. **Add Language Settings**:
   - Add language selector to settings
   - Store preference in localStorage
   - Allow override of system language

6. **Testing**:
   - Test each language thoroughly
   - Verify RTL languages work (if supporting Arabic/Hebrew)
   - Check text overflow handling

---

## Testing Checklist

### Theme Integration
- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] Theme switches in real-time when OS setting changes
- [ ] All modals and dialogs respect theme
- [ ] Context menus respect theme
- [ ] Vibrancy effect works in both themes
- [ ] Text contrast is sufficient in both themes
- [ ] System accent color is used for buttons (if implemented)

### Settings Reorganization
- [ ] Settings modal opens correctly
- [ ] All settings sections are present
- [ ] Section headers are clear
- [ ] Save/Cancel buttons work
- [ ] Settings persist correctly
- [ ] Menu item label is updated

### Internationalization
- [ ] OS language is detected on startup
- [ ] All UI text is translated
- [ ] Pluralization works correctly
- [ ] Date/number formatting respects locale
- [ ] Language selector works (if implemented)
- [ ] Language changes update UI immediately
- [ ] Fallback to English works for unsupported languages
- [ ] No missing translation keys in console

---

## Risks and Mitigations

### Risk 1: Theme Integration Breaks Existing Styles
**Mitigation**:
- Create feature branch
- Test thoroughly before merge
- Keep original colors as fallback
- Use CSS variables for easy rollback

### Risk 2: Settings Rename Breaks Saved Data
**Mitigation**:
- Keep localStorage key unchanged
- Or migrate old key to new key
- Type interface rename is internal only

### Risk 3: i18n Increases Bundle Size
**Mitigation**:
- Use lazy loading for translations
- Load only active language
- Consider splitting by feature
- Monitor bundle size

### Risk 4: Missing Translations
**Mitigation**:
- Use English as fallback
- TypeScript to catch missing keys
- Regular translation audits
- Community contributions for languages

---

## Future Enhancements

### Theme System
- Custom theme editor
- Save/load custom themes
- Theme presets (Nord, Solarized, etc.)

### Settings
- Import/export settings
- Reset to defaults option
- Search within settings

### i18n
- Crowdsourced translations (Crowdin, Lokalise)
- More languages based on user requests
- Context-aware translations
- Translation memory for consistency

---

## Questions for Review

1. **Theme Integration**: Pure CSS approach or add Rust backend for exact accent color?
2. **Settings**: Keep current single modal with sections, or implement tabs?
3. **i18n**: Which languages to prioritize first? Start with all 8 or phase in?
4. **Language Detection**: Use browser API or add Tauri command for OS locale?
5. **Testing**: Manual testing sufficient or add automated visual regression tests?

---

## Estimated Timeline

- **Theme Integration**: 2-3 hours
- **Settings Reorganization**: 1-2 hours
- **i18n Setup + English**: 3-4 hours
- **8 Language Translations**: 5-7 hours (with translation tool help)
- **Testing & Polish**: 2-3 hours

**Total**: ~13-19 hours

Can be split across multiple sessions:
- Session 1: Theme + Settings (3-5 hours)
- Session 2: i18n Setup (3-4 hours)
- Session 3: Translations (5-7 hours)
- Session 4: Testing (2-3 hours)
