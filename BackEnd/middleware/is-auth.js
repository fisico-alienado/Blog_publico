const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization')
  if (!authHeader) {
    const error = new Error('Not Authenticated.')
    error.statusCode = 401
    throw error
  }
  const token = authHeader.split(" ")[1]
  let decodedToken
  try {
    decodedToken = jwt.verify(token, 'somesupersecretpassword')
  } catch (err) {
    err.statusCode = 500
    throw err
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.')
    error.statusCode = 401
    throw error
  }
  // Útil para luego conceder permisos tipo borrar los posts.
  req.userId = decodedToken.userId
  next()
}