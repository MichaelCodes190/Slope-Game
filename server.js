const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let users = JSON.parse(fs.existsSync('users.json') ? fs.readFileSync('users.json') : '[]');
let banned = JSON.parse(fs.existsSync('banned.json') ? fs.readFileSync('banned.json') : '[]');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Register or login
app.post('/login', (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  if (banned.includes(username)) {
    return res.status(403).json({ error: 'User is banned' });
  }

  let user = users.find(u => u.email === email);
  if (!user) {
    user = { email, password, username, active: true };
    users.push(user);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  } else if (user.password !== password) {
    return res.status(403).json({ error: 'Wrong password' });
  } else {
    user.active = true;
  }

  res.json({ success: true });
});

// Admin auth
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin1!') {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: 'Invalid admin credentials' });
  }
});

// Get user data
app.get('/admin/users', (req, res) => {
  res.json(users);
});

// Ban user
app.post('/admin/ban', (req, res) => {
  const { username } = req.body;
  banned.push(username);
  fs.writeFileSync('banned.json', JSON.stringify(banned, null, 2));
  res.json({ success: true });
});

io.on('connection', (socket) => {
  socket.on('register user', (username) => {
    socket.username = username;
    io.emit('chat message', `🛑 Hey players, this is our game chat, don't be disrespectful, follow game rules, and don't cheat. Thank you!`);
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', `${socket.username}: ${msg}`);
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      let user = users.find(u => u.username === socket.username);
      if (user) user.active = false;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
