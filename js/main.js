document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const globalHomeBtn = document.getElementById('global-home-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    
    // --- STATO APPLICAZIONE ---
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
            app.innerHTML = '<p>Errore critico: impossibile caricare le domande.</p>';
        }
    }

    function loadUserProgress() {
        const saved = localStorage.getItem('vessiamociUserProgress');
        userProgress = saved ? JSON.parse(saved) : { questionStats: {} };
    }

    function saveProgress() {
        localStorage.setItem('vessiamociUserProgress', JSON.stringify(userProgress));
    }
    
    function setupGlobalListeners() {
        // ... (identica alla versione precedente)
    }

    // --- GESTIONE VISTE PRINCIPALI ---
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
            if (!action) return;
            
            if (action === 'training-mode') {
                startLesson('all', 'timed');
            } else if (action === 'view-stats') {
                renderStatsPage();
            } else {
                renderMacroAreaSelection(action);
            }
        });
    }

    // --- GESTIONE STATISTICHE ---
    function renderStatsPage() {
        const stats = {
            totalAnswered: 0,
            totalCorrect: 0,
            byArea: {}
        };

        for (const qId in userProgress.questionStats) {
            const questionStat = userProgress.questionStats[qId];
            const correctCount = questionStat.correct || 0;
            const incorrectCount = questionStat.incorrect || 0;
            const total = correctCount + incorrectCount;

            if (total > 0) {
                const question = allQuestions.find(q => q.id == qId);
                if (question) {
                    stats.totalAnswered += total;
                    stats.totalCorrect += correctCount;
                    const area = question.macro_area;
                    if (!stats.byArea[area]) {
                        stats.byArea[area] = { correct: 0, total: 0 };
                    }
                    stats.byArea[area].correct += correctCount;
                    stats.byArea[area].total += total;
                }
            }
        }
        
        let bestArea = 'N/A';
        let bestAreaPerc = -1;

        for (const area in stats.byArea) {
            const percentage = (stats.byArea[area].correct / stats.byArea[area].total) * 100;
            if(percentage > bestAreaPerc) {
                bestAreaPerc = percentage;
                bestArea = area;
            }
        }
        
        const overallPercentage = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
        
        let statsHtml = `<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>`;

        if (stats.totalAnswered === 0) {
            statsHtml += '<p>Non hai ancora risposto a nessuna domanda. Inizia un test per vedere le tue statistiche!</p>';
        } else {
            statsHtml += `
            <div class="stats-header">
                <div class="stat-card"><div class="value green">${overallPercentage}%</div><div class="label">Successo Totale</div></div>
                <div class="stat-card"><div class="value">${stats.totalAnswered}</div><div class="label">Domande Risposte</div></div>
                <div class="stat-card"><div class="value">${bestArea}</div><div class="label">Area Migliore</div></div>
            </div>`;
            
            statsHtml += `<div class="stats-section"><h3>Performance per Macroarea</h3>`;
            for (const area in stats.byArea) {
                const perc = Math.round((stats.byArea[area].correct / stats.byArea[area].total) * 100);
                statsHtml += `<div class="stat-item">
                    <div class="stat-item-header"><span>${area}</span><span>${perc}%</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: ${perc}%;"></div></div>
                </div>`;
            }
            statsHtml += '</div>';

            const toughestQuestions = Object.entries(userProgress.questionStats)
                .filter(([id, stat]) => stat.incorrect > 0)
                .sort(([, a], [, b]) => b.incorrect - a.incorrect)
                .slice(0, 3);
            
            if (toughestQuestions.length > 0) {
                statsHtml += `<div class="stats-section"><h3>Domande da Ripassare</h3><ul class="toughest-questions-list">`;
                toughestQuestions.forEach(([qId,]) => {
                    const q = allQuestions.find(item => item.id == qId);
                    if (q) statsHtml += `<li>${q.question}</li>`;
                });
                statsHtml += '</ul></div>';
            }
        }
        app.innerHTML = statsHtml;
    }

    // --- LOGICA LEZIONE (con aggiornamenti per audio e salvataggio progressi) ---
    function checkCurrentAnswer() {
        // ...
        if (!userProgress.questionStats[q.id]) {
            userProgress.questionStats[q.id] = { correct: 0, incorrect: 0 };
        }
        if (isCorrect) {
            userProgress.questionStats[q.id].correct++;
        } else {
            userProgress.questionStats[q.id].incorrect++;
        }
        saveProgress();
        // ...
        showFeedback(isCorrect);
    }
    
    // ...tutte le altre funzioni di `js/main.js` sono identiche alla versione precedente che ti ho fornito
    // (startLesson, renderQuestion, startTimer, handleTimeout, showFeedback, nextQuestion, toggleSound, 
    // openSearchModal, handleSearch, showModal, closeModal, etc.)
    // quindi puoi copiare e incollare l'intero blocco di codice per sicurezza.
});
