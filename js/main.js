document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DEL DOM E STATO GLOBALE ---
    const app = document.getElementById('app');
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const homeBtn = document.getElementById('home-btn');

    let allQuestions = [];
    let userProgress = {};
    let currentLesson = {
        questions: [],
        currentIndex: 0,
        mode: 'standard', // 'standard' o 'timed'
        timerId: null
    };

    // --- INIZIALIZZAZIONE ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        await loadQuestions();
        loadUserProgress();
        renderDashboard();

        // Listeners globali
        closeModalBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });
        homeBtn.addEventListener('click', renderDashboard);
    }

    async function loadQuestions() {
        // ... (uguale a prima)
    }
    function loadUserProgress() {
        // ... (uguale a prima)
    }
    function saveProgress() {
        // ... (uguale a prima)
    }

    // --- ROUTING E RENDER VISTE PRINCIPALI ---

    function renderDashboard() {
        if(currentLesson.timerId) clearInterval(currentLesson.timerId); // Sicurezza
        app.innerHTML = `
            <div class="dashboard-grid">
                <div class="dashboard-card" data-action="start-lesson">
                    <i class="fa-solid fa-rocket"></i> Inizia Nuova Lezione
                </div>
                <div class="dashboard-card" data-action="review-mistakes">
                    <i class="fa-solid fa-circle-check"></i> Ripassa i tuoi Errori
                </div>
                <div class="dashboard-card" data-action="training-mode">
                    <i class="fa-solid fa-dumbbell"></i> Modalità Allenamento
                </div>
                <div class="dashboard-card" data-action="view-stats">
                    <i class="fa-solid fa-chart-pie"></i> Visualizza Risultati
                </div>
            </div>
            <div class="search-container">
                <h3><i class="fa-solid fa-magnifying-glass"></i> Cerca un Argomento</h3>
                <input type="text" id="search-input" placeholder="Es: laringe, cricotiroideo...">
                <div id="search-results"></div>
            </div>
        `;
        document.querySelector('.dashboard-grid').addEventListener('click', (e) => {
            const action = e.target.closest('.dashboard-card')?.dataset.action;
            handleDashboardAction(action);
        });
        document.getElementById('search-input').addEventListener('input', handleSearch);
    }
    
    function handleDashboardAction(action) {
        if (!action) return;
        switch (action) {
            case 'start-lesson':
                renderMacroAreaSelection('standard');
                break;
            case 'training-mode':
                renderMacroAreaSelection('timed');
                break;
            // ... (altre actions) ...
        }
    }
    
    // Mostra le Macroaree prima di una lezione
    function renderMacroAreaSelection(mode) {
        const macroAreas = [...new Set(allQuestions.map(q => q.macro_area))];
        let html = `<h2>Scegli una Macroarea per la tua lezione ${mode === 'timed' ? 'a tempo' : ''}</h2>`;
        html += '<div class="dashboard-grid">';
        macroAreas.forEach(area => {
            html += `<div class="dashboard-card" data-area="${area}">${area}</div>`;
        });
        html += '</div>';
        app.innerHTML = html;
        
        app.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => {
                startLesson(card.dataset.area, mode);
            });
        });
    }

    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }

        const filtered = allQuestions.filter(q => q.question.toLowerCase().includes(query) || q.explanation.toLowerCase().includes(query));
        
        resultsContainer.innerHTML = filtered.slice(0, 5).map(q => `
            <div class="search-result-item">
                <p class="question">${q.question}</p>
                <p class="answer"><strong>Risposta:</strong> ${q.answer}</p>
                <p class="explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>
            </div>
        `).join('');
    }

    // --- LOGICA DELLA LEZIONE ---
    
    function startLesson(macroArea, mode) {
        const difficultyOrder = { 'true_false': 1, 'multiple_choice': 2, 'open_answer': 3 };
        const questionPool = allQuestions
            .filter(q => q.macro_area === macroArea)
            .sort((a, b) => (difficultyOrder[a.type] || 4) - (difficultyOrder[b.type] || 4));

        currentLesson = {
            questions: questionPool.slice(0, 10), // Prendiamo le prime 10 domande ordinate
            currentIndex: 0,
            mode: mode,
            timerId: null
        };
        
        if (currentLesson.questions.length === 0) {
            alert('Nessuna domanda trovata per questa categoria.');
            renderDashboard();
            return;
        }

        renderQuestion();
    }
    
    function renderQuestion() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        // Header
        let html = `
            <div class="lesson-header">
                <i class="fa-solid fa-xmark" style="cursor:pointer;" id="quit-lesson"></i>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${((currentLesson.currentIndex) / currentLesson.questions.length) * 100}%"></div>
                </div>
                <span>${currentLesson.currentIndex + 1}/${currentLesson.questions.length}</span>
            </div>
            <div class="question-container">
                <p class="question-text">${q.question}</p>
                <div class="answer-options">
        `;
        
        // Opzioni di risposta
        if (q.type === 'multiple_choice') {
            q.options.forEach(opt => { html += `<button data-answer="${opt}">${opt}</button>`; });
        } else if (q.type === 'true_false') {
            html += `<button data-answer="true">Vero</button>`;
            html += `<button data-answer="false">Falso</button>`;
        } else {
            html += `<textarea id="open-answer-input" placeholder="Scrivi qui la tua risposta..."></textarea>`;
        }
        
        html += `</div>`; // Chiude answer-options
        
        // Footer e Timer
        html += `
                <div class="lesson-footer">
                    <div>
                        <button class="hint-btn" id="show-hint-btn"><i class="fa-solid fa-lightbulb"></i> Hint</button>
                        <button class="hint-btn" id="show-answer-btn"><i class="fa-solid fa-key"></i> Risposta</button>
                    </div>
                    <button id="check-answer-btn">Controlla</button>
                </div>
        `;

        if (currentLesson.mode === 'timed') {
            html += `<div class="timer-bar-container"><div id="timer-bar" class="timer-bar"></div></div>`;
        }

        html += `</div>`; // Chiude question-container
        app.innerHTML = html;

        // Listeners
        document.getElementById('quit-lesson').addEventListener('click', renderDashboard);
        document.getElementById('check-answer-btn').addEventListener('click', checkCurrentAnswer);
        document.getElementById('show-hint-btn').addEventListener('click', () => showModal('Suggerimento', q.reflective_question));
        document.getElementById('show-answer-btn').addEventListener('click', () => showModal('Risposta Corretta', q.answer));

        if (q.type !== 'open_answer') {
            app.querySelectorAll('.answer-options button').forEach(btn => {
                btn.addEventListener('click', () => {
                    app.querySelectorAll('.answer-options button').forEach(b => b.style.borderColor = 'var(--gray-light)');
                    btn.style.borderColor = 'var(--blue-action)';
                });
            });
        }
        
        // Avvia timer se in modalità allenamento
        if (currentLesson.mode === 'timed') {
            const timerBar = document.getElementById('timer-bar');
            setTimeout(() => { timerBar.style.width = '0%'; }, 100); // Inizia animazione
            currentLesson.timerId = setTimeout(() => {
                handleTimeout();
            }, 30000);
        }
    }

    function checkCurrentAnswer() {
        if(currentLesson.timerId) clearTimeout(currentLesson.timerId);
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        if (q.type === 'open_answer') {
            userAnswer = document.getElementById('open-answer-input').value;
            const userWords = userAnswer.toLowerCase().split(/\s+/);
            const matches = q.keywords.filter(k => userWords.includes(k.toLowerCase())).length;
            isCorrect = (matches / q.keywords.length) >= 0.6; // 60% keyword match
        } else {
            const selectedBtn = app.querySelector('.answer-options button[style*="--blue-action"]');
            userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
            // La risposta JSON per V/F è booleana, la risposta del bottone è stringa. Convertiamo.
            isCorrect = userAnswer?.toString() === q.answer.toString();
        }

        showFeedback(isCorrect);
    }
    
    function handleTimeout() {
        showFeedback(false, "Tempo scaduto!");
    }

    function showFeedback(isCorrect, message = "") {
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        // Disabilita le opzioni
        app.querySelector('.answer-options').classList.add('disabled');
        
        // Cambia bottone "Controlla" in "Avanti"
        const checkBtn = document.getElementById('check-answer-btn');
        checkBtn.textContent = 'Avanti';
        checkBtn.id = 'next-question-btn';
        document.getElementById('next-question-btn').addEventListener('click', nextQuestion);
        
        if (isCorrect) {
            checkBtn.style.backgroundColor = 'var(--green-correct)';
            // Evidenzia la risposta corretta
            app.querySelectorAll(`[data-answer="${q.answer}"]`).forEach(el => el.classList.add('correct'));
        } else {
            checkBtn.style.backgroundColor = 'var(--red-incorrect)';
            // Evidenzia la risposta sbagliata (se data) e quella corretta
            const selectedBtn = app.querySelector('.answer-options button[style*="--blue-action"]');
            if (selectedBtn) selectedBtn.classList.add('incorrect');
            app.querySelectorAll(`[data-answer="${q.answer}"]`).forEach(el => el.classList.add('correct'));
        }
        
        // Mostra popup con spiegazione
        const feedbackTitle = message || (isCorrect ? 'Corretto!' : 'Sbagliato!');
        showModal(feedbackTitle, q.explanation);
    }
    
    function nextQuestion() {
        closeModal();
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            // Fine lezione
            app.innerHTML = `
                <div class="question-container" style="text-align:center;">
                    <h2>Lezione Completata!</h2>
                    <p>Hai terminato questa sessione. Ottimo lavoro!</p>
                    <button id="back-to-dash">Torna alla Dashboard</button>
                </div>
            `;
            document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
        }
    }

    // --- LOGICA MODALE ---
    function showModal(title, text) {
        modalTitle.textContent = title;
        modalText.innerHTML = text; // Usiamo innerHTML per permettere eventuali tag <br>
        modalContainer.classList.remove('hidden');
    }

    function closeModal() {
        modalContainer.classList.add('hidden');
    }

    // --- AVVIO APP ---
    main();
});
