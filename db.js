const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('helmios.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            invite_code TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE
        )
    `);
});

function checkInviteCode(code, callback) {
    db.get('SELECT * FROM invite_codes WHERE code = ?', [code], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        return callback(null, row);
    });
}

function markInviteCodeAsUsed(code, callback) {
    db.run('DELETE FROM invite_codes WHERE code = ?', [code], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null);
    });
}

function findUserByUsername(username, callback) {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        return callback(null, row);
    });
}

function registerUser(username, password, inviteCode, callback) {
    findUserByUsername(username, (err, user) => {
        if (err) {
            console.error('Error finding user by username:', err.message);
            return callback(err);
        }
        if (user) {
            console.log('Username already exists:', username);
            return callback(new Error('Username already exists'));
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err.message);
                return callback(err);
            }

            db.run('INSERT INTO users (username, password, invite_code) VALUES (?, ?, ?)', [username, hashedPassword, inviteCode], function(err) {
                if (err) {
                    console.error('Error inserting new user:', err.message);
                    return callback(err);
                }
                return callback(null, this.lastID);
            });
        });
    });
}

module.exports = {
    db,
    findUserByUsername,
    registerUser,
    checkInviteCode,
    markInviteCodeAsUsed
};
