// --- DOM Element References ---
const homeContainer = document.getElementById('home-container');
const quizContainer = document.getElementById('quiz-container');
const startQuizBtn = document.getElementById('start-quiz-btn');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');
const nextBtn = document.getElementById('next-btn');

// --- Audio Elements ---
const correctSound = document.getElementById('correct-sound');
const incorrectSound = document.getElementById('incorrect-sound');

// --- Quiz State ---
let shuffledQuestions, currentQuestionIndex;

// --- Questions Data ---
// For a real application, you would fetch this from a questions.json file
// using `fetch('questions.json').then(res => res.json()).then(data => { ... });`
const questions = [
  {
    question: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink and Text Markup Language", "Home Tool Markup Language"],
    answer: "Hyper Text Markup Language"
  },
  {
    question: "Which CSS property is used to change the text color of an element?",
    options: ["font-color", "text-color", "color", "font-style"],
    answer: "color"
  },
  {
    question: "What is the correct syntax to link an external script called 'script.js'?",
    options: ["<script href='script.js'>", "<script name='script.js'>", "<script src='script.js'>", "<link rel='script' href='script.js'>"],
    answer: "<script src='script.js'>"
  },
    {
    question: "Which of the following is NOT a JavaScript data type?",
    options: ["String", "Number", "Boolean", "Float"],
    answer: "Float"
  }
];

// --- Event Listeners ---
startQuizBtn.addEventListener('click', startGame);
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    setNextQuestion();
});

// --- Functions ---

/**
 * Starts the quiz: hides the home screen, shows the quiz container,
 * shuffles the questions, and displays the first one.
 */
function startGame() {
    homeContainer.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    // Shuffle questions so they appear in a random order each time
    shuffledQuestions = questions.sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    setNextQuestion();
}

/**
 * Resets the state and displays the next question in the shuffled list.
 */
function setNextQuestion() {
    resetState();
    if (currentQuestionIndex < shuffledQuestions.length) {
        showQuestion(shuffledQuestions[currentQuestionIndex]);
    } else {
        // Quiz is over
        questionText.innerText = "Quiz Completed!";
        answerButtons.innerHTML = ""; // Clear buttons
        nextBtn.classList.add('hidden');
        // Add a "Restart" button
        const restartBtn = document.createElement('button');
        restartBtn.innerText = 'Restart Quiz';
        restartBtn.classList.add('btn', 'btn-primary');
        restartBtn.addEventListener('click', startGame);
        answerButtons.appendChild(restartBtn);
    }
}

/**
 * Populates the UI with the current question and its answer options.
 * @param {object} question - The question object with text, options, and answer.
 */
function showQuestion(question) {
    questionText.innerText = question.question;
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option;
        button.classList.add('btn');
        // Add click event listener to check the answer
        button.addEventListener('click', selectAnswer);
        answerButtons.appendChild(button);
    });
}

/**
 * Resets the UI for the next question.
 */
function resetState() {
    nextBtn.classList.add('hidden');
    while (answerButtons.firstChild) {
        answerButtons.removeChild(answerButtons.firstChild);
    }
}

/**
 * Handles the logic when a user clicks an answer button.
 * @param {Event} e - The click event from the button.
 */
function selectAnswer(e) {
    const selectedButton = e.target;
    const correct = selectedButton.innerText === shuffledQuestions[currentQuestionIndex].answer;

    // Play sound and apply visual feedback
    if (correct) {
        correctSound.play();
        selectedButton.classList.add('correct');
    } else {
        incorrectSound.play();
        selectedButton.classList.add('wrong');
    }
    
    // Disable all buttons and show the correct answer
    Array.from(answerButtons.children).forEach(button => {
        setStatusClass(button, button.innerText === shuffledQuestions[currentQuestionIndex].answer);
        button.disabled = true; // Prevent changing answer
    });
    
    // Show the 'Next' button
    if (shuffledQuestions.length > currentQuestionIndex + 1) {
        nextBtn.classList.remove('hidden');
    } else {
        // This is the last question, show "Restart" after a delay
        setTimeout(() => {
            setNextQuestion(); // This will trigger the end-of-quiz logic
        }, 1500); // Wait 1.5 seconds before showing restart
    }
}

/**
 * Applies the 'correct' or 'wrong' class to a button.
 * @param {HTMLElement} element - The button element.
 * @param {boolean} correct - A boolean indicating if the answer is correct.
 */
function setStatusClass(element, correct) {
    // Clear any existing status classes
    element.classList.remove('correct');
    element.classList.remove('wrong');
    if (correct) {
        element.classList.add('correct');
    }
}
