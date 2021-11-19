import { Event, metronome, ServiceQueue, Worker } from "@byu-se/quartermaster";


type Item = { callback: Function, event: Event };

/**
 * A queue that allows long polling, emulating SQS
 */
export class LongPollFIFOQueue implements ServiceQueue {
  public readonly items: Item[] = [];
  private workers: Worker[] = [];
  private capacity: number = 0;

  constructor(capacity: number) {
    this.setCapacity(capacity);
    this.setNumWorkers(1);

    metronome.setInterval(() => {

    })
  }

  async enqueue(event: Event): Promise<Worker> {
    return new Promise<Worker>((resolve, reject) => {
      const callback = (err: any, data: Worker) => {
        if (err)
          reject(err);
        else
          resolve(data);
      }
      this.add({ event, callback });
    })
  }

  length(): number {
    return this.items.length;
  }
  setCapacity(capacity: number): void {
    this.capacity = Math.floor(capacity);
  }
  getCapacity(): number {
    return this.capacity;
  }


  working(): number {
    return this.workers.filter(w => w.event != null).length;
  }

  /**
   * Sets the number of workers. If more than there are currently, add new 
   * Workers. If less than there are currently, just drop some from the pool,
   * while allowing those workers to process whatever work they have remaining
   * @param num A positive integer representing then new amount of workers
   */
  setNumWorkers(num: number): void {

    num = Math.max(0, Math.floor(num));

    if (num > this.workers.length) {
      while (this.workers.length < num) {
        this.workers.push(new Worker(this));
        this.work();
      }
    } else {
      // This really just depends on garbage collection implementation. For
      // some gc, we have to explicitly destroy reference to the queue in the
      // worker
      for (let i = num; i < this.workers.length; i++) {
        this.workers[i].destroy();
      }
      this.workers.length = num;
    }
  }
  getNumWorkers(): number {
    return this.workers.length
  }


  isFull(): boolean {
    return !this.canEnqueue() && !this.hasFreeWorker()
  }
  canEnqueue(): boolean {
    return this.items.length < this.capacity;
  }
  hasFreeWorker(): boolean {
    return this.workers.some(w => w.event == null);
  }


  work(): void {
    if (!this.hasFreeWorker())
      return;

    if (!this.hasWorkToDo())
      return;

    const nextUp: Item = this.items.shift() as Item
    const worker = this.workers.find(w => w.event == null) as Worker;
    this.assignWorkToWorker(worker, nextUp);
  }

  private assignWorkToWorker(worker: Worker, item: Item) {
    worker.event = item.event;
    item.callback(null, worker);
  }

  private hasWorkToDo(): boolean {
    return this.items.length > 0;
  }

  /**
   * This function exists since its clean, preserving other functions which
   * would need corrections if a "hacky" way (such as using the items array 
   * to deliver immediate work to the workers, which was really tempting)
   * @param item 
   * @returns 
   */
  private add(item: Item): void {
    // process immediately by assigning a free worker
    /*if (this.hasFreeWorker()) {
      const worker = this.workers.find(w => w.event == null) as Worker;
      this.assignWorkToWorker(worker, item);
      return;
    }*/

    // defer to later by appending to the item queue
    if (this.canEnqueue()) {
      this.items.push(item);
      //this.work();
      return;
    }

    //otherwise reject
    throw "fail"
  }
}

class SQSWorker extends Worker {
  /**
   * Unlocks the worker to be freed, so it can process another event on the
   * queue, if it is still attached to one.
   */
  public free() {
    this.event = null;
    if (this.queue)
      this.queue.work();
  }
}