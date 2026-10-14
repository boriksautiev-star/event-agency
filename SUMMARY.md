# Саммари проекта Event Agency (обновлено 2026-10-14, после cron-fix)

## 🎯 Что это

Приложение для управления ивент-агентством. Три роли: director, admin, animator.
Self-hosted (свой Windows Server). Три клиента:
- server — Express API + PostgreSQL
- mobile — RN / Expo SDK 57 (dev-client)
- admin-web — React 19 + Vite + TanStack Query + Tailwind + Radix

Монорепо: D:\Projects\event-agency (workspaces: shared, server, admin-web, mobile)

## 🖥️ Окружение

- Windows Server 2022, Node v24.19.0, PostgreSQL 18.4
- PM2: event-agency-api (id 10, fork), порт 3100
- БД: event_agency / event / eventagency2026strong
- Health: curl.exe http://localhost:3100/api/health
- Timezone: Russian Standard Time (UTC+3, Москва)
- Мобилка API_URL = http://192.168.1.133:3100 (без /api, пути с /api/...)
- Admin-web: Vite dev http://localhost:5173, proxy /api → :3100
- Metro: npx expo start --dev-client --host lan (из mobile/)
- ОСТОРОЖНО: другой проект — IronAds (порт 3001, cluster, id 1-6) — НЕ трогать

## 🗄️ Стек

- server: TS + Express + Prisma + PostgreSQL
- mobile: RN + Expo + React Navigation + axios + material-top-tabs + react-native-safe-area-context
- admin-web: Vite + React 19 + TS + React Router v7 + axios + TanStack Query + Tailwind + Radix + lucide-react
- shared: роли, права, статусы, типы, ставки (RATE_DURATIONS = [30,40,45,60,90,120,180])

## 🔐 Учётные записи (seed)

Директор:  +79001234567 / superpassword123   (Иван Иванов)
Админ:     +79002223344 / adminpass123       (Ольга Петрова)
Аниматор:  +79007778899 / animpass123        (Анна Сидорова)
Аниматор:  +79005556677 / animpass123        (Пётр Кузнецов)

⚠️ UUID пользователей МЕНЯЮТСЯ при каждом seed. Не хардкодить их в скриптах —
сначала получать через SELECT/логин.

Seed полностью чистит БД. Запуск: cd server && npm run db:seed
Перед — pm2 stop, после — pm2 start.

Seed содержит:
- AgencySettings (Event Agency)
- AdminCompensation 7%
- 2 клиента, 6 групп, 14 персонажей с ценами
- 2 персональных шаблона ставок (Анна 34, Пётр 34) — через RateTemplate
- 6 категорий расходов
- 5 демо-заказов (Маша/Корпоратив/Свадьба/Утренник/Отменённый)
- AdminAccrual 1575 + AdminPayment 500 (аванс)

Cleanup в seed включает: handoverRequest, orderChange, orderStatusHistory,
orderPayment, orderAnimator, orderSlot, order, expense, expenseCategory,
characterPriceOption, character, rateTemplateRate, rateTemplate,
animatorRateOverride, rateGroup, client, refreshToken, user, appSetting,
adminPayment, adminAccrual, adminCompensation, agencySettings.

## 📁 Ключевые модели БД

### Заказы
User, Client, RateGroup, Character, CharacterPriceOption
Order, OrderSlot, OrderAnimator, OrderPayment, OrderStatusHistory, OrderChange
AgencySettings, AdminCompensation, AdminAccrual, AdminPayment

### Release reasons
enum ReleaseReason: declined | handed_over | removed_rotation | removed_quality | order_cancelled
OrderAnimator.{releaseReason, releaseComment, releasedAt}

### Handover (HA1–HA4)
enum HandoverRequestStatus: pending_receiver | pending_approval | approved |
  rejected_by_receiver | rejected_by_admin | cancelled
HandoverRequest: id, orderId, slotId, fromAnimatorId, toAnimatorId, comment,
  status, requestedAt, acceptedAt, resolvedAt, resolvedBy, rejectComment

### Rate Templates (текущая система ставок)
RateTemplate: id, name (unique), notes, isActive, createdAt, updatedAt
RateTemplateRate: id, templateId, rateGroupId, durationMin, amount
  @@unique([templateId, rateGroupId, durationMin])
AnimatorRateOverride: id, animatorId, characterId, durationMin, amount
  @@unique([animatorId, characterId, durationMin])
User.rateTemplateId: String? → RateTemplate (onDelete: SetNull)

⚠️ Модель Rate УДАЛЕНА (миграция 20261013190714_drop_rates_table).
Legacy эндпоинты /api/rates/matrix и /api/rates/lookup УДАЛЕНЫ.
Legacy UI (RateMatrixScreen, RatesMatrixPage, api/rates.ts, useRates.ts) УДАЛЕНЫ.

## 🔌 API — Rate Templates (только director)

GET    /api/rates/templates                                      — список
GET    /api/rates/templates/:id                                  — детали (cells[], animators[])
POST   /api/rates/templates                                      — создать { name, notes?, copyFromTemplateId? }
PATCH  /api/rates/templates/:id                                  — обновить { name?, notes?, isActive? }
DELETE /api/rates/templates/:id                                  — удалить (только если 0 аниматоров)
PUT    /api/rates/templates/:id/rates                            — bulk upsert/delete cells + пересчёт
POST   /api/rates/templates/assign                               — назначить { animatorId, templateId|null } + пересчёт
GET    /api/rates/overrides?animatorId=                          — override аниматора
PUT    /api/rates/overrides                                      — bulk replace override + пересчёт

## 🔌 API — handover

POST   /api/orders/:id/slots/:slotId/handover                    — создать (animator)
GET    /api/orders/:id/slots/:slotId/handover-candidates         — свободные аниматоры
GET    /api/handover/my-outgoing?status=all                      — исходящие (animator)
GET    /api/handover/my-incoming?status=all                      — входящие (animator)
GET    /api/handover/pending-approval                            — очередь (director/admin)
GET    /api/handover/:id                                         — детали
POST   /api/handover/:id/accept                                  — принять → pending_approval
POST   /api/handover/:id/decline                                 — отклонить
DELETE /api/handover/:id                                         — отозвать
POST   /api/handover/:id/approve                                 — атомарная замена
POST   /api/handover/:id/reject                                  — отказать

## 🎯 Логика ставок (template + override)

При назначении аниматора на слот (RatesService.lookup):
1. Override по (animatorId, characterId, durationMin)? → source: "override"
2. Иначе — шаблон аниматора по (character.rateGroupId, durationMin) → source: "template"
3. Иначе — payout вручную (found: false, source: null)

Автопересчёт будущих назначений при:
- saveRates (шаблон): пересчёт всех аниматоров на этом шаблоне
- assign (смена шаблона): пересчёт одного аниматора
- saveOverrides: пересчёт одного аниматора

Условия пересчёта (orderAnimator):
- payoutSource = "rate_matrix"
- payoutPaidAt IS NULL
- order.eventDate >= сегодня
- order.status NOT IN (completed, cancelled)

⚠️ Кастомные длительности (35 мин и т.п.) — поддержаны:
- union RATE_DURATIONS + priceOptions всех персонажей + уже сохранённые в шаблоне
- Функция getEffectiveDurations(characters, existingDurations) в shared/src/rates.ts
- Динамические колонки в RateTemplateEditPage / AnimatorRatesModal (admin-web)
- Динамические строки в RateTemplateEditScreen / AnimatorRatesScreen (mobile)

## 🎯 Логика handover (три шага)

1. Аня создаёт заявку → Пете push
2. Петя подтверждает (accept) → push Ане и админам
3. Админ/директор approve → атомарная замена:
   - Аня → status=removed, releaseReason=handed_over, releasedAt=now
   - Петя → status=invited, payout из шаблона/override
   - Заявка → approved
   - OrderChange: field=handover_approved

Пока approve не случился — assignment НЕ меняется (проверено curl-тестом).

Cron напоминаний (jobs/handover-reminders.job.ts):
- Каждые 30 минут
- Кому: получателю заявки (toAnimatorId)
- Текст: "{fromName} ждёт вашего ответа: {orderTitle}"
- Без лимита — пока заявка в pending_receiver
- Ручной триггер: runHandoverRemindersNow() — используется для тестов

## 📱 Мобилка

Табы:
- Аниматор: Заказы / Отчёты / Профиль
- Директор: Сводка / Заказы / Клиенты / Аниматоры / Финансы / Профиль
- Админ: Сводка / Заказы / Клиенты / Профиль

### Сводка (DashboardScreen → DashboardStack)
- Баннер «Заявки на передачу (N)» если > 0 (СДЕЛАТЬ КЛИКАБЕЛЬНЫМ — на этом шаге не кликается)
- 4 метрики: Заказов сегодня / Свободные аниматоры / Без аниматора / Без предоплаты (директор)
- Касса за месяц (директор)
- Ближайшие / Требуют назначения / Ожидают предоплату (директор)
- Тап на заказ → OrderDetail внутри стека Сводки, «Назад» возвращает в Сводку

### Rate Templates (в StaffAnimatorsStack)
- RateTemplatesScreen — таб «Шаблоны» в StaffAnimatorsTabs (4-й)
- RateTemplateEditScreen — редактор (карточки групп × длительностей, динамические)
- AnimatorRatesScreen — привязка шаблона + override (персонаж × длительности, динамические)
- Действия с шаблоном (bottom-sheet, ⋯ или долгий тап): Редактировать ставки /
  Дублировать / Переименовать / В архив (или Активировать) / Удалить / Отмена
- Placeholder в override-таблице = базовая ставка из шаблона
- Кнопка «🎯 Шаблон и переопределения» в карточке аниматора

### Кастомные длительности (в CharacterFormScreen)
- В секции «Цены для клиента» кнопка «+ Добавить длительность»
- Открывает bottom-sheet: чипсы стандартных + input «Своя» (1-1440 мин)
- Кастомные помечаются меткой «своя» в списке
- Сервер принимает любые durationMin (валидация min 1 max 1440)
- Кастомные длительности автоматически появляются в шаблонах/override

### Push
- order_* → navigateToOrder(orderId)
- handover_* → navigateToHandover(requestId)
- Проверено end-to-end на реальном устройстве (Expo dev-client)
- 4 направления: assign / create handover / accept / approve

### Что НЕ сделано в мобилке
- Директор/админ не может APPROVE/REJECT handover из мобилки
- Баннер «Заявки на передачу (N)» на Сводке не кликабелен
- Push handover_pending_approval ведёт на HandoverDetail, а не на список для approve

## 🖥️ Admin-web

Сайдбар: Сводка / Заказы / Клиенты / Аниматоры / Передачи / Справочники /
  Финансы / Сотрудники(D) / Настройки(D)

### Раздел «Аниматоры» (AnimatorsLayout)
Табы: Аниматоры / Шаблоны ставок (Матрица ставок УДАЛЕНА)

### RateTemplatesPage
- Список шаблонов: название, ставок, аниматоров, статус
- Кнопки: Редактировать / Дублировать / Архив-Распаковать / Переименовать / Удалить
- Клик на бейдж статуса — тоже переключает архив

### RateTemplateEditPage
- Таблица: строки = группы, столбцы = динамические длительности
- Inline-edit + Сохранить + Отменить
- Показывает affectedAssignments

### AnimatorRatesModal (кнопка Layers в списке аниматоров)
- Секция «Шаблон» (dropdown + Сохранить)
- Секция «Переопределения» (таблица персонаж × длительность)
- Placeholder в полях = базовая ставка из шаблона

### Сводка (DashboardPage)
- Метрики, баннер «Заявки на передачу», касса за месяц, ближайшие/требуют назначения/ожидают предоплату
- Тап на заказ → orderDetail со state.from=dashboard → кнопка «←» делает navigate(-1)

### Handover (/handover)
- Очередь pending_approval + approve/reject
- Пункт в сайдбаре «🔄 Передачи»
- Баннер на дашборде при N > 0
- Требует ПРОВЕРКИ — работает ли approve/reject (см. план на сегодня)

## 💰 Предоплата — кто может

- Сумму предоплаты (prepaymentAmount) — только директор
- Отметку предоплаты (prepaymentPaid) — директор + админ
- Метод финала (finalPaymentMethod) — только директор
- Финальная оплата (POST /final-payment) — все, включая аниматора
- Сдача в кассу (handover final) — только директор
- В мобильном StaffOrderEditScreen поле суммы предоплаты заблокировано для админа

## 🇷🇺 Русский язык в истории изменений

Admin-web OrderDetailPage:
- FIELD_LABELS + ENUM_VALUE_LABELS + translateEnum()

Mobile utils/labels.ts:
- CHANGE_FIELD_LABELS + RELEASE_REASON_LABELS + PAYMENT_METHOD_LABELS + PAYOUT_SOURCE_LABELS
- translateChangeValue(field, raw)
- Используется в StaffOrderDetailScreen

## ⚠️ ГРАБЛИ И РЕШЕНИЯ

### Кодировка и PowerShell
1. TS/JS-скрипты: [System.IO.File]::WriteAllText(path, content, (New-Object System.Text.UTF8Encoding($false)))
2. .ps1 — ОБЯЗАТЕЛЬНО $true (BOM), иначе CP1251 → кракозябры
3. В here-string @'...'@ НИКОГДА не писать двойной бэкслеш \\uXXXX
4. Закрывающий '@ — в начале строки, без пробелов
5. PowerShell 5.1 НЕ понимает && и <<< (только PS7+ или bash)
6. Для больших файлов: node -e "console.log(require('fs').readFileSync('path','utf8'))"
   или Get-Content -Raw -Encoding UTF8 ... | Set-Clipboard
7. Большие SUMMARY (>300 строк) писать частями через appendFileSync —
   here-string не выдерживает объём, файл молча становится пустым (проверять length!)

### Node-скрипты для патчей
8. fs.writeFileSync ПОСЛЕ каждого rep() — не в конце
9. Уникальность анкора: src.split(oldText).length - 1 === 1
10. Конец строки: определять через src.includes("\r\n")
    (schema.prisma — LF, большинство — LF)
11. Точные анкоры, не regex
12. req.user.sub, НЕ .id
13. ORDER_STATUS_LABELS из @event-agency/shared
14. Prisma-миграция лочит PM2: pm2 stop → prisma migrate → pm2 start
15. Push в approve — ВНЕ транзакции (иначе ошибка откатит транзакцию)

### API и логика
16. API возвращает { items: [...] }, не массив
17. Мобилка: API_URL без /api, пути с /api/...
18. limit=500 в admin-web → 422. Max 200
19. На Android Alert.alert — МАКС 3 кнопки
20. На Android Alert.prompt НЕ работает
21. useCharacters в admin-web — БЕЗ параметра limit
22. fetchCharacters возвращает массив, не { items }
23. UUID пользователей МЕНЯЮТСЯ после seed — не хардкодить

### Rate Templates
24. rateTemplateId nullable
25. Override НЕ nullable (нет override = нет строки)
26. RateTemplate.name @unique → в seed очищать перед create
27. Cleanup в seed (порядок важен): handoverRequest, orderChange,
    orderStatusHistory, orderPayment, orderAnimator, orderSlot, order, ...
    rateTemplateRate, rateTemplate, animatorRateOverride, ...
28. Legacy saveMatrix был ОПАСЕН — писал в rateTemplateId аниматора
    (мог поломать общий шаблон). УДАЛЁН

### Cron
29. Напоминание идёт ПОЛУЧАТЕЛЮ (toAnimatorId), не отправителю
30. Ручной триггер: runHandoverRemindersNow() в handover-reminders.job.ts
31. На Windows при process.exit(0) до завершения Firebase SDK —
    libuv assertion (не наш баг, игнорировать)

### Git
32. После каждого блока: git add -A && git status --short && git commit && git push
33. .gitignore: firebase-admin-key.json, credentials.json, google-services.json,
    server/.env, mobile/android/, scaffold-*.js, patch-*.js, /*.ps1, CLAUDE.md, AGENTS.md

## 🎨 Стиль работы с пользователем

- Программирует сам, читает код, копирует скрипты целиком
- Отвечать структурно, короткими блоками
- Скрипты создавать в корне как scaffold-*.js / patch-*.js / write-*.js, удалять после
- После патча — npm run typecheck (корень) + npx tsc --noEmit (mobile)
- Перед крупными изменениями — уточнять развилки
- Пользователь устаёт от больших сессий — предлагать отдых
- Формат патчей: один блок $content = @'...'@ + WriteAllText + node + Remove-Item + typecheck

## 📌 ТЕКУЩИЙ СТАТУС (на 2026-10-14, утро)

Работает:
- PM2: event-agency-api online (id 10), health ok
- Typecheck: shared, server, admin-web — чисто; mobile npx tsc --noEmit — чисто
- Git: main = origin
- HEAD: 67e5e1c fix(cron): reminder goes to receiver, not sender

Сделано за последние 5 сессий (2026-10-11..13):
1. HA1–HA4 (Handover): модель + API + push + cron + мобилка + admin-web
2. Сводка в мобилке (директор + админ)
3. Возврат «назад» в источник из карточки заказа (мобилка + admin-web)
4. Админ может отмечать/снимать предоплату (сумма/метод — только директор)
5. Русский язык в истории изменений (мобилка + admin-web)
6. Группы ставок (Rate Templates): сервер + admin-web + mobile
7. Кастомные длительности у персонажа (мобилка)
8. Кастомные длительности прокинуты в шаблоны и override (все клиенты)
9. УДАЛЕНИЕ LEGACY Rate matrix: сервер, БД, оба UI, seed
10. Push handover проверен END-TO-END на реальном устройстве (все 4 направления)
11. Cron-напоминания починены (получатель toAnimator + правильный текст)
12. .gitignore защищён от временных .ps1-скриптов

## 🚧 Что осталось (план на 2026-10-14)

### Ближайшее (сегодня)
1. 📱 Approve/Reject handover в мобилке (director/admin):
   - Экран HandoverPendingScreen (список pending_approval + approve/reject с комментарием)
   - Кликабельный баннер на Сводке → этот экран
   - Счётчик в шапке таба (страховка от пролистанного push)
   - Deep-link из push handover_pending_approval → этот экран

2. 🌐 Проверка web handover (/handover в admin-web) — 15 мин

3. 🔍 Аудит логики статусов заказа:
   - Все переходы OrderStatus — кто может, что триггерит
   - Сверить с матрицей прав в саммари
   - Curl e2e на все переходы
   - Синхронизировать frontend (кнопки) с backend

### Средние задачи
4. 🌐 Публикация в другие агентства — nssm/HTTPS/инфра/инструкция
   (начать с проектирования: мультитенантность, HTTPS, обновления)
5. 👤 Личный кабинет клиента — новая роль, magic-link

### Опционально
6. UX override в мобилке: свернуть группы / фильтр
7. Синхронизация дефолтного периода отчёта аниматора между клиентами
8. Унификация текстов push про assign

## 🔑 Полезные команды

# Проверка
cd D:\Projects\event-agency
pm2 list
curl.exe http://localhost:3100/api/health
git status --short
git log --oneline -5

# Typecheck
npm run typecheck
cd mobile && npx tsc --noEmit

# Рестарт API
pm2 restart event-agency-api
pm2 logs event-agency-api --lines 20 --nostream

# Seed (ЧИСТИТ БД!)
pm2 stop event-agency-api
cd server
npm run db:seed
cd ..
pm2 start event-agency-api

# Миграция
pm2 stop event-agency-api
cd server
npx prisma migrate dev --name <name>
cd ..
pm2 start event-agency-api

# Логин
$body = '{"phone":"+79001234567","password":"superpassword123"}'
$login = Invoke-RestMethod -Uri "http://localhost:3100/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

# Ручной триггер cron-напоминаний (для тестов)
# trigger-reminders.ts в корне:
#   const { runHandoverRemindersNow } = require("./server/src/jobs/handover-reminders.job.ts");
#   runHandoverRemindersNow().then(() => process.exit(0));
# Запуск: cd server && npx tsx ..\trigger-reminders.ts

# Git
git add -A
git status --short
git commit -m "..."
git push

## 📋 На старте новой сессии

1. Прочитать саммари.
2. Проверить: pm2 list, curl health, git status, git log -3.
3. Убедиться что typecheck чистый.
4. Спросить пользователя что делаем.
5. Приоритеты: approve handover в мобилке → аудит статусов заказа → публикация.
