import { Live2DViewer } from './components/Live2DViewer';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Live2D Cubism Demo</h1>
        <p className="subtitle">마우스로 캐릭터를 드래그해보세요!</p>
      </header>
      <main className="live2d-container">
        <Live2DViewer className="live2d-canvas" />
      </main>
      <footer className="app-footer">
        <p>Click on the character to trigger motions and expressions</p>
      </footer>
    </div>
  );
}

export default App;
