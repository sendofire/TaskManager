import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import Task from './Task/Task.js';

const TASK_STORAGE_KEY = 'taskmanager.taches';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [uploadError, setUploadError] = useState('');

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

  function handleTaskFileUpload(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    setUploadError('');

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (!parsed || !Array.isArray(parsed.taches)) {
          throw new Error('Le JSON doit contenir une cle "taches" de type tableau.');
        }

        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(parsed.taches));
        goTo('/task');
      } catch (error) {
        setUploadError(error.message || 'Fichier JSON invalide.');
      }
    };

    reader.onerror = () => {
      setUploadError('Impossible de lire le fichier selectionne.');
    };

    reader.readAsText(file);
    event.target.value = '';
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
        <h1>Accueil</h1>
        <p>Charger un fichier JSON de taches</p>
        <input
          type='file'
          accept='.json,application/json'
          onChange={handleTaskFileUpload}
        />
        {uploadError && <p>{uploadError}</p>}
        <button onClick={() => goTo('/task')} className='Button-page'>
          Aller vers la page Task
        </button>

        <img src={logo} className="App-logo" alt="logo" />
      </header>
    </div>
  );
}

export default App;