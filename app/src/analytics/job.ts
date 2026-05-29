import { gen_id8 } from "../controller.js"
import { YesterdayMs } from "./time.js"

export type QPJId = string

export type QueryPlayerJob<T> = {
    id: QPJId
    username: string
    since_ms: number
    priority: number
    resolves: ((t: T[]) => void)[]
    rejects: ((err: unknown) => void)[]
}

export class QPJ_Manager<T> {
    private syncing = false

    jobs: QueryPlayerJob<T>[]
    private readonly SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 1 day MS
    private readonly MAX_QUEUE_SIZE = 1000

    constructor(private do_work: (username: string, since: number) => Promise<T[]>) {
        this.jobs = []

        setInterval(() => this.sweep(), this.SWEEP_INTERVAL_MS)
    }

    search_username(username: string) {
        let existing = this.jobs.find(_ => _.username === username)
        let res = new Promise<T[]>((resolve, reject) => {
            if (existing) {

                existing.priority += 1000
                existing.resolves.push(resolve)
                existing.rejects.push(reject)
            } else {
                this.jobs.push({
                    id: gen_id8(),
                    username,
                    since_ms: YesterdayMs(),
                    priority: 1000,
                    resolves: [resolve],
                    rejects: [reject]
                })
            }
        })

        this.on_job_queue_changed()
        this.kick()

        return res
    }

    async run() {

        if (this.syncing) return
        this.syncing = true

        while (this.jobs.length > 0) {
            let job = this.jobs[this.jobs.length - 1]

            if (effective_priority(job) < 500) {
                break
            }

            try {

                if (job) {
                    let startedAt = Date.now()
                    let res = await this.do_work(job.username, job.since_ms)
                    job.priority = 0
                    job.since_ms = startedAt

                    job.resolves.forEach(_ => _(res))
                    job.resolves = []
                    job.rejects = []
                }

            } catch (error) {
                console.error("Sync failed:", error)
                if (job) {
                    job.rejects.forEach(r => r(error))
                    job.rejects = []
                    job.resolves = []
                }
            } finally {
                if (job) {
                    job.priority = Math.max(0, job.priority - 333)
                    this.on_job_queue_changed()
                }
            }
        }

        this.syncing = false
    }


    private sweep() {
        for (let job of this.jobs) {
            job.priority += 1000
        }
        this.on_job_queue_changed()
    }

    kick() {
        if (!this.syncing) {
            void this.run()
        }
    }

    on_job_queue_changed() {
        // 2 3 1000
        this.jobs.sort((a, b) => effective_priority(a)- effective_priority(b))

        if (this.jobs.length > this.MAX_QUEUE_SIZE) {

            let deleted = this.jobs.splice(0, this.jobs.length - this.MAX_QUEUE_SIZE)

            for (let d of deleted) {
                d.rejects.forEach(reject => reject(new JobTimeoutError()))
            }
        }
    }
}

const HOUR_MS = 60 * 60 * 1000
const effective_priority = <T>(a: QueryPlayerJob<T>) => a.priority + (Date.now() - a.since_ms) / HOUR_MS

export class JobTimeoutError extends Error {}