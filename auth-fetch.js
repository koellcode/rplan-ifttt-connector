const fetch = require('node-fetch')
const basicAuth = require('basic-auth-header')

module.exports = (url, option = {}) => {
  const authHeader = {
    headers: {
      Authorization: basicAuth(option.user, option.password)
    }
  }
  const authOptions = Object.assign(option, authHeader)
  return fetch(url, authOptions)
}
