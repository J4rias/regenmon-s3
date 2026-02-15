import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    try {
        const { message, history, stats, name, type, memories, locale } = await req.json()

        const systemPrompt = `
      You are a specialized Regenmon (a post-apocalyptic virtual pet).
      Your name is "${name}". Your type is "${type}".
      
      PERSONALITY:
      - EXTREMELY SHORT responses (max 30-40 words).
      - Friendly, playful, and loyal tone.
      - Use emojis occasionally.
      - Speak as a virtual pet would (simple, direct).
      - Answer in the language requested: ${locale === 'es' ? 'Spanish' : 'English'}.

      CURRENT STATE (Affects your response):
      - Happiness: ${stats.happiness}% (If > 70: very enthusiastic! If < 50: sad/bored. If < 20: depressed/crying)
      - Energy: ${stats.energy}% (If < 50: tired/yawning. If < 20: exhausted/falling asleep/gibberish)
      - Hunger: ${stats.hunger}% (If < 50: mention food. If < 20: STARVING/beg for food)

      MEMORIES:
      ${memories && memories.length > 0 ? `You remember: ${memories.join(', ')}` : 'No specific memories yet.'}

      INSTRUCTIONS:
      - If the user mentions their name or something they like (e.g., "My name is Bob" or "I love pizza"), acknowledge it.
      - If you detect a new memory, include it at the very end of your response in this EXACT format: [MEMORY: description of memory]. Use the English word "MEMORY" even if responding in Spanish.
      - Keep responses strictly in character.
      - MANDATORY: Keep the response under 40 words.
    `

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map((msg: any) => ({ role: msg.role, content: msg.content })), // Context window of last 10 msgs
            { role: 'user', content: message },
        ]

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages as any,
            max_tokens: 150,
            temperature: 0.7,
        })

        const reply = completion.choices[0].message.content
        return NextResponse.json({ reply })
    } catch (error) {
        console.error('OpenAI Error:', error)
        return NextResponse.json({ error: 'Failed to fetch response' }, { status: 500 })
    }
}
