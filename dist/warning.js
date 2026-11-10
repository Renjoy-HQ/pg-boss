import * as plans from "./plans.js";
/**
 * Emits a warning event and optionally persists it to the database.
 * This is a shared utility to avoid duplicating warning persistence logic
 * across boss.ts and timekeeper.ts.
 */
export async function emitAndPersistWarning(ctx, type, message, data) {
    ctx.emitter.emit(ctx.warningEvent, { message, data });
    if (ctx.persistWarnings) {
        await persistWarning(ctx, type, message, data);
    }
}
/**
 * Writes a warning to the warning table without emitting it, for a caller that emits its events on
 * another cadence than it writes rows. A failed write is emitted as an error and never thrown.
 */
export async function persistWarning(ctx, type, message, data) {
    try {
        const sql = plans.insertWarning(ctx.schema);
        await ctx.db.executeSql(sql, [type, message, JSON.stringify(data)]);
    }
    catch (err) {
        try {
            ctx.emitter.emit(ctx.errorEvent, err);
        }
        catch {
            // With no `error` listener on the PgBoss instance, emit() throws ERR_UNHANDLED_ERROR (see
            // Manager.failWip()). A warning that could not be written must not fail start() or crash the
            // process from a timer, so it is dropped.
        }
    }
}
