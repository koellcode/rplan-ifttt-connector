const fetch = require('node-fetch')
const basicAuth = require('basic-auth-header')

module.exports = (url, option = {}) => {
  if (!option.headers) option.headers = {}
  option.headers['Authorization'] = basicAuth(option.user, option.password)
  return fetch(url, option)
}
