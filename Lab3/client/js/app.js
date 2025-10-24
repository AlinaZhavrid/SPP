class TaskManager {
    constructor() {
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
    }

    bindEvents() {
        // Добавление задачи
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Модальное окно
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTask();
        });

        // Аутентификация: переключение вкладок и обработчики
        const tabLogin = document.getElementById('tabLogin');
        const tabRegister = document.getElementById('tabRegister');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');
        const cancelAuth = document.getElementById('cancelAuth');
        const cancelAuth2 = document.getElementById('cancelAuth2');
        const logoutBtn = document.getElementById('logoutBtn');

        tabLogin?.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            loginForm.style.display = '';
            registerForm.style.display = 'none';
            authTitle.textContent = 'Вход';
        });

        tabRegister?.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            registerForm.style.display = '';
            loginForm.style.display = 'none';
            authTitle.textContent = 'Регистрация';
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const ok = await performLogin(username, password);
            if (ok) closeAuthModal(true);
        });

        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value;
            const ok = await performRegister(username, password);
            if (ok) closeAuthModal(true);
        });

        cancelAuth?.addEventListener('click', () => closeAuthModal(false));
        cancelAuth2?.addEventListener('click', () => closeAuthModal(false));

        logoutBtn?.addEventListener('click', async () => {
            try {
                const resp = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
                if (resp.ok) {
                    // После выхода пробуем обновить список (вызовет 401 и покажет модалку)
                    this.loadTasks();
                }
            } catch (e) {
                console.error('Logout error', e);
            }
        });
    }

    async loadTasks() {
        try {
            const response = await apiFetch(`/api/tasks?filter=${this.currentFilter}`);
            const tasks = await response.json();
            this.renderTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    renderTasks(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });

        // Обновляем заголовок панели
        const titles = {
            'all': 'Все задачи',
            'active': 'Активные задачи',
            'completed': 'Завершённые задачи'
        };
        document.getElementById('panelTitle').textContent = titles[this.currentFilter];
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} animate`;
        li.dataset.taskId = task.id;

        li.innerHTML = `
            <div class="checkbox-container">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="taskManager.toggleTask(${task.id})">
            </div>
            <div class="status-marker ${task.completed ? 'marker-completed' : 'marker-active'}"></div>
            <div class="task-content">
                <h3>${this.escapeHtml(task.title)}</h3>
                ${task.dueDate ? `<span class="task-date">${new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>` : ''}
                ${task.attachment ? `<a href="/uploads/${task.attachment}" target="_blank" class="task-attachment">Файл</a>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="taskManager.openEditModal(${task.id})">Редактировать</button>
                <button class="delete-btn" onclick="taskManager.deleteTask(${task.id})">Удалить</button>
            </div>
        `;

        return li;
    }

    async addTask() {
        const formData = new FormData(document.getElementById('taskForm'));
        
        try {
            const response = await apiFetch('/api/tasks', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                document.getElementById('taskForm').reset();
                this.loadTasks();
            } else {
                console.error('Error adding task');
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }

    async toggleTask(taskId) {
        try {
            const response = await apiFetch(`/api/tasks/${taskId}/toggle`, {
                method: 'PATCH'
            });

            if (response.ok) {
                this.loadTasks();
            }
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Вы уверены, что хотите удалить задачу?')) return;

        try {
            const response = await apiFetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadTasks();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    async openEditModal(taskId) {
        try {
            const response = await apiFetch(`/api/tasks/${taskId}`);
            const task = await response.json();

            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDueDate').value = task.dueDate || '';

            document.getElementById('editModal').style.display = 'block';
        } catch (error) {
            console.error('Error loading task for edit:', error);
        }
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('editForm').reset();
    }

    async updateTask() {
        const taskId = document.getElementById('editTaskId').value;
        const formData = new FormData(document.getElementById('editForm'));

        try {
            const response = await apiFetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                this.closeEditModal();
                this.loadTasks();
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.loadTasks();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация приложения
const taskManager = new TaskManager();

// Универсальный fetch с обработкой 401 и повтором после логина
async function apiFetch(url, options = {}) {
    const opts = {
        credentials: 'same-origin',
        ...options
    };
    let response = await fetch(url, opts);
    if (response.status !== 401) return response;

    const loggedIn = await openAuthModalAndAuthenticate();
    if (!loggedIn) throw new Error('Authentication required');

    // retry once after successful login
    response = await fetch(url, opts);
    return response;
}

async function openAuthModalAndAuthenticate() {
    return new Promise(resolve => {
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';

        function onClose(success) {
            modal.style.display = 'none';
            cleanup();
            resolve(success);
        }

        function cleanup() {
            modal.removeEventListener('close-auth-ok', okHandler);
            modal.removeEventListener('close-auth-cancel', cancelHandler);
        }

        function okHandler() { onClose(true); }
        function cancelHandler() { onClose(false); }

        modal.addEventListener('close-auth-ok', okHandler);
        modal.addEventListener('close-auth-cancel', cancelHandler);
    });
}

async function performLogin(username, password) {
    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });
        if (resp.ok) return true;
        const data = await resp.json().catch(() => ({}));
        alert(data.error || 'Ошибка входа');
        return false;
    } catch (e) {
        alert('Сетевая ошибка при входе');
        return false;
    }
}

async function performRegister(username, password) {
    try {
        const resp = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });
        if (resp.ok) return true;
        const data = await resp.json().catch(() => ({}));
        alert(data.error || 'Ошибка регистрации');
        return false;
    } catch (e) {
        alert('Сетевая ошибка при регистрации');
        return false;
    }
}

function closeAuthModal(success) {
    const modal = document.getElementById('authModal');
    const eventName = success ? 'close-auth-ok' : 'close-auth-cancel';
    modal.dispatchEvent(new CustomEvent(eventName));
}