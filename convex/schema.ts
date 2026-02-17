import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users table: Stores user profile and tutorial progress
    users: defineTable({
        tokenIdentifier: v.string(), // Privy Auth ID
        name: v.string(),            // Display Name
        tutorialsSeen: v.array(v.string()), // List of seen tutorial IDs
    }).index("by_token", ["tokenIdentifier"]),

    // Regenmons table: Stores the active pet for each user
    regenmons: defineTable({
        userId: v.id("users"),       // Reference to users table
        name: v.string(),            // Pet Name
        type: v.string(),            // Archetype ID
        stats: v.object({
            happiness: v.number(),
            energy: v.number(),
            hunger: v.number(),
        }),
        coins: v.number(),           // Cell balance
        createdAt: v.number(),       // Timestamp
        lastDailyReward: v.optional(v.string()),
        dailyRewardsClaimed: v.optional(v.number()),

        // Game State Tracking
        isGameOver: v.optional(v.boolean()),
        gameOverAt: v.optional(v.string()),
        evolutionBonus: v.optional(v.number()),
        chatHistory: v.optional(v.array(v.any())),
        history: v.optional(v.array(v.any())),
    }).index("by_user", ["userId"]),

    // Actions table: Complete history of all game events
    actions: defineTable({
        regenmonId: v.id("regenmons"), // Reference to regenmon
        type: v.string(),            // 'feed', 'play', 'sleep', 'chat', 'earn'
        details: v.any(),            // JSON details (amount, message, etc.)
        timestamp: v.string(),       // ISO Date
    }).index("by_regenmon", ["regenmonId"]),
});
