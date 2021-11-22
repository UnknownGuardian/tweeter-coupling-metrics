import { eventSummary, metronome, simulation, Stage, stageSummary } from "@byu-se/quartermaster";
import { AuthTable, DynamoDB, FeedTable, FollowsTable, StoryTable } from "./stages/DynamoDB";
import { AddToFeedHandler, GetFollowersHandler, PostHandler } from "./stages/Lambda";
import { AddToFeedQueue, GetFollowersQueue } from "./stages/SQS";

metronome.realSleepFrequency = 1000;

//let simulationCompleteCallback = null;
//const simulationTermination = new Promise(resolve => simulationCompleteCallback = resolve);
const simulationTermination = metronome.wait(120_000).then(x => console.log("Terminate"));

const authTable = new AuthTable();
const storyTable = new StoryTable();
const feedTable = new FeedTable();
const followsTable = new FollowsTable();

const addToFeedHandler = new AddToFeedHandler(feedTable);
//const addToFeedQueue = new AddToFeedQueue(addToFeedHandler);
const getFollowersHandler = new GetFollowersHandler(followsTable, addToFeedHandler);//, addToFeedQueue);
//const getFollowersQueue = new GetFollowersQueue(getFollowersHandler);
const postHandler = new PostHandler(authTable, storyTable, getFollowersHandler, simulationTermination);//getFollowersQueue);


async function run() {
    const res = await simulation.run(postHandler, 1);
    console.log("Finished");
    eventSummary(res);
    stageSummary([
        postHandler,
        //getFollowersQueue,
        getFollowersHandler,
        //addToFeedQueue,
        addToFeedHandler,
        authTable,
        storyTable,
        feedTable,
        followsTable
    ], [tableSize])

    console.log("Metronome may have terminated this simulation early", metronome.now())
}
run();

const tableSize = {
    name: "Table Size",
    func: (stage: Stage) => {
        if (stage instanceof DynamoDB) {
            return stage.tableDataLength;
        } else {
            return 0;
        }
    }
}