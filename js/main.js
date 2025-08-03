document.addEventListener('DOMContentLoaded', () => {

    const App = {
        state: {
            questions: [],
            currentQuestionIndex: 0,
            score: 0,
            totalQuestions: 0,
            currentView: 'quiz',
        },

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

        SoundEngine: {
            audioContext: null,
            init() {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            },
            _playTone(frequency, type = 'sine', duration = 0.2) {
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
            playCorrect() { this._playTone(523.25, 'sine', 0.15); setTimeout(() => this._playTone(783.99, 'sine', 0.2), 100); },
            playWrong() { this._playTone(130.81, 'sawtooth', 0.3); }
        },

        methods: {
            startQuiz() {
                App.state.questions = [...App.database].sort(() => Math.random() - 0.5);
                App.state.currentQuestionIndex = 0;
                App.state.score = 0;
                App.state.totalQuestions = App.state.questions.length;
                App.methods.switchView('quiz');
                App.methods.showQuestion();
            },

            switchView(viewName) {
                App.state.currentView = viewName;
                if (App.state.currentView === 'quiz') {
                    App.elements.quizContainer.classList.add('active');
                    App.elements.resultContainer.classList.remove('active');
                } else {
                    App.elements.quizContainer.classList.remove('active');
                    App.elements.resultContainer.classList.add('active');
                }
            },
            
            showQuestion() {
                if (App.state.currentQuestionIndex >= App.state.totalQuestions) {
                    App.methods.showResult();
                    return;
                }
                
                App.elements.feedbackContainer.textContent = '';
                App.elements.feedbackContainer.className = 'feedback';
                App.elements.optionsContainer.innerHTML = '';
                App.elements.nextButton.style.display = 'none';

                const currentQuestion = App.state.questions[App.state.currentQuestionIndex];
                App.elements.questionContainer.textContent = currentQuestion.question;

                currentQuestion.options.forEach(optionText => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'option';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = 'option';
                    input.value = optionText;
                    input.id = `option-${App.state.currentQuestionIndex}-${optionText.replace(/\s+/g, '')}`;
                    const label = document.createElement('label');
                    label.htmlFor = input.id;
                    label.textContent = optionText;
                    wrapper.appendChild(input);
                    wrapper.appendChild(label);
                    App.elements.optionsContainer.appendChild(wrapper);
                });

                App.methods.updateScoreDisplay();
            },
            
            processAnswer(selectedValue) {
                const currentQuestion = App.state.questions[App.state.currentQuestionIndex];
                const isCorrect = selectedValue === currentQuestion.answer;
                
                App.elements.optionsContainer.querySelectorAll('input').forEach(input => input.disabled = true);
                
                if (isCorrect) {
                    App.state.score++;
                    App.SoundEngine.playCorrect();
                    App.elements.optionsContainer.querySelector(`input[value="${CSS.escape(selectedValue)}"]`).parentElement.classList.add('correct');
                    App.elements.feedbackContainer.textContent = `Corretto! ${currentQuestion.explanation}`;
                    App.elements.feedbackContainer.className = 'feedback correct-feedback';
                } else {
                    App.SoundEngine.playWrong();
                    App.elements.optionsContainer.querySelector(`input[value="${CSS.escape(selectedValue)}"]`).parentElement.classList.add('incorrect');
                    App.elements.optionsContainer.querySelector(`input[value="${CSS.escape(currentQuestion.answer)}"]`).parentElement.classList.add('correct');
                    App.elements.feedbackContainer.textContent = `Sbagliato. ${currentQuestion.explanation}`;
                    App.elements.feedbackContainer.className = 'feedback incorrect-feedback';
                }

                App.methods.updateScoreDisplay();
                App.elements.nextButton.style.display = 'block';
            },


            updateScoreDisplay() {
                App.elements.scoreContainer.textContent = `Punteggio: ${App.state.score} / ${App.state.totalQuestions}`;
            },

            showResult() {
                App.methods.switchView('result');
                const percentage = App.state.totalQuestions > 0 ? (App.state.score / App.state.totalQuestions) * 100 : 0;
                App.elements.finalScoreContainer.innerHTML = `Il tuo punteggio finale è ${App.state.score} su ${App.state.totalQuestions} (${percentage.toFixed(1)}%).`;
            },

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

        init() {
            // Check if all necessary elements exist before starting
            const requiredElements = Object.values(this.elements);
            if (requiredElements.some(el => el === null)) {
                console.error("CRITICAL ERROR: One or more HTML elements are missing. Check IDs in index.html.");
                return; // Stop the app from running
            }
            this.SoundEngine.init();
            this.methods.bindEvents();
            this.methods.startQuiz();
        }
    };

    App.init();

});
