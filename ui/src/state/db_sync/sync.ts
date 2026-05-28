class SyncManager {
  private syncing = false
  private timer: ReturnType<typeof setTimeout> | null = null 
  private readonly SYNC_INTERVAL = 5000

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

  private async pushMutations() {
    // Implementation here
  }

  private async pullChanges() {
    // Implementation here
  }
}