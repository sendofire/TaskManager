import './Task.css';
import { useEffect, useState } from 'react';

const STORAGE_TASKS_KEY = 'taskmanager.taches';
const STORAGE_DOSSIERS_KEY = 'taskmanager.dossiers';
const STORAGE_RELATIONS_KEY = 'taskmanager.relations';

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

function normalizeEtat(etat) {
    return (etat || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function normalizeText(value) {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function getDateEcheanceValue(tache) {
    if (!tache.date_echeance) {
        return Number.NEGATIVE_INFINITY;
    }

    const dateValue = new Date(tache.date_echeance).getTime();
    return Number.isNaN(dateValue) ? Number.NEGATIVE_INFINITY : dateValue;
}

function buildSimpleModeTasks(tasks) {
    const doneStates = new Set([
        ...ETAT_TERMINE.map((etat) => normalizeEtat(etat)),
        'reussi',
        'abandone',
    ]);

    const nonFinishedTasks = tasks.filter((tache) => {
        return !doneStates.has(normalizeEtat(tache.etat));
    });

    const sortedTasks = [...nonFinishedTasks].sort((a, b) => {
        return getDateEcheanceValue(b) - getDateEcheanceValue(a);
    });

    const enCoursTasks = sortedTasks.filter((tache) => {
        return normalizeEtat(tache.etat) === normalizeEtat(ETATS.EN_COURS);
    });

    const otherTasks = sortedTasks.filter((tache) => {
        return normalizeEtat(tache.etat) !== normalizeEtat(ETATS.EN_COURS);
    });

    return {
        enCoursTasks,
        otherTasks,
        flattened: [...enCoursTasks, ...otherTasks],
    };
}

function buildDossiersByTask(dossiers, relations) {
    const dossierTitleById = new Map();
    dossiers.forEach((dossier) => {
        dossierTitleById.set(dossier.id, dossier.title || 'Sans nom');
    });

    const dossierTitlesByTask = new Map();
    const dossierIdsByTask = new Map();
    relations.forEach((relation) => {
        const taskId = relation.tache;
        const dossierTitle = dossierTitleById.get(relation.dossier);

        if (!taskId || !dossierTitle) {
            return;
        }

        const existingTitles = dossierTitlesByTask.get(taskId) || [];
        const existingIds = dossierIdsByTask.get(taskId) || [];

        dossierTitlesByTask.set(taskId, [...existingTitles, dossierTitle]);
        dossierIdsByTask.set(taskId, [...existingIds, relation.dossier]);
    });

    return {
        dossierTitlesByTask,
        dossierIdsByTask,
    };
}

function enrichTasksWithDossiers(tasks, dossiersByTask) {
    return tasks.map((task) => {
        const relationTitles = dossiersByTask.dossierTitlesByTask.get(task.id) || [];
        const relationIds = dossiersByTask.dossierIdsByTask.get(task.id) || [];
        const existingTitles = Array.isArray(task.dossiers) ? task.dossiers : [];
        const existingIds = Array.isArray(task.dossierIds) ? task.dossierIds : [];
        const mergedTitles = relationTitles.length > 0 ? relationTitles : existingTitles;
        const mergedIds = relationIds.length > 0 ? relationIds : existingIds;

        return {
            ...task,
            dossiers: mergedTitles,
            dossierIds: mergedIds,
        };
    });
}

function Task() {
    const [isDateFilterActive, setIsDateFilterActive] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [nameFilterInput, setNameFilterInput] = useState('');
    const [showDossierFilterPanel, setShowDossierFilterPanel] = useState(false);
    const [selectedDossierFilterIds, setSelectedDossierFilterIds] = useState([]);
    const [includeNoDossierFilter, setIncludeNoDossierFilter] = useState(false);
    const [taches, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [allDossiers, setAllDossiers] = useState([]);
    const [allRelations, setAllRelations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        date_echeance: '',
        etat: ETATS.NOUVEAU,
        dossierIds: [],
    });

    useEffect(() => {
        async function loadTasks() {
            try {
                const response = await fetch('/data.json');
                if (!response.ok) {
                    throw new Error('Impossible de charger le fichier JSON');
                }

                const data = await response.json();
                const storedTasks = localStorage.getItem(STORAGE_TASKS_KEY);
                const storedDossiers = localStorage.getItem(STORAGE_DOSSIERS_KEY);
                const storedRelations = localStorage.getItem(STORAGE_RELATIONS_KEY);

                const loadedDossiers = storedDossiers
                    ? JSON.parse(storedDossiers)
                    : (Array.isArray(data.dossiers) ? data.dossiers : []);
                const loadedRelations = storedRelations
                    ? JSON.parse(storedRelations)
                    : (Array.isArray(data.relations) ? data.relations : []);

                setAllDossiers(loadedDossiers);
                setAllRelations(loadedRelations);

                const dossiersByTask = buildDossiersByTask(loadedDossiers, loadedRelations);

                if (storedTasks) {
                    const parsed = JSON.parse(storedTasks);
                    const enrichedStoredTasks = enrichTasksWithDossiers(parsed, dossiersByTask);
                    setTasks(buildSimpleModeTasks(enrichedStoredTasks).flattened);
                    setAllTasks(enrichedStoredTasks);
                    return;
                }
                const loadedTasks = data.taches || [];
                const enrichedLoadedTasks = enrichTasksWithDossiers(loadedTasks, dossiersByTask);
                setTasks(buildSimpleModeTasks(enrichedLoadedTasks).flattened);
                setAllTasks(enrichedLoadedTasks);
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
            localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(allTasks));
        }
    }, [allTasks, loading]);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(STORAGE_DOSSIERS_KEY, JSON.stringify(allDossiers));
        }
    }, [allDossiers, loading]);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(STORAGE_RELATIONS_KEY, JSON.stringify(allRelations));
        }
    }, [allRelations, loading]);


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
        const normalizedInput = normalizeText(nameFilterInput);

        if (!normalizedInput) {
            setTasks(buildSimpleModeTasks(allTasks).flattened);
            return;
        }

        const filteredTasks = allTasks.filter((tache) => {
            return normalizeText(tache.title) === normalizedInput;
        });

        setTasks(filteredTasks);
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
        setTasks(buildSimpleModeTasks(allTasks).flattened);
        setIsDateFilterActive(false);
    }

    function handleInputChange(event) {
        const { name, value } = event.target;
        setNewTask((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function toggleNewTaskDossier(dossierId) {
        setNewTask((previous) => {
            const previousIds = Array.isArray(previous.dossierIds) ? previous.dossierIds : [];
            const exists = previousIds.includes(dossierId);

            return {
                ...previous,
                dossierIds: exists
                    ? previousIds.filter((id) => id !== dossierId)
                    : [...previousIds, dossierId],
            };
        });
    }

    function AddTask(event) {
        event.preventDefault();

        if (!newTask.title.trim()) {
            setError('Le titre de la tache est obligatoire.');
            return;
        }

        setError('');

        const selectedDossierIds = Array.isArray(newTask.dossierIds) ? newTask.dossierIds : [];
        const selectedDossierTitles = allDossiers
            .filter((dossier) => selectedDossierIds.includes(dossier.id))
            .map((dossier) => dossier.title || 'Sans nom');

        const newTaskId = Date.now();

        const createdTask = {
            id: newTaskId,
            title: newTask.title.trim(),
            description: newTask.description.trim(),
            date_creation: new Date().toISOString().split('T')[0],
            date_echeance: newTask.date_echeance,
            etat: newTask.etat,
            dossiers: selectedDossierTitles,
            dossierIds: selectedDossierIds,
        };

        const createdRelations = selectedDossierIds.map((dossierId) => ({
            tache: newTaskId,
            dossier: dossierId,
        }));

        const updatedTasks = [...allTasks, createdTask];
        const updatedRelations = [...allRelations, ...createdRelations];
        setAllTasks(updatedTasks);
        setAllRelations(updatedRelations);
        setTasks(buildSimpleModeTasks(updatedTasks).flattened);

        setNewTask({
            title: '',
            description: '',
            date_echeance: '',
            etat: ETATS.NOUVEAU,
            dossierIds: [],
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
                <input
                    type='text'
                    value={nameFilterInput}
                    onChange={(event) => setNameFilterInput(event.target.value)}
                    placeholder='Nom exact de la tache'
                />
                <button onClick={FilterNameTask} className='Button-filter'>
                    Rechercher par nom
                </button>
                <button onClick={FilterStateTask} className='Button-filter'>
                    Filtrer les tâches par état
                </button>
                <button
                    onClick={() => setShowDossierFilterPanel((previous) => !previous)}
                    className='Button-filter'
                >
                    Filtrer par dossier
                </button>
                {showDossierFilterPanel && (
                    <div>
                        <label>
                            <input
                                type='checkbox'
                                checked={includeNoDossierFilter}
                                onChange={(event) => setIncludeNoDossierFilter(event.target.checked)}
                            />
                            Sans dossier
                        </label>
                        {allDossiers.map((dossier) => (
                            <label key={dossier.id}>
                                <input
                                    type='checkbox'
                                    checked={selectedDossierFilterIds.includes(dossier.id)}
                                    onChange={() => {
                                        setSelectedDossierFilterIds((previous) => {
                                            if (previous.includes(dossier.id)) {
                                                return previous.filter((id) => id !== dossier.id);
                                            }

                                            return [...previous, dossier.id];
                                        });
                                    }}
                                />
                                {dossier.title}
                            </label>
                        ))}
                        <button
                            className='Button-filter'
                            onClick={() => {
                                const filteredTasks = allTasks.filter((task) => {
                                    const taskDossierIds = Array.isArray(task.dossierIds) ? task.dossierIds : [];
                                    const hasNoDossier = taskDossierIds.length === 0;

                                    const matchNoDossier = includeNoDossierFilter && hasNoDossier;
                                    const matchSelectedDossiers = selectedDossierFilterIds.length > 0
                                        && selectedDossierFilterIds.some((selectedId) => taskDossierIds.includes(selectedId));

                                    if (!includeNoDossierFilter && selectedDossierFilterIds.length === 0) {
                                        return true;
                                    }

                                    return matchNoDossier || matchSelectedDossiers;
                                });

                                setTasks(filteredTasks);
                            }}
                        >
                            Appliquer filtre dossier
                        </button>
                    </div>
                )}
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
                    <p>
                        Dossiers: {Array.isArray(tache.dossiers) && tache.dossiers.length > 0 ? tache.dossiers.join(', ') : 'Aucun'}
                    </p>
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

                            <div>
                                <p>Dossiers</p>
                                {allDossiers.length === 0 && <p>Aucun dossier disponible</p>}
                                {allDossiers.map((dossier) => (
                                    <label key={dossier.id}>
                                        <input
                                            type='checkbox'
                                            checked={newTask.dossierIds.includes(dossier.id)}
                                            onChange={() => toggleNewTaskDossier(dossier.id)}
                                        />
                                        {dossier.title}
                                    </label>
                                ))}
                            </div>

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