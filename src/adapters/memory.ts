import type { IQueueAdapter, Job, JobOptions, JobHandler, JobStatus, QueueStats } from '../types.js';

/**
 * Memory queue adapter configuration
 */
export interface MemoryQueueConfig {
  /** Queue name */
  name?: string;
  /** Maximum number of concurrent jobs */
  concurrency?: number;
  /** Default job timeout in milliseconds */
  defaultTimeout?: number;
}

/**
 * In-memory queue adapter
 * Perfect for development, testing, and single-instance applications
 */
export class MemoryQueueAdapter implements IQueueAdapter {
  readonly name = 'memory';
  readonly config: Record<string, unknown>;
  
  private jobs = new Map<string, Job>();
  private handlers = new Map<string, JobHandler>();
  private processing = new Set<string>();
  private isPaused = false;
  private isRunning = true;
  private processingInterval?: NodeJS.Timeout;
  private queueConfig: MemoryQueueConfig;
  
  constructor(config: MemoryQueueConfig = {}) {
    this.queueConfig = {
      name: 'default',
      concurrency: 1,
      defaultTimeout: 30000,
      ...config,
    };
    this.config = { ...this.queueConfig };
    
    // Start processing loop
    this.startProcessingLoop();
  }
  
  async add(type: string, data: Record<string, unknown>, options: JobOptions = {}): Promise<Job> {
    const job: Job = {
      id: this.generateId(),
      type,
      data,
      attempts: 0,
      delay: options.delay || 0,
      priority: options.priority || 0,
      createdAt: new Date(),
    };
    
    this.jobs.set(job.id, job);
    return job;
  }
  
  process(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }
  
  async remove(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }
  
  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }
  
  async getJobs(status: JobStatus): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    return jobs.filter(job => this.getJobStatus(job) === status);
  }
  
  async getStats(): Promise<QueueStats> {
    const jobs = Array.from(this.jobs.values());
    return {
      waiting: jobs.filter(job => this.getJobStatus(job) === 'waiting').length,
      active: jobs.filter(job => this.getJobStatus(job) === 'active').length,
      completed: jobs.filter(job => this.getJobStatus(job) === 'completed').length,
      failed: jobs.filter(job => this.getJobStatus(job) === 'failed').length,
      delayed: jobs.filter(job => this.getJobStatus(job) === 'delayed').length,
    };
  }
  
  async pause(): Promise<void> {
    this.isPaused = true;
  }
  
  async resume(): Promise<void> {
    this.isPaused = false;
  }
  
  async close(): Promise<void> {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.jobs.clear();
    this.handlers.clear();
    this.processing.clear();
  }
  
  async isHealthy(): Promise<boolean> {
    return this.isRunning;
  }
  
  /**
   * Get job status based on current state
   */
  private getJobStatus(job: Job): JobStatus {
    if (job.failedReason) return 'failed';
    if (job.completedAt) return 'completed';
    if (this.processing.has(job.id)) return 'active';
    if (job.delay && job.delay > 0 && Date.now() - (job.createdAt?.getTime() || 0) < job.delay) {
      return 'delayed';
    }
    return 'waiting';
  }
  
  /**
   * Start the job processing loop
   */
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isPaused && this.isRunning) {
        this.processNextJob();
      }
    }, 100); // Check every 100ms
  }
  
  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    // Don't exceed concurrency
    if (this.processing.size >= (this.queueConfig.concurrency || 1)) {
      return;
    }
    
    // Find next job to process
    const jobs = Array.from(this.jobs.values())
      .filter(job => this.getJobStatus(job) === 'waiting')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Higher priority first
    
    const nextJob = jobs[0];
    if (!nextJob) return;
    
    const handler = this.handlers.get(nextJob.type);
    if (!handler) return;
    
    // Mark as processing
    this.processing.add(nextJob.id);
    nextJob.processedAt = new Date();
    nextJob.attempts = (nextJob.attempts || 0) + 1;
    
    try {
      await handler(nextJob);
      nextJob.completedAt = new Date();
    } catch (error) {
      nextJob.failedReason = error instanceof Error ? error.message : String(error);
    } finally {
      this.processing.delete(nextJob.id);
    }
  }
  
  /**
   * Generate a unique job ID
   */
  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
