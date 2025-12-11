/* app.js
   Головна логіка платформи: завантажує Pyodide, підключає tester.py, ініціалізує редактор,
   обробник запуску і перевірки, зберігає прогрес в localStorage, генерує PDF.
*/

// Утиліти DOM
const $ = id => document.getElementById(id);

// Глобальні змінні стану
let editor;
let pyodide;
let TASKS = [];
let LESSONS = [];
let ADDITIONAL_MATERIALS= { add_materials: [] };
let PRACTICE_VIEW_MODE = 'byLesson';
let MESSAGES = [];
let CURRENT_TASK_ID = 'T1';
let USER_PROGRESS = {}; // { taskId: { code: '...', done: true, hintUsed: false } }
let CODE_MIRROR_THEME = localStorage.getItem('theme') || 'mnkai'; // Default theme
let CRIBS_DATA = { cribs: [] }; // Глобальна змінна для cribs.json
const COURSE_TITLE = 'Python Basics';
const CODE_MIRROR_THEMES = ['mnkai', 'darker', 'drakas', 'light-code'];

let EXPANDED_LESSONS = new Set(); // Зберігає ID розгорнутих уроків


/*
    ---------------------------------
    Логіка змін основних тем на сайті
*/
const btn = document.getElementById("themeToggle");
const pageThemes = ["default", "yellow", "light-green", "light-blue"];
let indexPageThemes = 0;

// Назва теми сайту для відображення
const PAGE_THEME_NAMES = {
    'default': 'default 🌙',
    'yellow': 'yellow 🌙',
    'light-green': 'light-green ☀️',
    'light-blue': 'light-blue ☀️',
};

function applyPageTheme() {
    const body = document.body;
    const currentTheme = pageThemes[indexPageThemes];
    // Прибираємо всі теми
    body.classList.remove("yellow", "light-green", "light-blue");
    if (pageThemes[indexPageThemes] !== "default") {
        body.classList.add(pageThemes[indexPageThemes]);
    }
    // Збереження у LocalStorage
    localStorage.setItem("pageTheme", pageThemes[indexPageThemes]);

    const toggleButton = document.getElementById("pageThemeToggle");
    if (toggleButton) {
        // Використовуємо відповідне ім'я теми з об'єкта PAGE_THEME_NAMES
        toggleButton.textContent = PAGE_THEME_NAMES[currentTheme];
    }
}

document.getElementById("pageThemeToggle").onclick = function () {
    indexPageThemes = (indexPageThemes + 1) % pageThemes.length;
    applyPageTheme();
};

// Завантаження теми при старті
(function () {
    const saved = localStorage.getItem("pageTheme");
    indexPageThemes = pageThemes.indexOf(saved);
    if (indexPageThemes === -1) indexPageThemes = 0;
    applyPageTheme();
})();

/*  
    Логіка змін основних тем на сайті
    ---------------------------------
*/


// Назва теми кодингу для відображення
const THEME_NAMES = {
    'mnkai': 'mnkai 🌙',
    'darker': 'darker 🌙',
    'drakas': 'drakas 🌙',
    'light-code': 'light-code ☀️'

};

/* --------------------------------
   Local Storage
   -------------------------------- */

function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('pyTrainerProgress');
        if (savedProgress) {
            USER_PROGRESS = JSON.parse(savedProgress);
        }
    } catch (e) {
        console.error("Помилка завантаження прогресу:", e);
    }
}

function saveCurrentCode() {
    if (!CURRENT_TASK_ID || !editor) return;
    const currentCode = editor.getValue();
    USER_PROGRESS[CURRENT_TASK_ID] = USER_PROGRESS[CURRENT_TASK_ID] || {};
    USER_PROGRESS[CURRENT_TASK_ID].code = currentCode;
    saveProgress();
}

function saveProgress() {
    localStorage.setItem('pyTrainerProgress', JSON.stringify(USER_PROGRESS));
    renderProgress();
    renderSidebar();
}

/* --------------------------------
   Pyodide & Execution
   -------------------------------- */

async function initPyodide() {
    $('pyodideStatus').textContent = '(Pyodide: Initializing...)';
    try {
        pyodide = await loadPyodide({ indexURL: "./packages/" }); // ДЛЯ РОБОТИ ОФЛАЙН
        // повний офлайн файли: python_stdlib.zip, pyodide.asm.js, pyodide.asm.wasm, pyodide.data, pyodide-lock.json
        // pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" }); // ДЛЯ РОБОТИ ОНЛАЙН
        // Завантажуємо tester.py як модуль, щоб використовувати його функції
        
        /* ---
        Приклад підключення біблиотек у випадку такої помилки
            ModuleNotFoundError: The module 'numpy' is included in the Pyodide distribution, but it is not installed.
            You can install it by calling:
              await micropip.install("numpy") in Python, or
              await pyodide.loadPackage("numpy") in JavaScript

        Необхідно у файлі pyodide-lock.json знайти основний модуль таким чином - "pandas":
            потім взяти його .whl (Wheel) - pandas-1.5.3-cp311-cp311-emscripten_3_1_45_wasm32.whl
            вставити це після https://cdn.jsdelivr.net/pyodide/v0.24.1/full/ в браузері і скачати бібліотеку
            подивитись "depends": у файлі pyodide-lock.json і скачати .whl для кожної з бібліотек
                подивитись по принципу "pandas": залежності кожної з підбібліотек і завантижити їх теж

            .tar (Tarball) не треба скачувати
        */
        $('pyodideStatus').textContent = '(Pyodide: Loading numpy...)';
        await pyodide.loadPackage("numpy");
        /* --- */

        $('pyodideStatus').textContent = '(Pyodide: Loading pandas...)';
        await pyodide.loadPackage("pandas");
        /* --- */

        /*
        $('pyodideStatus').textContent = '(Pyodide: Loading scipy...)';
        await pyodide.loadPackage("scipy");
         --- */

        /*
        $('pyodideStatus').textContent = '(Pyodide: Loading matplotlib...)';
        await pyodide.loadPackage("matplotlib");
         --- */

        // Завантажуємо tester.py як модуль
        const response = await fetch('tester.py');
        const testerCode = await response.text();
        await pyodide.runPythonAsync(testerCode);

        $('pyodideStatus').textContent = '(Pyodide: Ready)';
    } catch (e) {
        // ... Обробка помилок
        $('pyodideStatus').textContent = '(Pyodide: Error!)';
        $('output').textContent = `Помилка завантаження Pyodide: ${e}`;
        console.error("Помилка ініціалізації Pyodide:", e);
        // Блокуємо кнопки
        $('runBtn').disabled = $('checkBtn').disabled = true;
    }
}

async function runUserCode(code) {
    if (!pyodide) return "Error: Pyodide not loaded.";
    $('output').textContent = 'Running...';
    
    // Викликаємо функцію Python, визначену в tester.py
    const run_user_code = pyodide.globals.get('run_user_code');
    const result = await run_user_code(code);
    
    return result;
}

async function runTestsForTask(task, code) {
    if (!pyodide) return { passed: false, results: [{ ok: false, output: 'Pyodide not ready.' }] };
    
    const tests = pyodide.toPy(task.tests);
    const run_tests = pyodide.globals.get('run_tests');
    
    // Викликаємо функцію Python
    const pyResult = await run_tests(code, tests);
    const results = pyResult.toJs();
    pyResult.destroy();
    tests.destroy();
    
    const allPassed = Array.from(results).every(r => r.get('ok'));
    
    return { passed: allPassed, results: results };
}

/* --------------------------------
   Editor & Theme
   -------------------------------- */

function initEditor() {
    // Встановлюємо початковий вміст з прихованого textarea
    $('plaintextEditor').value = TASKS[0]?.starter || '# Оберіть завдання';
    
    editor = CodeMirror.fromTextArea($('plaintextEditor'), {

        mode: { name: "python", version: 3, singleLineStringErrors: false },
        theme: CODE_MIRROR_THEME,
        lineNumbers: true,
        tabSize: 4,
        indentUnit: 4,
        matchBrackets: true,
        autoCloseBrackets: true,
        theme: CODE_MIRROR_THEME,
        extraKeys: {
            'Tab': 'indentMore', 
            'Shift-Tab': 'indentLess',
            "Ctrl-Space": "autocomplete"
        }

    });

    // CodeMirror: Обробка зміни вмісту для автозбереження
    editor.on('change', saveCurrentCode);
}

function initThemeToggle() {
    // Перевіряємо, чи існує збережена тема, і застосовуємо її
    const currentTheme = localStorage.getItem('theme') || 'mnkai';
    setTheme(currentTheme);

    $('themeToggle').addEventListener('click', () => {
        let currentIndex = CODE_MIRROR_THEMES.indexOf(CODE_MIRROR_THEME);
        currentIndex = (currentIndex + 1) % CODE_MIRROR_THEMES.length;
        const newTheme = CODE_MIRROR_THEMES[currentIndex];
        
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    CODE_MIRROR_THEME = theme;
    editor.setOption('theme', theme);
    localStorage.setItem('theme', theme);

    // Зміна стилів для світлої/темної теми для UI
    if (theme === 'default') {
        document.body.classList.add('light-code');
        $('themeToggle').textContent = THEME_NAMES.default;
    } else {
        document.body.classList.remove('light-code');
        $('themeToggle').textContent = THEME_NAMES[theme] || '';
    }
}

/* --------------------------------
   Resizing Logic
   -------------------------------- */

/**
 * Ініціалізує горизонтальний ресайзер (Sidebar/Main Content)
 * @param {string} resizerId ID елемента-роздільника
 * @param {HTMLElement} primaryContainer Контейнер, розмір якого змінюється (.sidebar)
 * @param {number} minPx Мінімальна ширина в пікселях
 * @param {number} maxPx Максимальна ширина в пікселях
 */
function initHorizontalResizer(resizerId, primaryContainer, minPx, maxPx) {
    const resizer = $(resizerId);
    let isDragging = false;
    
    // Завантажуємо збережену ширину при ініціалізації
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        primaryContainer.style.width = savedWidth;
    }

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.classList.add('resizing-h');
        e.preventDefault(); 
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const rect = primaryContainer.parentElement.getBoundingClientRect();
        // Нова ширина - це X-координата миші відносно лівого краю батьківського контейнера
        let newSize = e.clientX - rect.left;
        
        if (newSize >= minPx && newSize <= maxPx) {
            primaryContainer.style.width = `${newSize}px`;
            localStorage.setItem('sidebarWidth', `${newSize}px`);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.classList.remove('resizing-h');
        }
    });
}

/**
 * Ініціалізує вертикальний ресайзер (Editor/Console)
 * ВИКОРИСТОВУЄ ДЕЛЬТА-МЕТОД І НАЙБІЛЬШ НАДІЙНУ ЛОГІКУ ОБМЕЖЕНЬ
 * @param {string} resizerId ID елемента-роздільника
 * @param {HTMLElement} editorWrap Елемент, чий розмір ми змінюємо (.editor-wrap)
 * @param {number} minPx Мінімальна висота редактора (300px)
 * @param {number} maxPx Максимальна висота редактора (800px)
 */
function initVerticalResizer(resizerId, element, minHeight) {
    const resizer = document.getElementById(resizerId);
    if (!resizer) {
        console.warn(`Ресайзер з id="${resizerId}" не знайдено`);
        return;
    }

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        const startY = e.clientY;
        const startHeight = element.offsetHeight;
        
        document.body.style.userSelect = 'none';
        document.body.classList.add('resizing-v');
        
        const onMouseMove = (e) => {
            const deltaY = e.clientY - startY;
            const newHeight = startHeight + deltaY;
            
            if (newHeight >= minHeight) {
                element.style.height = newHeight + 'px';
            }
        };
        
        const onMouseUp = () => {
            document.body.style.userSelect = '';
            document.body.classList.remove('resizing-v');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Функція initResizers, щоб передати коректні елементи
function initResizers() {
    const sidebar = document.querySelector('.sidebar');
    const editorWrap = document.querySelector('.editor-wrap');
    
    // Горизонтальний ресайзер
    initHorizontalResizer('sidebar-resizer', sidebar, 150, 350);

    // Вертикальний ресайзер: editorWrap / console (Min 300px, Max 800px)
    initVerticalResizer('editor-wrap-console-resizer', editorWrap, 300);
}

// Викликати після завантаження DOM
document.addEventListener('DOMContentLoaded', initResizers);

/* --------------------------------
   Task & UI Rendering
   -------------------------------- */

function initTaskCollapse() {
    const taskTitle = $('taskTitle');
    const taskDisplay = $('taskDisplay');

    // Відновлюємо стан із локального сховища
    const isCollapsed = localStorage.getItem('taskDisplayCollapsed') === 'true';
    if (isCollapsed) {
        taskDisplay.classList.add('collapsed');
    }

    // Додаємо обробник кліку на заголовок
    taskTitle.addEventListener('click', () => {
        taskDisplay.classList.toggle('collapsed');
        
        // Зберігаємо новий стан
        //const currentState = taskDisplay.classList.contains('collapsed');
        //localStorage.setItem('taskDisplayCollapsed', currentState);
    });
}

function renderSidebar() {
    const list = document.getElementById('lessonsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (PRACTICE_VIEW_MODE === 'byLesson') {
        renderTasksByLesson(list);
    } else {
        renderAllTasks(list);
    }
}

function filterTasksByLevel(level) {
    if (level === 'all') return TASKS;
    return TASKS.filter(task => task.level === level);
}

function loadTask(taskId) {
    saveCurrentCode();
    CURRENT_TASK_ID = taskId;
    
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;

    // Знаходимо урок для цього завдання
    const lesson = LESSONS.find(l => l.tasks && l.tasks.includes(taskId));

    // Оновлюємо UI завдання
    $('taskTitle').textContent = `Завдання ${task.id}: ${task.title}`;
    
    let taskTextHTML = task.text;
    if (lesson) {
        taskTextHTML += `<div class="task-lesson-link">
            <a href="#" class="lesson-link" data-lesson-id="${lesson.id}">
                📖 Перейти до уроку "${lesson.title}" (для закріплення матеріалу)
            </a>
        </div>`;
    }
    
    $('taskText').innerHTML = taskTextHTML;
    
    // Додаємо обробник для посилання на урок
    const lessonLink = document.querySelector('.lesson-link');
    if (lessonLink) {
        lessonLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('lessons');
            // Прокручуємо до відповідного уроку
            setTimeout(() => {
                const lessonElement = document.querySelector(`[data-lesson-id="${lesson.id}"]`);
                if (lessonElement) {
                    lessonElement.closest('.lesson-item').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        });
    }
    
    // Рівень
    const levelSpan = $('taskLevel');
    levelSpan.textContent = task.level.charAt(0).toUpperCase() + task.level.slice(1);
    levelSpan.className = `level-${task.level}`;
    
    // Завантажуємо код
    const savedCode = USER_PROGRESS[taskId] && USER_PROGRESS[taskId].code;
    const codeToLoad = savedCode !== undefined ? savedCode : task.starter;
    
    editor.setValue(codeToLoad);
    editor.refresh();
    
    // Оновлюємо статус підказки - не прибирається підказка ніколи, можна використати для того щоб дізнатись чи була взяти підказка
    // const hintUsed = USER_PROGRESS[taskId] && USER_PROGRESS[taskId].hintUsed;
    // if (hintUsed) {
    //     showHint(task.hint, true);
    // } else {
    //     $('hintBlock').classList.add('hidden');
    // }

    $('hintBlock').classList.add('hidden');

    renderSidebar();
    $('output').textContent = '';
    $('successMessage').classList.add('hidden');
}

// Стара функція для показування прогресу у відсотках
//function renderProgress() {
//    const totalTasks = TASKS.length;
//    const doneTasks = Object.values(USER_PROGRESS).filter(p => p.done).length;
//    const percentage = totalTasks > 0 ? Math.floor((doneTasks / totalTasks) * 100) : 0;
//    
//    $('progress').textContent = `${percentage}%`;
//}

// Функція renderProgress (camelCase) для консистентності. Для відображення прогресу у відсотках і к-ті
function renderProgress() {
    // 1. Визначення загальної кількості завдань
    const totalTasks = TASKS.length;

    // 2. Визначення кількості виконаних завдань
    // Фільтруємо об'єкт USER_PROGRESS, щоб знайти ті завдання, де 'done' дорівнює true
    const doneTasks = Object.values(USER_PROGRESS).filter(p => p.done).length;

    // 3. Формування рядка у потрібному форматі та оновлення DOM
    // Використовуйте 'Progress-status' для відповідності ID в HTML
    // Використовуйте коректний синтаксис шаблонного рядка
    $('Progress-status').textContent = `Прогрес: ${doneTasks} / ${totalTasks}`;

    //const totalTasks = TASKS.length;
    //const doneTasks = Object.values(USER_PROGRESS).filter(p => p.done).length;
    const percentage = totalTasks > 0 ? Math.floor((doneTasks / totalTasks) * 100) : 0;
    
    $('progress').textContent = `${percentage}%`;
}

function showMessage(msg) {
    const msgElement = $('successMessage');
    $('successText').textContent = msg;
    msgElement.classList.remove('hidden');
    msgElement.style.opacity = 1;
    msgElement.style.animation = 'none'; // Скидаємо анімацію

    // Перезапускаємо анімацію
    void msgElement.offsetWidth; 
    msgElement.style.animation = 'fadeOut 8s forwards';
}


/* --------------------------------
   Event Handlers (Buttons)
   -------------------------------- */

async function onRun() {
    const code = editor.getValue();
    if (!code) return;

    $('runBtn').disabled = true;
    $('output').textContent = 'Running...';
    
    const result = await runUserCode(code);
    $('output').textContent = result;
    
    $('runBtn').disabled = false;
    // Очищаємо повідомлення про успіх, якщо є
    $('successMessage').classList.add('hidden');
}

async function onCheck() {
    const task = TASKS.find(t => t.id === CURRENT_TASK_ID);
    if (!task) return;

    const code = editor.getValue();
    if (!code) return;

    $('checkBtn').disabled = true;
    $('output').textContent = 'Running tests...';

    const testResult = await runTestsForTask(task, code);
    
    $('output').textContent = '--- Test Results ---\n';
    let allPassed = true;
    
    testResult.results.forEach(r => {
        const ok = r.get('ok');
        const input = r.get('input');
        const expected = r.get('expected');
        const output = r.get('output');
        const testNum = r.get('test_number');

        const status = ok ? 'PASSED ✅' : 'FAILED ❌';
        let outputText = `\n[Test ${testNum}: ${status}]\n`;
        outputText += `  Input (stdin): ${input || 'N/A'}\n`;
        outputText += `  Expected: ${expected}\n`;
        outputText += `  Got: ${output}\n`;

        $('output').textContent += outputText;
        if (!ok) allPassed = false;
    });

    if (allPassed) {
        // Успішне проходження
        USER_PROGRESS[CURRENT_TASK_ID] = USER_PROGRESS[CURRENT_TASK_ID] || {};
        USER_PROGRESS[CURRENT_TASK_ID].done = true;
        USER_PROGRESS[CURRENT_TASK_ID].lastRun = new Date().toISOString();
        
        // Випадкове гумористичне повідомлення
        const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        showMessage(randomMsg);
        
        saveProgress();
    } else {
        showMessage('На жаль, не всі тести пройдені 😟. Спробуй ще раз!');
        // Видаляємо статус 'done' при невдалому тесті
        if (USER_PROGRESS[CURRENT_TASK_ID]) {
            USER_PROGRESS[CURRENT_TASK_ID].done = false;
            saveProgress();
        }
    }

    $('checkBtn').disabled = false;
}

function showHint(hintText, isReload = false) {
    const hintBlock = $('hintBlock');
    $('hintText').textContent = hintText;
    hintBlock.classList.remove('hidden');
    
    if (!isReload) {
        USER_PROGRESS[CURRENT_TASK_ID] = USER_PROGRESS[CURRENT_TASK_ID] || {};
        USER_PROGRESS[CURRENT_TASK_ID].hintUsed = true;
        saveProgress();
    }
}

function onHint() {
    const task = TASKS.find(t => t.id === CURRENT_TASK_ID);
    if (task && task.hint) {
        showHint(task.hint);
    }
}

function onSolution() {
    const task = TASKS.find(t => t.id === CURRENT_TASK_ID);
    if (task && task.solution) {
        if (confirm('Ви впевнені? Це покаже розв\'язок і перезапише написаний вами код.')) {
            editor.setValue(task.solution);
            editor.refresh();
            saveCurrentCode();
            $('output').textContent = 'Розв\'язок завантажено. Тепер спробуйте запустити та перевірити його.';
        }
    }
}

function onReset() {
    const task = TASKS.find(t => t.id === CURRENT_TASK_ID);
    if (task && confirm('Ви впевнені? Поточний код буде скинуто до початкового стану завдання.')) {
        editor.setValue(task.starter);
        editor.refresh();
        // Видаляємо збережений код
        if (USER_PROGRESS[CURRENT_TASK_ID]) {
            USER_PROGRESS[CURRENT_TASK_ID].code = task.starter;
            saveProgress();
        }
        $('output').textContent = 'Код скинуто.';
    }
}

function onNext() {
    // Знаходимо поточне завдання
    const currentIndex = TASKS.findIndex(t => t.id === CURRENT_TASK_ID);
    
    if (currentIndex === -1) {
        console.error('Поточне завдання не знайдено');
        return;
    }
    
    // Перевіряємо, чи є наступне завдання
    if (currentIndex >= TASKS.length - 1) {
        // Це останнє завдання
        showMessage('🎉 Ви завершили всі завдання! Молодець!');
        return;
    }
    
    // Переходимо до наступного завдання
    const nextTask = TASKS[currentIndex + 1];
    loadTask(nextTask.id);
    
    // Якщо в режимі "За темами", переконуємось що секція розгорнута
    if (PRACTICE_VIEW_MODE === 'byLesson') {
        const lesson = LESSONS.find(l => l.tasks && l.tasks.includes(nextTask.id));
        if (lesson) {
            setTimeout(() => {
                expandLessonSection(lesson.id);
            }, 100);
        }
    }
    
    // Плавна прокрутка до активного завдання
    setTimeout(() => {
        const activeTask = document.querySelector('.task-item.active');
        if (activeTask) {
            activeTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
}

/* --------------------------------
   Certificate (jsPDF)
   -------------------------------- */

function openCertificateModal() {
    const totalTasks = TASKS.length;
    const doneTasks = Object.values(USER_PROGRESS).filter(p => p.done).length;
    
    if (doneTasks < totalTasks) {
        alert(`Для отримання сертифікату необхідно виконати всі ${totalTasks} завдань. Ви виконали: ${doneTasks}.`);
        return;
    }
    
    $('certificateModal').classList.remove('hidden');
    $('modalGenerateBtn').onclick = generateCertificate;
    $('modalCloseBtn').onclick = () => $('certificateModal').classList.add('hidden');
}

function generateCertificate() {
    const userName = $('userNameInput').value.trim();
    if (!userName) {
        alert('Будь ласка, введіть ваше ім\'я та прізвище.');
        return;
    }

    $('certificateModal').classList.add('hidden');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const docWidth = doc.internal.pageSize.getWidth();
    const docHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // 1. Фон (нейтральний, легкий)
    doc.setFillColor(240, 240, 245);
    doc.rect(0, 0, docWidth, docHeight, 'F');
    doc.setDrawColor(39, 40, 34); // Темний акцент
    doc.setLineWidth(3);
    doc.rect(5, 5, docWidth - 10, docHeight - 10); // Рамка

    // 2. Заголовок
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 40, 34);
    doc.text('СЕРТИФІКАТ ПРОХОДЖЕННЯ КУРСУ', docWidth / 2, 40, { align: 'center' });

    // 3. Текст визнання
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 82);
    doc.text('Цим засвідчується, що', docWidth / 2, 60, { align: 'center' });

    // 4. Ім'я користувача
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(249, 38, 114); // Акцент
    doc.text(userName, docWidth / 2, 85, { align: 'center' });
    doc.line(docWidth / 2 - 80, 88, docWidth / 2 + 80, 88); // Підкреслення

    // 5. Курс
    doc.setFontSize(24);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 40, 34);
    doc.text('успішно завершив(ла) онлайн-тренажер', docWidth / 2, 105, { align: 'center' });
    
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(COURSE_TITLE, docWidth / 2, 120, { align: 'center' });
    
    // 6. Додаткова інформація
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 82);
    doc.text(`Виконано завдань: ${TASKS.length}`, docWidth / 2, 130, { align: 'center' });
    
    // 7. Дата та QR-код (Placeholder)
    const today = new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Дата
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 40, 34);
    doc.text(`Дата завершення: ${today}`, 50, docHeight - margin - 20);

    // Підпис (placeholder)
    doc.line(50, docHeight - margin - 5, 100, docHeight - margin - 5);
    doc.setFontSize(10);
    doc.text('Інструктор: AI Bot', 50, docHeight - margin);

    // QR-код placeholder (Simulation of proof)
    doc.setFontSize(10);
    doc.text('QR Code Placeholder (Proof of Completion)', docWidth - 70, docHeight - 45);
    doc.setDrawColor(0, 0, 0);
    doc.rect(docWidth - 75, docHeight - 65, 30, 30); // Квадрат для QR
    
    doc.save(`Сертифікат_${COURSE_TITLE.replace(/\s/g, '_')}_${userName}.pdf`);
}

/* --------------------------------
   Buffers & Copying
   -------------------------------- */

function initBufferButtons() {
    document.querySelectorAll('.copyBuf').forEach(button => {
        button.addEventListener('click', (e) => {
            const bufferId = e.target.dataset.id;
            const buffer = $(bufferId);
            
            if (buffer) {
                // Використовуємо document.execCommand('copy') для iFrame сумісності
                buffer.select();
                document.execCommand('copy');
                
                const originalText = e.target.textContent;
                e.target.textContent = 'Скопійовано!';
                setTimeout(() => {
                    e.target.textContent = originalText;
                }, 1000);
            }
        });
    });
}

/* --------------------------------
   Bootstrap everything
   -------------------------------- */

async function fetchData() {
    try {
        // 1. Надсилаємо запити одночасно
        const tasksResponse = await fetch('data/tasks.json');
        const messagesResponse = await fetch('data/messages.json');
        // 🆕 Запит на додаткові матеріали
        const additionalMaterialResponse = await fetch('data/add_material.json');
        // 🆕 Запит на шпаргалки
        const cribsResponse = await fetch('data/cribs.json');
        
        // 2. Обробляємо відповіді JSON
        const tasksData = await tasksResponse.json();
        const messagesData = await messagesResponse.json();
        // 🆕 Обробляємо додаткові матеріали
        const additionalMaterialData = await additionalMaterialResponse.json();
        // 🆕 Обробка даних шпаргалок
        const cribsData = await cribsResponse.json();
        
        // 3. Зберігаємо дані у глобальних змінних
        TASKS = tasksData.tasks;
        LESSONS = tasksData.lessons;
        MESSAGES = messagesData;
        // 🆕 Зберігаємо дані додаткових матеріалів
        ADDITIONAL_MATERIALS = additionalMaterialData; // Зберігаємо весь об'єкт
        // 🆕 Зберігаємо дані шпаргалок
        CRIBS_DATA = cribsData;
        
    } catch (e) {
        console.error("Помилка завантаження конфігурації.", e);
        // 4. Обробка помилок (логіка розширена)
        TASKS = [{
            id: 'T-ERROR', title: 'Помилка завантаження', level: 'easy', 
            text: 'Неможливо завантажити tasks.json.', 
            starter: 'print("Error")', hint: '', solution: '', tests: []
        }];
        // Забезпечуємо, що інші змінні також мають безпечні значення
        LESSONS = [];
        MESSAGES = {};
        ADDITIONAL_MATERIALS = { add_materials: [] };
        CRIBS_DATA = { cribs: [] }; // Забезпечення безпечного значення
    }
}


/* функція яка була до створення Додаткових матеріалів
function initSidebarTabs() {
    const sidebar = document.querySelector('.sidebar');
    
    const tabsHTML = `
        <div class="sidebar-tabs">
            <button class="tab-btn active" data-tab="lessons">📚 Навчання</button>
            <button class="tab-btn" data-tab="practice">✍️ Практика</button>
        </div>
        <div class="tab-content" id="lessonsTab">
            <div id="lessonsContent"></div>
        </div>
        <div class="tab-content hidden" id="practiceTab">
            <div class="practice-view-toggle">
                <button class="view-btn active" data-view="byLesson">За темами</button>
                <button class="view-btn" data-view="all">Всі завдання</button>
            </div>
            <div id="lessonsList" class="lesson-list"></div>
        </div>
    `;
    
    sidebar.innerHTML = tabsHTML;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewMode = e.target.dataset.view;
            setPracticeViewMode(viewMode);
        });
    });
    
    renderLessonsContent();
    renderSidebar();
}*/

function initSidebarTabs() {
    const sidebar = document.querySelector('.sidebar');

    const tabsHTML = `
        <div class="sidebar-tabs">
            <button class="tab-btn active" data-tab="lessons">📚 Навчання</button>
            <button class="tab-btn" data-tab="practice">✍️ Практика</button>
        </div>
        
        <div class="tab-content" id="lessonsTab">
            <div class="lessons-view-toggle">
                <button class="lessons-view-btn active" data-view="lessons">Уроки</button>
                <button class="lessons-view-btn" data-view="additional">Додатково</button>
            </div>
            
            <div id="lessonsContent" class="lessons-sub-content"></div>
            <div id="additionalMaterial" class="lessons-sub-content hidden"></div>
        </div>
        
        <div class="tab-content hidden" id="practiceTab">
            <div class="practice-view-toggle">
                <button class="view-btn active" data-view="byLesson">За темами</button>
                <button class="view-btn" data-view="all">Всі завдання</button>
            </div>
            <div id="lessonsList" class="lesson-list"></div>
        </div>
    `;

    sidebar.innerHTML = tabsHTML;

    // Логіка перемикання ОСНОВНИХ вкладок (lessons/practice)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Логіка перемикання РЕЖИМІВ ПРАКТИКИ (byLesson/all)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewMode = e.target.dataset.view;
            setPracticeViewMode(viewMode);
        });
    });

    // 🆕 Логіка перемикання РЕЖИМІВ НАВЧАННЯ (lessons/additional)
    document.querySelectorAll('.lessons-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewMode = e.target.dataset.view;
            switchLessonsViewMode(viewMode);
        });
    });

    // 🆕 Визначаємо, що показувати спочатку, і рендеримо обидва типи контенту
    renderLessonsContent();
    renderAdditionalMaterial(); // 👈 Рендеримо новий контент
    renderSidebar(); // Якщо ця функція відповідає за загальний стан
}

// 🆕 НОВА допоміжна функція для перемикання "Уроки" / "Додатково"
function switchLessonsViewMode(viewMode) {
    const lessonBtn = document.querySelector('.lessons-view-btn[data-view="lessons"]');
    const additionalBtn = document.querySelector('.lessons-view-btn[data-view="additional"]');
    const lessonsContent = document.getElementById('lessonsContent');
    const additionalMaterial = document.getElementById('additionalMaterial');

    if (!lessonsContent || !additionalMaterial) return;

    // Скидання активного стану
    lessonBtn.classList.remove('active');
    additionalBtn.classList.remove('active');
    lessonsContent.classList.add('hidden');
    additionalMaterial.classList.add('hidden');

    // Встановлення нового активного стану та видимості
    if (viewMode === 'lessons') {
        lessonBtn.classList.add('active');
        lessonsContent.classList.remove('hidden');
    } else if (viewMode === 'additional') {
        additionalBtn.classList.add('active');
        additionalMaterial.classList.remove('hidden');
    }
}

function renderAdditionalMaterial() {
    // ⚠️ Припущено, що масив з матеріалами називається ADDITIONAL_MATERIALS
    // Якщо у вас інша назва, замініть її тут.
    const materialArray = ADDITIONAL_MATERIALS.add_materials || [];
    const container = document.getElementById('additionalMaterial');
    
    if (!container) return;

    container.innerHTML = '';
    
    materialArray.forEach(material => {
        const materialDiv = document.createElement('div');
        materialDiv.className = 'lesson-item additional-item';
        materialDiv.innerHTML = `
            <h3 class="lesson-title">${material.title}</h3>
            <p class="lesson-description">${material.description}</p>
        `;
        
        materialDiv.addEventListener('click', () => {
            // --- ДОДАТКОВИЙ РЯДОК: Скидаємо блок підказки ---
            $('hintBlock').classList.add('hidden');
            
            // Логіка для кліку на додатковий матеріал
            $('taskTitle').textContent = material.title;
            $('taskLevel').textContent = 'Додатково';
            $('taskLevel').className = 'level-additional'; // Можливо, вам потрібен окремий CSS-клас

            // Створюємо HTML-контент
            let materialTextHTML = `
                <p><strong>Тема:</strong> ${material.description}</p>
            `;

            // Додаємо розширений опис
            if (material['extended_description']) {
                materialTextHTML += `
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #444;">
                    ${material['extended_description']}
                `;
            }

            $('taskText').innerHTML = materialTextHTML;
        });
        
        container.appendChild(materialDiv);
    });
}

function renderLessonsContent() {
    const container = document.getElementById('lessonsContent');
    if (!container) return;
    
    container.innerHTML = '';
    
    LESSONS.forEach(lesson => {
        const lessonTasks = lesson.tasks || []; 
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'lesson-item';
        lessonDiv.innerHTML = `
            <h3 class="lesson-title">${lesson.title}</h3>
            <p class="lesson-description">${lesson.description}</p>
            <span class="lesson-level level-${lesson.level}">${lesson.level}</span>
            <div class="lesson-tasks-link">
                <a href="#" class="practice-link" data-lesson-id="${lesson.id}">
                    ➜ Практика (${lessonTasks.length})
                </a>
            </div>
        `;
        
        lessonDiv.addEventListener('click', (e) => {
            // Перевіряємо, чи клік був саме по посиланню "Практика"
            if (e.target.classList.contains('practice-link')) {
                e.preventDefault(); 
                const lessonId = e.target.dataset.lessonId;
                
                // 1. Перемикаємо вкладку та режим відображення
                switchTab('practice');
                setPracticeViewMode('byLesson');
                
                // 2. ФІКС: Завантажуємо перше завдання цього уроку
                if (lessonTasks.length > 0) {
                    const firstTaskId = lessonTasks[0];
                    loadTask(firstTaskId); 
                }

                // 3. Розгортаємо секцію завдань
                setTimeout(() => {
                    expandLessonSection(lessonId);
                }, 100);
                
                return;
            }

            // --- ДОДАТКОВИЙ РЯДОК: Скидаємо блок підказки при завантаженні нового завдання ---
            $('hintBlock').classList.add('hidden');

            // Логіка для кліку на сам урок (не посилання "Практика")
            // Показуємо опис уроку в task display
            $('taskTitle').textContent = lesson.title;
            $('taskLevel').textContent = lesson.level;
            $('taskLevel').className = `level-${lesson.level}`;

            // Створюємо HTML-контент, включаючи extended_description
            let lessonTextHTML = `
                <p><strong>Рівень:</strong> <span class="lesson-level level-${lesson.level}">${lesson.level}</span></p>
                <p>${lesson.description}</p>
            `;

            // Додаємо розширений опис, якщо він існує
            if (lesson['extended_description']) {
                lessonTextHTML += `
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #444;">
                    ${lesson['extended_description']}
                `;
            }

            $('taskText').innerHTML = lessonTextHTML;
        });
        
        container.appendChild(lessonDiv);
    });
}

function expandLessonSection(lessonId) {
    // ДОДАНО: Додаємо в Set перед розгортанням
    EXPANDED_LESSONS.add(lessonId);
    
    const section = document.querySelector(`[data-lesson-section="${lessonId}"]`);
    if (section) {
        const toggle = section.querySelector('.lesson-section-toggle');
        if (toggle && !section.classList.contains('expanded')) {
            toggle.click();
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


function renderTasksByLesson(container) {
    LESSONS.forEach(lesson => {
        const lessonTasks = TASKS.filter(t => lesson.tasks.includes(t.id));
        const completedCount = lessonTasks.filter(t => 
            USER_PROGRESS[t.id] && USER_PROGRESS[t.id].done
        ).length;
        
        const lessonSection = document.createElement('div');
        lessonSection.className = 'lesson-section';
        lessonSection.dataset.lessonSection = lesson.id;
        
        // ДОДАНО: Відновлюємо стан розгортання
        if (EXPANDED_LESSONS.has(lesson.id)) {
            lessonSection.classList.add('expanded');
        }
        
        const header = document.createElement('div');
        header.className = 'lesson-section-header';
        header.innerHTML = `
            <span class="lesson-section-toggle">${EXPANDED_LESSONS.has(lesson.id) ? '▼' : '▶'}</span>
            <span class="lesson-section-title">${lesson.title}</span>
            <span class="lesson-section-progress">${completedCount}/${lessonTasks.length}</span>
        `;
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'lesson-section-tasks';
        
        lessonTasks.forEach(task => {
            const taskStatus = USER_PROGRESS[task.id] && USER_PROGRESS[task.id].done ? 'done' : '';
            const taskActive = task.id === CURRENT_TASK_ID ? 'active' : '';
            
            const item = document.createElement('div');
            item.className = `task-item ${taskActive} ${taskStatus}`;
            item.dataset.taskId = task.id;
            item.innerHTML = `
                <span><span class="level-dot level-${task.level}">●</span> ${task.title}</span>
                <span class="status">${taskStatus ? '✅' : ' '}</span>
            `;
            item.addEventListener('click', () => {
                loadTask(task.id);
            });
            tasksContainer.appendChild(item);
        });
        
        lessonSection.appendChild(header);
        lessonSection.appendChild(tasksContainer);
        container.appendChild(lessonSection);
        
        // ОНОВЛЕНО: Зберігаємо стан при кліку
        header.addEventListener('click', () => {
            lessonSection.classList.toggle('expanded');
            const toggle = header.querySelector('.lesson-section-toggle');
            toggle.textContent = lessonSection.classList.contains('expanded') ? '▼' : '▶';
            
            // ДОДАНО: Оновлюємо Set зі станами
            if (lessonSection.classList.contains('expanded')) {
                EXPANDED_LESSONS.add(lesson.id);
            } else {
                EXPANDED_LESSONS.delete(lesson.id);
            }
        });
    });
}


function renderAllTasks(container) {
    const filteredTasks = filterTasksByLevel($('levelSelect').value);
    
    filteredTasks.forEach(task => {
        const taskStatus = USER_PROGRESS[task.id] && USER_PROGRESS[task.id].done ? 'done' : '';
        const taskActive = task.id === CURRENT_TASK_ID ? 'active' : '';
        
        const item = document.createElement('div');
        item.className = `task-item ${taskActive} ${taskStatus}`;
        item.dataset.taskId = task.id;
        item.innerHTML = `
            <span><span class="level-dot level-${task.level}">●</span> ${task.title}</span>
            <span class="status">${taskStatus ? '✅' : ' '}</span>
        `;
        item.addEventListener('click', () => {
            loadTask(task.id);
        });
        container.appendChild(item);
    });
}

function filterTasksByLesson(lessonId) {
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) return;
    
    const list = document.getElementById('lessonsList');
    if (!list) return;
    
    list.innerHTML = `<div class="filter-info">Завдання уроку: ${lesson.title}</div>`;
    
    const lessonTasks = TASKS.filter(t => lesson.tasks.includes(t.id));
    
    lessonTasks.forEach(task => {
        const taskStatus = USER_PROGRESS[task.id] && USER_PROGRESS[task.id].done ? 'done' : '';
        const taskActive = task.id === CURRENT_TASK_ID ? 'active' : '';
        
        const item = document.createElement('div');
        item.className = `task-item ${taskActive} ${taskStatus}`;
        item.dataset.taskId = task.id;
        item.innerHTML = `
            <span><span class="level-dot level-${task.level}">●</span> ${task.title}</span>
            <span class="status">${taskStatus ? '✅' : ' '}</span>
        `;
        item.addEventListener('click', () => {
            loadTask(task.id);
        });
        list.appendChild(item);
    });
}

function switchTab(tabName) {
    // Змінюємо активну кнопку
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Показуємо відповідний контент
    if (tabName === 'lessons') {
        document.getElementById('lessonsTab').classList.remove('hidden');
        document.getElementById('practiceTab').classList.add('hidden');
    } else {
        document.getElementById('lessonsTab').classList.add('hidden');
        document.getElementById('practiceTab').classList.remove('hidden');
    }
}

function setPracticeViewMode(mode) {
    PRACTICE_VIEW_MODE = mode;
    
    // ДОДАНО: Очищаємо стан розгортання при переключенні режиму
    if (mode === 'all') {
        EXPANDED_LESSONS.clear();
    }
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });
    
    renderSidebar();
}

async function bootstrap() {
    await fetchData();
    loadProgress();
    initEditor();
    initBindings();
    initThemeToggle();
    initSidebarTabs();
    initCopyright();
    await initPyodide();
    
    const initialTaskId = TASKS.length > 0 ? (
        localStorage.getItem('lastTaskId') || TASKS[0].id
    ) : null;
    
    if (initialTaskId) {
        loadTask(initialTaskId);
    }

    renderProgress();
}

function initBindings() {
    $('runBtn').addEventListener('click', onRun);
    $('checkBtn').addEventListener('click', onCheck);
    $('hintBtn').addEventListener('click', onHint);
    $('solutionBtn').addEventListener('click', onSolution); // Розв'язок на кнопку-перемикач не потрібен, але логіка є
    $('resetBtn').addEventListener('click', onReset);
    $('nextBtn').addEventListener('click', onNext);
    $('certBtn').addEventListener('click', openCertificateModal);
    $('levelSelect').addEventListener('change', renderSidebar);
    // 🆕 Прив'язка для нової кнопки
    $('cribsBtn').addEventListener('click', openCribsModal);
    
    // Зберігання коду при зміні/закритті
    window.addEventListener('beforeunload', saveCurrentCode);
    setInterval(saveCurrentCode, 5000); // Автозбереження кожні 5 секунд
    
    // Копіювання буферів
    initBufferButtons();
    
    // ДОДАНО: Логіка згортання
    initTaskCollapse(); 
    
    // ДОДАНО: Логіка зміни розміру (ресайзерів)
    initResizers();
}

/* Відкриває модальне вікно шпаргалок. */
function openCribsModal() {
    const modal = $('cribsModal');
    if (!modal) return;

    // Встановлення початкових розмірів
    const initialHeight = window.innerHeight * 0.5;
    const initialWidth = window.innerWidth * 0.25;
    modal.style.height = `${initialHeight}px`;
    modal.style.width = `${initialWidth}px`;
    
    // Встановлення початкової позиції (правий нижній кут)
    modal.style.right = '0';
    modal.style.bottom = '0'; 

    modal.classList.remove('hidden');
    
    // 1. Рендеримо вміст (за замовчуванням всі блоки згорнуті)
    renderCribsContent(); 
    
    // 2. Прив'язка кнопки закриття
    $('cribsCloseBtn').onclick = closeCribsModal;

    // 3. Ініціалізуємо ресайзинг
    initCribsResizing(); 
}

/* Закриває модальне вікно шпаргалок. */
function closeCribsModal() {
    const modal = $('cribsModal');
    modal.classList.add('hidden');
    
    // При закритті скидаємо всі розгорнуті стани
    document.querySelectorAll('.crib-item.expanded').forEach(item => {
        item.classList.remove('expanded');
        item.querySelector('.crib-icon').textContent = '▶';
    });
}

// 🆕 Створення функції рендерингу вмісту
function renderCribsContent() {
    const container = document.getElementById('cribsList');
    if (!container) return;

    container.innerHTML = ''; // Очищення перед рендерингом

    CRIBS_DATA.cribs.forEach(crib => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'crib-item';
        itemDiv.setAttribute('data-crib-id', crib.id);

        // використовуємо шаблонні рядки (template literals)
        // для створення структури.
        itemDiv.innerHTML = `
            <div class="crib-header-line">
                <span class="crib-icon">▶</span>
                <h4 class="crib-title">${crib.title}</h4>
            </div>
            <p class="crib-description">${crib.description}</p>
            <div class="crib-extended-content hidden">${crib.extended_description}</div>
        `;

        // 1. ДОДАЄМО ЕЛЕМЕНТ ДО КОНТЕЙНЕРА, щоб можна було знайти внутрішні елементи
        container.appendChild(itemDiv);

        // 2. ЗНАХОДИМО ЕЛЕМЕНТ ЗАГОЛОВКА, на який потрібно повісити клік
        const headerLine = itemDiv.querySelector('.crib-header-line');

        // 3. ПЕРЕНОСИМО ОБРОБНИК КЛІКУ НА ЗАГОЛОВОК
        headerLine.addEventListener('click', () => {
            // Перемикання стану розгорнутості
            const isExpanded = itemDiv.classList.toggle('expanded');
            const extendedContent = itemDiv.querySelector('.crib-extended-content');
            const icon = itemDiv.querySelector('.crib-icon');

            // Оновлення видимості та іконки
            if (isExpanded) {
                extendedContent.classList.remove('hidden');
                icon.textContent = '▼';
            } else {
                extendedContent.classList.add('hidden');
                icon.textContent = '▶';
            }
        });
    });
}

// 🆕 Логіка ресайзингу
function initCribsResizing() {
    const modal = $('cribsModal');
    const topHandle = document.querySelector('.cribs-resize-handle.top-handle');
    const leftHandle = document.querySelector('.cribs-resize-handle.left-handle');

    let isResizing = false;
    let resizeDirection = null;

    const startResize = (e, direction) => {
        isResizing = true;
        resizeDirection = direction;
        document.body.style.userSelect = 'none'; // Запобігаємо виділенню
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault(); 
    };

    const handleResize = (e) => {
        if (!isResizing) return;
        
        const rect = modal.getBoundingClientRect();

        if (resizeDirection === 'top') {
            // Зміна висоти (тягнемо вгору)
            const newHeight = window.innerHeight - e.clientY;
            modal.style.height = `${Math.max(newHeight, 150)}px`; // min-height 150px
        } else if (resizeDirection === 'left') {
            // Зміна ширини (тягнемо вліво)
            const newWidth = window.innerWidth - e.clientX;
            modal.style.width = `${Math.max(newWidth, 200)}px`; // min-width 200px
        }
    };

    const stopResize = () => {
        isResizing = false;
        resizeDirection = null;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    };

    topHandle.addEventListener('mousedown', (e) => startResize(e, 'top'));
    leftHandle.addEventListener('mousedown', (e) => startResize(e, 'left'));
}

bootstrap();


function initCopyright() {
        // Консольне попередження
        console.log('%c⚠️ УВАГА!', 'color: red; font-size: 14px; font-weight: bold;');
        console.log('%c© 2025-2026 Python Trainer: Basics & Advanced. The-Rebel-552. Всі права захищені.', 'color: #f92672; font-size: 14px;');
        console.log('%cНесанкціоноване копіювання коду заборонено законом про авторське право та всіма законами відомого і невідомого всесвіту.', 'color: #f92672; font-size: 12px;');
        
        // Обробник модального вікна
        const licenseLink = document.getElementById('licenseLink');
        const licenseModal = document.getElementById('licenseModal');
        const licenseCloseBtn = document.getElementById('licenseCloseBtn');
        
        if (licenseLink && licenseModal) {
            licenseLink.addEventListener('click', (e) => {
                e.preventDefault();
                licenseModal.classList.remove('hidden');
            });
            
            licenseCloseBtn?.addEventListener('click', () => {
                licenseModal.classList.add('hidden');
            });
            
            licenseModal.addEventListener('click', (e) => {
                if (e.target === licenseModal) {
                    licenseModal.classList.add('hidden');
                }
            });
        }
        
        // Захист від копіювання (опціонально - може дратувати користувачів)
        // document.addEventListener('contextmenu', (e) => {
        //     if (!e.target.closest('.editor-wrap')) {
        //         e.preventDefault();
        //     }
        // });
        
        // Водяний знак в коді (обфускація)
        Object.defineProperty(window, 'APP_AUTHOR', {
            value: 'The-Rebel-552 - 2025-2026',
            writable: false,
            configurable: false
        });
    }









/*
    ╔═══════════════════════════════════════════════════════════╗
    ║  Python Trainer: Basics & Advanced                        ║
    ║  © 2025-2026 The-Rebel-552. Всі права захищені.           ║
    ║  Ліцензовано під Apache License 2.0                       ║
    ║  Несанкціоноване копіювання, модифікація                  ║
    ║  або розповсюдження заборонено.                           ║
    ║                                                           ║
    ║  Контакт: rebelthemachine@gmail.com                       ║
    ╚═══════════════════════════════════════════════════════════╝
*/