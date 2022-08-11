/**
 * SPECIFICATIONS: https://promisesaplus.com/
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

  #onFulfilledBind = this.#onFulfilled.bind(this);
  #onRejectedBind = this.#onRejected.bind(this);

  constructor(executor) {
    // when initialising a promise the state of the promise
    // is in a pending state.
    this.#state = STATES.PENDING;

    // The value property holds either the "value" from a resolved
    // operation or an error from a rejected operation.
    this.#value = undefined;

    try {
      executor(this.#onFulfilledBind, this.#onRejectedBind);
    } catch (error) {
      this.#onRejected(error);
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
    // this function automatically resolves to the
    // given value passed in or returns undefined if nothing is given.
    return new Promize((resolve) => resolve(value));
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
    // method should not be called "the execution context contains platform code"
    // so this queueMicroTask serves to delay the promise a little before the
    // function get called executed. This makes our Promise asynchronous
    queueMicrotask(() => {
      // when a state is already fulfilled or rejected.
      // if the resolve or reject function is called we must not run anything.
      if (this.#state !== STATES.PENDING) return;

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
    // function get called executed. This makes our Promise asynchronous
    queueMicrotask(() => {
      // no matter the number of times the rejected callback function
      // is called, once the promise is rejected it must not perform
      // anything again meaning onRejected must be called only once.
      if (this.#state !== STATES.PENDING) return;

      if (reason instanceof Promize) {
        reason.then(this.#onFulfilled, this.#onRejected);
      }

      // update the value and state of the promise Object/function when a promise resolves.
      this.#updateStateAndValue(STATES.REJECTED, reason);


      // execute the callback functions when a promise object/function/operation is rejected
      this.#executeCallbacks();
    });
  }

  #updateStateAndValue(state, value) {
    this.#state = state;
    this.#value = value;
  }
}

module.exports = Promize;

const prom = new Promize((resolve, reject) => {
  reject(10);
});

const resolved = Promize.resolve("it resolves this given value");
resolved.then(console.log);

