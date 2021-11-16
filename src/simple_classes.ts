import {inject, log, deferrable, Time, TimeUnits }from "./decorators";




class Client {
    @inject('build-service') service?:BuildService;

    @log()
    accept() {
        // calls build service
        this.service!.accept();
    }
}

@deferrable(Time.upTo(40, TimeUnits.Seconds))
class BuildService {
    @inject('database') database?:Database;

    @log()
    accept() {
        // calls database
        this.database!.accept();
    }
}


class Database {
    @log()
    accept() {
        if(Math.random() > 0.5)
            return 1;
        return 0;
    }
}

new Client().accept();


/*
Notes:
Guarantee deploy on same instance everything in a class.

I assume the provisioning code is going to maximally break things apart,
then, using application info, start piecing things together to mimize
some "networking cost" function and maximize the service provided.

Questions: 

What if the database is a 3rd party program?
    - You make Database become a wrapper to know how to call it. The wrapper is bundled with each callee instance.

What about graceful degradation decorators?
    - e.g. retryable indicator
    




*/
