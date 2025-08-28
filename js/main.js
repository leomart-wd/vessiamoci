// PART 1 OF 3 START
// --- VESsiamoci: The Extraordinary Engine ---
// --- Architected with Perfection by Gemini (v1.1) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE & DOM REFERENCES ---
    const app = document.getElementById('app');
    const pcCounter = document.getElementById('pc-counter');
    const toast = document.getElementById('toast-notification');
    
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    const questionDetailModal = document.getElementById('question-detail-modal');
    const imageModal = document.getElementById('image-modal-container');

    const STRENGTH_INTERVALS = [1, 2, 5, 10, 21, 45, 90, 180]; // Spaced Repetition intervals in days
    const MASTERY_LEVEL = 5; // Strength level required to master a question

    let allQuestions = [];
    let userProgress = {};
    let currentLesson = { timerId: null, isModalOpen: false };
    let soundEnabled = true;
    let myChart = null; // Reference to the Chart.js instance

    // --- 2. AUDIO ENGINE (with valid URLs and preloading) ---
    const sounds = {
        correct: new Audio('https://actions.google.com/sounds/v1/positive/success.ogg'),
        incorrect: new Audio('https://actions.google.com/sounds/v1/negative/failure.ogg')
    };
    Object.values(sounds).forEach(sound => {
        sound.volume = 0.5;
        sound.load(); // Preload audio files for faster playback
    });

    // --- 3. GAMIFICATION ENGINE: "PROGETTO CHIMERA" ---
    const PC_REWARDS = {
        FIRST_TIME_CORRECT: 10,
        REVIEW_CORRECT: 15,
        TIMED_CORRECT: 5,
        LEVEL_UP: 100,
        MASTER_SKILL: 250
    };

    const ACHIEVEMENTS = {
        FIRST_LESSON: { title: "Il Progettista", icon: "fa-pencil-ruler", description: "Completa la tua prima lezione." },
        XP_1000: { title: "Scienziato Emergente", icon: "fa-flask", description: "Raggiungi 1,000 Punti Conoscenza." },
        FIRST_MASTERY: { title: "Pioniere Neurale", icon: "fa-brain", description: "Padroneggia la tua prima domanda." },
        USE_SEARCH: { title: "Archivista Accademico", icon: "fa-magnifying-glass", description: "Usa la funzione Cerca per trovare una domanda." },
        MASTER_50: { title: "Bio-Ingegnere", icon: "fa-sitemap", description: "Padroneggia 50 domande in totale." },
        MASTER_ANATOMIA: { title: "Certificazione in Anatomia", icon: "fa-bone", description: "Raggiungi il Livello 5 in Anatomia." },
        MASTER_FISIOLOGIA: { title: "Dottorato in Fisiologia", icon: "fa-heart-pulse", description: "Raggiungi il Livello 5 in Fisiologia." },
        MASTER_BIOMECCANICA: { title: "Specializzazione in Biomeccanica", icon: "fa-person-running", description: "Raggiungi il Livello 5 in Biomeccanica." },
        MASTER_APPLICAZIONI_DIDATTICHE: { title: "Maestro di Didattica", icon: "fa-bullseye", description: "Raggiungi il Livello 5 in Applicazioni Didattiche." },
        MASTER_FILOSOFIA_E_DIDATTICA_VES: { title: "Filosofo della Voce", icon: "fa-book-open", description: "Raggiungi il Livello 5 in Filosofia e Didattica VES." },
        MASTER_ALL: { title: "L'Uomo Vitruviano", icon: "fa-universal-access", description: "Raggiungi il Livello 5 in tutte le abilità." },
        PERFECT_LESSON: { title: "Esecuzione Perfetta", icon: "fa-check-double", description: "Completa un test con il 100% di risposte corrette." },
        SPEED_DEMON: { title: "Riflessi Sinaptici", icon: "fa-bolt", description: "Completa una Modalità Allenamento con un tempo medio inferiore a 8s." },
        STREAK_7: { title: "Costanza Inarrestabile", icon: "fa-calendar-week", description: "Mantieni un Bio-Ritmo di 7 giorni consecutivi." },
        PERFECT_REVIEW: { title: "Implacabile", icon: "fa-star-of-life", description: "Completa una sessione di Ripasso Quotidiano senza errori." }
    };
    
    // --- 4. INITIALIZATION & DATA MANAGEMENT ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        try {
            const response = await fetch('data/questions.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allQuestions = await response.json();
            loadUserProgress();
            setupGlobalListeners();
            renderDashboard();
        } catch (error) {
            app.innerHTML = `<div class="question-container" style="text-align:center;"><p><strong>Errore critico:</strong> impossibile caricare le domande. Assicurati che il file <strong>data/questions.json</strong> sia corretto e non contenga errori di sintassi.</p></div>`;
            console.error("Fetch Error:", error);
        }
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        const defaultProgress = { 
            xp: 0,
            questionStats: {}, 
            skillLevels: {}, 
            masteryHistory: {}, 
            studyStreak: { current: 0, lastDate: null },
            achievements: []
        };
        userProgress = savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : defaultProgress;
        
        const savedSound = localStorage.getItem('vessiamociSoundEnabled');
        soundEnabled = savedSound !== null ? JSON.parse(savedSound) : true;
        updateSoundIcon();
        updatePCVisuals();
    }

    function saveProgress() {
        localStorage.setItem('vessiamociUserProgress', JSON.stringify(userProgress));
    }

    function setupGlobalListeners() {
        // Event Delegation for header actions
        document.querySelector('header').addEventListener('click', (e) => {
            const target = e.target.closest('button, h1');
            if (!target) return;

            const action = target.dataset.action || target.id;
            
            if (action === 'go-to-dashboard' || action === 'home-title') renderDashboard();
            if (action === 'go-to-train' || action === 'training-hub-btn') renderTrainingHub();
            if (action === 'go-to-stats' || action === 'stats-btn') renderStatsPage();
            if (action === 'global-search-btn') openSearchModal();
            if (action === 'sound-toggle-btn') toggleSound();
        });

        // Event Delegation for dynamically created content in the app container
        app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const { action, skill, questionId } = target.dataset;

            if (action === 'go-to-learn') renderSkillTree();
            if (action === 'go-to-train') renderTrainingHub();
            if (action === 'start-skill-lesson') startLesson({ skill, mode: 'standard' });
            if (action === 'start-daily-review') startDailyReview();
            if (action === 'start-mistakes-review') renderMacroAreaSelection('mistakes');
            if (action === 'start-timed-mode') renderMacroAreaSelection('timed');
            if (action === 'back-to-dashboard') renderDashboard();
            if (action === 'view-question-detail') showQuestionDetailModal(allQuestions.find(q => q.id == questionId));
            if (action === 'check-answer') checkCurrentAnswer();
            if (action === 'next-question') closeModal(feedbackModal);
            if (action === 'show-hint') showModal('Suggerimento', currentLesson.questions[currentLesson.currentIndex].reflection_prompt || currentLesson.questions[currentLesson.currentIndex].explanation, feedbackModal);
            if (action === 'show-answer') showModal('Risposta Corretta', Array.isArray(currentLesson.questions[currentLesson.currentIndex].answer) ? currentLesson.questions[currentLesson.currentIndex].answer.join(', ') : currentLesson.questions[currentLesson.currentIndex].answer, feedbackModal);
            if (action === 'open-image') openImageModal(e.target.src);
            if (action === 'choose-option') {
                // FIXED: Use a class for selection instead of inline styles for cleaner logic
                 app.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                 target.classList.add('selected');
            }
        });

        // Modal Listeners
        [feedbackModal, searchModal, questionDetailModal, imageModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) {
                    closeModal(modal);
                }
            });
        });
        searchModal.querySelector('#search-modal-input').addEventListener('input', handleSearch);
    }

    function updatePCVisuals() {
        pcCounter.innerHTML = `<i class="fa-solid fa-star"></i> ${userProgress.xp || 0}`;
    }

// PART 1 OF 3 END   //

// PART 2 OF 3 START

    // --- 5. VIEWS & DASHBOARDS RENDERING ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        if (myChart) { myChart.destroy(); myChart = null; }

        // FIXED: Replaced generic divs with styled <a> tags to act as prominent buttons.
        app.innerHTML = `
            <div class="dashboard-container">
                <a class="dashboard-button learn-path" data-action="go-to-learn">
                    <i class="fa-solid fa-lightbulb"></i>
                    <h2>IMPARA</h2>
                    <p>Costruisci la tua conoscenza, un'abilità alla volta.</p>
                </a>
                <a class="dashboard-button train-path" data-action="go-to-train">
                    <i class="fa-solid fa-dumbbell"></i>
                    <h2>ALLENATI</h2>
                    <p>Metti alla prova la tua memoria e i tuoi riflessi.</p>
                </a>
            </div>`;
    }

    function renderSkillTree() {
        const today = new Date().toISOString().split('T')[0];
        const questionsDue = allQuestions.filter(q => {
            const stats = userProgress.questionStats[q.id];
            return stats && new Date(stats.nextReview) <= new Date(today) && (stats.strength || 0) < MASTERY_LEVEL;
        }).length;
        
        const mistakenQuestionsCount = Object.keys(userProgress.questionStats).filter(qId => (userProgress.questionStats[qId]?.incorrect || 0) > 0).length;

        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const skillIcons = { "Filosofia e Didattica VES": "fa-brain", "Anatomia": "fa-bone", "Fisiologia": "fa-heart-pulse", "Biomeccanica": "fa-person-running", "Applicazioni Didattiche": "fa-bullseye" };
        
        let html = `<div class="skill-tree-container">
            <button class="daily-review-btn ${questionsDue === 0 ? 'disabled' : ''}" data-action="start-daily-review">
                <i class="fa-solid fa-star"></i> 
                ${questionsDue > 0 ? `Ripasso Quotidiano (${questionsDue} carte)` : 'Nessun ripasso per oggi. Ottimo!'}
            </button>
            <button class="daily-review-btn ${mistakenQuestionsCount === 0 ? 'disabled' : ''}" data-action="start-mistakes-review" style="background-color: var(--red-incorrect); box-shadow: 0 4px 0 #a21b2b;">
                 <i class="fa-solid fa-circle-exclamation"></i>
                ${mistakenQuestionsCount > 0 ? `Ripassa ${mistakenQuestionsCount} Errori` : 'Nessun Errore da Ripassare'}
            </button>
            <h2 class="page-title" style="margin-top: 2rem;">Percorso di Apprendimento</h2>
            <div class="skill-row">`;

        skills.forEach(skill => {
            const level = userProgress.skillLevels[skill] || 0;
            const totalInSkill = allQuestions.filter(q => q.macro_area === skill).length;
            const masteredInSkill = allQuestions.filter(q => q.macro_area === skill && (userProgress.questionStats[q.id]?.strength || 0) >= MASTERY_LEVEL).length;
            const progress = totalInSkill > 0 ? (masteredInSkill / totalInSkill) : 0;
            const circumference = 2 * Math.PI * 54;
            const offset = circumference * (1 - progress);

            html += `
                <div class="skill-node level-${level}" data-action="start-skill-lesson" data-skill="${skill}" title="Livello ${level} - Maestria ${Math.round(progress * 100)}%">
                    <div class="skill-icon-container">
                        <svg viewBox="0 0 120 120"><circle class="progress-ring-bg" cx="60" cy="60" r="54" fill="transparent" stroke-width="8"></circle>
                        <circle class="progress-ring" cx="60" cy="60" r="54" fill="transparent" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg>
                        <i class="fa-solid ${skillIcons[skill] || 'fa-question'} skill-icon"></i>
                        <div class="skill-level">${level}</div>
                    </div>
                    <h4>${skill.replace(' e Didattica VES', '')}</h4>
                </div>`;
        });
        html += `</div></div>`;
        app.innerHTML = html;
    }

    function renderTrainingHub() {
        renderMacroAreaSelection('timed');
    }
    
    function renderMacroAreaSelection(mode) {
        let title, source;
        if (mode === 'mistakes') {
            title = "Ripassa i Tuoi Errori";
            const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
            source = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
        } else { // 'timed' or 'standard'
            title = "Scegli una Categoria";
            source = allQuestions;
        }

        const availableAreas = [...new Set(source.map(q => q.macro_area))];
        let html = `<h2 class="page-title">${title}</h2><div class="skill-row">`;
        
        if (availableAreas.length > 0) {
            html += `<div class="category-card all-categories" data-action="start-lesson-mode" data-skill="all" data-mode="${mode}">Tutte le Categorie</div>`;
            availableAreas.forEach(area => {
                html += `<div class="category-card" data-action="start-lesson-mode" data-skill="${area}" data-mode="${mode}">${area}</div>`;
            });
        } else {
             html += `<div class="question-container" style="text-align:center;"><p>Nessun errore da ripassare. Ottimo lavoro!</p></div>`;
        }
        
        html += `</div>`;
        app.innerHTML = html;

        app.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => startLesson({ skill: card.dataset.skill, mode }));
        });
    }
    
    function renderStatsPage() {
        if (myChart) myChart.destroy();

        const stats = { totalCorrect: 0, totalAnswered: 0, totalTime: 0, byArea: {} };
        let totalTimedAnswered = 0;
        
        Object.entries(userProgress.questionStats).forEach(([qId, stat]) => {
            const q = allQuestions.find(item => item.id == qId);
            if (q) {
                const correct = stat.correct || 0;
                const incorrect = stat.incorrect || 0;
                const total = correct + incorrect;
                stats.totalCorrect += correct;
                stats.totalAnswered += total;
                if (stat.totalTime > 0) {
                    stats.totalTime += stat.totalTime;
                    totalTimedAnswered += total;
                }
                const area = q.macro_area;
                if (!stats.byArea[area]) stats.byArea[area] = { correct: 0, total: 0 };
                stats.byArea[area].correct += correct;
                stats.byArea[area].total += total;
            }
        });

        const overallPerc = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
        const avgTime = totalTimedAnswered > 0 ? (stats.totalTime / totalTimedAnswered).toFixed(1) : "N/A";
        
        let statsHtml = `<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>`;
        if (stats.totalAnswered === 0) {
            statsHtml += `<div class="question-container" style="text-align:center;"><p>Inizia un test per vedere i tuoi progressi!</p></div>`;
            app.innerHTML = statsHtml; return;
        }
        
        statsHtml += `
            <div class="stats-container">
                <div class="stats-header">
                    <div class="stat-card"><div class="value green">${overallPerc}%</div><div class="label">Accuratezza Generale</div></div>
                    <div class="stat-card"><div class="value">${avgTime}<span class="unit">s</span></div><div class="label">Tempo Medio Risposta</div></div>
                    <div class="stat-card"><div class="value">${userProgress.studyStreak.current}<span class="unit"> giorni</span></div><div class="label">Bio-Ritmo Attivo</div></div>
                </div>
                <div class="stats-section"><h3>Maestria nel Tempo</h3><canvas id="masteryChart"></canvas></div>
                <div class="stats-section"><h3>Certificazioni di Progetto</h3><div class="achievements-grid">`;
        
        Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
            const unlocked = userProgress.achievements.includes(id);
            statsHtml += `<div class="achievement-badge ${unlocked ? 'unlocked' : ''}" title="${ach.title}: ${ach.description}">
                            <i class="fa-solid ${ach.icon}"></i>
                            <p>${ach.title}</p>
                          </div>`;
        });
        statsHtml += `</div></div>
                     <div class="stats-section"><h3>Maestria per Abilità</h3>`;
        
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        skills.forEach(skill => {
            const level = userProgress.skillLevels[skill] || 0;
            statsHtml += `<div class="stat-item"><div class="stat-item-header"><span>${skill}</span><span>Livello ${level} / 5</span></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${level * 20}%;"></div></div></div>`;
        });
        statsHtml += `</div>`;

        const toughest = Object.entries(userProgress.questionStats).filter(([,s]) => (s.incorrect || 0) > (s.correct || 0)).sort(([,a],[,b]) => b.incorrect - a.incorrect).slice(0, 5);
        if (toughest.length > 0) {
            statsHtml += `<div class="stats-section"><h3>Domande da Ripassare</h3><ul class="toughest-questions-list">`;
            toughest.forEach(([qId,]) => {
                const q = allQuestions.find(item => item.id == qId);
                if (q) statsHtml += `<li data-action="view-question-detail" data-question-id="${q.id}">${q.question}</li>`;
            });
            statsHtml += '</ul></div>';
        }
        statsHtml += `</div>`;
        app.innerHTML = statsHtml;
        
        renderMasteryChart();
    }

    function renderMasteryChart() {
        const history = userProgress.masteryHistory || {};
        const dates = Object.keys(history).sort();
        let cumulativeMastery = 0;
        const data = dates.map(date => {
            cumulativeMastery += history[date];
            return { x: date, y: cumulativeMastery };
        });

        const ctx = document.getElementById('masteryChart').getContext('2d');
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ label: 'Domande Padroneggiate', data: data, borderColor: 'var(--blue-primary)', tension: 0.1, fill: true, backgroundColor: 'rgba(0, 123, 255, 0.1)' }] },
            options: { scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

// PART 2 OF 3 END // 

// PART 3 OF 3 START

    // --- 6. CORE LESSON LOGIC & SPACED REPETITION ---
    function startLesson({ skill, mode, questions = null }) {
        let questionPool = questions;
        if (!questionPool) {
            if (mode === 'standard') {
                const level = userProgress.skillLevels[skill] || 0;
                questionPool = allQuestions.filter(q => {
                    const strength = userProgress.questionStats[q.id]?.strength || 0;
                    return q.macro_area === skill && strength < MASTERY_LEVEL && strength <= level;
                }).sort(() => 0.5 - Math.random());
            } else if (mode === 'timed') {
                const source = skill === 'all' ? allQuestions : allQuestions.filter(q => q.macro_area === skill);
                questionPool = [...source].sort(() => 0.5 - Math.random());
            } else if (mode === 'mistakes') {
                 const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
                 const baseSource = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
                 questionPool = (skill === 'all') ? baseSource : baseSource.filter(q => q.macro_area === skill);
            }
        }
        
        const lessonLength = mode === 'timed' ? 20 : (mode === 'daily_review' || mode === 'mistakes' ? (questionPool.length > 15 ? 15 : questionPool.length) : 10);
        currentLesson = {
            questions: questionPool.slice(0, lessonLength), currentIndex: 0, mode: mode,
            timerId: null, correctAnswers: 0, skill: skill, report: [], levelUp: false
        };
        
        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', `Nessuna domanda disponibile per questa selezione. Potresti aver già padroneggiato tutto!`, feedbackModal); 
            return;
        }
        renderQuestion();
    }
    
    function startDailyReview() {
        const today = new Date().toISOString().split('T')[0];
        const questionsDue = allQuestions
            .filter(q => {
                const stats = userProgress.questionStats[q.id];
                return stats && new Date(stats.nextReview) <= new Date(today) && (stats.strength || 0) < MASTERY_LEVEL;
            })
            .sort((a, b) => new Date(userProgress.questionStats[a.id]?.nextReview) - new Date(userProgress.questionStats[b.id]?.nextReview));
        
        startLesson({ skill: 'Ripasso', mode: 'daily_review', questions: questionsDue });
    }

    function updateQuestionStrength(questionId, isCorrect) {
        const stats = userProgress.questionStats[questionId] || { strength: 0, correct: 0, incorrect: 0, totalTime: 0 };
        const today = new Date();
        const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];

        const oldStrength = stats.strength || 0;
        
        if (isCorrect) {
            stats.strength = Math.min(oldStrength + 1, STRENGTH_INTERVALS.length);
            if (stats.strength >= MASTERY_LEVEL && oldStrength < MASTERY_LEVEL) {
                userProgress.masteryHistory[todayStr] = (userProgress.masteryHistory[todayStr] || 0) + 1;
            }
        } else {
            stats.strength = Math.max(oldStrength - 2, 0);
        }
        
        if (stats.strength < STRENGTH_INTERVALS.length) {
            const intervalDays = STRENGTH_INTERVALS[stats.strength];
            today.setDate(today.getDate() + intervalDays);
            stats.nextReview = today.toISOString().split('T')[0];
        } else {
            stats.nextReview = '3000-01-01'; // Far future date for mastered cards
        }
        stats.lastReviewed = todayStr;
        userProgress.questionStats[questionId] = stats;
    }
    
    // --- 7. QUESTION RENDERING & INTERACTION ---
    function renderQuestion() {
        currentLesson.startTime = Date.now();
        const q = currentLesson.questions[currentLesson.currentIndex];
        const isTimed = currentLesson.mode === 'timed';
        let optionsHtml = '';
        const questionType = q.type;
        const imageHtml = q.image ? `<div class="question-image-container"><img src="${q.image}" alt="Immagine per la domanda" class="question-image" data-action="open-image"></div>` : '';

        if (questionType === 'multiple_choice' && q.options) {
            const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
            shuffledOptions.forEach(opt => { optionsHtml += `<button class="option-btn" data-action="choose-option" data-answer="${opt}">${opt}</button>`; });
        } else if (questionType === 'true_false') {
            optionsHtml += `<button class="option-btn" data-action="choose-option" data-answer="Vero">Vero</button>`;
            optionsHtml += `<button class="option-btn" data-action="choose-option" data-answer="Falso">Falso</button>`;
        } else { // open_ended
            optionsHtml += `<textarea id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`;
        }

        app.innerHTML = `
            <div class="lesson-header">
                ${isTimed ? '<div class="timer-display"><i class="fa-solid fa-clock"></i> <span id="time-left">30</span></div>' : `<div>${currentLesson.skill}</div>`}
                <span>${currentLesson.currentIndex + 1}/${currentLesson.questions.length}</span>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${((currentLesson.currentIndex) / currentLesson.questions.length) * 100}%"></div></div>
            </div>
            <div class="question-container">
                ${imageHtml}
                <p class="question-text">${q.question}</p>
                <div class="answer-options">${optionsHtml}</div>
                ${isTimed ? '<div class="timer-bar-container"><div id="timer-bar" class="timer-bar"></div></div>' : ''}
                <div class="lesson-footer">
                    <div ${isTimed ? 'class="visually-hidden"' : ''}>
                        <button class="hint-btn" data-action="show-hint"><i class="fa-solid fa-lightbulb"></i> Hint</button>
                        <button class="hint-btn" data-action="show-answer"><i class="fa-solid fa-key"></i> Risposta</button>
                    </div>
                    <button id="check-answer-btn" data-action="check-answer">Controlla</button>
                </div>
            </div>`;
        
        if (isTimed) startTimer();
    }
    
    function startTimer() {
        let timeLeft = 30;
        const timerDisplay = document.getElementById('time-left');
        const timerBar = document.getElementById('timer-bar');
        if (timerBar) setTimeout(() => { timerBar.style.transition = `width ${timeLeft}s linear`; timerBar.style.width = '0%'; }, 50);

        currentLesson.timerId = setInterval(() => {
            timeLeft--;
            if (timerDisplay) timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(currentLesson.timerId);
                checkCurrentAnswer(true); // isTimeout = true
            }
        }, 1000);
    }

    function checkCurrentAnswer(isTimeout = false) {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        
        const timeToAnswer = (Date.now() - currentLesson.startTime) / 1000;
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        const answerOptionsContainer = app.querySelector('.answer-options');
        answerOptionsContainer.classList.add('disabled');
        const selectedButton = answerOptionsContainer.querySelector('.option-btn.selected');
        
        if(isTimeout) {
            userAnswer = "Tempo scaduto";
            isCorrect = false;
        } else {
            // FIXED: Reliably get the user's answer from the selected button or the text input
            const openAnswerInput = document.getElementById('open-answer-input');
            let userAnswerRaw = null;

            if (selectedButton) {
                userAnswerRaw = selectedButton.dataset.answer;
            } else if (openAnswerInput) {
                userAnswerRaw = openAnswerInput.value;
            }
            
            userAnswer = userAnswerRaw;
            
            if (userAnswer === null || userAnswer.trim() === "") { 
                isCorrect = false; 
                userAnswer = "Nessuna risposta";
            }
            else if (q.type === 'open_ended') {
                const userWords = (userAnswer.toLowerCase().match(/\b(\w+)\b/g) || []).filter(w => w.length > 2);
                const answerText = q.answer.toString().toLowerCase();
                const keywords = q.keywords || answerText.split(' ').filter(w => w.length > 3);
                const matches = keywords.filter(k => userWords.includes(k)).length;
                isCorrect = keywords.length > 0 ? (matches / keywords.length) >= 0.6 : false;
            } else {
                isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }
        }
        
        if (selectedButton) { 
            selectedButton.classList.add(isCorrect ? 'correct' : 'incorrect');
        } else if (!isCorrect && !isTimeout && q.type !== 'open_ended') {
            const correctBtn = answerOptionsContainer.querySelector(`[data-answer="${q.answer}"]`);
            if (correctBtn) correctBtn.classList.add('correct');
        }


        if (!userProgress.questionStats[q.id]) {
            userProgress.questionStats[q.id] = { strength: 0, correct: 0, incorrect: 0, totalTime: 0 };
        }
        updateQuestionStrength(q.id, isCorrect);
        
        userProgress.questionStats[q.id].totalTime += timeToAnswer;
        isCorrect ? userProgress.questionStats[q.id].correct++ : userProgress.questionStats[q.id].incorrect++;
        
        if(isCorrect) {
            currentLesson.correctAnswers++;
            const pcEarned = currentLesson.mode === 'daily_review' ? PC_REWARDS.REVIEW_CORRECT : (currentLesson.mode === 'timed' ? PC_REWARDS.TIMED_CORRECT : PC_REWARDS.FIRST_TIME_CORRECT);
            userProgress.xp = (userProgress.xp || 0) + pcEarned;
        }
        
        currentLesson.report.push({ question: q, userAnswer, isCorrect, timeToAnswer });
        saveProgress();
        updatePCVisuals();
        showFeedback(isCorrect, isTimeout ? "Tempo Scaduto!" : null);
    }

    function showFeedback(isCorrect, message = null) {
        // FIXED: Robust sound playing with error handling.
        if (soundEnabled) {
            const soundToPlay = isCorrect ? sounds.correct : sounds.incorrect;
            soundToPlay.currentTime = 0; // Rewind to start, allows re-playing quickly
            soundToPlay.play().catch(error => console.error(`Audio playback failed:`, error));
        }
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        if(!isCorrect) {
             const correctBtn = app.querySelector(`[data-answer="${q.answer}"]`);
             if(correctBtn) correctBtn.classList.add('correct');
        }
        
        const explanation = q.explanation;
        showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal, true); // True flag per auto-next on close

        if (currentLesson.mode === 'timed') {
            setTimeout(() => closeModal(feedbackModal), 2500); // Auto-close for timed mode
        } else {
            const checkBtn = app.querySelector('[data-action="check-answer"]');
            if (checkBtn) {
                 checkBtn.id = 'next-question-btn';
                 checkBtn.textContent = 'Avanti';
                 checkBtn.dataset.action = "next-question";
                 checkBtn.style.backgroundColor = isCorrect ? 'var(--green-correct)' : 'var(--red-incorrect)';
            }
        }
    }

    function nextQuestion() {
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            const todayStr = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];
            const lastDate = userProgress.studyStreak.lastDate;
            if (!lastDate || lastDate !== todayStr) {
                 const yesterday = new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() - 1)).toISOString().split('T')[0];
                 userProgress.studyStreak.current = (lastDate === yesterday) ? (userProgress.studyStreak.current || 0) + 1 : 1;
                 userProgress.studyStreak.lastDate = todayStr;
            }
            
            if (currentLesson.mode === 'standard' && currentLesson.correctAnswers / currentLesson.questions.length >= 0.8) {
                userProgress.skillLevels[currentLesson.skill] = Math.min((userProgress.skillLevels[currentLesson.skill] || 0) + 1, 5);
                currentLesson.levelUp = true;
                userProgress.xp = (userProgress.xp || 0) + PC_REWARDS.LEVEL_UP;
                if(userProgress.skillLevels[currentLesson.skill] === MASTERY_LEVEL) userProgress.xp += PC_REWARDS.MASTER_SKILL;
            }
            saveProgress();
            checkAchievements();
            renderReport();
        }
    }
    
    // --- 8. REPORTING, MODALS & UTILITIES ---
    function renderReport() {
        const accuracy = currentLesson.questions.length > 0 ? (currentLesson.correctAnswers / currentLesson.questions.length) : 0;
        let scientistAdvice = '';
        if (accuracy < 0.5) scientistAdvice = `<i class="fa-solid fa-lightbulb-exclamation"></i> Hai riscontrato delle difficoltà. Una sessione di Ripasso potrebbe solidificare le basi.`;
        else if (currentLesson.levelUp) scientistAdvice = `<i class="fa-solid fa-party-horn"></i> Performance eccellente! Hai aumentato il tuo livello in ${currentLesson.skill}!`;
        else scientistAdvice = `<i class="fa-solid fa-person-digging"></i> Buon lavoro! La costanza è la chiave per padroneggiare ogni concetto.`;

        let reportHtml = `<h2><i class="fa-solid fa-scroll"></i> Debriefing di Sessione</h2>
                          <div class="report-summary-card">${scientistAdvice}</div>`;
        
        currentLesson.report.forEach(item => {
            reportHtml += `
                <div class="test-report-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                    <p class="report-q-text">${item.question.question}</p>
                    <p class="report-user-answer">La tua risposta: <strong>${item.userAnswer || "Nessuna"}</strong> ${currentLesson.mode === 'timed' ? `(${item.timeToAnswer.toFixed(1)}s)` : ''}</p>
                    <div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div>
                </div>`;
        });
        reportHtml += `<button class="daily-review-btn" data-action="back-to-dashboard">Continua</button>`;
        app.innerHTML = reportHtml;
    }
    
    function checkAchievements() {
        const masteredCount = Object.values(userProgress.questionStats).filter(s => s.strength >= MASTERY_LEVEL).length;
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const avgTime = currentLesson.mode === 'timed' ? (currentLesson.report.reduce((acc, item) => acc + item.timeToAnswer, 0) / currentLesson.report.length) : -1;
        
        const conditions = {
            'FIRST_LESSON': () => Object.keys(userProgress.questionStats).length > 5 && (currentLesson.mode === 'standard' || currentLesson.mode === 'daily_review'),
            'XP_1000': () => userProgress.xp >= 1000,
            'FIRST_MASTERY': () => masteredCount > 0,
            'MASTER_50': () => masteredCount >= 50,
            'PERFECT_LESSON': () => (currentLesson.mode === 'standard' || currentLesson.mode === 'daily_review') && currentLesson.correctAnswers === currentLesson.questions.length && currentLesson.questions.length > 0,
            'STREAK_7': () => userProgress.studyStreak.current >= 7,
            'MASTER_ALL': () => skills.every(s => (userProgress.skillLevels[s] || 0) === 5),
            'PERFECT_REVIEW': () => currentLesson.mode === 'daily_review' && currentLesson.correctAnswers === currentLesson.questions.length && currentLesson.questions.length > 0,
            'SPEED_DEMON': () => currentLesson.mode === 'timed' && avgTime > 0 && avgTime < 8.0
        };
        
        Object.entries(conditions).forEach(([id, condition]) => {
            if (!userProgress.achievements.includes(id) && condition()) {
                userProgress.achievements.push(id);
                showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[id].title}`);
            }
        });
        
        skills.forEach(skill => {
            const skillId = `MASTER_${skill.toUpperCase().replace(/\s*&\s*| e /g, '_').replace(/\s/g, '_')}`;
            if (ACHIEVEMENTS[skillId] && !userProgress.achievements.includes(skillId) && (userProgress.skillLevels[skill] || 0) === 5) {
                userProgress.achievements.push(skillId);
                showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[skillId].title}`);
            }
        });
        saveProgress();
    }
    
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 3500);
    }
    
    function showQuestionDetailModal(q) {
        const contentEl = questionDetailModal.querySelector('#question-detail-content');
        let optionsHtml = '';
        if (q.type === 'multiple_choice' && q.options) {
             optionsHtml = `<div class="answer-options">${q.options.map(opt => `<button class="option-btn ${q.answer.toString().toLowerCase() === opt.toString().toLowerCase() ? 'correct' : 'disabled'}">${opt}</button>`).join('')}</div>`;
        } else if (q.type === 'true_false') {
             optionsHtml = `<div class="answer-options">
                <button class="option-btn ${q.answer.toString() === 'true' ? 'correct' : 'disabled'}">Vero</button>
                <button class="option-btn ${q.answer.toString() === 'false' ? 'correct' : 'disabled'}">Falso</button>
             </div>`;
        }
        contentEl.innerHTML = `<div class="question-container">
            <p class="question-text">${q.question}</p>
            ${optionsHtml}
            <div class="report-explanation" style="margin-top:1rem"><strong>Spiegazione:</strong> ${q.explanation}</div>
        </div>`;
        showModal(null, null, questionDetailModal);
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('vessiamociSoundEnabled', soundEnabled);
        updateSoundIcon();
    }
    
    function updateSoundIcon() {
        const soundIcon = document.getElementById('sound-toggle-btn')?.querySelector('i');
        if (soundIcon) soundIcon.className = `fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`;
    }

    function openSearchModal() {
        checkAchievements('USE_SEARCH');
        const searchInput = searchModal.querySelector('#search-modal-input');
        searchInput.value = '';
        searchModal.querySelector('#search-modal-results').innerHTML = '';
        showModal(null, null, searchModal);
        setTimeout(() => searchInput.focus(), 50);
    }

    function openImageModal(src) {
        imageModal.querySelector('#image-modal-content').src = src;
        showModal(null, null, imageModal);
    }

    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const resultsEl = searchModal.querySelector('#search-modal-results');
        if (query.length < 3) {
            resultsEl.innerHTML = '';
            return;
        }
        const filteredQuestions = allQuestions.filter(q => 
            q.question.toLowerCase().includes(query) || 
            q.answer.toString().toLowerCase().includes(query) ||
            q.explanation.toLowerCase().includes(query)
        ).slice(0, 10);

        resultsEl.innerHTML = filteredQuestions.map(q => `
            <div class="test-report-item" data-action="view-question-detail" data-question-id="${q.id}" style="cursor: pointer;">
                 <p class="report-q-text">${q.question}</p>
                 <div class="report-explanation"><strong>Risposta:</strong> ${Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</div>
            </div>`).join('');
    }

    function showModal(title, text, modalElement, isLessonFeedback = false) {
        if(isLessonFeedback) currentLesson.isModalOpen = true;

        const titleEl = modalElement.querySelector('h3');
        const contentEl = modalElement.querySelector('p, div[id$="-results"], div[id$="-content"]');
        if (title && titleEl) titleEl.textContent = title;
        if (text && contentEl) contentEl.innerHTML = text;
        modalElement.classList.remove('hidden');
    }

    function closeModal(modalElement) {
        modalElement.classList.add('hidden');
        if (modalElement === feedbackModal && currentLesson.isModalOpen) {
             currentLesson.isModalOpen = false;
             nextQuestion();
        }
    }
    
    main();
});

// PART 3 OF 3 END
