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

  #updateStateAndValue(state, value) {
    this.#state = state;
    this.#value = value;
  }
}

module.exports = Promize;

// const prom = new Promize((resolve, reject) => {
//   reject(10);
// });

// const reject = Promize.reject("it automatically rejects this promise");
const rejectedPromise = Promize.resolve(new Promize((resolve, reject) => reject("here")));

// it changes the states of the promise to a rejected state while logging
// the reason for rejection to the console.
// reject.then("", console.log);


// it changes the states of the promise from pending -> rejected and logs
// the reason for rejection, which in this case is a "Promize object". This
// means a promise object is passed down when ".then" is passed
rejectedPromise.then(console.log, console.log);
