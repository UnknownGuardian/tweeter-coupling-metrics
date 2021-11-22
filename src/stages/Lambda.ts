import { Event, FIFOServiceQueue, metronome, Stage, WrappedStage } from "@byu-se/quartermaster";
import { BatchWriteEvent, DynamoDB } from "./DynamoDB";
import { LongPollFIFOQueue } from "./long-poll-fifo-queue";
import { SQS } from "./SQS";

export abstract class Lambda extends Stage {
    //Network Penalty (time)
    async add(event: Event): Promise<void> {
        await metronome.wait(10);
        super.add(event);
    }
}

// An event representing a batch of 25 feeds to be written to
export class WriteToFollowersEvent extends Event {
    public innerEvents: Event[] = [];
}


export class AddToFeedHandler extends Lambda {
    constructor(public feedTable: DynamoDB) {
        super();
        this.inQueue = new LongPollFIFOQueue(Infinity);
    }

    async workOn(event: WriteToFollowersEvent): Promise<void> {
        const copy = event.innerEvents.slice();
        while (copy.length > 0) {
            const subset = copy.splice(0, 25); // max 25 in a batch write

            const batchWriteEvent = new BatchWriteEvent(event.key + ":batchwrite");
            batchWriteEvent.numOperationsRequested = subset.length;

            // loop until we have capacity
            while (true) {

                if (!metronome.isRunning()) {
                    console.log("inner loop");
                    break;
                }
                try {
                    await this.feedTable.accept(batchWriteEvent)
                    console.log(`${metronome.now()} Wrote batch of ${batchWriteEvent.numOperationsRequested} successfully`);
                    break;
                } catch (e) {
                    /* insufficient capacity */
                    await metronome.wait(15);
                    //console.log(`${metronome.now()} Insufficient Capacity - ${batchWriteEvent.numOperationsFulfilled} / ${batchWriteEvent.numOperationsRequested}`)
                }
            }
        }
    }
}

export class GetFollowersHandler extends Lambda {
    constructor(
        public followsTable: DynamoDB,
        public addToFeedHandler: Lambda
    ) {
        super();
    }

    /**
     * Read from follows Table
     * Generate 10k events
     * prep batches of 25, add batches to queue
     */
    async workOn(event: Event): Promise<void> {
        await this.followsTable.accept(event);

        const eventsToCreate = 10_000;
        const events = [];
        for (let i = 0; i < eventsToCreate; i++) {
            events.push(new Event(event.key + ":follow:" + i));
        }

        const batchSize = 25;
        while (events.length > 0) {
            const batch = events.splice(0, batchSize);
            const queueEvent = new WriteToFollowersEvent(event.key + ":batch:");
            queueEvent.innerEvents.push(...batch);


            // non blocking
            this.addToFeedHandler.accept(queueEvent);
            await metronome.wait(2);

            //console.log("Added data to queue", this.addToFeedHandler.inQueue.length());
        }
    }
}

export class PostHandler extends Lambda {
    constructor(
        public authTable: DynamoDB,
        public storyTable: DynamoDB,
        public getFollowersHandler: Lambda,
        public simulationTerminationSignal: Promise<any>
    ) { super(); }

    async workOn(event: Event): Promise<void> {
        await this.authTable.accept(event);
        console.log("Cat 1");
        await this.storyTable.accept(event);
        console.log("Cat 2");
        await this.getFollowersHandler.accept(event);
        console.log("Cat 3");
        await this.simulationTerminationSignal;
        console.log("Cat 4");
    }
}