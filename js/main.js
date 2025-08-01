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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allQuestions = await response.json();
            loadUserProgress();
            setupGlobalListeners();
            renderDashboard();
        } catch (error) {
            app.innerHTML = `<p>Errore critico: impossibile caricare le domande. Controlla il file 'data/questions.json' per errori di sintassi.</p>`;
            console.error("Fetch Error:", error);
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
        if (availableAreas.length > 1) {
            html += `<div class="dashboard-card btn-all-categories" data-area="all">Tutte</div>`;
        }
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

        const lessonLength = mode === 'timed' ? 20 : (mode === 'mistakes' ? (questionPool.length > 15 ? 15 : questionPool.length) : 10);
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
        } else {
            optionsHtml += `<textarea id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`;
        }

        app.innerHTML = `
            <div class="lesson-header">
                ${isTimed ? '<div class="timer-display"><i class="fa-solid fa-clock"></i> <span id="time-left">30</span></div>' : ''}
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

        if (currentLesson.mode === 'timed' && (questionType === 'multiple_choice' || questionType === 'true_false')) {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => checkCurrentAnswer(e.currentTarget.dataset.answer)));
            document.getElementById('check-answer-btn').classList.add('visually-hidden');
        } else {
            document.getElementById('check-answer-btn').addEventListener('click', () => checkCurrentAnswer());
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
                handleTimeout();
            }
        }, 1000);
    }

    function handleTimeout() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        if (!userProgress.questionStats[q.id]) userProgress.questionStats[q.id] = { correct: 0, incorrect: 0, totalTime: 0 };
        userProgress.questionStats[q.id].incorrect++;
        saveProgress();
        showFeedback(false, "Tempo scaduto!");
    }
    
    function checkCurrentAnswer(immediateAnswer = null) {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        app.querySelector('.answer-options').classList.add('disabled');

        const timeToAnswer = (Date.now() - currentLesson.startTime) / 1000;
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        const questionType = q.type;

        if (immediateAnswer !== null) {
            userAnswer = immediateAnswer;
        } else if (questionType === 'open_ended') {
            userAnswer = document.getElementById('open-answer-input').value;
        } else {
            const selectedBtn = app.querySelector('.option-btn[style*="--blue-action"]');
            userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
        }
        
        if (questionType === 'open_ended') {
            const userWords = (userAnswer.toLowerCase().match(/\b(\w+)\b/g) || []).filter(w => w.length > 2);
            const answerText = q.answer.toString().toLowerCase();
            const keywords = q.keywords || answerText.split(' ').filter(w => w.length > 3);
            if (keywords.length > 0) {
                 const matches = keywords.filter(k => userWords.includes(k)).length;
                 isCorrect = (matches / keywords.length) >= 0.6;
            } else {
                 isCorrect = userAnswer.toLowerCase() === answerText;
            }
        } else if (userAnswer) {
            isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
        }

        if (!userProgress.questionStats[q.id]) userProgress.questionStats[q.id] = { correct: 0, incorrect: 0, totalTime: 0 };
        isCorrect ? userProgress.questionStats[q.id].correct++ : userProgress.questionStats[q.id].incorrect++;
        if (currentLesson.mode === 'timed') {
            userProgress.questionStats[q.id].totalTime = (userProgress.questionStats[q.id].totalTime || 0) + timeToAnswer;
        }
        if (isCorrect) currentLesson.correctAnswers++;
        
        currentLesson.report.push({ question: q, userAnswer, isCorrect, timeToAnswer });
        saveProgress();
        showFeedback(isCorrect);
    }

    function showFeedback(isCorrect, message = "") {
        if (soundEnabled) { isCorrect ? correctSound.play() : incorrectSound.play(); }
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        if (currentLesson.mode === 'timed') {
             setTimeout(nextQuestion, 1500);
        } else {
             const checkBtn = document.getElementById('check-answer-btn');
             checkBtn.id = 'next-question-btn';
             checkBtn.textContent = 'Avanti';
             checkBtn.style.backgroundColor = isCorrect ? 'var(--green-correct)' : 'var(--red-incorrect)';
             checkBtn.addEventListener('click', nextQuestion);
             const explanation = q.explanation;
             showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), explanation, feedbackModal);
        }
    }

    function nextQuestion() {
        closeModal(feedbackModal);
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            currentLesson.mode === 'timed' ? renderTrainingReport() : renderStandardReport();
        }
    }
    
    function renderStandardReport() {
        app.innerHTML = `<div class="question-container" style="text-align:center;">
            <h2>Test Completato!</h2>
            <h3>Hai risposto correttamente a ${currentLesson.correctAnswers} su ${currentLesson.questions.length} domande.</h3>
            <button id="back-to-dash" class="hint-btn" style="background-color:var(--blue-action); color:white; padding: 1rem 2rem; font-size:1.2rem;">Torna alla Dashboard</button>
        </div>`;
        document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
    }

    function renderTrainingReport() {
        let reportHtml = `<h2><i class="fa-solid fa-scroll"></i> Report Allenamento</h2>`;
        currentLesson.report.forEach(item => {
            reportHtml += `<div class="test-report-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <p class="report-q-text">${item.question.question}</p>
                <p class="report-user-answer">La tua risposta: ${item.userAnswer || "Nessuna"} (${item.timeToAnswer.toFixed(1)}s)</p>
                <div class="report-explanation"><strong>Spiegazione:</strong> ${item.question.explanation}</div>
            </div>`;
        });
        reportHtml += `<button id="back-to-dash" class="hint-btn" style="background-color:var(--blue-action); color:white; padding: 1rem 2rem; font-size:1.2rem; margin-top:1rem;">Torna alla Dashboard</button>`;
        app.innerHTML = reportHtml;
        document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
    }
    
    // --- PAGINA STATISTICHE ---
    function renderStatsPage() {
        const stats = { totalAnswered: 0, totalCorrect: 0, totalTime: 0, byArea: {} };
        let totalQuestionsAnsweredInTimedMode = 0;
        
        Object.entries(userProgress.questionStats).forEach(([qId, stat]) => {
            const question = allQuestions.find(q => q.id == qId);
            if (question) { // Robustness check
                const correctCount = stat.correct || 0;
                const incorrectCount = stat.incorrect || 0;
                const total = correctCount + incorrectCount;
                stats.totalCorrect += correctCount;
                stats.totalAnswered += total;
                
                const area = question.macro_area;
                if (!stats.byArea[area]) stats.byArea[area] = { correct: 0, total: 0 };
                stats.byArea[area].correct += correctCount;
                stats.byArea[area].total += total;
                
                if (stat.totalTime > 0) {
                    stats.totalTime += stat.totalTime;
                    totalQuestionsAnsweredInTimedMode += total;
                }
            }
        });
        
        let worstArea = 'N/A', worstAreaPerc = 101;
        Object.entries(stats.byArea).forEach(([area, data]) => {
            const perc = data.total > 0 ? (data.correct / data.total) * 100 : 101;
            if (perc < worstAreaPerc) { worstAreaPerc = perc; worstArea = area; }
        });
        
        const overallPerc = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
        const avgTime = totalQuestionsAnsweredInTimedMode > 0 ? (stats.totalTime / totalQuestionsAnsweredInTimedMode).toFixed(1) : 0;
        
        let statsHtml = `<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>`;
        if (stats.totalAnswered === 0) {
            statsHtml += '<div class="question-container" style="text-align:center;"><p>Nessuna statistica disponibile. Inizia un test per vedere i tuoi progressi!</p></div>';
            app.innerHTML = statsHtml; return;
        }
        
        statsHtml += `<div class="stats-container">
            <div class="stats-header">
                <div class="stat-card"><div class="value green">${overallPerc}%</div><div class="label">Accuratezza</div></div>
                <div class="stat-card"><div class="value">${avgTime}<span class="unit">s</span></div><div class="label">Tempo Medio Risposta</div></div>
                <div class="stat-card"><div class="value">${worstArea}</div><div class="label">Area da Migliorare</div></div>
            </div>
            <div class="stats-section"><h3>Performance per Macroarea</h3>`;
        Object.entries(stats.byArea).forEach(([area, data]) => {
            const perc = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            statsHtml += `<div class="stat-item"><div class="stat-item-header"><span>${area}</span><span>${perc}%</span></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${perc}%;"></div></div></div>`;
        });
        statsHtml += `</div>`;
        
        const toughest = Object.entries(userProgress.questionStats).filter(([,s]) => s.incorrect > 0).sort(([,a],[,b]) => b.incorrect - a.incorrect).slice(0, 5);
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
        app.querySelectorAll('.toughest-questions-list li').forEach(li => {
            li.addEventListener('click', (e) => showQuestionDetailModal(allQuestions.find(q => q.id == e.currentTarget.dataset.questionId)));
        });
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

    // --- FUNZIONI DI SUPPORTO ---
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
    }

    // --- AVVIO APP ---
    main();
});
