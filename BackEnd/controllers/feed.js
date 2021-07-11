const fs = require('fs')
const path = require('path')

const { validationResult } = require('express-validator')

const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1
  const perPage = 2
  try {
    const totalItems = await Post.find().countDocuments()
    // Pagination
    const posts = await Post.find()
    .populate('creator')
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
    res.status(200).json({
        message: 'Fetched posts successfully.', 
        posts: posts, 
        totalItems: totalItems
    }) // El segundo 'posts' son los posts fetched (cargados) desde la DB.
  } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
  }
/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

   Post.find()
    .countDocuments()
    .then(count => { // 'count' es el resultado del método .countDocuments()
      totalItems = count
      return Post.find().populate('creator')
      // Pagination
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
    })
    .then(posts => { // 'posts' es el resultado de return Post.find()
      res
        .status(200)
        .json({
          message: 'Fetched posts successfully.', 
          posts: posts, 
          totalItems: totalItems
        }) // El segundo 'posts' son los posts fetched (cargados) desde la DB.
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */

  // Antes de cargar posts de la DB, creabamos uno para que se cargar por defecto:
  /*
  res.status(200).json({
    posts: [ // Array de posts
      { // Objeto --> post ('post' es el nombre que está en el objeto que creamos en el Back)
        _id: '1',
        title: 'First Post', 
        content: 'This is the first post!', 
        imageUrl: 'images/duck.jpg',
        creator: {
          name: 'Rubén'
        },
        createdAt: new Date()
      }
    ]
  })
  */
}

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req) // Recolectamos los errores que haya detectado 'express-validator' en routes/feed.js
  if (!errors.isEmpty()) {
    // Forma 2 de Error Handling: crear un Objeto Error y utilizar una general error handling function de Express
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error
    const error = new Error('Validation failed, entered data is incorrect.')
    error.statusCode = 422
    throw error

    // Como no estamos haciendo esto con código asíncrono, 'throw error' automáticamente saldrá de la ejecución de la función 'createPosts' debido al error e
    // intentará pasar a la siguiente error handling function o error handling middleware que hayamos definido en la app de Express

    // Forma 2 de Error Handling: return a function manually
    //return res.
    //  status(422)
    //  .json({ 
    //    message: 'Validation failed, entered data is incorrect', 
    //    errors: errors.array()
    //  })
  }
  if (!req.file) {
    const error = new Error('No image provided.')
    error.statusCode = 422
    throw error
  }
  const imageUrl = req.file.path.replace("\\" ,"/") 
  // Accedemos a las imágenes de multer con req.file y debido al 'uuidv4' le añadimos el replace para que se puedan cargar las imágenes en el FrontEnd
  const title = req.body.title
  const content = req.body.content
  const post = new Post({ // IMPORTANTE: 'post' es el nombre que está en el objeto que creamos en el Back
    // _id es creado por mongoose
    title: title,
    content: content,
    //imageUrl: 'images/duck.jpg',
    imageUrl: imageUrl,
    creator: req.userId // Viene del middleware is-auth.js
    // createdAt es creado por mongoose con los 'timestamps' definidos en el modelo 'postSchema'
  })
  try {
    await post.save()
    const user = await User.findById(req.userId)
    user.posts.push(post) // Almacenamos el post creado por el usuario en su modelo en la DB
    await user.save()
    // Mostrar en el DOM a todos los usuarios conectados a la app de la nueva publicación de un post con SOCKET.IO
    io.getIO().emit('posts', {
      action: 'create', // action informa de qué le ha sucedido a los 'posts'
      // _doc es una propiedad privada que se utiliza en Mongoose. It strips out all the other properties that come back with the document 
      // and only retrieving the fields that belong in the SCHEMA.
      post: {...post._doc, creator: {_id: req.userId, name: user.name}} 
    })
    res.status(201).json({

      // status = 200 === Success (a secas, sin especificar en qué se ha tenido éxito)
      // status = 201 === Success, a resource was created

      message: 'Post created successfully',
      // El primer 'post' es el nombre de la variable u objeto (key) que se crea en el FrontEnd con el MISMO nombre, 'post' y desde aquí le pasamos la info.
      // El segundo 'post' es el nombre del objeto 'post' creado con const post = new Post({}), que tiene almacenada toda la info del post, que ha sido enviada
      // a través del Front y que hemos recogido con req.body...
      post: post, 
      // También enviamos información sobre el creador del post. En el FronEnd tiene que haber una variable (key) con el nombre que enviamos desde aquí. 
      // En este caso es un objeto con un id y un nombre
      creator: {_id: user._id, name: user.name}
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

    post
    .save()
    .then(result => { // .save() devuelve una PROMISE (estamos entonces con código ASÍNCRONO), ¿que será el objeto al que llamamos 'result'
      console.log(result) // Esto era de las early stages, se puede y DEBE QUITAR en PRODUCCIÓN.
      return User.findById(req.userId)
    })
    .then( user => { // 'user' equivale al return del .then() anterior, es decir, User.findById
      creator = user // Almacenamos 'user' en la variable 'creator' definida previamente.
      user.posts.push(post) // Almacenamos el post creado por el usuario en su modelo en la DB
      return user.save()
    })
    .then (result => {
      res.status(201).json({

        // status = 200 === Success (a secas, sin especificar en qué se ha tenido éxito)
        // status = 201 === Success, a resource was created

        message: 'Post created successfully',
        // El primer 'post' es el nombre de la variable u objeto (key) que se crea en el FrontEnd con el MISMO nombre, 'post' y desde aquí le pasamos la info.
        // El segundo 'post' es el nombre del objeto 'post' creado con const post = new Post({}), que tiene almacenada toda la info del post, que ha sido enviada
        // a través del Front y que hemos recogido con req.body...
        post: post, 
        // También enviamos información sobre el creador del post. En el FronEnd tiene que haber una variable (key) con el nombre que enviamos desde aquí. 
        // En este caso es un objeto con un id y un nombre
        creator: {_id: creator._id, name: creator.name}
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

  // Crear un post ANTES DE QUE INCLUYÉRAMOS LA DB CON MONGODB ATLAS
  //res.status(201).json({
    //message: 'Post created successfully',
    //post: { 
    //  _id: new Date().toISOString(), 
    //  title: title, 
    //  content: content,
    //  creator: { name: 'Rubén'},
    //  createdAt: new Date()
    //}
  //})
}

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId // postId es el nombre de la variable asignada a la ruta donde se utiliza el método getPost
  try {
    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404 // Not found error
      throw error
      // Dentro de un .then() Max nos ha enseñado que para errores se utiliza un next(), no throw. ¿Por qué lo utilizamos entonces?
      // Porque si utilizamos throw el 'error' se pasa al bloque .catch() como error.
    }
    res.status(200).json({ message: 'Post fetched.', post: post}) 
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }

/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

   Post.findById(postId)
    .then(post => {
      if(!post) {
        const error = new Error('Could not find post.')
        error.statusCode = 404 // Not found error
        throw error
        // Dentro de un .then() Max nos ha enseñado que para errores se utiliza un next(), no throw. ¿Por qué lo utilizamos entonces?
        // Porque si utilizamos throw el 'error' se pasa al bloque .catch() como error.
      }
      res.status(200).json({ message: 'Post fetched.', post: post})
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */
}

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    // Forma 2 de Error Handling: crear un Objeto Error y utilizar una general error handling function de Express
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error
    const error = new Error('Validation failed, entered data is incorrect.')
    error.statusCode = 422
    throw error

    // Como no estamos haciendo esto con código asíncrono, 'throw error' automáticamente saldrá de la ejecución de la función 'createPosts' debido al error e
    // intentará pasar a la siguiente error handling function o error handling middleware que hayamos definido en la app de Express
  }
  const title = req.body.title
  const content = req.body.content
  let imageUrl = req.body.image // Estamos recibiendo la imagen desde el FRONTEND, y allí la variable es 'image'
  if (req.file) {
    imageUrl = req.file.path.replace("\\","/")
  }
  if (!imageUrl) {
    const error = new Error('No file picked.')
    error.statusCode = 422
    throw error
  }
  // Después de todos los pasos anteriores tenemos datos válidos y podemos actualizar el post
  try {
    const post = await Post.findById(postId).populate('creator')
    if(!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404 // Not found error
      throw error
      // Dentro de un .then() Max nos ha enseñado que para errores se utiliza un next(), no throw. ¿Por qué lo utilizamos entonces?
      // Porque si utilizamos throw el 'error' se pasa al bloque .catch() como error.
    }
    // Como medida de seguridad para que solo quien ha creado el post pueda editarlo y eliminarlo, comprobamos que el _id del post coincide con el del usuario logeado.
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized!')
      error.statusCode = 403
      throw error
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl)
    }
    post.title = title
    post.imageUrl = imageUrl
    post.content = content
    const result = await post.save()
    // Mostrar en el DOM a todos los usuarios conectados a la app de la actualización de un post con SOCKET.IO
    io.getIO().emit('posts', { action: 'update', post: result })
    res.status(200).json({ message: 'Post updated.', post: result})
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }


/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

   Post.findById(postId)
    .then(post => {
      if(!post) {
        const error = new Error('Could not find post.')
        error.statusCode = 404 // Not found error
        throw error
        // Dentro de un .then() Max nos ha enseñado que para errores se utiliza un next(), no throw. ¿Por qué lo utilizamos entonces?
        // Porque si utilizamos throw el 'error' se pasa al bloque .catch() como error.
      }
      // Como medida de seguridad para que solo quien ha creado el post pueda editarlo y eliminarlo, comprobamos que el _id del post coincide con el del usuario logeado.
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!')
        error.statusCode = 403
        throw error
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl)
      }
      post.title = title
      post.imageUrl = imageUrl
      post.content = content
      return post.save()
    })
    .then(result => { // 'result' es lo que viene del primer .then()
      res.status(200).json({ message: 'Post updated.', post: result})
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */
}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId
  try {
    const post = await Post.findById(postId)
    if(!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404 // Not found error
      throw error
    }
    // Como medida de seguridad para que solo quien ha creado el post pueda editarlo y eliminarlo, comprobamos que el _id del post coincide con el del usuario logeado.
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!')
      error.statusCode = 403
      throw error
    }
    // Check logged in user
    clearImage(post.imageUrl) // Eliminamos la imagen donde la tengamos almacenada
    await Post.findByIdAndRemove(postId) // Eliminamos el Post
      // Eliminar la relación POST-USER cuando eliminamos el POST, para que no aparezca en la base de datos que un USER tiene un POST, el cual ya se eliminó.
    const user = await User.findById(req.userId)
    // Eliminamos el postId del modelo del usuario en la DB, dado que hemos eliminado el post
    user.posts.pull(postId)
    await user.save()
    // Mostrar en el DOM a todos los usuarios conectados a la app el borrado de un post con SOCKET.IO
    io.getIO().emit('posts', { action: 'delete', post: postId})
    res.status(200).json({ message: 'Post deleted.' })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  } 

/* Funciona exáctamente igual que lo anterior, pero es con bloques .then() de la Sección 25 en vez de con async/await, Sección 26. 
   Async/await solo funciona con PROMISES, no con CALLBACKS

  Post.findById(postId)
    .then(post => {
      if(!post) {
        const error = new Error('Could not find post.')
        error.statusCode = 404 // Not found error
        throw error
      }
      // Como medida de seguridad para que solo quien ha creado el post pueda editarlo y eliminarlo, comprobamos que el _id del post coincide con el del usuario logeado.
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!')
        error.statusCode = 403
        throw error
      }
      // Check logged in user
      clearImage(post.imageUrl) // Eliminamos la imagen donde la tengamos almacenada
      return Post.findByIdAndRemove(postId) // Eliminamos el Post
    })
    .then(result => { // 'result' es lo que viene del primer .then()
      // Eliminar la relación POST-USER cuando eliminamos el POST, para que no aparezca en la base de datos que un USER tiene un POST, el cual ya se eliminó.
      return User.findById(req.userId)
    })
    .then(user => { // 'user' es el return anterior, 'User.findById(req.userId)'
      // Eliminamos el postId del modelo del usuario en la DB, dado que hemos eliminado el post
      user.posts.pull(postId)
      return user.save()
    })
    .then(result => {
      res.status(200).json({ message: 'Post deleted.' })
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500
      }
      next(err)
    }) */
}

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath)
  // Para eliminar un fichero en Node.js podemos usar el módulo fs que tiene un método para ello: fs.unlink()
  // No bloqueará el hilo principal, ya que realiza la operación de forma asíncrona.
  fs.unlink(filePath, err => console.log(err))
 // Async/await solo funciona con PROMISES, no con CALLBACKS, por lo que no podemos utilizarlos aquí.
}