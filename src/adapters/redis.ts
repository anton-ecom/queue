import type { IQueueAdapter, Job, JobOptions, JobHandler, JobStatus, QueueStats } from '../types.js';

/**
 * Redis queue adapter configuration
 */
export interface RedisQueueConfig {
  /** Redis connection URL */
  url?: string;
  /** Redis host */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number */
  db?: number;
  /** Queue name prefix */
  prefix?: string;
  /** Maximum number of concurrent jobs */
  concurrency?: number;
  /** Default job timeout in milliseconds */
  defaultTimeout?: number;
}

/**
 * Redis queue adapter
 * Production-ready queue with persistence and distributed processing
 * 
 * Note: This is a minimal Redis implementation for demonstration.
 * In production, consider using Bull/BullMQ for advanced features.
 */
export class RedisQueueAdapter implements IQueueAdapter {
  readonly name = 'redis';
  readonly config: Record<string, unknown>;
  
  private queueConfig: RedisQueueConfig;
  private redis: any; // Would be Redis client in real implementation
  private handlers = new Map<string, JobHandler>();
  private processing = new Set<string>();
  private isPaused = false;
  private isRunning = true;
  private processingInterval?: NodeJS.Timeout;
  
  constructor(config: RedisQueueConfig = {}) {
    this.queueConfig = {
      host: 'localhost',
      port: 6379,
      prefix: 'queue',
      concurrency: 1,
      defaultTimeout: 30000,
      ...config,
    };
    this.config = { ...this.queueConfig };
    
    // Initialize Redis connection (mock for now)
    this.initializeRedis();
    
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
    
    // Store job in Redis hash
    const jobKey = `${this.queueConfig.prefix}:job:${job.id}`;
    await this.setHash(jobKey, this.serializeJob(job));
    
    // Add to appropriate queue
    if (job.delay && job.delay > 0) {
      const score = Date.now() + job.delay;
      await this.addToSortedSet(`${this.queueConfig.prefix}:delayed`, job.id, score);
    } else {
      await this.pushToList(`${this.queueConfig.prefix}:waiting:${type}`, job.id);
    }
    
    return job;
  }
  
  process(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }
  
  async remove(jobId: string): Promise<boolean> {
    const jobKey = `${this.queueConfig.prefix}:job:${jobId}`;
    const result = await this.deleteKey(jobKey);
    
    // Remove from all possible queues (brute force approach for simplicity)
    for (const handler of this.handlers.keys()) {
      await this.removeFromList(`${this.queueConfig.prefix}:waiting:${handler}`, jobId);
    }
    await this.removeFromSortedSet(`${this.queueConfig.prefix}:delayed`, jobId);
    await this.removeFromSortedSet(`${this.queueConfig.prefix}:active`, jobId);
    
    return result > 0;
  }
  
  async getJob(jobId: string): Promise<Job | null> {
    const jobKey = `${this.queueConfig.prefix}:job:${jobId}`;
    const jobData = await this.getHash(jobKey);
    
    if (!jobData || Object.keys(jobData).length === 0) {
      return null;
    }
    
    return this.deserializeJob(jobData);
  }
  
  async getJobs(status: JobStatus): Promise<Job[]> {
    const jobs: Job[] = [];
    
    // Get job IDs based on status
    let jobIds: string[] = [];
    
    switch (status) {
      case 'waiting':
        // Get from all waiting queues
        for (const type of this.handlers.keys()) {
          const ids = await this.getList(`${this.queueConfig.prefix}:waiting:${type}`);
          jobIds.push(...ids);
        }
        break;
      case 'delayed':
        jobIds = await this.getSortedSetMembers(`${this.queueConfig.prefix}:delayed`);
        break;
      case 'active':
        jobIds = await this.getSortedSetMembers(`${this.queueConfig.prefix}:active`);
        break;
      case 'completed':
        jobIds = await this.getSortedSetMembers(`${this.queueConfig.prefix}:completed`);
        break;
      case 'failed':
        jobIds = await this.getSortedSetMembers(`${this.queueConfig.prefix}:failed`);
        break;
    }
    
    // Fetch job data
    for (const jobId of jobIds) {
      const job = await this.getJob(jobId);
      if (job) {
        jobs.push(job);
      }
    }
    
    return jobs;
  }
  
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.getQueueSize('waiting'),
      this.getSortedSetSize(`${this.queueConfig.prefix}:active`),
      this.getSortedSetSize(`${this.queueConfig.prefix}:completed`),
      this.getSortedSetSize(`${this.queueConfig.prefix}:failed`),
      this.getSortedSetSize(`${this.queueConfig.prefix}:delayed`),
    ]);
    
    return { waiting, active, completed, failed, delayed };
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
    if (this.redis && this.redis.disconnect) {
      await this.redis.disconnect();
    }
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      // In real implementation, ping Redis
      return this.isRunning && this.redis !== null;
    } catch {
      return false;
    }
  }
  
  /**
   * Initialize Redis connection (mock implementation)
   */
  private initializeRedis(): void {
    // Mock Redis client for demonstration
    // In real implementation: this.redis = new Redis(this.queueConfig);
    this.redis = {
      connected: true,
      // Mock storage
      data: new Map<string, any>(),
      lists: new Map<string, string[]>(),
      sortedSets: new Map<string, Map<string, number>>(),
    };
  }
  
  /**
   * Start the job processing loop
   */
  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isPaused && this.isRunning) {
        this.processDelayedJobs();
        this.processNextJob();
      }
    }, 1000); // Check every second
  }
  
  /**
   * Move delayed jobs to waiting queue when ready
   */
  private async processDelayedJobs(): Promise<void> {
    const now = Date.now();
    const delayedKey = `${this.queueConfig.prefix}:delayed`;
    
    // Get jobs ready to be processed
    const readyJobs = await this.getSortedSetByScore(delayedKey, 0, now);
    
    for (const jobId of readyJobs) {
      const job = await this.getJob(jobId);
      if (job) {
        // Move to waiting queue
        await this.removeFromSortedSet(delayedKey, jobId);
        await this.pushToList(`${this.queueConfig.prefix}:waiting:${job.type}`, jobId);
      }
    }
  }
  
  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    // Don't exceed concurrency
    if (this.processing.size >= (this.queueConfig.concurrency || 1)) {
      return;
    }
    
    // Try to get a job from any waiting queue
    for (const [type, handler] of this.handlers.entries()) {
      const waitingKey = `${this.queueConfig.prefix}:waiting:${type}`;
      const jobId = await this.popFromList(waitingKey);
      
      if (jobId) {
        await this.processJob(jobId, handler);
        break; // Process one job at a time
      }
    }
  }
  
  /**
   * Process a specific job
   */
  private async processJob(jobId: string, handler: JobHandler): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    
    // Mark as active
    this.processing.add(jobId);
    const activeKey = `${this.queueConfig.prefix}:active`;
    await this.addToSortedSet(activeKey, jobId, Date.now());
    
    // Update job
    job.processedAt = new Date();
    job.attempts = (job.attempts || 0) + 1;
    await this.updateJob(job);
    
    try {
      await handler(job);
      
      // Mark as completed
      job.completedAt = new Date();
      await this.updateJob(job);
      await this.removeFromSortedSet(activeKey, jobId);
      await this.addToSortedSet(`${this.queueConfig.prefix}:completed`, jobId, Date.now());
    } catch (error) {
      // Mark as failed
      job.failedReason = error instanceof Error ? error.message : String(error);
      await this.updateJob(job);
      await this.removeFromSortedSet(activeKey, jobId);
      await this.addToSortedSet(`${this.queueConfig.prefix}:failed`, jobId, Date.now());
    } finally {
      this.processing.delete(jobId);
    }
  }
  
  /**
   * Update job in Redis
   */
  private async updateJob(job: Job): Promise<void> {
    const jobKey = `${this.queueConfig.prefix}:job:${job.id}`;
    await this.setHash(jobKey, this.serializeJob(job));
  }
  
  /**
   * Serialize job for Redis storage
   */
  private serializeJob(job: Job): Record<string, string> {
    return {
      id: job.id,
      type: job.type,
      data: JSON.stringify(job.data),
      attempts: String(job.attempts || 0),
      delay: String(job.delay || 0),
      priority: String(job.priority || 0),
      createdAt: job.createdAt?.toISOString() || '',
      processedAt: job.processedAt?.toISOString() || '',
      completedAt: job.completedAt?.toISOString() || '',
      failedReason: job.failedReason || '',
    };
  }
  
  /**
   * Deserialize job from Redis storage
   */
  private deserializeJob(data: Record<string, string>): Job {
    return {
      id: data.id,
      type: data.type,
      data: JSON.parse(data.data || '{}'),
      attempts: parseInt(data.attempts || '0'),
      delay: parseInt(data.delay || '0'),
      priority: parseInt(data.priority || '0'),
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      failedReason: data.failedReason || undefined,
    };
  }
  
  /**
   * Generate a unique job ID
   */
  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Mock Redis operations (in real implementation, these would use actual Redis client)
  private async setHash(key: string, value: Record<string, string>): Promise<void> {
    this.redis.data.set(key, value);
  }
  
  private async getHash(key: string): Promise<Record<string, string>> {
    return this.redis.data.get(key) || {};
  }
  
  private async deleteKey(key: string): Promise<number> {
    const existed = this.redis.data.has(key);
    this.redis.data.delete(key);
    return existed ? 1 : 0;
  }
  
  private async pushToList(key: string, value: string): Promise<void> {
    if (!this.redis.lists.has(key)) {
      this.redis.lists.set(key, []);
    }
    this.redis.lists.get(key)!.push(value);
  }
  
  private async popFromList(key: string): Promise<string | null> {
    const list = this.redis.lists.get(key);
    return list && list.length > 0 ? list.shift()! : null;
  }
  
  private async getList(key: string): Promise<string[]> {
    return this.redis.lists.get(key) || [];
  }
  
  private async removeFromList(key: string, value: string): Promise<void> {
    const list = this.redis.lists.get(key);
    if (list) {
      const index = list.indexOf(value);
      if (index > -1) {
        list.splice(index, 1);
      }
    }
  }
  
  private async addToSortedSet(key: string, member: string, score: number): Promise<void> {
    if (!this.redis.sortedSets.has(key)) {
      this.redis.sortedSets.set(key, new Map());
    }
    this.redis.sortedSets.get(key)!.set(member, score);
  }
  
  private async removeFromSortedSet(key: string, member: string): Promise<void> {
    const sortedSet = this.redis.sortedSets.get(key);
    if (sortedSet) {
      sortedSet.delete(member);
    }
  }
  
  private async getSortedSetMembers(key: string): Promise<string[]> {
    const sortedSet = this.redis.sortedSets.get(key);
    return sortedSet ? Array.from(sortedSet.keys()) : [];
  }
  
  private async getSortedSetSize(key: string): Promise<number> {
    const sortedSet = this.redis.sortedSets.get(key);
    return sortedSet ? sortedSet.size : 0;
  }
  
  private async getSortedSetByScore(key: string, min: number, max: number): Promise<string[]> {
    const sortedSet = this.redis.sortedSets.get(key);
    if (!sortedSet) return [];
    
    const entries = Array.from(sortedSet.entries()) as [string, number][];
    return entries
      .filter(([, score]) => score >= min && score <= max)
      .map(([member]) => member);
  }
  
  private async getQueueSize(status: string): Promise<number> {
    let total = 0;
    for (const type of this.handlers.keys()) {
      const list = this.redis.lists.get(`${this.queueConfig.prefix}:${status}:${type}`);
      total += list ? list.length : 0;
    }
    return total;
  }
}
