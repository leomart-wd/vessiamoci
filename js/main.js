document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI E STATO ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const globalHomeBtn = document.getElementById('global-home-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    const questionDetailModal = document.getElementById('question-detail-modal');

    let allQuestions = [];
    let userProgress = {};
    let currentLesson = { timerId: null };
    let soundEnabled = true;

    // --- AUDIO ---
    const correctSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3');
    const incorrectSound = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3');
    const timeoutSound = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_a1329c4e20.mp3');

    // --- INIZIALIZZAZIONE ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        try {
            const response = await fetch('data/questions.json');
            allQuestions = await response.json();
            loadUserProgress();
            setupGlobalListeners();
            renderDashboard();
        } catch (error) {
            app.innerHTML = `<p>Errore critico: impossibile caricare le domande. Controlla il file 'data/questions.json'.</p>`;
        }
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        userProgress = savedProgress ? JSON.parse(savedProgress) : { questionStats: {}, achievements: [], studyStreak: { current: 0, lastDate: null } };
        if (!userProgress.achievements) userProgress.achievements = [];
        if (!userProgress.studyStreak) userProgress.studyStreak = { current: 0, lastDate: null };
        const savedSound = localStorage.getItem('vessiamociSoundEnabled');
        soundEnabled = savedSound !== null ? JSON.parse(savedSound) : true;
        updateSoundIcon();
    }

    function saveProgress() {
        localStorage.setItem('vessiamociUserProgress', JSON.stringify(userProgress));
    }

    function setupGlobalListeners() {
        homeTitle.addEventListener('click', renderDashboard);
        globalHomeBtn.addEventListener('click', renderDashboard);
        globalSearchBtn.addEventListener('click', openSearchModal);
        soundToggleBtn.addEventListener('click', toggleSound);
        [feedbackModal, searchModal, questionDetailModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) closeModal(modal);
            });
        });
        searchModal.querySelector('#search-modal-input').addEventListener('input', handleSearch);
    }

    // --- VISTE PRINCIPALI ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        app.innerHTML = `
            <div class="dashboard-grid">
                <div class="dashboard-card" data-action="start-lesson"> <i class="fa-solid fa-rocket"></i> Inizia il Test </div>
                <div class="dashboard-card" data-action="training-mode"> <i class="fa-solid fa-stopwatch"></i> Modalità Allenamento </div>
                <div class="dashboard-card" data-action="review-mistakes"> <i class="fa-solid fa-circle-check"></i> Ripassa i tuoi Errori </div>
                <div class="dashboard-card" data-action="view-stats"> <i class="fa-solid fa-chart-pie"></i> Visualizza Risultati </div>
            </div>`;
        app.querySelector('.dashboard-grid').addEventListener('click', (e) => {
            const action = e.target.closest('.dashboard-card')?.dataset.action;
            if (action) handleDashboardAction(action);
        });
    }

    function handleDashboardAction(action) {
        switch (action) {
            case 'start-lesson':
                renderMacroAreaSelection('standard');
                break;
            case 'training-mode':
                startLesson('all', 'timed');
                break;
            case 'review-mistakes':
                renderMacroAreaSelection('mistakes');
                break;
            case 'view-stats':
                renderStatsPage();
                break;
        }
    }

    function renderMacroAreaSelection(mode = 'standard') {
        const title = mode === 'mistakes' ? "Ripassa i tuoi Errori" : "Scegli una Macroarea";
        const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
        const source = (mode === 'mistakes') ? allQuestions.filter(q => mistakenIds.includes(q.id.toString())) : allQuestions;
        const availableAreas = [...new Set(source.map(q => q.macro_area))];

        let html = `<h2>${title}</h2><div class="dashboard-grid">`;
        if (availableAreas.length > 1) html += `<div class="dashboard-card btn-all-categories" data-area="all">Tutte</div>`;
        availableAreas.forEach(area => {
            html += `<div class="dashboard-card" data-area="${area}">${area}</div>`;
        });
        html += `</div>`;
        if (availableAreas.length === 0 && mode === 'mistakes') {
            html = `<h2>Ripassa i tuoi Errori</h2><div class="question-container" style="text-align:center;"><p>Nessun errore da ripassare. Ottimo lavoro!</p></div>`;
        }
        app.innerHTML = html;
        app.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => startLesson(card.dataset.area, mode));
        });
    }

    // --- LOGICA LEZIONE ---
    function startLesson(macroArea, mode) {
        let questionPool;
        let baseSource;
        if (mode === 'mistakes') {
            const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
            baseSource = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
        } else {
            baseSource = allQuestions;
        }

        if (macroArea === 'all') {
            questionPool = [...baseSource].sort(() => 0.5 - Math.random());
        } else {
            questionPool = baseSource.filter(q => q.macro_area === macroArea).sort(() => 0.5 - Math.random());
        }

        const lessonLength = mode === 'timed' ? 20 : (mode === 'mistakes' ? questionPool.length : 10);
        currentLesson = {
            questions: questionPool.slice(0, lessonLength),
            currentIndex: 0, mode: mode, timerId: null, correctAnswers: 0, report: []
        };
        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', mode === 'mistakes' ? 'Nessun errore da ripassare in questa categoria.' : 'Nessuna domanda disponibile per questa selezione.', feedbackModal);
            return;
        }
        renderQuestion();
    }
    
    function renderQuestion() {
        // ... (identico alla versione precedente)
    }
    
    // ...
    // E tutto il resto del codice che ti ho fornito precedentemente.
    // L'errore non era in un piccolo typo ma nella logica di dispatching della dashboard
    // che ora è stata completamente corretta e implementata.
});
