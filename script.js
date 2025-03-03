const screens = document.querySelectorAll('.screen');
const preloader = document.getElementById('preloader');
const mainContainer = document.getElementById('mainContainer');
const desktopMessage = document.getElementById('desktopMessage');
const historyList = document.getElementById('historyList');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const confirmModal = document.getElementById('confirmModal');
const warning = document.getElementById('warning');
const exchangeBtn = document.getElementById('exchangeBtn');
const saleBtn = document.getElementById('saleBtn');
let historyData = JSON.parse(localStorage.getItem('historyData')) || [];
const maxChars = 350;
const lockDuration = 15; // 15 секунд блокировки
let currentSectionId = null;

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 1024 && 'ontouchstart' in window);
}

window.addEventListener('load', () => {
    if (!isMobileDevice()) {
        mainContainer.style.display = 'none';
        desktopMessage.style.display = 'block';
    } else {
        desktopMessage.style.display = 'none';
        setTimeout(() => preloader.classList.add('hidden'), 3000);
        createStars();
        loadHistory();
    }
});

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

screens.forEach(section => {
    const inputs = section.querySelectorAll('.input-field');
    const submitBtn = section.querySelector('.submit-btn');
    const largeTextarea = section.querySelector('.input-field.large');
    const charCounter = section.querySelector('.char-counter');

    if (largeTextarea && charCounter) {
        largeTextarea.addEventListener('input', () => {
            const currentLength = largeTextarea.value.length;
            charCounter.textContent = `${currentLength}/${maxChars}`;
            if (currentLength >= maxChars) {
                showWarning();
            }
        });
    }

    if (inputs.length && submitBtn) {
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = [...inputs].every(input => input.value.trim());
                submitBtn.classList.toggle('active', allFilled);
            });
        });
    }
});

function showSection(sectionId) {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) currentScreen.classList.remove('active');
    setTimeout(() => document.getElementById(sectionId).classList.add('active'), 600);
    if (sectionId === 'history') loadHistory();
}

function backToMain() {
    const currentScreen = document.querySelector('.screen.active');
    if (!currentScreen) return;
    currentScreen.classList.remove('active');
    const successMsg = currentScreen.querySelector('.success-msg');
    if (successMsg) successMsg.classList.remove('active');
    currentScreen.querySelectorAll('.input-field').forEach(input => {
        input.style.display = 'block';
        input.value = '';
        const charCounter = currentScreen.querySelector('.char-counter');
        if (charCounter) charCounter.textContent = `0/${maxChars}`;
    });
    const submitBtn = currentScreen.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.classList.remove('active');
    }
    setTimeout(() => document.getElementById('main-screen').classList.add('active'), 600);
}

function confirmSubmit(sectionId) {
    currentSectionId = sectionId;
    confirmModal.classList.add('active');
}

function proceedSubmit() {
    if (currentSectionId) {
        submitForm(currentSectionId);
        closeConfirmModal();
    }
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    currentSectionId = null;
}

function submitForm(sectionId) {
    const formSection = document.getElementById(sectionId);
    const inputs = formSection.querySelectorAll('.input-field');
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
            timestamp: timestamp,
            details: Array.from(inputs).map(input => input.value.trim())
        };
        historyData.push(data);
        localStorage.setItem('historyData', JSON.stringify(historyData));
        inputs.forEach(input => input.style.display = 'none');
        formSection.querySelector('.submit-btn').style.display = 'none';
        const charCounter = formSection.querySelector('.char-counter');
        if (charCounter) charCounter.style.display = 'none';
        setTimeout(() => formSection.querySelector('.success-msg').classList.add('active'), 50);
        lockButtons();
    }
}

function loadHistory() {
    historyList.innerHTML = '';
    historyData.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `${item.type} • ${item.timestamp}`;
        historyItem.onclick = () => showHistoryDetails(index);
        historyList.appendChild(historyItem);
    });
}

function showHistoryDetails(index) {
    const item = historyData[index];
    let detailsHTML = `<strong>${item.type}</strong>\n<span>Дата: ${item.timestamp}</span>\n\n`;
    if (item.type === 'Обмін') {
        detailsHTML += `<strong>Що міняли:</strong> ${item.details[0]}\n\n<strong>На що міняли:</strong> ${item.details[1]}\n\n<strong>З ким:</strong> <span>${item.details[2]}</span>`;
    } else {
        detailsHTML += `<strong>Що продавали:</strong> ${item.details[0]}\n\n<strong>З ким:</strong> <span>${item.details[1]}</span>`;
    }
    modalContent.innerHTML = detailsHTML;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

function showWarning() {
    warning.classList.add('active');
    setTimeout(() => {
        warning.classList.remove('active');
    }, 5000);
}

function lockButtons() {
    const buttons = [exchangeBtn, saleBtn];
    buttons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
    });

    let timeLeft = lockDuration;
    buttons.forEach(btn => {
        const timer = btn.querySelector('.timer');
        timer.textContent = timeLeft;
    });

    const countdown = setInterval(() => {
        timeLeft--;
        buttons.forEach(btn => {
            const timer = btn.querySelector('.timer');
            timer.textContent = timeLeft;
        });

        if (timeLeft <= 0) {
            clearInterval(countdown);
            buttons.forEach(btn => {
                btn.classList.remove('disabled');
                btn.disabled = false;
            });
        }
    }, 1000);
}