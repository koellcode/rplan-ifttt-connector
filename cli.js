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

function triggerPoChanged (updatedPos) {
  const [po] = updatedPos
  notifyPoChanged(po.name)
}

function isViolatedProjectStart (userDefinedStart, calculatedStart) {
  if (typeof calculatedStart === 'undefined') {
    return false
  }
  return calculatedStart < userDefinedStart
}

function isViolatedProjectEnd (userDefinedDuration, calculatedDuration) {
  if (typeof calculatedDuration === 'undefined') {
    return false
  }
  return userDefinedDuration < calculatedDuration
}

function triggerProjectViolated (updatedPos) {
  const [po] = updatedPos

  if (po.isProject === true) {
    if (isViolatedProjectStart(po.userDefinedStart, po.calculatedStart) || isViolatedProjectEnd(po.userDefinedDuration, po.calculatedDuration)) {
      notifyProjectViolated(po.name)
    }
  }
}

async function main() {
  if (!checkUndefinedArguments(argv.user)) return
  if (!checkUndefinedArguments(argv.password)) return
  if (!checkUndefinedArguments(argv.register)) return
  if (!checkUndefinedArguments(argv.ifttt)) return
  if (!checkUndefinedArguments(argv.trigger)) argv.trigger = 'PoChanged'

  const poId = argv.register
  console.log(`Start ifttt connector for planning object (poId: ${poId})`)

  const poRes = await fetch(`http://localhost:8081/api/planning-objects/${poId}`, {
    user: argv.user,
    password: argv.password,
  })
  const {cas} = await poRes.json()

  let pollingBody = {}
  pollingBody[poId] = cas

  const pollingRes = await getUpdatedPos(pollingBody)
  const sessionId = pollingRes.headers.raw()['x-updates-session']

  while (true) {
    const pollingRes = await getUpdatedPos(pollingBody, sessionId)
    const updatedPos = await pollingRes.json()

    if (updatedPos.length === 1) {
      pollingBody[poId] = updatedPos[0].cas

      if(argv.trigger === 'poChanged') {
        triggerPoChanged(updatedPos)
      } else if (argv.trigger === 'projectViolated') {
        triggerProjectViolated(updatedPos)
      }
    }

    await delay(1000)
  }
}

function getUpdatedPos(pollingBody, sessionId) {
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

function notifyPoChanged (name) {
  const options = {
    eventName: 'poChanged',
    value1: name
  }

  notifyIFTTT(argv.ifttt, options)
}

function notifyProjectViolated (name) {
  const options = {
    eventName: 'projectViolated',
    value1: name
  }

  notifyIFTTT(argv.ifttt, options)
}

async function notifyIFTTT(token, options) {
  const response = await fetch(`https://maker.ifttt.com/trigger/${options.eventName}/with/key/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value1: options.value1,
      value2: options.value2,
      value3: options.value3,
    }),
  })

  if(response.statusCode >= 200 || response.statusCode < 300) {
    console.log(`Sending event was not successful: "${await response.text()}"`)
  }
  else {
    console.log('Success! Notified IFTTT with', options.eventName)
  }
}

main()
