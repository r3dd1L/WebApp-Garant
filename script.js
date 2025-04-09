// Основные элементы DOM
const DOM = {
    screens: document.querySelectorAll('.screen'),
    preloader: document.getElementById('preloader'),
    mainContainer: document.getElementById('mainContainer'),
    desktopMessage: document.getElementById('desktopMessage'),
    historyList: document.getElementById('historyList'),
    modal: document.getElementById('modal'),
    modalContent: document.getElementById('modalContent'),
    confirmModal: document.getElementById('confirmModal'),
    warning: document.getElementById('warning'),
    exchangeBtn: document.getElementById('exchangeBtn'),
    saleBtn: document.getElementById('saleBtn'),
    navButtons: document.querySelectorAll('.nav-btn'),
    filterBtn: document.getElementById('filterBtn'),
    filterMenu: document.getElementById('filterMenu'),
    filterOptions: document.querySelectorAll('.filter-option'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name')
};

// Константы
const MAX_CHARS = 350;
const LOCK_DURATION = 15; // секунд
const ANIMATION_DURATION = 600; // ms, соответствует времени анимации в CSS
let historyData = JSON.parse(localStorage.getItem('historyData')) || [];
let currentSectionId = null;
let isTransitioning = false; // Флаг для блокировки переключения во время анимации
let filteredHistoryData = [...historyData]; // Копия для отображения с учётом фильтров
let TelegramWebApp;

// Проверка на мобильное устройство
const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 1024 && 'ontouchstart' in window);

// Инициализация при загрузке
function initApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        TelegramWebApp = window.Telegram.WebApp;
        TelegramWebApp.expand(); // Раскрываем WebApp на весь экран
        
        // Проверяем, открыто ли в Telegram WebApp
        if (TelegramWebApp.initDataUnsafe && TelegramWebApp.initDataUnsafe.user) {
            const user = TelegramWebApp.initDataUnsafe.user;
            setupTelegramUser(user);
        }
        
        DOM.desktopMessage.style.display = 'none';
        setTimeout(() => DOM.preloader.classList.add('hidden'), 1000);
        createStars();
        loadHistory();
        setupEventListeners();
        updateActiveNavButton('main-screen');
    } else {
        // Стандартная инициализация, если не в Telegram
        if (!isMobileDevice()) {
            DOM.mainContainer.style.display = 'none';
            DOM.desktopMessage.style.display = 'block';
        } else {
            DOM.desktopMessage.style.display = 'none';
            setTimeout(() => DOM.preloader.classList.add('hidden'), 3000);
            createStars();
            loadHistory();
            setupEventListeners();
            updateActiveNavButton('main-screen');
        }
    }
}

// Настройка данных пользователя Telegram
function setupTelegramUser(user) {
    // Устанавливаем имя пользователя
    if (user.first_name || user.last_name) {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        DOM.userName.textContent = fullName;
    } else if (user.username) {
        DOM.userName.textContent = `@${user.username}`;
    } else {
        DOM.userName.textContent = 'Користувач Telegram';
    }
    
    // Устанавливаем аватар, если есть
    if (user.photo_url) {
        DOM.userAvatar.src = user.photo_url;
    } else {
        // Заглушка, если аватар не указан
        DOM.userAvatar.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23bb86fc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
    }
    
    // Добавляем кнопку "Назад" в WebApp
    if (TelegramWebApp.BackButton) {
        TelegramWebApp.BackButton.show();
        TelegramWebApp.BackButton.onClick(backToMain);
    }
}

// Создание звездного фона
function createStars() {
    const starCount = 50;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        document.body.appendChild(star);
    }
}

// Настройка слушателей событий
function setupEventListeners() {
    // Переключение секций через кнопки меню
    DOM.navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionId = btn.dataset.section;
            if (!isTransitioning) {
                switchSection(sectionId);
                updateActiveNavButton(sectionId);
            }
        });
    });

    // Переключение секций через кнопки на главном экране
    document.querySelector('#main-screen').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn[data-section]');
        if (btn && !isTransitioning) {
            switchSection(btn.dataset.section);
            updateActiveNavButton(btn.dataset.section);
        }
    });

    // Обработка ввода в полях
    DOM.screens.forEach(screen => {
        const largeTextarea = screen.querySelector('.input-field.large');
        const charCounter = screen.querySelector('.char-counter');
        const inputs = screen.querySelectorAll('.input-field');
        const submitBtn = screen.querySelector('.submit-btn');

        if (largeTextarea && charCounter) {
            largeTextarea.addEventListener('input', () => {
                const length = largeTextarea.value.length;
                charCounter.textContent = `${length}/${MAX_CHARS}`;
                if (length >= MAX_CHARS) showWarning();
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (submitBtn.classList.contains('active') && !isTransitioning) {
                    confirmSubmit(submitBtn.dataset.action);
                }
            });
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    const allFilled = [...inputs].every(i => i.value.trim());
                    submitBtn.classList.toggle('active', allFilled);
                });
            });
        }
    });

    // Кнопки "Назад"
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!isTransitioning) backToMain();
        });
    });

    // Модальные окна
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.querySelector('.yes-btn').addEventListener('click', proceedSubmit);
    document.querySelector('.no-btn').addEventListener('click', closeConfirmModal);

    // Фильтр в разделе "Історія"
    DOM.filterBtn.addEventListener('click', () => {
        DOM.filterMenu.classList.toggle('active');
    });

    DOM.filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            const filterType = option.dataset.filter;
            applyFilter(filterType);
            DOM.filterMenu.classList.remove('active');
        });
    });

    // Закрытие фильтра при клике вне меню
    document.addEventListener('click', (e) => {
        if (!DOM.filterBtn.contains(e.target) && !DOM.filterMenu.contains(e.target)) {
            DOM.filterMenu.classList.remove('active');
        }
    });
}

// Переключение секций с анимацией
function switchSection(sectionId) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        isTransitioning = true;
        currentScreen.classList.add('leaving');
        currentScreen.classList.remove('active');
        setTimeout(() => {
            currentScreen.classList.remove('leaving');
            const newScreen = document.getElementById(sectionId);
            newScreen.classList.add('active');
            if (sectionId === 'history') loadHistory();
            isTransitioning = false;
        }, ANIMATION_DURATION);
    } else {
        isTransitioning = true;
        const newScreen = document.getElementById(sectionId);
        newScreen.classList.add('active');
        if (sectionId === 'history') loadHistory();
        setTimeout(() => {
            isTransitioning = false;
        }, ANIMATION_DURATION);
    }
}

// Вернуться на главный экран
function backToMain() {
    const currentScreen = document.querySelector('.screen.active');
    if (!currentScreen) return;

    isTransitioning = true;
    currentScreen.classList.add('leaving');
    currentScreen.classList.remove('active');
    setTimeout(() => {
        currentScreen.classList.remove('leaving');
        document.getElementById('main-screen').classList.add('active');
        updateActiveNavButton('main-screen');
        const successMsg = currentScreen.querySelector('.success-msg');
        if (successMsg) successMsg.classList.remove('active');

        currentScreen.querySelectorAll('.input-field').forEach(input => {
            input.style.display = 'block';
            input.value = '';
        });

        const submitBtn = currentScreen.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.classList.remove('active');
        }

        const charCounter = currentScreen.querySelector('.char-counter');
        if (charCounter) charCounter.textContent = `0/${MAX_CHARS}`;
        isTransitioning = false;
    }, ANIMATION_DURATION);
}

// Подтверждение отправки
function confirmSubmit(sectionId) {
    currentSectionId = sectionId;
    DOM.confirmModal.classList.add('active');
}

function proceedSubmit() {
    if (currentSectionId) {
        submitForm(currentSectionId);
        closeConfirmModal();
    }
}

function closeConfirmModal() {
    DOM.confirmModal.classList.remove('active');
    currentSectionId = null;
}

// Отправка формы
function submitForm(sectionId) {
    const section = document.getElementById(sectionId);
    const inputs = section.querySelectorAll('.input-field');
    if ([...inputs].every(input => input.value.trim())) {
        const timestamp = new Date().toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const data = {
            type: sectionId === 'exchange' ? 'Обмін' : 'Продаж',
            timestamp,
            timestampRaw: new Date(),
            details: Array.from(inputs).map(input => input.value.trim())
        };
        historyData.push(data);
        filteredHistoryData = [...historyData];
        localStorage.setItem('historyData', JSON.stringify(historyData));
        inputs.forEach(input => input.style.display = 'none');
        section.querySelector('.submit-btn').style.display = 'none';
        const charCounter = section.querySelector('.char-counter');
        if (charCounter) charCounter.style.display = 'none';
        setTimeout(() => section.querySelector('.success-msg').classList.add('active'), 50);
        lockButtons();
    }
}

// Загрузка истории
function loadHistory() {
    DOM.historyList.innerHTML = '';
    filteredHistoryData.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `${item.type} • ${item.timestamp}`;
        historyItem.addEventListener('click', () => showHistoryDetails(index));
        DOM.historyList.appendChild(historyItem);
    });
}

// Применение фильтра
function applyFilter(filterType) {
    filteredHistoryData = [...historyData];

    if (filterType === 'date-asc') {
        filteredHistoryData.sort((a, b) => new Date(a.timestampRaw) - new Date(b.timestampRaw));
    } else if (filterType === 'date-desc') {
        filteredHistoryData.sort((a, b) => new Date(b.timestampRaw) - new Date(a.timestampRaw));
    } else if (filterType === 'exchange') {
        filteredHistoryData = filteredHistoryData.filter(item => item.type === 'Обмін');
    } else if (filterType === 'sale') {
        filteredHistoryData = filteredHistoryData.filter(item => item.type === 'Продаж');
    }

    loadHistory();
}

// Показать детали истории
function showHistoryDetails(index) {
    const item = filteredHistoryData[index];
    const details = item.type === 'Обмін'
        ? `<strong>${item.type}</strong>\n<span>Дата: ${item.timestamp}</span>\n\n<strong>Що міняли:</strong> ${item.details[0]}\n<strong>На що міняли:</strong> ${item.details[1]}\n<strong>З ким:</strong> <span>${item.details[2]}</span>`
        : `<strong>${item.type}</strong>\n<span>Дата: ${item.timestamp}</span>\n\n<strong>Що продавали:</strong> ${item.details[0]}\n<strong>З ким:</strong> <span>${item.details[1]}</span>`;
    DOM.modalContent.innerHTML = details;
    DOM.modal.classList.add('active');
}

function closeModal() {
    DOM.modal.classList.remove('active');
}

// Показать предупреждение
function showWarning() {
    DOM.warning.classList.add('active');
    setTimeout(() => DOM.warning.classList.remove('active'), 5000);
}

// Блокировка кнопок
function lockButtons() {
    const buttons = [DOM.exchangeBtn, DOM.saleBtn];
    buttons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
    });

    let timeLeft = LOCK_DURATION;
    buttons.forEach(btn => btn.querySelector('.timer').textContent = timeLeft);

    const countdown = setInterval(() => {
        timeLeft--;
        buttons.forEach(btn => btn.querySelector('.timer').textContent = timeLeft);
        if (timeLeft <= 0) {
            clearInterval(countdown);
            buttons.forEach(btn => {
                btn.classList.remove('disabled');
                btn.disabled = false;
            });
        }
    }, 1000);
}

// Обновление активной кнопки в меню
function updateActiveNavButton(sectionId) {
    DOM.navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        }
    });
}

// Инициализация приложения
window.addEventListener('load', initApp);