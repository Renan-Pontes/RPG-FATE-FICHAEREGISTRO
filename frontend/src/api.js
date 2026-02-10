const API_BASE = '/api'

// Helpers
function getToken() {
  const auth = localStorage.getItem('auth')
  if (auth) {
    try {
      return JSON.parse(auth).token
    } catch {
      return null
    }
  }
  return null
}

function headers(includeAuth = true, isFormData = false) {
  const h = {}
  if (!isFormData) {
    h['Content-Type'] = 'application/json'
  }
  if (includeAuth) {
    const token = getToken()
    if (token) {
      h['Authorization'] = `Token ${token}`
    }
  }
  return h
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: options.headers || headers(),
  })
  
  if (response.status === 204) {
    return null
  }
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.detail || 'Erro na requisição')
  }
  
  return data
}

// ============== AUTH ==============

export async function login(username, password) {
  return request('/auth/login/', {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ username, password }),
  })
}

export async function register(username, email, password) {
  return request('/auth/register/', {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ username, email, password }),
  })
}

export async function getMe() {
  return request('/auth/me/')
}

// ============== CAMPAIGNS ==============

export async function getCampaigns() {
  return request('/campaigns/')
}

export async function getCampaign(id) {
  return request(`/campaigns/${id}/`)
}

export async function createCampaign(formData) {
  return request('/campaigns/', {
    method: 'POST',
    headers: headers(true, true),
    body: formData,
  })
}

export async function updateCampaign(id, data) {
  return request(`/campaigns/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function requestRoll(campaignId, characterId, skillId, description = '') {
  return request(`/campaigns/${campaignId}/request_roll/`, {
    method: 'POST',
    body: JSON.stringify({
      character_id: characterId,
      skill_id: skillId,
      description,
    }),
  })
}

export async function completeRollRequest(campaignId, requestId, useFatePoint = false) {
  return request(`/campaigns/${campaignId}/complete_roll/`, {
    method: 'POST',
    body: JSON.stringify({
      request_id: requestId,
      use_fate_point: useFatePoint,
    }),
  })
}

export async function removePlayerFromCampaign(campaignId, userId) {
  return request(`/campaigns/${campaignId}/remove_player/`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

export async function banPlayerFromCampaign(campaignId, userId, reason = '') {
  return request(`/campaigns/${campaignId}/ban_player/`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, reason }),
  })
}

export async function getProjection(campaignId) {
  return request(`/campaigns/${campaignId}/projection/`)
}

export async function updateProjection(campaignId, formData) {
  return request(`/campaigns/${campaignId}/update_projection/`, {
    method: 'POST',
    headers: headers(true, true),
    body: formData,
  })
}

export async function getParty(campaignId) {
  return request(`/campaigns/${campaignId}/party/`)
}

export async function getNPCs(campaignId) {
  return request(`/campaigns/${campaignId}/npcs/`)
}

// ============== CHARACTERS ==============

export async function getCharacters(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/characters/${query}`)
}

export async function getCharacter(id) {
  return request(`/characters/${id}/`)
}

export async function createCharacter(data) {
  return request('/characters/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCharacter(id, data) {
  return request(`/characters/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function updateCharacterStats(id, stats) {
  return request(`/characters/${id}/update_stats/`, {
    method: 'PATCH',
    body: JSON.stringify(stats),
  })
}

export async function addFatePoint(characterId, amount = 1) {
  return request(`/characters/${characterId}/add_fate_point/`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

export async function useFatePoint(characterId) {
  return request(`/characters/${characterId}/use_fate_point/`, {
    method: 'POST',
  })
}

// ============== NOTES ==============

export async function getNotes(characterId) {
  return request(`/notes/?character=${characterId}`)
}

export async function createNote(characterId, content) {
  return request('/notes/', {
    method: 'POST',
    body: JSON.stringify({ character: characterId, content }),
  })
}

export async function updateNote(id, content) {
  return request(`/notes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export async function deleteNote(id) {
  return request(`/notes/${id}/`, { method: 'DELETE' })
}

// ============== ITEMS ==============

export async function getItems(campaignId, characterId) {
  let query = ''
  if (characterId) {
    query = `?character=${characterId}`
  } else if (campaignId) {
    query = `?campaign=${campaignId}`
  }
  return request(`/items/${query}`)
}

export async function createItem(data) {
  return request('/items/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateItem(id, data) {
  return request(`/items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function transferItem(itemId, toCharacterId, quantity = 1) {
  return request(`/items/${itemId}/transfer/`, {
    method: 'POST',
    body: JSON.stringify({ to_character_id: toCharacterId, quantity }),
  })
}

export async function equipItem(itemId) {
  return request(`/items/${itemId}/equip/`, { method: 'POST' })
}

export async function useItem(itemId) {
  return request(`/items/${itemId}/use/`, { method: 'POST' })
}

// ============== DICE ROLLS ==============

export async function rollDice(characterId, skillId, description, useFatePoint = false) {
  return request('/rolls/', {
    method: 'POST',
    body: JSON.stringify({
      character_id: characterId,
      skill_id: skillId,
      description,
      use_fate_point: useFatePoint,
    }),
  })
}

export async function getRolls(campaignId) {
  return request(`/rolls/?campaign=${campaignId}`)
}

export async function markRollSeen(rollId) {
  return request(`/rolls/${rollId}/mark_seen/`, { method: 'POST' })
}

// ============== NOTIFICATIONS ==============

export async function getNotifications(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/notifications/${query}`)
}

export async function getUnreadCount(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/notifications/unread_count/${query}`)
}

export async function markNotificationRead(id) {
  return request(`/notifications/${id}/mark_read/`, { method: 'POST' })
}

export async function markAllNotificationsRead(campaignId) {
  return request('/notifications/mark_all_read/', {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId }),
  })
}

// ============== SKILL IDEAS ==============

export async function getSkillIdeas(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/skill-ideas/${query}`)
}

export async function createSkillIdea(data) {
  return request('/skill-ideas/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function approveSkillIdea(id, data) {
  return request(`/skill-ideas/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function rejectSkillIdea(id, reason = '') {
  return request(`/skill-ideas/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

// ============== POWER IDEAS ==============

export async function getPowerIdeas(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/power-ideas/${query}`)
}

export async function createPowerIdea(data) {
  return request('/power-ideas/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function approvePowerIdea(id, data) {
  return request(`/power-ideas/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function rejectPowerIdea(id, reason = '') {
  return request(`/power-ideas/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

// ============== SKILLS & ABILITIES ==============

export async function getSkills(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/skills/${query}`)
}

export async function createSkill(data) {
  return request('/skills/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTraits(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/traits/${query}`)
}

export async function createTrait(data) {
  return request('/traits/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAbilities(campaignId) {
  const query = campaignId ? `?campaign=${campaignId}` : ''
  return request(`/abilities/${query}`)
}

export async function createAbility(data) {
  return request('/abilities/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============== SPECIAL POWERS ==============

export async function createStand(data) {
  return request('/stands/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateStand(id, data) {
  return request(`/stands/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function createCursedTechnique(data) {
  return request('/cursed-techniques/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createZanpakuto(data) {
  return request('/zanpakuto/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function setRelease(characterId, data) {
  return request(`/characters/${characterId}/set_release/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============== POLLING ==============

export async function pollCampaign(campaignId, since) {
  const query = since ? `?since=${since}` : ''
  return request(`/campaigns/${campaignId}/poll/${query}`)
}
