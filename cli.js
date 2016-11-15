#!/usr/bin/env node --harmony-async-await
const argv = require('minimist')(process.argv.slice(2))
const fetch = require('./auth-fetch')

function checkUndefinedArguments(argument) {
  if (typeof argument !== 'string') return false

  return true
}

async function delay (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
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
    console.log(`Poll for planning object update (poId: ${poId})`)

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

    const updatedPos = await pollingRes.json()
    if (updatedPos.length === 1) {
      pollingBody[poId] = updatedPos[0].cas
      console.log('New cas:', updatedPos[0].cas)
    }

    await delay(1000)
  }
}

async function triggerPoChangedEvent(po) {
  const param = {
    value1: po.name,
  }
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(param),
  }
  console.log('send poChanged event')
  const url = 'https://maker.ifttt.com/trigger/poChanged/with/key/bLWm4fLBFvpmeyFpr8h-EN'
  const response = await fetch(url, options)
  if(response.statusCode >= 200 || response.statusCode < 300) {
    console.log(`sending event was not successful: "${await response.text()}"`)
  } else console.log('Success!')
}

main().then(() => {
  console.log('end')
})
