/**
 * A method decorator to print when a method is called.
 * @returns 
 */
export function log(){
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.value;

        descriptor.value = function(...args:any[]) {
            console.log(`Calling ${target.constructor.name}.${propertyKey}()`);
            return targetMethod.apply(this, args);
        }

        return descriptor;
    }
}

/**
 * A parameter decorator to do dependency injection
 */
export function inject(type:string):any {

}

/**
 * A class decorator to allow deferring.
 * 
 * CONSIDER: How valuable is not deferring? 
 *           maybe add parameter `deferCost:()=>number`
 * 
 * TODO: A method decorator implementation
 */
export function deferrable(time:number):any{

}
export class Time {
    static upTo(time:number, units:TimeUnits) {
        return time * units;
    }
}
export enum TimeUnits {
    Milliseconds = 1,
    Seconds = 1000 * Milliseconds,
    Minutes = 60 * Seconds,
    Hours = 60 * Minutes
}