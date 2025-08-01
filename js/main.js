document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTI DEL DOM E STATO ---
    const app = document.getElementById('app');
    let allQuestions = [];
    let userProgress = {};

    // --- INIZIALIZZAZIONE ---
    async function main() {
        app.innerHTML = '<div class="loader"></div>';
        await loadQuestions();
        loadUserProgress();
        renderDashboard();
    }

    async function loadQuestions() {
        try {
            const response = await fetch('data/questions.json');
            allQuestions = await response.json();
        } catch (error) {
            app.innerHTML = '<p>Errore nel caricamento delle domande. Riprova più tardi.</p>';
            console.error(error);
        }
    }

    function loadUserProgress() {
        const saved = localStorage.getItem('anatomyLingoProgress');
        if (saved) {
            userProgress = JSON.parse(saved);
        } else {
            userProgress = { xp: 0, questionStats: {} };
        }
    }

    function saveProgress() {
        localStorage.setItem('anatomyLingoProgress', JSON.stringify(userProgress));
    }
    
    // --- FUNZIONI DI RENDER ---

    // 1. DASHBOARD PRINCIPALE
    function renderDashboard() {
        app.innerHTML = `
            <div class="dashboard-grid">
                <div class="dashboard-card" id="start-new-lesson">
                    <i class="fa-solid fa-rocket"></i>
                    Inizia Nuova Lezione
                </div>
                <div class="dashboard-card" id="review-mistakes">
                    <i class="fa-solid fa-circle-check"></i>
                    Ripassa i tuoi Errori
                </div>
                <div class="dashboard-card" id="view-stats">
                    <i class="fa-solid fa-chart-pie"></i>
                    Visualizza Risultati
                </div>
                <div class="dashboard-card" id="practice-mode">
                    <i class="fa-solid fa-dumbbell"></i>
                    Modalità Allenamento
                </div>
            </div>
            <div class="search-container">
                <h3><i class="fa-solid fa-magnifying-glass"></i> Cerca un Argomento</h3>
                <input type="text" id="search-input" placeholder="Es: laringe, cricotiroideo...">
                <div id="search-results"></div>
            </div>
        `;

        // Event Listeners
        document.getElementById('start-new-lesson').addEventListener('click', () => startLesson(allQuestions));
        document.getElementById('review-mistakes').addEventListener('click', startMistakesSession);
        document.getElementById('view-stats').addEventListener('click', renderStatsPage);
        document.getElementById('search-input').addEventListener('input', handleSearch);
    }
    
    // 2. STATISTICHE UTENTE
    function renderStatsPage() {
        const statsByMacroArea = {};

        // Aggrega i dati
        for (const qId in userProgress.questionStats) {
            const question = allQuestions.find(q => q.id == qId);
            if (question) {
                const area = question.macro_area;
                if (!statsByMacroArea[area]) {
                    statsByMacroArea[area] = { correct: 0, incorrect: 0, total: 0 };
                }
                const stats = userProgress.questionStats[qId];
                statsByMacroArea[area].correct += stats.correct || 0;
                statsByMacroArea[area].incorrect += stats.incorrect || 0;
                statsByMacroArea[area].total += (stats.correct || 0) + (stats.incorrect || 0);
            }
        }
        
        let statsHTML = '<h2><i class="fa-solid fa-chart-pie"></i> I Tuoi Risultati</h2>';
        for (const area in statsByMacroArea) {
            if (statsByMacroArea[area].total > 0) {
                const percentage = Math.round((statsByMacroArea[area].correct / statsByMacroArea[area].total) * 100);
                statsHTML += `
                    <div class="stat-item">
                        <div class="stat-item-header">
                            <span>${area}</span>
                            <span>${percentage}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-bar-inner" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
            }
        }

        if (Object.keys(statsByMacroArea).length === 0) {
            statsHTML += '<p>Non hai ancora completato nessuna domanda. Inizia una lezione!</p>';
        }

        app.innerHTML = statsHTML;
    }

    // 3. RICERCA LIVE
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }

        const filteredQuestions = allQuestions.filter(q => 
            q.question.toLowerCase().includes(query) ||
            q.explanation.toLowerCase().includes(query)
        );

        let resultsHTML = '';
        filteredQuestions.slice(0, 5).forEach(q => { // Mostra max 5 risultati
            resultsHTML += `
                <div class="search-result-item">
                    <p class="question">${q.question}</p>
                    <p class="answer"><strong>Risposta:</strong> ${q.answer}</p>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;
    }


    // --- LOGICA DI GIOCO ---

    function startLesson(questionPool) {
        // Prendi 5 domande a caso dal pool fornito
        const lessonQuestions = questionPool.sort(() => 0.5 - Math.random()).slice(0, 5);
        if(lessonQuestions.length > 0) {
            renderQuestion(lessonQuestions, 0);
        } else {
            alert("Complimenti, non hai più domande in questa modalità!");
            renderDashboard();
        }
    }

    function startMistakesSession() {
        const mistakenQuestionsIds = Object.keys(userProgress.questionStats)
            .filter(qId => userProgress.questionStats[qId].incorrect > 0);
        
        const questionPool = allQuestions.filter(q => mistakenQuestionsIds.includes(q.id.toString()));
        startLesson(questionPool);
    }
    
    function renderQuestion(questions, index) {
        // ... Logica per mostrare la domanda corrente.
        // Questa è la parte più complessa da creare, con la UI per i bottoni, risposte aperte etc.
        // Placeholder:
        const q = questions[index];
        app.innerHTML = `
            <div class="lesson-container">
                <p>Domanda ${index + 1} di ${questions.length}</p>
                <h2 class="question-text">${q.question}</h2>
                <!-- Qui andranno i bottoni per le risposte, o un campo di testo -->
                <button class="option-btn" onclick="alert('Logica da implementare')">${q.options ? q.options[0] : 'Opzione A'}</button>
            </div>
        `;
    }

    // Esempio di come aggiornare le statistiche al check della risposta
    function checkAnswer(question, userAnswer) {
        // ... (La tua logica di valutazione)
        const isCorrect = userAnswer === question.answer; // Semplificazione

        if (!userProgress.questionStats[question.id]) {
            userProgress.questionStats[question.id] = { correct: 0, incorrect: 0 };
        }
        
        if (isCorrect) {
            userProgress.questionStats[question.id].correct++;
            userProgress.xp += 10;
        } else {
            userProgress.questionStats[question.id].incorrect++;
        }
        saveProgress();

        // Mostra il feedback
        // Passa alla domanda successiva o termina la lezione
    }


    // --- AVVIO DELL'APP ---
    main();

});
