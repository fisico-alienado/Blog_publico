const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

exports.signup = async (req, res, next) => {
  const errors = validationResult(req) // Recolectamos los errores que haya detectado 'express-validator' en routes/auth.js
  if (!errors.isEmpty()) {
    // Forma 2 de Error Handling: crear un Objeto Error y utilizar una general error handling function de Express
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error
    const error = new Error('Validation failed.')
    error.statusCode = 422
    error.data = errors.array()
    throw error

    // Como no estamos haciendo esto con código asíncrono, 'throw error' automáticamente saldrá de la ejecución de la función 'signup' debido al error e
    // intentará pasar a la siguiente error handling function o error handling middleware que hayamos definido en la app de Express
  }
  const email = req.body.email
  const name = req.body.name
  const password = req.body.password
  try {
    const hashedPw = await bcrypt.hash(password, 12) // bcrypt.hash(lo_que_queremos_encriptar, salt, function(err, hash){})
    /*
    In cryptography, a 'SALT' is random data that is used as an additional input to a one-way function that hashes data, a password or passphrase. 
    Salts are used to safeguard passwords in storage
    */
    const user = new User({
      email: email,
      password: hashedPw,
      name: name
    })
    const result = await user.save()
    res.status(201).json({

      // status = 200 === Success (a secas, sin especificar en qué se ha tenido éxito)
      // status = 201 === Success, a resource was created

      message: 'User created successfully',
      userId: result._id // Todo objeto creado con MongoDB es asignado un _id automáticamente
    })
  } catch (err) {
    if (!err.statusCode) { // Si hay algún error, pero no hay ningún statusCode
      err.statusCode = 500 // significa que el error es por parte del Servidor y entonces nosotros establecemos que el error es 500, es decir, del Servidor 
    }
    // Como estamos dentro de una PROMISE con código ASÍNCRONO, no podemos utilizar 'throw err', no funcionaría, tenemos que utilizar:
    next(err)
    // que pasa al error al siguiente error handling express middleware
  }

/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

  bcrypt
    .hash(password, 12) // bcrypt.hash(lo_que_queremos_encriptar, salt, function(err, hash){})

    // In cryptography, a SALT is random data that is used as an additional input to a one-way function that hashes data, a password or passphrase. 
    // Salts are used to safeguard passwords in storage

   .then(hashedPw => { // hashedPw es el resultado de .hash()
    const user = new User({
      email: email,
      password: hashedPw,
      name: name
    })
    return user.save()
   })
   .then(result => {
    res.status(201).json({

      // status = 200 === Success (a secas, sin especificar en qué se ha tenido éxito)
      // status = 201 === Success, a resource was created

      message: 'User created successfully',
      userId: result._id // Todo objeto creado con MongoDB es asignado un _id automáticamente
    })
   })
   .catch(err => {
    if (!err.statusCode) { // Si hay algún error, pero no hay ningún statusCode
      err.statusCode = 500 // significa que el error es por parte del Servidor y entonces nosotros establecemos que el error es 500, es decir, del Servidor 
    }
    // Como estamos dentro de una PROMISE con código ASÍNCRONO, no podemos utilizar 'throw err', no funcionaría, tenemos que utilizar:
    next(err)
    // que pasa al error al siguiente error handling express middleware
  }) */
}

exports.login = async (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  let loadedUser // Creamos una variable para poder utilizarla luego
  // Comprobamos que el email existe
  try {
    const user = await User.findOne({email: email})
    if (!user) {
      const error = new Error('A user with this email could not be found.')
      error.statusCode = 401 // significa No autentificado
      throw error
    }
    // Almacenamos el usuario en la variable 'loadedUser' para poder utilizarla en otras funciones
    loadedUser = user
    // Comparamos si la contraseña introducida coincide con la almacenada en la DB
    const isEqual = await bcrypt.compare(password, user.password)
    if (!isEqual) {
      const error = new Error('Wrong password!')
      error.statusCode = 401
      throw error
    }
    // Si pasa todos estos filtros, el usuario ha introducido unos datos correctos y vamos a generar su JWT (JSON WEB TOKEN) para que pueda navegar identificado.
    const token = jwt.sign({
      email: loadedUser.email,
      userId: loadedUser._id.toString() // ¿Porque al venir desde MongoDB están en JSON y hay que convertirlo a JavaScript?
      // Password no se almacena en el token, porque este token se envía de vuelta al Frontend y el usuario. Aunque en principio
      // es la contraseña del usuario que está logeado, no es para nada ideal estar enviando esa información durante la comunicación.
      }, 
      'somesupersecretpassword', // El segundo argumento es una contraseña supersecreta que solo conoce el Servidor y es para validar todo lo que le llega.
      { expiresIn: '1h' } // CLAVEEEEEEEEEEEEEEEEEEEEE
      // Cuándo caduca el token usado para validar la comunicación del usuario con el servidor. Por ejemplo, si el usuario no hace logout alguien puede copiar su token.
    )
    res.status(200).json({ token: token, userId: loadedUser._id.toString() })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }

/*  Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

    User.findOne({email: email})
    .then(user => { // OBJETO 'user'
      if (!user) { // no user found
        const error = new Error('A user with this email could not be found.')
        error.statusCode = 401 // significa No autentificado
        throw error
      }
      loadedUser = user // Almacenamos el usuario en la variable 'loadedUser' para poder utilizarla en otras funciones
      return bcrypt.compare(password, user.password) // Comparamos si la contraseña introducida coincide con la almacenada en la DB
    })
    .then(isEqual => { // Al resultado de la comparación anterior (bcrypt.compare()) lo llamamos 'isEqual' en este bloque .then()
      if (!isEqual) {
        const error = new Error('Wrong password!')
        error.statusCode = 401
        throw error
      }
      // Si pasa todos estos filtros, el usuario ha introducido unos datos correctos y vamos a generar su JWT (JSON WEB TOKEN) para que pueda navegar identificado.
      const token = jwt.sign({
        email: loadedUser.email,
        userId: loadedUser._id.toString() // ¿Porque al venir desde MongoDB están en JSON y hay que convertirlo a JavaScript?
        // Password no se almacena en el token, porque este token se envía de vuelta al Frontend y el usuario. Aunque en principio
        // es la contraseña del usuario que está logeado, no es para nada ideal estar enviando esa información durante la comunicación.
        }, 
        'somesupersecretpassword', // El segundo argumento es una contraseña supersecreta que solo conoce el Servidor y es para validar todo lo que le llega.
        { expiresIn: '1h' } // CLAVEEEEEEEEEEEEEEEEEEEEE
        // Cuando caduca el token usado para validar la comunicación del usuario con el servidor. Por ejemplo, si el usuario no hace logout alguien puede copiar su token
      )
      res.status(200).json({ token: token, userId: loadedUser._id.toString() })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */
}

exports.getUserStatus = async (req, res, next) => {
  // Teniendo en cuenta que el usuario está enviando un JSON TOKEN para la autentificación:
  try {
    const user = await User.findById(req.userId)
    if(!user) {
      const error = new Error('User not found.')
      error.statusCode = 404
      throw error
    }
    res.status(200).json({ status: user.status})
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }

/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

    User.findById(req.userId)
    .then(user => {
      if(!user) {
        const error = new Error('User not found.')
        error.statusCode = 404
        throw error
      }
      res.status(200).json({ status: user.status})
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */
}

exports.updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status
  try {
    const user = await User.findById(req.userId)
    if(!user) {
      const error = new Error('User not found.')
      error.statusCode = 404
      throw error
    }
    user.status = newStatus
    await user.save()
    res.status(200).json({ message: 'User updated.'})
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}