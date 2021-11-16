import { eventSummary, simulation, stageSummary } from "@byu-se/quartermaster";
import { AuthTable, FeedTable, FollowsTable, StoryTable } from "./stages/DynamoDB";
import { AddToFeedHandler, GetFollowersHandler, PostHandler } from "./stages/Lambda";
import { AddToFeedQueue, GetFollowersQueue} from "./stages/SQS";

const authTable = new AuthTable();
const storyTable = new StoryTable();
const feedTable = new FeedTable();
const followsTable = new FollowsTable();

const addToFeedHandler = new AddToFeedHandler(feedTable);
const addToFeedQueue = new AddToFeedQueue(addToFeedHandler);
const getFollowersHandler = new GetFollowersHandler(followsTable, addToFeedQueue);
const getFollowersQueue = new GetFollowersQueue(getFollowersHandler);
const postHandler = new PostHandler(authTable, storyTable, getFollowersQueue);


async function run() {
    const res = await simulation.run(postHandler, 1);
    console.log("Finished");
    eventSummary(res);
    stageSummary([
        postHandler, 
        getFollowersQueue,
        getFollowersHandler,
        addToFeedQueue,
        addToFeedHandler,
        authTable,
        storyTable,
        feedTable,
        followsTable
    ])
}
run();