import { Unit, type UnitProps, type TeachingContract } from '@synet/unit';
import type { IQueueAdapter, Job, JobOptions, JobHandler, JobStatus, QueueStats } from './types.js';

/**
 * Queue Unit configuration
 */
export interface QueueConfig {
  /** Queue adapter instance */
  adapter: IQueueAdapter;
  /** Queue description */
  description?: string;
}

/**
 * Queue Unit props
 */
export interface QueueProps extends UnitProps {
  adapter: IQueueAdapter;
  description: string;
}

/**
 * Queue Unit - Consciousness-based job queue architecture
 * 
 * A Unit that wraps queue adapters, providing consciousness-based
 * queue operations with teaching/learning capabilities.
 * 
 * Key Capabilities:
 * - Job queue operations (add, process, remove)
 * - Provider-agnostic through adapters
 * - Teaching queue capabilities to other units
 * - Learning job handlers from other units
 * - Runtime validation and error guidance
 * 
 * Example:
 * ```typescript
 * const memory = new MemoryQueueAdapter();
 * const queue = Queue.create({ adapter: memory });
 * 
 * // Process jobs
 * queue.process('email', async (job) => {
 *   console.log('Sending email:', job.data);
 * });
 * 
 * // Add jobs
 * await queue.add('email', { to: 'user@example.com' });
 * 
 * // Teach capabilities
 * const contract = queue.teach();
 * otherUnit.learn([contract]);
 * ```
 */
export class Queue extends Unit<QueueProps> {
  protected constructor(props: QueueProps) {
    super(props);
  }
  
  static create(config: QueueConfig): Queue {
    if (!config.adapter) {
      throw new Error('[Queue] Adapter is required - provide a queue adapter instance');
    }
    
    const props: QueueProps = {
      dna: {
        id: 'queue',
        version: '1.0.0',
      },
      adapter: config.adapter,
      description: config.description || `Queue Unit with ${config.adapter.name} adapter`,
    };
    
    return new Queue(props);
  }
  
  /**
   * Add a job to the queue
   */
  async add(type: string, data: Record<string, unknown>, options?: JobOptions): Promise<Job> {
    if (!type || typeof type !== 'string') {
      throw new Error(`[${this.dna.id}] Job type must be a non-empty string`);
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error(`[${this.dna.id}] Job data must be an object`);
    }
    
    try {
      return await this.props.adapter.add(type, data, options);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to add job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Process jobs of a specific type
   */
  process(type: string, handler: JobHandler): void {
    if (!type || typeof type !== 'string') {
      throw new Error(`[${this.dna.id}] Job type must be a non-empty string`);
    }
    
    if (!handler || typeof handler !== 'function') {
      throw new Error(`[${this.dna.id}] Job handler must be a function`);
    }
    
    this.props.adapter.process(type, handler);
  }
  
  /**
   * Remove a job from the queue
   */
  async remove(jobId: string): Promise<boolean> {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error(`[${this.dna.id}] Job ID must be a non-empty string`);
    }
    
    try {
      return await this.props.adapter.remove(jobId);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to remove job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error(`[${this.dna.id}] Job ID must be a non-empty string`);
    }
    
    try {
      return await this.props.adapter.getJob(jobId);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to get job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get jobs by status
   */
  async getJobs(status: JobStatus): Promise<Job[]> {
    const validStatuses: JobStatus[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`[${this.dna.id}] Invalid job status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    try {
      return await this.props.adapter.getJobs(status);
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to get jobs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    try {
      return await this.props.adapter.getStats();
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to get stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    try {
      await this.props.adapter.pause();
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to pause queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    try {
      await this.props.adapter.resume();
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to resume queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Close the queue and cleanup resources
   */
  async close(): Promise<void> {
    try {
      await this.props.adapter.close();
    } catch (error) {
      throw new Error(`[${this.dna.id}] Failed to close queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if queue is healthy/connected
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await this.props.adapter.isHealthy();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get current adapter info
   */
  getAdapter(): { name: string; config: Record<string, unknown> } {
    return {
      name: this.props.adapter.name,
      config: this.props.adapter.config,
    };
  }
  
  /**
   * Teach queue capabilities to other units
   */
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        add: async (...args: unknown[]) => {
          const [type, data, options] = args as [string, Record<string, unknown>, JobOptions?];
          return this.add(type, data, options);
        },
        process: (...args: unknown[]) => {
          const [type, handler] = args as [string, JobHandler];
          return this.process(type, handler);
        },
        remove: async (...args: unknown[]) => {
          const [jobId] = args as [string];
          return this.remove(jobId);
        },
        getJob: async (...args: unknown[]) => {
          const [jobId] = args as [string];
          return this.getJob(jobId);
        },
        getJobs: async (...args: unknown[]) => {
          const [status] = args as [JobStatus];
          return this.getJobs(status);
        },
        getStats: async (...args: unknown[]) => {
          return this.getStats();
        },
        pause: async (...args: unknown[]) => {
          return this.pause();
        },
        resume: async (...args: unknown[]) => {
          return this.resume();
        },
        close: async (...args: unknown[]) => {
          return this.close();
        },
        isHealthy: async (...args: unknown[]) => {
          return this.isHealthy();
        },
        getAdapter: (...args: unknown[]) => {
          return this.getAdapter();
        },
      }
    };
  }
  
  /**
   * Help documentation
   */
  help(): string {
    return `
Queue Unit v${this.dna.version} - ${this.props.description}

CAPABILITIES:
• add(type, data, options?) - Add job to queue
• process(type, handler) - Register job processor
• remove(jobId) - Remove job from queue
• getJob(jobId) - Get specific job
• getJobs(status) - Get jobs by status
• getStats() - Get queue statistics
• pause() - Pause queue processing
• resume() - Resume queue processing
• close() - Close queue and cleanup
• isHealthy() - Check queue health
• getAdapter() - Get adapter info

ADAPTER: ${this.props.adapter.name}
CONFIG: ${JSON.stringify(this.props.adapter.config, null, 2)}

EXAMPLE:
const queue = Queue.create({ adapter: new MemoryQueueAdapter() });

// Process jobs
queue.process('email', async (job) => {
  console.log('Processing:', job.data);
});

// Add jobs
await queue.add('email', { to: 'user@example.com' });

// Get stats
const stats = await queue.getStats();
console.log('Queue stats:', stats);

TEACHING:
const contract = queue.teach();
otherUnit.learn([contract]);

LEARNING:
// Queue units primarily compose rather than learn
// Job handlers can be learned from processor units
`;
  }
  
  /**
   * Unit identity
   */
  whoami(): string {
    return `Queue Unit (${this.props.adapter.name} adapter) - Job queue operations with consciousness-based architecture`;
  }
}
