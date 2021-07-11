const express = require('express')
const { body } = require('express-validator')

const feedController = require('../controllers/feed')
const isAuth = require('../middleware/is-auth')

const router = express.Router()

// ENDPOINTS = HTTP verb + ruta

// /feed/posts => GET
router.get('/posts', isAuth, feedController.getPosts)

// /feed/post => POST
router.post(
  '/post',
  isAuth, 
  [
    body('title')
      // El método trim( ) devuelve la cadena de texto despojada de los espacios en blanco en ambos extremos. El método no afecta al valor de la cadena de texto.
      .trim()
      .isLength({min: 5}), 
    body('content')
      .trim()
      .isLength({min: 5})
    // Tenemos las mismas validaciones en el Front que aquí, para la correcta experiencia del usuario, pero las que mandan si hay contradicción son las de aquí, las del server 
    // --> ¿Siempre manda el server/backend o hay que configurarlo para ello??????????????????????????
  ], 
  feedController.createPost
)

// /feed/post/:postId => GET
router.get('/post/:postId', isAuth, feedController.getPost) // lo que va detrás de : es una variable (parámetro) que podemos utilizar con req.params

// /feed/post/:postId => PUT
router.put(
  '/post/:postId',
  isAuth,
  [
    body('title')
      .trim()
      .isLength({min: 5}), 
    body('content')
      .trim()
      .isLength({min: 5})
    // Tenemos las mismas validaciones en el Front que aquí, para la correcta experiencia del usuario, pero las que mandan si hay contradicción son las de aquí, las del server 
    // --> ¿Siempre manda el server/backend o hay que configurarlo para ello??????????????????????????
  ], 
  feedController.updatePost
  ) // La variable 'postId' la estamos recibiendo desde el Front

// /feed/post/:postId => DELETE
router.delete('/post/:postId', isAuth, feedController.deletePost)

module.exports = router

