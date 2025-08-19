export function encryptTokenData(data: any): string {
  // Simple base64 encoding with timestamp for basic encryption
  const payload = {
    ...data,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
  }
  return btoa(JSON.stringify(payload))
}

export function decryptTokenData(encryptedData: string): any {
  try {
    const decoded = atob(encryptedData)
    return JSON.parse(decoded)
  } catch (error) {
    return null
  }
}
