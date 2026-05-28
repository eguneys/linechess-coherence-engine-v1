import { create_sync_api } from "./api"
import type { DatabaseActions, DatabaseState } from "./idb"

class SyncManager {
  private syncing = false
  private timer: ReturnType<typeof setTimeout> | null = null 
  private readonly SYNC_INTERVAL = 5000

  constructor(
    readonly pushMutations: () => Promise<void>, 
    readonly pullChanges: () => Promise<void>) {}

  get is_syncing() {
    return this.syncing
  }

  async run() {
    // 1. Guard against concurrent runs
    if (this.syncing) return
    this.syncing = true

    // 2. Clear any pending scheduled kicks since we are running now
    this.clearTimer()

    try {
      await this.pushMutations()
      await this.pullChanges()
    } catch (error) {
      console.error("Sync failed:", error)
      // You might want to implement exponential backoff here later
    } finally {
      this.syncing = false
      
      // 3. Schedule the NEXT run safely after a cooldown period
      this.queueNextRun(this.SYNC_INTERVAL)
    }
  }

  /**
   * Forces a sync to happen soon (e.g., after a user action)
   */
  kick() {
    this.clearTimer()

    // If it's already syncing, we don't need to queue another one; 
    // the finally block of the current run will handle scheduling the next one.
    if (this.syncing) return

    this.queueNextRun(500)
  }

  private queueNextRun(delayMs: number) {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.run()
    }, delayMs)
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

export async function make_syncer(db_state: DatabaseState, db_actions: DatabaseActions) {

  let syncer = new SyncManager(pushMutations, pullChanges)
  let sync_api = create_sync_api()

  let sync_state = await db_state.get_sync_state()

  async function pushMutations() {
    sync_state.sync_in_progress = true
    await db_actions.set_sync_state(sync_state)

    let mutations = await db_state.get_pending_mutations()

    await sync_api.push(mutations)

    await db_actions.delete_mutations(mutations.map(_ => _.id))

    sync_state.pending_writes = false
    await db_actions.set_sync_state(sync_state)
  }

  async function pullChanges() {
    let since = sync_state.last_pulled_at
    let mutations = await sync_api.pull(since)
    await db_actions.apply_mutations(mutations)

    sync_state.last_pulled_at = Date.now()
    sync_state.needs_pull = false
    sync_state.sync_in_progress = false

    db_actions.set_sync_state(sync_state)
  }

  return {
    kick() {
      syncer.kick()
    },
  }
}