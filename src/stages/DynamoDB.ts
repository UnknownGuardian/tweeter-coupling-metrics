import { Event, metronome, normal, Stage } from "@byu-se/quartermaster";
import { WriteToFollowersEvent } from "./Lambda";

export class BatchWriteEvent extends Event {
    public numOperationsRequested: number = 1;
    public numOperationsFulfilled: number = 0;
}

export class DynamoDB extends Stage {
    protected usedCapacity: number = 0;
    protected maxCapacity: number = 1;
    protected averageLatency: number = 5;

    public tableDataLength: number = 0;

    public unusedCapacity:number = 0;

    constructor(
    ) {
        super();
        metronome.setInterval(() => this.resetCapacities(), 1000);
    }

    resetCapacities(): void {
        this.unusedCapacity += this.maxCapacity - this.usedCapacity;
        //console.log(this.constructor.name, "Using capacity", this.usedCapacity, "of", this.maxCapacity);
        this.usedCapacity = 0;//Math.max(this.usedCapacity - this.maxCapacity, 0);
    }


    async workOn(event: Event | BatchWriteEvent): Promise<void> {
        let requestedCapacity = event instanceof BatchWriteEvent ? (event.numOperationsRequested - event.numOperationsFulfilled) : 1;
        let availableCapacity = this.maxCapacity - this.usedCapacity;
        let grantedCapacity = requestedCapacity < availableCapacity ? requestedCapacity : availableCapacity;

        // if we are using some capacity, do the operation
        if (grantedCapacity > 0) {
            this.usedCapacity += grantedCapacity;
            this.tableDataLength += grantedCapacity;
            if (this.tableDataLength >= 10000) {
                console.log("XXXXXXXXXXXXXXXXX", metronome.now(), "feed table done")
            }
            await metronome.wait(normal(this.averageLatency, 1));
        }

        // let the callee know if it was a success or failure
        if (event instanceof BatchWriteEvent) {
            event.numOperationsFulfilled += grantedCapacity;
            if (event.numOperationsRequested > event.numOperationsFulfilled) {
                // still work to do
                throw "fail";
            }
        } else { // regular event
            if (grantedCapacity == 0)
                throw "fail"; // insufficient capacity
        }
    }
}

export class AuthTable extends DynamoDB { };
export class StoryTable extends DynamoDB { };

/**
 * Queries take longer
 */
export class FollowsTable extends DynamoDB {
    constructor() {
        super();
        this.averageLatency = 10;
    }
}
/**
 * BatchWrites take longer
 */
export class FeedTable extends DynamoDB {
    constructor() {
        super();
        this.averageLatency = 15;
        this.maxCapacity = 100;
        /*metronome.setInterval(() => {
            console.log(metronome.now(), this.constructor.name, "Used capacity", this.usedCapacity, "of", this.maxCapacity);
        }, 50);*/
    }


}