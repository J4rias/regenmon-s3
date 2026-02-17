
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Creates a new Regenmon for the authenticated user.
 * This replaces their current active Regenmon if one exists (or we can handle multiple later).
 */
// Test query to verify DB connection
export const testConnection = query({
    args: {},
    handler: async () => {
        return "Database connection successful!";
    },
});

export const hatch = mutation({
    args: {
        name: v.string(),
        type: v.string(), // Archetype ID
        // Initial stats can be randomized here or passed from frontend, 
        // but randomizing on server prevents client manipulation.
        // For now, let's accept stats to match current frontend logic 
        // OR create random ones here. Let's create random here for security.
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // 1. Get or create user record first to ensure they exist
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) {
            throw new Error("User profile not found. Please log in again.");
        }

        // 2. Check if user already has an active Regenmon?
        // Current game logic allows "reset" which deletes old one.
        // So we will query for existing and delete/archive it.
        const existing = await ctx.db
            .query("regenmons")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }

        // 3. Create new Regenmon
        const initialStats = {
            happiness: Math.floor(Math.random() * 50) + 25,
            energy: Math.floor(Math.random() * 50) + 25,
            hunger: Math.floor(Math.random() * 50) + 25,
        };

        const regenmonId = await ctx.db.insert("regenmons", {
            userId: user._id,
            name: args.name,
            type: args.type,
            stats: initialStats,
            coins: 100, // Starting balance
            createdAt: Date.now(),
            dailyRewardsClaimed: 0,
            lastDailyReward: new Date().toISOString(), // Initialize with today
        });

        return regenmonId;
    },
});

/**
 * Gets the current active Regenmon for the user.
 */
export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) return null;

        const regenmon = await ctx.db
            .query("regenmons")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();

        if (!regenmon) return null;

        // Fetch recent actions to merge into history
        const actions = await ctx.db
            .query("actions")
            .withIndex("by_regenmon", (q) => q.eq("regenmonId", regenmon._id))
            .order("desc")
            .take(10);

        // Merge actions into the regenmon object for the frontend
        return {
            ...regenmon,
            history: actions.map(a => ({
                id: a.details?.originalId || a._id,
                type: a.type as any,
                amount: a.details?.cost || a.details?.amount || 0,
                date: a.timestamp
            }))
        };
    },
});

/**
 * Updates stats (Feeding, Playing, Resting).
 * Validates cost (10 coins) and updates history.
 */
export const updateStats = mutation({
    args: {
        regenmonId: v.id("regenmons"),
        actionType: v.union(v.literal("feed"), v.literal("play"), v.literal("sleep")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const regenmon = await ctx.db.get(args.regenmonId);
        if (!regenmon) throw new Error("Regenmon not found");

        // Check ownership? (Implicitly handled if we query by user, but good to double check)
        // For now assume valid ID passed from trusted client, or query by user.

        // Cost validation
        const cost = 10;
        if (regenmon.coins < cost) {
            throw new Error("Not enough cells");
        }

        // Calculate new stats
        const newStats = { ...regenmon.stats };
        let statName: "hunger" | "happiness" | "energy";

        switch (args.actionType) {
            case "feed":
                statName = "hunger";
                newStats.hunger = Math.min(100, newStats.hunger + 10);
                break;
            case "play":
                statName = "happiness";
                newStats.happiness = Math.min(100, newStats.happiness + 10);
                break;
            case "sleep":
                statName = "energy";
                newStats.energy = Math.min(100, newStats.energy + 10);
                break;
        }

        // Apply Update
        await ctx.db.patch(regenmon._id, {
            stats: newStats,
            coins: regenmon.coins - cost,
        });

        // Log Action
        await ctx.db.insert("actions", {
            regenmonId: regenmon._id,
            type: args.actionType,
            details: { cost: -cost, statChanged: statName, newValue: newStats[statName] },
            timestamp: new Date().toISOString(),
        });

        return { success: true, newStats, newCoins: regenmon.coins - cost };
    },
});

/**
 * Logs a chat message interaction.
 * Optionally awards coins if eligible (passive earning).
 */
export const chat = mutation({
    args: {
        regenmonId: v.id("regenmons"),
        message: v.string(), // User message (to log content if desired)
        isRewardEligible: v.boolean(), // Frontend tells us if this chat *should* trigger reward logic?
        // Or better: backend calculates reward probability to prevent cheating.
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const regenmon = await ctx.db.get(args.regenmonId);
        if (!regenmon) throw new Error("Regenmon not found");

        // Logic for rewards (Server-side validation)
        let coinAward = 0;

        // Currently frontend decides, but let's implement the logic here for security:
        // "50% chance to earn 1-5 cells"
        // We can trust frontend for now OR move logic here. 
        // Moving logic here is safer.

        if (args.isRewardEligible) {
            // Daily Cap Check?
            // We'd need to query today's 'earn' actions. 
            // For MVP, let's keep it simple: just grant if eligible.
            const chance = Math.random();
            if (chance > 0.5) {
                coinAward = Math.floor(Math.random() * 5) + 1;
            }
        }

        if (coinAward > 0) {
            await ctx.db.patch(regenmon._id, {
                coins: regenmon.coins + coinAward
            });

            await ctx.db.insert("actions", {
                regenmonId: regenmon._id,
                type: "earn",
                details: { amount: coinAward, source: "chat" },
                timestamp: new Date().toISOString(),
            });
        }

        // Log the chat itself?
        // If we want chat history:
        await ctx.db.insert("actions", {
            regenmonId: regenmon._id,
            type: "chat",
            details: { message: args.message }, // Be careful with PII/Logging user content
            timestamp: new Date().toISOString(),
        });

        return { coinAward };
    },
});

/**
 * Redeems a Daily Reward (Assist).
 * Validates 3/day limit.
 */
export const outputDailyReward = mutation({
    args: {
        regenmonId: v.id("regenmons"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const regenmon = await ctx.db.get(args.regenmonId);
        if (!regenmon) throw new Error("Regenmon not found");

        const today = new Date().toISOString().split('T')[0];
        const lastDate = regenmon.lastDailyReward ? regenmon.lastDailyReward.split('T')[0] : '';

        let dailyClaimed = 0;
        if (lastDate === today) {
            dailyClaimed = regenmon.dailyRewardsClaimed || 0;
        } else {
            // New day, reset counter (implicitly handled by taking 0)
            dailyClaimed = 0;
        }

        if (dailyClaimed >= 3) {
            throw new Error("Daily limit reached");
        }

        const rewardAmount = 30; // Defined in game logic

        await ctx.db.patch(regenmon._id, {
            coins: regenmon.coins + rewardAmount,
            dailyRewardsClaimed: dailyClaimed + 1,
            lastDailyReward: new Date().toISOString()
        });

        await ctx.db.insert("actions", {
            regenmonId: regenmon._id,
            type: "earn",
            details: { amount: rewardAmount, source: "daily_assist" },
            timestamp: new Date().toISOString(),
        });

        return { success: true, newCoins: regenmon.coins + rewardAmount };
    },
});

/**
 * Deletes the current regenmon (Reset Game).
 */
export const reset = mutation({
    args: {
        regenmonId: v.id("regenmons")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // 1. Delete all actions associated with this regenmon
        const actions = await ctx.db
            .query("actions")
            .withIndex("by_regenmon", (q) => q.eq("regenmonId", args.regenmonId))
            .collect();

        for (const action of actions) {
            await ctx.db.delete(action._id);
        }

        // 2. Delete the regenmon itself
        await ctx.db.delete(args.regenmonId);
    },
});

/**
 * Updates the Regenmon data. 
 * Note: This matches the old "onUpdate" behavior where the frontend sends the whole object.
 * Longer term, we should use granular mutations (like updateStats above).
 */
export const update = mutation({
    args: {
        regenmonId: v.id("regenmons"),
        name: v.optional(v.string()),
        type: v.optional(v.string()),
        stats: v.optional(v.object({
            happiness: v.number(),
            energy: v.number(),
            hunger: v.number(),
        })),
        coins: v.optional(v.number()),
        evolutionBonus: v.optional(v.number()),
        gameOverAt: v.optional(v.string()),
        isGameOver: v.optional(v.boolean()),
        chatHistory: v.optional(v.array(v.any())),
        history: v.optional(v.array(v.any())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const existing = await ctx.db.get(args.regenmonId);
        if (!existing) throw new Error("Regenmon not found");

        const fieldsToUpdate: any = {};
        if (args.name !== undefined) fieldsToUpdate.name = args.name;
        if (args.type !== undefined) fieldsToUpdate.type = args.type;
        if (args.stats !== undefined) fieldsToUpdate.stats = args.stats;
        if (args.coins !== undefined) fieldsToUpdate.coins = args.coins;
        if (args.evolutionBonus !== undefined) fieldsToUpdate.evolutionBonus = args.evolutionBonus;
        if (args.gameOverAt !== undefined) fieldsToUpdate.gameOverAt = args.gameOverAt;
        if (args.isGameOver !== undefined) fieldsToUpdate.isGameOver = args.isGameOver;
        if (args.chatHistory !== undefined) fieldsToUpdate.chatHistory = args.chatHistory;

        if (args.history !== undefined) {
            const newLatest = args.history[0];
            if (newLatest && newLatest.id) {
                // Direct check in actions table for this specific ID
                const isDuplicate = await ctx.db
                    .query("actions")
                    .withIndex("by_regenmon", (q) => q.eq("regenmonId", args.regenmonId))
                    .filter((q) => q.eq(q.field("details.originalId"), newLatest.id))
                    .first();

                if (!isDuplicate) {
                    await ctx.db.insert("actions", {
                        regenmonId: args.regenmonId,
                        type: newLatest.type,
                        details: { amount: newLatest.amount, originalId: newLatest.id },
                        timestamp: newLatest.date || new Date().toISOString(),
                    });
                }
            }
        }

        await ctx.db.patch(args.regenmonId, fieldsToUpdate);
    },
});
