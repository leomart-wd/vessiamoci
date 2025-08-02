// PART 1 OF 3 START

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI E COSTANTI ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const statsBtn = document.getElementById('stats-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    const questionDetailModal = document.getElementById('question-detail-modal');

    const STRENGTH_INTERVALS = [1, 2, 5, 10, 21, 45, 90, 180]; // Giorni per il ripasso
    const MASTERY_LEVEL = 5; // Livello di forza per considerare una domanda "padroneggiata"

    let allQuestions = [];
    let userProgress = {};
    let currentLesson = { timerId: null, isModalOpen: false };
    let soundEnabled = true;
    let myChart = null; // Riferimento al grafico per poterlo distruggere e ricreare

    // --- AUDIO ---
    const correctSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2c84121855.mp3');
    const incorrectSound = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c3ff08ed0f.mp3');

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
            app.innerHTML = `<p>Errore critico: impossibile caricare le domande. Controlla il file 'data/questions.json' per errori di sintassi.</p>`;
        }
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        const defaultProgress = { 
            questionStats: {}, 
            skillLevels: {}, 
            masteryHistory: {}, 
            studyStreak: { current: 0, lastDate: null } 
        };
        userProgress = savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : defaultProgress;
        
        const savedSound = localStorage.getItem('vessiamociSoundEnabled');
        soundEnabled = savedSound !== null ? JSON.parse(savedSound) : true;
        updateSoundIcon();
    }

    function saveProgress() {
        localStorage.setItem('vessiamociUserProgress', JSON.stringify(userProgress));
    }

    function setupGlobalListeners() {
        homeTitle.addEventListener('click', renderSkillTreeDashboard);
        document.getElementById('global-home-btn').addEventListener('click', renderSkillTreeDashboard);
        statsBtn.addEventListener('click', renderStatsPage);
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

    // --- VISTE PRINCIPALI ---
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
                <div class="skill-node level-${level}" data-skill="${skill}">
                    <div class="skill-icon-container">
                        <svg viewBox="0 0 120 120"><circle class="progress-ring-bg" cx="60" cy="60" r="54" fill="transparent" stroke-width="8"></circle>
                        <circle class="progress-ring" cx="60" cy="60" r="54" fill="transparent" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg>
                        <i class="fa-solid ${skillIcons[skill] || 'fa-question'} skill-icon"></i>
                        <div class="skill-level">${level}</div>
                    </div>
                    <h4>${skill}</h4>
                </div>`;
        });
        html += `</div></div>`;
        app.innerHTML = html;

        document.querySelectorAll('.skill-node').forEach(node => node.addEventListener('click', () => startLesson({ skill: node.dataset.skill, mode: 'standard' })));
        const reviewBtn = document.getElementById('daily-review-btn');
        if (reviewBtn && !reviewBtn.classList.contains('disabled')) reviewBtn.addEventListener('click', startDailyReview);
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
        
        // Calcolo Streak
        const today = new Date();
        const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
        const lastDate = userProgress.studyStreak?.lastDate;
        
        if (lastDate && lastDate !== todayStr) {
             const yesterday = new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() - 1)).toISOString().split('T')[0];
             if (lastDate !== yesterday) {
                 userProgress.studyStreak.current = 0; 
             }
        }

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
                    <div class="stat-card"><div class="value">${userProgress.studyStreak.current}<span class="unit"> giorni</span></div><div class="label">Serie di Studio</div></div>
                </div>
                <div class="stats-section"><h3>Maestria nel Tempo</h3><canvas id="masteryChart"></canvas></div>
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
        myChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ label: 'Domande Padroneggiate', data: data, borderColor: 'var(--blue-action)', tension: 0.1, fill: true, backgroundColor: 'rgba(28, 176, 246, 0.1)' }] },
            options: { scales: { x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

// PART 1 OF 3 END

// PART 2 OF 3 START

    // --- LOGICA DI GIOCO E LEZIONI ---
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
            timerId: null, correctAnswers: 0, skill: skill, report: []
        };
        
        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'Nessuna domanda disponibile per questa selezione.', feedbackModal, true);
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
        const stats = userProgress.questionStats[questionId] || { strength: 0 };
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
            stats.nextReview = '3000-01-01'; // Data lontana per carte padroneggiate
        }
        stats.lastReviewed = todayStr;
        userProgress.questionStats[questionId] = stats;
    }

    // --- LOGICA DI RENDER E INTERAZIONE DOMANDE ---
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
    
// PART 2 OF 3 END

// PART 3 OF 3 START

    function setupQuestionListeners() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        const questionType = q.type;
        const checkBtn = document.getElementById('check-answer-btn');

        if (currentLesson.mode === 'timed' && (questionType === 'multiple_choice' || questionType === 'true_false')) {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => {
                checkCurrentAnswer(e.currentTarget, e.currentTarget.dataset.answer);
            }));
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
                checkCurrentAnswer(null, null, true); // Timeout
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
            const questionType = q.type;
            if (immediateAnswer !== null) {
                userAnswer = immediateAnswer;
            } else if (questionType === 'open_ended') {
                userAnswer = document.getElementById('open-answer-input').value;
            } else {
                const selectedBtn = app.querySelector('.option-btn[style*="--blue-action"]');
                userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
            }
            
            if (userAnswer === null) { isCorrect = false; }
            else if (questionType === 'open_ended') {
                const userWords = (userAnswer.toLowerCase().match(/\b(\w+)\b/g) || []).filter(w => w.length > 2);
                const answerText = q.answer.toString().toLowerCase();
                const keywords = q.keywords || answerText.split(' ').filter(w => w.length > 3);
                if (keywords.length > 0) {
                     const matches = keywords.filter(k => userWords.includes(k)).length;
                     isCorrect = (matches / keywords.length) >= 0.6;
                } else {
                     isCorrect = userAnswer.toLowerCase() === answerText;
                }
            } else {
                isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }
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
        if (soundEnabled) { isCorrect ? correctSound.play() : incorrectSound.play(); }
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        const explanation = q.explanation;

        currentLesson.isModalOpen = true; // Flag per auto-next
        
        if (currentLesson.mode === 'timed') {
            if(!isCorrect) {
                 const correctBtn = app.querySelector(`[data-answer="${q.answer}"]`);
                 if(correctBtn) correctBtn.classList.add('correct');
            }
            // Usa il modal per un feedback non intrusivo e auto-chiudente
            showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal);
            setTimeout(() => {
                if (currentLesson.isModalOpen) closeModal(feedbackModal);
            }, 3000);
        } else {
             const checkBtn = document.getElementById('check-answer-btn');
             checkBtn.id = 'next-question-btn';
             checkBtn.textContent = 'Avanti';
             checkBtn.style.backgroundColor = isCorrect ? 'var(--green-correct)' : 'var(--red-incorrect)';
             checkBtn.addEventListener('click', () => closeModal(feedbackModal)); // Cliccando Avanti si chiude il modal e si va avanti
             showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal);
        }
    }

    function nextQuestion() {
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            // Aggiorna lo streak qui, solo se la lezione è finita
            const todayStr = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];
            const lastDate = userProgress.studyStreak?.lastDate;
            if (lastDate !== todayStr) {
                 const yesterday = new Date(new Date(todayStr).setDate(new Date(todayStr).getDate() - 1)).toISOString().split('T')[0];
                 if (lastDate === yesterday) userProgress.studyStreak.current = (userProgress.studyStreak.current || 0) + 1;
                 else userProgress.studyStreak.current = 1;
            } else if (!lastDate) {
                 userProgress.studyStreak.current = 1;
            }
            userProgress.studyStreak.lastDate = todayStr;
            
            // Aggiorna skill level se superato
            if ((currentLesson.mode === 'standard' || currentLesson.mode === 'daily_review') && currentLesson.correctAnswers / currentLesson.questions.length >= 0.8) {
                if(currentLesson.skill !== 'Ripasso') {
                     userProgress.skillLevels[currentLesson.skill] = Math.min((userProgress.skillLevels[currentLesson.skill] || 0) + 1, 5);
                }
            }
            saveProgress();
            renderReport();
        }
    }
    
    function renderReport() {
        let reportHtml = `<h2><i class="fa-solid fa-scroll"></i> Report Test</h2>
                          <h3>Hai risposto correttamente a ${currentLesson.correctAnswers} su ${currentLesson.questions.length} domande.</h3>`;

        if (currentLesson.mode === 'standard' && currentLesson.correctAnswers / currentLesson.questions.length >= 0.8) {
             reportHtml += `<p style="color:var(--green-correct);">Complimenti! Hai aumentato il livello di maestria in ${currentLesson.skill}!</p>`;
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
    
    // --- FUNZIONI MODALI E DI SUPPORTO ---
    function showQuestionDetailModal(q) {
        // ... (Logica come prima)
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
        const searchInput = searchModal.querySelector('#search-modal-input');
        searchInput.value = '';
        searchModal.querySelector('#search-modal-results').innerHTML = '';
        showModal(null, null, searchModal);
        setTimeout(() => searchInput.focus(), 50);
    }

    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const resultsEl = searchModal.querySelector('#search-modal-results');
        resultsEl.innerHTML = query.length < 3 ? '' : allQuestions.filter(q => q.question.toLowerCase().includes(query) || q.answer.toString().toLowerCase().includes(query)).slice(0, 10).map(q => `
            <div class="search-result-item">
                <p class="question">${q.question}</p><p class="answer"><strong>Risposta:</strong> ${Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p><p class="explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>
            </div>`).join('');
    }

    function showModal(title, text, modalElement) {
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
    
    // --- AVVIO APP ---
    main();
});

// PART 3 OF 3 END
