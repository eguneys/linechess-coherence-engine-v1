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

    private immediate_sync_request = false

    jobs: QueryPlayerJob[]

    constructor(private on_work_username_since: (username: string, since: number) => Promise<void>) {
        this.jobs = []
    }

    search_username(username: string) {
        let existing = this.jobs.find(_ => _.username === username)
        if (existing) {

            existing.priority += 1000

            this.jobs.push(existing)
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

    async work_one_step() {

        if (this.syncing) return
        this.syncing = true


        let job = this.jobs[this.jobs.length - 1]

        try {

            if (job) {
                await this.on_work_username_since(job.username, job.since_ms)
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
            if (this.immediate_sync_request) {
                this.immediate_sync_request = false
                this.queueNextRun(500)
            } else {
                this.queueNextRun(this.SYNC_INTERVAL_MS)
            }
        }
    }

    kick() {
        this.clearTimer()
        this.immediate_sync_request = true

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
            this.work_one_step()
        }, delayMs)
    }

    on_job_queue_changed() {
        // 2 3 1000
        this.jobs.sort((a, b) => a.priority - b.priority)
    }
}