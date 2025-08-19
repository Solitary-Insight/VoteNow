import { database } from "@/lib/firebase"
import { ref, get, set } from "firebase/database"

export async function castVoteWithNewSystem(
  linkId: string,
  linkType: "unified" | "particular",
  voterId: string,
  candidateId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
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

    // Get link data to determine category
    const linkRef = ref(database, `elections/voting-links/${linkId}`)
    const linkSnapshot = await get(linkRef)

    if (!linkSnapshot.exists()) {
      return { success: false, error: "Voting link not found." }
    }

    const linkData = linkSnapshot.val()

    // Record the vote
    const voteData = {
      voterId,
      candidateId,
      candidateName: candidate.name,
      categoryId: linkData.categoryId,
      categoryName: linkData.categoryName,
      linkId,
      linkType,
      timestamp: Date.now(),
    }

    // Use unique vote ID
    await set(ref(database, `elections/votes/${voterId}_${linkId}`), voteData)

    // Mark voter as having voted
    await set(ref(database, `auth/voters/${voterId}/hasVoted`), true)
    await set(ref(database, `auth/voters/${voterId}/votedAt`), Date.now())

    // Update candidate vote count
    const candidateVotesRef = ref(database, `elections/candidates/${candidateId}/votes`)
    const currentVotesSnapshot = await get(candidateVotesRef)
    const currentVotes = currentVotesSnapshot.exists() ? currentVotesSnapshot.val() : 0
    await set(candidateVotesRef, currentVotes + 1)

    // Track link usage
    if (linkType === "unified") {
      const usedByRef = ref(database, `elections/voting-links/${linkId}/usedBy/${voterId}`)
      await set(usedByRef, Date.now())
    } else {
      // For particular links, mark as used
      const usedByRef = ref(database, `elections/voting-links/${linkId}/usedBy/${voterId}`)
      await set(usedByRef, Date.now())
    }

    return { success: true }
  } catch (error) {
    console.error("Vote casting error:", error)
    return { success: false, error: "An error occurred while casting your vote. Please try again." }
  }
}
