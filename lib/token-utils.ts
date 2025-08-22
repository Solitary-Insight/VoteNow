import { database } from "@/lib/firebase"
import { ref, get, set } from "firebase/database"

export interface TokenValidationResult {
  isValid: boolean
  token?: any
  error?: string
  voter?: any
  category?: any
  candidates?: any[]
}

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

export async function validateToken(tokenId: string, phoneNumber?: string): Promise<TokenValidationResult> {
  
    
  try {
    const decryptedData = decryptTokenData(tokenId)
    if (decryptedData && decryptedData.tokenType === "individual") {
      // This is an encrypted individual token
      const { voterId, categoryId, expiresAt, phoneNumber: encryptedPhone } = decryptedData

      // Check if token is expired
      if (Date.now() > expiresAt) {
        return {
          isValid: false,
          error: "This voting link has expired. Please contact the administrator for a new link.",
        }
      }

      // Get voter data
      const voterRef = ref(database, `auth/voters/${voterId}`)
      const voterSnapshot = await get(voterRef)

      if (!voterSnapshot.exists()) {
        return {
          isValid: false,
          error: "Voter data not found.",
        }
      }

      const voter = voterSnapshot.val()

      // Verify phone number matches
      if (voter.phoneNumber !== encryptedPhone) {
        return {
          isValid: false,
          error: "Invalid voting link for this voter.",
        }
      }

      // Check if voter is active
      if (!voter.active) {
        return {
          isValid: false,
          error: "Your voting privileges have been suspended. Please contact the administrator.",
        }
      }

      // Check if voter has already voted
      if (voter.hasVoted) {
        return {
          isValid: false,
          error: "You have already cast your vote.",
        }
      }

      // Get category and candidates
      const categoryRef = ref(database, `elections/categories/${categoryId}`)
      const categorySnapshot = await get(categoryRef)

      if (!categorySnapshot.exists()) {
        return {
          isValid: false,
          error: "Election category not found.",
        }
      }

      const category = categorySnapshot.val()

      // Get candidates for this category
      const candidatesRef = ref(database, "elections/candidates")
      const candidatesSnapshot = await get(candidatesRef)

      let candidates: any[] = []
      if (candidatesSnapshot.exists()) {
        const candidatesData = candidatesSnapshot.val()
        candidates = Object.entries(candidatesData)
          .filter(([_, candidate]: [string, any]) => candidate.categoryId === categoryId && candidate.active)
          .map(([id, candidate]: [string, any]) => ({ id, ...candidate }))
      }

      return {
        isValid: true,
        token: { id: tokenId, tokenType: "individual", categoryId, expiresAt },
        voter: { id: voterId, ...voter },
        category: { id: categoryId, ...category },
        candidates,
      }
    }

    // Original database token validation
    const tokenRef = ref(database, `elections/tokens/${tokenId}`)
    const tokenSnapshot = await get(tokenRef)

    if (!tokenSnapshot.exists()) {
      return {
        isValid: false,
        error: "Invalid token. This voting link does not exist.",
      }
    }

    const token = tokenSnapshot.val()

    // Check if token is expired
    if (Date.now() > token.expiresAt) {
      return {
        isValid: false,
        error: "This voting link has expired. Please contact the administrator for a new link.",
      }
    }

    // Check if token is already used
    if (token.used) {
      return {
        isValid: false,
        error: "This voting link has already been used.",
      }
    }

    // For collective tokens, validate phone number
    if (token.tokenType === "collective") {
      if (!phoneNumber) {
        return {
          isValid: false,
          error: "Phone number is required for group voting links.",
        }
      }

      // Check if phone number exists in voters
      const phoneKey = phoneNumber.replace(/[^\d]/g, "")
      const voterIndexRef = ref(database, `auth/voterIndexByPhone/${phoneKey}`)
      const voterIndexSnapshot = await get(voterIndexRef)

      if (!voterIndexSnapshot.exists()) {
        return {
          isValid: false,
          error: "Phone number not found. Please contact the administrator.",
        }
      }

      const voterId = voterIndexSnapshot.val()

      // Check if this voter is included in the token
      if (!token.voterIds.includes(voterId)) {
        return {
          isValid: false,
          error: "You are not authorized to use this voting link.",
        }
      }

      // Get voter data
      const voterRef = ref(database, `auth/voters/${voterId}`)
      const voterSnapshot = await get(voterRef)

      if (!voterSnapshot.exists()) {
        return {
          isValid: false,
          error: "Voter data not found.",
        }
      }

      const voter = voterSnapshot.val()

      // Check if voter is active
      if (!voter.active) {
        return {
          isValid: false,
          error: "Your voting privileges have been suspended. Please contact the administrator.",
        }
      }

      // Check if voter has already voted
      if (voter.hasVoted) {
        return {
          isValid: false,
          error: "You have already cast your vote.",
        }
      }

      // Get category and candidates
      const categoryRef = ref(database, `elections/categories/${token.categoryId}`)
      const categorySnapshot = await get(categoryRef)

      if (!categorySnapshot.exists()) {
        return {
          isValid: false,
          error: "Election category not found.",
        }
      }

      const category = categorySnapshot.val()

      // Get candidates for this category
      const candidatesRef = ref(database, "elections/candidates")
      const candidatesSnapshot = await get(candidatesRef)

      let candidates: any[] = []
      if (candidatesSnapshot.exists()) {
        const candidatesData = candidatesSnapshot.val()
        candidates = Object.entries(candidatesData)
          .filter(([_, candidate]: [string, any]) => candidate.categoryId === token.categoryId && candidate.active)
          .map(([id, candidate]: [string, any]) => ({ id, ...candidate }))
      }

      return {
        isValid: true,
        token: { id: tokenId, ...token },
        voter: { id: voterId, ...voter },
        category: { id: token.categoryId, ...category },
        candidates,
      }
    } else {
      // Individual token - simpler validation
      if (token.voterIds.length !== 1) {
        return {
          isValid: false,
          error: "Invalid individual token format.",
        }
      }

      const voterId = token.voterIds[0]

      // Get voter data
      const voterRef = ref(database, `auth/voters/${voterId}`)
      const voterSnapshot = await get(voterRef)

      if (!voterSnapshot.exists()) {
        return {
          isValid: false,
          error: "Voter data not found.",
        }
      }

      const voter = voterSnapshot.val()

      // Check if voter is active
      if (!voter.active) {
        return {
          isValid: false,
          error: "Your voting privileges have been suspended. Please contact the administrator.",
        }
      }

      // Check if voter has already voted
      if (voter.hasVoted) {
        return {
          isValid: false,
          error: "You have already cast your vote.",
        }
      }

      // Get category and candidates
      const categoryRef = ref(database, `elections/categories/${token.categoryId}`)
      const categorySnapshot = await get(categoryRef)

      if (!categorySnapshot.exists()) {
        return {
          isValid: false,
          error: "Election category not found.",
        }
      }

      const category = categorySnapshot.val()

      // Get candidates for this category
      const candidatesRef = ref(database, "elections/candidates")
      const candidatesSnapshot = await get(candidatesRef)

      let candidates: any[] = []
      if (candidatesSnapshot.exists()) {
        const candidatesData = candidatesSnapshot.val()
        candidates = Object.entries(candidatesData)
          .filter(([_, candidate]: [string, any]) => candidate.categoryId === token.categoryId && candidate.active)
          .map(([id, candidate]: [string, any]) => ({ id, ...candidate }))
      }

      return {
        isValid: true,
        token: { id: tokenId, ...token },
        voter: { id: voterId, ...voter },
        category: { id: token.categoryId, ...category },
        candidates,
      }
    }
  } catch (error) {
    console.error("Token validation error:", error)
    return {
      isValid: false,
      error: "An error occurred while validating the token. Please try again.",
    }
  }
}

export async function castVote(
  tokenId: string,
  voterId: string,
  candidateId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate token one more time
    const validation = await validateToken(tokenId)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    // Check if candidate exists and is active
    const candidateRef = ref(database, `elections/candidates/${candidateId}`)
    const candidateSnapshot = await get(candidateRef)

    if (!candidateSnapshot.exists()) {
      return { success: false, error: "Selected candidate not found." }
    }

    const candidate = candidateSnapshot.val()
    if (!candidate.active) {
      return { success: false, error: "Selected candidate is not active." }
    }

    // Record the vote
    const votesRef = ref(database, "elections/votes")
    const voteData = {
      voterId,
      candidateId,
      candidateName: candidate.name,
      categoryId: validation.token.categoryId,
      categoryName: validation.token.categoryName,
      tokenId,
      timestamp: Date.now(),
    }

    // Use push to generate unique vote ID
    await set(ref(database, `elections/votes/${voterId}_${tokenId}`), voteData)

    // Mark voter as having voted
    const voterRef = ref(database, `auth/voters/${voterId}`)
    await set(ref(database, `auth/voters/${voterId}/hasVoted`), true)
    await set(ref(database, `auth/voters/${voterId}/votedAt`), Date.now())

    // Mark token as used if it's individual, or update usage for collective
    if (validation.token.tokenType === "individual") {
      await set(ref(database, `elections/tokens/${tokenId}/used`), true)
      await set(ref(database, `elections/tokens/${tokenId}/usedAt`), Date.now())
    } else {
      // For collective tokens, track which voters have used it
      const usedByRef = ref(database, `elections/tokens/${tokenId}/usedBy/${voterId}`)
      await set(usedByRef, Date.now())
    }

    // Update candidate vote count (for real-time updates)
    const candidateVotesRef = ref(database, `elections/candidates/${candidateId}/votes`)
    const currentVotesSnapshot = await get(candidateVotesRef)
    const currentVotes = currentVotesSnapshot.exists() ? currentVotesSnapshot.val() : 0
    await set(candidateVotesRef, currentVotes + 1)

    return { success: true }
  } catch (error) {
    console.error("Vote casting error:", error)
    return { success: false, error: "An error occurred while casting your vote. Please try again." }
  }
}

export function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now()
  const remaining = expiresAt - now

  if (remaining <= 0) {
    return "Expired"
  }

  const minutes = Math.floor(remaining / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`
  } else {
    return `${seconds}s remaining`
  }
}

export function generateTokenId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
