# Live2D Cubism React Integration

A complete implementation of Live2D Cubism SDK for Web integrated into a React + TypeScript + Vite application. This project demonstrates how to display interactive Live2D models in a modern React environment with a focus on security considerations for user-uploaded content.

![Live2D Demo](https://img.shields.io/badge/Live2D-Cubism%205.0-ff69b4)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7-646cff)

## ✨ Features

- 🎭 **Live2D Model Rendering** - Full support for Cubism 5.0 models
- 🖱️ **Interactive Controls** - Mouse tracking for eye/head movement
- 👆 **Touch/Click Interactions** - Trigger motions and expressions
- 😊 **Automatic Animations** - Eye blinking, breathing, idle motions
- 🔒 **Secure Asset Loading** - Models loaded from `src/assets` with hashed URLs
- ⚛️ **React Component** - Easy-to-use `<Live2DViewer />` component
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

## 📁 Project Structure

```
frontend/
├── public/
│   └── live2dcubismcore.min.js  # Live2D Core library
├── src/
│   ├── assets/
│   │   └── Haru/                 # Model files (managed here!)
│   │       ├── Haru.model3.json
│   │       ├── Haru.moc3
│   │       ├── Haru.2048/        # Textures
│   │       ├── expressions/      # Expression files
│   │       └── motions/          # Motion files
│   ├── components/
│   │   └── Live2DViewer.tsx      # React component
│   ├── lib/
│   │   ├── framework/            # Cubism Framework (included)
│   │   └── live2d/               # Integration layer
│   │       ├── LAppDefine.ts     # Configuration
│   │       ├── LAppModel.ts      # Model class
│   │       ├── LAppLive2DManager.ts
│   │       ├── ModelLoader.ts    # Secure asset loading
│   │       └── ...
│   └── App.tsx
├── docs/
│   └── MODEL_SECURITY.md         # Security guide
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

### With Custom Props

```tsx
<Live2DViewer 
  width="800px" 
  height="600px" 
  className="my-live2d-canvas" 
/>
```

## 🔒 Security Considerations

This project implements a secure approach to loading model assets that prevents direct URL access.

### Current Implementation

Models are stored in `src/assets/` instead of `public/`, using Vite's asset import system:

| Traditional Approach | This Implementation |
|---------------------|---------------------|
| `/public/models/Haru.moc3` | `src/assets/Haru/Haru.moc3` |
| Direct URL access possible | Hashed filenames in build |
| Easy to guess URLs | URLs like `Haru-B_Kvcr7l.moc3` |

**How it works:**

```typescript
// ModelLoader.ts uses import.meta.glob
const modelFiles = import.meta.glob('/src/assets/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
});
```

### Security Levels

For production applications with user-uploaded models, consider these options:

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
// Models to load
export const ModelDir: string[] = ['Haru'];

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

1. **Add model files** to `src/assets/YourModel/`
2. **Update configuration** in `LAppDefine.ts`:
   ```typescript
   export const ModelDir: string[] = ['Haru', 'YourModel'];
   ```
3. **Restart dev server** - Vite will pick up new assets

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
- Reduce texture sizes for mobile
- Disable physics for low-end devices:
  ```typescript
  // In LAppModel.ts, skip physics loading
  ```

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
