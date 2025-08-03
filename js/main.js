// PART 1/3: CORE LOGIC REFACTOR

document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE ---
    // Storing questions in a structured, readable format.
    const questions = [
        // Your questions will go here. For this example, I'll use two.
        // NOTE: I've standardized the 'answer' field. It will ALWAYS be the direct, correct value.
        // For multiple choice, it's the full text of the answer. For true/false, it's "Vero" or "Falso".
        {
            "id": 1,
            "type": "multiple_choice",
            "question": "Che tipo di suono si produce quando gli armonici acuti sono predominanti in un suono grave?",
            "options": [
                "Un suono ovattato e spento",
                "Un suono squillante o brillante anche nelle note basse",
                "Un suono debole e sibilante",
                "Un suono rauco o sforzato"
            ],
            "answer": "Un suono squillante o brillante anche nelle note basse",
            "explanation": "Quando gli armonici acuti predominano in un suono grave, il timbro risultante è ricco e brillante. Questo effetto si ottiene perché le alte frequenze amplificano la percezione del suono, rendendolo più proiettato e presente, anche se la frequenza fondamentale rimane bassa."
        },
        {
            "id": 2,
            "type": "true_false",
            "question": "La respirazione diaframmatica è visibile principalmente attraverso il sollevamento delle spalle.",
            "options": ["Vero", "Falso"],
            "answer": "Falso",
            "explanation": "È il contrario. La respirazione diaframmatica corretta è caratterizzata da un'espansione visibile dell'addome e della zona lombare, mentre le spalle e il torace rimangono rilassati e stabili."
        }
    ];

    // --- DOM ELEMENTS ---
    // Caching DOM elements for performance and cleaner code.
    const questionContainer = document.getElementById('question-container');
    const optionsContainer = document.getElementById('options-container');
    const feedbackContainer = document.getElementById('feedback');
    const nextButton = document.getElementById('next-btn');
    const scoreContainer = document.getElementById('score');
    const finalScoreContainer = document.getElementById('final-score');
    const quizContainer = document.querySelector('.quiz-container');
    const resultContainer = document.querySelector('.result-container');

    // --- APPLICATION STATE ---
    // A single source of truth for the quiz state. This is a much cleaner pattern.
    let state = {
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        totalQuestions: 0
    };

    // --- FUNCTIONS ---

    /**
     * Initializes and starts the quiz.
     * This function sets up the initial state of the application.
     */
    function startQuiz() {
        // Shuffle the questions for variety each time the quiz is taken.
        state.questions = [...questions].sort(() => Math.random() - 0.5);
        state.currentQuestionIndex = 0;
        state.score = 0;
        state.totalQuestions = state.questions.length; // Set total questions ONCE.
        
        quizContainer.style.display = 'block';
        resultContainer.style.display = 'none';

        showQuestion();
    }

    /**
     * Displays the current question and its options.
     * This function is responsible for rendering the UI for the current question.
     */
    function showQuestion() {
        // Clear previous state
        feedbackContainer.textContent = '';
        feedbackContainer.className = 'feedback'; // Reset feedback style
        optionsContainer.innerHTML = '';
        nextButton.style.display = 'none'; // Hide next button until an answer is given

        if (state.currentQuestionIndex >= state.totalQuestions) {
            showResult();
            return;
        }
        
        const currentQuestion = state.questions[state.currentQuestionIndex];
        questionContainer.textContent = currentQuestion.question;

        // Create option buttons/inputs dynamically
        currentQuestion.options.forEach(optionText => {
            const wrapper = document.createElement('div');
            wrapper.className = 'option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'option';
            input.value = optionText; // CRITICAL FIX: The value is the text itself.
            input.id = optionText.replace(/\s+/g, '-').toLowerCase(); // Create a unique ID

            const label = document.createElement('label');
            label.htmlFor = input.id;
            label.textContent = optionText;

            wrapper.appendChild(input);
            wrapper.appendChild(label);
            optionsContainer.appendChild(wrapper);
        });

        updateScoreDisplay();
    }
    
    /**
     * Updates the score display on the screen.
     */
    function updateScoreDisplay() {
        scoreContainer.textContent = `Punteggio: ${state.score} / ${state.totalQuestions}`;
    }

    /**
     * Displays the final result of the quiz.
     */
    function showResult() {
        quizContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        const percentage = state.totalQuestions > 0 ? (state.score / state.totalQuestions) * 100 : 0;
        finalScoreContainer.innerHTML = `Hai completato il quiz!<br>Il tuo punteggio finale è ${state.score} su ${state.totalQuestions} (${percentage.toFixed(1)}%).`;
    }

    // --- INITIALIZATION ---
    startQuiz();
});

// PART 2/3: SOUND ENGINE & IMMEDIATE FEEDBACK LOGIC

    /**
     * A self-contained sound engine using the Web Audio API.
     * This has no external dependencies and will never break.
     */
    const SoundEngine = {
        audioContext: new (window.AudioContext || window.webkitAudioContext)(),

        // Creates a tone and plays it for a short duration.
        _playTone: function(frequency, type = 'sine', duration = 0.2) {
            if (!this.audioContext) return;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime); // Start with volume
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration); // Fade out

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
        },

        // Plays a pleasant, rising two-tone sound for correct answers.
        playCorrect: function() {
            this._playTone(440); // Play 'A'
            setTimeout(() => this._playTone(660), 100); // Play 'E' shortly after
        },

        // Plays a low, dissonant buzz for incorrect answers.
        playWrong: function() {
            this._playTone(160, 'sawtooth', 0.3);
        }
    };
    
    /**
     * Processes the user's selected answer.
     * This is the core of the immediate feedback system.
     * @param {string} selectedValue - The value of the option the user selected.
     */
    function processAnswer(selectedValue) {
        const currentQuestion = state.questions[state.currentQuestionIndex];
        const isCorrect = selectedValue === currentQuestion.answer;
        
        // Disable all inputs to prevent changing the answer
        const allOptions = optionsContainer.querySelectorAll('input[name="option"]');
        allOptions.forEach(input => input.disabled = true);
        
        const selectedInput = optionsContainer.querySelector(`input[value="${selectedValue}"]`);
        const selectedLabel = selectedInput ? selectedInput.parentElement : null;

        if (isCorrect) {
            state.score++;
            SoundEngine.playCorrect();
            if (selectedLabel) {
                selectedLabel.classList.add('correct');
            }
            feedbackContainer.className = 'feedback correct-feedback';
            feedbackContainer.textContent = `Corretto! ${currentQuestion.explanation}`;
        } else {
            SoundEngine.playWrong();
            if (selectedLabel) {
                selectedLabel.classList.add('incorrect');
            }
            
            // Highlight the correct answer for learning
            const correctInput = optionsContainer.querySelector(`input[value="${currentQuestion.answer}"]`);
            const correctLabel = correctInput ? correctInput.parentElement : null;
            if(correctLabel){
                correctLabel.classList.add('correct');
            }

            feedbackContainer.className = 'feedback incorrect-feedback';
            feedbackContainer.textContent = `Sbagliato. ${currentQuestion.explanation}`;
        }

        updateScoreDisplay();
        nextButton.style.display = 'block'; // Show the "Next" button
    }
    
    // --- EVENT LISTENERS ---

    // Event Delegation: Listen for changes on the container for efficiency.
    optionsContainer.addEventListener('change', (event) => {
        if (event.target.name === 'option') {
            processAnswer(event.target.value);
        }
    });

    nextButton.addEventListener('click', () => {
        state.currentQuestionIndex++;
        showQuestion();
    });

// ===================================================================================
// Project: VOCE VIVA - Learning Engine
// Version: 1.0 (Refactored)
// Author: Leo & Gemini (Senior Full Stack Web Developer)
//
// DESCRIPTION:
// This script creates a self-contained, robust, and interactive quiz application.
// It features immediate feedback, a dependency-free sound engine via the Web Audio API,
// and a state-driven architecture for clean, maintainable, and scalable code.
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // --- 1. STATE ---
        // A single source of truth for the entire application's state.
        state: {
            questions: [],
            currentQuestionIndex: 0,
            score: 0,
            totalQuestions: 0,
            currentView: 'quiz', // Can be 'quiz' or 'result'
        },

        // --- 2. DATABASE ---
        // The collection of "Learning Atoms". Standardized for easy processing.
        database: [
            {
                "id": 1,
                "type": "multiple_choice",
                "question": "Che tipo di suono si produce quando gli armonici acuti sono predominanti in un suono grave?",
                "options": [
                    "Un suono ovattato e spento",
                    "Un suono squillante o brillante anche nelle note basse",
                    "Un suono debole e sibilante",
                    "Un suono rauco o sforzato"
                ],
                "answer": "Un suono squillante o brillante anche nelle note basse",
                "explanation": "Quando gli armonici acuti predominano in un suono grave, il timbro risultante è ricco e brillante. Questo effetto si ottiene perché le alte frequenze amplificano la percezione del suono, rendendolo più proiettato e presente."
            },
            {
                "id": 2,
                "type": "true_false",
                "question": "La respirazione diaframmatica è visibile principalmente attraverso il sollevamento delle spalle.",
                "options": ["Vero", "Falso"],
                "answer": "Falso",
                "explanation": "È il contrario. La respirazione diaframmatica corretta è caratterizzata da un'espansione visibile dell'addome, mentre le spalle e il torace rimangono rilassati e stabili."
            }
        ],

        // --- 3. CACHED DOM ELEMENTS ---
        // Caching elements for high performance and clean access.
        elements: {
            questionContainer: document.getElementById('question-container'),
            optionsContainer: document.getElementById('options-container'),
            feedbackContainer: document.getElementById('feedback'),
            nextButton: document.getElementById('next-btn'),
            scoreContainer: document.getElementById('score'),
            finalScoreContainer: document.getElementById('final-score'),
            quizContainer: document.querySelector('.quiz-container'),
            resultContainer: document.querySelector('.result-container'),
            restartButton: document.getElementById('restart-btn')
        },

        // --- 4. SOUND ENGINE (Dependency-Free) ---
        SoundEngine: {
            audioContext: new (window.AudioContext || window.webkitAudioContext)(),
            _playTone: function(frequency, type = 'sine', duration = 0.2) {
                if (!this.audioContext) return;
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration);
            },
            playCorrect: function() {
                this._playTone(523.25, 'sine', 0.15); // C5
                setTimeout(() => this._playTone(783.99, 'sine', 0.2), 100); // G5
            },
            playWrong: function() {
                this._playTone(130.81, 'sawtooth', 0.3); // C3
            }
        },

        // --- 5. METHODS ---
        // All the functions that power the application.
        methods: {
            /**
             * Initializes or resets the quiz.
             */
            startQuiz() {
                App.state.questions = [...App.database].sort(() => Math.random() - 0.5);
                App.state.currentQuestionIndex = 0;
                App.state.score = 0;
                App.state.totalQuestions = App.state.questions.length;
                App.state.currentView = 'quiz';
                
                App.methods.renderView();
                App.methods.showQuestion();
            },

            /**
             * Renders the correct view ('quiz' or 'result') with a smooth transition.
             */
            renderView() {
                if (App.state.currentView === 'quiz') {
                    App.elements.quizContainer.classList.add('active');
                    App.elements.resultContainer.classList.remove('active');
                } else {
                    App.elements.quizContainer.classList.remove('active');
                    App.elements.resultContainer.classList.add('active');
                }
            },
            
            /**
             * Displays the current question and options.
             */
            showQuestion() {
                App.elements.feedbackContainer.textContent = '';
                App.elements.feedbackContainer.className = 'feedback';
                App.elements.optionsContainer.innerHTML = '';
                App.elements.nextButton.style.display = 'none';

                if (App.state.currentQuestionIndex >= App.state.totalQuestions) {
                    App.methods.showResult();
                    return;
                }
                
                const currentQuestion = App.state.questions[App.state.currentQuestionIndex];
                App.elements.questionContainer.textContent = currentQuestion.question;

                currentQuestion.options.forEach(optionText => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'option';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = 'option';
                    input.value = optionText;
                    input.id = optionText.replace(/\s+/g, '-').toLowerCase();
                    const label = document.createElement('label');
                    label.htmlFor = input.id;
                    label.textContent = optionText;
                    wrapper.appendChild(input);
                    wrapper.appendChild(label);
                    App.elements.optionsContainer.appendChild(wrapper);
                });

                App.methods.updateScoreDisplay();
            },
            
            /**
             * Processes the selected answer, providing immediate feedback.
             */
            processAnswer(selectedValue) {
                const currentQuestion = App.state.questions[App.state.currentQuestionIndex];
                const isCorrect = selectedValue === currentQuestion.answer;
                
                App.elements.optionsContainer.querySelectorAll('input').forEach(input => input.disabled = true);
                
                if (isCorrect) {
                    App.state.score++;
                    App.SoundEngine.playCorrect();
                    App.elements.optionsContainer.querySelector(`input[value="${selectedValue}"]`).parentElement.classList.add('correct');
                    App.elements.feedbackContainer.textContent = `Corretto! ${currentQuestion.explanation}`;
                    App.elements.feedbackContainer.className = 'feedback correct-feedback';
                } else {
                    App.SoundEngine.playWrong();
                    App.elements.optionsContainer.querySelector(`input[value="${selectedValue}"]`).parentElement.classList.add('incorrect');
                    App.elements.optionsContainer.querySelector(`input[value="${currentQuestion.answer}"]`).parentElement.classList.add('correct');
                    App.elements.feedbackContainer.textContent = `Sbagliato. ${currentQuestion.explanation}`;
                    App.elements.feedbackContainer.className = 'feedback incorrect-feedback';
                }

                App.methods.updateScoreDisplay();
                App.elements.nextButton.style.display = 'block';
            },

            /**
             * Updates the persistent score display.
             */
            updateScoreDisplay() {
                App.elements.scoreContainer.textContent = `Punteggio: ${App.state.score} / ${App.state.totalQuestions}`;
            },

            /**
             * Displays the final result screen.
             */
            showResult() {
                App.state.currentView = 'result';
                App.methods.renderView();
                const percentage = App.state.totalQuestions > 0 ? (App.state.score / App.state.totalQuestions) * 100 : 0;
                App.elements.finalScoreContainer.innerHTML = `Hai completato il quiz!<br>Il tuo punteggio finale è ${App.state.score} su ${App.state.totalQuestions} (${percentage.toFixed(1)}%).`;
            },

            /**
             * Attaches all necessary event listeners.
             */
            bindEvents() {
                App.elements.optionsContainer.addEventListener('change', (event) => {
                    if (event.target.name === 'option') {
                        App.methods.processAnswer(event.target.value);
                    }
                });

                App.elements.nextButton.addEventListener('click', () => {
                    App.state.currentQuestionIndex++;
                    App.methods.showQuestion();
                });

                App.elements.restartButton.addEventListener('click', () => {
                    App.methods.startQuiz();
                });
            }
        },

        // --- 6. INITIALIZATION ---
        init() {
            console.log('VOCE VIVA Engine Initialized.');
            this.methods.bindEvents();
            this.methods.startQuiz();
        }
    };

    // Kick off the entire application.
    App.init();
});
