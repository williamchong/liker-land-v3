import { randomUUID } from 'node:crypto'
import { PubSub } from '@google-cloud/pubsub'
import type { H3Event } from 'h3'

const PUBSUB_TOPIC_MISC = 'misc'

let topicPublisher: ReturnType<PubSub['topic']> | null = null

function getTopicPublisher() {
  if (!topicPublisher) {
    const pubsub = new PubSub()
    topicPublisher = pubsub.topic(PUBSUB_TOPIC_MISC, {
      batching: {
        maxMessages: 10,
        maxMilliseconds: 1000,
      },
    })
  }
  return topicPublisher
}

export function publishEvent(
  event: H3Event | null,
  logType: string,
  data: Record<string, unknown>,
) {
  const config = useRuntimeConfig()
  if (!config.pubsubEnable) return

  const payload: Record<string, unknown> = {
    ...data,
    'logType': `3ook_${logType}`,
    '@timestamp': new Date().toISOString(),
    'appServer': config.appServer || '3ook-web',
    'ethNetwork': config.public.isTestnet ? 'rinkeby' : 'mainnet',
    'uuidv4': randomUUID(),
  }

  if (event) {
    const headers = getHeaders(event)
    const xff = headers['x-forwarded-for']
    payload.requestIP = (xff ? xff.split(',')[0]?.trim() : undefined)
      || headers['x-real-ip']
      || getRequestIP(event)
    payload.agent = headers['x-likecoin-user-agent']
      || headers['x-ucbrowser-ua']
      || headers['user-agent']
    payload.requestUrl = getRequestURL(event).pathname
  }

  try {
    const dataBuffer = Buffer.from(JSON.stringify(payload))
    getTopicPublisher().publishMessage({ data: dataBuffer }).catch((err) => {
      console.error('[PubSub] Failed to publish event:', err)
    })
  }
  catch (err) {
    console.error('[PubSub] Failed to initialize publisher:', err)
  }
}
