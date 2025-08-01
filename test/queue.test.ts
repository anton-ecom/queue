import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Queue, MemoryQueueAdapter } from '../src/index.js';
import type { Job, JobHandler } from '../src/types.js';

describe('Queue Unit Tests', () => {
  
  describe('MemoryQueueAdapter', () => {
    let adapter: MemoryQueueAdapter;
    let queue: Queue;

    beforeEach(() => {
      adapter = new MemoryQueueAdapter();
      queue = Queue.create({ adapter });
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should create queue with memory adapter', () => {
      expect(queue).toBeDefined();
      expect(queue.whoami()).toContain('memory adapter');
      expect(queue.getAdapter().name).toBe('memory');
    });

    it('should add and process jobs', async () => {
      const processedJobs: Job[] = [];
      
      queue.process('test', async (job) => {
        processedJobs.push(job);
      });

      const job = await queue.add('test', { message: 'hello' });
      
      expect(job.id).toBeDefined();
      expect(job.type).toBe('test');
      expect(job.data).toEqual({ message: 'hello' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processedJobs).toHaveLength(1);
      expect(processedJobs[0].data).toEqual({ message: 'hello' });
    });

    it('should handle job options', async () => {
      const job = await queue.add('test', { data: 'test' }, {
        priority: 10,
        delay: 100,
        attempts: 3
      });

      expect(job.priority).toBe(10);
      expect(job.delay).toBe(100);
      expect(job.attempts).toBe(0); // Initial attempts
    });

    it('should get job by ID', async () => {
      const job = await queue.add('test', { data: 'test' });
      const retrieved = await queue.getJob(job.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(job.id);
      expect(retrieved!.data).toEqual({ data: 'test' });
    });

    it('should get jobs by status', async () => {
      await queue.add('test', { data: 'test1' });
      await queue.add('test', { data: 'test2' });
      
      const waitingJobs = await queue.getJobs('waiting');
      expect(waitingJobs).toHaveLength(2);
    });

    it('should get queue statistics', async () => {
      await queue.add('test', { data: 'test1' });
      await queue.add('test', { data: 'test2' });
      
      const stats = await queue.getStats();
      expect(stats.waiting).toBe(2);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should remove jobs', async () => {
      const job = await queue.add('test', { data: 'test' });
      const removed = await queue.remove(job.id);
      
      expect(removed).toBe(true);
      
      const retrieved = await queue.getJob(job.id);
      expect(retrieved).toBeNull();
    });

    it('should pause and resume processing', async () => {
      const processedJobs: Job[] = [];
      
      queue.process('test', async (job) => {
        processedJobs.push(job);
      });

      await queue.pause();
      await queue.add('test', { data: 'test' });
      
      // Wait and check no processing
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(processedJobs).toHaveLength(0);

      await queue.resume();
      
      // Wait for processing after resume
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(processedJobs).toHaveLength(1);
    });

    it('should handle job failures', async () => {
      const processedJobs: Job[] = [];
      const errorMessage = 'Test error';
      
      queue.process('test', async (job) => {
        processedJobs.push(job);
        throw new Error(errorMessage);
      });

      await queue.add('test', { data: 'test' });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const failedJobs = await queue.getJobs('failed');
      expect(failedJobs).toHaveLength(1);
      expect(failedJobs[0].failedReason).toBe(errorMessage);
    });

    it('should handle delayed jobs', async () => {
      const processedJobs: Job[] = [];
      
      queue.process('test', async (job) => {
        processedJobs.push(job);
      });

      await queue.add('test', { data: 'test' }, { delay: 150 });
      
      // Check no immediate processing
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(processedJobs).toHaveLength(0);
      
      const delayedJobs = await queue.getJobs('delayed');
      expect(delayedJobs).toHaveLength(1);
      
      // Wait for delay to pass
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(processedJobs).toHaveLength(1);
    });

    it('should check health status', async () => {
      const healthy = await queue.isHealthy();
      expect(healthy).toBe(true);
      
      await queue.close();
      
      const unhealthy = await queue.isHealthy();
      expect(unhealthy).toBe(false);
    });
  });

  describe('Queue Unit Architecture', () => {
    let queue: Queue;

    beforeEach(() => {
      const adapter = new MemoryQueueAdapter();
      queue = Queue.create({ adapter });
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should implement Unit interface', () => {
      expect(queue.whoami()).toBeDefined();
      expect(queue.help()).toBeDefined();
      expect(queue.teach()).toBeDefined();
    });

    it('should have proper DNA', () => {
      expect(queue.dna.id).toBe('queue');
      expect(queue.dna.version).toBe('1.0.0');
    });

    it('should teach capabilities', () => {
      const contract = queue.teach();
      
      expect(contract.unitId).toBe('queue');
      expect(contract.capabilities).toBeDefined();
      expect(contract.capabilities.add).toBeDefined();
      expect(contract.capabilities.process).toBeDefined();
      expect(contract.capabilities.getStats).toBeDefined();
    });

    it('should provide help documentation', () => {
      const help = queue.help();
      
      expect(help).toContain('Queue Unit');
      expect(help).toContain('CAPABILITIES');
      expect(help).toContain('add(');
      expect(help).toContain('process(');
      expect(help).toContain('EXAMPLE');
    });
  });

  describe('Error Handling', () => {
    let queue: Queue;

    beforeEach(() => {
      const adapter = new MemoryQueueAdapter();
      queue = Queue.create({ adapter });
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should validate job type', async () => {
      await expect(
        queue.add('', { data: 'test' })
      ).rejects.toThrow('Job type must be a non-empty string');
    });

    it('should validate job data', async () => {
      await expect(
        // @ts-expect-error Testing invalid data
        queue.add('test', null)
      ).rejects.toThrow('Job data must be an object');
    });

    it('should validate job ID for removal', async () => {
      await expect(
        queue.remove('')
      ).rejects.toThrow('Job ID must be a non-empty string');
    });

    it('should validate job status', async () => {
      await expect(
        // @ts-expect-error Testing invalid status
        queue.getJobs('invalid')
      ).rejects.toThrow('Invalid job status');
    });

    it('should handle adapter creation errors', () => {
      expect(() => {
        // @ts-expect-error Testing missing adapter
        Queue.create({});
      }).toThrow('Adapter is required');
    });
  });

  describe('Concurrency', () => {
    let queue: Queue;

    beforeEach(() => {
      const adapter = new MemoryQueueAdapter({ concurrency: 2 });
      queue = Queue.create({ adapter });
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should respect concurrency limits', async () => {
      const processedJobs: Job[] = [];
      const processing = new Set<string>();
      let maxConcurrent = 0;
      
      queue.process('test', async (job) => {
        processing.add(job.id);
        maxConcurrent = Math.max(maxConcurrent, processing.size);
        
        await new Promise(resolve => setTimeout(resolve, 150)); // Longer delay
        
        processing.delete(job.id);
        processedJobs.push(job);
      });

      // Add multiple jobs
      await Promise.all([
        queue.add('test', { id: 1 }),
        queue.add('test', { id: 2 }),
        queue.add('test', { id: 3 }),
        queue.add('test', { id: 4 }),
      ]);

      // Wait for processing with longer timeout
      await new Promise(resolve => setTimeout(resolve, 800));
      
      expect(processedJobs).toHaveLength(4);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('Priority Handling', () => {
    let queue: Queue;

    beforeEach(() => {
      const adapter = new MemoryQueueAdapter();
      queue = Queue.create({ adapter });
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should process higher priority jobs first', async () => {
      const processedOrder: number[] = [];
      
      queue.process('test', async (job) => {
        processedOrder.push(job.data.priority as number);
      });

      // Add jobs with different priorities
      await queue.add('test', { priority: 1 }, { priority: 1 });
      await queue.add('test', { priority: 3 }, { priority: 3 });
      await queue.add('test', { priority: 2 }, { priority: 2 });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(processedOrder).toEqual([3, 2, 1]);
    });
  });
});
