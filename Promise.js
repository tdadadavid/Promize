/**
 * SPECIFICATIONS: https://promisesaplus.com/
 */

/**
 * More reading: MDN //TODO
 */

/**
 * It is possible to have an object that is thenable but not a promise.
 * This kind of object breaks the ECMAScript specification and the Promise/A+ spec.
 */

/**
 * This contains the valid states a promise can be found at any execution time.
 * A settled Promise is either Fulfilled or Rejected.
 * @type {{FULFILLED: string, PENDING: string, REJECTED: string}}
 */
const STATES = {
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  FULFILLED: "FULFILLED"
}

class Promize {

  #value;
  #state;

  // serves as a queue to store resolved functions given via the ".then" call in the order which they're called;
  #thenCallbacks = [];

  // serves as a queue to store rejected functions given via the ".catch" call in the order which they're called;
  #catchCallbacks = [];

  // to bind this class to the "onFulfilled" and "onRejected" method.
  #onFulfilledBind = this.#onFulfilled.bind(this);
  #onRejectedBind = this.#onRejected.bind(this);

  constructor(executor) {
    // when initialising a promise the state of the promise
    // is in a pending state.
    this.#state = STATES.PENDING;

    // The value property holds either the "value" from a resolved
    // operation or a "reason/error" from a rejected operation.
    this.#value = undefined;

    try {
      executor(this.#onFulfilledBind, this.#onRejectedBind);
    } catch (error) {
      this.#onRejectedBind(error);
    }
  }

  then(onFulfilled, onRejected) {
    return new Promize((resolve, reject) => {
      this.#thenCallbacks.push(result => {

        // In accordance to the promise/A+ specification the onFulfilled & onRejected
        // parameters must be a function or must be ignored. if it is not a function
        // the ".then" call must resolve the current value to the next call of the
        // promise chain(actually ".then" method), i.e Pass  its value to the next promise
        // chain function(".then" function).
        if (typeof onFulfilled !== 'function') {
          resolve(result);
          return;
        }

        // if the onFulfilled parameter is a function, execute the function
        // and resolve its value to the next ".then" call (if it runs gracefully)
        // or throw, catch and pass the error to then next ".catch" method handler.
        // (if an error occurs during execution).
        try {
          resolve(onFulfilled(result));
        } catch (error) {
          reject(error);
        }

      });

      this.#catchCallbacks.push(result => {

        // If the value passed as onRejected is not a function then
        // (this promise chain is not concerned about handling errors)
        // we must pass the current reason to the next ".catch" call
        if (typeof onRejected !== 'function') {
          reject(result);
          return;
        }

        // But if the value passed as the onRejected is a function then
        // we should execute the function immediately and the result of the
        // function to the next ".catch" call(if the error is handled gracefully).
        try {
          resolve(onRejected(result));
        } catch (error) {

          reject(error);
        }
      });

      this.#executeCallbacks();
    });
  }

  catch(callback) {
    // the catch promise chain method is not concerned
    // about any fulfilled operation/call
    return this.then(undefined, callback);
  }

  finally(callback) {
    return this.then(
      result => {
        callback();
        return result;
      }, result => {
        callback();
        throw result;
      });
  }

  static resolve(value){
    // this function automatically resolves the promise to a fulfilled
    // state with the given value passed in or returns undefined if nothing is given.
    return new Promize((resolve) => resolve(value));
  }

  static reject(value){
    // this function automatically resolves the promise to
    // a rejected state with the value passed as the parameter.
    return new Promize((resolve, reject) => reject(value));
  }

  static all(values = []){
    // this is to keep track of the promises that
    // are already settled. In this case settled means fulfilled.
    let completedPromises = 0;

    // by the nature of Promise.all, we know that it returns
    // an array of the settled promises/non-promise value
    const result = [];

    // Promise.all returns a promise object.
    return new Promize((resolve, reject) => {

      // iterating over the values promises/non-promise values given to us
      for (let i = 0; i < values.length; i++){
        // we take each value/object
        const promise = values[i];

        // this makes our Promise.all accept mixture of
        // promise/non-promise values eg Promize.all([1,3, Promise.resolve("it works")]);
        // returns [1,3, "it works"]. It also accepts non-promise values only
        if(!(promise instanceof Promize)){
          if (completedPromises === values.length-1) resolve(result);
          result[i] = promise;
          completedPromises++;
          continue;
        }

        // if the promise at this index settles ie is resolved,
        // we go on to call the ".then" method
        promise.then((val) => {
          // we increment the number of completed promise operations
          // to keep track of all settled promise.
          completedPromises++;

          // as we all know that Promise.all returns the values of each
          // value/object given to our function in the order they were given
          result[i] = val;

          // check if all the promise are settled ie resolved, then
          // pass the results to the next promise chain.
          if (completedPromises === values.length) resolve(result);
        })
        .catch(reject);
      }
    });
  }

  static allSettled(values = []){
    // this is to keep track of the promises that
    // are already settled. In this case settled means fulfilled.
    let completedPromises = 0;

    // by the nature of Promise.all, we know that it returns
    // an array of the settled promises/non-promise value
    const result = [];

    // Promise.all returns a promise object.
    return new Promize((resolve) => {

      // iterating over the values promises/non-promise values given to us
      for (let i = 0; i < values.length; i++){
        // we take each value/object
        const promise = values[i];

        // this makes our Promize.all accept mixture of
        // promise/non-promise values eg Promize.all([1,3, Promise.resolve("it works")]);
        // returns [1,3, "it works"]. It also accepts non-promise values only
        if(!(promise instanceof Promize)){
          if (completedPromises === values.length-1) resolve(result);
          result[i] = { status: STATES.FULFILLED.toLowerCase(), value: promise};
          completedPromises++;
          continue;
        }

        // if the promise at this index settles ie is resolved,
        // we go on to call the ".then" method
        promise.then((val) => {
          // as we all know that Promise.all returns the values of each
          // value/object given to our function in the order they were given
          result[i] = { status: STATES.FULFILLED.toLowerCase(), value: val };

          // check if all the promise are settled ie resolved, then
          // pass the results to the next promise chain.
          if (completedPromises === values.length) resolve(result);
        })
        .catch(reason => {
          // note here we don't just reject and stop executing all other
          // promises, but we store the rejected promise and the reason for
          // rejection in the result array.
          result[i] = { status: STATES.REJECTED.toLowerCase(), reason }
        })
        .finally(() => {
          // here we keep track of all settled promises (whether resolved or rejected)
          completedPromises++;

          // check if all the promise are settled ie resolved, then
          // pass the results to the next promise chain.
          if (completedPromises === values.length) resolve(result);
        });
      }
    });
  }

  static race(values = []){
    return new Promize((resolve, reject) => {
      // iterating through each promise/non-promise value
      // we settle the promise as soon as we have
      // 1. A non-promise value
      // 2. a promise that is already fulfilled/rejected.
      // it basically means the first values in the values array
      // to get resolved/rejected is returned`
      values.forEach((promise) => {
        // once we have a value that is not a promise object
        // return the value to the next promise chain call ie resolve
        if(!(promise instanceof Promize)) resolve(promise);
        promise.then(resolve).catch(reject);
      });
    });
  }


  #executeCallbacks() {
    // If the state is fulfilled run each resolved callback functions
    // in the order in which they were called.
    if (this.#state === STATES.FULFILLED) {
      this.#thenCallbacks.forEach(callback => callback(this.#value));

      // ensure that a resolved callback function does not
      // get to run again after another ".then" is called.
      this.#thenCallbacks = [];
    }

    if (this.#state === STATES.REJECTED) {
      this.#catchCallbacks.forEach(callback => callback(this.#value));

      // ensure that a rejected callback function does not
      // get to run again after another ".catch" is called.
      this.#catchCallbacks = [];
    }
  }

  // Known as resolve() in the promise.
  #onFulfilled(value) {
    // The promise/A+ specification states that the onfulfilled & onRejected
    // method should not be called until "the execution context contains only platform code"
    // so this queueMicroTask serves to delay the promise a little before the
    // function get executed. This makes our Promise asynchronous
    queueMicrotask(() => {
      // when a state is already fulfilled or rejected.
      // if the resolve or reject function is called we must not run anything.
      if (this.#state !== STATES.PENDING) return;

      // if the value to be resolved by the "resolve" function
      // is a promise, then resolve that promise
      if (value instanceof Promize){
        // note here we are using the functions that are bounded
        // to the "this" keyword not just the normal functions this
        // is because we are keeping track of the state and value
        // of this promise, using the normal functions we make
        // the static methods Promize.resolve and  Promize.reject
        // to throw error about the state of the returned promize becuase
        // of the weak nature of the "this" keyword in javascript to this
        // end we are using the bound functions.
        value.then(this.#onFulfilledBind, this.#onRejectedBind);
        return;
      }

      // update the value and state of the promise Object/function when a promise resolves.
      this.#updateStateAndValue(STATES.FULFILLED, value);

      // execute the callback functions when a promise object/function/operation is resolved.
      this.#executeCallbacks();
    });
  }

  // known as reject() in the promise.
  #onRejected(reason) {
    // The promise/A+ specification states that the onfulfilled & onRejected
    // method should not be called until "the execution context contains platform code"
    // so this queueMicroTask serves to delay the promise a little before the
    // function get called/executed. This makes our Promise asynchronous
    queueMicrotask(() => {
      // no matter the number of times the rejected callback function
      // is called, once the promise is rejected it must not perform
      // anything again meaning onRejected must be called only once.
      if (this.#state !== STATES.PENDING) return;

      // this is needed because if the reason for rejection
      // is a promise function/object,then we need to resolve
      // it from scratch
      if (reason instanceof Promize) {
        // note here we are using the functions that are bounded
        // to the "this" keyword not just the normal functions this
        // is because we are keeping track of the state and value
        // of this promise, using the normal functions we make
        // the static methods Promize.resolve and  Promize.reject
        // to throw error about the state of the returned promize becuase
        // of the weak nature of the "this" keyword in javascript to this
        // end we are using the bound functions.
        reason.then(this.#onFulfilledBind, this.#onRejectedBind);
        return;
      }

      // update the value and state of the promise Object/function when a promise resolves.
      this.#updateStateAndValue(STATES.REJECTED, reason);


      // execute the callback functions when a promise object/function/operation is rejected
      this.#executeCallbacks();
    });
  }

  #updateStateAndValue(state, value)  {
    this.#state = state;
    this.#value = value;
  }
}

module.exports = Promize;

const p = Promize.race([Promize.reject("this mess dey smell"),[1,4,0], Promize.resolve(90)]);
p.then(console.log, console.log);