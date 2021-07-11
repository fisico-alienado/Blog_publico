const express = require('express')
const { body } = require('express-validator')

const User = require('../models/user')
const authController = require('../controllers/auth')
const isAuth = require('../middleware/is-auth')

const router = express.Router()

// ENDPOINTS = HTTP verb + ruta

// /auth/signup => PUT (¿Dijo que también podría ser un POST?)
router.put(
  '/signup', 
  [ // Array validation middleware
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email.')
      .custom((value, { req }) => {
        return User.findOne({email: value}).then(userDoc => { // 'userDoc' es el valor de 'email' obtenido con el método findOne()
          if (userDoc) {
            return Promise.reject('E-Mail address already exists!')
          }
        })
      })
      .normalizeEmail(),
    body('password')
      // El método trim( ) devuelve la cadena de texto despojada de los espacios en blanco en ambos extremos. El método no afecta al valor de la cadena de texto.
      .trim()
      .isLength({min: 5}),
    body('name')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.signup
)

// /auth/login => POST
router.post('/login', authController.login)

// /auth/status => GET
router.get('/status', isAuth, authController.getUserStatus)

// /auth/status => PATCH
    // También se puede usar PUT
router.patch(
  '/status',
  isAuth, 
  [ // Array validation middleware
  body('status')
    .trim()
    .not()
    .isEmpty()
  ],
  authController.updateUserStatus
)

module.exports = router