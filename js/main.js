// PART 1 OF 3 START

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI E COSTANTI ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const pcCounter = document.getElementById('pc-counter');
    const toast = document.getElementById('toast-notification');
    
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    const questionDetailModal = document.getElementById('question-detail-modal');

    const STRENGTH_INTERVALS = [1, 2, 5, 10, 21, 45, 90, 180];
    const MASTERY_LEVEL = 5;

    let allQuestions = [];
    let userProgress = {};
    let currentLesson = { timerId: null, isModalOpen: false };
    let soundEnabled = true;
    let myChart = null;

    // --- AUDIO ---
    const correctSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3');
    const incorrectSound = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3');

    // --- CONFIGURAZIONE GAMIFICATION ---
    const ACHIEVEMENTS = {
        'FIRST_LESSON': { title: "Il Progettista", icon: "fa-pencil-ruler" },
        'XP_1000': { title: "Scienziato Emergente", icon: "fa-flask" },
        'FIRST_MASTERY': { title: "Pioniere Neurale", icon: "fa-brain" },
        'USE_SEARCH': { title: "Archivista Accademico", icon: "fa-search" },
        'MASTER_50': { title: "Bio-Ingegnere", icon: "fa-sitemap" },
        'MASTER_ANATOMIA': { title: "Certificazione in Anatomia", icon: "fa-bone" },
        'MASTER_FISIOLOGIA': { title: "Dottorato in Fisiologia", icon: "fa-heart-pulse" },
        'MASTER_BIOMECCANICA': { title: "Specializzazione in Biomeccanica", icon: "fa-person-running" },
        'MASTER_DIDATTICA': { title: "Maestro di Didattica", icon: "fa-bullseye-pointer" },
        'MASTER_FILOSOFIA': { title: "Filosofo della Voce", icon: "fa-book-open" },
        'MASTER_ALL': { title: "L'Uomo Vitruviano", icon: "fa-universal-access" },
        'PERFECT_LESSON': { title: "Esecuzione Perfetta", icon: "fa-check-double" },
        'SPEED_DEMON': { title: "Riflessi Sinaptici", icon: "fa-bolt" },
        'STREAK_7': { title: "Costanza Inarrestabile", icon: "fa-calendar-week" },
        'PERFECT_REVIEW': { title: "Implacabile", icon: "fa-star" }
    };
    
    // --- INIZIALIZZAZIONE ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        try {
            const response = await fetch('data/questions.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allQuestions = await response.json();
            loadUserProgress();
            setupGlobalListeners();
            renderSkillTreeDashboard();
        } catch (error) {
            app.innerHTML = `<p>Errore critico: impossibile caricare le domande. Controlla il file 'data/questions.json' e la sua sintassi.</p>`;
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
        homeTitle.addEventListener('click', renderSkillTreeDashboard);
        dashboardBtn.addEventListener('click', renderSkillTreeDashboard);
        document.getElementById('stats-btn').addEventListener('click', renderStatsPage);
        globalSearchBtn.addEventListener('click', openSearchModal);
        soundToggleBtn.addEventListener('click', toggleSound);

        [feedbackModal, searchModal, questionDetailModal].forEach(modal => {
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

// PART 1 OF 3 END


                          // PART 2 OF 3 START

    // --- VISTE PRINCIPALI (SKILL TREE E STATS) ---
    function renderSkillTreeDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        if (myChart) myChart.destroy();

        const today = new Date().toISOString().split('T')[0];
        const questionsDue = allQuestions.filter(q => {
            const stats = userProgress.questionStats[q.id];
            return stats && new Date(stats.nextReview) <= new Date(today) && (stats.strength || 0) < MASTERY_LEVEL;
        }).length;

        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const skillIcons = { "Filosofia e Didattica VES": "fa-brain", "Anatomia": "fa-bone", "Fisiologia": "fa-heart-pulse", "Biomeccanica": "fa-person-running", "Applicazioni Didattiche": "fa-bullseye-pointer" };
        
        let html = `<div class="skill-tree-container">`;
        html += `<button class="daily-review-btn ${questionsDue === 0 ? 'disabled' : ''}" id="daily-review-btn">
            <i class="fa-solid fa-star"></i> 
            ${questionsDue > 0 ? `Ripasso Quotidiano (${questionsDue} carte)` : 'Nessun ripasso per oggi. Ottimo!'}
        </button>`;
        
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

        document.querySelectorAll('.skill-node').forEach(node => node.addEventListener('click', () => handleDashboardAction({ type: 'skill', skill: node.dataset.skill })));
        const reviewBtn = document.getElementById('daily-review-btn');
        if (reviewBtn && !reviewBtn.classList.contains('disabled')) reviewBtn.addEventListener('click', () => handleDashboardAction({ type: 'review' }));
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
            statsHtml += `<div class="achievement-badge ${unlocked ? 'unlocked' : ''}" title="${ach.title}">
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
        if (tougest.length > 0) {
            statsHtml += `<div class="stats-section"><h3>Domande da Ripassare</h3><ul class="tougest-questions-list">`;
            tougest.forEach(([qId,]) => {
                const q = allQuestions.find(item => item.id == qId);
                if (q) statsHtml += `<li data-question-id="${q.id}">${q.question}</li>`;
            });
            statsHtml += '</ul></div>';
        }
        statsHtml += `</div>`;
        app.innerHTML = statsHtml;
        
        renderMasteryChart();
        app.querySelectorAll('.tougest-questions-list li').forEach(li => {
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
            data: { datasets: [{ label: 'Domande Padroneggiate', data: data, borderColor: 'var(--blue-action)', tension: 0.1, fill: true, backgroundColor: 'rgba(28, 176, 246, 0.1)' }] },
            options: { scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }
    
    function renderReport() {
        let reportHtml = `<h2><i class="fa-solid fa-scroll"></i> Report Test</h2>
                          <h3>Hai risposto correttamente a ${currentLesson.correctAnswers} su ${currentLesson.questions.length} domande.</h3>`;

        if (currentLesson.mode === 'standard' && currentLesson.levelUp) {
             reportHtml += `<p style="color:var(--green-correct); font-weight: bold;">Complimenti! Hai aumentato il livello di maestria in ${currentLesson.skill}!</p>`;
        }
                          
        currentLesson.report.forEach(item => {
            reportHtml += `
                <div class="test-report-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                    <p class="report-q-text">${item.question.question}</p>
                    <p class="report-user-answer">La tua risposta: <strong>${item.userAnswer || "Nessuna"}</strong> ${currentLesson.mode === 'timed' ? `(${item.timeToAnswer.toFixed(1)}s)` : ''}</p>
                    <div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div>
                </div>`;
        });
        reportHtml += `<button id="back-to-dash" class="daily-review-btn">Torna alla Dashboard</button>`;
        app.innerHTML = reportHtml;
        document.getElementById('back-to-dash').addEventListener('click', renderSkillTreeDashboard);
    }

// PART 2 OF 3 END

// PART 3 OF 3 START

    // --- LOGICA DI GIOCO E LEZIONI ---
    function startLesson({ skill, mode, questions = null }) {
        let questionPool = questions;
        if (!questionPool) {
            const level = userProgress.skillLevels[skill] || 0;
            questionPool = allQuestions.filter(q => {
                const strength = userProgress.questionStats[q.id]?.strength || 0;
                return q.macro_area === skill && strength <= level;
            }).sort(() => 0.5 - Math.random());
        }
        
        const lessonLength = mode === 'standard' ? 10 : (mode === 'timed' ? 20 : (questionPool.length > 20 ? 20 : questionPool.length));
        currentLesson = {
            questions: questionPool.slice(0, lessonLength), currentIndex: 0, mode: mode,
            timerId: null, correctAnswers: 0, skill: skill, report: [], levelUp: false
        };
        
        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', `Hai già padroneggiato tutte le domande disponibili per il livello attuale di ${skill}. Complimenti!`, feedbackModal, true); return;
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

    function renderQuestion() {
        currentLesson.startTime = Date.now();
        const q = currentLesson.questions[currentLesson.currentIndex];
        const isTimed = currentLesson.mode === 'timed';
        let optionsHtml = '';
        const questionType = q.type;

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
        const questionType = q.type;
        const checkBtn = document.getElementById('check-answer-btn');

        if (currentLesson.mode === 'timed' && (questionType === 'multiple_choice' || questionType === 'true_false')) {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => checkCurrentAnswer(e.currentTarget, e.currentTarget.dataset.answer)));
            checkBtn.classList.add('visually-hidden');
        } else {
            checkBtn.addEventListener('click', () => checkCurrentAnswer());
        }

        const hintBtn = document.getElementById('show-hint-btn');
        const answerBtn = document.getElementById('show-answer-btn');
        if (hintBtn) hintBtn.addEventListener('click', () => showModal('Suggerimento', q.reflection_prompt || q.explanation, feedbackModal));
        if (answerBtn) answerBtn.addEventListener('click', () => showModal('Risposta Corretta', Array.isArray(q.answer) ? q.answer.join(', ') : q.answer, feedbackModal));
        
        if (questionType !== 'open_ended') {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => {
                if (currentLesson.mode !== 'timed') {
                    app.querySelectorAll('.option-btn').forEach(b => b.style.borderColor = '');
                    e.currentTarget.style.borderColor = 'var(--blue-action)';
                }
            }));
        }
    }
    
    function startTimer() {
        let timeLeft = 30;
        const timerDisplay = document.getElementById('time-left');
        const timerBar = document.getElementById('timer-bar');
        if (timerBar) setTimeout(() => { timerBar.style.transition = 'width 30s linear'; timerBar.style.width = '0%'; }, 50);

        currentLesson.timerId = setInterval(() => {
            timeLeft--;
            if (timerDisplay) timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(currentLesson.timerId);
                checkCurrentAnswer(null, null, true);
            }
        }, 1000);
    }
    
    function checkCurrentAnswer(clickedButton = null, immediateAnswer = null, isTimeout = false) {
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
            // ... (logica di verifica risposta, invariata) ...
        }
        
        if (clickedButton) clickedButton.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        updateQuestionStrength(q.id, isCorrect);
        
        if (!userProgress.questionStats[q.id].totalTime) userProgress.questionStats[q.id].totalTime = 0;
        if (currentLesson.mode === 'timed') userProgress.questionStats[q.id].totalTime += timeToAnswer;

        if (isCorrect) currentLesson.correctAnswers++;
        
        currentLesson.report.push({ question: q, userAnswer, isCorrect, timeToAnswer });
        saveProgress();
        showFeedback(isCorrect, isTimeout ? "Tempo scaduto!" : null);
    }

    function showFeedback(isCorrect, message = null) {
        if (soundEnabled) { document.body.addEventListener('click', () => { isCorrect ? correctSound.play() : incorrectSound.play() }, { once: true }); }
        
        currentLesson.isModalOpen = true;
        const q = currentLesson.questions[currentLesson.currentIndex];
        const explanation = q.explanation;
        
        if (currentLesson.mode === 'timed') {
            if(!isCorrect) {
                 const correctBtn = app.querySelector(`[data-answer="${q.answer}"]`);
                 if(correctBtn) correctBtn.classList.add('correct');
            }
            showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal);
            setTimeout(() => closeModal(feedbackModal), 3000);
        } else {
             const checkBtn = document.getElementById('check-answer-btn');
             checkBtn.id = 'next-question-btn';
             checkBtn.textContent = 'Avanti';
             checkBtn.style.backgroundColor = isCorrect ? 'var(--green-correct)' : 'var(--red-incorrect)';
             checkBtn.addEventListener('click', () => closeModal(feedbackModal));
             showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal);
        }
    }

    function nextQuestion() {
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            // Fine lezione: aggiorna stato e controlla achievements
            const today = new Date();
            const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
            if (userProgress.studyStreak.lastDate !== todayStr) {
                 const yesterday = new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() - 1)).toISOString().split('T')[0];
                 userProgress.studyStreak.current = (userProgress.studyStreak.lastDate === yesterday) ? userProgress.studyStreak.current + 1 : 1;
            }
            userProgress.studyStreak.lastDate = todayStr;
            
            if (currentLesson.mode === 'standard' && currentLesson.correctAnswers / currentLesson.questions.length >= 0.8) {
                userProgress.skillLevels[currentLesson.skill] = Math.min((userProgress.skillLevels[currentLesson.skill] || 0) + 1, 5);
                currentLesson.levelUp = true;
            }
            saveProgress();
            checkAchievements();
            renderReport();
        }
    }

    // --- UTILITY E FUNZIONI FINALI ---
    function checkAchievements() {
        const masteredCount = Object.values(userProgress.questionStats).filter(s => s.strength >= MASTERY_LEVEL).length;
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];

        const conditions = {
            'FIRST_LESSON': () => Object.keys(userProgress.questionStats).length > 0,
            'XP_1000': () => userProgress.xp >= 1000,
            'FIRST_MASTERY': () => masteredCount > 0,
            'MASTER_50': () => masteredCount >= 50,
            'PERFECT_LESSON': () => currentLesson.mode === 'standard' && currentLesson.correctAnswers === currentLesson.questions.length,
            'STREAK_7': () => userProgress.studyStreak.current >= 7,
            'MASTER_ALL': () => skills.every(s => (userProgress.skillLevels[s] || 0) === 5)
        };
        
        Object.entries(conditions).forEach(([id, condition]) => {
            if (!userProgress.achievements.includes(id) && condition()) {
                userProgress.achievements.push(id);
                showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[id].title}`);
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
        }, 3000);
    }
    
    // ... Il resto delle funzioni (renderReport, modali, search, sound, etc.)
    
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
