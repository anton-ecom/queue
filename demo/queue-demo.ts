/**
 * Queue Unit Demo - Adapter-first Architecture
 * 
 * Demonstrates the consciousness-based queue system with both
 * Memory and Redis adapters, showcasing the Unit Architecture
 * teaching/learning paradigm.
 */

import { Queue, MemoryQueueAdapter, RedisQueueAdapter } from '../src/index.js';
import type { Job } from '../src/types.js';

async function main() {
  console.log('🚀 Queue Unit Demo - Adapter-first Architecture\n');

  // Demo 1: Memory Queue
  console.log('📦 Memory Queue Demo');
  console.log('==================');
  
  const memoryAdapter = new MemoryQueueAdapter({ concurrency: 2 });
  const memoryQueue = Queue.create({ 
    adapter: memoryAdapter,
    description: 'Demo memory queue for rapid development'
  });

  console.log('✅ Memory queue created:', memoryQueue.whoami());
  
  // Set up email processor
  memoryQueue.process('email', async (job: Job) => {
    console.log(`📧 Processing email job ${job.id}:`, job.data);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    console.log(`✅ Email sent to ${job.data.to}`);
  });

  // Set up notification processor  
  memoryQueue.process('notification', async (job: Job) => {
    console.log(`🔔 Processing notification job ${job.id}:`, job.data);
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
    console.log(`✅ Notification sent: ${job.data.message}`);
  });

  // Add some jobs
  await memoryQueue.add('email', { to: 'user@example.com', subject: 'Welcome!' });
  await memoryQueue.add('notification', { message: 'Your order is ready', userId: 123 });
  await memoryQueue.add('email', { to: 'admin@example.com', subject: 'Daily Report' });
  
  // Add priority job
  await memoryQueue.add('email', 
    { to: 'urgent@example.com', subject: 'URGENT!' }, 
    { priority: 10 }
  );

  // Add delayed job
  await memoryQueue.add('notification', 
    { message: 'Delayed notification', userId: 456 }, 
    { delay: 200 }
  );

  console.log('📊 Initial stats:', await memoryQueue.getStats());

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('📊 Final stats:', await memoryQueue.getStats());
  console.log('');

  // Demo 2: Redis Queue (Mock)
  console.log('🗄️  Redis Queue Demo');
  console.log('==================');
  
  const redisAdapter = new RedisQueueAdapter({ 
    host: 'localhost', 
    port: 6379,
    prefix: 'demo'
  });
  const redisQueue = Queue.create({ 
    adapter: redisAdapter,
    description: 'Demo Redis queue for production scaling'
  });

  console.log('✅ Redis queue created:', redisQueue.whoami());
  console.log('⚙️  Redis config:', redisQueue.getAdapter().config);
  
  // Set up processor
  redisQueue.process('data-processing', async (job: Job) => {
    console.log(`🔄 Processing data job ${job.id}:`, job.data);
    await new Promise(resolve => setTimeout(resolve, 150));
    console.log(`✅ Data processed for batch ${job.data.batchId}`);
  });

  // Add jobs
  await redisQueue.add('data-processing', { batchId: 'batch-001', records: 1000 });
  await redisQueue.add('data-processing', { batchId: 'batch-002', records: 500 });

  console.log('📊 Redis stats:', await redisQueue.getStats());

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 400));
  
  console.log('📊 Redis final stats:', await redisQueue.getStats());
  console.log('');

  // Demo 3: Unit Architecture - Teaching/Learning
  console.log('🧠 Unit Architecture Demo');
  console.log('=========================');
  
  // Create a simple unit that can learn queue capabilities
  class WorkerUnit {
    private capabilities = new Map<string, (...args: unknown[]) => unknown>();
    
    learn(contracts: Array<{ unitId: string; capabilities: Record<string, (...args: unknown[]) => unknown> }>) {
      for (const contract of contracts) {
        for (const [name, capability] of Object.entries(contract.capabilities)) {
          this.capabilities.set(`${contract.unitId}.${name}`, capability);
        }
      }
    }
    
    can(capability: string): boolean {
      return this.capabilities.has(capability);
    }
    
    async execute(capability: string, ...args: unknown[]): Promise<unknown> {
      const cap = this.capabilities.get(capability);
      if (!cap) {
        throw new Error(`Unknown capability: ${capability}`);
      }
      return cap(...args);
    }
  }

  const worker = new WorkerUnit();
  
  // Teach queue capabilities to worker
  const queueContract = memoryQueue.teach();
  worker.learn([queueContract]);
  
  console.log('✅ Worker learned queue capabilities');
  console.log('🔍 Can add jobs?', worker.can('queue.add'));
  console.log('🔍 Can get stats?', worker.can('queue.getStats'));
  
  // Worker can now operate the queue
  await worker.execute('queue.add', 'worker-job', { message: 'Job from worker unit!' });
  const stats = await worker.execute('queue.getStats') as any;
  console.log('📊 Stats from worker:', stats);
  console.log('');

  // Demo 4: Error Handling
  console.log('⚠️  Error Handling Demo');
  console.log('======================');
  
  try {
    await memoryQueue.add('', { data: 'invalid' });
  } catch (error) {
    console.log('❌ Caught validation error:', (error as Error).message);
  }

  try {
    await memoryQueue.getJobs('invalid' as any);
  } catch (error) {
    console.log('❌ Caught status error:', (error as Error).message);
  }

  // Demo help system
  console.log('');
  console.log('📚 Help System');
  console.log('==============');
  console.log(memoryQueue.help());

  // Cleanup
  await memoryQueue.close();
  await redisQueue.close();
  
  console.log('🎉 Demo completed successfully!');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
