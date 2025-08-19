import { database } from "@/lib/firebase"
import { ref, push, get } from "firebase/database"

export interface UnifiedLinkData {
  id: string
  categoryId: string
  categoryName: string
  linkType: "unified"
  createdAt: number
  expiresAt: number
  active: boolean
}

export interface ParticularLinkData {
  id: string
  voterIds: string[]
  categoryId: string
  categoryName: string
  linkType: "particular"
  createdAt: number
  expiresAt: number
  active: boolean
  voterData: Array<{
    id: string
    username: string
    phoneNumber: string
    personalToken: string
  }>
}

export async function generateUnifiedLink(categoryId: string, durationSeconds: number): Promise<string> {
  try {
    // Get category data
    const categoryRef = ref(database, `elections/categories/${categoryId}`)
    const categorySnapshot = await get(categoryRef)

    if (!categorySnapshot.exists()) {
      throw new Error("Category not found")
    }

    const category = categorySnapshot.val()

    // Create unified link data
    const linkData: UnifiedLinkData = {
      id: "", // Will be set by Firebase
      categoryId,
      categoryName: category.name,
      linkType: "unified",
      createdAt: Date.now(),
      expiresAt: Date.now() + durationSeconds * 1000,
      active: true,
    }

    // Save to database
    const linksRef = ref(database, "elections/voting-links")
    const newLinkRef = await push(linksRef, linkData)

    const linkId = newLinkRef.key!

    // Generate URL
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    return `${baseUrl}/cast-vote/unified/${linkId}`
  } catch (error) {
    console.error("Error generating unified link:", error)
    throw error
  }
}

export async function generateParticularLinks(
  voterIds: string[],
  categoryId: string,
  durationSeconds: number,
): Promise<ParticularLinkData> {
  try {
    // Get category data
    const categoryRef = ref(database, `elections/categories/${categoryId}`)
    const categorySnapshot = await get(categoryRef)

    if (!categorySnapshot.exists()) {
      throw new Error("Category not found")
    }

    const category = categorySnapshot.val()

    // Get voter data
    const voterData = []
    for (const voterId of voterIds) {
      const voterRef = ref(database, `auth/voters/${voterId}`)
      const voterSnapshot = await get(voterRef)

      if (voterSnapshot.exists()) {
        const voter = voterSnapshot.val()
        const personalToken = generatePersonalToken()

        voterData.push({
          id: voterId,
          username: voter.username,
          phoneNumber: voter.phoneNumber,
          personalToken,
        })
      }
    }

    // Create particular link data
    const linkData: ParticularLinkData = {
      id: "", // Will be set by Firebase
      voterIds,
      categoryId,
      categoryName: category.name,
      linkType: "particular",
      createdAt: Date.now(),
      expiresAt: Date.now() + durationSeconds * 1000,
      active: true,
      voterData,
    }

    // Save to database
    const linksRef = ref(database, "elections/voting-links")
    const newLinkRef = await push(linksRef, linkData)

    const linkId = newLinkRef.key!
    linkData.id = linkId

    return linkData
  } catch (error) {
    console.error("Error generating particular links:", error)
    throw error
  }
}

export function generatePersonalToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function generateParticularLinkUrl(linkId: string, personalToken: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  return `${baseUrl}/cast-vote/particular/${linkId}?token=${personalToken}`
}

export async function validateUnifiedLink(
  linkId: string,
  phoneNumber: string,
): Promise<{
  isValid: boolean
  error?: string
  linkData?: UnifiedLinkData
  voter?: any
  category?: any
  candidates?: any[]
}> {
  try {
    console.log("[v0] Validating unified link:", linkId, "with phone:", phoneNumber)

    // Get link data
    const linkRef = ref(database, `elections/voting-links/${linkId}`)
    const linkSnapshot = await get(linkRef)

    if (!linkSnapshot.exists()) {
      console.log("[v0] Link not found in database")
      return { isValid: false, error: "Invalid voting link" }
    }

    const linkData = linkSnapshot.val()
    console.log("[v0] Link data:", linkData)

    if (linkData.linkType !== "unified") {
      return { isValid: false, error: "Invalid link type" }
    }

    if (!linkData.active) {
      return { isValid: false, error: "This voting link has been deactivated" }
    }

    if (Date.now() > linkData.expiresAt) {
      return { isValid: false, error: "This voting link has expired" }
    }

    const cleanPhone = phoneNumber.replace(/[^\d]/g, "")
    console.log("[v0] Cleaned phone number:", cleanPhone)

    // Try multiple phone number formats
    const phoneFormats = [
      cleanPhone,
      cleanPhone.startsWith("1") ? cleanPhone.substring(1) : "1" + cleanPhone,
      cleanPhone.startsWith("91") ? cleanPhone.substring(2) : "91" + cleanPhone,
    ]

    let voterId = null
    let voterIndexSnapshot = null

    for (const phoneFormat of phoneFormats) {
      console.log("[v0] Trying phone format:", phoneFormat)
      const voterIndexRef = ref(database, `auth/voterIndexByPhone/${phoneFormat}`)
      voterIndexSnapshot = await get(voterIndexRef)

      if (voterIndexSnapshot.exists()) {
        voterId = voterIndexSnapshot.val()
        console.log("[v0] Found voter ID:", voterId, "for phone format:", phoneFormat)
        break
      }
    }

    if (!voterId) {
      console.log("[v0] Phone number not found in any format")
      const allVotersRef = ref(database, "auth/voterIndexByPhone")
      const allVotersSnapshot = await get(allVotersRef)
      if (allVotersSnapshot.exists()) {
        console.log("[v0] Available phone numbers in database:", Object.keys(allVotersSnapshot.val()))
      }
      return { isValid: false, error: "Phone number not found in voter registry" }
    }

    const voterRef = ref(database, `auth/voters/${voterId}`)
    const voterSnapshot = await get(voterRef)

    if (!voterSnapshot.exists()) {
      return { isValid: false, error: "Voter data not found" }
    }

    const voter = voterSnapshot.val()
    console.log("[v0] Voter data:", voter)

    if (!voter.active) {
      return { isValid: false, error: "Your voting privileges have been suspended" }
    }

    if (voter.hasVoted) {
      return { isValid: false, error: "You have already cast your vote" }
    }

    // Get category and candidates
    const categoryRef = ref(database, `elections/categories/${linkData.categoryId}`)
    const categorySnapshot = await get(categoryRef)

    if (!categorySnapshot.exists()) {
      return { isValid: false, error: "Election category not found" }
    }

    const category = categorySnapshot.val()

    // Get candidates
    const candidatesRef = ref(database, "elections/candidates")
    const candidatesSnapshot = await get(candidatesRef)

    let candidates: any[] = []
    if (candidatesSnapshot.exists()) {
      const candidatesData = candidatesSnapshot.val()
      candidates = Object.entries(candidatesData)
        .filter(([_, candidate]: [string, any]) => candidate.categoryId === linkData.categoryId && candidate.active)
        .map(([id, candidate]: [string, any]) => ({ id, ...candidate }))
    }

    console.log("[v0] Validation successful, returning data")
    return {
      isValid: true,
      linkData: { ...linkData, id: linkId },
      voter: { id: voterId, ...voter },
      category: { id: linkData.categoryId, ...category },
      candidates,
    }
  } catch (error) {
    console.error("[v0] Error validating unified link:", error)
    return { isValid: false, error: "An error occurred while validating the link" }
  }
}

export async function validateParticularLink(
  linkId: string,
  personalToken: string,
): Promise<{
  isValid: boolean
  error?: string
  linkData?: ParticularLinkData
  voter?: any
  category?: any
  candidates?: any[]
}> {
  try {
    // Get link data
    const linkRef = ref(database, `elections/voting-links/${linkId}`)
    const linkSnapshot = await get(linkRef)

    if (!linkSnapshot.exists()) {
      return { isValid: false, error: "Invalid voting link" }
    }

    const linkData = linkSnapshot.val()

    if (linkData.linkType !== "particular") {
      return { isValid: false, error: "Invalid link type" }
    }

    if (!linkData.active) {
      return { isValid: false, error: "This voting link has been deactivated" }
    }

    if (Date.now() > linkData.expiresAt) {
      return { isValid: false, error: "This voting link has expired" }
    }

    // Find voter by personal token
    const voterData = linkData.voterData.find((v: any) => v.personalToken === personalToken)

    if (!voterData) {
      return { isValid: false, error: "Invalid personal token" }
    }

    // Get full voter data
    const voterRef = ref(database, `auth/voters/${voterData.id}`)
    const voterSnapshot = await get(voterRef)

    if (!voterSnapshot.exists()) {
      return { isValid: false, error: "Voter data not found" }
    }

    const voter = voterSnapshot.val()

    if (!voter.active) {
      return { isValid: false, error: "Your voting privileges have been suspended" }
    }

    if (voter.hasVoted) {
      return { isValid: false, error: "You have already cast your vote" }
    }

    // Get category and candidates
    const categoryRef = ref(database, `elections/categories/${linkData.categoryId}`)
    const categorySnapshot = await get(categoryRef)

    if (!categorySnapshot.exists()) {
      return { isValid: false, error: "Election category not found" }
    }

    const category = categorySnapshot.val()

    // Get candidates
    const candidatesRef = ref(database, "elections/candidates")
    const candidatesSnapshot = await get(candidatesRef)

    let candidates: any[] = []
    if (candidatesSnapshot.exists()) {
      const candidatesData = candidatesSnapshot.val()
      candidates = Object.entries(candidatesData)
        .filter(([_, candidate]: [string, any]) => candidate.categoryId === linkData.categoryId && candidate.active)
        .map(([id, candidate]: [string, any]) => ({ id, ...candidate }))
    }

    return {
      isValid: true,
      linkData: { ...linkData, id: linkId },
      voter: { id: voterData.id, ...voter },
      category: { id: linkData.categoryId, ...category },
      candidates,
    }
  } catch (error) {
    console.error("Error validating particular link:", error)
    return { isValid: false, error: "An error occurred while validating the link" }
  }
}
