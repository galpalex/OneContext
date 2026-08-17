# Goal: OneContext — AI-powered omnichannel CRM

> **OneContext — every customer interaction, one clear next step.**

## Outcome

За 3 дня построить работающий SaaS-прототип **OneContext**: пользователь входит через Google, видит своих клиентов, объединяет обращения из Web, WhatsApp, Email и Phone в единый профиль и получает AI-рекомендацию следующего действия.

Продукт должен быть не просто журналом сообщений, а рабочим центром принятия решений для customer service / sales: единые данные → контекст → действие.

## User problem

Клиентские данные часто распределены между email, мессенджерами, веб-формами, телефонными звонками, таблицами и личными заметками. Из-за этого команда:

- долго ищет историю контакта;
- просит клиента повторять информацию;
- теряет лиды и follow-up-задачи;
- не видит, что клиенту действительно важно;
- тратит время на ручную запись и анализ.

CRM-системы решают эту проблему через централизованный профиль клиента, историю взаимодействий, автоматизацию, аналитику и интеграции. OneContext демонстрирует этот принцип в узком вертикальном срезе.

## Product promise

> One customer. Every interaction. One clear next action.

## Scope

Пользователь может:

1. Войти через Google OAuth.
2. Попасть в личный кабинет OneContext.
3. Создать и просматривать своих клиентов.
4. Добавить обращение из Web, WhatsApp, Email или Phone.
5. Увидеть единую хронологию обращений.
6. Запустить AI-анализ истории клиента через **OneContext AI**.
7. Получить summary, topics и next best action.
8. Выполнить понятное следующее действие: записать follow-up, добавить заметку или изменить статус.

## CRM principles

OneContext использует лучшие свойства современных CRM:

- единый 360-degree customer view;
- централизованный contact and interaction management;
- omnichannel history;
- workflow automation через следующий шаг;
- AI-powered recommendations;
- понятные dashboards and reporting;
- быстрый, визуальный и настраиваемый интерфейс;
- разделение данных пользователей через RLS;
- расширяемая модель каналов и интеграций.

## Non-goals

- Реальная интеграция с WhatsApp Business API, IMAP/email и телефонией.
- Полноценный enterprise CDP или Salesforce-конкурент.
- Сложные команды, роли, permissions и multi-tenant billing.
- Полноценная маркетинговая автоматизация.
- Автономные AI-агенты, которые отправляют сообщения без подтверждения человека.

## Success criteria

- [ ] Любой пользователь может войти через Google.
- [ ] Пользователь видит только собственные данные.
- [ ] Можно создать клиента.
- [ ] Можно добавить события по всем четырём каналам.
- [ ] Профиль показывает единый timeline.
- [ ] OneContext AI возвращает структурированный summary, topics и next_action.
- [ ] Рекомендация связана с конкретными событиями клиента.
- [ ] Есть понятное действие после рекомендации.
- [ ] Есть loading, empty, error и success states.
- [ ] Приложение опубликовано на Vercel.
- [ ] Подготовлены screenshots и demo walkthrough.

## Boundaries

- Frontend: React + Vite + TypeScript.
- Data/Auth: Supabase Postgres + Supabase Auth + RLS.
- Hosting: Vercel.
- AI: Google Gemini через защищённую serverless function.
- Demo data: синтетические данные.
- Любой AI output проходит schema validation и отображается как рекомендация, а не как безусловная истина.

## Positioning

Большие CRM/CDP объединяют данные на уровне всей компании и требуют множества интеграций. OneContext показывает более узкий сценарий для небольшой customer-facing команды: быстро собрать историю клиента из нескольких каналов, понять контекст и выбрать следующее действие.

## Stop rules

Останавливаемся после полного вертикального среза:

Google login → OneContext customer list → customer profile → four channel events → unified timeline → OneContext AI insight → human-confirmed next action → Vercel deployment.

Всё, что не усиливает эту цепочку, переносится на следующую итерацию.