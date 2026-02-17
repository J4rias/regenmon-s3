import { useState, useEffect, useRef } from 'react'
import { Send, Brain } from 'lucide-react'
import { RegenmonData, ChatMessage } from '@/lib/regenmon-types'
import { t, Locale } from '@/lib/i18n'
import { CHALLENGES, Challenge } from '@/lib/challenges'

interface ChatBoxProps {
    data: RegenmonData
    locale: 'es' | 'en'
    onUpdate: (data: RegenmonData) => void
    isGameOver?: boolean
    isOpen: boolean
    onTypingChange?: (isTyping: boolean) => void
    onUnlockReward: () => void
}

export function ChatBox({ data, locale, onUpdate, isGameOver, isOpen, onTypingChange, onUnlockReward }: ChatBoxProps) {
    const [inputValue, setInputValue] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>(data.chatHistory || [])
    const [memories, setMemories] = useState<string[]>(data.memories || [])
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [sessionCount, setSessionCount] = useState(0)
    const messagesRef = useRef<ChatMessage[]>(messages)
    const dataRef = useRef<RegenmonData>(data)

    // Keep refs in sync for use in timers/effects
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    useEffect(() => {
        dataRef.current = data
    }, [data])

    // Challenge State
    const [challengeState, setChallengeState] = useState<'IDLE' | 'PROMPT' | 'CHALLENGE'>('IDLE')
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
    const [wrongAttempts, setWrongAttempts] = useState(0)

    useEffect(() => {
        if (isOpen) setSessionCount(0)
    }, [isOpen])

    // Notify parent when typing state changes
    useEffect(() => {
        onTypingChange?.(isTyping)
        // Focus when typing ends
        if (!isTyping && !isGameOver) {
            setTimeout(() => inputRef.current?.focus(), 10)
        }
    }, [isTyping, onTypingChange, isGameOver])

    // Auto-scroll internal container only (avoids page scroll)
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const s = t(locale)

    const rescueTimerRef = useRef<NodeJS.Timeout | null>(null)

    const lastRescuePromptRef = useRef<number>(0)

    // State to force re-evaluation of the rescue timer (e.g. for cooldowns)
    const [rescueEvalTick, setRescueEvalTick] = useState(0)
    useEffect(() => {
        if ((data.coins ?? 0) <= 0 && challengeState === 'IDLE') {
            const interval = setInterval(() => setRescueEvalTick(prev => prev + 1), 5000)
            return () => clearInterval(interval)
        }
    }, [data.coins, challengeState])

    // Check for Rescue Mode trigger
    useEffect(() => {
        // Outer check for game state
        if (isGameOver || challengeState !== 'IDLE') {
            if (rescueTimerRef.current) {
                clearTimeout(rescueTimerRef.current)
                rescueTimerRef.current = null
            }
            return
        }

        const currentRec = dataRef.current
        const coins = currentRec.coins ?? 0
        const dailyClaimed = currentRec.dailyRewardsClaimed ?? 0
        const today = new Date().toISOString().split('T')[0]
        const recordDate = currentRec.lastDailyRewardDate ? currentRec.lastDailyRewardDate.split('T')[0] : ''
        const effectiveClaimed = recordDate === today ? dailyClaimed : 0

        // If conditions for rescue aren't met, clear any pending timer
        if (coins > 0 || effectiveClaimed >= 3) {
            if (rescueTimerRef.current) {
                clearTimeout(rescueTimerRef.current)
                rescueTimerRef.current = null
            }
            return
        }

        // COOLDOWN LOGIC:
        // Only enforce 2min cooldown if we have SHOWN it before (lastRescuePromptRef > 0)
        if (lastRescuePromptRef.current > 0) {
            const timeSinceLast = Date.now() - lastRescuePromptRef.current
            if (timeSinceLast < 120000) return
        }

        // CHECK IF ALREADY SHOWN IN HISTORY
        const history = messagesRef.current
        const lastMsg = history[history.length - 1]
        if (lastMsg?.content === s.rescuePrompt) {
            setChallengeState('PROMPT')
            return
        }

        // START TIMER IF NOT ALREADY RUNNING
        // Note: We do NOT clear this timer in the cleanup of this effect if it re-runs 
        // due to 'messages' because that would 'reset' the 10s wait every time someone speaks.
        if (!rescueTimerRef.current) {
            rescueTimerRef.current = setTimeout(() => {
                setChallengeState('PROMPT')
                addAssistantMessage(s.rescuePrompt)
                lastRescuePromptRef.current = Date.now() // Start cooldown clock
                rescueTimerRef.current = null
            }, 10000)
        }

    }, [data.coins, data.dailyRewardsClaimed, data.lastDailyRewardDate, challengeState, isGameOver, s, messages, rescueEvalTick])

    // Specific cleanup for unmount
    useEffect(() => {
        return () => {
            if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current)
        }
    }, [])

    const addAssistantMessage = (content: string) => {
        const msg: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
        }

        const updatedHistory = [...messagesRef.current, msg].slice(-20)
        setMessages(updatedHistory)
        messagesRef.current = updatedHistory

        onUpdate({
            ...dataRef.current,
            chatHistory: updatedHistory
        })

        // Ensure focus
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    // Sync state with parent data updates (if parent resets or loads saves)
    useEffect(() => {
        if (data.chatHistory) {
            setMessages(data.chatHistory)
            messagesRef.current = data.chatHistory
        }
        if (data.memories) setMemories(data.memories)
    }, [data.chatHistory, data.memories])

    const getRandomChallenge = () => {
        return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]
    }

    const checkPassiveEarning = (currentData: RegenmonData): RegenmonData => {
        const today = new Date().toISOString().split('T')[0]
        const lastDate = currentData.lastChatEarningDate ? currentData.lastChatEarningDate.split('T')[0] : ''

        let dailyEarnings = lastDate === today ? (currentData.dailyChatEarnings ?? 0) : 0

        // Hard Cap: 50 cells/day
        if (dailyEarnings >= 50) return currentData

        const currentCoins = currentData.coins ?? 0

        // NO earnings if already at 0. User MUST do the challenge to restart.
        if (currentCoins <= 0) return currentData

        // Difficulty Logic:
        // < 80 coins: 80% chance
        // >= 80 coins: 10% chance
        const chance = currentCoins < 80 ? 0.8 : 0.1

        if (Math.random() > chance) return currentData

        // Earn 2-5 cells
        const earned = Math.floor(Math.random() * 4) + 2

        // Don't exceed daily cap
        const actualEarned = Math.min(earned, 50 - dailyEarnings)
        if (actualEarned <= 0) return currentData

        // Update data
        return {
            ...currentData,
            coins: currentCoins + actualEarned,
            dailyChatEarnings: dailyEarnings + actualEarned,
            lastChatEarningDate: new Date().toISOString()
        }
    }

    const handleSend = async () => {
        const trimmedInput = inputValue.trim()
        if (!trimmedInput || isTyping || isGameOver) return

        const currentData = dataRef.current

        // Easter Egg: /cells
        if (trimmedInput.toLowerCase() === '/cells') {
            const newCoins = (currentData.coins ?? 0) + 100
            onUpdate({
                ...currentData,
                coins: newCoins
            })
            setInputValue('')
            return
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date().toISOString(),
        }

        // Optimistic update
        const newHistory = [...messagesRef.current, userMsg].slice(-20)
        setMessages(newHistory)
        messagesRef.current = newHistory
        setInputValue('')

        // --- PRE-PROCESSING & PASSIVE EARNING ---
        // We do this up front so ALL interactions (including rescue/challenge) benefit.
        const dataWithEarnings = checkPassiveEarning(currentData)

        // Update stats: progressive energy cost
        const currentSession = sessionCount + 1
        setSessionCount(currentSession)

        let baseCost = 3
        if (currentSession > 15) baseCost = 5
        else if (currentSession > 5) baseCost = 4

        const energyCost = baseCost + (inputValue.length > 50 ? 2 : 0)
        const newStats = { ...dataWithEarnings.stats }
        newStats.happiness = Math.min(100, newStats.happiness + 5)
        newStats.energy = Math.max(0, newStats.energy - energyCost)

        const lowerInput = trimmedInput.toLowerCase()

        // Apply changes (user message + passive earnings + stats)
        onUpdate({
            ...dataWithEarnings,
            stats: newStats,
            chatHistory: newHistory,
            memories: memories
        })

        const rescueKeywords = locale === 'es'
            ? ['quiero celdas', 'ganar celdas', 'necesito celdas', 'dame celdas']
            : ['want cells', 'earn cells', 'need cells', 'give me cells']

        if (currentData.coins <= 0 && (currentData.dailyRewardsClaimed ?? 0) < 3 && rescueKeywords.some(k => lowerInput.includes(k))) {
            const challenge = getRandomChallenge()
            setCurrentChallenge(challenge)
            setChallengeState('CHALLENGE')
            setWrongAttempts(0)

            // Optimistic update removed (handled globally)
            // const newHistory = [...messagesRef.current, userMsg].slice(-20)
            // setMessages(newHistory)
            // messagesRef.current = newHistory
            // setInputValue('')

            setIsTyping(true)
            setTimeout(() => {
                addAssistantMessage(locale === 'es' ? "¡Genial! Responde esto para ganar tu recompensa: " + challenge.question_es : "Great! Answer this to earn your reward: " + challenge.question_en)
                setIsTyping(false)
            }, 1000)
            return
        }

        // --- CHALLENGE LOGIC ---
        if (challengeState === 'PROMPT') {
            const affirmative = locale === 'es' ? ['si', 'sí', 'claro', 'quiero', 'ok'] : ['yes', 'yeah', 'sure', 'ok', 'yep']

            if (affirmative.some(w => lowerInput.includes(w))) {
                const challenge = getRandomChallenge()
                setCurrentChallenge(challenge)
                setChallengeState('CHALLENGE')
                setWrongAttempts(0)

                // Optimistic update removed (handled globally)
                // const newHistory = [...messagesRef.current, userMsg].slice(-20)
                // setMessages(newHistory)
                // messagesRef.current = newHistory
                // setInputValue('')

                setIsTyping(true)
                setTimeout(() => {
                    addAssistantMessage(locale === 'es' ? challenge.question_es : challenge.question_en)
                    setIsTyping(false)
                }, 1000)
                return
            } else {
                // User rejected or ignored the prompt
                setChallengeState('IDLE')
                // We don't return here, we let it fall through to normal chat
                // But we should probably acknowledge it if they said "no"
                const negative = locale === 'es' ? ['no', 'nop'] : ['no', 'nah']
                if (negative.some(w => lowerInput.includes(w))) {
                    // Optimistic update removed (handled globally)
                    // const newHistory = [...messagesRef.current, userMsg].slice(-20)
                    // setMessages(newHistory)
                    // messagesRef.current = newHistory
                    // setInputValue('')

                    // Reset cooldown on rejection
                    lastRescuePromptRef.current = Date.now()

                    setIsTyping(true)
                    setTimeout(() => {
                        addAssistantMessage(locale === 'es' ? "Entendido. Avísame si cambias de opinión." : "Understood. Let me know if you change your mind.")
                        setIsTyping(false)
                    }, 1000)
                    return
                }
            }
        }

        if (challengeState === 'CHALLENGE' && currentChallenge) {
            const lowerInput = trimmedInput.toLowerCase()
            const expected = locale === 'es' ? currentChallenge.answer_es : currentChallenge.answer_en

            if (lowerInput.includes(expected)) {
                // Correct!
                setIsTyping(true)
                setTimeout(() => {
                    addAssistantMessage(s.challengeCorrect)
                    onUnlockReward() // Unlock chest
                    setChallengeState('IDLE')
                    setCurrentChallenge(null)
                    setIsTyping(false)
                }, 1000)
            } else {
                // Wrong
                const newAttempts = wrongAttempts + 1
                setWrongAttempts(newAttempts)
                setIsTyping(true)

                setTimeout(() => {
                    if (newAttempts >= 3) {
                        // Failed 3 times, give new question
                        const newChallenge = getRandomChallenge()
                        setCurrentChallenge(newChallenge)
                        setWrongAttempts(0)
                        addAssistantMessage(s.challengeWrong + ' ' + (locale === 'es' ? "Probemos otra:" : "Let's try another:") + ' ' + (locale === 'es' ? newChallenge.question_es : newChallenge.question_en))
                    } else {
                        // Hint
                        // Simple hint: first letter
                        const hint = expected.charAt(0).toUpperCase() + '...'
                        addAssistantMessage(`${s.challengeWrong} ${s.challengeHint} ${hint}`)
                    }
                    setIsTyping(false)
                }, 1000)
            }
            return
        }

        // --- NORMAL CHAT LOGIC ---
        setIsTyping(true)
        const earned = (dataWithEarnings.coins ?? 0) - (currentData.coins ?? 0)

        // Show earning feedback if any
        if (earned > 0) {
            // The dashboard observer will trigger the +popup automatically when it sees coins increase!
        }




        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    history: newHistory,
                    stats: newStats,
                    name: currentData.name,
                    type: currentData.type,
                    memories: memories,
                    locale: locale
                }),
            })

            const json = await response.json()

            if (json.error) throw new Error(json.error)

            // Artificial delay to make it feel natural (typing specificication)
            await new Promise(r => setTimeout(r, 1000))

            let replyContent = json.reply || '...'
            let newMemories = [...memories]

            let assistantMsg: ChatMessage & { memoryIndex?: number, isRecall?: boolean } = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '', // Will be set after processing tags
                timestamp: new Date().toISOString(),
            }

            // Process RECALL tags - very flexible regex
            const recallMatches = replyContent.match(/[\[\(]RECALL:\s*(\d+)[\]\)]/i);
            if (recallMatches) {
                const idx = parseInt(recallMatches[1]);
                if (idx > 0) {
                    assistantMsg.memoryIndex = idx;
                    assistantMsg.isRecall = true;
                }
                replyContent = replyContent.replace(recallMatches[0], '').trim();
            }

            // Process MEMORY tags - very flexible regex
            const memoryMatch = replyContent.match(/[\[\(]MEMOR(Y|IA):\s*(.*?)[\]\)]/i);
            if (memoryMatch) {
                const memoryContent = memoryMatch[2];
                const memoryIndex = (memories?.length || 0) + 1
                newMemories.push(memoryContent)

                assistantMsg.memoryIndex = memoryIndex;
                assistantMsg.isRecall = false;
                replyContent = replyContent.replace(memoryMatch[0], '').trim();
            }

            assistantMsg.content = replyContent;

            const updatedHistory = [...newHistory, assistantMsg].slice(-20)

            setMessages(updatedHistory)
            messagesRef.current = updatedHistory
            setMemories(newMemories)

            // Use dataRef.current to get latest stats (which might have drained while waiting for API)
            onUpdate({
                ...dataRef.current,
                stats: newStats,
                chatHistory: updatedHistory,
                memories: newMemories,
                coins: dataWithEarnings.coins,
                dailyChatEarnings: dataWithEarnings.dailyChatEarnings,
                lastChatEarningDate: dataWithEarnings.lastChatEarningDate
            })

        } catch (error) {
            console.error('Chat error:', error)
            // Fallback message if API fails
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: locale === 'es' ? '... (dormido)' : '... (sleeping)',
                timestamp: new Date().toISOString(),
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
            // Restore focus after sending message
            if (!isGameOver) {
                setTimeout(() => inputRef.current?.focus(), 10)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div
            className="nes-container is-rounded w-full"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)',
                padding: '12px'
            }}
        >
            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex flex-col gap-3 overflow-y-auto mb-4 p-4 custom-scrollbar"
                style={{ flex: 1, backgroundColor: 'var(--background)', borderRadius: '4px', overflowX: 'visible' }}
            >
                {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground mt-10 opacity-50">
                        {locale === 'es' ? '¡Saluda a tu Regenmon!' : 'Say hello to your Regenmon!'}
                    </p>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className="relative">
                            <div
                                className={`nes-balloon from-left is-small ${msg.role === 'user' ? 'from-right is-dark' : ''}`}
                                style={{
                                    maxWidth: '85%',
                                    fontSize: '12px',
                                    padding: '8px 12px',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.4',
                                    backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)',
                                    color: msg.role === 'user' ? 'var(--primary-foreground)' : 'var(--foreground)',
                                }}
                            >
                                {msg.content}
                            </div>
                            {msg.memoryIndex && (
                                <div
                                    className="absolute bg-yellow-400 text-black px-1.5 py-0.5 rounded border-2 border-black text-[10px] font-bold flex items-center gap-1 shadow-md"
                                    style={{
                                        zIndex: 50,
                                        bottom: '-5px',
                                        right: '-5px',
                                        pointerEvents: 'auto',
                                        display: 'flex',
                                        minWidth: '40px',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                    title={msg.isRecall ? t(locale).memoryRecalled : t(locale).memorySaved}
                                >
                                    🧠 {msg.memoryIndex}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="nes-balloon from-left is-small" style={{ padding: '8px 12px', backgroundColor: 'var(--secondary)' }}>
                            <span className="animate-pulse">...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`nes-input ${isGameOver ? 'is-error' : 'is-success'}`}
                    placeholder={isGameOver
                        ? s.gameOver
                        : (challengeState !== 'IDLE'
                            ? (locale === 'es' ? 'Tu respuesta...' : 'Your answer...')
                            : (locale === 'es' ? 'Escribe algo...' : 'Say something...'))
                    }
                    disabled={isTyping || isGameOver}
                    style={{ fontSize: '12px', height: '40px' }}
                    ref={inputRef}
                />
                <button
                    className={`nes-btn ${isTyping || isGameOver ? 'is-disabled' : 'is-primary'}`}
                    onClick={handleSend}
                    disabled={isTyping || isGameOver}
                    style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center' }}
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
