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
    }

    async loadTasks() {
        try {
            const response = await fetch(`/api/tasks?filter=${this.currentFilter}`);
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
            const response = await fetch('/api/tasks', {
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
            const response = await fetch(`/api/tasks/${taskId}/toggle`, {
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
            const response = await fetch(`/api/tasks/${taskId}`, {
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
            const response = await fetch(`/api/tasks/${taskId}`);
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
            const response = await fetch(`/api/tasks/${taskId}`, {
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