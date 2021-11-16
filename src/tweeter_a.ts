import { inject, log, deferrable, Time, TimeUnits } from "./decorators";

/**
 * A program written as if it were maximally monolithic
 * 
 * includes comments about where features need to be.
 */

class Handler {
    @inject('auth-table') authTable?: AuthTable;
    @inject('story-table') storyTable?: StoryTable;
    @inject('follows-table') followsTable?: FollowsTable;
    @inject('feed-table') feedTable?: FeedTable;

    @log()
    async accept() {
        // {
        const allow = await this.authTable!.accept();
        if (!allow) {
            return 0;
        }
        await this.storyTable!.accept();
        // return // implicit
        // }

        // {
        // @deferrable(Time.upTo(40, TimeUnits.Seconds))
        await this.followsTable!.accept();
        // }

        // {
        // @deferrable(Time.upTo(20, TimeUnits.Seconds))
        await this.feedTable!.accept();
        // }
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


/**
 * A wrapper implementation is complex and unnatural
 */
class Handler2 {
    @inject('auth-table') authTable?: AuthTable;
    @inject('story-table') storyTable?: StoryTable;
    @inject('follows-table') followsTable?: FollowsTable;
    @inject('feed-table') feedTable?: FeedTable;

    @log()
    async accept() {
        // {
        const allow = await this.authTable!.accept();
        if (!allow) {
            return 0;
        }
        await this.storyTable!.accept();
        // return // implicit
        // }

        // {
        await deferrable2(this.followsTable!.accept, Time.upTo(40, TimeUnits.Seconds));
        await deferrable2(this.feedTable!.accept, Time.upTo(20, TimeUnits.Seconds));
    }
}

async function deferrable2<T>(f: () => T, time: Time): Promise<T> {
    return f();
}


/**
 * Explicitly make defer and response calls
 * 
 * Also unnatural since we are calling functions which we had to 
 * add.
 */
class Handler3 {
    @inject('auth-table') authTable?: AuthTable;
    @inject('story-table') storyTable?: StoryTable;
    @inject('follows-table') followsTable?: FollowsTable;
    @inject('feed-table') feedTable?: FeedTable;

    @log()
    async accept() {
        const allow = await this.authTable!.accept();
        if (!allow) {
            return 0;
        }
        await this.storyTable!.accept();
        await respond3();

        await deferrable3(Time.upTo(40, TimeUnits.Seconds));
        await this.followsTable!.accept();

        await deferrable3(Time.upTo(20, TimeUnits.Seconds));
        await this.feedTable!.accept();
    }
}

async function respond3(): Promise<void> { }
async function deferrable3(time: Time): Promise<void> { }



/**
 * What about decorators in in-class methods
 */
class Handler4 {
    @inject('auth-table') authTable?: AuthTable;
    @inject('story-table') storyTable?: StoryTable;
    @inject('follows-table') followsTable?: FollowsTable;
    @inject('feed-table') feedTable?: FeedTable;

    @log()
    async accept() {
        const allow = await this.authTable!.accept();
        if (!allow) {
            return 0;
        }
        await this.storyTable!.accept();
        await this.respond();

        await this.callFollows();
        await this.callFeed();
    }

    async respond() {
        // respond to the client here.
        // if the rest of the stuff is kept on this machine, the instance
        // should not be paused! (like lambda would)
    }

    @deferrable(Time.upTo(40, TimeUnits.Seconds))
    async callFollows() {
        await this.followsTable!.accept();
    }

    @deferrable(Time.upTo(20, TimeUnits.Seconds))
    async callFeed() {
        await this.followsTable!.accept();
    }
}


new Handler().accept();
new Handler2().accept();
new Handler3().accept();

