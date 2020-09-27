require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston');
const { NODE_ENV } = require('./config')
const { API_TOKEN } = require('./config')
const store = require('./store')
const { isWebUri } = require('valid-url')
const { v4: uuid } = require('uuid')

const app = express()


const bodyParser = express.json()

app
  .get('/bookmarks', (req, res) => {
    res.json(store.bookmarks)
  })
app
  .post('/bookmarks', bodyParser, (req, res) => {
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send(`'${field}' is required`)
      }
    }
    const { title, url, description, rating } = req.body

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res.status(400).send(`'rating' must be a number between 0 and 5`)
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`)
      return res.status(400).send(`'url' must be a valid URL`)
    }

const bookmark = { id: uuid(), title, url, description, rating }

store.bookmarks.push(bookmark)

logger.info(`Bookmark with id ${bookmark.id} created`)
res
  .status(201)
  .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
  .json(bookmark)
})

app
  .get('/bookmarks/:bookmark_id', (req, res) => {
    const { bookmark_id } = req.params

    const bookmark = store.bookmarks.find(c => c.id == bookmark_id)

    if (!bookmark) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`)
      return res
        .status(404)
        .send('Bookmark Not Found')
    }

    res.json(bookmark)
  })
app
  .delete('/bookmarks/:bookmark_id', (req, res) => {
    const { bookmark_id } = req.params

    const bookmarkIndex = store.bookmarks.findIndex(b => b.id === bookmark_id)

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`)
      return res
        .status(404)
        .send('Bookmark Not Found')
    }

    store.bookmarks.splice(bookmarkIndex, 1)

    logger.info(`Bookmark with id ${bookmark_id} deleted.`)
    res
      .status(204)
      .end()
  })

// set up winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'info.log' })
  ]
});

if (!['production', 'test'].includes(NODE_ENV)) {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// const morganOption = (process.env.NODE_ENV === 'production')
const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello, world!')
    // res.send('Hello, boilerplate!')
})

app.use(function validateBearerToken(req, res, next) {
  const authToken = req.get('Authorization')
  logger.error(`Unauthorized request to path: ${req.path}`)

  if (!authToken || authToken.split(' ')[1] !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized request' })
  }

  next()
})

app.use(function errorHandler(error, req, res, next) {
   let response
//    if (process.env.NODE_ENV === 'production') {
if (NODE_ENV === 'production') {
     response = { error: { message: 'server error' } }
   } else {
     console.error(error)
     logger.error(error.message)
     response = { message: error.message, error }
   }
   res.status(500).json(response)
 })

module.exports = app



