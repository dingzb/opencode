const prefixes = {
  message: "msg",
  part: "prt",
} as const

export const optimisticPartIDPrefix = "optimistic:"

const length = 26
let lastTimestamp = 0
let counter = 0

export function makeID(prefix: keyof typeof prefixes) {
  const currentTimestamp = Date.now()
  if (currentTimestamp !== lastTimestamp) {
    lastTimestamp = currentTimestamp
    counter = 0
  }

  counter += 1

  const timeBytes = new Uint8Array(6)
  const now = BigInt(currentTimestamp) * BigInt(0x1000) + BigInt(counter)
  for (let i = 0; i < 6; i += 1) {
    timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  }

  return `${prefixes[prefix]}_${bytesToHex(timeBytes)}${randomBase62(length - 12)}`
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function randomBase62(size: number) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("")
}
