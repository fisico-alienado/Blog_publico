const path = require('path')
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')

// Require Routes
const feedRoutes = require('./routes/feed')
const authRoutes = require('./routes/auth')
const { init } = require('./socket')

// Create the Express application object
const app = express()

// Configuramos el almacenamiento de ficheros con multer.diskStorage() para configurar dónde almacenamos las imágenes que subimos.
const fileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'images'); // Se guardan en la carpeta 'images' que está en el mismo nivel que este archivo, app.js
  },
  filename: function(req, file, cb) {
      cb(null, uuidv4())
  }
})

const fileFilter = (req, file, cb) => {
  if ( // Si alguna de estas condiciones es cierta...
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) { // El callback, cb, es como sigue:
    cb(null, true)
  } else {
    cb(null, false)
  }
}

// Parse the incoming request body
  // NOTA: En la aplicación de la tienda y en la de Ian utilizábamos:
  // app.use(express.urlencoded({ extended: true })) 
  // express.urlencoded sirve para parsear formatos de datos o requests que tienen los datos en el formato x-www-form-urlencoded.
  // por ejemplo, los que vienen de un <form> son de este tipo.
  // Como ahora ya no manejamos las VIEWS y por tanto, tampoco <form>, sino datos en formato JSON, utilizaremos:
  // express.json parsea las incoming requests (los datos que nos envían al servidor) tipo .json y nos permite leerlas y utilizarlas en el BODY.
  // En los 'headers' de las requests nos encontraremos el nombre 'application/json' cuando estas lleguen al servidor. <-- ¿Por qué?
app.use(express.json())

app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image')) // .single() solo subimos una y req.file is the 'image' file

// Proveer imágenes ESTÁTICAMENTE: la carpeta '/images' será utilizada para las peticiones/requests que vayan a '/images'
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
  // CORS Errors y cómo solucionarlos

  // Al crear una API REST, estamos en un servidor que tiene una dirección mientras que nuestro cliente, al que le proveemos de los datos mediante   
  // las peticioness/requests que se hacen al servidor, puede estar (y está de hecho) en otro dominio/dirección. Por lo tanto, para permitir el
  // acceso al envío de datos, tenemos que permitir su envío y lo que se puede o no hacer por el cliente mediante setHeaders en el lado del Servidor,
  // es decir, en el Backend.También puede suceder que decidamos utilizar distintos servidores para el FRONTEND y el BACKEND. Para ello, establecemos unas
  // cabeceras (headers) para todas las respuestas que de nuestro servidor, y en ellas se especificarán qué permisos tienen los clientes. 
  
  // El primero de ellos es 'Access-Control-Allow-Origin', que nos permite establecer qué URLs o dominios pueden acceder
  // o comunicarse con nuestro servidor. Si ponemos '*' significa que cualquiera puede.

  res.setHeader('Access-Control-Allow-Origin', '*')

  // Otro es 'Access-Control-Allow-Method', donde establecemos a qué datos y de qué forma pueden
  // acceder a ellos las URLs/dominios permitidos, mediante los métodos HTTP que permitamos.

  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE')

  // Otro sería 'Access-Control-Allow-Headers', con el que establecemos qué headers/encabezados
  // pueden enviar los clientes en sus solicitudes/requests. Por ejemplo, 'Content-Type' y
  // 'Authorization' para que los clientes puedan enviar solicitudes/requests que contengan
  // datos de autorización adicionales. 

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Después llamamos al método next() para que el request
  // (req) del cliente pueda continuar y sea manejada por nuestras rutas. Así todas las 
  // respuestas que enviemos desde el lado del servidor tendrán estos headers.

  next()
})

// Mount Routes
app.use('/feed', feedRoutes)
app.use('/auth', authRoutes)

  // "feed" es el .js a buscar y utilizar a traves de la variable 'feedRoutes' en la carpeta "routes"; Solo las rutas que comiencen con '/feed' se redirigirán al archivo 
  // 'feed.js'. También hace que todas las rutas que están en '/routes/feed.js' comiencen con '/feed' por defecto y luego se añade lo que tienen puesto ellas. Es decir,
  // todas las URLs de '/routes/feed.js' serán del tipo: localhost:8080/feed/nombre_de_la_ruta.

// Error handling Express MIDDLEWARE --> se ejecutará cuando un error sea 'thrown' o forwarded con 'next()'
app.use((error, req, res, next) => {
  console.log(error) // Para que el desarrollador pueda ver dónde está el fallo
  const status = error.statusCode || 500 // Status Code/Código de estado del error (401, 500, etc), que nosotros hemos creado en el objeto 'Error'
  const message = error.message // '.message' es una variable por defecto que tiene el objeto 'Error()' --> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error 
  const data = error.data // (OPCIONAL) Guarda el error y lo pasa al Frontend
  res.status(status).json({ message: message, data: data })
})

// Connect to the database (in the cloud). Lo de || es para que si está definido MONGO_URI se conecte con lo que haya ahí y sino que utilice la dirección puesta después de ||.
// Esto se hace muchas veces porque la base de datos buena es la de MONGO_URI pero si no está disponible porque lo que sea haya una en la que se hacen tests o de repuesto.
// Por ejemplo, si en heroku no definimos heroku config:set MONGODB_URI='uri' y en uri escribrir lo que ponga en MongoDB, MONGO_URI no está definida y Heroku se conectará
// a la db que está puesta tras ||.

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@surf-shop.oivsm.mongodb.net/${process.env.MONGO_PRODUCTION_DB}` 
    || `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@surf-shop.oivsm.mongodb.net/${process.env.MONGO_DEVELOPMENT_DB}`,
    {
      useNewUrlParser: true, 
      useUnifiedTopology: true, 
      useCreateIndex: true, 
      useFindAndModify: false
    }
  )
  .then(result => {
    // El BACKEND, Nodejs, tiene un puerto de escucha, mientras que Frontend, tiene otro, el 3000
    const server = app.listen(8080)
    const io = require('./socket').init(server)
    io.on('connection', socket => {
      console.log('Client connected.')
    })
  })
  .catch(
    err => console.log(err)
  )
