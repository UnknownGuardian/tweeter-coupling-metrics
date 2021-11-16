import { inject, log, deferrable, Time, TimeUnits } from "./decorators";


class PostStatusHandler {
    @inject('auth-table') authTable?: AuthTable;
    @inject('story-table') storyTable?: StoryTable;
    @inject('follows-fetcher-handler') followsFetcher?: FollowsFetcherHandler;

    @log()
    accept() {
        if (this.authTable!.accept()) {
            this.storyTable!.accept();
            this.followsFetcher!.accept();
        }
    }
}

@deferrable(Time.upTo(40, TimeUnits.Seconds))
class FollowsFetcherHandler {
    @inject('follows-table') followsTable?: FollowsTable;
    @inject('feed-writer-handler') feedWriter?: FeedWriterHandler;

    @log()
    accept() {
        this.followsTable!.accept();
        this.feedWriter!.accept();
    }
}

@deferrable(Time.upTo(20, TimeUnits.Seconds))
class FeedWriterHandler {
    @inject('feed-table') feedTable?: FeedTable;

    @log()
    accept() {
        this.feedTable!.accept();
    }
}

class AuthTable {
    @log()
    accept() {
        if (Math.random() > 0.5)
            return 1;
        return 0;
    }
}
class StoryTable {
    @log()
    accept() {
        if (Math.random() > 0.5)
            return 1;
        return 0;
    }
}
class FollowsTable {
    @log()
    accept() {
        if (Math.random() > 0.5)
            return 1;
        return 0;
    }
}
class FeedTable {
    @log()
    accept() {
        if (Math.random() > 0.5)
            return 1;
        return 0;
    }
}

new PostStatusHandler().accept();


/*
Notes:
When you have 2 @inject, what is the order they are called in. Can we infer
properties of how they are executed to determine if we need to split off one
of them into their own instance?

Is the @deferrable on the right thing? Should it be on the method call or on the callee?

Who decides to do batching?
What type of batching?
    DynamoDB batching - do we just always write to dynamodb in batches?
    Request batching - ????



 */