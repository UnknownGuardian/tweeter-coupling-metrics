import { Event, metronome, Stage, WrappedStage } from "@byu-se/quartermaster";
import { DynamoDB } from "./DynamoDB";
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
    public innerEvents:Event[] = [];
}


export class AddToFeedHandler extends Lambda {
    constructor(
        public feedTable:DynamoDB, 
    ) { super(); }

    async workOn(event: WriteToFollowersEvent): Promise<void> {
        await this.feedTable.accept(event);
    }
}

export class GetFollowersHandler extends Lambda {
    constructor(
        public followsTable:DynamoDB, 
        public addToFeedQueue:SQS
    ) { super(); }

    /**
     * Read from follows Table
     * Generate 10k events
     * prep batches of 25, add batches to queue
     */
    async workOn(event: Event): Promise<void> {
        await this.followsTable.accept(event);

        const eventsToCreate = 10_000;
        const events = [];
        for(let i = 0; i < eventsToCreate; i++) {
            events.push(new Event(event.key + ":follow:" + i));
        }

        const batchSize = 25;
        while(events.length > 0) {
            const batch = events.splice(0, batchSize);
            const queueEvent = new WriteToFollowersEvent(event.key + ":batch:");
            queueEvent.innerEvents.push(...batch);

            await this.addToFeedQueue.accept(queueEvent);
        }
    }
}

export class PostHandler extends Lambda {
    constructor(
        public authTable:DynamoDB, 
        public storyTable:DynamoDB,
        public getFollowersQueue:SQS
    ) { super(); }

    async workOn(event: Event): Promise<void> {
        await this.authTable.accept(event);
        await this.storyTable.accept(event);
        await this.getFollowersQueue.accept(event);
    }
}