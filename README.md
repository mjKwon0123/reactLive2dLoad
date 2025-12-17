# Live2D Cubism React Integration

A complete implementation of Live2D Cubism SDK for Web integrated into a React + TypeScript + Vite application. This project demonstrates how to display interactive Live2D models in a modern React environment with model switching, secure asset loading, and tools for processing Cubism Editor exports.

![Live2D Demo](https://img.shields.io/badge/Live2D-Cubism%205.0-ff69b4)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7-646cff)

## ✨ Features

- 🎭 **Live2D Model Rendering** - Full support for Cubism 5.0 models
- 🔄 **Model Switching** - Switch between multiple models with UI buttons
- 🖱️ **Interactive Controls** - Mouse tracking for eye/head movement
- 👆 **Touch/Click Interactions** - Trigger motions and expressions
- 😊 **Automatic Animations** - Eye blinking, breathing, idle motions
- 🔒 **Secure Asset Loading** - Models loaded from `src/assets` with hashed URLs
- ⚛️ **React Component** - Easy-to-use `<Live2DViewer />` component with ref support
- 🛠️ **Model Organizer Script** - Convert Cubism Editor exports to web-ready format
- 📦 **Self-Contained** - No external SDK dependencies required

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📸 Demo

The demo includes 3 sample models with instant switching:

| Haru | Mao | Hiyori |
|------|-----|--------|
| SDK sample model | Wizard character | Student character |

Click on models to trigger motions and expressions!

## 📁 Project Structure

```
frontend/
├── public/
│   └── live2dcubismcore.min.js  # Live2D Core library
├── scripts/
│   └── organize-model.js        # 🆕 Model conversion script
├── src/
│   ├── assets/
│   │   ├── Haru/                # Sample model 1
│   │   ├── Mao/                 # Sample model 2
│   │   └── Hiyori/              # Sample model 3
│   ├── components/
│   │   └── Live2DViewer.tsx     # React component (with ref)
│   ├── lib/
│   │   ├── framework/           # Cubism Framework (included)
│   │   └── live2d/              # Integration layer
│   │       ├── LAppDefine.ts    # Configuration
│   │       ├── LAppModel.ts     # Model class
│   │       ├── LAppLive2DManager.ts
│   │       ├── ModelLoader.ts   # Secure asset loading
│   │       └── ...
│   └── App.tsx
├── docs/
│   └── MODEL_SECURITY.md        # Security guide
└── package.json
```

## 🎮 Usage

### Basic Usage

```tsx
import { Live2DViewer } from './components/Live2DViewer';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Live2DViewer />
    </div>
  );
}
```

### With Model Switching (using ref)

```tsx
import { useRef } from 'react';
import { Live2DViewer, Live2DViewerHandle } from './components/Live2DViewer';

function App() {
  const viewerRef = useRef<Live2DViewerHandle>(null);

  return (
    <div>
      <button onClick={() => viewerRef.current?.changeModel(0)}>Haru</button>
      <button onClick={() => viewerRef.current?.changeModel(1)}>Mao</button>
      <button onClick={() => viewerRef.current?.nextModel()}>Next</button>
      
      <Live2DViewer 
        ref={viewerRef}
        onModelChange={(index) => console.log('Model changed:', index)}
      />
    </div>
  );
}
```

### Live2DViewerHandle API

| Method | Description |
|--------|-------------|
| `changeModel(index)` | Switch to model at specified index |
| `nextModel()` | Switch to next model in list |
| `getCurrentModelIndex()` | Get current model index |

## 🛠️ Model Organizer Script

Convert Cubism Editor exports to web-ready format automatically.

### Usage

```bash
# Basic usage
node scripts/organize-model.js <input-folder> [output-folder]

# With auto-fix for common issues
node scripts/organize-model.js <input-folder> [output-folder] --fix
```

### Example

```bash
# Convert Cubism Editor export
node scripts/organize-model.js src/assets/mao_pro_en src/assets/Mao --fix
```

### What it does

| Feature | Description |
|---------|-------------|
| **Extract runtime files** | Copies only web-needed files from `runtime/` folder |
| **Remove Editor files** | Excludes `.cmo3`, `.can3` (Cubism Editor files) |
| **Clean system files** | Removes `.DS_Store`, `Thumbs.db`, etc. |
| **Fix HitAreas** | Auto-fills empty HitArea names (`--fix`) |
| **Fix Motion groups** | Renames empty `""` groups to `"TapBody"` (`--fix`) |
| **Rename model3.json** | Matches filename to folder name |

### Before & After

```
# Input (Cubism Editor export)        # Output (Web-ready)
mao_pro_en/                           Mao/
├── mao_pro_t06.cmo3    ❌ removed    ├── Mao.model3.json
├── mao_pro_t06.can3    ❌ removed    ├── mao_pro.moc3
├── ReadMe.txt          ❌ removed    ├── mao_pro.4096/
└── runtime/            → extracted   ├── expressions/
    ├── mao_pro.model3.json           └── motions/
    └── ...
```

## 🔒 Security Considerations

Models are stored in `src/assets/` instead of `public/`, using Vite's asset import system:

| Traditional Approach | This Implementation |
|---------------------|---------------------|
| `/public/models/Haru.moc3` | `src/assets/Haru/Haru.moc3` |
| Direct URL access possible | Hashed filenames in build |
| Easy to guess URLs | URLs like `Haru-B_Kvcr7l.moc3` |

### Security Levels

| Level | Method | Best For |
|-------|--------|----------|
| 1 | URL Obfuscation (current) | Demos, portfolios |
| 2 | Signed URLs | Freemium apps |
| 3 | Server Authentication | User content platforms |
| 4 | File Encryption | High-value commercial models |

📖 See [docs/MODEL_SECURITY.md](./docs/MODEL_SECURITY.md) for detailed implementation guides.

## 🔧 Configuration

Edit `src/lib/live2d/LAppDefine.ts` to customize:

```typescript
// Models to load (buttons auto-generated for each)
export const ModelDir: string[] = ['Haru', 'Mao', 'Hiyori'];

// Motion groups
export const MotionGroupIdle = 'Idle';
export const MotionGroupTapBody = 'TapBody';

// Hit areas
export const HitAreaNameHead = 'Head';
export const HitAreaNameBody = 'Body';

// Debug options
export const DebugLogEnable = true;
```

## 🎨 Adding New Models

### Method 1: From Cubism Editor Export

```bash
# 1. Run organizer script
node scripts/organize-model.js src/assets/your_model_export src/assets/YourModel --fix

# 2. Add to LAppDefine.ts
export const ModelDir: string[] = ['Haru', 'Mao', 'Hiyori', 'YourModel'];

# 3. Restart dev server
npm run dev
```

### Method 2: Manual Addition

1. **Add model files** to `src/assets/YourModel/`
2. **Update configuration** in `LAppDefine.ts`
3. **Restart dev server**

### Model File Requirements

```
YourModel/
├── YourModel.model3.json    # Required: Model settings
├── YourModel.moc3           # Required: Model data
├── YourModel.2048/          # Required: Textures folder
│   ├── texture_00.png
│   └── texture_01.png
├── YourModel.physics3.json  # Optional: Physics settings
├── YourModel.pose3.json     # Optional: Pose settings
├── expressions/             # Optional: Expression files
│   └── *.exp3.json
└── motions/                 # Optional: Motion files
    └── *.motion3.json
```

## 🛠️ Technical Details

### Dependencies

- **Runtime**: Only React 19 required
- **Build**: Vite 7, TypeScript 5.9
- **Live2D**: Cubism SDK for Web 5.0 (Framework included in project)

### Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires WebGL 1.0 or 2.0 support.

### Performance Tips

- Models with fewer polygons render faster
- Reduce texture sizes for mobile (2048 → 1024)
- Disable physics for low-end devices

## 📚 References

- [Live2D Cubism SDK for Web](https://github.com/Live2D/CubismWebSamples)
- [Official Documentation](https://docs.live2d.com/en/cubism-sdk-tutorials/sample-build-web/)
- [Cubism SDK Manual](https://docs.live2d.com/en/cubism-sdk-manual/top/)

## 📄 License

This project structure and integration code is provided as-is for educational purposes.

**Important**: Live2D Cubism SDK and Core are subject to [Live2D's licensing terms](https://www.live2d.com/en/terms/). Ensure you have appropriate licenses for commercial use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

Made with ❤️ for the Live2D community
