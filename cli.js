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

  const poId = 'a468a6cd-9409-4943-a46a-80cedc4fd528'

  const poRes = await fetch(`http://localhost:8081/api/planning-objects/${poId}`, {
    user: argv.user,
    password: argv.password,
  })
  const {cas} = await poRes.json()

  let pollingBody = {}
  pollingBody[poId] = cas

  const pollingRes = await fetch('http://localhost:8081/api/planning-objects/updates', {
    user: argv.user,
    password: argv.password,
    method: 'POST',
    body: JSON.stringify(pollingBody),
    headers: {'Content-Type': 'application/json'},
  })

  const sessionId = pollingRes.headers.raw()['x-updates-session']

  while (true) {
    const pollingRes = await fetch('http://localhost:8081/api/planning-objects/updates', {
      user: argv.user,
      password: argv.password,
      method: 'POST',
      body: JSON.stringify(pollingBody),
      headers: {
        'Content-Type': 'application/json',
        'x-updates-session': sessionId
      },
    })

    console.log(await pollingRes.json())

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

main().then(() => {
  console.log('end')
})
