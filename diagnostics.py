// Додайте цей код ТИМЧАСОВО в консоль браузера (F12 → Console)
// Це допоможе знайти проблему

console.log('=== ДІАГНОСТИКА ===');

// Перевірка 1: Чи завантажились уроки з tasks.json?
console.log('1. LESSONS:', LESSONS);
console.log('   Кількість уроків:', LESSONS?.length);

// Перевірка 2: Чи є поле tasks у уроках?
if (LESSONS && LESSONS.length > 0) {
    console.log('2. Перший урок:', LESSONS[0]);
    console.log('   Чи є tasks?', LESSONS[0].hasOwnProperty('tasks'));
    console.log('   Tasks:', LESSONS[0].tasks);
}

// Перевірка 3: Чи існує змінна PRACTICE_VIEW_MODE?
console.log('3. PRACTICE_VIEW_MODE:', typeof PRACTICE_VIEW_MODE !== 'undefined' ? PRACTICE_VIEW_MODE : 'НЕ ВИЗНАЧЕНО');

// Перевірка 4: Чи існують функції?
console.log('4. Функції:');
console.log('   renderTasksByLesson:', typeof renderTasksByLesson);
console.log('   setPracticeViewMode:', typeof setPracticeViewMode);
console.log('   expandLessonSection:', typeof expandLessonSection);

// Перевірка 5: Чи є кнопки перемикання?
const viewButtons = document.querySelectorAll('.view-btn');
console.log('5. Кнопки перемикання:', viewButtons.length);

// Перевірка 6: Який контент у practiceTab?
const practiceTab = document.getElementById('practiceTab');
console.log('6. Вміст practiceTab:', practiceTab?.innerHTML.substring(0, 200));

// Перевірка 7: Чи є розкриваючі блоки?
const lessonSections = document.querySelectorAll('.lesson-section');
console.log('7. Розкриваючі блоки (.lesson-section):', lessonSections.length);

console.log('=== КІНЕЦЬ ДІАГНОСТИКИ ===');

// Тест: Спробуємо вручну встановити режим "За темами"
if (typeof setPracticeViewMode === 'function') {
    console.log('Спроба встановити режим "За темами"...');
    setPracticeViewMode('byLesson');
}











'''
    ╔═══════════════════════════════════════════════════════════╗
    ║  Python Trainer: Basics & Advanced                        ║
    ║  © 2025-2026 The-Rebel-552. Всі права захищені.           ║
    ║  Ліцензовано під Apache License 2.0                       ║
    ║  Несанкціоноване копіювання, модифікація                  ║
    ║  або розповсюдження заборонено.                           ║
    ║                                                           ║
    ║  Контакт: rebelthemachine@gmail.com                       ║
    ╚═══════════════════════════════════════════════════════════╝
'''