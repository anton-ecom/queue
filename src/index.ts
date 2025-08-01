/**
 * @synet/queue - Job queue operations with adapter-first architecture
 * 
 * A consciousness-based queue system that provides job queue operations
 * through pluggable adapters while maintaining Unit Architecture principles.
 * 
 * @author 0en
 * @version 1.0.0
 * @license [MIT](https://github.com/synthetism/synet/blob/main/LICENSE)
 */

// Core types and interfaces
export type {
  Job,
  JobOptions,
  JobHandler,
  JobStatus,
  QueueStats,
  IQueue,
  IQueueAdapter
} from './types.js';

// Queue Unit
export { Queue } from './queue.js';
export type { QueueConfig, QueueProps } from './queue.js';

// Built-in adapters
export { MemoryQueueAdapter } from './adapters/memory.js';
export type { MemoryQueueConfig } from './adapters/memory.js';

export { RedisQueueAdapter } from './adapters/redis.js';
export type { RedisQueueConfig } from './adapters/redis.js';

/**
 * Quick start examples:
 * 
 * ```typescript
 * import { Queue, MemoryQueueAdapter } from '@synet/queue';
 * 
 * // Create queue with memory adapter
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
 * // Get stats
 * const stats = await queue.getStats();
 * console.log('Queue stats:', stats);
 * ```
 * 
 * For Redis:
 * ```typescript
 * import { Queue, RedisQueueAdapter } from '@synet/queue';
 * 
 * const redis = new RedisQueueAdapter({ 
 *   host: 'localhost', 
 *   port: 6379 
 * });
 * const queue = Queue.create({ adapter: redis });
 * ```
 * 
 * Teaching capabilities:
 * ```typescript
 * const contract = queue.teach();
 * otherUnit.learn([contract]);
 * 
 * // Now otherUnit can execute queue operations
 * await otherUnit.execute('queue.add', 'email', { to: 'user@example.com' });
 * ```
 */
