/**
 * @synet/queue - Job queue operations with adapter-first architecture
 * 
 * A consciousness-based queue system that provides job queue operations
 * through pluggable adapters while maintaining Unit Architecture principles.
 * 
 * @author 0en
 * @version 1.0.0
 * @license [MIT](https://github.com/synthetism/queue/blob/main/LICENSE)
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

