const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const auth = require('./middleware/auth');
const graphqlHttp = require('express-graphql');
const { createHandler } = require('graphql-http/lib/use/express'); 
const { buildSchema } = require('graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'png' ||
    file.mimetype === 'jpg' ||
    file.mimetype === 'jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

 app.use((req, res, next) => {
   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
     'Access-Control-Allow-Methods',
     'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS'){
    return res.sendStatus(200);
  }
  next();
 });

 app.use(auth);
// app.use(cors(*))search on cors error 
app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not authenticated!');
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File stored.', filePath: req.file.path });
});
app.use('/graphql',
  createHandler({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if(!err.originalError){
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An Error occurred.';
      const code = err.originalError.code || 500;
      return {message: message , status: code , data: data};
    } 
})
);

app.use(helmet());  // to secure our response headers
app.use(compression());  // to compress Assets
app.use(morgan('combined')); // to logging requests

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message , data: data});
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.hbl9t87.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(result => {
    app.listen(process.env.PORT || 8080);
  })
  .catch(err => console.log(err));

  //     'mongodb+srv://mostafa:CnUlVhKlHxNXnrRr@cluster0.hbl9t87.mongodb.net/messages?retryWrites=true&w=majority&appName=Cluster0'
