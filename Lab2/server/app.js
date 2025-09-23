const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static('uploads'));

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

// GET /api/tasks - получить все задачи
app.get('/api/tasks', (req, res) => {
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
app.get('/api/tasks/:id', (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
});

// POST /api/tasks - создать новую задачу
app.post('/api/tasks', upload.single('attachment'), (req, res) => {
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
app.put('/api/tasks/:id', upload.single('attachment'), (req, res) => {
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
app.patch('/api/tasks/:id/toggle', (req, res) => {
    const taskIndex = tasks.findIndex(t => t.id == req.params.id);
    
    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    res.json(tasks[taskIndex]);
});

// DELETE /api/tasks/:id - удалить задачу
app.delete('/api/tasks/:id', (req, res) => {
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