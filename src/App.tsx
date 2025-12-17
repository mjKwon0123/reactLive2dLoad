import { useRef, useState } from 'react';
import { Live2DViewer, Live2DViewerHandle } from './components/Live2DViewer';
import { LAppDefine } from './lib/live2d';
import './App.css';

const models = LAppDefine.ModelDir;

function App() {
  const viewerRef = useRef<Live2DViewerHandle>(null);
  const [currentModel, setCurrentModel] = useState(0);

  const handleModelChange = (index: number) => {
    viewerRef.current?.changeModel(index);
    setCurrentModel(index);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Live2D Cubism Demo</h1>
        <p className="subtitle">마우스로 캐릭터를 드래그해보세요!</p>
      </header>

      {/* 모델 선택 UI */}
      <nav className="model-selector">
        {models.map((model, index) => (
          <button
            key={model}
            className={`model-btn ${currentModel === index ? 'active' : ''}`}
            onClick={() => handleModelChange(index)}
          >
            {model}
          </button>
        ))}
      </nav>

      <main className="live2d-container">
        <Live2DViewer
          ref={viewerRef}
          className="live2d-canvas"
          onModelChange={setCurrentModel}
        />
      </main>

      <footer className="app-footer">
        <p>Click on the character to trigger motions and expressions</p>
      </footer>
    </div>
  );
}

export default App;
