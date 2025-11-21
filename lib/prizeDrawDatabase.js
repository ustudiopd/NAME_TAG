import { supabase } from './supabaseClient'

// ========================================
// 경품추첨 관리 API 함수들
// ========================================

/**
 * 경품추첨 생성
 * @param {string} eventId - 행사 ID
 * @param {Object} data - 경품추첨 데이터
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createPrizeDraw(eventId, data) {
  try {
    const { data: result, error } = await supabase
      .from('prize_draws')
      .insert([{
        event_id: eventId,
        title: data.title,
        description: data.description || null,
        is_active: data.is_active !== undefined ? data.is_active : true
      }])
      .select('*')
      .single()

    if (error) throw error
    return { data: result, error: null }
  } catch (error) {
    console.error('Error creating prize draw:', error)
    return { data: null, error }
  }
}

/**
 * 행사별 경품추첨 목록 조회
 * @param {string} eventId - 행사 ID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPrizeDraws(eventId) {
  try {
    const { data, error } = await supabase
      .from('prize_draws')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching prize draws:', error)
    return { data: null, error }
  }
}

export async function getPrizeDraw(prizeDrawId) {
  try {
    const { data, error } = await supabase
      .from('prize_draws')
      .select('*')
      .eq('id', prizeDrawId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching prize draw:', error)
    return { data: null, error }
  }
}

/**
 * 경품추첨 상세 조회
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getPrizeDrawById(prizeDrawId) {
  try {
    const { data, error } = await supabase
      .from('prize_draws')
      .select('*')
      .eq('id', prizeDrawId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching prize draw:', error)
    return { data: null, error }
  }
}

/**
 * 경품추첨 수정
 * @param {string} prizeDrawId - 경품추첨 ID
 * @param {Object} updates - 수정할 데이터
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updatePrizeDraw(prizeDrawId, updates) {
  try {
    console.log('updatePrizeDraw 호출됨:', { prizeDrawId, updates })
    
    const updateData = {
      title: updates.title,
      description: updates.description,
      is_active: updates.is_active,
      updated_at: new Date().toISOString()
    }
    
    // selected_participants가 있으면 추가
    if (updates.selected_participants !== undefined) {
      updateData.selected_participants = updates.selected_participants
      console.log('selected_participants 추가됨:', updates.selected_participants)
    }
    
    const { data, error } = await supabase
      .from('prize_draws')
      .update(updateData)
      .eq('id', prizeDrawId)
      .select('*')
      .single()

    if (error) throw error
    console.log('업데이트 성공:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Error updating prize draw:', error)
    return { data: null, error }
  }
}

/**
 * 경품추첨 삭제
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deletePrizeDraw(prizeDrawId) {
  try {
    const { error } = await supabase
      .from('prize_draws')
      .delete()
      .eq('id', prizeDrawId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting prize draw:', error)
    return { error }
  }
}

// ========================================
// 경품 관리 API 함수들
// ========================================

/**
 * 경품 생성
 * @param {string} prizeDrawId - 경품추첨 ID
 * @param {Object} data - 경품 데이터
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createPrize(prizeDrawId, data) {
  try {
    const { data: result, error } = await supabase
      .from('prizes')
      .insert([{
        prize_draw_id: prizeDrawId,
        name: data.name,
        description: data.description || null,
        quantity: data.quantity || 1,
        rank_order: data.rank_order,
        image_url: data.image_url || null
      }])
      .select('*')
      .single()

    if (error) throw error
    return { data: result, error: null }
  } catch (error) {
    console.error('Error creating prize:', error)
    return { data: null, error }
  }
}

/**
 * 경품추첨별 경품 목록 조회
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPrizes(prizeDrawId) {
  try {
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .eq('prize_draw_id', prizeDrawId)
      .order('rank_order', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching prizes:', error)
    return { data: null, error }
  }
}

/**
 * 경품 수정
 * @param {string} prizeId - 경품 ID
 * @param {Object} updates - 수정할 데이터
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updatePrize(prizeId, updates) {
  try {
    const { data, error } = await supabase
      .from('prizes')
      .update({
        name: updates.name,
        description: updates.description,
        quantity: updates.quantity,
        rank_order: updates.rank_order,
        image_url: updates.image_url
      })
      .eq('id', prizeId)
      .select('*')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating prize:', error)
    return { data: null, error }
  }
}

/**
 * 경품 삭제
 * @param {string} prizeId - 경품 ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deletePrize(prizeId) {
  try {
    const { error } = await supabase
      .from('prizes')
      .delete()
      .eq('id', prizeId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting prize:', error)
    return { error }
  }
}

// ========================================
// 추첨 실행 API 함수들
// ========================================

/**
 * 경품추첨 실행 (당첨자 선정)
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function executeSinglePrizeDraw(prizeDrawId, prizeId, isRedraw = false) {
  try {
    // 1. 경품추첨 정보 조회
    const { data: prizeDraw, error: drawError } = await getPrizeDrawById(prizeDrawId)
    if (drawError) throw drawError

    // 2. 특정 경품 정보 조회
    console.log('executeSinglePrizeDraw - 경품 정보 조회:', { prizeId })
    const { data: prize, error: prizeError } = await supabase
      .from('prizes')
      .select('*')
      .eq('id', prizeId)
      .single()

    if (prizeError) throw prizeError
    console.log('executeSinglePrizeDraw - 조회된 경품:', { 
      id: prize.id, 
      name: prize.name, 
      rank_order: prize.rank_order,
      quantity: prize.quantity 
    })

    // 2.5. 재추첨인 경우 기존 당첨자 삭제
    if (isRedraw) {
      console.log('executeSinglePrizeDraw - 재추첨: 기존 당첨자 삭제 중...')
      const { error: deleteError } = await supabase
      .from('prize_winners')
        .delete()
        .eq('prize_draw_id', prizeDrawId)
        .eq('prize_id', prizeId)
      
      if (deleteError) {
        console.error('executeSinglePrizeDraw - 기존 당첨자 삭제 오류:', deleteError)
        throw deleteError
      }
      console.log('executeSinglePrizeDraw - 기존 당첨자 삭제 완료')
    }

    // 3. 참가자 목록 조회
    let participants = []
    
    // 선택된 참가자가 있으면 해당 참가자들만 사용 (체크인 여부와 관계없이)
    if (prizeDraw.selected_participants && Array.isArray(prizeDraw.selected_participants) && prizeDraw.selected_participants.length > 0) {
      console.log('executeSinglePrizeDraw - 선택된 참가자 ID들:', prizeDraw.selected_participants)
      
      const { data: selectedParticipants, error: selectedError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', prizeDraw.selected_participants)
      
      if (selectedError) throw selectedError
      participants = selectedParticipants || []
      
      console.log('executeSinglePrizeDraw - 선택된 참가자 데이터:', participants.map(p => ({ id: p.id, name: p.name, company: p.company })))
    } else {
      // 선택된 참가자가 없으면 모든 참가자 사용
      console.log('executeSinglePrizeDraw - 선택된 참가자가 없어서 모든 참가자 사용')
      
      const { data: allParticipants, error: participantsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('event_id', prizeDraw.event_id)
      
      if (participantsError) throw participantsError
      participants = allParticipants || []
      
      console.log('executeSinglePrizeDraw - 모든 참가자 데이터:', participants.map(p => ({ id: p.id, name: p.name, company: p.company })))
    }

    if (!participants || participants.length === 0) {
      throw new Error('추첨 대상 참가자가 없습니다.')
    }
    
    console.log('executeSinglePrizeDraw - 최종 추첨 대상 참가자 수:', participants.length)

    // 4. 기존 당첨자 조회 (중복 방지) - 재추첨이 아닌 경우에만
    let availableParticipants = participants
    
    if (!isRedraw) {
      const { data: existingWinners, error: winnersError } = await supabase
      .from('prize_winners')
        .select('profile_id')
        .eq('prize_draw_id', prizeDrawId)
        .eq('prize_id', prizeId) // 해당 경품의 당첨자만 조회

      if (winnersError) throw winnersError

      const winnerIds = new Set(existingWinners?.map(w => w.profile_id) || [])
      availableParticipants = participants.filter(p => !winnerIds.has(p.id))

      console.log('executeSinglePrizeDraw - 기존 당첨자 수:', winnerIds.size)
      console.log('executeSinglePrizeDraw - 추첨 가능한 참가자 수:', availableParticipants.length)
    } else {
      console.log('executeSinglePrizeDraw - 재추첨이므로 기존 당첨자 제외 없이 모든 참가자 사용')
      console.log('executeSinglePrizeDraw - 추첨 가능한 참가자 수:', availableParticipants.length)
    }

    if (availableParticipants.length === 0) {
      throw new Error('추첨 가능한 참가자가 없습니다.')
    }

    // 5. 단일 경품 추첨 실행
    const results = []
    const count = Math.min(prize.quantity, availableParticipants.length)
    const remainingParticipants = [...availableParticipants]

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * remainingParticipants.length)
      const selectedParticipant = remainingParticipants.splice(randomIndex, 1)[0]

      console.log(`executeSinglePrizeDraw - ${i+1}번째 당첨자 선택:`, {
        id: selectedParticipant.id,
        name: selectedParticipant.name,
        company: selectedParticipant.company
      })

      // 당첨자 기록
      const { data: winner, error: winnerError } = await supabase
      .from('prize_winners')
        .insert([{
          prize_draw_id: prizeDrawId,
          prize_id: prizeId,
          profile_id: selectedParticipant.id
        }])
        .select(`
          *,
          profiles (name, company, title, phone_number, email),
          prizes (name, rank_order)
        `)
        .single()

      if (winnerError) {
        console.error('executeSinglePrizeDraw - 당첨자 기록 오류:', winnerError)
        throw winnerError
      }
      
      console.log(`executeSinglePrizeDraw - ${i+1}번째 당첨자 기록 완료:`, {
        id: winner.id,
        prize_id: winner.prize_id,
        profile_id: winner.profile_id,
        profiles: winner.profiles,
        prizes: winner.prizes
      })
      
      results.push(winner)
    }

    return { data: results, error: null }
  } catch (error) {
    console.error('Error executing single prize draw:', error)
    return { data: null, error }
  }
}

export async function executePrizeDraw(prizeDrawId) {
  try {
    // 1. 경품추첨 정보 조회
    const { data: prizeDraw, error: drawError } = await getPrizeDrawById(prizeDrawId)
    if (drawError) throw drawError

    // 2. 경품 목록 조회
    const { data: prizes, error: prizesError } = await getPrizes(prizeDrawId)
    if (prizesError) throw prizesError

    if (!prizes || prizes.length === 0) {
      throw new Error('경품이 설정되지 않았습니다.')
    }

    // 3. 참가자 목록 조회
    let participants = []
    
    // 선택된 참가자가 있으면 해당 참가자들만 사용 (체크인 여부와 관계없이)
    if (prizeDraw.selected_participants && Array.isArray(prizeDraw.selected_participants) && prizeDraw.selected_participants.length > 0) {
      console.log('선택된 참가자 ID들로 추첨:', prizeDraw.selected_participants)
      
      const { data: selectedParticipants, error: selectedError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', prizeDraw.selected_participants)
        // 체크인 필터 제거 - 선택된 참가자 모두 사용
      
      if (selectedError) throw selectedError
      participants = selectedParticipants || []
      
      console.log('선택된 참가자 수:', participants.length)
    } else {
      // 선택된 참가자가 없으면 모든 참가자 사용 (체크인 여부와 관계없이)
      console.log('선택된 참가자가 없어서 모든 참가자 사용')
      
      const { data: allParticipants, error: participantsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('event_id', prizeDraw.event_id)
      // 체크인 필터 제거 - 모든 참가자 사용
      
      if (participantsError) throw participantsError
      participants = allParticipants || []
    }

    if (!participants || participants.length === 0) {
      throw new Error('추첨 대상 참가자가 없습니다.')
    }
    
    console.log('최종 추첨 대상 참가자 수:', participants.length)

    // 4. 기존 당첨자 조회 (중복 방지)
    const { data: existingWinners, error: winnersError } = await supabase
      .from('prize_winners')
      .select('profile_id')
      .eq('prize_draw_id', prizeDrawId)

    if (winnersError) throw winnersError

    const winnerIds = new Set(existingWinners?.map(w => w.profile_id) || [])
    const availableParticipants = participants.filter(p => !winnerIds.has(p.id))

    // 5. 추첨 실행
    const results = []
    let remainingParticipants = [...availableParticipants]

    for (const prize of prizes) {
      const prizeWinners = []
      const count = Math.min(prize.quantity, remainingParticipants.length)

      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * remainingParticipants.length)
        const winner = remainingParticipants.splice(randomIndex, 1)[0]
        prizeWinners.push(winner)
      }

      // 6. 당첨자 결과 저장
      for (const winner of prizeWinners) {
        const { error: insertError } = await supabase
      .from('prize_winners')
          .insert([{
            prize_draw_id: prizeDrawId,
            prize_id: prize.id,
            profile_id: winner.id
          }])

        if (insertError) throw insertError

        results.push({
          prize: prize,
          winner: winner
        })
      }
    }

    return { data: results, error: null }
  } catch (error) {
    console.error('Error executing prize draw:', error)
    return { data: null, error }
  }
}

/**
 * 추첨 결과 조회
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPrizeWinners(prizeDrawId) {
  try {
    const { data, error } = await supabase
      .from('prize_winners')
      .select(`
        *,
        prize:prizes(*),
        profile:profiles(*)
      `)
      .eq('prize_draw_id', prizeDrawId)
      .order('won_at', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching prize winners:', error)
    return { data: null, error }
  }
}

/**
 * 추첨 결과 초기화
 * @param {string} prizeDrawId - 경품추첨 ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function resetPrizeDraw(prizeDrawId) {
  try {
    console.log('resetPrizeDraw 시작:', prizeDrawId)
    
    // 먼저 해당 경품추첨의 당첨자 수 확인
    const { count, error: countError } = await supabase
      .from('prize_winners')
      .select('*', { count: 'exact', head: true })
      .eq('prize_draw_id', prizeDrawId)
    
    if (countError) {
      console.error('당첨자 수 조회 오류:', countError)
      throw countError
    }
    
    console.log('삭제할 당첨자 수:', count)
    
    // 당첨자 삭제
    const { error } = await supabase
      .from('prize_winners')
      .delete()
      .eq('prize_draw_id', prizeDrawId)

    if (error) {
      console.error('당첨자 삭제 오류:', error)
      throw error
    }
    
    console.log('resetPrizeDraw 완료')
    return { error: null }
  } catch (error) {
    console.error('Error resetting prize draw:', error)
    return { error }
  }
}

/**
 * 경품추첨 복사
 * @param {string} prizeDrawId - 원본 경품추첨 ID
 * @param {string} newTitle - 새 제목
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function duplicatePrizeDraw(prizeDrawId, newTitle) {
  try {
    // 1. 원본 경품추첨 조회
    const { data: originalDraw, error: drawError } = await getPrizeDrawById(prizeDrawId)
    if (drawError) throw drawError

    // 2. 원본 경품 목록 조회
    const { data: originalPrizes, error: prizesError } = await getPrizes(prizeDrawId)
    if (prizesError) throw prizesError

    // 3. 새 경품추첨 생성
    const { data: newDraw, error: createError } = await createPrizeDraw(originalDraw.event_id, {
      title: newTitle,
      description: originalDraw.description,
      is_active: true
    })

    if (createError) throw createError

    // 4. 경품들 복사
    for (const prize of originalPrizes) {
      const { error: prizeError } = await createPrize(newDraw.id, {
        name: prize.name,
        description: prize.description,
        quantity: prize.quantity,
        rank_order: prize.rank_order,
        image_url: prize.image_url
      })

      if (prizeError) throw prizeError
    }

    return { data: newDraw, error: null }
  } catch (error) {
    console.error('Error duplicating prize draw:', error)
    return { data: null, error }
  }
}

/**
 * Supabase 연결 테스트
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('prize_draws')
      .select('count', { count: 'exact', head: true })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    return { success: false, error }
  }
}
