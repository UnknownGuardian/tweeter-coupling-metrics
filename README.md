## Declarative Infrastructure Explorations

## What If?

We could code as if the application was a monolith and provide informative, declarative statements about how a build tool could
split up the application to use cloud resources in a scalable fashion.

```typescript
class Client {
    @inject('build-service') service?:BuildService;

    accept() {
        // calls build service
        this.service!.accept();
    }
}

@deferrable(Time.upTo(40, TimeUnits.Seconds))
class BuildService {
    @inject('database') database?:Database;

    accept() {
        // calls database
        this.database!.accept();
    }
}

class Database {
    accept() {
        if(Math.random() > 0.5)
            return 1;
        return 0;
    }
}
```

`@deferrable` encodes the SLA in code, for use by a build tool.

`@inject` encodes dependency injection, a place where the build tool could decide to split up the application, perhaps by injecting either a direct in-memory reference, or a REST call to the service on another machine.

A [more complex example](./src/tweeter.ts) representing how Twitter might handle a new status being posted.

## Priorities
1. Code up an application as if it was not distributed
2. Declarative code statements about acceptable behavior
3. Declarative code statements about consequences (costs)






## Milestones

1. Prepare A Sample Infrastructure
2. Build Infrastructure -> Quartermaster mapping
3. Runnable Infrastructure
4. Instance intelligence (scaling, division of dependencies to different instances)


