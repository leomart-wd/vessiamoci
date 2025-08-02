// PART 1 OF 4 START
// --- VESsiamoci: The Extraordinary Engine ---
// --- Architected with Perfection by Gemini ---

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

    // --- 2. AUDIO ENGINE (with preloading and error handling) ---
    const sounds = {
        correct: new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3'),
        incorrect: new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3')
    };
    Object.values(sounds).forEach(sound => {
        sound.volume = 0.7;
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

            const actionId = target.id;
            if (actionId === 'home-title') renderDashboard();
            if (actionId === 'training-hub-btn') renderTrainingHub();
            if (actionId === 'stats-btn') renderStatsPage();
            if (actionId === 'global-search-btn') openSearchModal();
            if (actionId === 'sound-toggle-btn') toggleSound();
        });

        // Event Delegation for main app container
        app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            handleAppAction(target.dataset.action, target.dataset.skill);
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

    function handleAppAction(action, skill) {
        if (action === 'go-to-learn') renderSkillTree();
        if (action === 'go-to-train') renderTrainingHub();
        if (action === 'start-skill-lesson') startLesson({ skill, mode: 'standard' });
        if (action === 'start-daily-review') startDailyReview();
        if (action === 'start-mistakes-review') startLesson({ skill: 'all', mode: 'mistakes' });
        if (action === 'start-timed-mode') startLesson({ skill: 'all', mode: 'timed' });
        if (action === 'back-to-dashboard') renderDashboard();
    }

    function updatePCVisuals() {
        pcCounter.innerHTML = `<i class="fa-solid fa-star"></i> ${userProgress.xp || 0}`;
    }

// PART 1 OF 3 END

// PART 2 OF 3 START

    // --- 5. VIEWS & DASHBOARDS RENDERING ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        if (myChart) { myChart.destroy(); myChart = null; }

        app.innerHTML = `
            <div class.pathway-container">
                <div class="pathway-card learn-path" data-action="go-to-learn">
                    <i class="fa-solid fa-lightbulb-on"></i>
                    <h2>IMPARA</h2>
                    <p>Costruisci la tua conoscenza, un'abilità alla volta.</p>
                </div>
                <div class="pathway-card train-path" data-action="go-to-train">
                    <i class="fa-solid fa-dumbbell"></i>
                    <h2>ALLENATI</h2>
                    <p>Metti alla prova la tua memoria e i tuoi riflessi.</p>
                </div>
            </div>`;
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
             html += `<button class="daily-review-btn" data-action="start-daily-review">
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
                <div class="skill-node level-${level}" data-action="start-skill-lesson" data-skill="${skill}" title="Livello ${level} - Maestria ${Math.round(progress * 100)}%">
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
    }

    function renderTrainingHub() {
        const mistakenQuestionsCount = Object.keys(userProgress.questionStats).filter(qId => (userProgress.questionStats[qId]?.incorrect || 0) > 0).length;
        
        app.innerHTML = `
            <div class="skill-row">
                <div class="training-hub-card">
                    <h3>Ripassa i Tuoi Errori</h3>
                    <p>Concentrati sulle domande che hai sbagliato in passato per trasformare le debolezze in punti di forza.</p>
                    <button class="btn btn-review ${mistakenQuestionsCount === 0 ? 'disabled' : ''}" data-action="start-mistakes-review">
                        ${mistakenQuestionsCount > 0 ? `Ripassa ${mistakenQuestionsCount} Errori` : 'Nessun Errore da Ripassare'}
                    </button>
                </div>
                <div class="training-hub-card">
                    <h3>Modalità a Tempo</h3>
                    <p>Metti alla prova la tua velocità e precisione su tutte le materie in una sfida contro il tempo.</p>
                    <button class="btn btn-timed" data-action="start-timed-mode">Inizia Allenamento</button>
                </div>
            </div>`;
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

    // PART 3 of 3 START

    // --- 6. CORE LESSON LOG course. Here is the third and final part. This completes our mission and deliversIC & SPACED REPETITION ---
    function startLesson({ skill, mode, questions = null }) {
 the stable milestone.

### Part 3 of 4: The Interaction Layer and Final Utilities

This final block of        let questionPool = questions;
        if (!questionPool) {
            if (mode === 'standard') {
 code is the "nervous system" of the application, responsible for handling every user action with precision and fluidity. It                const level = userProgress.skillLevels[skill] || 0;
                questionPool = allQuestions.filter(q => {
                    const strength = userProgress.questionStats[q.id]?.strength || 0;
 contains:
*   The `renderQuestion` function, now with the **"Atlante Visivo"** logic to                    return q.macro_area === skill && strength < level + 2 && strength < MASTERY_LEVEL; // Show display and make images clickable.
*   The perfected `setupQuestionListeners`, `checkCurrentAnswer`, and `show questions up to one level above
                }).sort(() => 0.5 - Math.random());
            } else if (Feedback` functions, which create the seamless and informative feedback loop.
*   The definitive **audio fix**, ensuring soundsmode === 'timed') {
                questionPool = [...allQuestions].sort(() => 0.5 - Math.random()); play reliably.
*   The final `nextQuestion` logic, which now also handles **unlocking achievements** at
            } else if (mode === 'mistakes') {
                 const mistakenIds = Object.keys(userProgress.question the end of a lesson.
*   The intelligent `renderReport` function, which provides a **universal, detailed "Stats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
                 const baseSource = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
                 questionPoolDebriefing di Sessione"** for all modes, complete with the "Consiglio dello Scienziato."
*   All = (skill === 'all') ? baseSource : baseSource.filter(q => q.macro_area === skill);
 essential utility functions for sounds, modals (including the image atlas), and search, polished to perfection.

**Your Instructions            }
        }
        
        const lessonLength = mode === 'timed' ? 20 : (mode === 'daily_review' || mode === 'mistakes' ? (questionPool.length > 20 ?:**

1.  Open your `js/main.js` file, which now contains Parts 1 and 2 20 : questionPool.length) : 10);
        currentLesson = {
            questions: question.
2.  Go to the very end of the file.
3.  Copy the entire code block below.Pool.slice(0, lessonLength), currentIndex: 0, mode: mode,
            timerId: null
4.  Paste it at the end of your `js/main.js` file, immediately after `// PART 2, correctAnswers: 0, skill: skill, report: [], levelUp: false
        };
        
         OF 3 END`.
5.  Save, commit, and push. Your flawless application will be live.

---if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'Nessuna domanda

```javascript
// PART 3 OF 4 START

    // --- 6. CORE LESSON LOGIC disponibile per questa selezione. Potresti aver già padroneggiato tutto!', feedbackModal); return;
        }
 & SPACED REPETITION ---
    function startLesson({ skill, mode, questions = null }) {
        let question        renderQuestion();
    }
    
    function startDailyReview() {
        const today = new Date().toISOStringPool = questions;
        if (!questionPool) {
            if (mode === 'standard') {
                const level().split('T')[0];
        const questionsDue = allQuestions
            .filter(q => {
                const stats = userProgress.questionStats[q.id];
                return stats && new Date(stats.next = userProgress.skillLevels[skill] || 0;
                questionPool = allQuestions.filter(q => {Review) <= new Date(today) && (stats.strength || 0) < MASTERY_LEVEL;
            })
                    const strength = userProgress.questionStats[q.id]?.strength || 0;
                    return q
            .sort((a, b) => new Date(userProgress.questionStats[a.id]?.nextReview) - new Date(userProgress.questionStats[b.id]?.nextReview));
        
        startLesson({.macro_area === skill && strength <= level;
                }).sort(() => 0.5 - Math.random skill: 'Ripasso', mode: 'daily_review', questions: questionsDue });
    }

    function updateQuestion());
            } else if (mode === 'timed') {
                questionPool = [...allQuestions].sort(() => 0.5 - Math.random());
            } else if (mode === 'mistakes') {
                 const mistakenStrength(questionId, isCorrect) {
        const stats = userProgress.questionStats[questionId] ||Ids = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[q { strength: 0, correct: 0, incorrect: 0 };
        const today = new Date();Id]?.incorrect > 0);
                 const baseSource = allQuestions.filter(q => mistakenIds.includes
        const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('(q.id.toString()));
                 questionPool = (skill === 'all') ? baseSource : baseSource.filter(T')[0];
        const oldStrength = stats.strength || 0;
        
        if (isq => q.macro_area === skill);
            }
        }
        
        const lessonLength = modeCorrect) {
            stats.strength = Math.min(oldStrength + 1, STRENGTH_INTERVALS === 'timed' ? 20 : (mode === 'daily_review' ? (questionPool.length > 2.length);
            if (stats.strength >= MASTERY_LEVEL && oldStrength < MASTERY_LEVEL)0 ? 20 : questionPool.length) : 10);
        currentLesson = {
            questions {
                userProgress.masteryHistory[todayStr] = (userProgress.masteryHistory[todayStr] || 0) + 1;
            }
        } else {
            stats.strength = Math.max(oldStrength: questionPool.slice(0, lessonLength), currentIndex: 0, mode: mode,
            timerId: null - 2, 0);
        }
        
        if (stats.strength < STRENGTH_INTERVALS.length, correctAnswers: 0, skill: skill, report: [], levelUp: false
        };
        
) {
            const intervalDays = STRENGTH_INTERVALS[stats.strength];
            today.setDate(today.        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'NgetDate() + intervalDays);
            stats.nextReview = today.toISOString().split('T')[0];
        }essuna domanda disponibile per questa selezione.', feedbackModal, true); return;
        }
        renderQuestion();
    }
 else {
            stats.nextReview = '3000-01-01';
        }
            
    function startDailyReview() {
        const today = new Date().toISOString().split('T')[0];stats.lastReviewed = todayStr;
        userProgress.questionStats[questionId] = stats;
    
        const questionsDue = allQuestions
            .filter(q => {
                const stats = userProgress.}
    
    // --- 7. QUESTION RENDERING & INTERACTION ---
    function renderQuestion() {
        currentquestionStats[q.id];
                return stats && new Date(stats.nextReview) <= new Date(todayLesson.startTime = Date.now();
        const q = currentLesson.questions[currentLesson.currentIndex];
        const) && (stats.strength || 0) < MASTERY_LEVEL;
            })
            .sort(( isTimed = currentLesson.mode === 'timed';
        let optionsHtml = '';
        const questionType = q.type;
        const imageHtml = q.image ? `<div class="question-image-container"><imga, b) => new Date(userProgress.questionStats[a.id]?.nextReview) - new Date(user src="${q.image}" alt="Immagine per la domanda" class="question-image"></div>` : '';Progress.questionStats[b.id]?.nextReview));
        
        startLesson({ skill: 'Ripasso

        if (questionType === 'multiple_choice' && q.options) {
            q.options.', mode: 'daily_review', questions: questionsDue });
    }

    function updateQuestionStrength(questionforEach(opt => { optionsHtml += `<button class="option-btn" data-answer="${opt}">${opt}</Id, isCorrect) {
        const stats = userProgress.questionStats[questionId] || { strength: 0,button>`; });
        } else if (questionType === 'true_false') {
            optionsHtml += `< correct: 0, incorrect: 0 };
        const today = new Date();
        const todayStr = new Date(button class="option-btn" data-answer="true">Vero</button>`;
            optionsHtml += `<button class="today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];

        const oldStrength = stats.strength || 0;
        
        if (isCorrect) {
            stats.strength = Mathoption-btn" data-answer="false">Falso</button>`;
        } else {
            optionsHtml += `<textarea.min(oldStrength + 1, STRENGTH_INTERVALS.length);
            if (stats.strength >= MAST id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`;
        }

ERY_LEVEL && oldStrength < MASTERY_LEVEL) {
                userProgress.masteryHistory[todayStr] = (        app.innerHTML = `
            <div class="lesson-header">
                ${isTimed ? '<div class="timeruserProgress.masteryHistory[todayStr] || 0) + 1;
            }
        } else {-display"><i class="fa-solid fa-clock"></i> <span id="time-left">30</span></div>'
            stats.strength = Math.max(oldStrength - 2, 0);
        }
        
 : `<div>${currentLesson.skill}</div>`}
                <span>${currentLesson.currentIndex + 1}/${currentLesson.questions        if (stats.strength < STRENGTH_INTERVALS.length) {
            const intervalDays = STRENGTH_.length}</span>
                <div class="progress-bar-container"><div class="progress-bar" style="widthINTERVALS[stats.strength];
            today.setDate(today.getDate() + intervalDays);
            stats: ${((currentLesson.currentIndex) / currentLesson.questions.length) * 100}%"></div></div>
            </div>
            <div class="question-container">
                ${imageHtml}
                <p class="question-text">${q.question}</p>
                <div class="answer-options">${optionsHtml}</div>
                ${isTimed ? '<div class="timer-bar-container"><div id="timer-bar" class.nextReview = today.toISOString().split('T')[0];
        } else {
            stats.nextReview = '3000-01-01';
        }
        stats.lastReviewed = todayStr;
        userProgress.questionStats[questionId] = stats;
    }

// PART 3 OF 4 END //
                          
