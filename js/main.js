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
    let currentLesson = { timerId: null, startTime: null };
    let soundEnabled = true;

    // --- AUDIO ---
    const correctSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3');
    const incorrectSound = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3');
    const timeoutSound = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_a1329c4e20.mp3');

    // --- INIZIALIZZAZIONE ---
    async function main() {
        // ... (Logica di caricamento invariata)
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        userProgress = savedProgress ? JSON.parse(savedProgress) : { questionStats: {}, achievements: [], studyStreak: { current: 0, lastDate: null } };
        if (!userProgress.achievements) userProgress.achievements = []; // Compatibilità
        if (!userProgress.studyStreak) userProgress.studyStreak = { current: 0, lastDate: null }; // Compatibilità
        // ... il resto della funzione invariato
    }
    
    // --- GESTIONE VISTE PRINCIPALI ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        // ... (renderDashboard con cambio nome pulsante, invariato)
    }

    function renderMacroAreaSelection(mode = 'standard') {
        const title = mode === 'mistakes' ? "Ripassa i tuoi Errori" : "Scegli una Macroarea";
        let questionSource = (mode === 'mistakes') ?
            Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId].incorrect > 0) :
            allQuestions.map(q => q.id);

        const availableAreas = [...new Set(allQuestions.filter(q => questionSource.includes(q.id.toString())).map(q => q.macro_area))];
        
        let html = `<h2>${title}</h2><div class="dashboard-grid">`;
        html += `<div class="dashboard-card btn-all-categories" data-area="all">Tutte</div>`; // Pulsante "Tutte"
        availableAreas.forEach(area => {
            html += `<div class="dashboard-card" data-area="${area}">${area}</div>`;
        });
        html += `</div>`;
        app.innerHTML = html;
        app.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => startLesson(card.dataset.area, mode));
        });
    }

    // --- LOGICA DI GIOCO ---
    function startLesson(macroArea, mode) {
        let questionPool;
        let baseSource;

        if (mode === 'mistakes') {
            const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId].incorrect > 0);
            baseSource = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
        } else {
            baseSource = allQuestions;
        }

        if (macroArea === 'all') {
            questionPool = [...baseSource].sort(() => 0.5 - Math.random());
        } else {
            questionPool = baseSource.filter(q => q.macro_area === macroArea).sort(() => 0.5 - Math.random());
        }

        const lessonLength = (mode === 'timed') ? 20 : (mode === 'mistakes' ? questionPool.length : 10);
        currentLesson = {
            questions: questionPool.slice(0, lessonLength),
            currentIndex: 0, mode: mode, timerId: null, correctAnswers: 0,
            report: []
        };
        // ...
        renderQuestion();
    }

    function renderQuestion() {
        currentLesson.startTime = Date.now(); // Salva il tempo di inizio per calcolare la risposta
        // ... (renderQuestion con modifiche per timer, classi e pulsanti, invariato)
    }

    function setupQuestionListeners() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        if (currentLesson.mode === 'timed' && (q.type === 'multiple_choice' || q.type === 'true_false')) {
            app.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedAnswer = e.currentTarget.dataset.answer;
                    checkCurrentAnswer(selectedAnswer);
                });
            });
            document.getElementById('check-answer-btn').classList.add('visually-hidden');
        } else {
            document.getElementById('check-answer-btn').addEventListener('click', () => checkCurrentAnswer());
        }
        // ... il resto della funzione invariato
    }
    
    function checkCurrentAnswer(immediateAnswer = null) {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        
        const timeToAnswer = (Date.now() - currentLesson.startTime) / 1000; // Secondi
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        if (immediateAnswer !== null) {
            userAnswer = immediateAnswer;
        } else if (q.type === 'open_answer') {
            userAnswer = document.getElementById('open-answer-input').value;
        } else {
            const selectedBtn = app.querySelector('.option-btn[style*="--blue-action"]');
            userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
        }
        
        // ... Logica di verifica risposta (invariata)
        
        currentLesson.report.push({ question: q, userAnswer, isCorrect, timeToAnswer });
        // ... Salva progressi (invariato)
        
        showFeedback(isCorrect);
    }
    
    function showFeedback(isCorrect, message = "") {
        if (soundEnabled) { isCorrect ? correctSound.play() : incorrectSound.play(); }
        
        // Per feedback istantaneo in modalità allenamento
        if (currentLesson.mode === 'timed') {
            app.querySelector('.answer-options').classList.add('disabled');
            showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), currentLesson.questions[currentLesson.currentIndex].explanation, feedbackModal);
            setTimeout(nextQuestion, 2500); // Passa alla prossima dopo 2.5s
            return;
        }
        // ... (logica di feedback standard per le altre modalità, invariata)
    }

    function nextQuestion() {
        // ...
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            // Fine lezione/test
            if (currentLesson.mode === 'timed') {
                renderTrainingReport();
            } else {
                app.innerHTML = `...`; // Schermata di fine test standard
            }
        }
    }
    
    function renderTrainingReport() {
        let reportHtml = `<h2><i class="fa-solid fa-scroll"></i> Report Allenamento</h2>`;
        currentLesson.report.forEach(item => {
            reportHtml += `
                <div class="test-report-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                    <p class="report-q-text">${item.question.question}</p>
                    <p class="report-user-answer">La tua risposta: ${item.userAnswer || "Nessuna"}</p>
                    <div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div>
                </div>
            `;
        });
        reportHtml += `<button id="back-to-dash" ... >Torna alla Dashboard</button>`;
        app.innerHTML = reportHtml;
        document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
    }

    // --- STATISTICHE E GAMIFICATION ---
    function renderStatsPage() {
        // ... Logica complessa per calcolare streak, accuratezza, tempo medio, ecc.
        // Questa funzione va riscritta per includere tutti i nuovi dati.
        // Ad esempio, il calcolo dello streak:
        const today = new Date().toISOString().split('T')[0];
        if (userProgress.studyStreak.lastDate !== today) {
            const yesterday = new Date(Date.now() - 864e5).toISOString().split('T')[0];
            if (userProgress.studyStreak.lastDate === yesterday) {
                userProgress.studyStreak.current++;
            } else {
                userProgress.studyStreak.current = 1;
            }
            userProgress.studyStreak.lastDate = today;
            saveProgress();
        }
        
        // ... E così via per tutti gli altri calcoli
        // ... Il rendering HTML popolerà la nuova struttura con calendario, badge, ecc.
        app.innerHTML = `<h2>Statistiche Avanzate</h2><p>Pagina in costruzione con la nuova logica di gamification.</p>`; // Placeholder
    }
    
    // ... (tutte le altre funzioni di supporto, modali, audio, ecc., invariate)
});
