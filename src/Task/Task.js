import './Task.css';
import { useEffect, useState } from 'react';
export const ETATS = {
    NOUVEAU: 'Nouveau',
    EN_COURS: 'En cours',
    REUSSI: 'Réussi',
    EN_ATTENTE: 'En attente',
    ABANDONNE: 'Abandonné',
}
export const ETAT_TERMINE = [
    ETATS.REUSSI,
    ETATS.ABANDONNE,
]

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

    function FilterStateTask() {
        const filteredTasks = taches.filter((tache) => tache.etat === ETATS.EN_COURS);
        setTasks(filteredTasks);
    }
    function AddTask() {
        const newTask = {
            id: Date.now(),
            title: 'Nouvelle tâche',
            description: '',
            date_creation: new Date().toISOString().split('T')[0],
            date_echeance: '',
            etat: ETATS.NOUVEAU,
        };
        setTasks([...taches, newTask]);
    }

    return (
        <div>
            <header className='Header-task'>
                <h1 className='Title-task'>Liste des tâches</h1>
                <button onClick={FilterStateTask} className='Button-filter'>
                    Filtrer les tâches en cours
                </button>
            </header>
            {taches.map((taches) => (
                <div key={taches.id} className='Task-card'>
                    <h3 className='Title-card'>{taches.title}</h3>
                    <p>{taches.description || 'Pas de description'}</p>
                    <p>Creation: {taches.date_creation}</p>
                    <p>Echeance: {taches.date_echeance}</p>
                    <p>Etat: {taches.etat}</p>
                </div>
            ))}
            <footer className='Footer-task'>
                <button onClick={AddTask} className='Button-page'>
                    Rajouter une tache
                </button>
            </footer>
        </div>
        
    );
}

export default Task;