import './Task.css';
import { useEffect, useState } from 'react';

function Task() {
  const [showTask, setShowTask] = useState(false);
  const [taches, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch('/data.json');
        if (!response.ok) {
          throw new Error('Impossible de charger le fichier JSON');
        }

        const data = await response.json();
        setTasks(data.taches || []);
      } catch (err) {
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

    return (
          <div>
            {taches.map((taches) => (
              <div key={taches.id} className='Task-card'>
                <h3 className='Title-card'>{taches.title}</h3>
                <p>{taches.description || 'Pas de description'}</p>
                <p>Creation: {taches.date_creation}</p>
                <p>Echeance: {taches.date_echeance}</p>
                <p>Etat: {taches.etat}</p>
              </div>
            ))}
          </div>
        
    );
}

export default Task;