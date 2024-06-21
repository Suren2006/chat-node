const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./db');
const { render } = require('ejs');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));


app.get('/chat/:chat_id', (req, res) => {
    const chat_id = req.params.chat_id;
    db.query(`SELECT * FROM chat WHERE chat_id = ${chat_id}`, (err, messages) => {
        if (err) {
          console.error('Error executing SELECT query:', err);
        } else {
          var id = [];
          messages.forEach((message)=> {
            if (!id.includes(message.from_user)) {
              id.push(message.from_user)
            }
            if (!id.includes(message.to_user)) {
              id.push(message.to_user)
            }
          }) 
          db.query(`SELECT id,first_name,last_name,email,age, description,profile_picture FROM users WHERE id IN (${ id })`, (err, users) => {
            if (err) {
              console.error('Error executing SELECT query:', err);
            } else {
                res.render('index', { chat_id, messages, users }, );
                console.log('chat_id ' + JSON.stringify(users));
            }
          });
        }
      });
});

app.get('/chats/:id', (req, res) => {
  const id = req.params.id;
  db.query(`SELECT id,first_name,last_name,email,age, description,profile_picture FROM users WHERE id = ${id} `, (err, mainuser) => {
    if (err) {
      console.log(err)
    }else {
      db.query(`SELECT * FROM chat WHERE chat_id LIKE'${id}%' OR chat_id LIKE '%${id}' LIMIT 10 `, (err, allchats) => {
        if (err) {
          console.log(err)
        }
        else {
          if (allchats.length == 0) {
            res.render('chats', {mainuser:null, users:null})

          }else {

            var chats = []
            allchats.forEach(function(chat) {
            var chat_id = chat.chat_id.toString().replace('000', '')
            chat_id = chat_id.replace(`${id}`, '')
            chats.push(chat_id)
          })
          db.query(`SELECT id,first_name,last_name,email,age, description,profile_picture FROM users WHERE id in (${ chats || 0 })`, (err, users) => {
            if (err) {
              console.log(err)
            }
            else {
              res.render('chats', {mainuser, users})
            }
          })
        }
        }
      })
    }
  })
})

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', ({message, from_chat_id,to_user, from_user}) => {
    db.query(`INSERT INTO chat (message, from_user, to_user, chat_id) VALUES ('${message}', ${from_user}, ${to_user}, ${from_chat_id})`, (err, result) => {
        if (err) {
            console.log(err);
        }else {
            console.log(from_chat_id, message);
        }
    })
    io.emit('message', {message, from_chat_id, to_user, from_user});
    
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, 'nerus' , () => {
  console.log('Server is running on http://nerus:3000');
});

