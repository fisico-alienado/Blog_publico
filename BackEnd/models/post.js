const mongoose = require('mongoose')
const Schema = mongoose.Schema

const postSchema = new Schema(
  { // Primer objeto
    title: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    // Now that we know 'users', 'creator' will be of Schema.Types.ObjectId because I'm storing a reference to a user, que en el proyecto está como 'User'.
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Se refiere al modelo 'User', estamos metiendo en 'creator' TODA LA INFORMACIÓN del modelo User de user.js
      required: true
    }
    // This was an intermediate solution. Now that we know users in our application, 'creator' will no longer be of type: Object.
    /*
    creator: {
      type: Object,
      required: true
    }
    */
  },
  { // Segundo objeto
    timestamps: true // Esto ya crea la variable 'createdAt' del Front y que necesitamos también en el Backend
  }
)

// Exportamos el modelo, que se utilizará en otras partes con el nombre 'Post'
module.exports = mongoose.model('Post', postSchema)
/*
The first argument is the singular name of the collection your model is for. Mongoose automatically looks for the plural, 
lowercased version of your model name. Thus, for the example above, the model 'Post' is for the posts collection in the database.
*/