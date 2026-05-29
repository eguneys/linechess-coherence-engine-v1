import { gen_id8 } from "../controller.js"
import { YesterdayMs } from "./time.js"

export type QPJId = string

export type QueryPlayerJob = {
    id: QPJId
    username: string
    since_ms: number
    priority: number
}

export class QPJ_Manager {
    private syncing = false
    private timer: ReturnType<typeof setTimeout> | null = null
    private readonly SYNC_INTERVAL_MS = 60 * 1000

    private should_sync_fast = false

    jobs: QueryPlayerJob[]

    constructor(private do_work: (username: string, since: number) => Promise<void>) {
        this.jobs = []
    }

    search_username(username: string) {
        let existing = this.jobs.find(_ => _.username === username)
        if (existing) {

            existing.priority += 1000
        } else {
            this.jobs.push({
                id: gen_id8(),
                username,
                since_ms: YesterdayMs(),
                priority: 1000
            })
        }

        this.on_job_queue_changed()
        this.kick()
    }

    async run() {

        if (this.syncing) return
        this.syncing = true


        let job = this.jobs[this.jobs.length - 1]

        try {

            if (job) {
                await this.do_work(job.username, job.since_ms)
                job.priority = 0
            }

        } catch (error) {
            console.error("Sync failed:", error)
        } finally {

            if (job) {
                job.priority = Math.max(0, job.priority - 333)
                this.on_job_queue_changed()
            }

            this.syncing = false
            if (this.should_sync_fast) {
                this.should_sync_fast = false
                this.queueNextRun(500)
            } else {
                this.queueNextRun(this.SYNC_INTERVAL_MS)
            }
        }
    }

    kick() {
        this.clearTimer()
        this.should_sync_fast = true

        if (this.syncing) return

        this.queueNextRun(500)
    }

    private clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
    }

    private queueNextRun(delayMs: number) {
        this.clearTimer()
        this.timer = setTimeout(() => {
            this.run()
        }, delayMs)
    }

    on_job_queue_changed() {
        // 2 3 1000
        this.jobs.sort((a, b) => a.priority - b.priority)
        this.jobs.splice(0, 1000)
    }
}