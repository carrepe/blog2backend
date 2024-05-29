const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors({ credentials: true, origin: 'https://blog2test.netlify.app' }));

app.use(express.json());

const mongoose = require('mongoose');
const connectUri = process.env.MongoURI;
mongoose.connect(connectUri);
const User = require('./modules/User');
const Post = require('./modules/Post');
const Comment = require('./modules/Comment');

const bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);

const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/register', upload.single('profileImg'), async (req, res) => {
  const { username, password, email } = req.body;
  const { path, originalname } = req.file;
  const part = originalname.split('.');
  const ext = part[part.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
      email,
      profile: newPath,
    });
    res.json(userDoc);
  } catch (e) {
    res.status(400).json({ message: 'failed', error: e.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) {
    res.json({ message: 'nouser' });
    return;
  }

  const passOK = bcrypt.compareSync(password, userDoc.password);
  if (passOK) {
    jwt.sign(
      { username, id: userDoc._id },
      jwtSecret,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res
          .cookie('token', token, {
            //쿠키를 설정할 도메인과 경로
            path: '/',
            domain: 'https://blog2test.netlify.app',
            sameSite: 'None',
            secure: true,
          })
          .json({
            id: userDoc._id,
            username,
          });
      }
    );
  } else {
    res.json({ message: 'failed' });
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.json('토근정보가 없어요');
  }

  try {
    jwt.verify(token, jwtSecret, {}, (err, info) => {
      if (err) throw err;
      res.json(info);
    });
  } catch (e) {
    res.json('유효하지 않는 토큰 정보입니다.');
  }
});

app.post('/logout', (req, res) => {
  res
    .cookie('token', '', {
      sameSite: 'None',
      secure: true,
    })
    .json();
});

//postWrite
app.post('/postWrite', upload.single('files'), (req, res) => {
  const { path, originalname } = req.file;
  const part = originalname.split('.');
  const ext = part[part.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.username,
    });
    res.json(postDoc);
  });
});

app.get('/postList', async (req, res) => {
  const postlist = await Post.find().sort({ createdAt: -1 });
  res.json(postlist);
});

app.get('/postDetail/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id);
  res.json(postDoc);
});

app.delete('/deletePost/:id', async (req, res) => {
  const { id } = req.params;
  await Post.findByIdAndDelete(id);
  res.json({ message: 'ok' });
});

app.get('/editpage/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id);
  res.json(postDoc);
});

app.put('/editPost/:id', upload.single('files'), (req, res) => {
  const { id } = req.params;
  let newPath = null;
  if (req.file) {
    const { path, originalname } = req.file;
    const part = originalname.split('.');
    const ext = part[part.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: '인증 토근 없음' });
  }

  jwt.verify(token, jwtSecret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    await Post.findByIdAndUpdate(id, {
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });
    res.json({ message: 'ok' });
  });
});

app.post('/commentAdd', upload.none(), (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: '인증토큰없음' });
  }

  jwt.verify(token, jwtSecret, {}, (err, info) => {
    if (err) throw err;
    const { postId, content } = req.body;
    const commentDoc = Comment.create({
      postId,
      content,
      author: info.username,
    });
    res.json(commentDoc);
  });
});

app.get('/commentList/:postId', async (req, res) => {
  const { postId } = req.params;
  const commentList = await Comment.find({ postId }).sort({ createdAt: -1 });
  res.json(commentList);
});

app.delete('/deleteComment/:id', async (req, res) => {
  const { id } = req.params;
  await Comment.findByIdAndDelete(id);
  res.json({ message: 'ok' });
});

app.put('/editCommentUpdate/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  await Comment.findByIdAndUpdate(id, { content });
  res.json();
});

app.get('/myPostList', async (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' });
  }

  jwt.verify(token, jwtSecret, {}, async (err, info) => {
    if (err) throw err;
    const [myPostList, user] = await Promise.all([
      Post.find({ author: info.username }),
      User.find({ username: info.username }),
    ]);
    res.json({ myPostList, user });
  });
});

app.put('/editMyInfo', upload.single('profileImg'), async (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' });
  }

  let newPath = null;
  if (req.file) {
    const { path, originalname } = req.file;
    const part = originalname.split('.');
    const ext = part[part.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  jwt.verify(token, jwtSecret, {}, async (err, info) => {
    if (err) throw err;
    const { username, email, cover, password } = req.body;
    if (password === '') {
      await User.findOneAndUpdate(
        { username: info.username },
        {
          username,
          email,
          profile: newPath ? newPath : cover,
        }
      );
    } else {
      await User.findOneAndUpdate(
        { username: info.username },
        {
          username,
          password: bcrypt.hashSync(password, salt),
          email,
          profile: newPath ? newPath : cover,
        }
      );
    }

    res.json({ message: 'ok' });
  });
});

app.listen(port);
