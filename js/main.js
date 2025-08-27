// PART 1 OF 3 START
// --- VESsiamoci: The Extraordinary Engine ---
// --- Architected with Perfection by Gemini ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE & DOM REFERENCES ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const trainingHubBtn = document.getElementById('training-hub-btn');
    const statsBtn = document.getElementById('stats-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
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

    // --- 2. AUDIO ENGINE ---
    const sounds = {
        correct: new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3'),
        incorrect: new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3')
    };
    sounds.correct.volume = 0.7;
    sounds.incorrect.volume = 0.7;

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
        homeTitle.addEventListener('click', renderDashboard);
        trainingHubBtn.addEventListener('click', renderTrainingHub);
        statsBtn.addEventListener('click', renderStatsPage);
        globalSearchBtn.addEventListener('click', openSearchModal);
        soundToggleBtn.addEventListener('click', toggleSound);

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

// PART 1 OF 3 END //

    // PART 2 OF 3 START

    // --- 5. VIEWS & DASHBOARDS RENDERING ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        if (myChart) { myChart.destroy(); myChart = null; }

        app.innerHTML = `
            <div class="pathway-container">
                <div class="pathway-card learn-path" data-path="learn">
                    <i class="fa-solid fa-lightbulb-on"></i>
                    <h2>IMPARA</h2>
                    <p>Costruisci la tua conoscenza, un'abilità alla volta.</p>
                </div>
                <div class="pathway-card train-path" data-path="train">
                    <i class="fa-solid fa-dumbbell"></i>
                    <h2>ALLENATI</h2>
                    <p>Metti alla prova la tua memoria e i tuoi riflessi.</p>
                </div>
            </div>`;

        document.querySelectorAll('.pathway-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                if (path === 'learn') {
                    renderSkillTree();
                } else {
                    renderTrainingHub();
                }
            });
        });
    }

    function renderSkillTree() {
        const today = new Date().toISOString().split('T')[0];
        const questionsDue = allQuestions.filter(q => {
            const stats = userProgress.questionStats[q.id];
            return stats && new Date(stats.nextReview) <= new Date(today) && (stats.strength || 0) < MASTERY_LEVEL;
        }).length;
        
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const skillIcons = { "Filosofia e Didattica VES": "fa-brain", "Anatomia": "fa-bone", "Fisiologia": "fa-heart-pulse", "Biomeccanica": "fa-person-running", "Applicazioni Didattiche": "fa-bullseye" };
        
        let html = `<div class="skill-tree-container">`;
        if (questionsDue > 0) {
             html += `<button class="daily-review-btn" id="daily-review-btn">
                <i class="fa-solid fa-star"></i> 
                Ripasso Quotidiano (${questionsDue} carte)
            </button>`;
        }
        
        html += `<div class="skill-row">`;
        skills.forEach(skill => {
            const level = userProgress.skillLevels[skill] || 0;
            const totalInSkill = allQuestions.filter(q => q.macro_area === skill).length;
            const masteredInSkill = allQuestions.filter(q => q.macro_area === skill && (userProgress.questionStats[q.id]?.strength || 0) >= MASTERY_LEVEL).length;
            const progress = totalInSkill > 0 ? (masteredInSkill / totalInSkill) : 0;
            const circumference = 2 * Math.PI * 54;
            const offset = circumference * (1 - progress);

            html += `
                <div class="skill-node level-${level}" data-skill="${skill}" title="Livello ${level} - Maestria ${Math.round(progress * 100)}%">
                    <div class="skill-icon-container">
                        <svg viewBox="0 0 120 120"><circle class="progress-ring-bg" cx="60" cy="60" r="54" fill="transparent" stroke-width="8"></circle>
                        <circle class="progress-ring" cx="60" cy="60" r="54" fill="transparent" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg>
                        <i class="fa-solid ${skillIcons[skill] || 'fa-question'} skill-icon"></i>
                        <div class="skill-level">${level}</div>
                    </div>
                    <h4>${skill.replace('Filosofia e Didattica VES', 'Filosofia VES')}</h4>
                </div>`;
        });
        html += `</div></div>`;
        app.innerHTML = html;

        document.querySelectorAll('.skill-node').forEach(node => node.addEventListener('click', () => startLesson({ skill: node.dataset.skill, mode: 'standard' })));
        const reviewBtn = document.getElementById('daily-review-btn');
        if (reviewBtn) reviewBtn.addEventListener('click', startDailyReview);
    }

    function renderTrainingHub() {
        const mistakenQuestionsCount = Object.keys(userProgress.questionStats).filter(qId => (userProgress.questionStats[qId]?.incorrect || 0) > 0).length;
        
        app.innerHTML = `
            <div class="skill-row">
                <div class="training-hub-card">
                    <h3>Ripassa i Tuoi Errori</h3>
                    <p>Concentrati sulle domande che hai sbagliato in passato per trasformare le debolezze in punti di forza.</p>
                    <button class="btn btn-review ${mistakenQuestionsCount === 0 ? 'disabled' : ''}" id="mistakes-review-btn">
                        ${mistakenQuestionsCount > 0 ? `Ripassa ${mistakenQuestionsCount} Errori` : 'Nessun Errore da Ripassare'}
                    </button>
                </div>
                <div class="training-hub-card">
                    <h3>Modalità a Tempo</h3>
                    <p>Metti alla prova la tua velocità e precisione su tutte le materie in una sfida contro il tempo.</p>
                    <button class="btn btn-timed" id="timed-mode-btn">Inizia Allenamento</button>
                </div>
            </div>`;
        
        const reviewBtn = document.getElementById('mistakes-review-btn');
        if (reviewBtn && !reviewBtn.classList.contains('disabled')) reviewBtn.addEventListener('click', () => startLesson({ skill: 'all', mode: 'mistakes'}));
        document.getElementById('timed-mode-btn').addEventListener('click', () => startLesson({ skill: 'all', mode: 'timed'}));
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
                if (q) statsHtml += `<li data-question-id="${q.id}">${q.question}</li>`;
            });
            statsHtml += '</ul></div>';
        }
        statsHtml += `</div>`;
        app.innerHTML = statsHtml;
        
        renderMasteryChart();
        app.querySelectorAll('.toughest-questions-list li').forEach(li => {
            li.addEventListener('click', (e) => showQuestionDetailModal(allQuestions.find(q => q.id == e.currentTarget.dataset.questionId)));
        });
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
            data: { datasets: [{ label: 'Domande Padroneggiate', data: data, borderColor: 'var(--blue-primary)', tension: 0.1, fill: true, backgroundColor: 'rgba(28, 176, 246, 0.1)' }] },
            options: { scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

// PART 2 OF 3 END

    // PART 3 OF 3 START

    // --- 6. CORE LESSON LOGIC & SPACED REPETITION ---
    function startLesson({ skill, mode, questions = null }) {
        let questionPool = questions;
        if (!questionPool) {
            if (mode === 'standard') {
                const level = userProgress.skillLevels[skill] || 0;
                questionPool = allQuestions.filter(q => {
                    const strength = userProgress.questionStats[q.id]?.strength || 0;
                    return q.macro_area === skill && strength <= level;
                }).sort(() => 0.5 - Math.random());
            } else if (mode === 'timed') {
                questionPool = [...allQuestions].sort(() => 0.5 - Math.random());
            } else if (mode === 'mistakes') {
                 const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
                 const baseSource = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
                 questionPool = (skill === 'all') ? baseSource : baseSource.filter(q => q.macro_area === skill);
            }
        }
        
        const lessonLength = mode === 'timed' ? 20 : (mode === 'daily_review' ? (questionPool.length > 20 ? 20 : questionPool.length) : 10);
        currentLesson = {
            questions: questionPool.slice(0, lessonLength), currentIndex: 0, mode: mode,
            timerId: null, correctAnswers: 0, skill: skill, report: [], levelUp: false
        };
        
        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'Nessuna domanda disponibile per questa selezione.', feedbackModal, true); return;
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
        const stats = userProgress.questionStats[questionId] || { strength: 0, correct: 0, incorrect: 0 };
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
            stats.nextReview = '3000-01-01';
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
        const imageHtml = q.image ? `<div class="question-image-container"><img src="${q.image}" alt="Immagine per la domanda" class="question-image" id="question-image"></div>` : '';

        if (questionType === 'multiple_choice' && q.options) {
            q.options.forEach(opt => { optionsHtml += `<button class="option-btn" data-answer="${opt}">${opt}</button>`; });
        } else if (questionType === 'true_false') {
            optionsHtml += `<button class="option-btn" data-answer="true">Vero</button>`;
            optionsHtml += `<button class="option-btn" data-answer="false">Falso</button>`;
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
                        <button class="hint-btn" id="show-hint-btn"><i class="fa-solid fa-lightbulb"></i> Hint</button>
                        <button class="hint-btn" id="show-answer-btn"><i class="fa-solid fa-key"></i> Risposta</button>
                    </div>
                    <button id="check-answer-btn">Controlla</button>
                </div>
            </div>`;

        setupQuestionListeners();
        if (isTimed) startTimer();
    }
    
    function setupQuestionListeners() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        const checkBtn = document.getElementById('check-answer-btn');
        if (currentLesson.mode === 'timed' && q.type !== 'open_ended') {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => checkCurrentAnswer(e.currentTarget)));
            checkBtn.classList.add('visually-hidden');
        } else {
            checkBtn.addEventListener('click', () => checkCurrentAnswer());
        }
        const hintBtn = document.getElementById('show-hint-btn');
        const answerBtn = document.getElementById('show-answer-btn');
        if (hintBtn) hintBtn.addEventListener('click', () => showModal('Suggerimento', q.reflection_prompt || q.explanation, feedbackModal));
        if (answerBtn) answerBtn.addEventListener('click', () => showModal('Risposta Corretta', Array.isArray(q.answer) ? q.answer.join(', ') : q.answer, feedbackModal));
        const questionImage = document.getElementById('question-image');
        if(questionImage) questionImage.addEventListener('click', () => openImageModal(q.image));
        if (q.type !== 'open_ended') {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => {
                if (currentLesson.mode !== 'timed') {
                    app.querySelectorAll('.option-btn').forEach(b => b.style.borderColor = '');
                    e.currentTarget.style.borderColor = 'var(--blue-primary)';
                }
            }));
        }
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
                checkCurrentAnswer(null, true);
            }
        }, 1000);
    }
    
    function checkCurrentAnswer(clickedButton = null, isTimeout = false) {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        
        const timeToAnswer = (Date.now() - currentLesson.startTime) / 1000;
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        app.querySelector('.answer-options').classList.add('disabled');

        if(isTimeout) {
            userAnswer = "Tempo scaduto";
            isCorrect = false;
        } else {
            const userAnswerRaw = clickedButton ? clickedButton.dataset.answer : (document.getElementById('open-answer-input')?.value || null);
            userAnswer = userAnswerRaw;
            if (userAnswer === null) { isCorrect = false; }
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
        
        if (clickedButton) clickedButton.classList.add(isCorrect ? 'correct' : 'incorrect');

        updateQuestionStrength(q.id, isCorrect);
        
        userProgress.questionStats[q.id].totalTime = (userProgress.questionStats[q.id].totalTime || 0) + timeToAnswer;
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
        if (soundEnabled) { isCorrect ? sounds.correct.play() : sounds.incorrect.play(); }
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        if (currentLesson.mode === 'timed') {
            if(!isCorrect) {
                 const correctBtn = app.querySelector(`[data-answer="${q.answer}"]`);
                 if(correctBtn) correctBtn.classList.add('correct');
            }
        }
        
        const explanation = q.explanation;
        showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal, true);
    }

    function nextQuestion() {
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            const todayStr = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];
            if (!userProgress.studyStreak.lastDate || userProgress.studyStreak.lastDate !== todayStr) {
                 const yesterday = new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() - 1)).toISOString().split('T')[0];
                 userProgress.studyStreak.current = (userProgress.studyStreak.lastDate === yesterday) ? (userProgress.studyStreak.current || 0) + 1 : 1;
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
        else if (currentLesson.levelUp) scientistAdvice = `<i class="fa-solid fa-party-horn"></i> Performance eccellente! Sei pronto per affrontare un nuovo livello o una nuova abilità.`;
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
        reportHtml += `<button id="back-to-dash" class="daily-review-btn">Continua</button>`;
        app.innerHTML = reportHtml;
        document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
    }
    
    function checkAchievements() {
        const masteredCount = Object.values(userProgress.questionStats).filter(s => s.strength >= MASTERY_LEVEL).length;
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const avgTime = (currentLesson.report.reduce((acc, item) => acc + item.timeToAnswer, 0) / currentLesson.report.length);

        const conditions = {
            'FIRST_LESSON': () => Object.keys(userProgress.questionStats).length > 0,
            'XP_1000': () => userProgress.xp >= 1000,
            'FIRST_MASTERY': () => masteredCount > 0,
            'MASTER_50': () => masteredCount >= 50,
            'PERFECT_LESSON': () => currentLesson.mode === 'standard' && currentLesson.correctAnswers === currentLesson.questions.length,
            'STREAK_7': () => userProgress.studyStreak.current >= 7,
            'MASTER_ALL': () => skills.every(s => (userProgress.skillLevels[s] || 0) === 5),
            'PERFECT_REVIEW': () => currentLesson.mode === 'daily_review' && currentLesson.correctAnswers === currentLesson.questions.length,
            'SPEED_DEMON': () => currentLesson.mode === 'timed' && avgTime < 8.0
        };
        
        Object.entries(conditions).forEach(([id, condition]) => {
            if (!userProgress.achievements.includes(id) && condition()) {
                userProgress.achievements.push(id);
                showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[id].title}`);
            }
        });
        skills.forEach(skill => {
            const skillId = `MASTER_${skill.toUpperCase().replace(/ & /g, '_').replace(/\s/g, '_')}`;
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
        soundToggleBtn.querySelector('i').className = `fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`;
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
        resultsEl.innerHTML = query.length < 3 ? '' : allQuestions.filter(q => q.question.toLowerCase().includes(query) || q.answer.toString().toLowerCase().includes(query)).slice(0, 10).map(q => `
            <div class="search-result-item">
                <p class="question">${q.question}</p><p class="answer"><strong>Risposta:</strong> ${Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p><p class="explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>
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

// PART 3 OF 3 END // 

