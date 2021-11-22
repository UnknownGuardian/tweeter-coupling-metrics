import { Event, metronome, ServiceQueue, Worker } from "@byu-se/quartermaster";


type Item = { callback: Function, event: Event };

/**
 * A queue that allows long polling, emulating SQS
 * 
 * Specific behavior:
 * 
 * If there are no items in queue:
 *    shrink number of workers until there is only 1.
 * 
 * If there are items in queue:
 *    assign the first 0-10 to a free worker as soon as one is available
 *    if there is only one worker, after the fifth batch read, start scaling up instances
 * 
 * TODO: Care about scaling down.
 */
export class LongPollFIFOQueue implements ServiceQueue {
  public readonly items: Item[] = [];
  private workers: SQSWorker[] = [];
  private capacity: number = 0;


  private batchSize: number = 10;
  private sequentialCallsWithEvents: number = 0;
  private lastScaleUpAt: number = 0; // scale at a rate of 1 per second

  constructor(capacity: number) {
    this.setCapacity(capacity);
    this.setNumWorkers(1);

    metronome.setTimeout(() => {
      console.log("QUEUE DATA", this.items.length, this.workers.length);
    }, 2000);
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
        this.workers.push(new SQSWorker(this));
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

  // triggered by 
  // 1) a new worker creation (no work ever having been performed)
  // 2) an existing worker wants work (already performed work)
  work(): void {
    if (!this.hasFreeWorker()) {
      // in theory impossible
      throw "why is this being called";
      this.sequentialCallsWithEvents = 0;
      return;
    }

    if (!this.hasWorkToDo()) {
      // the worker doesn't have anything to do.
      this.sequentialCallsWithEvents = 0;
      //console.log("oof");
      return;
    }


    const nextUp: Item[] = this.items.splice(0, this.batchSize) as Item[]
    const worker = this.workers.find(w => w.event == null) as SQSWorker;
    this.assignWorkToWorker(worker, nextUp);

    this.sequentialCallsWithEvents++;
    if (this.sequentialCallsWithEvents > 5) {
      if (metronome.now() - this.lastScaleUpAt > 1_000) {
        this.lastScaleUpAt = metronome.now();

        console.log(`${metronome.now()} scaling up`);
        this.setNumWorkers(this.getNumWorkers() + 1);
      }
    }
  }

  private assignWorkToWorker(worker: SQSWorker, items: Item[]) {
    const events = items.map(x => x.event);

    const sqsEvent = new SQSEvent("sqs-event");
    sqsEvent.messages = events;

    worker.event = sqsEvent;

    /*// recently freed and being assigned again
    if (metronome.now() - worker.lastFreeTime < 2) {
      worker.sequentialCalls++;
    } else {
      worker.sequentialCalls = 0;
    }*/

    items.forEach(item => item.callback(null, worker));
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
    if (this.hasFreeWorker()) {
      const worker = this.workers.find(w => w.event == null) as SQSWorker;
      this.assignWorkToWorker(worker, [item]);
      return;
    }


    // defer to later by appending to the item queue
    if (this.canEnqueue()) {
      this.items.push(item);
      return;
    }

    //otherwise reject
    throw "fail"
  }
}

export class SQSEvent extends Event {
  private _messages: Event[] = [];
  private count: number = 0;

  public get messages(): Event[] {
    return this._messages;
  }
  public set messages(value: Event[]) {
    this._messages = value;
    this.count = this._messages.length
  }
}

export class SQSWorker extends Worker {
  /*public sequentialCalls = 0;
  public lastFreeTime = 0;

  public free() {
    this.lastFreeTime = metronome.now();
    super.free();
  }*/
}