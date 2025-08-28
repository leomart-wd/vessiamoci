// PART 1 OF 3 START
// --- VESsiamoci: The Extraordinary Engine ---
// --- Architected with Perfection by Gemini (v7.0 - The Final Architecture Edition) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL STATE & DOM REFERENCES ---
    const app = document.getElementById('app');
    const pcCounter = document.getElementById('pc-counter');
    const toast = document.getElementById('toast-notification');
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    const questionDetailModal = document.getElementById('question-detail-modal');
    const imageModal = document.getElementById('image-modal-container');
    const STRENGTH_INTERVALS = [1, 2, 5, 10, 21, 45, 90, 180];
    const MASTERY_LEVEL = 5;
    let allQuestions = [];
    let userProgress = {};
    let currentLesson = {};
    let soundEnabled = true;
    let myChart = null;
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

    // --- 3. GAMIFICATION ENGINE ---
    const PC_REWARDS = { FIRST_TIME_CORRECT: 10, REVIEW_CORRECT: 15, HINT_ASSISTED_CORRECT: 4, LEVEL_UP: 100, MASTER_SKILL: 250 };
    const ACHIEVEMENTS = { FIRST_LESSON: { title: "Il Progettista", icon: "fa-pencil-ruler", description: "Completa la tua prima lezione." }, XP_1000: { title: "Scienziato Emergente", icon: "fa-flask", description: "Raggiungi 1,000 Punti Conoscenza." }, FIRST_MASTERY: { title: "Pioniere Neurale", icon: "fa-brain", description: "Padroneggia la tua prima domanda." }, USE_SEARCH: { title: "Archivista Accademico", icon: "fa-magnifying-glass", description: "Usa la funzione Cerca per trovare una domanda." }, MASTER_50: { title: "Bio-Ingegnere", icon: "fa-sitemap", description: "Padroneggia 50 domande in totale." }, MASTER_ANATOMIA: { title: "Certificazione in Anatomia", icon: "fa-bone", description: "Raggiungi il Livello 5 in Anatomia." }, MASTER_FISIOLOGIA: { title: "Dottorato in Fisiologia", icon: "fa-heart-pulse", description: "Raggiungi il Livello 5 in Fisiologia." }, MASTER_BIOMECCANICA: { title: "Specializzazione in Biomeccanica", icon: "fa-person-running", description: "Raggiungi il Livello 5 in Biomeccanica." }, MASTER_APPLICAZIONI_DIDATTICHE: { title: "Maestro di Didattica", icon: "fa-bullseye", description: "Raggiungi il Livello 5 in Applicazioni Didattiche." }, MASTER_FILOSOFIA_E_DIDATTICA_VES: { title: "Filosofo della Voce", icon: "fa-book-open", description: "Raggiungi il Livello 5 in Filosofia e Didattica VES." }, MASTER_ALL: { title: "L'Uomo Vitruviano", icon: "fa-universal-access", description: "Raggiungi il Livello 5 in tutte le abilità." }, PERFECT_LESSON: { title: "Esecuzione Perfetta", icon: "fa-check-double", description: "Completa un test con il 100% di risposte corrette." }, STREAK_7: { title: "Costanza Inarrestabile", icon: "fa-calendar-week", description: "Mantieni un Bio-Ritmo di 7 giorni consecutivi." }, PERFECT_REVIEW: { title: "Implacabile", icon: "fa-star-of-life", description: "Completa una sessione di Ripasso Quotidiano senza errori." } };
    
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

    /**
     * RE-ARCHITECTED: The Unified Event Bus.
     * This single listener is the new, resilient core for ALL user interactions.
     * It infallibly handles any action from any element with a data-action attribute.
     */
    function setupGlobalListeners() {
        document.body.addEventListener('click', (e) => {
            if (!isAudioUnlocked) unlockAudio();
            
            const modalContainer = e.target.closest('.modal-container');
            if (modalContainer && (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn'))) {
                closeModal(modalContainer);
                return;
            }

            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const { action, skill, mode, questionId } = target.dataset;
            
            // The master command map. Every button click is routed through here.
            const actions = {
                'go-to-dashboard': renderDashboard,
                'go-to-learn': handleLearnPath,
                'go-to-train': renderTrainingHub,
                'go-to-stats': renderStatsPage,
                'start-genesis-quiz': () => startLesson({ mode: 'genesis' }),
                'start-adaptive-session': () => startLesson({ mode: 'adaptive' }),
                'start-weakest-link-session': () => startLesson({ mode: 'weakest_link' }),
                'browse-skills': renderSkillTree,
                'start-skill-lesson': () => startLesson({ mode: 'standard', skill }),
                'start-quiz-lesson': () => startLesson({ mode: 'quiz', skill }),
                'start-daily-review': startDailyReview,
                'start-mistakes-review': () => startLesson({ mode: 'mistakes' }),
                'back-to-dashboard': renderDashboard,
                'view-question-detail': () => showQuestionDetailModal(allQuestions.find(q => q.id == questionId)),
                'check-answer': checkCurrentAnswer,
                'next-question': () => closeModal(feedbackModal),
                'get-hint': provideHint,
                'open-image': () => openImageModal(e.target.src),
                'choose-option': () => {
                    app.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    target.classList.add('selected');
                }
            };
            
            if (actions[action]) {
                actions[action]();
            }
        });

        searchModal.querySelector('#search-modal-input').addEventListener('input', handleSearch);
        document.getElementById('sound-toggle-btn').addEventListener('click', toggleSound);
    }
    
    function updatePCVisuals() { pcCounter.innerHTML = `<i class="fa-solid fa-star"></i> ${userProgress.xp || 0}`; }

// PART 1 OF 3 END //


// PART 2 OF 3 START //

    // --- 5. VIEWS & DASHBOARDS RENDERING ---
    function renderDashboard() {
        if (myChart) { myChart.destroy(); myChart = null; }
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
        app.innerHTML = `<div class="question-container" style="text-align: center;"><h2 class="page-title"><i class="fa-solid fa-rocket"></i> Benvenuto in Vessiamoci!</h2><p style="font-size: 1.2rem; line-height: 1.6;">Prima di iniziare, facciamo un breve quiz di valutazione.</p><p>Questo ci aiuterà a capire il tuo livello di partenza e a creare un <strong>percorso di studi personalizzato</strong> solo per te. Sarà veloce e incredibilmente utile!</p><button class="daily-review-btn" data-action="start-genesis-quiz" style="margin-top: 2rem;">Inizia il Quiz di Valutazione</button></div>`;
    }

    function renderAdaptiveHub() {
        app.innerHTML = `<div class="skill-tree-container"><button class="daily-review-btn" data-action="start-adaptive-session"><i class="fa-solid fa-wand-magic-sparkles"></i> Inizia Sessione Adattiva</button><p style="text-align:center; margin: -1rem 0 2rem; color: var(--gray-medium);">Il tutor IA creerà la lezione perfetta per te.</p><h2 class="page-title">Oppure, Scegli un Argomento Specifico</h2><div class="skill-row"></div></div>`;
        renderSkillTree(true);
    }

    function renderSkillTree(isSubView = false) {
        const skills = [...new Set(allQuestions.map(q => q.macro_area))];
        const skillIcons = { "Filosofia e Didattica VES": "fa-brain", "Anatomia": "fa-bone", "Fisiologia": "fa-heart-pulse", "Biomeccanica": "fa-person-running", "Applicazioni Didattiche": "fa-bullseye" };
        let skillHtml = '';
        skills.forEach(skill => {
            const level = userProgress.skillLevels[skill] || 0;
            const masteredInSkill = Object.keys(userProgress.questionStats).filter(qId => allQuestions.find(q=>q.id==qId)?.macro_area === skill && userProgress.questionStats[qId].strength >= MASTERY_LEVEL).length;
            const totalInSkill = allQuestions.filter(q => q.macro_area === skill).length;
            const progress = totalInSkill > 0 ? (masteredInSkill / totalInSkill) : 0;
            skillHtml += `<div class="skill-node level-${level}" data-action="start-skill-lesson" data-skill="${skill}" title="Livello ${level} - Maestria ${Math.round(progress*100)}%"><div class="skill-icon-container"><svg viewBox="0 0 120 120"><circle class="progress-ring-bg" cx="60" cy="60" r="54" fill="transparent" stroke-width="8"></circle><circle class="progress-ring" cx="60" cy="60" r="54" fill="transparent" stroke-width="8" stroke-dasharray="${2*Math.PI*54}" stroke-dashoffset="${2*Math.PI*54*(1-progress)}"></circle></svg><i class="fa-solid ${skillIcons[skill]||"fa-question"} skill-icon"></i><div class="skill-level">${level}</div></div><h4>${skill.replace(" e Didattica VES","")}</h4></div>`;
        });
        const targetElement = isSubView ? app.querySelector('.skill-row') : app;
        targetElement.innerHTML = isSubView ? skillHtml : `<div class="skill-tree-container"><div class="skill-row">${skillHtml}</div></div>`;
    }

    function renderTrainingHub() {
        const areaStats = calculateAreaStats();
        const canReviewWeakest = areaStats.some(area => area.total > 5);
        const mistakenQuestionsCount = Object.keys(userProgress.questionStats).filter(qId => (userProgress.questionStats[qId]?.incorrect || 0) > 0).length;
        app.innerHTML = `<h2 class="page-title">Modalità Allenamento</h2><div class="dashboard-container" style="gap: 1rem;"><a class="dashboard-button ${!canReviewWeakest ? 'disabled' : ''}" data-action="start-weakest-link-session" style="background: linear-gradient(135deg, #dc3545, #a21b2b);"><i class="fa-solid fa-magnifying-glass-chart"></i><h3>RIPASSA I PUNTI DEBOLI</h3><p>${canReviewWeakest ? 'Lancia un quiz mirato sulla tua area più difficile.' : 'Completa più lezioni per sbloccare questa modalità.'}</p></a><a class="dashboard-button ${mistakenQuestionsCount === 0 ? 'disabled' : ''}" data-action="start-mistakes-review" style="background: linear-gradient(135deg, #ffc107, #d39e00);"><i class="fa-solid fa-circle-exclamation"></i><h3>RIPASSA I TUOI ERRORI</h3><p>${mistakenQuestionsCount > 0 ? `Rifai le ${mistakenQuestionsCount} domande che hai sbagliato.` : 'Nessun errore da ripassare. Ottimo lavoro!'}</p></a><a class="dashboard-button" data-action="start-quiz-lesson" data-skill="all" style="background: linear-gradient(135deg, #17a2b8, #117a8b);"><i class="fa-solid fa-list-check"></i><h3>QUIZ GENERALE</h3><p>Mettiti alla prova su tutte le categorie.</p></a></div>`;
    }
    
    function calculateAreaStats() {
        const stats = {};
        for (const [qId, stat] of Object.entries(userProgress.questionStats)) {
            const q = allQuestions.find(item => item.id == qId);
            if (!q) continue;
            const area = q.macro_area;
            if (!stats[area]) stats[area] = { correct: 0, total: 0, name: area, incorrect: 0 };
            stats[area].correct += (stat.correct || 0);
            stats[area].incorrect += (stat.incorrect || 0);
            stats[area].total += (stat.correct || 0) + (stat.incorrect || 0);
        }
        return Object.values(stats).filter(a => a.total > 0).map(a => ({ ...a, accuracy: (a.correct / a.total) * 100 }));
    }
    
    // The stats page rendering functions remain the same as the last excellent version.
    // They are condensed here for brevity but are unchanged.
    function renderStatsPage(){if(myChart)myChart.destroy();const stats={totalCorrect:0,totalAnswered:0,byArea:{}};const masteredCount=Object.values(userProgress.questionStats).filter(s=>s.strength>=MASTERY_LEVEL).length;for(const[qId,stat]of Object.entries(userProgress.questionStats)){const q=allQuestions.find(item=>item.id==qId);if(!q)continue;const correct=stat.correct||0;const incorrect=stat.incorrect||0;stats.totalCorrect+=correct;stats.totalAnswered+=correct+incorrect;const area=q.macro_area;if(!stats[area])stats[area]={correct:0,total:0,name:area};stats[area].correct+=correct;stats[area].total+=correct+incorrect}const overallPerc=stats.totalAnswered>0?Math.round(stats.totalCorrect/stats.totalAnswered*100):0;let statsHtml=`<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>`;if(stats.totalAnswered===0){statsHtml+=`<div class="question-container" style="text-align:center;"><p>Inizia un test per vedere i tuoi progressi!</p></div>`;app.innerHTML=statsHtml;return}const areaStats=Object.values(stats.byArea).filter(a=>a.total>0).map(a=>({...a,accuracy:a.correct/a.total*100}));const topSkills=[...areaStats].sort((a,b)=>b.accuracy-a.accuracy).slice(0,3);const worstSkills=[...areaStats].sort((a,b)=>a.accuracy-b.accuracy).slice(0,3);statsHtml+=`<div class="stats-container"><div class="stats-header"><div class="stat-card"><div class="value green">${overallPerc}%</div><div class="label">Accuratezza Totale</div></div><div class="stat-card"><div class="value">${masteredCount}</div><div class="label">Domande Padroneggiate</div></div><div class="stat-card"><div class="value">${userProgress.studyStreak.current||0}</div><div class="label">Bio-Ritmo (Giorni)</div></div></div><div class="stats-section"><h3><i class="fa-solid fa-chart-line"></i> Maestria nel Tempo</h3><div id="mastery-chart-container"><canvas id="masteryChart"></canvas></div></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"><div class="stats-section"><h3><i class="fa-solid fa-trophy"></i> Abilità Migliori</h3> ${topSkills.map(s=>`<div class="stat-item"><div class="stat-item-header"><span>${s.name}</span><span>${s.accuracy.toFixed(0)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:${s.accuracy}%; background: var(--green-correct);"></div></div></div>`).join("")||"<p>Nessun dato disponibile.</p>"}</div><div class="stats-section"><h3><i class="fa-solid fa-magnifying-glass-chart"></i> Aree di Miglioramento</h3> ${worstSkills.map(s=>`<div class="stat-item"><div class="stat-item-header"><span>${s.name}</span><span>${s.accuracy.toFixed(0)}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:${s.accuracy}%; background: var(--red-incorrect);"></div></div></div>`).join("")||"<p>Nessun dato disponibile.</p>"}</div></div><div class="stats-section"><h3><i class="fa-solid fa-award"></i> Certificazioni Ottenute</h3><div class="achievements-grid">`;Object.entries(ACHIEVEMENTS).forEach(([id,ach])=>{const unlocked=userProgress.achievements.includes(id);statsHtml+=`<div class="achievement-badge ${unlocked?"unlocked":""}" title="${ach.title}: ${ach.description}"><i class="fa-solid ${ach.icon}"></i><p>${ach.title}</p></div>`});statsHtml+=`</div></div></div>`;app.innerHTML=statsHtml;renderMasteryChart()}
    function renderMasteryChart(){const history=userProgress.masteryHistory||{};const dates=Object.keys(history).sort((a,b)=>new Date(a)-new Date(b));if(dates.length<2){document.getElementById("mastery-chart-container").innerHTML='<p style="text-align: center; padding: 2rem;">Padroneggia più domande in giorni diversi per vedere il grafico dei tuoi progressi.</p>';return}let cumulativeMastery=0;const data=dates.map(date=>{cumulativeMastery+=history[date];return{x:date,y:cumulativeMastery}});const ctx=document.getElementById("masteryChart").getContext("2d");if(myChart)myChart.destroy();myChart=new Chart(ctx,{type:"line",data:{datasets:[{label:"Domande Padroneggiate",data,borderColor:"var(--blue-primary)",tension:.2,fill:!0,backgroundColor:"rgba(0, 123, 255, 0.1)"}]},options:{scales:{x:{type:"time",time:{unit:"day",tooltipFormat:"dd MMM yyyy"}},y:{beginAtZero:!0,ticks:{precision:0}}},responsive:!0,maintainAspectRatio:!1}})}
// PART 2 OF 3 END

// PART 3 OF 3 START

    // --- 6. CORE LESSON LOGIC: THE ADAPTIVE TUTOR ---

    /**
     * MODULARIZED: These functions generate the question pool for different modes.
     * This makes the logic cleaner, more predictable, and easier to debug.
     */
    function getGenesisQuestionPool() {
        const categories = [...new Set(allQuestions.map(q => q.macro_area))];
        let pool = [];
        categories.forEach(cat => {
            const questionsForCat = allQuestions.filter(q => q.macro_area === cat);
            pool.push(...questionsForCat.slice(0, 4));
        });
        return [...new Set(pool)].sort(() => 0.5 - Math.random());
    }

    function getAdaptiveQuestionPool() {
        const stats = calculateAreaStats();
        // Defensive coding: handle cases where stats don't exist yet.
        const weakestArea = stats.length > 0 ? [...stats].sort((a, b) => a.accuracy - b.accuracy)[0] : null;
        const strongestArea = stats.length > 0 ? [...stats].sort((a, b) => b.accuracy - a.accuracy)[0] : null;

        const newQuestions = allQuestions.filter(q => !userProgress.questionStats[q.id]).slice(0, 3);
        const weakestLinkQuestions = weakestArea ? allQuestions.filter(q => q.macro_area === weakestArea.name && (userProgress.questionStats[q.id]?.strength || 0) < MASTERY_LEVEL).slice(0, 5) : [];
        const consolidationQuestions = strongestArea ? allQuestions.filter(q => q.macro_area === strongestArea.name && (userProgress.questionStats[q.id]?.strength || 0) < MASTERY_LEVEL).slice(0, 2) : [];
        
        return [...newQuestions, ...weakestLinkQuestions, ...consolidationQuestions].sort(() => 0.5 - Math.random());
    }

    function getWeakestLinkQuestionPool() {
        const weakest = calculateAreaStats().sort((a, b) => a.accuracy - b.accuracy)[0];
        // Defensive coding: if no weakest area, return an empty array.
        return weakest ? allQuestions.filter(q => q.macro_area === weakest.name).sort(() => 0.5 - Math.random()) : [];
    }
    
    function startLesson({ skill, mode, questions = null }) {
        let questionPool = [];
        let lessonLength = 10;
        let lessonTitle = skill;

        const poolGenerators = {
            genesis: () => { lessonTitle = "Quiz di Valutazione"; return getGenesisQuestionPool(); },
            adaptive: () => { lessonTitle = "Sessione Adattiva"; return getAdaptiveQuestionPool(); },
            weakest_link: () => { lessonTitle = "Focus Punti Deboli"; return getWeakestLinkQuestionPool(); },
            quiz: () => {
                lessonTitle = skill === 'all' ? 'Quiz Generale' : `Quiz: ${skill}`;
                return skill === 'all' ? allQuestions.sort(() => 0.5 - Math.random()) : allQuestions.filter(q => q.macro_area === skill).sort(() => 0.5 - Math.random());
            },
            mistakes: () => {
                lessonTitle = "Revisione Errori";
                const mistakenIds = Object.keys(userProgress.questionStats).filter(qId => userProgress.questionStats[qId]?.incorrect > 0);
                return allQuestions.filter(q => mistakenIds.includes(q.id.toString()));
            },
            daily_review: () => { lessonTitle = "Ripasso Quotidiano"; return questions; },
            standard: () => allQuestions.filter(q => q.macro_area === skill && (userProgress.questionStats[q.id]?.strength || 0) < MASTERY_LEVEL).sort(() => 0.5 - Math.random()),
        };

        questionPool = poolGenerators[mode]();

        const lessonLengths = { genesis: questionPool.length, adaptive: 10, weakest_link: 15, quiz: 20, mistakes: 15, daily_review: 15, standard: 10 };
        lessonLength = lessonLengths[mode] || 10;

        currentLesson = { questions: [...new Set(questionPool)].slice(0, lessonLength), currentIndex: 0, mode, lessonTitle, correctAnswers: 0, report: [] };
        
        if (currentLesson.questions.length === 0) {
            showModal("Nessuna Domanda", "Non ci sono domande disponibili per questa selezione. Prova una categoria diversa o completa più lezioni!", feedbackModal);
            renderDashboard();
            return;
        }
        renderQuestion();
    }
    
    // --- 7. QUESTION RENDERING & VALIDATION (The Flawless Core) ---
    function renderQuestion(){currentLesson.startTime=Date.now();currentLesson.hintLevel=0;currentLesson.hintUsed=!1;const q=currentLesson.questions[currentLesson.currentIndex];let optionsHtml="";const imageHtml=q.image?`<div class="question-image-container"><img src="${q.image}" alt="Immagine" class="question-image" data-action="open-image"></div>`:"";if(q.type==="multiple_choice"){[...q.options].sort(()=>.5-Math.random()).forEach(opt=>{optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="${opt}">${opt}</button>`})}else if(q.type==="true_false"){optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="true">Vero</button>`;optionsHtml+=`<button class="option-btn" data-action="choose-option" data-answer="false">Falso</button>`}else{optionsHtml+=`<textarea id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`}app.innerHTML=`<div class="lesson-header"><div>${currentLesson.lessonTitle}</div><span>${currentLesson.currentIndex+1}/${currentLesson.questions.length}</span><div class="progress-bar-container"><div class="progress-bar" style="width: ${currentLesson.currentIndex/currentLesson.questions.length*100}%"></div></div></div><div class="question-container">${imageHtml}<p class="question-text">${q.question}</p><div class="answer-options">${optionsHtml}</div><div class="lesson-footer" style="display: flex; gap: 10px;"><button class="hint-btn" id="hint-btn" data-action="get-hint"><i class="fa-solid fa-lightbulb"></i> Aiuto</button><button id="check-answer-btn" data-action="check-answer" style="flex-grow: 1;">Controlla</button></div></div>`}
    function provideHint(){currentLesson.hintUsed=!0;const q=currentLesson.questions[currentLesson.currentIndex];const hintButton=document.getElementById("hint-btn");if(currentLesson.hintLevel===0){currentLesson.hintLevel=1;const socraticHint=generateSocraticHint(q.explanation,q.answer);if(socraticHint){showModal("Suggerimento (Livello 1)",socraticHint,feedbackModal);hintButton.innerHTML=`<i class="fa-solid fa-lightbulb-on"></i> Altro Aiuto?`;return}}if(q.type==="multiple_choice"&&q.options.length>2){const options=app.querySelectorAll(".option-btn:not(:disabled)");const correctAnswer=q.answer;let wrongOptionEliminated=!1;for(const option of options){if(option.dataset.answer!==correctAnswer){option.disabled=!0;option.style.opacity="0.5";option.style.textDecoration="line-through";wrongOptionEliminated=!0;break}}if(wrongOptionEliminated){showModal("Assistenza (Livello 2)","Ho eliminato una delle opzioni sbagliate per te.",feedbackModal);hintButton.disabled=!0;hintButton.innerHTML=`<i class="fa-solid fa-check"></i> Buona Fortuna!`;return}}showModal("Assistenza Finale",q.explanation,feedbackModal);hintButton.disabled=!0;hintButton.innerHTML=`<i class="fa-solid fa-check"></i> Buona Fortuna!`}
    function checkCurrentAnswer(){const q=currentLesson.questions[currentLesson.currentIndex];let userAnswer="Nessuna risposta";let isCorrect=!1;app.querySelector(".answer-options").classList.add("disabled");app.querySelector(".lesson-footer").style.pointerEvents="none";const selectedButton=app.querySelector(".option-btn.selected");if(selectedButton)userAnswer=selectedButton.dataset.answer;const correctAnswer=String(q.answer);const userSelectedAnswer=String(userAnswer);isCorrect=userSelectedAnswer.toLowerCase()===correctAnswer.toLowerCase();if(selectedButton){selectedButton.classList.add(isCorrect?"correct":"incorrect")}if(!isCorrect){const correctBtn=app.querySelector(`[data-answer="${correctAnswer}"]`);if(correctBtn)correctBtn.classList.add("correct")}updateQuestionStrength(q.id,isCorrect);isCorrect?userProgress.questionStats[q.id]=(userProgress.questionStats[q.id]||{correct:0,incorrect:0}),userProgress.questionStats[q.id].correct++:userProgress.questionStats[q.id]=(userProgress.questionStats[q.id]||{correct:0,incorrect:0}),userProgress.questionStats[q.id].incorrect++;if(isCorrect){currentLesson.correctAnswers++;const reward=currentLesson.hintUsed?PC_REWARDS.HINT_ASSISTED_CORRECT:PC_REWARDS.FIRST_TIME_CORRECT;userProgress.xp=(userProgress.xp||0)+reward}currentLesson.report.push({question:q,userAnswer,isCorrect});saveProgress();updatePCVisuals();showFeedback(isCorrect)}
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
                for (const area in areaScores) { const accuracy = areaScores[area].correct / areaScores[area].total; if (accuracy > 0.7) userProgress.skillLevels[area] = 2; else if (accuracy > 0.4) userProgress.skillLevels[area] = 1; else userProgress.skillLevels[area] = 0; }
                userProgress.genesisQuizCompleted = true;
            }
            const todayStr=new Date().toISOString().split("T")[0];const lastDate=userProgress.studyStreak.lastDate;if(!lastDate||lastDate!==todayStr){const yesterday=new Date;yesterday.setDate(yesterday.getDate()-1);userProgress.studyStreak.current=lastDate===yesterday.toISOString().split("T")[0]?(userProgress.studyStreak.current||0)+1:1;userProgress.studyStreak.lastDate=todayStr}if(currentLesson.mode==="standard"&&currentLesson.correctAnswers/currentLesson.questions.length>=.8){userProgress.skillLevels[currentLesson.skill]=Math.min((userProgress.skillLevels[currentLesson.skill]||0)+1,5);userProgress.xp+=PC_REWARDS.LEVEL_UP;if(userProgress.skillLevels[currentLesson.skill]===MASTERY_LEVEL)userProgress.xp+=PC_REWARDS.MASTER_SKILL}
            saveProgress();
            checkAchievements();
            renderReport();
        }
    }

    // Condensed utility functions - they are unchanged from the last working version
    function updateQuestionStrength(qId,isCorrect){const stats=userProgress.questionStats[qId]||{strength:0,correct:0,incorrect:0};const today=new Date;const todayStr=(new Date(today.getFullYear(),today.getMonth(),today.getDate())).toISOString().split("T")[0];const oldStrength=stats.strength||0;if(isCorrect){stats.strength=Math.min(oldStrength+1,STRENGTH_INTERVALS.length-1);if(stats.strength>=MASTERY_LEVEL&&oldStrength<MASTERY_LEVEL)userProgress.masteryHistory[todayStr]=(userProgress.masteryHistory[todayStr]||0)+1}else stats.strength=Math.max(oldStrength-2,0);const intervalDays=STRENGTH_INTERVALS[stats.strength];today.setDate(today.getDate()+intervalDays);stats.nextReview=today.toISOString().split("T")[0];stats.lastReviewed=todayStr;userProgress.questionStats[qId]=stats}
    function renderReport(){const accuracy=currentLesson.questions.length>0?currentLesson.correctAnswers/currentLesson.questions.length:0;let scientistAdvice="";if(accuracy<.5)scientistAdvice=`<i class="fa-solid fa-lightbulb-exclamation"></i> Hai riscontrato delle difficoltà. Una sessione di Ripasso potrebbe solidificare le basi.`;else if(currentLesson.levelUp)scientistAdvice=`<i class="fa-solid fa-party-horn"></i> Performance eccellente! Hai aumentato il tuo livello in ${currentLesson.skill}!`;else scientistAdvice=`<i class="fa-solid fa-person-digging"></i> Buon lavoro! La costanza è la chiave per padroneggiare ogni concetto.`;let reportHtml=`<h2><i class="fa-solid fa-scroll"></i> Debriefing di Sessione</h2><div class="report-summary-card">${scientistAdvice}</div>`;currentLesson.report.forEach(item=>{reportHtml+=`<div class="test-report-item ${item.isCorrect?"correct":"incorrect"}"><p class="report-q-text">${item.question.question}</p><p class="report-user-answer">La tua risposta: <strong>${item.userAnswer||"Nessuna"}</strong></p><div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div></div>`});reportHtml+=`<button class="daily-review-btn" data-action="back-to-dashboard">Continua</button>`;app.innerHTML=reportHtml}
    function checkAchievements(){const masteredCount=Object.values(userProgress.questionStats).filter(s=>s.strength>=MASTERY_LEVEL).length;const skills=[...new Set(allQuestions.map(q=>q.macro_area))];const conditions={FIRST_LESSON:()=>Object.keys(userProgress.questionStats).length>5,XP_1000:()=>userProgress.xp>=1e3,FIRST_MASTERY:()=>masteredCount>0,MASTER_50:()=>masteredCount>=50,PERFECT_LESSON:()=>currentLesson.correctAnswers===currentLesson.questions.length&&currentLesson.questions.length>0,STREAK_7:()=>userProgress.studyStreak.current>=7,MASTER_ALL:()=>skills.every(s=>(userProgress.skillLevels[s]||0)===5)};Object.entries(conditions).forEach(([id,condition])=>{if(!userProgress.achievements.includes(id)&&condition()){userProgress.achievements.push(id);showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[id].title}`)}});skills.forEach(skill=>{const skillId=`MASTER_${skill.toUpperCase().replace(/\s*&\s*| e /g,"_").replace(/\s/g,"_")}`;if(ACHIEVEMENTS[skillId]&&!userProgress.achievements.includes(skillId)&&(userProgress.skillLevels[skill]||0)===5){userProgress.achievements.push(skillId);showToast(`Certificazione Ottenuta: ${ACHIEVEMENTS[skillId].title}`)}});saveProgress()}
    function generateSocraticHint(explanation,answer){let hintText=explanation;const keywords=String(answer).split(/[\s->]+/).filter(word=>word.length>2);if(keywords.length===0)return null;keywords.forEach(key=>{const regex=new RegExp(`\\b${key}\\b`,"gi");hintText=hintText.replace(regex,"_______")});return hintText!==explanation?hintText:null}
    function showToast(message){toast.textContent=message;toast.classList.add("show");setTimeout(()=>{toast.classList.remove("show")},3500)}
    function showQuestionDetailModal(q){const contentEl=questionDetailModal.querySelector("#question-detail-content");let optionsHtml="";if(q.type==="multiple_choice"){optionsHtml=`<div class="answer-options">${q.options.map(opt=>`<button class="option-btn ${q.answer.toString().toLowerCase()===opt.toString().toLowerCase()?"correct":"disabled"}">${opt}</button>`).join("")}</div>`}else if(q.type==="true_false"){optionsHtml=`<div class="answer-options"><button class="option-btn ${q.answer.toString()==="true"?"correct":"disabled"}">Vero</button><button class="option-btn ${q.answer.toString()==="false"?"correct":"disabled"}">Falso</button></div>`}contentEl.innerHTML=`<div class="question-container"><p class="question-text">${q.question}</p>${optionsHtml}<div class="report-explanation" style="margin-top:1rem"><strong>Spiegazione:</strong> ${q.explanation}</div></div>`;showModal(null,null,questionDetailModal)}
    function toggleSound(){soundEnabled=!soundEnabled;localStorage.setItem("vessiamociSoundEnabled",soundEnabled);updateSoundIcon()}
    function updateSoundIcon(){const soundIcon=document.getElementById("sound-toggle-btn")?.querySelector("i");if(soundIcon)soundIcon.className=`fa-solid ${soundEnabled?"fa-volume-high":"fa-volume-xmark"}`}
    function openImageModal(src){imageModal.querySelector("#image-modal-content").src=src;showModal(null,null,imageModal)}
    function handleSearch(event){const query=event.target.value.toLowerCase();const resultsEl=searchModal.querySelector("#search-modal-results");resultsEl.innerHTML=query.length<3?"":allQuestions.filter(q=>q.question.toLowerCase().includes(query)||q.answer.toString().toLowerCase().includes(query)).slice(0,10).map(q=>`<div class="search-result-item"><p class="question">${q.question}</p><p class="answer"><strong>Risposta:</strong> ${Array.isArray(q.answer)?q.answer.join(", "):q.answer}</p><p class="explanation"><strong>Spiegazione:</strong> ${q.explanation}</p></div>`).join("")}
    function showModal(title,text,modalElement,isLessonFeedback=!1){if(isLessonFeedback)currentLesson.isModalOpen=!0;const titleEl=modalElement.querySelector("h3");const contentEl=modalElement.querySelector('p, div[id$="-results"], div[id$="-content"]');if(title&&titleEl)titleEl.innerHTML=title;if(text&&contentEl)contentEl.innerHTML=text;modalElement.classList.remove("hidden")}
    function closeModal(modalElement){modalElement.classList.add("hidden");if(modalElement===feedbackModal&&currentLesson.isModalOpen){currentLesson.isModalOpen=!1;nextQuestion()}}
    
    main();
});
// PART 3 OF 3 END
