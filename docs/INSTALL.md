# Установка Event Agency на Windows Server

Пошаговая инструкция для администратора агентства. Всё, что нужно — выполнить 5 шагов.

> ⏱ **Время установки:** ~20 минут (без учёта скачивания компонентов).

---

## 📋 Что потребуется

**Сервер:**
- Windows Server 2019/2022 (или Windows 10/11 Pro)
- 4 ГБ RAM (минимум), 8 ГБ рекомендуется
- 20 ГБ свободного места
- Постоянное подключение к интернету

**Доступ:**
- Права Администратора на сервере
- Желательно — статический IP или домен

**Домен (опционально, для HTTPS):**
- Например, `agency-ivanov.ru`
- DNS-запись должна указывать на IP сервера
- Открыты порты 80 и 443 в firewall

---

## 🚀 Шаг 1. Открыть PowerShell от Администратора

1. Нажмите `Win` → введите `PowerShell`
2. Правой кнопкой на **Windows PowerShell** → **Запустить от имени администратора**
3. В окне UAC нажмите **Да**

Проверка (должно быть `True`):

```powershell
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

Если `False` — закройте и откройте PowerShell от админа.

---

## 📥 Шаг 2. Скачать установщик

**Вариант А (через Git, если он уже есть):**

```powershell
cd C:\
git clone https://github.com/boriksautiev-star/event-agency.git EventAgency
cd EventAgency\install
```

**Вариант Б (через ZIP, если Git ещё нет):**

1. Откройте в браузере: https://github.com/boriksautiev-star/event-agency
2. Нажмите зелёную кнопку **Code** → **Download ZIP**
3. Распакуйте в `C:\EventAgency` (или другую папку)
4. В PowerShell перейдите в папку:

```powershell
cd C:\EventAgency\install
```

> 💡 Если папка `C:\EventAgency` не пуста — установщик откажется работать. Используйте пустую папку.

---

## 🎬 Шаг 3. Запустить установку

В PowerShell (из папки `install`) выполните:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**Что произойдёт (по шагам):**

1. **Проверка прав** — если не от админа, выдаст ошибку.
2. **Запрос пути установки** — по умолчанию `C:\EventAgency`. Нажмите `Enter` для стандартного.
3. **Запрос домена** — если есть (например, `agency-ivanov.ru`) — введите; если нет — оставьте пустым (работает по `http://<IP>:3100`).
4. **Запрос лицензии** — путь к файлу `license.key` (или пусто = демо-режим 14 дней).
5. **Установка компонентов** через winget:
   - Node.js LTS (~30 сек)
   - PostgreSQL 16 (~1 мин)
   - Git (~30 сек)
   - NSSM (~10 сек)
   - Caddy (если указан домен, ~30 сек)
6. **Ввод пароля PostgreSQL** — введите пароль пользователя `postgres`, который задали при установке PostgreSQL.
   > ⚠️ Это **не** пароль от вашей БД Event Agency, а **superuser** PostgreSQL. Если не знаете — переустановите PostgreSQL с известным паролем.
7. **Создание БД** — автоматически создастся пользователь `event` и база `event_agency`.
8. **Клонирование кода** в `C:\EventAgency`.
9. **Установка npm-зависимостей** (~3 мин).
10. **Применение миграций** и опционально seed (демо-данные).
11. **Регистрация службы `EventAgencyAPI`** — Windows-служба для автозапуска при загрузке.
12. **Настройка HTTPS** (если домен был указан).
13. **Сохранение `install-info.txt`** с паролями и доступами.

**Ожидаемый финал:**

```
================================================
  ✅ УСТАНОВКА ЗАВЕРШЕНА
================================================

  Админ-панель: https://agency-ivanov.ru  (или http://<IP>:3100)
  Папка:        C:\EventAgency
  Инфо:         C:\EventAgency\install-info.txt
  Служба:       EventAgencyAPI
```

---

## 🔐 Шаг 4. Сохранить install-info.txt

Откройте файл `C:\EventAgency\install-info.txt`. В нём:

- Пароль БД (`event`)
- Setup-токен (для первичной настройки)
- URL админ-панели
- Имя Windows-службы

**⚠️ Скопируйте его в надёжное место** (флешка, менеджер паролей). Если удалите — пароль от БД нигде больше не хранится.

---

## 🖥 Шаг 5. Первичная настройка (создание директора)

1. Откройте в браузере URL из `install-info.txt` (например, `http://localhost:3100` или `https://agency-ivanov.ru`).
2. Если БД **без seed** — увидите **Setup Wizard**. Введите:
   - **Setup-токен** (из `install-info.txt`, поле `SETUP_TOKEN`)
   - Имя, фамилию директора
   - Телефон (например, `+79001234567`)
   - Пароль (минимум 8 символов)
3. Нажмите «Создать директора» — вы автоматически войдёте в панель.

**Если seed был** — войдите с готовой учётной записью из [README](../README.md#-быстрый-старт-разработка).

---

## 📱 Шаг 6. Мобильное приложение (для аниматоров)

1. Скачайте APK (ссылку предоставляет разработчик или агентство).
2. Установите на Android-телефон.
3. Откройте приложение — увидите экран **«Подключение к серверу»**.
4. Введите URL сервера:
   - `https://agency-ivanov.ru` (если настроен HTTPS)
   - `http://192.168.1.133:3100` (если в локальной сети)
   - `http://<публичный_IP>:3100` (если по IP)
5. Нажмите **«Проверить подключение»** → должно быть ✅.
6. Нажмите **«Продолжить»** → войдите с логином/паролем аниматора.

> 💡 Чтобы сменить сервер — в приложении: **Профиль → 🔧 Сменить сервер**.

---

## ✅ Шаг 7. Проверка работы

**Windows-служба:**

```powershell
Get-Service EventAgencyAPI
Get-Service EventAgencyCaddy   # если HTTPS
```

Оба должны быть `Running`.

**HTTP-проверка:**

```powershell
curl.exe http://localhost:3100/api/health
```

Ожидаемо: `{"status":"ok","db":"ok","time":"..."}`

**HTTPS-проверка** (если указан домен):

```powershell
curl.exe https://agency-ivanov.ru/api/health
```

> Первый запрос может занять 30–60 сек — Caddy получает сертификат от Let's Encrypt. Если не работает — проверьте, что:
> - DNS `agency-ivanov.ru` указывает на IP сервера
> - Порты 80 и 443 открыты в firewall
> - Нет других программ на портах 80/443 (IIS, Apache)

---

## 🔧 Управление службой

```powershell
nssm status EventAgencyAPI     # статус
nssm restart EventAgencyAPI    # перезапуск
nssm stop EventAgencyAPI       # остановить
nssm start EventAgencyAPI      # запустить
```

**Логи:**

- `C:\EventAgency\server\logs\service-out.log` — обычный вывод
- `C:\EventAgency\server\logs\service-err.log` — ошибки

**Живой просмотр:**

```powershell
Get-Content C:\EventAgency\server\logs\service-out.log -Tail 50 -Wait
```

---

## 🔄 Обновление

```powershell
cd C:\EventAgency
powershell -ExecutionPolicy Bypass -File install\update.ps1
```

Скрипт:
1. Создаст бэкап БД
2. Остановит службу
3. `git pull` (обновит код)
4. `npm ci` (обновит зависимости)
5. `prisma migrate deploy` (применит миграции)
6. Запустит службу

> ⚠️ **Всегда делайте бэкап БД перед обновлением** — скрипт это делает автоматически.

**Если что-то пошло не так:**

```powershell
cd C:\EventAgency\server
npm run db:restore -- backups\event_agency_<дата>.dump
```

---

## 🗑 Удаление

```powershell
cd C:\EventAgency
powershell -ExecutionPolicy Bypass -File install\uninstall.ps1
```

Спросит подтверждение + пароль postgres для удаления БД. Сохранить БД (только удалить файлы и службы):

```powershell
powershell -ExecutionPolicy Bypass -File install\uninstall.ps1 -KeepDatabase
```

---

## 🆘 Решение проблем

### «winget не найден»

Установите **App Installer** из Microsoft Store, или скачайте вручную: https://aka.ms/winget

### «psql.exe не найден»

PostgreSQL установлен, но `psql` не в PATH. Перезапустите PowerShell (он подхватит PATH из системы) или укажите полный путь вручную.

### «Служба создана, но не запустилась»

Посмотрите логи:

```powershell
Get-Content C:\EventAgency\server\logs\service-err.log -Tail 50
```

Типичные причины:
- `.env` с ошибкой (нет `DATABASE_URL` или `ENCRYPTION_KEY`)
- PostgreSQL не запущен
- Порт 3100 занят другим процессом

### «Caddy не получил сертификат»

Проверьте:
1. DNS: `nslookup agency-ivanov.ru` — должен возвращать IP вашего сервера
2. Порты 80/443: открыты в firewall (`Test-NetConnection -ComputerName agency-ivanov.ru -Port 80`)
3. Логи Caddy: `Get-Content C:\EventAgency\caddy\caddy.log -Tail 30` (если создан)

### «Push-уведомления не приходят»

1. Проверьте, что APK установлен с Google Play Services (не «AOSP» / «Google APIs»).
2. В приложении: **Профиль → Настройки уведомлений** — все тумблеры должны быть включены.
3. Проверьте, что у пользователя сохранён `expoPushToken` в БД.

### «Лицензия истекла»

1. Получите новый `license.key` от разработчика.
2. В админке: **Настройки → Лицензия → Загрузить новый файл (.key)**.
3. Если не помогает — проверьте, что системное время сервера корректное.

---

## 📞 Поддержка

Если проблема не решена:
1. Приложите логи из `C:\EventAgency\server\logs\service-err.log`
2. Опишите шаги до ошибки
3. Свяжитесь с разработчиком: **[указать контакт]**

---

*Документ обновлён: 2026-10-23*
