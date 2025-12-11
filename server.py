import os
import json
import subprocess
from flask import Flask, request, jsonify # Приклад на Flask
"""
import os   Вбудований модуль. Надає спосіб взаємодії з операційною системою (наприклад, читання/запис файлів, робота зі шляхами, 
    отримання змінних середовища).
import json Вбудований модуль. Використовується для кодування та декодування даних у форматі JSON (JavaScript Object Notation), 
    який є стандартним форматом обміну даними у веб-додатках.
import subprocess   Вбудований модуль. Дозволяє запускати нові процеси та отримувати їхні вхідні/вихідні потоки та коди повернення. 
    Використовується для виконання зовнішніх команд або програм.
from flask import Flask, request, jsonify   Зовнішній фреймворк. Це основні компоненти для створення веб-додатку. 
    Flask — це мікро-фреймворк для вебу; request — об'єкт, що містить вхідні дані HTTP-запиту; jsonify — функція для створення JSON-відповідей.
"""
app = Flask(__name__)
# Вкажіть коректний шлях для вашої структури
SANDBOX_DIR = 'TEST_in_cmd'
PYTHON_FILE_NAME = 'TEST_in_cmd.py'
BATCH_FILE_NAME = 'RUN_in_cmd.bat'

# ... (Код для run_sandbox та cleanup_sandbox) ...

if __name__ == '__main__':
    # Вкажіть порт 8000, якщо він у вас використовується
    app.run(port=8000, debug=True)

@app.route('/run_sandbox', methods=['POST'])
def run_sandbox():
    data = request.get_json()
    code = data.get('code', '')
    
    # 1. Створюємо директорію, якщо її немає
    os.makedirs(SANDBOX_DIR, exist_ok=True)
    
    # 2. Шлях до файлів
    python_file_path = os.path.join(SANDBOX_DIR, PYTHON_FILE_NAME)
    
    # 3. Записуємо код у Python-файл
    with open(python_file_path, 'w', encoding='utf-8') as f:
        f.write(code)

    # 4. Створюємо BAT-файл
    # Отримуємо абсолютний шлях до папки SANDBOX
    abs_sandbox_path = os.path.abspath(SANDBOX_DIR)
    
    # Команда для запуску CMD і виконання Python-скрипту
    bat_content = f'start cmd.exe /k "cd /d {abs_sandbox_path} && python {PYTHON_FILE_NAME}"'

    with open(BATCH_FILE_NAME, 'w') as f:
        f.write(bat_content)

    # 5. Запускаємо BAT-файл (відкриває CMD)
    # shell=True необхідний для запуску .bat файлів
    subprocess.Popen(BATCH_FILE_NAME, shell=True) 

    return jsonify({"status": "launched"}), 200

@app.route('/cleanup_sandbox', methods=['POST'])
def cleanup_sandbox():
    if os.path.exists(BATCH_FILE_NAME):
        os.remove(BATCH_FILE_NAME)
        return jsonify({"status": "cleaned up"}), 200
    
    return jsonify({"status": "not found, no cleanup needed"}), 200











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