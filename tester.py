# tester.py
# Виконується у Pyodide як окремий модуль (завантажується через runPythonAsync)
# Містить:
#   run_user_code(code) -> повертає stdout як рядок
#   run_tests(code, tests) -> повертає list(dict) з результатами
"""
import sys  Вбудований модуль. Надає доступ до змінних та функцій, які взаємодіють з інтерпретатором Python (наприклад, 
    управління шляхом пошуку модулів, доступ до стандартних потоків вводу/виводу).
import io   Вбудований модуль. Надає інструменти для роботи з потоками вводу/виводу (I/O). Часто використовується для роботи 
    з даними в пам'яті як з файлами (наприклад, StringIO або BytesIO).
import builtins Вбудований модуль. Надає доступ до вбудованих ідентифікаторів Python (наприклад, функцій print, len, int). 
    Його рідко імпортують явно, але його використання може свідчити про намір змінити або перевірити поведінку вбудованих функцій.
"""
import sys
import io
import builtins
# Встановлюємо максимальну глибину рекурсії, щоб запобігти падінню Pyodide від нескінченної рекурсії
sys.setrecursionlimit(250) 

def run_user_code(code: str) -> str:
    """
    Виконує код користувача і повертає весь вивід (stdout) як стрічку.
    Використовується для кнопки Run.
    
    ДОДАНО: Перенаправлення sys.stdin на порожній буфер, щоб обробляти input() без помилок.
    """
    old_stdout = sys.stdout
    old_stdin = sys.stdin  # <--- Крок 1: Зберігаємо оригінальний sys.stdin
    
    buffer = io.StringIO()
    dummy_input = io.StringIO("")  # <--- Крок 2: Створюємо порожній буфер для вводу
    
    sys.stdout = buffer
    sys.stdin = dummy_input        # <--- Крок 3: Перенаправляємо sys.stdin
    
    try:
        # Приводимо код до виконуваного блоку
        exec(code, {})
    except Exception as e:
        # Вивід помилки у консоль
        return f"Exception: {type(e).__name__}: {e}"
    finally:
        # <--- Крок 4: Відновлюємо обидва потоки у блоці finally
        sys.stdout = old_stdout
        sys.stdin = old_stdin  
        
    return buffer.getvalue()

def run_tests(code: str, tests: list) -> list:
    """
    Запускає код + тести.
    tests: список dict-ів виду {'input': '...', 'output': '...', optional 'call': 'func()'}
    Повертає список результатів із полями input, expected, output, ok
    """
    results = []
    
    # Зберігаємо оригінальні потоки, щоб відновити їх у разі помилки
    old_stdin = sys.stdin
    old_stdout = sys.stdout
    
    for i, t in enumerate(tests):
        inp = t.get('input','')
        expected = str(t.get('output','')).strip()
        out = ""
        ok = False
        
        # Скидаємо буфер для кожного тесту
        buffer = io.StringIO()
        
        try:
            sys.stdout = buffer
            
            # Якщо input задано, замінюємо builtins.input, щоб симулювати stdin
            if inp:
                sys.stdin = io.StringIO(inp)
            else:
                # Встановлюємо порожній stdin для тестів без input, щоб уникнути блокування
                sys.stdin = io.StringIO('') 
                
            # Виконуємо код
            namespace = {}
            # Використовуємо exec() для підтримки багаторядкових виразів та функцій
            exec(code, namespace)
            
            # Якщо тест просить викликати функцію і перевірити її результат
            if 'call' in t:
                # Результат виклику також виводимо у stdout
                out_val = eval(t['call'], namespace)
                # Вивід значення у буфер
                if out_val is not None:
                     print(out_val)
                
            out = buffer.getvalue().strip()
            
            # Порівняння результату: використовуємо strip() для уніфікації
            ok = (out == expected)

        except Exception as e:
            # Відлов помилки
            ok = False
            out = f"Exception: {type(e).__name__}: {e}"
        finally:
            # Відновлюємо потоки
            sys.stdout = old_stdout
            sys.stdin = old_stdin
            
        results.append({
            'test_number': i + 1,
            'input': inp.replace('\n', '\\n'), # Для зручного відображення
            'expected': expected,
            'output': out,
            'ok': ok
        })
        
    return results

# Ініціалізація, яка потрібна Pyodide для завантаження
if __name__ == "__main__":
    pass











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