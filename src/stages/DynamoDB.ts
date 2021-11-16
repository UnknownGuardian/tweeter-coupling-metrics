import { Event, metronome, normal, Stage } from "@byu-se/quartermaster";

export class DynamoDB extends Stage {
    protected averageLatency:number = 5;
    async workOn(event: Event): Promise<void> {
        await metronome.wait(normal(this.averageLatency,1))
    }
}

export class AuthTable extends DynamoDB {};
export class StoryTable extends DynamoDB {};

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
        this.averageLatency = 6;
    }
}