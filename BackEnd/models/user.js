const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema(
  { // Primer objeto
    email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: 'I am new!'
    },
    posts: [ 
// posts va a ser un ARRAY y cada objeto en el array será tipo Schema.Types.ObjectId porque esto será una referencia a un Post y por eso le añadimos la referencia al modelo Post
      { 
        type: Schema.Types.ObjectId,
        ref: 'Post' // Almacenamos referencias a los posts en los usuarios, siendo 'Post' el modelo exportado 'Post' en la carpeta models.
      }
    ]
  },
  { // Segundo objeto
    timestamps: true // Esto ya crea la variable 'createdAt' del Front y que necesitamos también en el Backend
  }
)

// Exportamos el modelo, que se utilizará en otras partes con el nombre 'Post'
module.exports = mongoose.model('User', userSchema)
/*
The first argument is the singular name of the collection your model is for. Mongoose automatically looks for the plural, 
lowercased version of your model name. Thus, for the example above, the model 'User' is for the 'users' collection in the DB.
*/