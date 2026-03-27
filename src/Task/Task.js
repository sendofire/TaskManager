import './Task.css';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'taskmanager.taches';

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
    const [isDateFilterActive, setIsDateFilterActive] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [taches, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        date_echeance: '',
        etat: ETATS.NOUVEAU,
    });

    useEffect(() => {
        async function loadTasks() {
            try {
                const storedTasks = localStorage.getItem(STORAGE_KEY);

                if (storedTasks) {
                    const parsed = JSON.parse(storedTasks);
                    setTasks(parsed);
                    setAllTasks(parsed);
                    return;
                }

                const response = await fetch('/data.json');
                if (!response.ok) {
                    throw new Error('Impossible de charger le fichier JSON');
                }

                const data = await response.json();
                const loadedTasks = data.taches || [];
                setTasks(loadedTasks);
                setAllTasks(loadedTasks);
            } catch (err) {
                setError(err.message || 'Erreur inconnue');
            } finally {
                setLoading(false);
            }
        }

        loadTasks();
    }, []);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
        }
    }, [allTasks, loading]);


    /*
    * Ensemble des filtre actifs
    * - filtre par état "en cours"
    * - filtre par date d'échéance (croissante/décroissante)
    * - réinitialisation des filtres
    */
    function FilterStateInWorkTask() {
        setTasks((previousTasks) => {
            const enCoursTasks = [];
            const otherTasks = [];

            previousTasks.forEach((tache) => {
                if ((tache.etat || '').toLowerCase() === ETATS.EN_COURS.toLowerCase()) {
                    enCoursTasks.push(tache);
                } else {
                    otherTasks.push(tache);
                }
            });

            return [...enCoursTasks, ...otherTasks];
        });
    }

    function FilterdateTask() {
        const sortedTasks = [...allTasks].sort((a, b) => {
            const aDate = a.date_echeance ? new Date(a.date_echeance).getTime() : Number.POSITIVE_INFINITY;
            const bDate = b.date_echeance ? new Date(b.date_echeance).getTime() : Number.POSITIVE_INFINITY;

            if (isDateFilterActive) {
                return bDate - aDate;
            }

            return aDate - bDate;
        });

        setTasks(sortedTasks);
        setIsDateFilterActive(!isDateFilterActive);
    }

    function FilterNameTask() {
        const sortedTasks = [...allTasks].sort((a, b) => {
            const aTitle = (a.title || '').toLowerCase();
            const bTitle = (b.title || '').toLowerCase();
            return aTitle.localeCompare(bTitle);
        });

        setTasks(sortedTasks);
    }

    function FilterStateTask() {
        const sortedTasks = [...allTasks].sort((a, b) => {
            const aEtat = (a.etat || '').toLowerCase();
            const bEtat = (b.etat || '').toLowerCase();
            return aEtat.localeCompare(bEtat);
        });

        setTasks(sortedTasks);
    }

    function ResetFilter() {
        setTasks(allTasks);
        setIsDateFilterActive(false);
    }

    function handleInputChange(event) {
        const { name, value } = event.target;
        setNewTask((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function AddTask(event) {
        event.preventDefault();

        if (!newTask.title.trim()) {
            setError('Le titre de la tache est obligatoire.');
            return;
        }

        setError('');

        const createdTask = {
            id: Date.now(),
            title: newTask.title.trim(),
            description: newTask.description.trim(),
            date_creation: new Date().toISOString().split('T')[0],
            date_echeance: newTask.date_echeance,
            etat: newTask.etat,
        };

        const updatedTasks = [...allTasks, createdTask];
        setAllTasks(updatedTasks);
        setTasks(updatedTasks);

        setNewTask({
            title: '',
            description: '',
            date_echeance: '',
            etat: ETATS.NOUVEAU,
        });

        setShowAddTaskModal(false);
    }

    return (
        <div>
            <header className='Header-task'>

                {/* ensemble des boutons de filtrage et de réinitialisation des filtres */}
                <h1 className='Title-task'>Liste des tâches</h1>
                <button onClick={FilterStateInWorkTask} className='Button-filter'>
                    Filtrer les tâches en cours
                </button>
                <button onClick={FilterdateTask} className='Button-filter'>
                    {isDateFilterActive ? 'Filtrer les tâches par dates d\'échéance croissantes' : 'Filtrer les tâches par dates d\'échéance décroissantes'}
                </button>
                <button onClick={FilterNameTask} className='Button-filter'>
                    Filtrer les tâches par nom
                </button>
                <button onClick={FilterStateTask} className='Button-filter'>
                    Filtrer les tâches par état
                </button>
                <button onClick={ResetFilter} className='Button-filter'>
                    Réinitialiser les filtres
                </button>
            </header>

            {loading && <p>Chargement...</p>}
            {error && <p>{error}</p>}

            {!loading && taches.map((tache) => (
                <div key={tache.id} className='Task-card'>
                    <h3 className='Title-card'>{tache.title}</h3>
                    <p>{tache.description || 'Pas de description'}</p>
                    <p>Creation: {tache.date_creation}</p>
                    <p>Echeance: {tache.date_echeance || 'Non definie'}</p>
                    <p>Etat: {tache.etat}</p>
                </div>
            ))}

            <footer className='Footer-task'>
                <button
                    type='button'
                    className='Button-page'
                    onClick={() => setShowAddTaskModal(true)}
                >
                    Ajouter une tache
                </button>
            </footer>

            {showAddTaskModal && (
                <div className='Task-modal-overlay' onClick={() => setShowAddTaskModal(false)}>
                    <div className='Task-modal' onClick={(event) => event.stopPropagation()}>
                        <h3>Nouvelle tache</h3>
                        <form onSubmit={AddTask} className='Task-modal-form'>
                            <input
                                type='text'
                                name='title'
                                placeholder='Titre de la tache'
                                value={newTask.title}
                                onChange={handleInputChange}
                            />
                            <input
                                type='text'
                                name='description'
                                placeholder='Description'
                                value={newTask.description}
                                onChange={handleInputChange}
                            />
                            <input
                                type='date'
                                name='date_creation'
                                value={newTask.date_creation}
                                onChange={handleInputChange}
                            />
                            <input
                                type='date'
                                name='date_echeance'
                                value={newTask.date_echeance}
                                onChange={handleInputChange}
                            />
                            <select
                                name='etat'
                                value={newTask.etat}
                                onChange={handleInputChange}
                            >
                                <option value={ETATS.NOUVEAU}>{ETATS.NOUVEAU}</option>
                                <option value={ETATS.EN_COURS}>{ETATS.EN_COURS}</option>
                                <option value={ETATS.EN_ATTENTE}>{ETATS.EN_ATTENTE}</option>
                                <option value={ETATS.REUSSI}>{ETATS.REUSSI}</option>
                                <option value={ETATS.ABANDONNE}>{ETATS.ABANDONNE}</option>
                            </select>

                            <div className='Task-modal-actions'>
                                <button type='submit' className='Button-page'>
                                    Ajouter
                                </button>
                                <button
                                    type='button'
                                    className='Button-filter'
                                    onClick={() => setShowAddTaskModal(false)}
                                >
                                    Fermer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        
    );
}

export default Task;