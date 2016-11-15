#!/usr/bin/env node --harmony-async-await
const argv = require('minimist')(process.argv.slice(2))
const fetch = require('./auth-fetch')

function checkUndefinedArguments(argument) {
  if (typeof argument !== 'string') return false

  return true
}

async function delay (timer) {
  return new Promise((resolve) => setTimeout(resolve, timer))
}

async function main() {
  if (!checkUndefinedArguments(argv.user)) return
  if (!checkUndefinedArguments(argv.password)) return
  if (!checkUndefinedArguments(argv.register)) return

  const poId = argv.register

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
    await delay(1000)
    console.log(await pollingRes.json())
  }
}

main().then(() => {
  console.log('end')
})
