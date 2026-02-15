'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Brain } from 'lucide-react'
import { RegenmonData, ChatMessage } from '@/lib/regenmon-types'
import { t, Locale } from '@/lib/i18n'

interface ChatBoxProps {
    data: RegenmonData
    locale: 'es' | 'en'
    onUpdate: (data: RegenmonData) => void
    isGameOver?: boolean
    isOpen: boolean
    onTypingChange?: (isTyping: boolean) => void
}

export function ChatBox({ data, locale, onUpdate, isGameOver, isOpen, onTypingChange }: ChatBoxProps) {
    const [inputValue, setInputValue] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>(data.chatHistory || [])
    const [memories, setMemories] = useState<string[]>(data.memories || [])
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [sessionCount, setSessionCount] = useState(0)

    useEffect(() => {
        if (isOpen) setSessionCount(0)
    }, [isOpen])

    // Notify parent when typing state changes
    useEffect(() => {
        onTypingChange?.(isTyping)
    }, [isTyping, onTypingChange])

    // Auto-scroll internal container only (avoids page scroll)
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const s = t(locale)

    const isFirstRun = useRef(true)
    const warningCooldowns = useRef<{ [key: string]: number }>({})



    // Auto-chat triggers for low stats
    useEffect(() => {
        if (isGameOver) return

        const checkStat = async (stat: 'happiness' | 'energy' | 'hunger', value: number) => {
            return // Temporarily disabled auto-complaints as requested
            const now = Date.now()
            const lastWarn = warningCooldowns.current[stat] || 0

            // Trigger if stat < 30 and no warning in last 60 seconds
            if (value < 30 && now - lastWarn > 60000) {
                warningCooldowns.current[stat] = now

                setIsTyping(true)
                try {
                    // Context for the AI to know why it's talking
                    const contextMessage = `[SYSTEM: Your ${stat} is dangerously low (${value}%). Complain to the user and warn them that if it hits 0 you might die! Answer in ${locale === 'es' ? 'Spanish' : 'English'}.]`

                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: contextMessage,
                            history: messages, // Send current history
                            stats: data.stats,
                            name: data.name,
                            type: data.type,
                            memories: memories,
                            locale: locale
                        }),
                    })

                    const json = await response.json()
                    if (json.error) throw new Error(json.error)

                    const replyContent = json.reply || '...'

                    const assistantMsg: ChatMessage = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: replyContent,
                        timestamp: new Date().toISOString(),
                    }

                    const updatedHistory = [...messages, assistantMsg].slice(-20)
                    setMessages(updatedHistory)
                    onUpdate({ ...data, chatHistory: updatedHistory })

                } catch (error) {
                    console.error('Auto-chat error:', error)
                } finally {
                    setIsTyping(false)
                    // Restore focus after auto-chat if not game over
                    if (!isGameOver) {
                        setTimeout(() => inputRef.current?.focus(), 10)
                    }
                }
            }
        }

        checkStat('happiness', data.stats.happiness)
        checkStat('energy', data.stats.energy)
        checkStat('hunger', data.stats.hunger)

    }, [data.stats, isGameOver, messages, data, locale, onUpdate, memories])

    // Sync state with parent data updates (if parent resets or loads saves)
    useEffect(() => {
        if (data.chatHistory) setMessages(data.chatHistory)
        if (data.memories) setMemories(data.memories)
    }, [data.chatHistory, data.memories])

    const handleSend = async () => {
        if (!inputValue.trim() || isTyping || isGameOver) return

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date().toISOString(),
        }

        // Optimistic update
        const newHistory = [...messages, userMsg].slice(-20) // Keep last 20
        setMessages(newHistory)
        setInputValue('')
        setIsTyping(true)

        // Update stats: progressive energy cost
        const currentSession = sessionCount + 1
        setSessionCount(currentSession)

        let energyCost = 0

        // Rule 1: Session Length (First 3 msgs free, then progressive penalty)
        if (currentSession > 8) energyCost += 5
        else if (currentSession > 3) energyCost += 2

        // Rule 2: Message Length (>50 chars penalty)
        if (inputValue.length > 100) energyCost += 3
        else if (inputValue.length > 50) energyCost += 1

        const newStats = { ...data.stats }
        newStats.happiness = Math.min(100, newStats.happiness + 5)
        newStats.energy = Math.max(0, newStats.energy - energyCost)

        // Check energy penalty for spamming (simplified logic: just base cost for now as per prompt)
        // "Si la conversación tiene más de 5 mensajes seguidos" -> implementation details: could track session count.
        // For now, let's stick to the base requested simple implementation.

        onUpdate({
            ...data,
            stats: newStats,
            chatHistory: newHistory,
            memories: memories // Persist existing memories
        })

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    history: newHistory,
                    stats: newStats,
                    name: data.name,
                    type: data.type,
                    memories: memories,
                    locale: locale
                }),
            })

            const json = await response.json()

            if (json.error) throw new Error(json.error)

            // Artificial delay to make it feel natural (typing specificication)
            await new Promise(r => setTimeout(r, 1000))

            let replyContent = json.reply || '...'

            // Check for memory extraction [MEMORY: ...] or [MEMORIA: ...]
            const memoryMatch = replyContent.match(/\[MEMOR(Y|IA):\s*(.*?)\]/i)
            let newMemories = [...memories]

            let assistantMsg: ChatMessage & { memoryIndex?: number } = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: replyContent,
                timestamp: new Date().toISOString(),
            }

            if (memoryMatch) {
                const memoryContent = memoryMatch[2]
                const memoryIndex = (memories?.length || 0) + 1
                newMemories.push(memoryContent)

                assistantMsg.memoryIndex = memoryIndex
                assistantMsg.content = assistantMsg.content.replace(memoryMatch[0], '').trim()
            }

            const updatedHistory = [...newHistory, assistantMsg].slice(-20)

            setMessages(updatedHistory)
            setMemories(newMemories)

            onUpdate({
                ...data,
                stats: newStats,
                chatHistory: updatedHistory,
                memories: newMemories
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
                className="flex flex-col gap-3 overflow-y-auto mb-4 p-2 custom-scrollbar"
                style={{ flex: 1, backgroundColor: 'var(--background)', borderRadius: '4px' }}
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
                                position: 'relative'
                            }}
                        >
                            {msg.content}
                            {msg.memoryIndex && (
                                <div
                                    className="absolute -bottom-2 -right-2 bg-yellow-400 text-black px-1.5 py-0.5 rounded border border-black text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                    title={t(locale).memorySaved}
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
                        : (locale === 'es' ? 'Escribe algo...' : 'Say something...')
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
