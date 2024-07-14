const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { db, findUserByUsername, registerUser, checkInviteCode, markInviteCodeAsUsed } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: '',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // change later when https
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const dbPath = path.join(__dirname, 'helmios.db');
const dbUtils = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(`Error connecting to SQLite database: ${err.message}`);
    } else {
        console.log('Connected to SQLite database');
    }
});

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/signup', (req, res) => {
    res.render('signup', { inviteCodeError: false });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        res.redirect('/login');
    } else {
        const query = `SELECT * FROM users WHERE id = ?`;
        dbUtils.get(query, [userId], (err, row) => {
            if (err) {
                console.error(`Error retrieving user data: ${err.message}`);
                res.status(500).send('Internal Server Error');
            } else {
                res.render('dashboard', { user: row });
            }
        });
    }
});

app.post('/signup', (req, res) => {
    const { username, password, inviteCode } = req.body;

    console.log('Received signup request:', { username, inviteCode });

    checkInviteCode(inviteCode, (err, invite) => {
        if (err) {
            console.error('Error checking invite code:', err.message);
            return res.render('signup', { inviteCodeError: true });
        }
        if (!invite) {
            console.log('Invalid invite code:', inviteCode);
            return res.render('signup', { inviteCodeError: true });
        }

        console.log('Invite code valid:', inviteCode);

        registerUser(username, password, inviteCode, (err, userId) => {
            if (err) {
                console.error('Error registering user:', err.message);
                if (err.message === 'Username already exists') {
                    return res.status(400).send('Username already exists');
                }
                return res.status(500).send('Error registering user');
            }

            console.log('User registered with ID:', userId);

            markInviteCodeAsUsed(inviteCode, (err) => {
                if (err) {
                    console.error('Error removing invite code:', err.message);
                }

                res.redirect('/login');
            });
        });
    });
});


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    findUserByUsername(username, (err, user) => {
        if (err || !user) {
            return res.status(400).send('Invalid username or password');
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.userId = user.id;
                res.redirect('/dashboard');
            } else {
                res.status(400).send('Invalid username or password');
            }
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(`Error logging out: ${err.message}`);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/login');
        }
    });
});

app.listen(PORT, 'localhost', () => {
    console.log(`Server is running on port ${PORT}`);
});
