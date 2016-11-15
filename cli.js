#!/usr/bin/env node --harmony-async-await
const argv = require('minimist')(process.argv.slice(2))
const fetch = require('./auth-fetch')

function checkUndefinedArguments(argument) {
  if (typeof argument !== 'string') return false

  return true
}

async function main() {
  if (!checkUndefinedArguments(argv.user)) return
  if (!checkUndefinedArguments(argv.password)) return

  const response = await fetch('http://localhost:8081/api/planning-objects/3c814426-a136-424c-ad91-1b40fd6f48c0', {
    user: argv.user,
    password: argv.password,
  })
  console.log(await response.text())
}

main().then(() => {
  console.log('end')
})
