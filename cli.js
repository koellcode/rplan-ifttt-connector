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
  if (!checkUndefinedArguments(argv.ifttt)) return
  
  const poId = argv.register
  console.log(`Start ifttt connector for planning object (poId: ${poId})`)

  const poRes = await fetch(`http://localhost:8081/api/planning-objects/${poId}`, {
    user: argv.user,
    password: argv.password,
  })
  const {cas} = await poRes.json()

  let pollingBody = {}
  pollingBody[poId] = cas

  const pollingRes = await pollForPoUpdate(pollingBody)
  const sessionId = pollingRes.headers.raw()['x-updates-session']

  while (true) {
    const pollingRes = await pollForPoUpdate(pollingBody, sessionId)

    const updatedPos = await pollingRes.json()
    if (updatedPos.length === 1) {
      pollingBody[poId] = updatedPos[0].cas

      console.log('Trigger ifttt...')
      await triggerPoChangedEvent(argv.ifttt, updatedPos[0].name)
    }

    await delay(1000)
  }
}

function pollForPoUpdate(pollingBody, sessionId) {
  headers = {
    'Content-Type': 'application/json'
  }
  if (sessionId !== undefined) headers['x-updates-session'] = sessionId

  return fetch('http://localhost:8081/api/planning-objects/updates', {
    user: argv.user,
    password: argv.password,
    method: 'POST',
    body: JSON.stringify(pollingBody),
    headers: headers,
  })
}

async function triggerPoChangedEvent(ifttt, name) {
  const body = {
    value1: name,
  }
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }

  const url = `https://maker.ifttt.com/trigger/poChanged/with/key/${ifttt}`
  const response = await fetch(url, options)
  if(response.statusCode >= 200 || response.statusCode < 300) {
    console.log(`Sending event was not successful: "${await response.text()}"`)
  } else console.log('Success!')
}

main()
