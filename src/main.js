import './styles.css';
import { supabase } from './supabase.js';
import { levels, allLessons, findLesson, findLevel } from './course/index.js';
import { scoreAnswers, progressPercent, nextReview, dueReviews, nextStudyDate, latestPosition, levelProgress, formatMinutes, weeklyPerformance, learningStatus, recommendedTopics } from './learning.js';

const app = document.querySelector('#app');
const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const state = { user: null, profile: null, progress: [], reviews: [], games: [], events: [], authMode: 'signup', notice: '', result: null, lessonStartedAt: 0, loading: true };

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const completedIds = () => new Set(state.progress.filter(row => row.completed_at).map(row => row.lesson_id));
const progressFor = id => state.progress.find(row => row.lesson_id === id);
const gameFor = id => state.games.find(row => row.level_id === id);
const reviewFor = id => state.reviews.find(row => row.lesson_id === id);
const route = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
const path = (section = '', id = '') => `#/${section}${id ? `/${id}` : ''}`;

function setNotice(message) { state.notice = message; render(); }
function clearResult() { state.result = null; state.lessonStartedAt = Date.now(); }
function formatDate(value) { return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); }
function renderNotice() { return state.notice ? `<div class="notice" role="status">${esc(state.notice)} <button type="button" data-action="dismiss" aria-label="Закрыть">×</button></div>` : ''; }

async function loadData() {
  const [profile, progress, reviews, games, events] = await Promise.all([
    supabase.from('english_profiles').select('*').eq('user_id', state.user.id).maybeSingle(),
    supabase.from('english_lesson_progress').select('*').eq('user_id', state.user.id),
    supabase.from('english_review_items').select('*').eq('user_id', state.user.id),
    supabase.from('english_level_games').select('*').eq('user_id', state.user.id),
    supabase.from('english_study_events').select('*').eq('user_id', state.user.id).order('occurred_at', { ascending: false }).limit(500),
  ]);
  const error = [profile, progress, reviews, games, events].find(item => item.error)?.error;
  if (error) throw error;
  state.profile = profile.data;
  state.progress = progress.data ?? [];
  state.reviews = reviews.data ?? [];
  state.games = games.data ?? [];
  state.events = events.data ?? [];
}

async function syncAuth(user) {
  if (state.user?.id === user?.id && !state.loading) { render(); return; }
  state.user = user ?? null;
  state.loading = true;
  render();
  try {
    if (state.user) await loadData();
    else { state.profile = null; state.progress = []; state.reviews = []; state.games = []; state.events = []; }
  } catch (error) { state.notice = `Не удалось загрузить данные: ${error.message}`; }
  state.loading = false;
  render();
}

function renderHeader() {
  return `<header class="site-header"><div class="container header-inner">
    <a class="brand" href="#/" aria-label="English Together — главная"><span class="brand-mark">E<span>+</span></span><span>English<br><strong>Together</strong></span></a>
    ${state.user && state.profile ? `<nav class="main-nav" aria-label="Главная навигация"><a href="#/" data-nav="home">Главная</a><a href="#/levels" data-nav="levels">Уровни</a><a href="#/review" data-nav="review">Повторение <span class="nav-count">${dueReviews(state.reviews).length}</span></a><a href="#/settings" data-nav="settings">План</a></nav>` : ''}
    <div class="header-actions">${state.user ? `<span class="user-pill">${esc(state.profile?.display_name || state.user.email?.split('@')[0] || 'Ученик')}</span><button type="button" class="text-button" data-action="signout">Выйти</button>` : `<a class="small-link" href="#/auth">Войти</a>`}</div>
  </div></header>`;
}

function renderLanding() {
  const showAuth = route()[0] === 'auth';
  return `<main>
    <section class="hero"><div class="container hero-grid"><div>
      <span class="eyebrow"><span class="spark">✦</span> Учись в своём ритме</span>
      <h1>Английский, который <em>остаётся</em> с тобой.</h1>
      <p class="hero-lead">От первых слов до сложных разговоров. Объяснение, практика, игра и повторение в одном месте — с личным графиком и сохранением каждого шага.</p>
      <div class="hero-actions"><a class="button button-primary" href="#/auth">Начать бесплатно <span aria-hidden="true">↗</span></a><a class="button button-light" href="#/levels">Посмотреть программу</a></div>
      <div class="hero-note">7 ступеней · ${allLessons.length} уроков · свой график занятий</div>
    </div><div class="hero-art" aria-hidden="true"><div class="art-sun"></div><div class="art-card art-card-one"><span>01 / Pre-A1</span><strong>Hello, world!</strong><small>Первый шаг уже здесь</small></div><div class="art-card art-card-two"><span>Твой прогресс</span><strong>Каждый день<br>чуть увереннее</strong><div class="art-progress"><i></i></div></div><div class="art-orbit">Aa</div></div></div></section>
    <section class="container feature-section"><div class="section-head"><span class="eyebrow">Как устроено обучение</span><h2>Учиться, пробовать, возвращаться</h2></div><div class="feature-grid"><article class="feature-card"><span class="feature-icon">01</span><h3>Понятная теория</h3><p>Короткие объяснения по-русски, примеры на английском и новые слова в контексте.</p></article><article class="feature-card"><span class="feature-icon">02</span><h3>Практика каждый день</h3><p>Чтение, прослушивание диалогов, письмо, устные задания и проверка ответов.</p></article><article class="feature-card"><span class="feature-icon">03</span><h3>Память надолго</h3><p>Повторение возвращает урок через 1, 3, 7 и больше дней — по твоим результатам.</p></article></div></section>
    <section class="container levels-preview"><div class="section-head"><span class="eyebrow">От простого к сложному</span><h2>Маршрут от нуля до C2</h2></div><div class="level-strip">${levels.map((level, i) => `<div class="level-step" style="--level-color:${level.color}"><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(level.badge)}</strong><small>${esc(level.name)}</small></div>`).join('')}</div></section>
    <section class="container auth-section" id="auth"><div class="auth-copy"><span class="eyebrow">Твой следующий шаг</span><h2>Создай личное пространство</h2><p>После входа ты выберешь дни и минуты занятий. У каждого ученика свой прогресс, даже если вы учитесь вместе.</p><p class="muted">Письма не нужны: после регистрации ты сразу попадёшь в курс.</p></div>${renderAuthForm()}</section>
  </main>`;
}

function renderAuthForm() {
  const signup = state.authMode === 'signup';
  return `<div class="auth-card"><div class="segmented"><button type="button" class="${signup ? 'active' : ''}" data-action="auth-signup">Регистрация</button><button type="button" class="${!signup ? 'active' : ''}" data-action="auth-login">Вход</button></div>
    <h3>${signup ? 'Начнём учиться?' : 'Рад тебя видеть снова'}</h3><p>${signup ? 'Создай аккаунт, чтобы сохранить свой путь.' : 'Войди и продолжи с того места, где остановился.'}</p>
    <form data-form="auth"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Пароль<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required placeholder="Не менее 8 символов"></label><button class="button button-primary full" type="submit">${signup ? 'Создать аккаунт' : 'Войти'}</button></form>
    <p class="form-note">${signup ? 'Аккаунт откроется сразу. Сохрани пароль: без писем восстановить забытый пароль нельзя.' : 'Если помнишь пароль, его можно поменять в личном плане после входа.'}</p></div>`;
}

function renderOnboarding(settings = false) {
  const chosen = state.profile?.study_days ?? [1, 2, 3, 4, 5];
  const minutes = state.profile?.minutes_per_day ?? 20;
  return `<main class="container onboarding"><div class="onboarding-intro"><span class="eyebrow">${settings ? 'Личный план' : 'Шаг 1 из 1'}</span><h1>${settings ? 'Настрой свой ритм' : 'Сколько времени ты готов уделять английскому?'}</h1><p>Выбери дни и минуты. План можно менять в любой момент. Прогресс привязан к аккаунту и доступен с другого устройства.</p></div>
  <form data-form="profile" class="plan-card"><label>Как тебя называть?<input name="display_name" maxlength="40" required value="${esc(state.profile?.display_name || '')}" placeholder="Твоё имя"></label><fieldset><legend>В какие дни заниматься?</legend><div class="day-picker">${[1,2,3,4,5,6,0].map(day => `<label class="day-choice"><input type="checkbox" name="day" value="${day}" ${chosen.includes(day) ? 'checked' : ''}><span>${dayNames[day]}</span></label>`).join('')}</div></fieldset><label>Сколько минут в выбранный день?<div class="minutes-field"><input name="minutes" type="number" min="5" max="240" step="5" value="${minutes}" required><span>минут</span></div></label><p class="muted">Даже 10–20 минут регулярно полезнее длинного занятия раз в месяц.</p><button class="button button-primary" type="submit">${settings ? 'Сохранить план' : 'Начать обучение'} <span aria-hidden="true">↗</span></button></form>${settings ? `<form data-form="password" class="plan-card"><h2>Сменить пароль</h2><p class="muted">Письма не отправляются. Чтобы сменить пароль, сначала введи текущий.</p><label>Текущий пароль<input name="current_password" type="password" autocomplete="current-password" required></label><label>Новый пароль<input name="new_password" type="password" autocomplete="new-password" minlength="8" required></label><label>Повтори новый пароль<input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required></label><button class="button button-primary" type="submit">Сменить пароль</button></form>` : ''}</main>`;
}

function renderWeek() {
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return day; });
  return `<div class="week-grid">${days.map(day => { const key = day.toDateString(); const minutes = state.events.filter(event => new Date(event.occurred_at).toDateString() === key).reduce((sum, event) => sum + event.duration_minutes, 0); const planned = state.profile.study_days.includes(day.getDay()); const today = day.toDateString() === now.toDateString(); return `<div class="week-day ${today ? 'today' : ''} ${minutes ? 'done' : ''}"><span>${dayNames[day.getDay()]}</span><strong>${day.getDate()}</strong><small>${minutes ? `${minutes} мин` : planned ? 'план' : 'выходной'}</small></div>`; }).join('')}</div>`;
}

function renderDashboard() {
  const done = completedIds();
  const current = latestPosition(levels, done);
  const due = dueReviews(state.reviews);
  const totalMinutes = state.events.reduce((sum, event) => sum + event.duration_minutes, 0);
  const confidenceValues = state.progress.map(row => row.confidence).filter(Number.isInteger);
  const confidence = confidenceValues.length ? (confidenceValues.reduce((a,b) => a+b, 0) / confidenceValues.length).toFixed(1) : '—';
  const nextDay = nextStudyDate(state.profile.study_days);
  return `<main class="container dashboard"><div class="page-title"><div><span class="eyebrow">Твоя учебная дорога</span><h1>Привет, ${esc(state.profile.display_name)} <span aria-hidden="true">✦</span></h1><p>Сегодня хороший день для маленького шага вперёд.</p></div><a class="button button-outline" href="#/settings">Изменить план</a></div>
  <section class="dashboard-hero"><div><span class="eyebrow light">Следующий урок · ${esc(current.level?.badge ?? '')}</span><h2>${esc(current.lesson?.title ?? 'Курс пройден')}</h2><p>${esc(current.lesson?.goal ?? 'Возвращайся к повторению, чтобы удержать знания.')}</p><a class="button button-cream" href="${path('lesson', current.lesson?.id)}">${done.has(current.lesson?.id) ? 'Повторить урок' : 'Продолжить обучение'} <span aria-hidden="true">↗</span></a></div><div class="dashboard-hero-art" aria-hidden="true"><span>Aa</span><i></i></div></section>
  <section class="stats-grid" aria-label="Прогресс"><div class="stat"><span>Пройдено уроков</span><strong>${done.size}<small> / ${allLessons.length}</small></strong><div class="mini-bar"><i style="width:${progressPercent(done.size, allLessons.length)}%"></i></div></div><div class="stat"><span>Повторить сегодня</span><strong>${due.length}</strong><a href="#/review">К заданиям →</a></div><div class="stat"><span>Время занятий</span><strong>${formatMinutes(totalMinutes)}</strong><small>по завершённым заданиям</small></div><div class="stat"><span>Самооценка понимания</span><strong>${confidence}<small> / 5</small></strong><small>отдельно от баллов за тесты</small></div></section>
  <div class="dashboard-columns"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Твой график</span><h2>Эта неделя</h2></div><span class="panel-meta">${state.profile.minutes_per_day} мин × ${state.profile.study_days.length} дн.</span></div>${renderWeek()}<p class="muted">Следующий плановый день: ${nextDay ? formatDate(nextDay) : 'выбери дни занятий'}.</p></section><section class="panel review-panel"><span class="eyebrow">Закрепление</span><h2>${due.length ? `${due.length} ${due.length === 1 ? 'урок ждёт' : 'уроков ждут'} повторения` : 'Повторений на сегодня нет'}</h2><p>${due.length ? 'Короткий тест вернёт важные слова и правила в память.' : 'Новые задания появятся по графику после пройденных уроков.'}</p><a class="button button-outline" href="#/review">Открыть повторение</a></section></div>
  <section class="section-block"><div class="section-head inline"><div><span class="eyebrow">Твой маршрут</span><h2>Все уровни</h2></div><a href="#/levels">Вся программа →</a></div>${renderLevelCards()}</section>${renderLearningInsights()}</main>`;
}

function renderLearningInsights() {
  const weeks = weeklyPerformance(state.events);
  const status = learningStatus(state.events);
  const topics = recommendedTopics(state.progress, state.reviews, state.events).filter(item => findLesson(item.lessonId)).slice(0, 4);
  const chart = weeks.map(week => {
    const label = week.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const score = week.averageScore;
    const description = `Неделя с ${label}: ${score === null ? 'заданий пока нет' : `средний результат ${score}% за ${week.attempts} заданий`}, ${formatMinutes(week.minutes)}`;
    return `<li class="chart-week" aria-label="${esc(description)}"><span class="chart-value">${score === null ? '—' : `${score}%`}</span><span class="chart-track"><span class="chart-fill ${score !== null && score < 60 ? 'low' : ''}" style="height:${score ?? 0}%"></span></span><span class="chart-label">${esc(label)}</span><small>${week.attempts ? `${week.attempts} зад.` : 'нет данных'}</small></li>`;
  }).join('');
  return `<section class="section-block learning-insights" aria-labelledby="insights-title"><div class="section-head"><span class="eyebrow">Картина обучения</span><h2 id="insights-title">Как идёт учёба</h2><p>График считает средний балл заданий за каждую неделю. Он помогает заметить динамику, но не заменяет оценку речи и письма.</p></div><div class="insights-grid"><div class="panel trend-panel"><div class="trend-heading"><div><h3>Результаты за 6 недель</h3><p class="muted">Тесты уроков, игры и повторения</p></div><span class="insight-status ${status.tone}">${esc(status.label)}</span></div><div class="trend-summary"><strong>${status.score === null ? '—' : `${status.score}%`}</strong><span>${esc(status.detail)}</span></div><ol class="performance-chart" aria-label="Средний результат по неделям">${chart}</ol></div><div class="panel focus-panel"><span class="eyebrow">Следующий полезный шаг</span><h3>Что стоит доучить</h3>${topics.length ? `<ul class="topic-list">${topics.map(item => { const lesson = findLesson(item.lessonId); return `<li><a href="${path(item.action, item.lessonId)}"><span><strong>${esc(lesson.title)}</strong><small>${esc(item.reason)}</small></span><b>Открыть ↗</b></a></li>`; }).join('')}</ul>` : `<div class="focus-empty"><span aria-hidden="true">✦</span><p>${state.progress.length ? 'Слабых тем пока не видно. Продолжай уроки и проверяй раздел повторения.' : 'Начни первый урок. После тестов здесь появятся темы, которым нужно больше внимания.'}</p><a href="${path('lesson', allLessons[0].id)}">К первому уроку →</a></div>`}</div></div></section>`;
}

function renderLevelCards() {
  const done = completedIds();
  return `<div class="level-grid">${levels.map((level, index) => `<a class="level-card" href="${path('level', level.id)}" style="--level-color:${level.color}"><div class="level-card-top"><span>${String(index + 1).padStart(2, '0')} / 07</span><strong>${esc(level.badge)}</strong></div><h3>${esc(level.name)}</h3><p>${esc(level.description)}</p><div class="level-card-bottom"><div class="mini-bar"><i style="width:${levelProgress(level.lessons, done)}%"></i></div><span>${levelProgress(level.lessons, done)}%</span></div></a>`).join('')}</div>`;
}

function renderLevels() {
  return `<main class="container inner-page"><div class="page-title"><div><span class="eyebrow">Программа курса</span><h1>Семь ступеней к английскому</h1><p>Начни с самого первого шага или открой нужный уровень. Прогресс каждого урока сохраняется отдельно.</p></div></div>${renderLevelCards()}<p class="course-note">Уровни CEFR описывают языковые навыки. Прохождение уроков показывает работу на сайте и само по себе не является подтверждением уровня.</p></main>`;
}

function renderLevel(level) {
  if (!level) return renderNotFound();
  const done = completedIds();
  const game = gameFor(level.id);
  return `<main class="container inner-page"><a class="back-link" href="#/levels">← Все уровни</a><div class="level-heading" style="--level-color:${level.color}"><span class="eyebrow">${esc(level.badge)} · ${level.lessons.length} уроков</span><h1>${esc(level.name)}</h1><p>${esc(level.description)}</p><div class="level-outcome"><strong>После этапа:</strong> ${esc(level.outcome)}</div><div class="level-meter"><div class="mini-bar"><i style="width:${levelProgress(level.lessons, done)}%"></i></div><span>${levelProgress(level.lessons, done)}% уроков пройдено</span></div></div>
  <div class="section-head inline"><div><span class="eyebrow">Учебные шаги</span><h2>Уроки уровня</h2></div></div><div class="lesson-list">${level.lessons.map((lesson, index) => { const progress = progressFor(lesson.id); return `<a href="${path('lesson', lesson.id)}" class="lesson-row"><span class="lesson-number">${String(index + 1).padStart(2, '0')}</span><span class="lesson-info"><strong>${esc(lesson.title)}</strong><small>${esc(lesson.goal)}</small></span><span class="lesson-status ${progress?.completed_at ? 'completed' : ''}">${progress?.completed_at ? `✓ ${progress.best_score}%` : 'Начать ↗'}</span></a>`; }).join('')}</div>
  <section class="game-promo"><div><span class="eyebrow light">Мини-игра уровня</span><h2>${esc(level.game.title)}</h2><p>${esc(level.game.intro)}</p><a class="button button-cream" href="${path('game', level.id)}">Играть <span aria-hidden="true">↗</span></a></div><span class="game-score">${game ? `Лучший результат: ${game.best_score}%` : 'Пройди сюжет из трёх шагов'}</span></section></main>`;
}

function renderQuestion(question, index, namePrefix = 'q') {
  return `<fieldset class="question"><legend><span>${String(index + 1).padStart(2, '0')}</span>${esc(question.prompt)}</legend><div class="option-list">${question.options.map(option => `<label><input type="radio" name="${namePrefix}${index}" value="${esc(option)}"><span>${esc(option)}</span></label>`).join('')}</div></fieldset>`;
}

function renderLesson(lesson) {
  if (!lesson) return renderNotFound();
  const level = levels.find(item => item.lessons.some(entry => entry.id === lesson.id));
  const position = level.lessons.findIndex(item => item.id === lesson.id) + 1;
  const result = state.result?.type === 'lesson' && state.result.id === lesson.id ? state.result : null;
  return `<main class="container lesson-page"><a class="back-link" href="${path('level', level.id)}">← ${esc(level.name)}</a><div class="lesson-layout"><article class="lesson-content"><div class="lesson-head"><span class="eyebrow">${esc(level.badge)} · урок ${position} из ${level.lessons.length}</span><h1>${esc(lesson.title)}</h1><p>${esc(lesson.goal)}</p></div>
  <section class="lesson-section theory-section"><span class="section-index">01 / Попробуй и разберись</span><h2>Главная идея</h2><div class="theory-context"><span>Где пригодится</span><p>${esc(lesson.goal)}</p></div><div class="theory-challenge"><span class="challenge-kicker">Сначала попробуй сам</span><h3>${esc(lesson.check.prompt)}</h3><div class="challenge-options">${lesson.check.options.map(option => `<button type="button" data-action="theory-answer" data-id="${lesson.id}" data-choice="${esc(option)}">${esc(option)}</button>`).join('')}</div><p class="challenge-feedback" role="status" aria-live="polite">Выбери вариант и сразу увидишь подсказку.</p></div><p>${esc(lesson.theory)}</p><div class="examples">${lesson.examples.map(example => `<div><span>Пример</span><strong>${esc(example)}</strong></div>`).join('')}</div></section>
  <section class="lesson-section"><span class="section-index">02 / Запомни</span><h2>Слова в контексте</h2><div class="word-grid">${lesson.words.map(([en, ru]) => `<div class="word-card"><strong>${esc(en)}</strong><span>${esc(ru)}</span></div>`).join('')}</div></section>
  <section class="lesson-section"><span class="section-index">03 / Слушай и читай</span><div class="section-title-line"><h2>Короткий диалог</h2><button class="button button-outline small" type="button" data-action="listen" data-id="${lesson.id}">▶ Прослушать</button></div><div class="dialogue">${lesson.dialogue.map(line => `<p>${esc(line)}</p>`).join('')}</div><p class="muted">Озвучивание использует голос браузера. Повтори реплики вслух.</p><div class="reading"><strong>Текст для чтения</strong><p>${esc(lesson.reading.text)}</p></div></section>
  <section class="lesson-section"><span class="section-index">04 / Используй</span><h2>Своя речь</h2><div class="task-grid"><div><span>✎ Письмо</span><p>${esc(lesson.writing)}</p></div><div><span>◉ Говорение</span><p>${esc(lesson.speaking)}</p></div></div><p class="muted">Напиши ответ в тетради или заметках и произнеси вслух. Сравни свою работу с правилом и примерами выше.</p></section>
  <section class="lesson-section quiz-section"><span class="section-index">05 / Проверь себя</span><h2>Короткий тест</h2><p>Для прохождения урока ответь минимум на два из трёх вопросов и выполни задания на письмо и речь.</p><form data-form="lesson" data-id="${lesson.id}">${lesson.quiz.map((question, index) => renderQuestion(question, index)).join('')}<label class="self-check"><input type="checkbox" name="tasks_done" required><span>Я выполнил задание на письмо и произнёс ответ вслух</span></label><label class="confidence-label">Насколько понятна тема?<select name="confidence" required><option value="">Выбери оценку</option><option value="1">1 — пока трудно</option><option value="2">2 — нужна помощь</option><option value="3">3 — понимаю основу</option><option value="4">4 — почти уверенно</option><option value="5">5 — могу объяснить другому</option></select></label><button class="button button-primary" type="submit">Проверить ответы</button></form>${result ? `<div class="result-box ${result.passed ? 'success' : ''}" role="status"><strong>${result.passed ? 'Урок пройден!' : 'Попробуй ещё раз'}</strong><p>Верно: ${result.correct} из ${result.total} (${result.percent}%). ${result.passed ? 'Завтра начнётся повторение.' : 'Вернись к объяснению и проверь ошибки.'}</p><ul>${result.details.map(detail => `<li>${esc(detail)}</li>`).join('')}</ul>${result.passed ? `<a class="button button-outline" href="${path('level', level.id)}">К урокам уровня →</a>` : ''}</div>` : ''}</section>
  </article><aside class="lesson-side"><div class="sticky-note"><span class="eyebrow">Твой ориентир</span><h3>Как пройти урок</h3><ol><li>Прочитай правило и примеры.</li><li>Послушай диалог и повтори его.</li><li>Напиши и произнеси свои фразы.</li><li>Ответь на вопросы теста.</li></ol><div class="side-progress">${progressFor(lesson.id)?.completed_at ? `✓ Лучший тест: ${progressFor(lesson.id).best_score}%` : 'Урок ещё не завершён'}</div></div></aside></div></main>`;
}

function renderReview(id) {
  const due = dueReviews(state.reviews);
  if (id) {
    const lesson = findLesson(id);
    if (!lesson) return renderNotFound();
    const result = state.result?.type === 'review' && state.result.id === id ? state.result : null;
    return `<main class="container inner-page narrow"><a class="back-link" href="#/review">← Повторение</a><span class="eyebrow">Возвращаем в память</span><h1>${esc(lesson.title)}</h1><p>Вспомни правило без подсказки, затем ответь на три вопроса. Если трудно, открой урок.</p><details class="hint"><summary>Показать краткую подсказку</summary><p>${esc(lesson.theory)}</p></details><form data-form="review" data-id="${lesson.id}">${lesson.quiz.map((question, index) => renderQuestion(question, index)).join('')}<button class="button button-primary" type="submit">Проверить повторение</button></form>${result ? `<div class="result-box ${result.passed ? 'success' : ''}" role="status"><strong>${result.passed ? 'Хорошо вспомнил!' : 'Теме нужно ещё внимание'}</strong><p>${result.correct} из ${result.total}. Следующее повторение: ${formatDate(result.due_at)}.</p><ul>${result.details.map(detail => `<li>${esc(detail)}</li>`).join('')}</ul><a href="${path('lesson', id)}">Открыть полный урок →</a></div>` : ''}</main>`;
  }
  return `<main class="container inner-page"><div class="page-title"><div><span class="eyebrow">Интервальное повторение</span><h1>Верни знания в память</h1><p>После пройденного урока проверка появится через день, затем через 3, 7, 14 и больше дней. Ошибка вернёт тему раньше.</p></div></div><div class="review-list">${due.length ? due.map(item => { const lesson = findLesson(item.lesson_id); return lesson ? `<a href="${path('review', lesson.id)}" class="review-row"><span class="review-dot"></span><span><strong>${esc(lesson.title)}</strong><small>Повторить с ${formatDate(item.due_at)}</small></span><b>Начать →</b></a>` : ''; }).join('') : `<div class="empty-state"><span>✦</span><h2>На сегодня всё повторено</h2><p>Продолжай курс, и здесь появятся новые темы.</p><a class="button button-primary" href="#/levels">Выбрать урок</a></div>`}</div></main>`;
}

function renderGame(level) {
  if (!level) return renderNotFound();
  const result = state.result?.type === 'game' && state.result.id === level.id ? state.result : null;
  return `<main class="container inner-page narrow"><a class="back-link" href="${path('level', level.id)}">← ${esc(level.name)}</a><div class="game-head" style="--level-color:${level.color}"><span class="eyebrow">Игра уровня ${esc(level.badge)}</span><h1>${esc(level.game.title)}</h1><p>${esc(level.game.intro)}</p></div><form data-form="game" data-id="${level.id}">${level.game.steps.map((question, index) => renderQuestion(question, index)).join('')}<button class="button button-primary" type="submit">Узнать результат</button></form>${result ? `<div class="result-box ${result.passed ? 'success' : ''}" role="status"><strong>${result.percent}% — ${result.passed ? 'сюжет пройден!' : 'попробуй снова'}</strong><p>Верно ${result.correct} из ${result.total}. Игру можно проходить повторно.</p><ul>${result.details.map(detail => `<li>${esc(detail)}</li>`).join('')}</ul></div>` : ''}</main>`;
}

function renderNotFound() { return `<main class="container inner-page narrow"><h1>Такой страницы нет</h1><a class="button button-primary" href="#/">На главную</a></main>`; }

function render() {
  if (!app) return;
  let content;
  if (state.loading) content = `<main class="container loading"><span class="loader"></span><p>Загружаем твой курс…</p></main>`;
  else if (!state.user) content = renderLanding();
  else if (!state.profile) content = renderOnboarding();
  else {
    const [section, id] = route();
    content = section === 'levels' ? renderLevels() : section === 'level' ? renderLevel(findLevel(id)) : section === 'lesson' ? renderLesson(findLesson(id)) : section === 'review' ? renderReview(id) : section === 'game' ? renderGame(findLevel(id)) : section === 'settings' ? renderOnboarding(true) : renderDashboard();
  }
  app.innerHTML = `${renderHeader()}${renderNotice()}${content}<footer class="site-footer"><div class="container"><span>English Together <b>✦</b> Учись в своём ритме.</span><small>Прогресс и ответы доступны только твоему аккаунту.</small></div></footer>`;
  if (!state.user && route()[0] === 'auth') document.querySelector('#auth')?.scrollIntoView({ block: 'start' });
}

function answersFrom(form, questions) { return questions.map((_, index) => form.elements.namedItem(`q${index}`)?.value ?? ''); }
function answerDetails(questions, answers) { return questions.map((question, index) => answers[index] === question.answer ? `Вопрос ${index + 1}: верно.` : `Вопрос ${index + 1}: правильный ответ — ${question.answer}.`); }
function elapsedMinutes() { return Math.min(240, Math.max(1, Math.ceil((Date.now() - (state.lessonStartedAt || Date.now())) / 60000))); }
async function recordEvent(event_type, lesson_id, score, duration_minutes) {
  const { error } = await supabase.from('english_study_events').insert({ user_id: state.user.id, event_type, lesson_id, score, duration_minutes });
  if (error) throw error;
}

async function saveLesson(form, id) {
  const lesson = findLesson(id);
  const answers = answersFrom(form, lesson.quiz);
  const result = scoreAnswers(lesson.quiz, answers);
  const passed = result.correct >= 2;
  const previous = progressFor(id);
  const now = new Date().toISOString();
  const payload = { user_id: state.user.id, lesson_id: id, best_score: Math.max(previous?.best_score ?? 0, result.percent), attempts: (previous?.attempts ?? 0) + 1, confidence: Number(form.elements.confidence.value), completed_at: previous?.completed_at ?? (passed ? now : null), last_studied_at: now };
  const { error } = await supabase.from('english_lesson_progress').upsert(payload, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
  if (passed && !reviewFor(id)) {
    const schedule = nextReview(null, true);
    const review = await supabase.from('english_review_items').insert({ user_id: state.user.id, lesson_id: id, ...schedule });
    if (review.error) throw review.error;
  }
  await recordEvent('lesson', id, result.percent, elapsedMinutes());
  await loadData();
  state.result = { type: 'lesson', id, ...result, passed, details: answerDetails(lesson.quiz, answers) };
  render();
  document.querySelector('.result-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveReview(form, id) {
  const lesson = findLesson(id);
  const answers = answersFrom(form, lesson.quiz);
  const result = scoreAnswers(lesson.quiz, answers);
  const passed = result.correct >= 2;
  const schedule = nextReview(reviewFor(id), passed);
  const { error } = await supabase.from('english_review_items').upsert({ user_id: state.user.id, lesson_id: id, ...schedule, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
  await recordEvent('review', id, result.percent, elapsedMinutes());
  await loadData();
  state.result = { type: 'review', id, ...result, passed, due_at: schedule.due_at, details: answerDetails(lesson.quiz, answers) };
  render();
  document.querySelector('.result-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveGame(form, id) {
  const level = findLevel(id);
  const answers = answersFrom(form, level.game.steps);
  const result = scoreAnswers(level.game.steps, answers);
  const previous = gameFor(id);
  const { error } = await supabase.from('english_level_games').upsert({ user_id: state.user.id, level_id: id, best_score: Math.max(previous?.best_score ?? 0, result.percent), played_at: new Date().toISOString() }, { onConflict: 'user_id,level_id' });
  if (error) throw error;
  await recordEvent('game', null, result.percent, elapsedMinutes());
  await loadData();
  state.result = { type: 'game', id, ...result, passed: result.correct >= 2, details: answerDetails(level.game.steps, answers) };
  render();
  document.querySelector('.result-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const type = form.dataset.form;
    if (type === 'auth') {
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      const response = state.authMode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      if (!response.data.session || !response.data.user) throw new Error('Вход не выполнен. Проверь настройки регистрации и попробуй снова.');
      await syncAuth(response.data.user);
      if (state.authMode === 'signup') setNotice('Аккаунт создан. Выбери свой график занятий.');
    } else if (type === 'profile') {
      const study_days = [...form.querySelectorAll('input[name="day"]:checked')].map(input => Number(input.value));
      if (!study_days.length) throw new Error('Выбери хотя бы один день для занятий.');
      const payload = { user_id: state.user.id, display_name: form.elements.display_name.value.trim(), study_days, minutes_per_day: Number(form.elements.minutes.value), updated_at: new Date().toISOString() };
      const { error } = await supabase.from('english_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      await loadData(); location.hash = '#/'; setNotice('Личный план сохранён.');
    } else if (type === 'password') {
      const currentPassword = form.elements.current_password.value;
      const newPassword = form.elements.new_password.value;
      if (newPassword !== form.elements.confirm_password.value) throw new Error('Новые пароли не совпадают.');
      if (currentPassword === newPassword) throw new Error('Новый пароль должен отличаться от текущего.');
      const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });
      if (error) throw error;
      setNotice('Пароль изменён. Используй новый пароль при следующем входе.');
    } else if (type === 'lesson') await saveLesson(form, form.dataset.id);
    else if (type === 'review') await saveReview(form, form.dataset.id);
    else if (type === 'game') await saveGame(form, form.dataset.id);
  } catch (error) { setNotice(error.message || 'Что-то пошло не так. Попробуй ещё раз.'); }
  finally { if (submit?.isConnected) submit.disabled = false; }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'dismiss') { state.notice = ''; render(); }
  if (action === 'auth-signup' || action === 'auth-login') { state.authMode = action === 'auth-signup' ? 'signup' : 'login'; render(); }
  if (action === 'signout') { const { error } = await supabase.auth.signOut(); if (error) setNotice(error.message); else { state.notice = ''; location.hash = '#/'; await syncAuth(null); } }
  if (action === 'theory-answer') {
    const lesson = findLesson(button.dataset.id);
    const challenge = button.closest('.theory-challenge');
    if (!lesson || !challenge) return;
    const correct = button.dataset.choice === lesson.check.answer;
    challenge.querySelectorAll('button').forEach(option => {
      option.disabled = true;
      option.classList.toggle('correct', option.dataset.choice === lesson.check.answer);
      option.classList.toggle('incorrect', option === button && !correct);
    });
    const feedback = challenge.querySelector('.challenge-feedback');
    feedback.textContent = correct ? 'Верно! Теперь посмотри, почему это работает, в объяснении ниже.' : `Почти! Подходит «${lesson.check.answer}». Прочитай правило ниже и сравни примеры.`;
    feedback.classList.toggle('is-correct', correct);
  }
  if (action === 'listen') {
    const lesson = findLesson(button.dataset.id);
    if (!('speechSynthesis' in window)) return setNotice('В этом браузере нет озвучивания. Прочитай диалог вслух.');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lesson.dialogue.map(line => line.replace(/^[A-Z]:\s*/, '')).join(' '));
    utterance.lang = 'en-US'; utterance.rate = levels[0].lessons.some(item => item.id === lesson.id) ? 0.8 : 0.9;
    window.speechSynthesis.speak(utterance);
  }
});

window.addEventListener('hashchange', () => {
  clearResult(); render();
  if (!state.user && route()[0] === 'auth') document.querySelector('#auth')?.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
});
supabase.auth.onAuthStateChange((event, session) => {
  setTimeout(() => syncAuth(session?.user), 0);
});
supabase.auth.getSession().then(({ data, error }) => {
  if (error) { state.loading = false; setNotice(error.message); }
  else syncAuth(data.session?.user);
}).catch(error => { state.loading = false; setNotice(error.message); });
render();
