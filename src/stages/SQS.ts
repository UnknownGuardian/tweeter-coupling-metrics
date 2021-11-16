import { Event, FIFOServiceQueue, metronome, Stage, WrappedStage } from "@byu-se/quartermaster";

// An event representing a batch of N SQS messages.
export class SQSBatchEvent extends Event {
    public numSQSMessages:number = 0;
}


/**
 * Batches:
 * Pulls chunks of 10 lambdas off SQS
 * 
 * After 5 batches
 * if there are still messages, scale up an instance (capping at +60 instances/min)
 */
export abstract class SQS extends WrappedStage {
    protected lambdaInstances:number = 0;
    private recentEvents:Event[] = [];


    //Network Penalty (time)
    // Batch up incoming requests into chunks of 10
    async add(event: Event): Promise<void> {
        await metronome.wait(10);
        
        this.recentEvents.push(event);
        if(this.recentEvents.length > 10) {
            // immediately pass
        } 

        super.add(event);
    }
}

// Holds BatchEvents
export class AddToFeedQueue extends SQS {
    public currentBatch = [];

    constructor(protected wrapped:Stage) {
        super(wrapped);
        this.inQueue = new FIFOServiceQueue(Number.MAX_SAFE_INTEGER, 2);
    }
    async workOn(event: Event): Promise<void> {
        this.lambdaInstances++;
        try {
            await this.wrapped.accept(event)
        }   
        finally {
            this.lambdaInstances--;
        }
    }
}
export class GetFollowersQueue extends SQS {
    constructor(protected wrapped:Stage) {
        super(wrapped);
        this.inQueue = new FIFOServiceQueue(Number.MAX_SAFE_INTEGER, 100);
    }

    async workOn(event: Event): Promise<void> {
        this.lambdaInstances++;
        try {
            await this.wrapped.accept(event)
        }   
        finally {
            this.lambdaInstances--;
        }
    }
}