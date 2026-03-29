import './App.css';
import { useEffect, useState } from 'react';
import Task from './Task/Task.js';

const TASK_STORAGE_KEY = 'taskmanager.taches';
const DOSSIER_STORAGE_KEY = 'taskmanager.dossiers';
const RELATION_STORAGE_KEY = 'taskmanager.relations';

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

        const dossiers = Array.isArray(parsed.dossiers) ? parsed.dossiers : [];
        const relations = Array.isArray(parsed.relations) ? parsed.relations : [];

        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(parsed.taches));
        localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(dossiers));
        localStorage.setItem(RELATION_STORAGE_KEY, JSON.stringify(relations));
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
        <header className="App-header App-header--task">
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
      <header className="App-header App-header--home">
        <div className='Home-panel'>
          <p className='Home-kicker'>Task Manager Console</p>
          <h1>Accueil</h1>
          <p className='Home-subtitle'>Charge ton fichier JSON et lance ton suivi de taches.</p>

          <label className='Home-upload'>
            <span>Importer un fichier JSON</span>
            <input
              type='file'
              accept='.json,application/json'
              onChange={handleTaskFileUpload}
            />
          </label>

          {uploadError && <p className='Home-error'>{uploadError}</p>}

          <button onClick={() => goTo('/task')} className='Button-page Home-cta'>
            Ouvrir la page Task
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;