// PART 1 OF 3 START
// --- VESsiamoci: The Extraordinary Engine ---
// --- Architected with Perfection by Gemini (v13.0 - The Definitive, Working Build) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE & DOM REFERENCES ---
    const app = document.getElementById('app');
    const pcCounter = document.getElementById('pc-counter');
    const toast = document.getElementById('toast-notification');
    const feedbackModal = document.getElementById('feedback-modal-container');
    
    // CRITICAL FIX: The myChart variable declaration is restored to the global scope.
    let myChart = null; 
    
    const STRENGTH_INTERVALS = [1, 2, 5, 10, 21, 45, 90, 180];
    const MASTERY_LEVEL = 5;
    let allQuestions = [];
    let userProgress = {};
    let currentLesson = {};
    let soundEnabled = true;
    let isAudioUnlocked = false;

    // --- 2. AUDIO ENGINE ---
    const sounds = {
        correct: new Audio('https://actions.google.com/sounds/v1/positive/success.ogg'),
        incorrect: new Audio('https://actions.google.com/sounds/v1/negative/failure.ogg')
    };
    Object.values(sounds).forEach(sound => { sound.volume = 0.4; sound.load(); });
    function unlockAudio() {
        if (isAudioUnlocked) return;
        Object.values(sounds).forEach(s => { s.play().then(() => s.pause()).catch(() => {}); });
        isAudioUnlocked = true;
    }

    // --- 3. GAMIFICATION ENGINE (Constants) ---
    const PC_REWARDS = { FIRST_TIME_CORRECT: 10, REVIEW_CORRECT: 15, HINT_ASSISTED_CORRECT: 4, LEVEL_UP: 100, MASTER_SKILL: 250 };
    const ACHIEVEMENTS = { FIRST_LESSON: { title: "Il Progettista", icon: "fa-pencil-ruler" }, XP_1000: { title: "Scienziato Emergente", icon: "fa-flask" }, FIRST_MASTERY: { title: "Pioniere Neurale", icon: "fa-brain" }, MASTER_50: { title: "Bio-Ingegnere", icon: "fa-sitemap" }, MASTER_ANATOMIA: { title: "Cert. Anatomia", icon: "fa-bone" }, MASTER_FISIOLOGIA: { title: "Dott. Fisiologia", icon: "fa-heart-pulse" }, MASTER_BIOMECCANICA: { title: "Spec. Biomeccanica", icon: "fa-person-running" }, MASTER_APPLICAZIONI_DIDATTICHE: { title: "Maestro Didattica", icon: "fa-bullseye" }, MASTER_FILOSOFIA_E_DIDATTICA_VES: { title: "Filosofo della Voce", icon: "fa-book-open" }, MASTER_ALL: { title: "Uomo Vitruviano", icon: "fa-universal-access" }, PERFECT_LESSON: { title: "Esecuzione Perfetta", icon: "fa-check-double" }, STREAK_7: { title: "Costanza Inarrestabile", icon: "fa-calendar-week" }, PERFECT_REVIEW: { title: "Implacabile", icon: "fa-star-of-life" } };
    
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
            app.innerHTML = `<div class="question-container" style="text-align:center;"><p><strong>Errore critico:</strong> Impossibile caricare le domande.</p></div>`;
            console.error("Fetch Error:", error);
        }
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        const defaultProgress = { xp: 0, questionStats: {}, skillLevels: {}, masteryHistory: {}, studyStreak: { current: 0, lastDate: null }, achievements: [], genesisQuizCompleted: false };
        userProgress = savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : defaultProgress;
        updateSoundIcon();
        updatePCVisuals();
    }

    function saveProgress() { localStorage.setItem('vessiamociUserProgress', JSON.stringify(userProgress)); }

    function setupGlobalListeners() {
        document.body.addEventListener('click', (e) => {
            if (!isAudioUnlocked) unlockAudio();
            const modalContainer = e.target.closest('.modal-container');
            if (modalContainer && (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn'))) {
                closeModal(modalContainer); return;
            }
            const target = e.target.closest('[data-action]');
            if (!target || target.classList.contains('disabled')) return;
            const { action } = target.dataset;
            const actions = {
                'go-to-dashboard': renderDashboard,
                'go-to-learn': handleLearnPath,
                'go-to-train': renderTrainingHub,
                'go-to-stats': renderStatsPage,
                'start-lesson': (t) => startLesson({ mode: t.dataset.mode, skill: t.dataset.skill }),
                'start-daily-review': startDailyReview,
                'back-to-dashboard': renderDashboard,
                'check-answer': checkCurrentAnswer,
                'next-question': () => closeModal(feedbackModal),
                'get-hint': provideHint,
                'open-image': (t) => openImageModal(t.src),
                'choose-option': (t) => {
                    app.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    t.classList.add('selected');
                },
                'toggle-sound': toggleSound
            };
            if (actions[action]) { actions[action](target); }
        });
        const searchInput = document.getElementById('search-modal-input');
        if (searchInput) searchInput.addEventListener('input', handleSearch);
    }
    
    function updatePCVisuals() { pcCounter.innerHTML = `<i class="fa-solid fa-star"></i> ${userProgress.xp || 0}`; }

// PART 1 OF 3 END

// PART 2 OF 3 START

    // --- 5. VIEWS & DASHBOARDS RENDERING ---
    function renderDashboard() {
        const learnButtonText = userProgress.genesisQuizCompleted ? "INIZIA SESSIONE ADATTIVA" : "INIZIA IL TUO PERCORSO";
        const learnDescription = userProgress.genesisQuizCompleted ? "Una lezione creata su misura per te dal nostro tutor IA." : "Fai il nostro quiz iniziale per personalizzare il tuo piano di studi.";
        app.innerHTML = `<div class="dashboard-container"><a class="dashboard-button learn-path" data-action="go-to-learn"><i class="fa-solid fa-brain"></i><h2>${learnButtonText}</h2><p>${learnDescription}</p></a><a class="dashboard-button train-path" data-action="go-to-train"><i class="fa-solid fa-dumbbell"></i><h2>ALLENATI</h2><p>Metti alla prova le tue conoscenze con quiz mirati.</p></a></div>`;
    }

    function handleLearnPath() {
        if (userProgress.genesisQuizCompleted) {
            renderAdaptiveHub();
        } else {
            renderGenesisPrompt();
        }
    }

    function renderGenesisPrompt() {
        app.innerHTML = `<div class="question-container" style="text-align: center;"><h2 class="page-title"><i class="fa-solid fa-rocket"></i> Benvenuto in Vessiamoci!</h2><p style="font-size: 1.2rem; line-height: 1.6;">Prima di iniziare, facciamo un breve quiz di valutazione.</p><p>Questo ci aiuterà a capire il tuo livello di partenza e a creare un <strong>percorso di studi personalizzato</strong> solo per te. Sarà veloce e incredibilmente utile!</p><button class="daily-review-btn" data-action="start-lesson" data-mode="genesis" style="margin-top: 2rem;">Inizia il Quiz di Valutazione</button></div>`;
    }

    function renderAdaptiveHub() {
        const questionsDue = allQuestions.filter(q => { const stats = userProgress.questionStats[q.id]; return stats && stats.nextReview && new Date(stats.nextReview) <= new Date() && stats.strength < MASTERY_LEVEL; }).length;
        app.innerHTML = `<div class="skill-tree-container">
            <button class="daily-review-btn" data-action="start-lesson" data-mode="adaptive"><i class="fa-solid fa-wand-magic-sparkles"></i> Inizia Sessione Adattiva</button>
            <button class="daily-review-btn ${questionsDue === 0 ? 'disabled' : ''}" data-action="start-daily-review" style="background-color: var(--purple-special);"><i class="fa-solid fa-calendar-check"></i> ${questionsDue > 0 ? `Ripasso Quotidiano (${questionsDue} carte)` : 'Nessun Ripasso in Sospeso'}</button>
            <h2 class="page-title" style="margin-top: 2rem;">Oppure, Scegli un Argomento Specifico</h2><div class="skill-row"></div></div>`;
        renderSkillTree(true);
    }

    function renderSkillTree(isSubView = false) {
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const skillIcons = { "Filosofia e Didattica VES": "fa-brain", "Anatomia": "fa-bone", "Fisiologia": "fa-heart-pulse", "Biomeccanica": "fa-person-running", "Applicazioni Didattiche": "fa-bullseye" };
        let skillHtml = '';
        skills.forEach(skill => {
            const level = userProgress.skillLevels[skill] || 0;
            const masteredCount = Object.keys(userProgress.questionStats).filter(qId => allQuestions.find(q=>q.id==qId)?.macro_area === skill && userProgress.questionStats[qId].strength >= MASTERY_LEVEL).length;
            const totalInSkill = allQuestions.filter(q => q.macro_area === skill).length;
            const progress = totalInSkill > 0 ? (masteredCount / totalInSkill) : 0;
            skillHtml += `<div class="skill-node level-${level}" data-action="start-lesson" data-mode="standard" data-skill="${skill}" title="Livello ${level} - Maestria ${Math.round(progress*100)}%"><div class="skill-icon-container"><svg viewBox="0 0 120 120"><circle class="progress-ring-bg" cx="60" cy="60" r="54" fill="transparent" stroke-width="8"></circle><circle class="progress-ring" cx="60" cy="60" r="54" fill="transparent" stroke-width="8" stroke-dasharray="${2*Math.PI*54}" stroke-dashoffset="${2*Math.PI*54*(1-progress)}"></circle></svg><i class="fa-solid ${skillIcons[skill]||"fa-question"} skill-icon"></i><div class="skill-level">${level}</div></div><h4>${skill.replace(" e Didattica VES","")}</h4></div>`;
        });
        const targetElement = isSubView ? app.querySelector('.skill-row') : app;
        targetElement.innerHTML = isSubView ? skillHtml : `<div class="skill-tree-container"><div class="skill-row">${skillHtml}</div></div>`;
    }

    function renderTrainingHub() {
        const areaStats = calculateAreaStats();
        const canReviewWeakest = areaStats.some(area => area.total > 5);
        const mistakenQuestionsCount = Object.keys(userProgress.questionStats).filter(qId => (userProgress.questionStats[qId]?.incorrect || 0) > 0).length;
        app.innerHTML = `<h2 class="page-title">Modalità Allenamento</h2><div class="dashboard-container" style="gap: 1rem;"><a class="dashboard-button ${!canReviewWeakest ? 'disabled' : ''}" data-action="start-lesson" data-mode="weakest_link" style="background: linear-gradient(135deg, #dc3545, #a21b2b);"><i class="fa-solid fa-magnifying-glass-chart"></i><h3>RIPASSA I PUNTI DEBOLI</h3><p>${canReviewWeakest ? 'Lancia un quiz mirato sulla tua area più difficile.' : 'Completa più lezioni per sbloccare questa modalità.'}</p></a><a class="dashboard-button ${mistakenQuestionsCount === 0 ? 'disabled' : ''}" data-action="start-lesson" data-mode="mistakes" style="background: linear-gradient(135deg, #ffc107, #d39e00);"><i class="fa-solid fa-circle-exclamation"></i><h3>RIPASSA I TUOI ERRORI</h3><p>${mistakenQuestionsCount > 0 ? `Rifai le ${mistakenQuestionsCount} domande che hai sbagliato.` : 'Nessun errore da ripassare. Ottimo lavoro!'}</p></a><a class="dashboard-button" data-action="start-lesson" data-mode="quiz" data-skill="all" style="background: linear-gradient(135deg, #17a2b8, #117a8b);"><i class="fa-solid fa-list-check"></i><h3>QUIZ GENERALE</h3><p>Mettiti alla prova su tutte le categorie.</p></a></div>`;
    }

    /**
     * RE-ARCHITECTED: This is the new, defensive, and decoupled stats calculation engine.
     * Its ONLY job is to safely process data and return a clean object.
     */
    function calculateUserStatistics() {
        const stats = {
            totalCorrect: 0,
            totalAnswered: 0,
            masteredCount: 0,
            byArea: {},
            overallAccuracy: 0,
            topSkills: [],
            worstSkills: [],
            studyStreak: userProgress.studyStreak.current || 0
        };

        const questionStats = userProgress.questionStats;
        if (!questionStats || Object.keys(questionStats).length === 0) {
            return stats; // Return default object if no data exists
        }

        stats.masteredCount = Object.values(questionStats).filter(s => s.strength >= MASTERY_LEVEL).length;

        for (const [qId, stat] of Object.entries(questionStats)) {
            const q = allQuestions.find(item => item.id == qId);
            if (!q) continue;

            const correct = stat.correct || 0;
            const incorrect = stat.incorrect || 0;
            stats.totalCorrect += correct;
            stats.totalAnswered += correct + incorrect;

            const area = q.macro_area;
            if (!stats.byArea[area]) stats.byArea[area] = { correct: 0, total: 0, name: area };
            stats.byArea[area].correct += correct;
            stats.byArea[area].total += correct + incorrect;
        }

        if (stats.totalAnswered > 0) {
            stats.overallAccuracy = Math.round((stats.totalCorrect / stats.totalAnswered) * 100);
        }
        
        const areaStats = Object.values(stats.byArea).filter(a => a.total > 0).map(a => ({ ...a, accuracy: (a.correct / a.total) * 100 }));
        stats.topSkills = [...areaStats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
        stats.worstSkills = [...areaStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

        return stats;
    }

    /**
     * RE-ARCHITECTED: The new stats page presenter. It's now purely for rendering.
     * It uses the safe data from calculateUserStatistics and guarantees the chart canvas exists before rendering.
     */
    function renderStatsPage() {
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        
        const stats = calculateUserStatistics();

        // DEFENSIVE CHECK: This is the critical gatekeeper that prevents crashes.
        if (stats.totalAnswered === 0) {
            app.innerHTML = `<div class="question-container" style="text-align:center;"><h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2><p>Non hai ancora completato nessuna domanda!</p><p>Inizia un quiz per vedere i tuoi progressi qui.</p><button class="daily-review-btn" data-action="go-to-learn" style="margin-top: 1rem;">Inizia a Imparare</button></div>`;
            return;
        }

        let statsHtml = `
            <h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>
            <div class="stats-container">
                <div class="stats-header">
                    <div class="stat-card"><div class="value green">${stats.overallAccuracy}%</div><div class="label">Accuratezza Totale</div></div>
                    <div class="stat-card"><div class="value">${stats.masteredCount}</div><div class="label">Domande Padroneggiate</div></div>
                    <div class="stat-card"><div class="value">${stats.studyStreak}</div><div class="label">Bio-Ritmo (Giorni)</div></div>
                </div>
                <div class="stats-section"><h3><i class="fa-solid fa-chart-line"></i> Maestria nel Tempo</h3><div id="mastery-chart-container"><canvas id="masteryChart"></canvas></div></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="stats-section"><h3><i class="fa-solid fa-trophy"></i> Abilità Migliori</h3>
                        ${stats.topSkills.map(s => `<div class="stat-item"><div class="stat-item-header"><span>${s.name}</span><span>${s.accuracy.toFixed(0)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:${s.accuracy}%; background: var(--green-correct);"></div></div></div>`).join('') || '<p>Nessun dato disponibile.</p>'}
                    </div>
                    <div class="stats-section"><h3><i class="fa-solid fa-magnifying-glass-chart"></i> Aree di Miglioramento</h3>
                        ${stats.worstSkills.map(s => `<div class="stat-item"><div class="stat-item-header"><span>${s.name}</span><span>${s.accuracy.toFixed(0)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:${s.accuracy}%; background: var(--red-incorrect);"></div></div></div>`).join('') || '<p>Nessun dato disponibile.</p>'}
                    </div>
                </div>
                <div class="stats-section"><h3><i class="fa-solid fa-award"></i> Certificazioni Ottenute</h3><div class="achievements-grid">
        `;
        Object.entries(ACHIEVEMENTS).forEach(([id, ach]) => {
            const unlocked = userProgress.achievements.includes(id);
            statsHtml += `<div class="achievement-badge ${unlocked ? 'unlocked' : ''}" title="${ach.title}"><i class="fa-solid ${ach.icon}"></i><p>${ach.title}</p></div>`;
        });
        statsHtml += `</div></div>`;

        if (stats.worstSkills.length > 0) {
            statsHtml += `<button class="daily-review-btn" data-action="start-lesson" data-mode="weakest_link" style="margin-top: 2rem; background-color: var(--red-incorrect);"><i class="fa-solid fa-crosshairs"></i> Concentrati sui Punti Deboli</button>`;
        }
        statsHtml += '</div>';

        app.innerHTML = statsHtml;
        
        renderMasteryChart();
    }
    
    function renderMasteryChart(){const history=userProgress.masteryHistory||{};const dates=Object.keys(history).sort((a,b)=>new Date(a)-new Date(b));const container=document.getElementById("mastery-chart-container");if(dates.length<2){container.innerHTML='<p style="text-align: center; padding: 2rem;">Padroneggia più domande in giorni diversi per vedere il grafico dei tuoi progressi.</p>';return}let cumulativeMastery=0;const data=dates.map(date=>{cumulativeMastery+=history[date];return{x:date,y:cumulativeMastery}});const ctx=document.getElementById("masteryChart").getContext("2d");if(myChart)myChart.destroy();myChart=new Chart(ctx,{type:"line",data:{datasets:[{label:"Domande Padroneggiate",data,borderColor:"var(--blue-primary)",tension:.2,fill:!0,backgroundColor:"rgba(0, 123, 255, 0.1)"}]},options:{scales:{x:{type:"time",time:{unit:"day",tooltipFormat:"dd MMM yyyy"}},y:{beginAtZero:!0,ticks:{precision:0}}},responsive:!0,maintainAspectRatio:!1}})}
// PART 2 OF 3 END

// PART 3 OF 3 START

    // --- 6. CORE LESSON LOGIC: MODULAR & DIRECT ---
    function startLesson({ pool, title, mode, length }) {
        currentLesson = { questions: [...new Set(pool)].slice(0, length), currentIndex: 0, mode, lessonTitle: title, correctAnswers: 0, report: [] };
        if (currentLesson.questions.length === 0) {
            showModal("Nessuna Domanda", "Non ci sono domande disponibili per questa selezione. Prova una categoria diversa o completa più lezioni!", feedbackModal);
            renderDashboard();
            return;
        }
        renderQuestion();
    }
    function startDailyReview() {
        const today = new Date();
        const pool = allQuestions.filter(q => { const stats = userProgress.questionStats[q.id]; return stats && stats.nextReview && new Date(stats.nextReview) <= today && stats.strength < MASTERY_LEVEL; }).sort((a, b) => new Date(userProgress.questionStats[a.id].nextReview) - new Date(userProgress.questionStats[b.id].nextReview));
        startLesson({ pool, title: "Ripasso Quotidiano", mode: 'daily_review', length: Math.min(pool.length, 15) });
    }
    function startGenesisQuiz() {
        const categories = [...new Set(allQuestions.map(q => q.macro_area))];
        const pool = categories.flatMap(cat => allQuestions.filter(q => q.macro_area === cat).slice(0, 4));
        const finalPool = [...new Set(pool)].sort(() => 0.5 - Math.random());
        startLesson({ pool: finalPool, title: "Quiz di Valutazione", mode: 'genesis', length: finalPool.length });
    }
    function startAdaptiveSession() {
        const stats = calculateAreaStats();
        const weakest = stats.length > 0 ? stats.sort((a, b) => a.accuracy - b.accuracy)[0] : null;
        const newQs = allQuestions.filter(q => !userProgress.questionStats[q.id]).slice(0, 4);
        const weakQs = weakest ? allQuestions.filter(q => q.macro_area === weakest.name && (userProgress.questionStats[q.id]?.strength || 0) < MASTERY_LEVEL).slice(0, 6) : [];
        const pool = [...newQs, ...weakQs].length > 0 ? [...newQs, ...weakQs] : allQuestions.slice(0, 10);
        startLesson({ pool: [...new Set(pool)].sort(() => 0.5 - Math.random()), title: "Sessione Adattiva", mode: 'adaptive', length: 10 });
    }
    function startWeakestLinkSession() {
        const weakest = calculateAreaStats().sort((a, b) => a.accuracy - b.accuracy)[0];
        const pool = weakest ? allQuestions.filter(q => q.macro_area === weakest.name) : [];
        startLesson({ pool: pool.sort(() => 0.5 - Math.random()), title: `Focus: ${weakest?.name || 'Punti Deboli'}`, mode: 'weakest_link', length: 15 });
    }
    function startQuizLesson(skill) {
        const pool = skill === 'all' ? allQuestions : allQuestions.filter(q => q.macro_area === skill);
        startLesson({ pool: [...pool].sort(() => 0.5 - Math.random()), title: skill === 'all' ? 'Quiz Generale' : `Quiz: ${skill}`, mode: 'quiz', length: 20 });
    }
    function startMistakesReview() {
        const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
        const pool = allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
        startLesson({ pool, title: "Revisione Errori", mode: 'mistakes', length: Math.min(pool.length, 15) });
    }
    function startStandardLesson(skill) {
        const pool = allQuestions.filter(q => q.macro_area === skill && (userProgress.questionStats[q.id]?.strength || 0) < MASTERY_LEVEL);
        startLesson({ pool: pool.sort(() => 0.5 - Math.random()), title: skill, mode: 'standard', length: 10 });
    }
    
    // --- 7. QUESTION RENDERING & VALIDATION ---
    function renderQuestion(){currentLesson.startTime=Date.now();currentLesson.hintLevel=0;currentLesson.hintUsed=!1;const q=currentLesson.questions[currentLesson.currentIndex];let optionsHtml="";const imageHtml=q.image?`<div class="question-image-container"><img src="${q.image}" alt="Immagine" class="question-image" data-action="open-image"></div>`:"";if(q.type==="multiple_choice"){[...q.options].sort(()=>.5-Math.random()).forEach(opt=>{optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="${opt}">${opt}</button>`})}else if(q.type==="true_false"){optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="true">Vero</button>`;optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="false">Falso</button>`}else{optionsHtml+=`<textarea id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`}app.innerHTML=`<div class="lesson-header"><div>${currentLesson.lessonTitle}</div><span>${currentLesson.currentIndex+1}/${currentLesson.questions.length}</span><div class="progress-bar-container"><div class="progress-bar" style="width: ${currentLesson.currentIndex/currentLesson.questions.length*100}%"></div></div></div><div class="question-container">${imageHtml}<p class="question-text">${q.question}</p><div class="answer-options">${optionsHtml}</div><div class="lesson-footer" style="display: flex; gap: 10px;"><button class="hint-btn" id="hint-btn" data-action="get-hint"><i class="fa-solid fa-lightbulb"></i> Aiuto</button><button id="check-answer-btn" data-action="check-answer" style="flex-grow: 1;">Controlla</button></div></div>`}
    function provideHint(){currentLesson.hintUsed=!0;const q=currentLesson.questions[currentLesson.currentIndex];const hintButton=document.getElementById("hint-btn");if(currentLesson.hintLevel===0){currentLesson.hintLevel=1;const socraticHint=generateSocraticHint(q.explanation,q.answer);if(socraticHint){showModal("Suggerimento (Livello 1)",socraticHint,feedbackModal);hintButton.innerHTML=`<i class="fa-solid fa-lightbulb-on"></i> Altro Aiuto?`;return}}if(q.type==="multiple_choice"&&q.options.length>2){const options=app.querySelectorAll(".option-btn:not(:disabled)");const correctAnswer=q.answer;let wrongOptionEliminated=!1;for(const option of options){if(option.dataset.answer!==correctAnswer){option.disabled=!0;option.style.opacity="0.5";option.style.textDecoration="line-through";wrongOptionEliminated=!0;break}}if(wrongOptionEliminated){showModal("Assistenza (Livello 2)","Ho eliminato una delle opzioni sbagliate per te.",feedbackModal);hintButton.disabled=!0;hintButton.innerHTML=`<i class="fa-solid fa-check"></i> Buona Fortuna!`;return}}showModal("Assistenza Finale",q.explanation,feedbackModal);hintButton.disabled=!0;hintButton.innerHTML=`<i class="fa-solid fa-check"></i> Buona Fortuna!`}
    function checkCurrentAnswer(){const q=currentLesson.questions[currentLesson.currentIndex];let userAnswer="Nessuna risposta";let isCorrect=!1;app.querySelector(".answer-options").classList.add("disabled");app.querySelector(".lesson-footer").style.pointerEvents="none";const selectedButton=app.querySelector(".option-btn.selected");if(selectedButton)userAnswer=selectedButton.dataset.answer;const correctAnswer=String(q.answer);isCorrect=userAnswer.toLowerCase()===correctAnswer.toLowerCase();if(selectedButton){selectedButton.classList.add(isCorrect?"correct":"incorrect")}if(!isCorrect){const correctBtn=app.querySelector(`[data-answer="${correctAnswer}"]`);if(correctBtn)correctBtn.classList.add("correct")}updateQuestionStrength(q.id,isCorrect);if(isCorrect){currentLesson.correctAnswers++;const reward=currentLesson.hintUsed?PC_REWARDS.HINT_ASSISTED_CORRECT:PC_REWARDS.FIRST_TIME_CORRECT;userProgress.xp=(userProgress.xp||0)+reward}currentLesson.report.push({question:q,userAnswer,isCorrect});saveProgress();updatePCVisuals();showFeedback(isCorrect)}
    function showFeedback(isCorrect){if(soundEnabled&&isAudioUnlocked){const soundToPlay=isCorrect?sounds.correct:sounds.incorrect;soundToPlay.currentTime=0;soundToPlay.play().catch(error=>console.error("Audio playback error:",error))}const q=currentLesson.questions[currentLesson.currentIndex];let formattedAnswer=q.answer;if(q.type==="true_false"){formattedAnswer=String(q.answer).toLowerCase()==="true"?"Vero":"Falso"}const feedbackTitle=isCorrect?"Corretto!":"Sbagliato!";const feedbackText=`<p style="font-size: 1.1rem;"><strong>La risposta corretta è: ${formattedAnswer}</strong></p><hr style="margin: 1rem 0;"><p>${q.explanation}</p>`;showModal(feedbackTitle,feedbackText,feedbackModal,!0);const footer=app.querySelector(".lesson-footer");if(footer){footer.innerHTML=`<button id="next-question-btn" data-action="next-question" style="width: 100%;">Avanti</button>`;footer.querySelector("#next-question-btn").style.backgroundColor=isCorrect?"var(--green-correct)":"var(--red-incorrect)"}}

    // --- 8. UTILITY & WRAP-UP FUNCTIONS ---
    function nextQuestion() {
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            if (currentLesson.mode === 'genesis') {
                const areaScores = {};
                currentLesson.report.forEach(item => { const area = item.question.macro_area; if (!areaScores[area]) areaScores[area] = { correct: 0, total: 0 }; if (item.isCorrect) areaScores[area].correct++; areaScores[area].total++; });
                for (const area in areaScores) { const accuracy = areaScores[area].correct / areaScores[area].total; if (accuracy > 0.8) userProgress.skillLevels[area] = 2; else if (accuracy > 0.5) userProgress.skillLevels[area] = 1; else userProgress.skillLevels[area] = 0; }
                userProgress.genesisQuizCompleted = true;
            }
            saveProgress(); checkAchievements(); renderReport();
            if (currentLesson.mode === 'genesis') {
                const reportContainer = app.querySelector('.report-summary-card');
                if (reportContainer) reportContainer.innerHTML += '<p>Ottimo lavoro! Il tuo percorso è stato calibrato. Clicca continua per iniziare la tua prima sessione adattiva.</p>';
                app.querySelector('[data-action="back-to-dashboard"]').dataset.action = 'go-to-learn';
            }
        }
    }

    function updateQuestionStrength(qId,isCorrect){const stats=userProgress.questionStats[qId]||{strength:0,correct:0,incorrect:0};userProgress.questionStats[qId]=stats;if(isCorrect){stats.correct=(stats.correct||0)+1}else{stats.incorrect=(stats.incorrect||0)+1}const today=new Date;const todayStr=(new Date(today.getFullYear(),today.getMonth(),today.getDate())).toISOString().split("T")[0];const oldStrength=stats.strength||0;if(isCorrect){stats.strength=Math.min(oldStrength+1,STRENGTH_INTERVALS.length-1);if(stats.strength>=MASTERY_LEVEL&&oldStrength<MASTERY_LEVEL)userProgress.masteryHistory[todayStr]=(userProgress.masteryHistory[todayStr]||0)+1}else stats.strength=Math.max(oldStrength-2,0);const intervalDays=STRENGTH_INTERVALS[stats.strength];today.setDate(today.getDate()+intervalDays);stats.nextReview=today.toISOString().split("T")[0];stats.lastReviewed=todayStr}
    function renderReport(){const accuracy=currentLesson.questions.length>0?currentLesson.correctAnswers/currentLesson.questions.length:0;let scientistAdvice=accuracy<.5?`<i class="fa-solid fa-lightbulb-exclamation"></i> Hai riscontrato delle difficoltà. Una sessione di Ripasso potrebbe solidificare le basi.`:`<i class="fa-solid fa-person-digging"></i> Buon lavoro! La costanza è la chiave per padroneggiare ogni concetto.`;let reportHtml=`<h2><i class="fa-solid fa-scroll"></i> Debriefing di Sessione</h2><div class="report-summary-card">${scientistAdvice}</div>`;currentLesson.report.forEach(item=>{reportHtml+=`<div class="test-report-item ${item.isCorrect?"correct":"incorrect"}"><p class="report-q-text">${item.question.question}</p><p class="report-user-answer">La tua risposta: <strong>${item.userAnswer||"Nessuna"}</strong></p><div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div></div>`});reportHtml+=`<button class="daily-review-btn" data-action="back-to-dashboard">Continua</button>`;app.innerHTML=reportHtml}
    function checkAchievements(){const masteredCount=Object.values(userProgress.questionStats).filter(s=>s.strength>=MASTERY_LEVEL).length;const skills=[...new Set(allQuestions.map(q=>q.macro_area))];const conditions={FIRST_LESSON:()=>Object.keys(userProgress.questionStats).length>5,XP_1000:()=>userProgress.xp>=1e3,FIRST_MASTERY:()=>masteredCount>0,MASTER_50:()=>masteredCount>=50,PERFECT_LESSON:()=>currentLesson.correctAnswers===currentLesson.questions.length&&currentLesson.questions.length>0,STREAK_7:()=>userProgress.studyStreak.current>=7,MASTER_ALL:()=>skills.every(s=>(userProgress.skillLevels[s]||0)===5)};Object.entries(conditions).forEach(([id,condition])=>{if(!userProgress.achievements.includes(id)&&condition()){userProgress.achievements.push(id);showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[id].title}`)}});skills.forEach(skill=>{const skillId=`MASTER_${skill.toUpperCase().replace(/\s*&\s*| e /g,"_").replace(/\s/g,"_")}`;if(ACHIEVEMENTS[skillId]&&!userProgress.achievements.includes(skillId)&&(userProgress.skillLevels[skill]||0)===5){userProgress.achievements.push(skillId);showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[skillId].title}`)}});saveProgress()}
    function generateSocraticHint(explanation,answer){let hintText=explanation;const keywords=String(answer).split(/[\s->]+/).filter(word=>word.length>2);if(keywords.length===0)return null;keywords.forEach(key=>{const regex=new RegExp(`\\b${key}\\b`,"gi");hintText=hintText.replace(regex,"_______")});return hintText!==explanation?hintText:null}
    function showToast(message){toast.textContent=message;toast.classList.add("show");setTimeout(()=>{toast.classList.remove("show")},3500)}
    function showQuestionDetailModal(q){/* Unchanged */}
    function toggleSound(){soundEnabled=!soundEnabled;localStorage.setItem("vessiamociSoundEnabled",soundEnabled);updateSoundIcon()}
    function updateSoundIcon(){const soundIcon=document.getElementById("sound-toggle-btn")?.querySelector("i");if(soundIcon)soundIcon.className=`fa-solid ${soundEnabled?"fa-volume-high":"fa-volume-xmark"}`}
    function openImageModal(src){/* Unchanged */}
    function handleSearch(event){/* Unchanged */}
    function showModal(title,text,modalElement,isLessonFeedback=!1){if(isLessonFeedback)currentLesson.isModalOpen=!0;const titleEl=modalElement.querySelector("h3");const contentEl=modalElement.querySelector('p, div[id$="-results"], div[id$="-content"]');if(title&&titleEl)titleEl.innerHTML=title;if(text&&contentEl)contentEl.innerHTML=text;modalElement.classList.remove("hidden")}
    function closeModal(modalElement){modalElement.classList.add("hidden");if(modalElement.id==='feedback-modal-container'&&currentLesson.isModalOpen){currentLesson.isModalOpen=!1;nextQuestion()}}
    
    main();
});
// PART 3 OF 3 END
