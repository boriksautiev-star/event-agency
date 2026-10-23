# Event Agency

> Платформа для управления ивент-агентством: заказы, аниматоры, финансы, отчёты, передача заказов.

**Self-hosted.** Один сервер = одно агентство. Мобильное приложение + веб-админка.

---

## 🎯 Возможности

**Для директора:**
- Заказы: клиенты, персонажи, расписание, статусы, предоплата, финальный расчёт
- Ставки аниматоров: шаблоны по группам персонажей + персональные override
- Финансы: выплаты аниматорам, расходы, касса за месяц, зарплатные начисления админам
- Отчёты по аниматорам: заказы, часы, выплаты, отказы, передачи
- Управление сотрудниками (director, admin, animator)
- Настройки: реквизиты, валюта, часовой пояс, push-уведомления, лицензия
- Бэкапы БД: локальные (по расписанию) + S3-облако (Yandex, VK, AWS, MinIO)

**Для админа:**
- Заказы (создание, редактирование, статусы)
- Клиенты, справочники
- Подтверждение/отклонение передач заказов
- Push-уведомления о событиях

**Для аниматора:**
- Заказы на сегодня/будущее, входящие приглашения
- Принять / отклонить заказ с комментарием
- Отметить выполнение
- Передать заказ другому аниматору (handover)
- Отчёты: часы, выплаты, история отказов/передач
- Push-уведомления

**Кроссплатформенные фичи:**
- Передача заказа (handover) с трёхуровневым подтверждением
- Единая история изменений (статусы + правки полей)
- Push-уведомления (Expo/FCM), настраиваемые по типам событий
- Резервное копирование + восстановление
- Лицензирование (оффлайн JWT, grace period 10 дней)

---

## 🛠 Стек

**Backend (`server`):** TypeScript + Express + Prisma + PostgreSQL
**Admin-web (`admin-web`):** React 19 + Vite + TanStack Query + Tailwind + Radix UI
**Mobile (`mobile`):** React Native + Expo SDK 57 (dev-client)
**Shared (`shared`):** общие типы, роли, права, статусы, ставки

**Инфраструктура:**
- Node.js 20 LTS, PostgreSQL 16
- PM2 (разработка) / NSSM (production) — Windows-служба
- Caddy — HTTPS с автоматическим Let's Encrypt
- Windows Task Scheduler — ежедневные бэкапы

---

## 📁 Структура

```
event-agency/
├── admin-web/          # Веб-админка (React)
├── mobile/             # Мобильное приложение (React Native / Expo)
├── server/             # Backend (Express + Prisma)
│   ├── prisma/         # Схема БД и миграции
│   ├── scripts/        # Скрипты бэкапов (backup-db.ps1, restore-db.ps1)
│   └── src/
│       ├── modules/    # Фича-модули (orders, handover, backups, license, ...)
│       ├── jobs/       # Cron-задачи (напоминания, проверка бэкапа)
│       └── license/    # Система лицензирования
├── shared/             # Общий код (типы, константы)
├── install/            # Скрипты установки для клиента
│   ├── install.ps1     # Установка одной командой
│   ├── update.ps1      # Обновление
│   └── uninstall.ps1   # Удаление
└── docs/               # Документация
```

---

## 🚀 Быстрый старт (разработка)

**Требования:** Node.js 20+, PostgreSQL 16+, Git.

```powershell
# 1. Клонировать
git clone https://github.com/boriksautiev-star/event-agency.git
cd event-agency

# 2. Установить зависимости
npm ci

# 3. Настроить .env
Copy-Item server/.env.example server/.env
# Отредактировать server/.env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
# Сгенерировать секреты: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Миграции + seed
cd server
npx prisma migrate deploy
npm run db:seed
cd ..

# 5. Запустить (3 терминала)
npm run dev --workspace=server      # API на :3100
npm run dev --workspace=admin-web   # UI на :5173
cd mobile; npx expo start --dev-client --host lan
```

**Учётные записи после seed:**
- Директор: `+79001234567` / `superpassword123`
- Админ: `+79002223344` / `adminpass123`
- Аниматор: `+79007778899` / `animpass123`

---

## 🖥 Установка на сервер (production)

См. подробную инструкцию → **[docs/INSTALL.md](docs/INSTALL.md)**

Кратко (Windows Server 2019+, от Администратора):

```powershell
powershell -ExecutionPolicy Bypass -File install\install.ps1
```

Скрипт сам:
- Установит Node.js, PostgreSQL, Git, NSSM через winget
- Создаст БД и пользователя (сгенерирует пароль)
- Склонирует репозиторий
- Применит миграции и seed
- Зарегистрирует Windows-службу `EventAgencyAPI`
- Настроит HTTPS через Caddy (если указан домен)
- Создаст `install-info.txt` с доступами

---

## 📚 Документация

- **[Установка](docs/INSTALL.md)** — пошаговая инструкция для клиента
- **[Руководство администратора](docs/ADMIN-GUIDE.md)** — как пользоваться системой
- **[История версий](docs/CHANGELOG.md)** — что нового в каждой версии
- **[Лицензия](docs/LICENSE.md)** — условия использования

---

## 🆘 Поддержка

При проблемах с установкой или работой:
1. Проверьте логи: `<install>\server\logs\service-err.log`
2. Свяжитесь с разработчиком: **[указать контакт]**

---

## 📄 Лицензия

Проприетарная. См. [docs/LICENSE.md](docs/LICENSE.md).
