import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import Task from './Task/Task.js';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleLocationChange() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  function goTo(path) {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }

  if (currentPath === '/task') {
    return (
      <div className="App">
        <header className="App-header">
          <button onClick={() => goTo('/')} className='Button-page'>
            Retour a l'accueil
          </button>
          <Task />
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={() => goTo('/task')} className='Button-page'>
          Aller vers la page Task
        </button>

        <img src={logo} className="App-logo" alt="logo" />
      </header>
    </div>
  );
}

export default App;