document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DOM GLOBALI ---
    const app = document.getElementById('app');
    const homeTitle = document.getElementById('home-title');
    const globalHomeBtn = document.getElementById('global-home-btn');
    const globalSearchBtn = document.getElementById('global-search-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const feedbackModal = document.getElementById('feedback-modal-container');
    const searchModal = document.getElementById('search-modal-container');
    
    // --- STATO APPLICAZIONE ---
    let allQuestions = [];
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
            setupGlobalListeners();
            renderDashboard();
        } catch (error) {
            app.innerHTML = '<p>Errore critico: impossibile caricare le domande.</p>';
        }
    }

    function setupGlobalListeners() {
        homeTitle.addEventListener('click', renderDashboard);
        globalHomeBtn.addEventListener('click', renderDashboard);
        globalSearchBtn.addEventListener('click', openSearchModal);
        soundToggleBtn.addEventListener('click', toggleSound);
        
        [feedbackModal, searchModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-container') || e.target.classList.contains('close-btn')) {
                    closeModal(modal);
                }
            });
        });
        
        searchModal.querySelector('#search-modal-input').addEventListener('input', handleSearch);
    }
    
    // --- GESTIONE VISTE PRINCIPALI ---
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
            if (!action) return;
            
            if (action === 'training-mode') {
                startLesson('all', 'timed');
            } else {
                renderMacroAreaSelection(action);
            }
        });
    }
    
    function renderMacroAreaSelection(mode) {
        // ... (Logica invariata rispetto a prima) ...
    }

    // --- LOGICA LEZIONE ---
    function startLesson(macroArea, mode) {
        let questionPool;
        if (macroArea === 'all') {
            questionPool = [...allQuestions].sort(() => 0.5 - Math.random()); // Shuffle
        } else {
            const difficultyOrder = { 'true_false': 1, 'multiple_choice': 2, 'open_answer': 3 };
            questionPool = allQuestions
                .filter(q => q.macro_area === macroArea)
                .sort((a, b) => (difficultyOrder[a.type] || 4) - (difficultyOrder[b.type] || 4));
        }

        const lessonLength = mode === 'timed' ? 20 : 10;
        currentLesson = {
            questions: questionPool.slice(0, lessonLength),
            currentIndex: 0,
            mode: mode,
            timerId: null,
            correctAnswers: 0
        };

        if (currentLesson.questions.length === 0) {
            showModal('Attenzione', 'Nessuna domanda disponibile.', feedbackModal);
            return;
        }
        renderQuestion();
    }
    
    function renderQuestion() {
        // ... (Logica di render della domanda quasi invariata, con aggiunta del timer display e classi per nascondere bottoni)
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
        if(soundEnabled) timeoutSound.play();
        showFeedback(false, "Tempo scaduto!");
        setTimeout(() => {
            nextQuestion();
        }, 2000); // Passa automaticamente dopo 2 secondi
    }
    
    function showFeedback(isCorrect, message = "") {
        if(currentLesson.timerId) clearInterval(currentLesson.timerId);
        
        // ... (logica di feedback invariata) ...
        // Riproduci suono
        if(soundEnabled) {
            isCorrect ? correctSound.play() : incorrectSound.play();
        }
        
        // Disabilita le opzioni
        app.querySelector('.answer-options').classList.add('disabled');
        // ... il resto della funzione ...
    }
    
    // ... (Il resto delle funzioni di logica della lezione rimangono invariate)

    // --- FUNZIONI GLOBALI (Audio, Ricerca, Modali) ---
    function toggleSound() {
        soundEnabled = !soundEnabled;
        const icon = soundToggleBtn.querySelector('i');
        icon.classList.toggle('fa-volume-high', soundEnabled);
        icon.classList.toggle('fa-volume-xmark', !soundEnabled);
    }
    
    function openSearchModal() {
        const searchInput = searchModal.querySelector('#search-modal-input');
        searchInput.value = '';
        searchModal.querySelector('#search-modal-results').innerHTML = '';
        showModal(null, null, searchModal);
        setTimeout(() => searchInput.focus(), 100); // Autofocus con un piccolo ritardo
    }
    
    function handleSearch(event) {
        // ... (Logica di ricerca invariata)
    }

    function showModal(title, text, modalElement) {
        const titleEl = modalElement.querySelector('h3');
        const textEl = modalElement.querySelector('p') || modalElement.querySelector('div[id$="-results"]');
        if(title && titleEl) titleEl.textContent = title;
        if(text && textEl) textEl.innerHTML = text;
        modalElement.classList.remove('hidden');
    }

    function closeModal(modalElement) {
        modalElement.classList.add('hidden');
    }

    // --- AVVIO APP ---
    main();

    // Funzioni non ancora implementate ma richieste in passato
    // function renderStatsPage() { app.innerHTML = `<h2>Statistiche in costruzione...</h2>`; }
    // function startMistakesSession() { alert("Modalità ripasso errori in costruzione."); }
});
