const express = require('express');
const multer = require('multer');
//const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Хранилище задач
let tasks = [];
let idCounter = 1;
// Edit Task Page
app.get('/tasks/:id/edit', (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) {
        res.render('edit-task', { task }); // Create an edit-task.ejs template
    } else {
        res.status(404).send('Task not found');
    }
});
app.post('/tasks/:id', upload.single('attachment'), (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) {
        task.title = req.body.title;
        task.dueDate = req.body.dueDate;
        if (req.file) {
            task.attachment = req.file.filename; // Update the attachment if a new file is provided
        }
        res.redirect('/');
    } else {
        res.status(404).send('Task not found');
    }
});
// Главная страница
app.get('/', (req, res) => {
    const filter = req.query.filter || 'all';
    const filteredTasks = filter === 'all' ? tasks : 
                         filter === 'completed' ? tasks.filter(t => t.completed) :
                         tasks.filter(t => !t.completed);
    
    res.render('index', { tasks: filteredTasks, filter });
});

// Добавление задачи
app.post('/tasks', upload.single('attachment'), (req, res) => {
    tasks.push({
        id: idCounter++,
        title: req.body.title,
        completed: false,
        dueDate: req.body.dueDate,
        attachment: req.file ? req.file.filename : null
    });
    res.redirect('/');
});

// Переключение статуса задачи
app.post('/tasks/:id/toggle', (req, res) => {
    const task = tasks.find(t => t.id == req.params.id);
    if (task) task.completed = !task.completed;
    res.redirect('/');
});

// Удаление задачи
app.post('/tasks/:id/delete', (req, res) => {
    tasks = tasks.filter(t => t.id != req.params.id);
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));