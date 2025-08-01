/**
 * Core job interface for queue operations
 * Simple, extensible interface that covers most queue use cases
 */
export interface Job {
  /** Unique job identifier */
  id: string;
  /** Job type/name for processing routing */
  type: string;
  /** Job payload data */
  data: Record<string, unknown>;
  /** Number of processing attempts */
  attempts?: number;
  /** Delay before job becomes available (milliseconds) */
  delay?: number;
  /** Job priority (higher = more important) */
  priority?: number;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Job processing timestamp */
  processedAt?: Date;
  /** Job completion timestamp */
  completedAt?: Date;
  /** Job failure reason */
  failedReason?: string;
}

/**
 * Job creation options
 */
export interface JobOptions {
  /** Job priority (higher = more important) */
  priority?: number;
  /** Delay before job becomes available (milliseconds) */
  delay?: number;
  /** Maximum number of retry attempts */
  attempts?: number;
  /** Job timeout (milliseconds) */
  timeout?: number;
  /** Remove job on completion */
  removeOnComplete?: boolean;
  /** Remove job on failure */
  removeOnFail?: boolean;
}

/**
 * Job processing handler function
 */
export type JobHandler = (job: Job) => Promise<void>;

/**
 * Job status types
 */
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

/**
 * Queue statistics
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Core queue interface - provider-agnostic contract
 * All queue adapters must implement this interface
 */
export interface IQueue {
  /**
   * Add a job to the queue
   */
  add(type: string, data: Record<string, unknown>, options?: JobOptions): Promise<Job>;
  
  /**
   * Process jobs of a specific type
   */
  process(type: string, handler: JobHandler): void;
  
  /**
   * Remove a job from the queue
   */
  remove(jobId: string): Promise<boolean>;
  
  /**
   * Get a specific job by ID
   */
  getJob(jobId: string): Promise<Job | null>;
  
  /**
   * Get jobs by status
   */
  getJobs(status: JobStatus): Promise<Job[]>;
  
  /**
   * Get queue statistics
   */
  getStats(): Promise<QueueStats>;
  
  /**
   * Pause the queue
   */
  pause(): Promise<void>;
  
  /**
   * Resume the queue
   */
  resume(): Promise<void>;
  
  /**
   * Close the queue and cleanup resources
   */
  close(): Promise<void>;
  
  /**
   * Check if queue is healthy/connected
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Queue adapter interface - what adapters must implement
 * This separates the adapter pattern from the core queue interface
 */
export interface IQueueAdapter extends IQueue {
  /** Adapter name for identification */
  readonly name: string;
  /** Adapter configuration */
  readonly config: Record<string, unknown>;
}
