const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'very_secret_key_change_me';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static('uploads'));

// Простая функция парсинга cookies (без дополнительных пакетов)
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
        const index = pair.indexOf('=');
        if (index === -1) continue;
        const key = pair.slice(0, index).trim();
        const value = decodeURIComponent(pair.slice(index + 1).trim());
        cookies[key] = value;
    }
    return cookies;
}

// In-memory users storage (demo). Пароль: admin / user: admin
const users = [
    {
        id: 1,
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin', 10)
    }
];

// Middleware для проверки JWT токена
function authMiddleware(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie || '');
        const token = cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Хранилище задач (в памяти)
let tasks = [];
let idCounter = 1;

// REST API Routes

// Аутентификация
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 1000
    });
    return res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({ ok: true });
});

// Регистрация пользователя (демо-хранилище)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: users.length + 1, username, passwordHash };
    users.push(newUser);

    // авто-вход
    const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 1000
    });
    return res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
    return res.json({ user: { id: req.user.userId, username: req.user.username } });
});

// GET /api/tasks - получить все задачи
app.get('/api/tasks', authMiddleware, (req, res) => {
    const filter = req.query.filter || 'all';
    let filteredTasks = tasks;
    
    if (filter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    } else if (filter === 'active') {
        filteredTasks = tasks.filter(t => !t.completed);
    }
    
    res.json(filteredTasks);
});

// GET /api/tasks/:id - получить задачу по ID
app.get('/api/tasks/:id', authMiddleware, (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
});

// POST /api/tasks - создать новую задачу
app.post('/api/tasks', authMiddleware, upload.single('attachment'), (req, res) => {
    const { title, dueDate } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    const newTask = {
        id: idCounter++,
        title,
        completed: false,
        dueDate: dueDate || null,
        attachment: req.file ? req.file.filename : null,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    res.status(201).json(newTask);
});

// PUT /api/tasks/:id - обновить задачу
app.put('/api/tasks/:id', authMiddleware, upload.single('attachment'), (req, res) => {
    const taskIndex = tasks.findIndex(t => t.id == req.params.id);
    
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    const { title, dueDate, completed } = req.body;
    
    tasks[taskIndex] = {
        ...tasks[taskIndex],
        title: title || tasks[taskIndex].title,
        dueDate: dueDate || tasks[taskIndex].dueDate,
        completed: completed !== undefined ? completed : tasks[taskIndex].completed,
        attachment: req.file ? req.file.filename : tasks[taskIndex].attachment
    };
    
    res.json(tasks[taskIndex]);
});

// PATCH /api/tasks/:id/toggle - переключить статус задачи
app.patch('/api/tasks/:id/toggle', authMiddleware, (req, res) => {
    const taskIndex = tasks.findIndex(t => t.id == req.params.id);
    
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    res.json(tasks[taskIndex]);
});

// DELETE /api/tasks/:id - удалить задачу
app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
    const taskIndex = tasks.findIndex(t => t.id == req.params.id);
    
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks.splice(taskIndex, 1);
    res.status(204).send();
});

// Serve SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
    console.log(`SPA Server running on http://localhost:${PORT}`);
});