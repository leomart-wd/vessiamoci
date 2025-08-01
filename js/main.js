document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI E STATO ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const globalHomeBtn = document.getElementById('global-home-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
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
            app.innerHTML = `<p>Errore critico: impossibile caricare le domande. Controlla il file 'data/questions.json'.</p>`;
            console.error("Fetch Error:", error);
        }
    }

    function loadUserProgress() {
        const savedProgress = localStorage.getItem('vessiamociUserProgress');
        userProgress = savedProgress ? JSON.parse(savedProgress) : { questionStats: {} };
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
        [feedbackModal, searchModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) closeModal(modal);
            });
        });
        searchModal.querySelector('#search-modal-input').addEventListener('input', handleSearch);
    }

    // --- VISTE PRINCIPALI E DASHBOARD ---
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
                renderMacroAreaSelection();
                break;
            case 'training-mode':
                startLesson('all', 'timed');
                break;
            case 'review-mistakes':
                startMistakesSession();
                break;
            case 'view-stats':
                renderStatsPage();
                break;
        }
    }

    function renderMacroAreaSelection() {
        const macroAreas = [...new Set(allQuestions.map(q => q.macro_area))];
        let html = `<h2>Scegli una Macroarea</h2><div class="dashboard-grid">`;
        macroAreas.forEach(area => {
            html += `<div class="dashboard-card" data-area="${area}">${area}</div>`;
        });
        html += `</div>`;
        app.innerHTML = html;
        app.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => startLesson(card.dataset.area, 'standard'));
        });
    }

    // --- LOGICA DI GIOCO E LEZIONI ---
    function startLesson(macroArea, mode) {
        let questionPool;
        if (macroArea === 'all') {
            questionPool = [...allQuestions].sort(() => 0.5 - Math.random());
        } else if (macroArea === 'mistakes') {
            const mistakenQuestionsIds = Object.keys(userProgress.questionStats)
                .filter(qId => userProgress.questionStats[qId].incorrect > 0);
            questionPool = allQuestions.filter(q => mistakenQuestionsIds.includes(q.id.toString()));
        } else {
            const difficultyOrder = { 'true_false': 1, 'multiple_choice': 2, 'open_answer': 3 };
            questionPool = allQuestions
                .filter(q => q.macro_area === macroArea)
                .sort((a, b) => (difficultyOrder[a.type] || 4) - (difficultyOrder[b.type] || 4));
        }

        const lessonLength = mode === 'timed' ? 20 : (macroArea === 'mistakes' ? questionPool.length : 10);
        currentLesson = {
            questions: questionPool.slice(0, lessonLength),
            currentIndex: 0, mode: mode, timerId: null, correctAnswers: 0
        };

        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', macroArea === 'mistakes' ? 'Nessun errore da ripassare. Ottimo lavoro!' : 'Nessuna domanda disponibile per questa selezione.', feedbackModal);
            return;
        }
        renderQuestion();
    }
    
    function startMistakesSession() {
        startLesson('mistakes', 'standard');
    }

    function renderQuestion() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        const isTimed = currentLesson.mode === 'timed';
        let optionsHtml = '';
        if (q.type === 'multiple_choice') {
            q.options.forEach(opt => { optionsHtml += `<button class="option-btn" data-answer="${opt}">${opt}</button>`; });
        } else if (q.type === 'true_false') {
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
        document.getElementById('check-answer-btn').addEventListener('click', checkCurrentAnswer);
        const hintBtn = document.getElementById('show-hint-btn');
        const answerBtn = document.getElementById('show-answer-btn');
        if (hintBtn) hintBtn.addEventListener('click', () => showModal('Suggerimento', q.reflective_question || "Nessun hint per questa domanda.", feedbackModal));
        if (answerBtn) answerBtn.addEventListener('click', () => showModal('Risposta Corretta', Array.isArray(q.answer) ? q.answer.join(', ') : q.answer, feedbackModal));
        
        if (q.type !== 'open_answer') {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => {
                app.querySelectorAll('.option-btn').forEach(b => b.style.borderColor = '');
                e.currentTarget.style.borderColor = 'var(--blue-action)';
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
        if (soundEnabled) timeoutSound.play();
        const q = currentLesson.questions[currentLesson.currentIndex];
        if (!userProgress.questionStats[q.id]) userProgress.questionStats[q.id] = { correct: 0, incorrect: 0 };
        userProgress.questionStats[q.id].incorrect++;
        saveProgress();
        showFeedback(false, "Tempo scaduto!");
        setTimeout(nextQuestion, 2000);
    }
    
    function checkCurrentAnswer() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        if (q.type === 'open_answer') {
            userAnswer = document.getElementById('open-answer-input').value;
            const userWords = (userAnswer.toLowerCase().match(/\b(\w+)\b/g) || []).filter(w => w.length > 2);
            const keywords = q.keywords || [];
            if(keywords.length > 0) {
                 const matches = keywords.filter(k => userWords.includes(k.toLowerCase())).length;
                 isCorrect = (matches / keywords.length) >= 0.6;
            } else { // Se non ci sono keywords, considerala corretta se l'utente scrive qualcosa
                 isCorrect = userAnswer.trim() !== '';
            }
        } else {
            const selectedBtn = app.querySelector('.option-btn[style*="--blue-action"]');
            userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
            if (userAnswer) {
                isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }
        }
        
        if (!userProgress.questionStats[q.id]) userProgress.questionStats[q.id] = { correct: 0, incorrect: 0 };
        isCorrect ? userProgress.questionStats[q.id].correct++ : userProgress.questionStats[q.id].incorrect++;
        if (isCorrect) currentLesson.correctAnswers++;
        saveProgress();
        showFeedback(isCorrect);
    }

    function showFeedback(isCorrect, message = "") {
        if (soundEnabled) { isCorrect ? correctSound.play() : incorrectSound.play(); }
        app.querySelector('.answer-options').classList.add('disabled');
        const checkBtn = document.getElementById('check-answer-btn');
        checkBtn.id = 'next-question-btn';
        checkBtn.textContent = 'Avanti';
        checkBtn.style.backgroundColor = isCorrect ? 'var(--green-correct)' : 'var(--red-incorrect)';
        checkBtn.addEventListener('click', nextQuestion);
        showModal(message || (isCorrect ? 'Corretto!' : 'Sbagliato!'), currentLesson.questions[currentLesson.currentIndex].explanation, feedbackModal);
    }

    function nextQuestion() {
        closeModal(feedbackModal);
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            app.innerHTML = `<div class="question-container" style="text-align:center;">
                <h2>Lezione Completata!</h2>
                <h3>Hai risposto correttamente a ${currentLesson.correctAnswers} su ${currentLesson.questions.length} domande.</h3>
                <button id="back-to-dash" class="hint-btn" style="background-color:var(--blue-action); color:white; padding: 1rem 2rem; font-size:1.2rem;">Torna alla Dashboard</button>
            </div>`;
            document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
        }
    }

    // --- FUNZIONI GLOBALI, MODALI, AUDIO, STATISTICHE ---
    function renderStatsPage() {
        const stats = { totalAnswered: 0, totalCorrect: 0, byArea: {} };
        for (const qId in userProgress.questionStats) {
            const stat = userProgress.questionStats[qId];
            const q = allQuestions.find(item => item.id == qId);
            if(q) {
                const total = (stat.correct || 0) + (stat.incorrect || 0);
                if (total > 0) {
                    stats.totalAnswered += total;
                    stats.totalCorrect += stat.correct || 0;
                    if (!stats.byArea[q.macro_area]) stats.byArea[q.macro_area] = { correct: 0, total: 0 };
                    stats.byArea[q.macro_area].correct += stat.correct || 0;
                    stats.byArea[q.macro_area].total += total;
                }
            }
        }
        
        let bestArea = 'N/A', bestAreaPerc = -1;
        for (const area in stats.byArea) {
            const perc = (stats.byArea[area].correct / stats.byArea[area].total) * 100;
            if (perc > bestAreaPerc) { bestAreaPerc = perc; bestArea = area; }
        }
        
        const overallPerc = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
        let statsHtml = `<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>`;
        if (stats.totalAnswered === 0) {
            statsHtml += '<div class="question-container" style="text-align:center;"><p>Non hai ancora risposto a nessuna domanda. Inizia un test per vedere le tue statistiche!</p></div>';
        } else {
            statsHtml += `<div class="stats-header">
                <div class="stat-card"><div class="value green">${overallPerc}%</div><div class="label">Successo Totale</div></div>
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

            const toughest = Object.entries(userProgress.questionStats).filter(([,s]) => s.incorrect > 0).sort(([,a],[,b]) => b.incorrect - a.incorrect).slice(0, 3);
            if (toughest.length > 0) {
                statsHtml += `<div class="stats-section"><h3>Domande da Ripassare</h3><ul class="toughest-questions-list">`;
                toughest.forEach(([qId,]) => {
                    const q = allQuestions.find(item => item.id == qId);
                    if (q) statsHtml += `<li>${q.question}</li>`;
                });
                statsHtml += '</ul></div>';
            }
        }
        app.innerHTML = statsHtml;
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
        const textEl = modalElement.querySelector('p, div[id$="-results"]');
        if (title && titleEl) titleEl.textContent = title;
        if (text && textEl) textEl.innerHTML = text;
        modalElement.classList.remove('hidden');
    }

    function closeModal(modalElement) {
        modalElement.classList.add('hidden');
    }

    // --- AVVIO APP ---
    main();
});
