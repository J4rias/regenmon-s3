import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Stores or updates a user in the database.
 * If the user exists (by tokenIdentifier), it updates their info.
 * If not, it creates a new user record.
 */
export const store = mutation({
    args: {
        // We don't need to pass tokenIdentifier explicitly, we get it from auth
        name: v.optional(v.string()), // Optional, only update if provided
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        // Check if we already have this user
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (user !== null) {
            // Update existing user if name is provided
            if (args.name && args.name !== user.name) {
                await ctx.db.patch(user._id, { name: args.name });
            }
            return user._id;
        }

        // Create new user
        return await ctx.db.insert("users", {
            tokenIdentifier: identity.tokenIdentifier,
            name: args.name || "Trainer", // Default name if not provided (though frontend should enforce)
            tutorialsSeen: [],
        });
    },
});

/**
 * Gets the current user's profile.
 */
export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        return user;
    },
});

/**
 * Marks a tutorial as seen for the current user.
 */
export const markTutorialSeen = mutation({
    args: {
        tutorialId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        if (!user.tutorialsSeen.includes(args.tutorialId)) {
            await ctx.db.patch(user._id, {
                tutorialsSeen: [...user.tutorialsSeen, args.tutorialId],
            });
        }
    },
});
