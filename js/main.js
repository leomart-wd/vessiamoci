document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const globalHomeBtn = document.getElementById('global-home-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    
    // Elementi Modale Feedback
    const feedbackModal = document.getElementById('feedback-modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');

    // Elementi Modale Ricerca
    const searchModal = document.getElementById('search-modal-container');
    const searchInput = document.getElementById('search-modal-input');
    const searchResults = document.getElementById('search-modal-results');

    // --- STATO APPLICAZIONE ---
    let allQuestions = [];
    let currentLesson = { timerId: null };

    // --- INIZIALIZZAZIONE ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        try {
            const response = await fetch('data/questions.json');
            allQuestions = await response.json();
            setupGlobalListeners();
            renderDashboard();
        } catch (error) {
            app.innerHTML = '<p>Errore critico: impossibile caricare le domande. Riprova più tardi.</p>';
        }
    }

    function setupGlobalListeners() {
        homeTitle.addEventListener('click', renderDashboard);
        globalHomeBtn.addEventListener('click', renderDashboard);
        globalSearchBtn.addEventListener('click', openSearchModal);
        
        feedbackModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) {
                closeModal(feedbackModal);
            }
        });
        searchModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) {
                closeModal(searchModal);
            }
        });
        searchInput.addEventListener('input', handleSearch);
    }
    
    // --- ROUTING E VISTE PRINCIPALI ---
    function renderDashboard() {
        if (currentLesson.timerId) clearInterval(currentLesson.timerId);
        app.innerHTML = `
            <div class="dashboard-grid">
                <div class="dashboard-card" data-action="start-lesson"> <i class="fa-solid fa-rocket"></i> Inizia Nuova Lezione </div>
                <div class="dashboard-card" data-action="review-mistakes"> <i class="fa-solid fa-circle-check"></i> Ripassa i tuoi Errori </div>
                <div class="dashboard-card" data-action="training-mode"> <i class="fa-solid fa-stopwatch"></i> Modalità Allenamento </div>
                <div class="dashboard-card" data-action="view-stats"> <i class="fa-solid fa-chart-pie"></i> Visualizza Risultati </div>
            </div>`;
        app.querySelector('.dashboard-grid').addEventListener('click', (e) => {
            const action = e.target.closest('.dashboard-card')?.dataset.action;
            if(action) renderMacroAreaSelection(action);
        });
    }
    
    function renderMacroAreaSelection(mode) {
        const title = {
            'start-lesson': 'Scegli una Macroarea',
            'training-mode': 'Scegli per la Modalità Allenamento'
        }[mode];
        const macroAreas = [...new Set(allQuestions.map(q => q.macro_area))];
        let html = `<h2>${title}</h2><div class="dashboard-grid">`;
        macroAreas.forEach(area => {
            html += `<div class="dashboard-card" data-area="${area}">${area}</div>`;
        });
        html += '</div>';
        app.innerHTML = html;
        app.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => startLesson(card.dataset.area, mode === 'training-mode' ? 'timed' : 'standard'));
        });
    }

    // --- LOGICA LEZIONE ---
    function startLesson(macroArea, mode) {
        const difficultyOrder = { 'true_false': 1, 'multiple_choice': 2, 'open_answer': 3 };
        const questionPool = allQuestions
            .filter(q => q.macro_area === macroArea)
            .sort((a, b) => (difficultyOrder[a.type] || 4) - (difficultyOrder[b.type] || 4));

        currentLesson = {
            questions: questionPool.slice(0, 10),
            currentIndex: 0,
            mode: mode,
            timerId: null,
            correctAnswers: 0
        };

        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'Nessuna domanda disponibile per questa categoria.');
            return;
        }
        renderQuestion();
    }
    
    function renderQuestion() {
        const q = currentLesson.questions[currentLesson.currentIndex];
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
                <span>${currentLesson.currentIndex + 1}/${currentLesson.questions.length}</span>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${((currentLesson.currentIndex) / currentLesson.questions.length) * 100}%"></div></div>
            </div>
            <div class="question-container">
                <p class="question-text">${q.question}</p>
                <div class="answer-options">${optionsHtml}</div>
                ${currentLesson.mode === 'timed' ? '<div class="timer-bar-container"><div id="timer-bar" class="timer-bar"></div></div>' : ''}
                <div class="lesson-footer">
                    <div>
                        <button class="hint-btn" id="show-hint-btn"><i class="fa-solid fa-lightbulb"></i> Hint</button>
                        <button class="hint-btn" id="show-answer-btn"><i class="fa-solid fa-key"></i> Risposta</button>
                    </div>
                    <button id="check-answer-btn">Controlla</button>
                </div>
            </div>`;

        setupQuestionListeners();
        if (currentLesson.mode === 'timed') startTimer();
    }
    
    function setupQuestionListeners() {
        const q = currentLesson.questions[currentLesson.currentIndex];
        document.getElementById('check-answer-btn').addEventListener('click', checkCurrentAnswer);
        document.getElementById('show-hint-btn').addEventListener('click', () => showModal('Suggerimento', q.reflective_question, feedbackModal));
        document.getElementById('show-answer-btn').addEventListener('click', () => showModal('Risposta Corretta', q.answer, feedbackModal));
        
        if (q.type !== 'open_answer') {
            app.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', (e) => {
                app.querySelectorAll('.option-btn').forEach(b => b.style.borderColor = 'var(--gray-light)');
                e.currentTarget.style.borderColor = 'var(--blue-action)';
            }));
        }
    }
    
    function startTimer() {
        const timerBar = document.getElementById('timer-bar');
        if (!timerBar) return;
        setTimeout(() => { timerBar.style.width = '0%'; }, 50);
        currentLesson.timerId = setTimeout(() => {
            showFeedback(false, "Tempo scaduto!");
        }, 30000);
    }

    function checkCurrentAnswer() {
        if (currentLesson.timerId) clearTimeout(currentLesson.timerId);
        
        const q = currentLesson.questions[currentLesson.currentIndex];
        let userAnswer;
        let isCorrect = false;

        if (q.type === 'open_answer') {
            userAnswer = document.getElementById('open-answer-input').value;
            const userWords = userAnswer.toLowerCase().match(/\b(\w+)\b/g) || [];
            const matches = q.keywords.filter(k => userWords.includes(k.toLowerCase())).length;
            isCorrect = (matches / q.keywords.length) >= 0.6;
        } else {
            const selectedBtn = app.querySelector('.option-btn[style*="--blue-action"]');
            userAnswer = selectedBtn ? selectedBtn.dataset.answer : null;
            if (userAnswer) {
                isCorrect = userAnswer.toString().toLowerCase() === q.answer.toString().toLowerCase();
            }
        }
        
        if (isCorrect) currentLesson.correctAnswers++;
        showFeedback(isCorrect);
    }
    
    function showFeedback(isCorrect, message = "") {
        app.querySelector('.answer-options').classList.add('disabled');
        const q = currentLesson.questions[currentLesson.currentIndex];
        
        const checkBtn = document.getElementById('check-answer-btn');
        checkBtn.textContent = 'Avanti';
        checkBtn.id = 'next-question-btn';
        checkBtn.addEventListener('click', nextQuestion);
        
        if (isCorrect) {
            checkBtn.style.backgroundColor = 'var(--green-correct)';
        } else {
            checkBtn.style.backgroundColor = 'var(--red-incorrect)';
        }
        
        const feedbackTitle = message || (isCorrect ? 'Corretto!' : 'Sbagliato!');
        showModal(feedbackTitle, q.explanation, feedbackModal);
    }

    function nextQuestion() {
        closeModal(feedbackModal);
        currentLesson.currentIndex++;
        if (currentLesson.currentIndex < currentLesson.questions.length) {
            renderQuestion();
        } else {
            app.innerHTML = `
                <div class="question-container" style="text-align:center;">
                    <h2>Lezione Completata!</h2>
                    <h3>Hai risposto correttamente a ${currentLesson.correctAnswers} su ${currentLesson.questions.length} domande.</h3>
                    <button id="back-to-dash" class="hint-btn" style="background-color:var(--blue-action); color:white; padding: 1rem 2rem; font-size:1.2rem;">Torna alla Dashboard</button>
                </div>`;
            document.getElementById('back-to-dash').addEventListener('click', renderDashboard);
        }
    }

    // --- FUNZIONALITÀ MODALI ---
    function openSearchModal() {
        showModal(null, null, searchModal);
    }
    
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        if (query.length < 3) {
            searchResults.innerHTML = '';
            return;
        }
        const filtered = allQuestions.filter(q => q.question.toLowerCase().includes(query) || q.answer.toLowerCase().includes(query));
        searchResults.innerHTML = filtered.slice(0, 10).map(q => `
            <div class="search-result-item">
                <p class="question">${q.question}</p>
                <p class="answer"><strong>Risposta:</strong> ${q.answer}</p>
                <p class="explanation"><strong>Spiegazione:</strong> ${q.explanation}</p>
            </div>`).join('');
    }

    function showModal(title, text, modalElement) {
        if(title) modalElement.querySelector('h3').textContent = title;
        if(text) modalElement.querySelector('p, div#search-modal-results').innerHTML = text;
        modalElement.classList.remove('hidden');
    }

    function closeModal(modalElement) {
        modalElement.classList.add('hidden');
    }

    // --- AVVIO APP ---
    main();
});
